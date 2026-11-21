import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { ChatbotUIContext } from "@/context/context"
import { settingsSummary } from "@/lib/mercan/hyperparameters"
import { LLM_LIST } from "@/lib/models/llm/llm-list"
import { chatSettingsFromRow } from "@/lib/mercan/settings"
import { IconInfoCircle, IconMessagePlus } from "@tabler/icons-react"
import { FC, useContext } from "react"
import { ModelSwitcher } from "../models/model-switcher"
import { WithTooltip } from "../ui/with-tooltip"

interface ChatSecondaryButtonsProps {}

export const ChatSecondaryButtons: FC<ChatSecondaryButtonsProps> = ({}) => {
  const { selectedChat } = useContext(ChatbotUIContext)

  const { handleNewChat } = useChatHandler()

  if (!selectedChat) return <ModelSwitcher compact />

  // Sohbetin son mesajında kullanılan ayarlar
  const settings = chatSettingsFromRow(selectedChat)
  const modelName =
    LLM_LIST.find(llm => llm.modelId === settings.model)?.modelName ??
    settings.model

  return (
    <>
      <ModelSwitcher compact />

      <WithTooltip
        delayDuration={200}
        side="bottom"
        display={
          <div>
            <div className="text-xl font-bold">Sohbet Bilgisi</div>

            <div className="mx-auto mt-2 max-w-xs space-y-2 sm:max-w-sm md:max-w-md lg:max-w-lg">
              <div>Model: {modelName}</div>
              <div className="line-clamp-3">Sistem istemi: {settings.prompt}</div>

              {settingsSummary(settings).map(item => (
                <div key={item.param}>
                  {item.label}: {item.value}{" "}
                  <span className="text-muted-foreground font-mono text-xs">
                    ({item.param})
                  </span>
                </div>
              ))}

              <div>
                Durdurma dizileri:{" "}
                {settings.stopSequences.length > 0
                  ? settings.stopSequences.join(", ")
                  : "Yok"}
              </div>
            </div>
          </div>
        }
        trigger={
          <div className="mt-1">
            <IconInfoCircle
              className="cursor-default hover:opacity-50"
              size={24}
            />
          </div>
        }
      />

      <WithTooltip
        delayDuration={200}
        side="bottom"
        display={<div>Yeni sohbet başlat</div>}
        trigger={
          <div className="mt-1">
            <IconMessagePlus
              className="cursor-pointer hover:opacity-50"
              size={24}
              onClick={handleNewChat}
            />
          </div>
        }
      />
    </>
  )
}
