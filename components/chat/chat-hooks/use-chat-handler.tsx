import { ChatbotUIContext } from "@/context/context"
import { updateChat } from "@/db/chats"
import { deleteMessagesIncludingAndAfter } from "@/db/messages"
import { LLM_LIST } from "@/lib/models/llm/llm-list"
import { rowFromChatSettings } from "@/lib/mercan/settings"
import { ChatMessage, ChatPayload, MessageMetadata } from "@/types"
import { useRouter } from "next/navigation"
import { useContext, useRef } from "react"
import { toast } from "sonner"
import {
  createTempMessages,
  handleCreateChat,
  handleCreateMessages,
  handleHostedChat,
  validateChatSettings
} from "../chat-helpers"

const isAbortError = (error: unknown) =>
  error instanceof DOMException && error.name === "AbortError"

export const useChatHandler = () => {
  const router = useRouter()

  const {
    setUserInput,
    profile,
    setIsGenerating,
    setChatMessages,
    setFirstTokenReceived,
    selectedChat,
    selectedWorkspace,
    setSelectedChat,
    setChats,
    abortController,
    setAbortController,
    chatSettings,
    chatMessages,
    setToolInUse,
    reasoningEnabled,
    webSearchEnabled
  } = useContext(ChatbotUIContext)

  const chatInputRef = useRef<HTMLTextAreaElement>(null)

  const handleNewChat = async () => {
    if (!selectedWorkspace) return

    setUserInput("")
    setChatMessages([])
    setSelectedChat(null)

    setIsGenerating(false)
    setFirstTokenReceived(false)
    setToolInUse("none")

    return router.push(`/${selectedWorkspace.id}/chat`)
  }

  const handleFocusChatInput = () => {
    chatInputRef.current?.focus()
  }

  const handleStopMessage = () => {
    if (abortController) {
      abortController.abort()
    }
  }

  const handleSendMessage = async (
    messageContent: string,
    chatMessages: ChatMessage[],
    isRegeneration: boolean
  ) => {
    const startingInput = messageContent
    const previousMessages = chatMessages.map(chatMessage => ({
      message: { ...chatMessage.message }
    }))

    try {
      if (!isRegeneration) setUserInput("")
      setIsGenerating(true)

      const newAbortController = new AbortController()
      setAbortController(newAbortController)

      const modelData = LLM_LIST.find(llm => llm.modelId === chatSettings?.model)

      validateChatSettings(
        chatSettings,
        modelData,
        profile,
        selectedWorkspace,
        messageContent
      )

      let currentChat = selectedChat ? { ...selectedChat } : null

      const options = {
        reasoning: reasoningEnabled,
        webSearch: webSearchEnabled
      }
      const initialMetadata: MessageMetadata = { ...options }

      const { tempUserChatMessage, tempAssistantChatMessage } =
        createTempMessages(
          messageContent,
          chatMessages,
          chatSettings!,
          isRegeneration,
          setChatMessages,
          initialMetadata
        )

      const payload: ChatPayload = {
        chatSettings: chatSettings!,
        workspaceInstructions: selectedWorkspace!.instructions || "",
        chatMessages: isRegeneration
          ? chatMessages.slice(0, -1)
          : [...chatMessages, tempUserChatMessage]
      }

      setToolInUse(options.webSearch ? "web" : "none")

      const { text: generatedText, metadata } = await handleHostedChat(
        payload,
        profile!,
        isRegeneration
          ? chatMessages[chatMessages.length - 1]
          : tempAssistantChatMessage,
        newAbortController,
        options,
        setFirstTokenReceived,
        setChatMessages,
        setToolInUse
      )

      if (!currentChat) {
        currentChat = await handleCreateChat(
          chatSettings!,
          profile!,
          selectedWorkspace!,
          messageContent,
          setSelectedChat,
          setChats
        )
      } else {
        // Sohbet, en son kullanılan model ve hiperparametrelerle saklanır.
        const updatedChat = await updateChat(currentChat.id, {
          ...rowFromChatSettings(chatSettings!),
          updated_at: new Date().toISOString()
        })

        setSelectedChat(updatedChat)
        setChats(prevChats =>
          prevChats.map(prevChat =>
            prevChat.id === updatedChat.id ? updatedChat : prevChat
          )
        )
      }

      await handleCreateMessages(
        chatMessages,
        currentChat,
        profile!,
        modelData!,
        messageContent,
        generatedText,
        metadata,
        isRegeneration,
        setChatMessages
      )

      setIsGenerating(false)
      setFirstTokenReceived(false)
      setToolInUse("none")
    } catch (error) {
      setIsGenerating(false)
      setFirstTokenReceived(false)
      setToolInUse("none")

      setChatMessages(previousMessages)
      if (!isRegeneration) setUserInput(startingInput)

      if (!isAbortError(error)) {
        toast.error(
          error instanceof Error ? error.message : "Beklenmeyen bir hata oluştu."
        )
      }
    }
  }

  const handleSendEdit = async (
    editedContent: string,
    sequenceNumber: number
  ) => {
    if (!selectedChat) return

    await deleteMessagesIncludingAndAfter(selectedChat.id, sequenceNumber)

    const filteredMessages = chatMessages.filter(
      chatMessage => chatMessage.message.sequence_number < sequenceNumber
    )

    setChatMessages(filteredMessages)

    handleSendMessage(editedContent, filteredMessages, false)
  }

  return {
    chatInputRef,
    handleNewChat,
    handleSendMessage,
    handleFocusChatInput,
    handleStopMessage,
    handleSendEdit
  }
}
