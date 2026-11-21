import { CHAT_SETTING_LIMITS } from "@/lib/chat-setting-limits"
import { ChatSettings, LLMID } from "@/types"

type NumericSettingKey =
  | "temperature"
  | "topP"
  | "topK"
  | "repeatPenalty"
  | "maxTokens"
  | "contextLength"

export interface HyperparameterSpec {
  key: NumericSettingKey
  label: string
  // Sunucuya giden parametre adı
  param: string
  hint: string
  min: number
  max: number
  step: number
  decimals: number
}

// Ayarlar ekranındaki hiperparametreler. Hepsi mercan-server tarafından okunur
// (apps/server/mercan_server.cpp → handle_chat); bağlam uzunluğu ise
// istemcide konuşma geçmişini kırpmak için kullanılır.
export const getHyperparameterSpecs = (model: LLMID): HyperparameterSpec[] => {
  const limits = CHAT_SETTING_LIMITS[model]

  return [
    {
      key: "temperature",
      label: "Sıcaklık",
      param: "temperature",
      hint: "Yüksek değerler daha yaratıcı ve çeşitli, düşük değerler daha tutarlı ve öngörülebilir yanıtlar üretir. 0'a yakın değerler neredeyse her seferinde aynı cevabı verir.",
      min: limits?.MIN_TEMPERATURE ?? 0,
      max: limits?.MAX_TEMPERATURE ?? 2,
      step: 0.05,
      decimals: 2
    },
    {
      key: "topP",
      label: "Top-p",
      param: "top_p",
      hint: "Çekirdek örnekleme: olasılıkları toplamı bu değere ulaşan en olası tokenler arasından seçim yapılır. Düşük değerler yanıtı daraltır.",
      min: 0.05,
      max: 1,
      step: 0.01,
      decimals: 2
    },
    {
      key: "topK",
      label: "Top-k",
      param: "top_k",
      hint: "Her adımda yalnızca en olası k token değerlendirilir. 0 = sınırsız (tüm sözlük).",
      min: 0,
      max: 200,
      step: 1,
      decimals: 0
    },
    {
      key: "repeatPenalty",
      label: "Tekrar cezası",
      param: "repeat_penalty",
      hint: "Son 64 tokende geçen ifadelerin yeniden seçilme olasılığını düşürür. 1,00 = kapalı; çok yüksek değerler anlatımı bozabilir.",
      min: 1,
      max: 2,
      step: 0.01,
      decimals: 2
    },
    {
      key: "maxTokens",
      label: "Maksimum yanıt uzunluğu",
      param: "max_tokens",
      hint: "Tek bir yanıtta üretilecek en fazla token sayısı. Mercan sunucusu bu değeri en fazla 3072 ile sınırlar.",
      min: 16,
      max: limits?.MAX_TOKEN_OUTPUT_LENGTH ?? 3072,
      step: 16,
      decimals: 0
    },
    {
      key: "contextLength",
      label: "Bağlam uzunluğu",
      param: "context",
      hint: "Modele gönderilen konuşma geçmişinin yaklaşık token sınırı (sistem istemi dahil). Sınırı aşan eski mesajlar gönderilmez.",
      min: 256,
      max: limits?.MAX_CONTEXT_LENGTH ?? 4096,
      step: 64,
      decimals: 0
    }
  ]
}

export const formatSettingValue = (value: number, decimals: number) =>
  new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value)

export const parseStopSequences = (text: string) =>
  text
    .split(",")
    .map(item => item.trim())
    .filter(Boolean)

export const stopSequencesToText = (stop: string[]) => stop.join(", ")

export const settingsSummary = (settings: ChatSettings) =>
  getHyperparameterSpecs(settings.model).map(spec => ({
    label: spec.label,
    param: spec.param,
    value: formatSettingValue(settings[spec.key], spec.decimals)
  }))
