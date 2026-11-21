"use client"

import { Dashboard } from "@/components/ui/dashboard"
import { ChatbotUIContext } from "@/context/context"
import { getChatsByWorkspaceId } from "@/db/chats"
import { getFoldersByWorkspaceId } from "@/db/folders"
import { HOME_WORKSPACE_ID, ensureLocalSetup } from "@/db/local-setup"
import { getWorkspaceById } from "@/db/workspaces"
import { chatSettingsFromWorkspace, normalizeModel } from "@/lib/mercan/settings"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { ReactNode, useContext, useEffect, useState } from "react"
import Loading from "../loading"

interface WorkspaceLayoutProps {
  children: ReactNode
}

export default function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  const router = useRouter()

  const params = useParams()
  const searchParams = useSearchParams()
  const workspaceId = params.workspaceid as string

  const {
    setChatSettings,
    setChats,
    setFolders,
    setSelectedWorkspace,
    setSelectedChat,
    setChatMessages,
    setUserInput,
    setIsGenerating,
    setFirstTokenReceived
  } = useContext(ChatbotUIContext)

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => await fetchWorkspaceData(workspaceId))()

    setUserInput("")
    setChatMessages([])
    setSelectedChat(null)

    setIsGenerating(false)
    setFirstTokenReceived(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId])

  const fetchWorkspaceData = async (workspaceId: string) => {
    setLoading(true)

    ensureLocalSetup()

    let workspace
    try {
      workspace = await getWorkspaceById(workspaceId)
    } catch {
      return router.replace(`/${HOME_WORKSPACE_ID}/chat`)
    }

    setSelectedWorkspace(workspace)

    setChats(await getChatsByWorkspaceId(workspaceId))
    setFolders(await getFoldersByWorkspaceId(workspaceId))

    // Ayarlar (sistem istemi, hiperparametreler) ve son seçilen model
    // çalışma alanında saklanır.
    const workspaceSettings = chatSettingsFromWorkspace(workspace)
    const modelParam = searchParams.get("model")

    setChatSettings(
      modelParam
        ? { ...workspaceSettings, model: normalizeModel(modelParam) }
        : workspaceSettings
    )

    setLoading(false)
  }

  if (loading) {
    return <Loading />
  }

  return <Dashboard>{children}</Dashboard>
}
