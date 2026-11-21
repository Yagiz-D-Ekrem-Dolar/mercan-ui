import { ModelProvider } from "."

export type LLMID = MercanLLMID

// Mercan modelleri
export type MercanLLMID =
  | "mercan-0.8b" // Mercan 0.8B
  | "mercan-1.7b" // Mercan 1.7B

export interface LLM {
  modelId: LLMID
  modelName: string
  provider: ModelProvider
  hostedId: string
  platformLink: string
  imageInput: boolean
  parameterCount?: string
  maxContext?: number
  description?: string
}
