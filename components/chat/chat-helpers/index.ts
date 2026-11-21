// Only used in use-chat-handler.tsx to keep it clean

import { ToolInUse } from "@/context/context"
import { createChat } from "@/db/chats"
import { createMessages, updateMessage } from "@/db/messages"
import { buildFinalMessages } from "@/lib/build-prompt"
import { consumeReadableStream } from "@/lib/consume-stream"
import { rowFromChatSettings } from "@/lib/mercan/settings"
import { Json, Tables, TablesInsert } from "@/types/database"
import {
  ChatAPIPayload,
  ChatMessage,
  ChatPayload,
  ChatSettings,
  ChatStreamEvent,
  LLM,
  MessageMetadata
} from "@/types"
import React from "react"
import { toast } from "sonner"
import { v4 as uuidv4 } from "uuid"

type SetState<T> = React.Dispatch<React.SetStateAction<T>>

export const validateChatSettings = (
  chatSettings: ChatSettings | null,
  modelData: LLM | undefined,
  profile: Tables<"profiles"> | null,
  selectedWorkspace: Tables<"workspaces"> | null,
  messageContent: string
) => {
  if (!chatSettings) {
    throw new Error("Sohbet ayarları bulunamadı.")
  }

  if (!modelData) {
    throw new Error("Model bulunamadı.")
  }

  if (!profile) {
    throw new Error("Profil bulunamadı.")
  }

  if (!selectedWorkspace) {
    throw new Error("Çalışma alanı bulunamadı.")
  }

  if (!messageContent.trim()) {
    throw new Error("Mesaj boş olamaz.")
  }
}

export const createTempMessages = (
  messageContent: string,
  chatMessages: ChatMessage[],
  chatSettings: ChatSettings,
  isRegeneration: boolean,
  setChatMessages: SetState<ChatMessage[]>,
  initialMetadata: MessageMetadata
) => {
  const tempUserChatMessage: ChatMessage = {
    message: {
      chat_id: "",
      assistant_id: null,
      content: messageContent,
      created_at: "",
      id: uuidv4(),
      image_paths: [],
      metadata: null,
      model: chatSettings.model,
      role: "user",
      sequence_number: chatMessages.length,
      updated_at: "",
      user_id: ""
    }
  }

  const tempAssistantChatMessage: ChatMessage = {
    message: {
      chat_id: "",
      assistant_id: null,
      content: "",
      created_at: "",
      id: uuidv4(),
      image_paths: [],
      metadata: initialMetadata as unknown as Json,
      model: chatSettings.model,
      role: "assistant",
      sequence_number: chatMessages.length + 1,
      updated_at: "",
      user_id: ""
    }
  }

  let newMessages: ChatMessage[] = []

  if (isRegeneration) {
    const lastMessageIndex = chatMessages.length - 1

    newMessages = chatMessages.map((chatMessage, index) =>
      index === lastMessageIndex
        ? {
            message: {
              ...chatMessage.message,
              content: "",
              metadata: initialMetadata as unknown as Json
            }
          }
        : chatMessage
    )
  } else {
    newMessages = [
      ...chatMessages,
      tempUserChatMessage,
      tempAssistantChatMessage
    ]
  }

  setChatMessages(newMessages)

  return {
    tempUserChatMessage,
    tempAssistantChatMessage
  }
}

// `payload.chatMessages` son kullanıcı mesajıyla biter; yanıt `targetMessage`a yazılır
// (yeni mesajda geçici asistan mesajı, yeniden oluşturmada son asistan mesajı).
export const handleHostedChat = async (
  payload: ChatPayload,
  profile: Tables<"profiles">,
  targetMessage: ChatMessage,
  newAbortController: AbortController,
  options: { reasoning: boolean; webSearch: boolean },
  setFirstTokenReceived: SetState<boolean>,
  setChatMessages: SetState<ChatMessage[]>,
  setToolInUse: SetState<ToolInUse>
) => {
  const formattedMessages = await buildFinalMessages(payload, profile)

  const requestBody: ChatAPIPayload = {
    chatSettings: payload.chatSettings,
    messages: formattedMessages,
    reasoning: options.reasoning,
    webSearch: options.webSearch
  }

  const response = await fetchChatResponse(
    "/api/chat/mercan",
    requestBody,
    newAbortController
  )

  return await processResponse(
    response,
    targetMessage,
    newAbortController,
    setFirstTokenReceived,
    setChatMessages,
    setToolInUse,
    { reasoning: options.reasoning, webSearch: options.webSearch }
  )
}

export const fetchChatResponse = async (
  url: string,
  body: object,
  controller: AbortController
) => {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: controller.signal
  })

  if (!response.ok) {
    let message = `İstek başarısız oldu (HTTP ${response.status}).`

    try {
      const errorData = await response.json()
      if (errorData?.message) message = errorData.message
    } catch {
      // Gövde JSON değilse varsayılan mesaj kullanılır.
    }

    throw new Error(message)
  }

  return response
}

