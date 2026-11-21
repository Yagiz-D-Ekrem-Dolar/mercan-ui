import { ChatAPIMessage, ChatPayload } from "@/types"
import { Tables } from "@/types/database"
import { encode } from "gpt-tokenizer"

// Asistan mesajındaki <think>…</think> bölümünü ayırır.
export const splitReasoning = (content: string) => {
  const start = content.indexOf("<think>")

  if (start === -1) {
    return { reasoning: "", answer: content, isThinking: false }
  }

  const end = content.indexOf("</think>", start)
  const before = content.slice(0, start)

  if (end === -1) {
    return {
      reasoning: content.slice(start + "<think>".length).trim(),
      answer: before.trim(),
      isThinking: true
    }
  }

  return {
    reasoning: content.slice(start + "<think>".length, end).trim(),
    answer: (before + content.slice(end + "</think>".length)).trim(),
    isThinking: false
  }
}

// Modele geri gönderilen geçmişte düşünce bölümleri yer almaz.
export const stripReasoning = (content: string) =>
  content.replace(/<think>[\s\S]*?(<\/think>|$)/g, "").trim()

const formatToday = () =>
  new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" }).format(new Date())

const buildBasePrompt = (
  prompt: string,
  profileContext: string,
  workspaceInstructions: string
) => {
  const sections = [prompt.trim()]

  if (workspaceInstructions.trim()) {
    sections.push(`Genel talimatlar:\n${workspaceInstructions.trim()}`)
  }

  if (profileContext.trim()) {
    sections.push(`Kullanıcı hakkında bilgiler:\n${profileContext.trim()}`)
  }

  sections.push(`Bugünün tarihi: ${formatToday()}.`)

  return sections.filter(Boolean).join("\n\n")
}

const countTokens = (text: string) => encode(text).length

export async function buildFinalMessages(
  payload: ChatPayload,
  profile: Tables<"profiles">
): Promise<ChatAPIMessage[]> {
  const { chatSettings, workspaceInstructions, chatMessages } = payload

  const systemPrompt = buildBasePrompt(
    chatSettings.prompt,
    chatSettings.includeProfileContext ? profile.profile_context || "" : "",
    chatSettings.includeWorkspaceInstructions ? workspaceInstructions : ""
  )

  // Bağlam penceresi = gönderilen geçmiş + üretilecek yanıt.
  const inputBudget = Math.max(
    256,
    chatSettings.contextLength - chatSettings.maxTokens
  )
  let remainingTokens = inputBudget - countTokens(systemPrompt)

  const finalMessages: ChatAPIMessage[] = []

  for (let i = chatMessages.length - 1; i >= 0; i--) {
    const { role, content } = chatMessages[i].message

    if (role !== "user" && role !== "assistant") continue

    const text = role === "assistant" ? stripReasoning(content) : content.trim()
    if (!text) continue

    const tokens = countTokens(text)

    // Son kullanıcı mesajı bütçeyi aşsa bile her zaman gönderilir.
    if (tokens <= remainingTokens || finalMessages.length === 0) {
      remainingTokens -= tokens
      finalMessages.unshift({ role, content: text })
    } else {
      break
    }
  }

  // Sunucu ilk mesajın kullanıcıdan gelmesini bekler.
  while (finalMessages.length > 0 && finalMessages[0].role === "assistant") {
    finalMessages.shift()
  }

  return [{ role: "system", content: systemPrompt }, ...finalMessages]
}
