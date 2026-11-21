import { LLM } from "@/types"

// Arayüzde seçilebilen Mercan modelleri. Sunucu tarafındaki adresler
// .env.local içindeki MERCAN_* değişkenlerinden okunur (bkz. lib/mercan/server-config.ts).
export const MERCAN_LLM_LIST: LLM[] = [
  {
    modelId: "mercan-0.8b",
    modelName: "Mercan 0.8B",
    provider: "mercan",
    hostedId: "mercan-0.8b",
    platformLink: "",
    imageInput: false,
    parameterCount: "0,8 milyar parametre",
    maxContext: 4096,
    description: "Hızlı ve hafif; günlük sorular için."
  },
  {
    modelId: "mercan-1.7b",
    modelName: "Mercan 1.7B",
    provider: "mercan",
    hostedId: "mercan-1.7b",
    platformLink: "",
    imageInput: false,
    parameterCount: "1,7 milyar parametre",
    maxContext: 4096,
    description: "Daha güçlü; daha ayrıntılı ve tutarlı yanıtlar."
  }
]
