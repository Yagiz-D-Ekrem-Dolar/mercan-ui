// MERCAN_DEMO_MODE=true iken gerçek model yerine kullanılan örnek yanıt.
// Yalnızca arayüzü denemek içindir; yanıtta demo olduğu açıkça yazar.

import { formatSettingValue } from "@/lib/mercan/hyperparameters"
import { LLM_LIST } from "@/lib/models/llm/llm-list"
import { ChatSettings, WebSource } from "@/types"

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const buildDemoResponse = (
  question: string,
  settings: ChatSettings,
  reasoning: boolean,
  sources: WebSource[] | null
) => {
  const modelName =
    LLM_LIST.find(llm => llm.modelId === settings.model)?.modelName ??
    settings.model
  const excerpt =
    question.length > 120 ? `${question.slice(0, 119).trimEnd()}…` : question

  let text = ""

  if (reasoning) {
    text +=
      "<think>\n" +
      "- Kullanıcı bir soru sordu; önce ne istendiğini netleştiriyorum.\n" +
      "- Bu bir demo yanıtı olduğu için gerçek bir akıl yürütme yapılmıyor.\n" +
      "- Akıl yürütme kutusunun nasıl göründüğünü göstermek yeterli.\n" +
      "</think>\n\n"
  }

  text +=
    `Merhaba! Şu anda **demo modundayım**: gerçek bir model sunucusuna bağlı değilim, bu yanıt arayüzü denemeniz için hazırlanmış örnek bir metindir.\n\n` +
    `**Sorunuz:** “${excerpt}”\n\n`

  if (sources) {
    text +=
      sources.length > 0
        ? `Web araması **${sources.length} kaynak** buldu; ilki “${sources[0].title}” [1]. Kaynakların tamamı yanıtın altında listelenir.\n\n`
        : "Web araması bu soru için sonuç bulamadı.\n\n"
  }

  text +=
    `**Kullanılacak ayarlar** (${modelName}):\n\n` +
    `| Parametre | Değer |\n|---|---|\n` +
    `| temperature | ${formatSettingValue(settings.temperature, 2)} |\n` +
    `| top_p | ${formatSettingValue(settings.topP, 2)} |\n` +
    `| top_k | ${settings.topK} |\n` +
    `| repeat_penalty | ${formatSettingValue(settings.repeatPenalty, 2)} |\n` +
    `| max_tokens | ${settings.maxTokens} |\n\n` +
    "Gerçek yanıtlar için `mercan-server` uygulamasını başlatın (varsayılan adres `http://127.0.0.1:8765/v1`). `MERCAN_DEMO_MODE=auto` iken sunucu hazır olduğu anda gerçek model kullanılır."

  return text
}

// Metni kelime kelime akıtır.
export const streamDemoText = async (
  text: string,
  onText: (chunk: string) => void,
  signal: AbortSignal
) => {
  const parts = text.match(/\S+\s*|\s+/g) ?? [text]

  for (const part of parts) {
    if (signal.aborted) return
    onText(part)
    await sleep(18)
  }
}
