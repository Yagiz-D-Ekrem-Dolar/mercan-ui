import { ChatbotUIContext } from "@/context/context"
import { updateWorkspace } from "@/db/workspaces"
import { LLM_LIST } from "@/lib/models/llm/llm-list"
import { clampChatSettings } from "@/lib/mercan/settings"
import { cn } from "@/lib/utils"
import { LLMID } from "@/types"
import { IconCheck, IconChevronDown } from "@tabler/icons-react"
import { FC, useContext, useState } from "react"
import { MercanSVG } from "../icons/mercan-svg"
import { Button } from "../ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "../ui/dropdown-menu"
import { ModelStatusDot } from "./model-status-dot"

interface ModelSwitcherProps {
  // Sohbet başlığında daha küçük gösterilir
  compact?: boolean
}

// Sağ üstteki model düğmesi: tek tıkla Mercan 0.8B / 1.7B seçilir.
// Sistem istemi ve hiperparametreler burada değil, Ayarlar panelindedir.
export const ModelSwitcher: FC<ModelSwitcherProps> = ({ compact = false }) => {
  const {
    chatSettings,
    setChatSettings,
    selectedWorkspace,
    setSelectedWorkspace,
    refreshMercanStatus
  } = useContext(ChatbotUIContext)

  const [isOpen, setIsOpen] = useState(false)

  if (!chatSettings) return null

  const selectedModel = LLM_LIST.find(
    model => model.modelId === chatSettings.model
  )

  const handleSelect = async (modelId: LLMID) => {
    setChatSettings(prev => clampChatSettings({ ...prev, model: modelId }))

    // Son seçilen model bir sonraki açılışta da kullanılsın.
    if (selectedWorkspace && selectedWorkspace.default_model !== modelId) {
      setSelectedWorkspace(
        await updateWorkspace(selectedWorkspace.id, { default_model: modelId })
      )
    }
  }

  return (
    <DropdownMenu
      open={isOpen}
      onOpenChange={open => {
        setIsOpen(open)
        if (open) refreshMercanStatus()
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "flex items-center space-x-2",
            compact ? "h-8 px-2 text-base" : "text-lg"
          )}
          title="Model seç"
        >
          <span>{selectedModel?.modelName ?? chatSettings.model}</span>
          <ModelStatusDot modelId={chatSettings.model} />
          <IconChevronDown size={compact ? 16 : 20} />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[300px] p-1">
        {LLM_LIST.map(model => (
          <DropdownMenuItem
            key={model.modelId}
            className="flex cursor-pointer items-center space-x-3 p-2"
            onSelect={() => handleSelect(model.modelId)}
          >
            <MercanSVG size={26} />

            <div className="flex grow flex-col">
              <div className="flex items-center space-x-2 font-semibold">
                <span>{model.modelName}</span>
                <ModelStatusDot modelId={model.modelId} />
              </div>

              {model.description && (
                <div className="text-muted-foreground text-xs">
                  {model.description}
                </div>
              )}
            </div>

            <div className="w-[18px]">
              {model.modelId === chatSettings.model && <IconCheck size={18} />}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
