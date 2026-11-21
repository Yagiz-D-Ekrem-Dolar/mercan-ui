import { localDb } from "@/lib/local-db"
import { Tables, TablesUpdate } from "@/types/database"

export const getWorkspaceById = async (workspaceId: string) => {
  const workspace = localDb.get<Tables<"workspaces">>("workspaces", workspaceId)

  if (!workspace) {
    throw new Error("Çalışma alanı bulunamadı.")
  }

  return workspace
}

export const getWorkspacesByUserId = async (userId: string) => {
  return localDb
    .filter<Tables<"workspaces">>(
      "workspaces",
      workspace => workspace.user_id === userId
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export const updateWorkspace = async (
  workspaceId: string,
  workspace: TablesUpdate<"workspaces">
) => {
  return localDb.update<Tables<"workspaces">>(
    "workspaces",
    workspaceId,
    workspace
  )
}
