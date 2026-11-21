import { LLMID } from "@/types"

type ChatSettingLimits = {
  MIN_TEMPERATURE: number
  MAX_TEMPERATURE: number
  MAX_TOKEN_OUTPUT_LENGTH: number
  MAX_CONTEXT_LENGTH: number
}

// Mercan sunucusu max_tokens değerini 1–3072 aralığına sıkıştırır; bağlam
// penceresi sunucuda varsayılan olarak 4096 tokendir (--ctx).
export const CHAT_SETTING_LIMITS: Record<LLMID, ChatSettingLimits> = {
  "mercan-0.8b": {
    MIN_TEMPERATURE: 0.0,
    MAX_TEMPERATURE: 2.0,
    MAX_TOKEN_OUTPUT_LENGTH: 3072,
    MAX_CONTEXT_LENGTH: 4096
  },
  "mercan-1.7b": {
    MIN_TEMPERATURE: 0.0,
    MAX_TEMPERATURE: 2.0,
    MAX_TOKEN_OUTPUT_LENGTH: 3072,
    MAX_CONTEXT_LENGTH: 4096
  }
}
