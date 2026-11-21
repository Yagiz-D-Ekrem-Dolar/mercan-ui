import { LLM } from "@/types"
import { MERCAN_LLM_LIST } from "./mercan-llm-list"

export const LLM_LIST: LLM[] = [...MERCAN_LLM_LIST]

export const LLM_LIST_MAP: Record<string, LLM[]> = {
  mercan: MERCAN_LLM_LIST
}
