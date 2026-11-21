import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { ChatbotUIContext } from "@/context/context"
import { splitReasoning } from "@/lib/build-prompt"
import { useTypewriter } from "@/lib/hooks/use-typewriter"
import { formatSettingValue } from "@/lib/mercan/hyperparameters"
import { LLM_LIST } from "@/lib/models/llm/llm-list"
import { cn } from "@/lib/utils"
import { Tables } from "@/types/database"
import { MessageMetadata } from "@/types"
import {
  IconBulb,
  IconCircleFilled,
  IconPencil,
  IconWorld
} from "@tabler/icons-react"
import { FC, useContext, useEffect, useRef, useState } from "react"
import { ModelIcon } from "../models/model-icon"
import { Button } from "../ui/button"
import { TextareaAutosize } from "../ui/textarea-autosize"
import { WithTooltip } from "../ui/with-tooltip"
import { MessageActions } from "./message-actions"
import { MessageMarkdown } from "./message-markdown"
import { MessageReasoning } from "./message-reasoning"
import { MessageSources } from "./message-sources"

const ICON_SIZE = 32

// Yazım sırasında metnin sonuna yanıp sönen imleç ekler (MessageMarkdown
// içinde `▍` satır içi kodu imleç olarak çizilir).
const withCursor = (text: string) => {
  const openFences = (text.match(/```/g) || []).length % 2 === 1
  return openFences ? `${text}▍` : `${text}${text ? " " : ""}\`▍\``
}

interface MessageProps {
  message: Tables<"messages">
  isEditing: boolean
  isLast: boolean
  onStartEdit: (message: Tables<"messages">) => void
  onCancelEdit: () => void
  onSubmitEdit: (value: string, sequenceNumber: number) => void
}

export const Message: FC<MessageProps> = ({
  message,
  isEditing,
  isLast,
  onStartEdit,
  onCancelEdit,
  onSubmitEdit
}) => {
  const {
    profile,
    isGenerating,
    setIsGenerating,
    firstTokenReceived,
    chatMessages,
    toolInUse
  } = useContext(ChatbotUIContext)

  const { handleSendMessage } = useChatHandler()

  const editInputRef = useRef<HTMLTextAreaElement>(null)

  const [isHovering, setIsHovering] = useState(false)
  const [editedMessage, setEditedMessage] = useState(message.content)

  const isAssistant = message.role === "assistant"
  const metadata = (message.metadata ?? {}) as MessageMetadata
  const isStreaming = isGenerating && isLast && isAssistant

  // Daktilo efekti: yalnızca o an üretilen asistan yanıtında
  const { displayedText, isTyping } = useTypewriter(
    message.content,
    isStreaming
  )
  const visibleContent = isAssistant ? displayedText : message.content
  const showCursor = isAssistant && (isStreaming || isTyping)

  const { reasoning, answer, isThinking } = isAssistant
    ? splitReasoning(visibleContent)
    : { reasoning: "", answer: message.content, isThinking: false }

  const handleCopy = () => {
    const text = isAssistant
      ? splitReasoning(message.content).answer
      : message.content

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
    } else {
      const textArea = document.createElement("textarea")
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
    }
  }

  const handleSendEdit = () => {
    onSubmitEdit(editedMessage, message.sequence_number)
    onCancelEdit()
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (
      isEditing &&
      event.key === "Enter" &&
      (event.metaKey || event.ctrlKey)
    ) {
      handleSendEdit()
    }
  }

  const handleRegenerate = async () => {
    setIsGenerating(true)

    const lastUserMessage = [...chatMessages]
      .reverse()
      .find(chatMessage => chatMessage.message.role === "user")

    await handleSendMessage(
      lastUserMessage?.message.content || "",
      chatMessages,
      true
    )
  }

  const handleStartEdit = () => {
    onStartEdit(message)
  }

  useEffect(() => {
    setEditedMessage(message.content)

    if (isEditing && editInputRef.current) {
      const input = editInputRef.current
      input.focus()
      input.setSelectionRange(input.value.length, input.value.length)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing])

  const modelData = LLM_LIST.find(llm => llm.modelId === message.model)

  const renderPending = () => {
    if (toolInUse === "web") {
      return (
        <div className="flex animate-pulse items-center space-x-2">
          <IconWorld size={20} />
          <div>{"Web'de aranıyor…"}</div>
        </div>
      )
    }

    if (metadata.reasoning) {
      return (
        <div className="flex animate-pulse items-center space-x-2">
          <IconBulb size={20} />
          <div>Düşünüyor…</div>
        </div>
      )
    }

    return <IconCircleFilled className="animate-pulse" size={20} />
  }

  const usage = metadata.usage
  const isDone = !isStreaming && !isTyping

  return (
    <div
      className={cn(
        "flex w-full justify-center",
        message.role === "user" ? "" : "bg-secondary"
      )}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onKeyDown={handleKeyDown}
    >
      <div className="relative flex w-full max-w-full flex-col p-6 sm:w-[550px] sm:px-0 md:w-[650px] lg:w-[650px] xl:w-[700px]">
        <div className="absolute right-5 top-7 sm:right-0">
          <MessageActions
            onCopy={handleCopy}
            onEdit={handleStartEdit}
            isAssistant={isAssistant}
            isLast={isLast}
            isEditing={isEditing}
            isHovering={isHovering}
            onRegenerate={handleRegenerate}
          />
        </div>

        <div className="space-y-3">
          {message.role === "system" ? (
            <div className="flex items-center space-x-4">
              <IconPencil
                className="border-primary bg-primary text-secondary rounded border-DEFAULT p-1"
                size={ICON_SIZE}
              />

              <div className="text-lg font-semibold">Sistem İstemi</div>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              {isAssistant ? (
                <WithTooltip
                  display={<div>{modelData?.modelName ?? message.model}</div>}
                  trigger={
                    <ModelIcon
                      provider={modelData?.provider ?? "mercan"}
                      height={ICON_SIZE}
                      width={ICON_SIZE}
                    />
                  }
                />
              ) : (
                <div
                  className="flex shrink-0 items-center justify-center"
                  style={{ width: ICON_SIZE, height: ICON_SIZE }}
                >
                  <div className="bg-muted-foreground size-2.5 rounded-full" />
                </div>
              )}

              <div className="font-semibold">
                {isAssistant
                  ? modelData?.modelName ?? message.model
                  : profile?.display_name || "Sen"}
              </div>

              {isAssistant && metadata.demo && (
                <div className="text-muted-foreground border-input rounded border px-1.5 text-xs">
                  Demo yanıtı
                </div>
              )}
            </div>
          )}

          {!firstTokenReceived && isStreaming && !message.content ? (
            renderPending()
          ) : isEditing ? (
            <TextareaAutosize
              textareaRef={editInputRef}
              className="text-md"
              value={editedMessage}
              onValueChange={setEditedMessage}
              maxRows={20}
            />
          ) : (
            <>
              {(reasoning || isThinking) && (
                <MessageReasoning
                  reasoning={reasoning}
                  isThinking={isThinking && showCursor}
                  showCursor={isThinking && showCursor}
                />
              )}

              {showCursor && !isThinking ? (
                <MessageMarkdown content={withCursor(answer)} />
              ) : (
                answer && <MessageMarkdown content={answer} />
              )}
            </>
          )}
        </div>

        {isAssistant &&
          isDone &&
          metadata.sources &&
          metadata.sources.length > 0 && (
            <MessageSources sources={metadata.sources} />
          )}

        {isAssistant && metadata.searchError && isDone && (
          <div className="text-muted-foreground mt-4 text-xs">
            Web araması yapılamadı: {metadata.searchError}
          </div>
        )}

        {isAssistant && isDone && (usage || metadata.finishReason) && (
          <div className="text-muted-foreground mt-4 flex flex-wrap gap-x-3 text-xs">
            {usage?.completionTokens !== undefined && (
              <span>{usage.completionTokens} token</span>
            )}

            {usage?.tokensPerSecond !== undefined &&
              usage.tokensPerSecond > 0 && (
                <span>
                  {formatSettingValue(usage.tokensPerSecond, 1)} token/sn
                </span>
              )}

            {metadata.finishReason === "length" && (
              <span>Yanıt uzunluk sınırında kesildi (max_tokens)</span>
            )}
          </div>
        )}

        {isEditing && (
          <div className="mt-4 flex justify-center space-x-2">
            <Button size="sm" onClick={handleSendEdit}>
              Kaydet ve Gönder
            </Button>

            <Button size="sm" variant="outline" onClick={onCancelEdit}>
              Vazgeç
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
