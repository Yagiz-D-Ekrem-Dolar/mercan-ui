// TODO: Separate into multiple contexts, keeping simple for now

"use client"

import { ChatbotUIContext, ToolInUse } from "@/context/context"
import { ensureLocalSetup } from "@/db/local-setup"
import { getWorkspacesByUserId } from "@/db/workspaces"
import { DEFAULT_CHAT_SETTINGS } from "@/lib/mercan/settings"
import { Tables } from "@/types/database"
import { ChatMessage, ChatSettings, MercanStatus } from "@/types"
import { FC, useCallback, useEffect, useState } from "react"

interface GlobalStateProps {
  children: React.ReactNode
}

const REASONING_KEY = "mercan-ui:reasoning"
const WEB_SEARCH_KEY = "mercan-ui:web-search"

const readFlag = (key: string) => {
  try {
    return window.localStorage.getItem(key) === "true"
  } catch {
    return false
  }
}

const writeFlag = (key: string, value: boolean) => {
  try {
    window.localStorage.setItem(key, String(value))
  } catch {
    // Depolama kapalıysa tercih yalnızca bu oturumda geçerli olur.
  }
}

export const GlobalState: FC<GlobalStateProps> = ({ children }) => {
  // PROFILE STORE
  const [profile, setProfile] = useState<Tables<"profiles"> | null>(null)

  // ITEMS STORE
  const [chats, setChats] = useState<Tables<"chats">[]>([])
  const [folders, setFolders] = useState<Tables<"folders">[]>([])
  const [workspaces, setWorkspaces] = useState<Tables<"workspaces">[]>([])

  // MERCAN SERVER STORE
  const [mercanStatus, setMercanStatus] = useState<MercanStatus | null>(null)

  // WORKSPACE STORE
  const [selectedWorkspace, setSelectedWorkspace] =
    useState<Tables<"workspaces"> | null>(null)

  // PASSIVE CHAT STORE
  const [userInput, setUserInput] = useState<string>("")
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatSettings, setChatSettings] = useState<ChatSettings>(
    DEFAULT_CHAT_SETTINGS
  )
  const [selectedChat, setSelectedChat] = useState<Tables<"chats"> | null>(null)

  // ACTIVE CHAT STORE
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [firstTokenReceived, setFirstTokenReceived] = useState<boolean>(false)
  const [abortController, setAbortController] =
    useState<AbortController | null>(null)
  const [toolInUse, setToolInUse] = useState<ToolInUse>("none")

  // COMPOSER TOGGLES
  const [reasoningEnabled, setReasoningEnabled] = useState<boolean>(false)
  const [webSearchEnabled, setWebSearchEnabled] = useState<boolean>(false)
  const [togglesLoaded, setTogglesLoaded] = useState(false)

  const refreshMercanStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/mercan/status", { cache: "no-store" })
      if (!response.ok) return
      setMercanStatus((await response.json()) as MercanStatus)
    } catch {
      // Sunucu durumu alınamazsa model listesi durum göstermeden çalışır.
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      const { profile } = ensureLocalSetup()
      setProfile(profile)
      setWorkspaces(await getWorkspacesByUserId(profile.user_id))
    })()

    setReasoningEnabled(readFlag(REASONING_KEY))
    setWebSearchEnabled(readFlag(WEB_SEARCH_KEY))
    setTogglesLoaded(true)

    refreshMercanStatus()
    const interval = window.setInterval(refreshMercanStatus, 30_000)
    return () => window.clearInterval(interval)
  }, [refreshMercanStatus])

  useEffect(() => {
    if (togglesLoaded) writeFlag(REASONING_KEY, reasoningEnabled)
  }, [reasoningEnabled, togglesLoaded])

  useEffect(() => {
    if (togglesLoaded) writeFlag(WEB_SEARCH_KEY, webSearchEnabled)
  }, [webSearchEnabled, togglesLoaded])

  return (
    <ChatbotUIContext.Provider
      value={{
        // PROFILE STORE
        profile,
        setProfile,

        // ITEMS STORE
        chats,
        setChats,
        folders,
        setFolders,
        workspaces,
        setWorkspaces,

        // MERCAN SERVER STORE
        mercanStatus,
        refreshMercanStatus,

        // WORKSPACE STORE
        selectedWorkspace,
        setSelectedWorkspace,

        // PASSIVE CHAT STORE
        userInput,
        setUserInput,
        chatMessages,
        setChatMessages,
        chatSettings,
        setChatSettings,
        selectedChat,
        setSelectedChat,

        // ACTIVE CHAT STORE
        isGenerating,
        setIsGenerating,
        firstTokenReceived,
        setFirstTokenReceived,
        abortController,
        setAbortController,
        toolInUse,
        setToolInUse,

        // COMPOSER TOGGLES
        reasoningEnabled,
        setReasoningEnabled,
        webSearchEnabled,
        setWebSearchEnabled
      }}
    >
      {children}
    </ChatbotUIContext.Provider>
  )
}
