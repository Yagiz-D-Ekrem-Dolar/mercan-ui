import { cn } from "@/lib/utils"
import { ModelProvider } from "@/types"
import { IconSparkles } from "@tabler/icons-react"
import { FC, HTMLAttributes } from "react"
import { MercanSVG } from "../icons/mercan-svg"

interface ModelIconProps extends HTMLAttributes<HTMLDivElement> {
  provider: ModelProvider | undefined
  height: number
  width: number
}

// Mercan modelleri için şeffaf (arka plansız) Mercan işareti.
export const ModelIcon: FC<ModelIconProps> = ({
  provider,
  height,
  width,
  className
}) => {
  switch (provider) {
    case "mercan":
      return (
        <div
          className={cn("flex shrink-0 items-center justify-center", className)}
          style={{ width, height }}
        >
          <MercanSVG size={Math.round(height * 0.9)} />
        </div>
      )
    default:
      return <IconSparkles size={width} />
  }
}
