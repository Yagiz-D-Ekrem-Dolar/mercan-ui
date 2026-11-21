import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { ChatbotUIContext } from "@/context/context"
import { Tables } from "@/types/database"
import { FC, useContext, useState } from "react"
import { Message } from "../messages/message"

interface ChatMessagesProps {}

export const ChatMessages: FC<ChatMessagesProps> = ({}) => {
  const { chatMessages } = useContext(ChatbotUIContext)

  const { handleSendEdit } = useChatHandler()

  const [editingMessage, setEditingMessage] = useState<Tables<"messages">>()

  return [...chatMessages]
    .sort((a, b) => a.message.sequence_number - b.message.sequence_number)
    .map((chatMessage, index, array) => (
      <Message
        key={chatMessage.message.sequence_number}
        message={chatMessage.message}
        isEditing={editingMessage?.id === chatMessage.message.id}
        isLast={index === array.length - 1}
        onStartEdit={setEditingMessage}
        onCancelEdit={() => setEditingMessage(undefined)}
        onSubmitEdit={handleSendEdit}
      />
    ))
}
