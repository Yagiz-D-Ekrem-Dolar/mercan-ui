import {
  checkMercanModel,
  getDemoMode,
  getMercanEndpoint
} from "@/lib/mercan/server-config"
import { getSearchProvider } from "@/lib/mercan/web-search"
import { LLM_LIST } from "@/lib/models/llm/llm-list"
import { MercanStatus, ModelStatus } from "@/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const demoMode = getDemoMode()

  const entries = await Promise.all(
    LLM_LIST.map(async llm => {
      const status = await checkMercanModel(getMercanEndpoint(llm.modelId), {
        timeoutMs: 1500
      })

      // Otomatik demo: model hazır değilse bu model için örnek yanıt verilir.
      if (demoMode === "auto" && !status.ready) status.demo = true

      return [llm.modelId, status] as [string, ModelStatus]
    })
  )

  const body: MercanStatus = {
    demo: demoMode === "on",
    webSearchProvider: getSearchProvider(),
    models: Object.fromEntries(entries)
  }

  return Response.json(body, { headers: { "Cache-Control": "no-store" } })
}
