// Yalnızca sunucu tarafında (API rotalarında) kullanılır.

import { LLMID, ModelStatus } from "@/types"

export interface MercanEndpoint {
  modelId: LLMID
  baseUrl: string
  apiKey: string
  upstreamModel: string
  upstreamThinkModel: string
  reasoningStyle: "model" | "template"
}

const DEFAULT_BASE_URL = "http://127.0.0.1:8765/v1"

export const ENV_PREFIX: Record<LLMID, string> = {
  "mercan-0.8b": "MERCAN_0_8B",
  "mercan-1.7b": "MERCAN_1_7B"
}

const trimSlash = (value: string) => value.replace(/\/+$/, "")

const env = (key: string) => {
  const value = process.env[key]
  return value && value.trim() !== "" ? value.trim() : undefined
}

// Her model için sunucu adresi, anahtar ve sunucudaki model adı.
// Model bazında değişken yoksa ortak MERCAN_API_* değerleri kullanılır.
export const getMercanEndpoint = (modelId: LLMID): MercanEndpoint => {
  const prefix = ENV_PREFIX[modelId]

  const upstreamModel = env(`${prefix}_MODEL`) ?? modelId
  const thinkSuffix = process.env.MERCAN_THINK_SUFFIX ?? "-dusunen"

  return {
    modelId,
    baseUrl: trimSlash(
      env(`${prefix}_BASE_URL`) ?? env("MERCAN_API_BASE_URL") ?? DEFAULT_BASE_URL
    ),
    apiKey: env(`${prefix}_API_KEY`) ?? env("MERCAN_API_KEY") ?? "",
    upstreamModel,
    upstreamThinkModel:
      env(`${prefix}_THINK_MODEL`) ?? `${upstreamModel}${thinkSuffix}`,
    reasoningStyle:
      env("MERCAN_REASONING_STYLE") === "template" ? "template" : "model"
  }
}

// MERCAN_DEMO_MODE:
//   true  -> her zaman örnek (demo) yanıt
//   auto  -> model sunucusu hazır değilse demo yanıt, hazırsa gerçek model
//   false -> her zaman gerçek model (varsayılan)
export type DemoMode = "on" | "auto" | "off"

export const getDemoMode = (): DemoMode => {
  const value = (process.env.MERCAN_DEMO_MODE || "").trim().toLowerCase()

  if (["1", "true", "yes", "evet", "on"].includes(value)) return "on"
  if (value === "auto" || value === "otomatik") return "auto"
  return "off"
}

export const isDemoMode = () => getDemoMode() === "on"

export const authHeaders = (endpoint: MercanEndpoint): HeadersInit =>
  endpoint.apiKey ? { Authorization: `Bearer ${endpoint.apiKey}` } : {}

export const describeFetchError = (error: unknown, endpoint: MercanEndpoint) => {
  const cause = (error as { cause?: { code?: string } })?.cause
  const code = cause?.code

  if (
    code === "ECONNREFUSED" ||
    code === "ENOTFOUND" ||
    code === "EHOSTUNREACH" ||
    code === "ECONNRESET" ||
    (error instanceof TypeError && /fetch failed/i.test(error.message))
  ) {
    return `Mercan sunucusuna bağlanılamadı (${endpoint.baseUrl}). Sunucunun çalıştığından emin olun ya da .env.local dosyasındaki adresi kontrol edin.`
  }

  if (error instanceof DOMException && error.name === "TimeoutError") {
    return `Mercan sunucusu zamanında yanıt vermedi (${endpoint.baseUrl}).`
  }

  return error instanceof Error ? error.message : String(error)
}

// /v1/models üzerinden sunucunun ve modelin durumunu kontrol eder.
export const checkMercanModel = async (
  endpoint: MercanEndpoint,
  options: { reasoning?: boolean; timeoutMs?: number } = {}
): Promise<ModelStatus> => {
  try {
    const response = await fetch(`${endpoint.baseUrl}/models`, {
      headers: authHeaders(endpoint),
      cache: "no-store",
      signal: AbortSignal.timeout(options.timeoutMs ?? 2000)
    })

    if (response.status === 401 || response.status === 403) {
      return {
        online: true,
        ready: false,
        error: "API anahtarı reddedildi (MERCAN_API_KEY)."
      }
    }

    if (!response.ok) {
      return {
        online: true,
        ready: false,
        error: `Sunucu HTTP ${response.status} döndürdü.`
      }
    }

    const data = await response.json().catch(() => null)
    const ids: string[] = Array.isArray(data?.data)
      ? data.data.map((model: { id?: string }) => model?.id).filter(Boolean)
      : []

    // mercan-server model yüklenene kadar boş liste döndürür.
    if (ids.length === 0) {
      return { online: true, ready: false }
    }

    const wanted =
      options.reasoning && endpoint.reasoningStyle === "model"
        ? endpoint.upstreamThinkModel
        : endpoint.upstreamModel

    if (!ids.includes(wanted)) {
      return {
        online: true,
        ready: false,
        missing: true,
        error: `Sunucu "${wanted}" modelini sunmuyor (mevcut: ${ids.join(", ")}).`
      }
    }

    return { online: true, ready: true }
  } catch (error) {
    return {
      online: false,
      ready: false,
      error: describeFetchError(error, endpoint)
    }
  }
}
