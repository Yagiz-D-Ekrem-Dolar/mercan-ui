import { ChatbotUIContext } from "@/context/context"
import useHotkey from "@/lib/hooks/use-hotkey"
import { cn } from "@/lib/utils"
import {
  IconBulb,
  IconPlayerStopFilled,
  IconSend,
  IconWorld
} from "@tabler/icons-react"
import { FC, ReactNode, useContext, useEffect, useState } from "react"
import { TextareaAutosize } from "../ui/textarea-autosize"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"
import { useChatHandler } from "./chat-hooks/use-chat-handler"
import { useChatHistoryHandler } from "./chat-hooks/use-chat-history"

interface ComposerToggleProps {
  active: boolean
  icon: ReactNode
  label: string
  tooltip: string
  onToggle: () => void
}

const ComposerToggle: FC<ComposerToggleProps> = ({
  active,
  icon,
  label,
  tooltip,
  onToggle
}) => {
  return (
    <Tooltip delayDuration={400}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-pressed={active}
          onClick={onToggle}
          className={cn(
            "focus-visible:ring-ring flex h-8 select-none items-center space-x-1.5 rounded-full border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2",
            active
              ? "border-primary bg-accent text-foreground"
              : "border-input text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          {icon}
          <span>{label}</span>
        </button>
      </TooltipTrigger>

      <TooltipContent side="top" className="max-w-[260px] text-sm">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}

interface ChatInputProps {}

export const ChatInput: FC<ChatInputProps> = ({}) => {
  useHotkey("l", () => {
    handleFocusChatInput()
  })

  const [isTyping, setIsTyping] = useState<boolean>(false)

  const {
    userInput,
    setUserInput,
    chatMessages,
    isGenerating,
    reasoningEnabled,
    setReasoningEnabled,
    webSearchEnabled,
    setWebSearchEnabled
  } = useContext(ChatbotUIContext)

  const {
    chatInputRef,
    handleSendMessage,
    handleStopMessage,
    handleFocusChatInput
  } = useChatHandler()

  const {
    setNewMessageContentToNextUserMessage,
    setNewMessageContentToPreviousUserMessage
  } = useChatHistoryHandler()

  useEffect(() => {
    setTimeout(() => {
      handleFocusChatInput()
    }, 200) // FIX: hacky
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const canSend = userInput.trim().length > 0 && !isGenerating

  const send = () => {
    if (!canSend) return
    handleSendMessage(userInput, chatMessages, false)
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isTyping && event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      send()
    }

    // Ctrl/⌘ + Shift + ↑/↓ ile önceki mesajlar arasında gezin
    if (event.key === "ArrowUp" && event.shiftKey && event.ctrlKey) {
      event.preventDefault()
      setNewMessageContentToPreviousUserMessage()
    }

    if (event.key === "ArrowDown" && event.shiftKey && event.ctrlKey) {
      event.preventDefault()
      setNewMessageContentToNextUserMessage()
    }
  }

  return (
    <div className="border-input relative mt-3 flex w-full flex-col rounded-xl border-2">
      <TextareaAutosize
        textareaRef={chatInputRef}
        className="ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring text-md flex w-full resize-none rounded-md border-none bg-transparent px-4 pb-1 pt-3 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        placeholder="Mercan'a bir şey sorun..."
        onValueChange={setUserInput}
        value={userInput}
        minRows={1}
        maxRows={18}
        onKeyDown={handleKeyDown}
        onCompositionStart={() => setIsTyping(true)}
        onCompositionEnd={() => setIsTyping(false)}
      />

      <div className="flex items-center justify-between gap-2 px-2 pb-2 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          <ComposerToggle
            active={reasoningEnabled}
            icon={<IconBulb size={18} />}
            label="Akıl yürütme"
            tooltip="Mercan yanıt vermeden önce adım adım düşünür. Düşünce süreci yanıtın üstünde açılır kutuda gösterilir; yanıt biraz daha geç gelir."
            onToggle={() => setReasoningEnabled(prev => !prev)}
          />

          <ComposerToggle
            active={webSearchEnabled}
            icon={<IconWorld size={18} />}
            label="Web araması"
            tooltip="Yanıt vermeden önce web'de arama yapar, bulunan sonuçları modele verir ve kaynakları yanıtın altında listeler."
            onToggle={() => setWebSearchEnabled(prev => !prev)}
          />
        </div>

        {isGenerating ? (
          <Tooltip delayDuration={400}>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Durdur"
                onClick={handleStopMessage}
                className="hover:bg-accent shrink-0 rounded p-1 hover:opacity-50"
              >
                <IconPlayerStopFilled className="animate-pulse" size={24} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Durdur</TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip delayDuration={400}>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Gönder"
                onClick={send}
                disabled={!canSend}
                className={cn(
                  "bg-primary text-secondary shrink-0 rounded p-1 transition-opacity hover:opacity-50",
                  !canSend && "cursor-not-allowed opacity-50 hover:opacity-50"
                )}
              >
                <IconSend size={22} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Gönder (Enter)</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  )
}
