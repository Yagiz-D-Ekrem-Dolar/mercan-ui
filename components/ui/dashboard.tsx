"use client"

import { Sidebar } from "@/components/sidebar/sidebar"
import { SidebarSwitcher } from "@/components/sidebar/sidebar-switcher"
import { Button } from "@/components/ui/button"
import { Tabs } from "@/components/ui/tabs"
import useHotkey from "@/lib/hooks/use-hotkey"
import { cn } from "@/lib/utils"
import { ContentType } from "@/types"
import { IconChevronCompactRight } from "@tabler/icons-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { FC, useEffect, useState } from "react"

export const SIDEBAR_WIDTH = 350

const VALID_TABS: ContentType[] = ["chats"]

interface DashboardProps {
  children: React.ReactNode
}

export const Dashboard: FC<DashboardProps> = ({ children }) => {
  useHotkey("s", () => handleToggleSidebar())

  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab") as ContentType | null
  const tabValue = tabParam && VALID_TABS.includes(tabParam) ? tabParam : "chats"

  const [contentType, setContentType] = useState<ContentType>(tabValue)
  const [showSidebar, setShowSidebar] = useState(true)

  useEffect(() => {
    try {
      const stored = localStorage.getItem("showSidebar")
      if (stored !== null) setShowSidebar(stored === "true")
    } catch {
      // localStorage yoksa kenar çubuğu açık başlar.
    }
  }, [])

  const handleToggleSidebar = () => {
    setShowSidebar(prevState => {
      try {
        localStorage.setItem("showSidebar", String(!prevState))
      } catch {
        // yoksay
      }
      return !prevState
    })
  }

  return (
    <div className="flex size-full">
      <div
        className={cn(
          "duration-200 dark:border-none " + (showSidebar ? "border-r-2" : "")
        )}
        style={{
          // Sidebar
          minWidth: showSidebar ? `${SIDEBAR_WIDTH}px` : "0px",
          maxWidth: showSidebar ? `${SIDEBAR_WIDTH}px` : "0px",
          width: showSidebar ? `${SIDEBAR_WIDTH}px` : "0px"
        }}
      >
        {showSidebar && (
          <Tabs
            className="flex h-full"
            value={contentType}
            onValueChange={tabValue => {
              setContentType(tabValue as ContentType)
              router.replace(`${pathname}?tab=${tabValue}`)
            }}
          >
            <SidebarSwitcher onContentTypeChange={setContentType} />

            <Sidebar contentType={contentType} showSidebar={showSidebar} />
          </Tabs>
        )}
      </div>

      <div className="bg-muted/50 relative flex w-screen min-w-[90%] grow flex-col sm:min-w-0">
        {children}

        <Button
          className={cn(
            "absolute left-[4px] top-[50%] z-10 size-[32px] cursor-pointer"
          )}
          style={{
            transform: showSidebar ? "rotate(180deg)" : "rotate(0deg)"
          }}
          variant="ghost"
          size="icon"
          title={showSidebar ? "Kenar çubuğunu gizle" : "Kenar çubuğunu göster"}
          onClick={handleToggleSidebar}
        >
          <IconChevronCompactRight size={24} />
        </Button>
      </div>
    </div>
  )
}
