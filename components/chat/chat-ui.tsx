import Loading from "@/app/[locale]/loading"
import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { ChatbotUIContext } from "@/context/context"
import { getChatById } from "@/db/chats"
import { getMessagesByChatId } from "@/db/messages"
import useHotkey from "@/lib/hooks/use-hotkey"
import { normalizeModel } from "@/lib/mercan/settings"
import { useParams, useRouter } from "next/navigation"
import { FC, useContext, useEffect, useState } from "react"
import { ChatHelp } from "./chat-help"
import { useScroll } from "./chat-hooks/use-scroll"
import { ChatInput } from "./chat-input"
import { ChatMessages } from "./chat-messages"
import { ChatScrollButtons } from "./chat-scroll-buttons"
import { ChatSecondaryButtons } from "./chat-secondary-buttons"

interface ChatUIProps {}

export const ChatUI: FC<ChatUIProps> = ({}) => {
  useHotkey("o", () => handleNewChat())

  const params = useParams()
  const router = useRouter()

  const {
    setChatMessages,
    selectedChat,
    setSelectedChat,
    setChatSettings,
    selectedWorkspace
  } = useContext(ChatbotUIContext)

  const { handleNewChat, handleFocusChatInput } = useChatHandler()

  const {
    messagesStartRef,
    messagesEndRef,
    handleScroll,
    scrollToBottom,
    setIsAtBottom,
    isAtTop,
    isAtBottom,
    isOverflowing,
    scrollToTop
  } = useScroll()

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const found = await fetchChat()
      if (!found) return false

      await fetchMessages()

      scrollToBottom()
      setIsAtBottom(true)
      return true
    }

    if (params.chatid) {
      fetchData().then(found => {
        if (!found) {
          router.replace(`/${selectedWorkspace?.id ?? params.workspaceid}/chat`)
          return
        }

        handleFocusChatInput()
        setLoading(false)
      })
    } else {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchMessages = async () => {
    const fetchedMessages = await getMessagesByChatId(params.chatid as string)

    setChatMessages(fetchedMessages.map(message => ({ message })))
  }

  const fetchChat = async () => {
    const chat = await getChatById(params.chatid as string)
    if (!chat) return false

    setSelectedChat(chat)
    // Sistem istemi ve hiperparametreler geneldir (Ayarlar); sohbetten yalnızca
    // en son kullanılan model geri yüklenir.
    setChatSettings(prev => ({ ...prev, model: normalizeModel(chat.model) }))
    return true
  }

  if (loading) {
    return <Loading />
  }

  return (
    <div className="relative flex h-full flex-col items-center">
      <div className="absolute left-4 top-2.5 flex justify-center">
        <ChatScrollButtons
          isAtTop={isAtTop}
          isAtBottom={isAtBottom}
          isOverflowing={isOverflowing}
          scrollToTop={scrollToTop}
          scrollToBottom={scrollToBottom}
        />
      </div>

      <div className="absolute right-4 top-1 flex h-[40px] items-center space-x-2">
        <ChatSecondaryButtons />
      </div>

      <div className="bg-secondary flex max-h-[50px] min-h-[50px] w-full items-center justify-center border-b-2 font-bold">
        <div className="max-w-[200px] truncate sm:max-w-[400px] md:max-w-[500px] lg:max-w-[600px] xl:max-w-[700px]">
          {selectedChat?.name || "Sohbet"}
        </div>
      </div>

      <div
        className="flex size-full flex-col overflow-auto border-b"
        onScroll={handleScroll}
      >
        <div ref={messagesStartRef} />

        <ChatMessages />

        <div ref={messagesEndRef} />
      </div>

      <div className="relative w-full min-w-[300px] max-w-full items-end px-2 pb-3 pt-0 sm:w-[600px] sm:pb-8 sm:pt-5 md:w-[700px] lg:w-[700px] xl:w-[800px]">
        <ChatInput />
      </div>

      <div className="absolute bottom-2 right-2 hidden md:block lg:bottom-4 lg:right-4">
        <ChatHelp />
      </div>
    </div>
  )
}
