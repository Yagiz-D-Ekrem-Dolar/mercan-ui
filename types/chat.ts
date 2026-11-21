import { ChatMessage, LLMID } from "."

export interface ChatSettings {
  model: LLMID
  prompt: string
  contextLength: number
  includeProfileContext: boolean
  includeWorkspaceInstructions: boolean

  // Mercan sunucusunun okuduğu örnekleme hiperparametreleri
  temperature: number
  topP: number
  topK: number
  repeatPenalty: number
  maxTokens: number
  stopSequences: string[]
}

// Veritabanında `hyperparameters` sütununda saklanan alanlar
export type MercanHyperparameters = Pick<
  ChatSettings,
  "topP" | "topK" | "repeatPenalty" | "maxTokens" | "stopSequences"
>

export interface ChatPayload {
  chatSettings: ChatSettings
  workspaceInstructions: string
  chatMessages: ChatMessage[]
}

export interface ChatAPIMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export interface ChatAPIPayload {
  chatSettings: ChatSettings
  messages: ChatAPIMessage[]
  reasoning: boolean
  webSearch: boolean
}

export interface WebSource {
  title: string
  url: string
  snippet: string
}

export interface MessageUsage {
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
  tokensPerSecond?: number
}

// Asistan mesajlarına iliştirilen ek bilgiler (`metadata` sütunu)
export interface MessageMetadata {
  reasoning?: boolean
  webSearch?: boolean
  sources?: WebSource[]
  searchError?: string
  usage?: MessageUsage
  finishReason?: string
  demo?: boolean
}

// /api/mercan/status yanıtı
export interface ModelStatus {
  // Sunucuya ulaşılabiliyor mu?
  online: boolean
  // Model yüklendi ve istek kabul ediyor mu?
  ready: boolean
  // Sunucu çalışıyor ama bu modeli sunmuyor
  missing?: boolean
  // MERCAN_DEMO_MODE=auto iken model hazır değil: örnek yanıt verilir
  demo?: boolean
  error?: string
}

export interface MercanStatus {
  demo: boolean
  webSearchProvider: string
  models: Record<string, ModelStatus>
}

// /api/chat/mercan akışındaki satırlar (NDJSON)
export type ChatStreamEvent =
  | { type: "text"; value: string }
  | { type: "sources"; value: WebSource[] }
  | { type: "search_error"; value: string }
  | { type: "usage"; value: MessageUsage }
  | { type: "finish"; value: string }
  | { type: "demo"; value: boolean }
  | { type: "error"; value: string }
