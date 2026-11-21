import { buildDemoResponse, streamDemoText } from "@/lib/mercan/demo"
import {
  ENV_PREFIX,
  MercanEndpoint,
  authHeaders,
  checkMercanModel,
  describeFetchError,
  getMercanEndpoint,
  getDemoMode
} from "@/lib/mercan/server-config"
import {
  DEFAULT_CHAT_SETTINGS,
  clampChatSettings,
  normalizeModel
} from "@/lib/mercan/settings"
import { injectSearchResults, webSearch } from "@/lib/mercan/web-search"
import { LLM_LIST } from "@/lib/models/llm/llm-list"
import {
  ChatAPIMessage,
  ChatAPIPayload,
  ChatSettings,
  ChatStreamEvent,
  WebSource
} from "@/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const jsonError = (message: string, status: number) =>
  Response.json({ message }, { status })

const sanitizeMessages = (messages: unknown): ChatAPIMessage[] => {
  if (!Array.isArray(messages)) return []

  return messages
    .filter(
      (message): message is ChatAPIMessage =>
        !!message &&
        typeof message === "object" &&
        ["system", "user", "assistant"].includes((message as any).role) &&
        typeof (message as any).content === "string"
    )
    .map(message => ({ role: message.role, content: message.content }))
}

// OpenAI uyumlu SSE akışını okuyup NDJSON olaylarına çevirir.
const streamFromMercan = async (
  endpoint: MercanEndpoint,
  settings: ChatSettings,
  messages: ChatAPIMessage[],
  reasoning: boolean,
  send: (event: ChatStreamEvent) => void,
  signal: AbortSignal
) => {
  const useThinkModel = reasoning && endpoint.reasoningStyle === "model"

  const body: Record<string, unknown> = {
    model: useThinkModel ? endpoint.upstreamThinkModel : endpoint.upstreamModel,
    messages,
    stream: true,
    temperature: settings.temperature,
    top_p: settings.topP,
    top_k: settings.topK,
    // mercan-server "repeat_penalty", vLLM/TGI "repetition_penalty" okur
    repeat_penalty: settings.repeatPenalty,
    repetition_penalty: settings.repeatPenalty,
    max_tokens: settings.maxTokens
  }

  if (settings.stopSequences.length > 0) {
    body.stop = settings.stopSequences
  }

  if (reasoning && endpoint.reasoningStyle === "template") {
    body.chat_template_kwargs = { enable_thinking: true }
  }

  let response: Response
  try {
    response = await fetch(`${endpoint.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(endpoint) },
      body: JSON.stringify(body),
      signal
    })
  } catch (error) {
    if (signal.aborted) return
    throw new Error(describeFetchError(error, endpoint))
  }

  if (!response.ok || !response.body) {
    let detail = ""
    try {
      const data = await response.json()
      detail = data?.error?.message || data?.message || ""
    } catch {
      // yoksay
    }

    throw new Error(
      `Mercan sunucusu hata döndürdü (HTTP ${response.status})${detail ? `: ${detail}` : "."}`
    )
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  // vLLM gibi sunucular düşünceyi ayrı "reasoning_content" alanında gönderir.
  let thinkOpen = false

  const handleData = (data: string) => {
    if (data === "[DONE]") return true

    let json: any
    try {
      json = JSON.parse(data)
    } catch {
      return false
    }

    if (json?.error) {
      throw new Error(
        `Mercan sunucusu hata döndürdü: ${json.error.message || json.error}`
      )
    }

    const choice = json?.choices?.[0]
    const delta = choice?.delta ?? {}
    const reasoningPiece: string | undefined =
      delta.reasoning_content ?? delta.reasoning

    if (reasoningPiece) {
      if (!thinkOpen) {
        send({ type: "text", value: "<think>\n" })
        thinkOpen = true
      }
      send({ type: "text", value: reasoningPiece })
    }

    if (typeof delta.content === "string" && delta.content.length > 0) {
      if (thinkOpen) {
        send({ type: "text", value: "\n</think>\n\n" })
        thinkOpen = false
      }
      send({ type: "text", value: delta.content })
    }

    if (choice?.finish_reason) {
      send({ type: "finish", value: String(choice.finish_reason) })
    }

    if (json?.usage) {
      const usage = json.usage
      send({
        type: "usage",
        value: {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
          tokensPerSecond: usage["response_token/s"]
        }
      })
    }

    return false
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split(/\r?\n/)
      buffer = lines.pop() ?? ""

      for (const line of lines) {
        if (!line.startsWith("data:")) continue
        if (handleData(line.slice(5).trim())) return
      }
    }

    if (buffer.startsWith("data:")) handleData(buffer.slice(5).trim())
  } catch (error) {
    if (signal.aborted) return
    throw error
  } finally {
    if (thinkOpen) send({ type: "text", value: "\n</think>\n\n" })
    reader.releaseLock()
  }
}

export async function POST(request: Request) {
  let payload: ChatAPIPayload

  try {
    payload = (await request.json()) as ChatAPIPayload
  } catch {
    return jsonError("Geçersiz istek gövdesi.", 400)
  }

  const model = normalizeModel(payload?.chatSettings?.model)
  const settings = clampChatSettings({
    ...DEFAULT_CHAT_SETTINGS,
    ...payload.chatSettings,
    model,
    stopSequences: Array.isArray(payload?.chatSettings?.stopSequences)
      ? payload.chatSettings.stopSequences.filter(
          (stop): stop is string => typeof stop === "string" && stop !== ""
        )
      : []
  })

  const messages = sanitizeMessages(payload.messages)
  const lastMessage = messages[messages.length - 1]

  if (!lastMessage || lastMessage.role !== "user" || !lastMessage.content.trim()) {
    return jsonError("Son mesaj boş olmayan bir kullanıcı mesajı olmalı.", 400)
  }

  const reasoning = payload.reasoning === true
  const searchEnabled = payload.webSearch === true
  const demoMode = getDemoMode()
  const endpoint = getMercanEndpoint(model)

  let demo = demoMode === "on"

  // Gerçek modda önce sunucunun bu modeli sunduğundan emin ol: aynı sunucu
  // başka bir modeli sessizce yanıtlamasın.
  if (!demo) {
    const status = await checkMercanModel(endpoint, { reasoning })
    const modelName =
      LLM_LIST.find(llm => llm.modelId === model)?.modelName ?? model

    if (demoMode === "auto" && !status.ready) {
      // Otomatik mod: gerçek model hazır değilse etiketli demo yanıt ver.
      demo = true
    } else if (!status.online) {
      return jsonError(status.error ?? "Mercan sunucusuna ulaşılamıyor.", 503)
    } else if (status.missing) {
      return jsonError(
        `${modelName} bu sunucuda bulunamadı (${endpoint.baseUrl}). ${status.error ?? ""} Bu model için .env.local dosyasında ${ENV_PREFIX[model]}_BASE_URL değerini ayarlayın.`,
        404
      )
    } else if (!status.ready) {
      return jsonError(
        status.error ??
          `${modelName} henüz yükleniyor; birkaç saniye sonra tekrar deneyin.`,
        503
      )
    }
  }

  const encoder = new TextEncoder()
  const signal = request.signal

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false

      const send = (event: ChatStreamEvent) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"))
        } catch {
          closed = true
        }
      }

      try {
        let upstreamMessages = messages
        let sources: WebSource[] | null = null

        if (searchEnabled) {
          try {
            sources = await webSearch(lastMessage.content, signal)
            send({ type: "sources", value: sources })
            upstreamMessages = injectSearchResults(messages, sources)
          } catch (error) {
            if (signal.aborted) return
            sources = []
            send({
              type: "search_error",
              value:
                error instanceof Error ? error.message : "Bilinmeyen arama hatası"
            })
          }
        }

        if (demo) {
          send({ type: "demo", value: true })
          await streamDemoText(
            buildDemoResponse(lastMessage.content, settings, reasoning, sources),
            text => send({ type: "text", value: text }),
            signal
          )
          send({ type: "finish", value: "stop" })
        } else {
          await streamFromMercan(
            endpoint,
            settings,
            upstreamMessages,
            reasoning,
            send,
            signal
          )
        }
      } catch (error) {
        send({
          type: "error",
          value: error instanceof Error ? error.message : String(error)
        })
      } finally {
        if (!closed) {
          closed = true
          try {
            controller.close()
          } catch {
            // akış zaten kapanmış
          }
        }
      }
    }
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no"
    }
  })
}
