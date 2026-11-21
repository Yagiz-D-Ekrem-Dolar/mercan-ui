import { Tables } from "@/types/database"
import { ChatMessage, ChatSettings, MercanStatus } from "@/types"
import { Dispatch, SetStateAction, createContext } from "react"

export type ToolInUse = "none" | "web"

interface ChatbotUIContext {
  // PROFILE STORE (yerel, arayüzde gösterilmez)
  profile: Tables<"profiles"> | null
  setProfile: Dispatch<SetStateAction<Tables<"profiles"> | null>>

  // ITEMS STORE
  chats: Tables<"chats">[]
  setChats: Dispatch<SetStateAction<Tables<"chats">[]>>
  folders: Tables<"folders">[]
  setFolders: Dispatch<SetStateAction<Tables<"folders">[]>>
  workspaces: Tables<"workspaces">[]
  setWorkspaces: Dispatch<SetStateAction<Tables<"workspaces">[]>>

  // MERCAN SERVER STORE
  mercanStatus: MercanStatus | null
  refreshMercanStatus: () => Promise<void>

  // WORKSPACE STORE
  selectedWorkspace: Tables<"workspaces"> | null
  setSelectedWorkspace: Dispatch<SetStateAction<Tables<"workspaces"> | null>>

  // PASSIVE CHAT STORE
  userInput: string
  setUserInput: Dispatch<SetStateAction<string>>
  chatMessages: ChatMessage[]
  setChatMessages: Dispatch<SetStateAction<ChatMessage[]>>
  chatSettings: ChatSettings | null
  setChatSettings: Dispatch<SetStateAction<ChatSettings>>
  selectedChat: Tables<"chats"> | null
  setSelectedChat: Dispatch<SetStateAction<Tables<"chats"> | null>>

  // ACTIVE CHAT STORE
  abortController: AbortController | null
  setAbortController: Dispatch<SetStateAction<AbortController | null>>
  firstTokenReceived: boolean
  setFirstTokenReceived: Dispatch<SetStateAction<boolean>>
  isGenerating: boolean
  setIsGenerating: Dispatch<SetStateAction<boolean>>
  toolInUse: ToolInUse
  setToolInUse: Dispatch<SetStateAction<ToolInUse>>

  // COMPOSER TOGGLES (akıl yürütme / web araması)
  reasoningEnabled: boolean
  setReasoningEnabled: Dispatch<SetStateAction<boolean>>
  webSearchEnabled: boolean
  setWebSearchEnabled: Dispatch<SetStateAction<boolean>>
}

export const ChatbotUIContext = createContext<ChatbotUIContext>({
  // PROFILE STORE
  profile: null,
  setProfile: () => {},

  // ITEMS STORE
  chats: [],
  setChats: () => {},
  folders: [],
  setFolders: () => {},
  workspaces: [],
  setWorkspaces: () => {},

  // MERCAN SERVER STORE
  mercanStatus: null,
  refreshMercanStatus: async () => {},

  // WORKSPACE STORE
  selectedWorkspace: null,
  setSelectedWorkspace: () => {},

  // PASSIVE CHAT STORE
  userInput: "",
  setUserInput: () => {},
  selectedChat: null,
  setSelectedChat: () => {},
  chatMessages: [],
  setChatMessages: () => {},
  chatSettings: null,
  setChatSettings: () => {},

  // ACTIVE CHAT STORE
  isGenerating: false,
  setIsGenerating: () => {},
  firstTokenReceived: false,
  setFirstTokenReceived: () => {},
  abortController: null,
  setAbortController: () => {},
  toolInUse: "none",
  setToolInUse: () => {},

  // COMPOSER TOGGLES
  reasoningEnabled: false,
  setReasoningEnabled: () => {},
  webSearchEnabled: false,
  setWebSearchEnabled: () => {}
})
