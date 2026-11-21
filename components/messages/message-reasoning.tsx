import { cn } from "@/lib/utils"
import {
  IconBulb,
  IconChevronDown,
  IconChevronRight
} from "@tabler/icons-react"
import { FC, useState } from "react"

interface MessageReasoningProps {
  reasoning: string
  isThinking: boolean
  showCursor?: boolean
}

// Akıl yürütme modunda modelin <think> bölümünü açılır kutu olarak gösterir.
export const MessageReasoning: FC<MessageReasoningProps> = ({
  reasoning,
  isThinking,
  showCursor = false
}) => {
  // Kullanıcı açıp kapatmadıysa: düşünürken açık, bitince kapalı.
  const [userOpen, setUserOpen] = useState<boolean | null>(null)
  const isOpen = userOpen ?? isThinking

  return (
    <div className="border-input rounded-lg border">
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground flex w-full items-center space-x-2 px-3 py-2 text-sm font-semibold"
        onClick={() => setUserOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <IconBulb size={18} className={cn(isThinking && "animate-pulse")} />

        <span className={cn(isThinking && "animate-pulse")}>
          {isThinking ? "Düşünüyor…" : "Düşünce süreci"}
        </span>

        {isOpen ? (
          <IconChevronDown size={16} stroke={3} />
        ) : (
          <IconChevronRight size={16} stroke={3} />
        )}
      </button>

      {isOpen && (reasoning || showCursor) && (
        <div className="text-muted-foreground border-input mx-3 mb-3 whitespace-pre-wrap break-words border-l-2 pl-3 text-sm leading-relaxed">
          {reasoning}
          {showCursor && (
            <span className="ml-0.5 animate-pulse cursor-default">▍</span>
          )}
        </div>
      )}
    </div>
  )
}
