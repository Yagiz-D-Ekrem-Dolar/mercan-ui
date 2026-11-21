import { ChatbotUIContext } from "@/context/context"
import { cn } from "@/lib/utils"
import { FC, useContext } from "react"

interface ModelStatusDotProps {
  modelId: string
  className?: string
}

// Model sunucusunun durumu: yeşil = hazır, sarı = yükleniyor,
// kırmızı = sunucu bu modeli sunmuyor, gri = ulaşılamıyor, mavi = demo modu.
// Düğmelerin içinde de kullanıldığı için ipucu yerel `title` ile verilir.
export const ModelStatusDot: FC<ModelStatusDotProps> = ({
  modelId,
  className
}) => {
  const { mercanStatus } = useContext(ChatbotUIContext)

  if (!mercanStatus) return null

  const status = mercanStatus.models[modelId]

  let color = "bg-zinc-400"
  let label = status?.error ?? "Sunucuya ulaşılamıyor"

  if (mercanStatus.demo) {
    color = "bg-sky-500"
    label = "Demo modu: yanıtlar örnek metindir (MERCAN_DEMO_MODE)"
  } else if (status?.demo) {
    color = "bg-sky-500"
    label = `Demo: model sunucusu hazır değil, örnek yanıt verilir. ${status.error ?? ""}`.trim()
  } else if (status?.online && status.ready) {
    color = "bg-green-500"
    label = "Hazır"
  } else if (status?.missing) {
    color = "bg-red-500"
    label = status.error ?? "Bu model sunucuda yok"
  } else if (status?.online) {
    color = "bg-yellow-500"
    label = status.error ?? "Model yükleniyor"
  }

  return (
    <span
      title={label}
      aria-label={label}
      role="status"
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        color,
        className
      )}
    />
  )
}
