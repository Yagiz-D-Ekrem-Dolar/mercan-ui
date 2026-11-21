import { localDb } from "@/lib/local-db"
import { Tables, TablesInsert, TablesUpdate } from "@/types/database"

export const getChatById = async (chatId: string) => {
  return localDb.get<Tables<"chats">>("chats", chatId)
}

export const getChatsByWorkspaceId = async (workspaceId: string) => {
  return localDb
    .filter<Tables<"chats">>("chats", chat => chat.workspace_id === workspaceId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export const createChat = async (chat: TablesInsert<"chats">) => {
  return localDb.insert<Tables<"chats">>("chats", {
    assistant_id: null,
    folder_id: null,
    sharing: "private",
    hyperparameters: null,
    ...chat
  })
}

export const createChats = async (chats: TablesInsert<"chats">[]) => {
  return Promise.all(chats.map(chat => createChat(chat)))
}

export const updateChat = async (
  chatId: string,
  chat: TablesUpdate<"chats">
) => {
  return localDb.update<Tables<"chats">>("chats", chatId, chat)
}

export const deleteChat = async (chatId: string) => {
  localDb.removeWhere("messages", message => message.chat_id === chatId)
  localDb.remove("chats", chatId)
  return true
}
