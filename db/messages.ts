import { localDb } from "@/lib/local-db"
import { Tables, TablesInsert, TablesUpdate } from "@/types/database"

export const getMessageById = async (messageId: string) => {
  const message = localDb.get<Tables<"messages">>("messages", messageId)

  if (!message) {
    throw new Error("Mesaj bulunamadı.")
  }

  return message
}

export const getMessagesByChatId = async (chatId: string) => {
  return localDb
    .filter<Tables<"messages">>("messages", message => message.chat_id === chatId)
    .sort((a, b) => a.sequence_number - b.sequence_number)
}

export const createMessage = async (message: TablesInsert<"messages">) => {
  return localDb.insert<Tables<"messages">>("messages", {
    assistant_id: null,
    metadata: null,
    ...message
  })
}

export const createMessages = async (messages: TablesInsert<"messages">[]) => {
  return Promise.all(messages.map(message => createMessage(message)))
}

export const updateMessage = async (
  messageId: string,
  message: TablesUpdate<"messages">
) => {
  return localDb.update<Tables<"messages">>("messages", messageId, message)
}

export const deleteMessage = async (messageId: string) => {
  localDb.remove("messages", messageId)
  return true
}

export async function deleteMessagesIncludingAndAfter(
  chatId: string,
  sequenceNumber: number
) {
  localDb.removeWhere(
    "messages",
    message =>
      message.chat_id === chatId && message.sequence_number >= sequenceNumber
  )

  return true
}