export const processResponse = async (
  response: Response,
  lastChatMessage: ChatMessage,
  controller: AbortController,
  setFirstTokenReceived: SetState<boolean>,
  setChatMessages: SetState<ChatMessage[]>,
  setToolInUse: SetState<ToolInUse>,
  initialMetadata: MessageMetadata
) => {
  if (!response.body) {
    throw new Error("Sunucudan boş yanıt geldi.")
  }

  let fullText = ""
  let buffer = ""
  let streamError = ""
  const metadata: MessageMetadata = { ...initialMetadata }

  const handleEvent = (event: ChatStreamEvent) => {
    switch (event.type) {
      case "text":
        fullText += event.value
        setFirstTokenReceived(true)
        setToolInUse("none")
        break
      case "sources":
        metadata.sources = event.value
        setToolInUse("none")
        break
      case "search_error":
        metadata.searchError = event.value
        setToolInUse("none")
        break
      case "usage":
        metadata.usage = event.value
        break
      case "finish":
        metadata.finishReason = event.value
        break
      case "demo":
        metadata.demo = event.value
        break
      case "error":
        streamError = event.value
        break
    }
  }

  const handleLines = (lines: string[]) => {
    for (const line of lines) {
      if (!line.trim()) continue

      try {
        handleEvent(JSON.parse(line) as ChatStreamEvent)
      } catch (error) {
        console.error("Akış satırı çözümlenemedi:", line, error)
      }
    }
  }

  const applyUpdate = () => {
    setChatMessages(prev =>
      prev.map(chatMessage =>
        chatMessage.message.id === lastChatMessage.message.id
          ? {
              message: {
                ...chatMessage.message,
                content: fullText,
                metadata: { ...metadata } as unknown as Json
              }
            }
          : chatMessage
      )
    )
  }

  await consumeReadableStream(
    response.body,
    chunk => {
      buffer += chunk
      const lines = buffer.split("\n")
      buffer = lines.pop() ?? ""
      handleLines(lines)
      applyUpdate()
    },
    controller.signal
  )

  if (buffer.trim()) {
    handleLines([buffer])
    applyUpdate()
  }

  if (streamError) {
    if (!fullText.trim()) throw new Error(streamError)
    toast.error(streamError)
  }

  return { text: fullText, metadata }
}

export const handleCreateChat = async (
  chatSettings: ChatSettings,
  profile: Tables<"profiles">,
  selectedWorkspace: Tables<"workspaces">,
  messageContent: string,
  setSelectedChat: SetState<Tables<"chats"> | null>,
  setChats: SetState<Tables<"chats">[]>
) => {
  const createdChat = await createChat({
    user_id: profile.user_id,
    workspace_id: selectedWorkspace.id,
    name: messageContent.replace(/\s+/g, " ").trim().substring(0, 100),
    ...rowFromChatSettings(chatSettings)
  })

  setSelectedChat(createdChat)
  setChats(chats => [createdChat, ...chats])

  return createdChat
}

export const handleCreateMessages = async (
  chatMessages: ChatMessage[],
  currentChat: Tables<"chats">,
  profile: Tables<"profiles">,
  modelData: LLM,
  messageContent: string,
  generatedText: string,
  metadata: MessageMetadata,
  isRegeneration: boolean,
  setChatMessages: SetState<ChatMessage[]>
) => {
  if (isRegeneration) {
    const lastStartingMessage = chatMessages[chatMessages.length - 1].message

    const updatedMessage = await updateMessage(lastStartingMessage.id, {
      content: generatedText,
      model: modelData.modelId,
      metadata: metadata as unknown as Json
    })

    setChatMessages([
      ...chatMessages.slice(0, -1),
      { message: updatedMessage }
    ])

    return
  }

  const finalUserMessage: TablesInsert<"messages"> = {
    chat_id: currentChat.id,
    assistant_id: null,
    user_id: profile.user_id,
    content: messageContent,
    model: modelData.modelId,
    role: "user",
    sequence_number: chatMessages.length,
    image_paths: [],
    metadata: null
  }

  const finalAssistantMessage: TablesInsert<"messages"> = {
    chat_id: currentChat.id,
    assistant_id: null,
    user_id: profile.user_id,
    content: generatedText,
    model: modelData.modelId,
    role: "assistant",
    sequence_number: chatMessages.length + 1,
    image_paths: [],
    metadata: metadata as unknown as Json
  }

  const createdMessages = await createMessages([
    finalUserMessage,
    finalAssistantMessage
  ])

  setChatMessages([
    ...chatMessages,
    { message: createdMessages[0] },
    { message: createdMessages[1] }
  ])
}
