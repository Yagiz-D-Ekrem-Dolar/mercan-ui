import { localDb } from "@/lib/local-db"
import { ContentType } from "@/types"
import { Tables, TablesInsert, TablesUpdate } from "@/types/database"

export const getFoldersByWorkspaceId = async (workspaceId: string) => {
  return localDb.filter<Tables<"folders">>(
    "folders",
    folder => folder.workspace_id === workspaceId
  )
}

export const createFolder = async (folder: TablesInsert<"folders">) => {
  return localDb.insert<Tables<"folders">>("folders", folder)
}

export const updateFolder = async (
  folderId: string,
  folder: TablesUpdate<"folders">
) => {
  return localDb.update<Tables<"folders">>("folders", folderId, folder)
}

// Klasörü siler; içindeki öğeler klasörsüz kalır.
export const deleteFolder = async (folderId: string) => {
  for (const table of ["chats", "presets", "prompts"] as const) {
    localDb.updateWhere(table, row => row.folder_id === folderId, {
      folder_id: null
    })
  }

  localDb.remove("folders", folderId)
  return true
}

// Klasördeki tüm öğeleri siler (sohbetlerin mesajları dahil).
export const deleteFolderItems = async (
  contentType: ContentType,
  folderId: string
) => {
  if (contentType === "chats") {
    const chatIds = new Set(
      localDb
        .filter<Tables<"chats">>("chats", chat => chat.folder_id === folderId)
        .map(chat => chat.id)
    )

    localDb.removeWhere("messages", message => chatIds.has(message.chat_id))
  }

  localDb.removeWhere(contentType, row => row.folder_id === folderId)
  return true
}
