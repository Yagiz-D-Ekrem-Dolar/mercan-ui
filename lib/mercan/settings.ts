import { CHAT_SETTING_LIMITS } from "@/lib/chat-setting-limits"
import { LLM_LIST } from "@/lib/models/llm/llm-list"
import { ChatSettings, LLMID, MercanHyperparameters } from "@/types"
import { Json, Tables } from "@/types/database"

export const DEFAULT_MODEL: LLMID = "mercan-0.8b"

// Mercan masaüstü uygulamasının sunucuya verdiği varsayılan kimlik metniyle aynı.
export const DEFAULT_SYSTEM_PROMPT =
  "Sen Mercan'sın: Ethosoft AI ekibinin geliştirdiği, tamamen cihaz üzerinde çalışan Türkçe yapay zekâ asistanı. Kısa, net ve nazik Türkçe cevaplar ver."

// mercan-server varsayılanları (apps/server/mercan_server.cpp)
export const DEFAULT_TEMPERATURE = 0.7

export const DEFAULT_HYPERPARAMETERS: MercanHyperparameters = {
  topP: 0.95,
  topK: 40,
  repeatPenalty: 1.1,
  maxTokens: 1024,
  stopSequences: []
}

export const DEFAULT_CHAT_SETTINGS: ChatSettings = {
  model: DEFAULT_MODEL,
  prompt: DEFAULT_SYSTEM_PROMPT,
  contextLength: 4096,
  includeProfileContext: true,
  includeWorkspaceInstructions: true,
  temperature: DEFAULT_TEMPERATURE,
  ...DEFAULT_HYPERPARAMETERS
}

export const normalizeModel = (model: string | null | undefined): LLMID =>
  LLM_LIST.some(llm => llm.modelId === model)
    ? (model as LLMID)
    : DEFAULT_MODEL

const num = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback

export const parseHyperparameters = (
  value: Json | null | undefined
): MercanHyperparameters => {
  const v =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}

  return {
    topP: num(v.topP, DEFAULT_HYPERPARAMETERS.topP),
    topK: num(v.topK, DEFAULT_HYPERPARAMETERS.topK),
    repeatPenalty: num(v.repeatPenalty, DEFAULT_HYPERPARAMETERS.repeatPenalty),
    maxTokens: num(v.maxTokens, DEFAULT_HYPERPARAMETERS.maxTokens),
    stopSequences: Array.isArray(v.stopSequences)
      ? v.stopSequences.filter((s): s is string => typeof s === "string")
      : []
  }
}

export const pickHyperparameters = (
  settings: ChatSettings
): MercanHyperparameters => ({
  topP: settings.topP,
  topK: settings.topK,
  repeatPenalty: settings.repeatPenalty,
  maxTokens: settings.maxTokens,
  stopSequences: settings.stopSequences
})

// Ayarları seçili modelin sınırlarına çeker.
export const clampChatSettings = (settings: ChatSettings): ChatSettings => {
  const limits = CHAT_SETTING_LIMITS[settings.model]
  if (!limits) return settings

  const clamp = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), max)

  return {
    ...settings,
    temperature: clamp(
      settings.temperature,
      limits.MIN_TEMPERATURE,
      limits.MAX_TEMPERATURE
    ),
    contextLength: clamp(settings.contextLength, 256, limits.MAX_CONTEXT_LENGTH),
    maxTokens: clamp(settings.maxTokens, 1, limits.MAX_TOKEN_OUTPUT_LENGTH),
    topP: clamp(settings.topP, 0.01, 1),
    topK: clamp(Math.round(settings.topK), 0, 1000),
    repeatPenalty: clamp(settings.repeatPenalty, 1, 2)
  }
}

type SettingsRow = Pick<
  Tables<"chats">,
  | "model"
  | "prompt"
  | "temperature"
  | "context_length"
  | "include_profile_context"
  | "include_workspace_instructions"
  | "hyperparameters"
>

// Sohbet / ön ayar satırı -> ChatSettings
export const chatSettingsFromRow = (row: SettingsRow): ChatSettings =>
  clampChatSettings({
    model: normalizeModel(row.model),
    prompt: row.prompt ?? DEFAULT_SYSTEM_PROMPT,
    temperature: num(row.temperature, DEFAULT_TEMPERATURE),
    contextLength: num(row.context_length, DEFAULT_CHAT_SETTINGS.contextLength),
    includeProfileContext: row.include_profile_context ?? true,
    includeWorkspaceInstructions: row.include_workspace_instructions ?? true,
    ...parseHyperparameters(row.hyperparameters)
  })

// ChatSettings -> sohbet / ön ayar satırı alanları
export const rowFromChatSettings = (settings: ChatSettings) => ({
  model: settings.model,
  prompt: settings.prompt,
  temperature: settings.temperature,
  context_length: settings.contextLength,
  include_profile_context: settings.includeProfileContext,
  include_workspace_instructions: settings.includeWorkspaceInstructions,
  embeddings_provider: "local",
  hyperparameters: pickHyperparameters(settings) as unknown as Json
})

// Çalışma alanı varsayılanları -> ChatSettings
export const chatSettingsFromWorkspace = (
  workspace: Tables<"workspaces">
): ChatSettings =>
  clampChatSettings({
    model: normalizeModel(workspace.default_model),
    prompt: workspace.default_prompt ?? DEFAULT_SYSTEM_PROMPT,
    temperature: num(workspace.default_temperature, DEFAULT_TEMPERATURE),
    contextLength: num(
      workspace.default_context_length,
      DEFAULT_CHAT_SETTINGS.contextLength
    ),
    includeProfileContext: workspace.include_profile_context ?? true,
    includeWorkspaceInstructions:
      workspace.include_workspace_instructions ?? true,
    ...parseHyperparameters(workspace.hyperparameters)
  })

// ChatSettings -> çalışma alanı varsayılan alanları
export const workspaceDefaultsFromChatSettings = (settings: ChatSettings) => ({
  default_model: settings.model,
  default_prompt: settings.prompt,
  default_temperature: settings.temperature,
  default_context_length: settings.contextLength,
  include_profile_context: settings.includeProfileContext,
  include_workspace_instructions: settings.includeWorkspaceInstructions,
  embeddings_provider: "local",
  hyperparameters: pickHyperparameters(settings) as unknown as Json
})

export const isSameChatSettings = (a: ChatSettings, b: ChatSettings) =>
  JSON.stringify(a) === JSON.stringify(b)
