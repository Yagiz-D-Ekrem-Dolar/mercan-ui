import { ChatbotUIContext } from "@/context/context"
import { updateChat } from "@/db/chats"
import { cn } from "@/lib/utils"
import { Tables } from "@/types/database"
import { ContentType, DataListType } from "@/types"
import { FC, useContext, useEffect, useRef, useState } from "react"
import { Separator } from "../ui/separator"
import { ChatItem } from "./items/chat/chat-item"
import { Folder } from "./items/folders/folder-item"

type DateCategory = "Bugün" | "Dün" | "Geçen Hafta" | "Daha Eski"

const DATE_CATEGORIES: DateCategory[] = [
  "Bugün",
  "Dün",
  "Geçen Hafta",
  "Daha Eski"
]

interface SidebarDataListProps {
  contentType: ContentType
  data: DataListType
  folders: Tables<"folders">[]
}

export const SidebarDataList: FC<SidebarDataListProps> = ({
  contentType,
  data,
  folders
}) => {
  const { setChats } = useContext(ChatbotUIContext)

  const divRef = useRef<HTMLDivElement>(null)

  const [isOverflowing, setIsOverflowing] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)

  const getSortedData = (data: DataListType, dateCategory: DateCategory) => {
    const now = new Date()
    const todayStart = new Date(now.setHours(0, 0, 0, 0))
    const yesterdayStart = new Date(
      new Date().setDate(todayStart.getDate() - 1)
    )
    const oneWeekAgoStart = new Date(
      new Date().setDate(todayStart.getDate() - 7)
    )

    return data
      .filter(item => {
        const itemDate = new Date(item.updated_at || item.created_at)
        switch (dateCategory) {
          case "Bugün":
            return itemDate >= todayStart
          case "Dün":
            return itemDate >= yesterdayStart && itemDate < todayStart
          case "Geçen Hafta":
            return itemDate >= oneWeekAgoStart && itemDate < yesterdayStart
          case "Daha Eski":
            return itemDate < oneWeekAgoStart
          default:
            return true
        }
      })
      .sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at).getTime() -
          new Date(a.updated_at || a.created_at).getTime()
      )
  }

  const updateFolder = async (itemId: string, folderId: string | null) => {
    const item = data.find(item => item.id === itemId)

    if (!item) return null

    const updated = await updateChat(item.id, { folder_id: folderId })
    setChats(items => items.map(i => (i.id === updated.id ? updated : i)))
  }

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    e.dataTransfer.setData("text/plain", id)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()

    const target = e.target as Element

    if (!target.closest("#folder")) {
      const itemId = e.dataTransfer.getData("text/plain")
      updateFolder(itemId, null)
    }

    setIsDragOver(false)
  }

  useEffect(() => {
    if (divRef.current) {
      setIsOverflowing(
        divRef.current.scrollHeight > divRef.current.clientHeight
      )
    }
  }, [data])

  const dataWithFolders = data.filter(item => item.folder_id)
  const dataWithoutFolders = data.filter(item => !item.folder_id)

  return (
    <>
      <div
        ref={divRef}
        className="mt-2 flex flex-col overflow-auto"
        onDrop={handleDrop}
      >
        {(dataWithFolders.length > 0 || dataWithoutFolders.length > 0) && (
          <div
            className={`h-full ${
              isOverflowing ? "w-[calc(100%-8px)]" : "w-full"
            } space-y-2 pt-2 ${isOverflowing ? "mr-2" : ""}`}
          >
            {folders.map(folder => (
              <Folder
                key={folder.id}
                folder={folder}
                onUpdateFolder={updateFolder}
                contentType={contentType}
              >
                {dataWithFolders
                  .filter(item => item.folder_id === folder.id)
                  .map(item => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={e => handleDragStart(e, item.id)}
                    >
                      <ChatItem chat={item} />
                    </div>
                  ))}
              </Folder>
            ))}

            {folders.length > 0 && <Separator />}

            {DATE_CATEGORIES.map(dateCategory => {
              const sortedData = getSortedData(dataWithoutFolders, dateCategory)

              return (
                sortedData.length > 0 && (
                  <div key={dateCategory} className="pb-2">
                    <div className="text-muted-foreground mb-1 text-sm font-bold">
                      {dateCategory}
                    </div>

                    <div
                      className={cn(
                        "flex grow flex-col",
                        isDragOver && "bg-accent"
                      )}
                      onDrop={handleDrop}
                      onDragEnter={handleDragEnter}
                      onDragLeave={handleDragLeave}
                      onDragOver={handleDragOver}
                    >
                      {sortedData.map(item => (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={e => handleDragStart(e, item.id)}
                        >
                          <ChatItem chat={item} />
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )
            })}
          </div>
        )}
      </div>

      <div
        className={cn("flex grow", isDragOver && "bg-accent")}
        onDrop={handleDrop}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
      />
    </>
  )
}
