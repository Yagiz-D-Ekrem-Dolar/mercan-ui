import { ChatbotUIContext } from "@/context/context"
import { ContentType } from "@/types"
import { FC, useContext } from "react"
import { MercanSVG } from "../icons/mercan-svg"
import { SIDEBAR_WIDTH } from "../ui/dashboard"
import { TabsContent } from "../ui/tabs"
import { SidebarContent } from "./sidebar-content"

interface SidebarProps {
  contentType: ContentType
  showSidebar: boolean
}

export const Sidebar: FC<SidebarProps> = ({ contentType, showSidebar }) => {
  const { folders, chats } = useContext(ChatbotUIContext)

  const chatFolders = folders.filter(folder => folder.type === "chats")

  return (
    <TabsContent
      className="m-0 w-full space-y-2"
      style={{
        // Sidebar - SidebarSwitcher
        minWidth: showSidebar ? `calc(${SIDEBAR_WIDTH}px - 60px)` : "0px",
        maxWidth: showSidebar ? `calc(${SIDEBAR_WIDTH}px - 60px)` : "0px",
        width: showSidebar ? `calc(${SIDEBAR_WIDTH}px - 60px)` : "0px"
      }}
      value={contentType}
    >
      <div className="flex h-full flex-col p-3">
        <div className="flex items-center border-b-2 pb-3">
          <div className="flex h-[44px] grow select-none items-center space-x-2.5 px-1">
            <MercanSVG size={38} />
            <div className="font-brand text-[28px] leading-none tracking-wide">
              Mercan
            </div>
          </div>
        </div>

        <SidebarContent
          contentType="chats"
          data={chats}
          folders={chatFolders}
        />
      </div>
    </TabsContent>
  )
}
