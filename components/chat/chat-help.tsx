import useHotkey from "@/lib/hooks/use-hotkey"
import { IconQuestionMark } from "@tabler/icons-react"
import { FC, useEffect, useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "../ui/dropdown-menu"

const SHORTCUTS = [
  { label: "Yardımı göster", key: "/" },
  { label: "Yeni sohbet", key: "O" },
  { label: "Mesaj kutusuna odaklan", key: "L" },
  { label: "Kenar çubuğunu aç/kapat", key: "S" }
]

interface ChatHelpProps {}

export const ChatHelp: FC<ChatHelpProps> = ({}) => {
  useHotkey("/", () => setIsOpen(prevState => !prevState))

  const [isOpen, setIsOpen] = useState(false)
  const [modifier, setModifier] = useState("Ctrl")

  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.platform)) setModifier("⌘")
  }, [])

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <IconQuestionMark className="bg-primary text-secondary size-[24px] cursor-pointer rounded-full p-0.5 opacity-60 hover:opacity-50 lg:size-[30px] lg:p-1" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Klavye kısayolları</DropdownMenuLabel>

        <DropdownMenuSeparator />

        {SHORTCUTS.map(shortcut => (
          <DropdownMenuItem
            key={shortcut.key}
            className="flex w-[320px] justify-between"
          >
            <div>{shortcut.label}</div>
            <div className="flex opacity-60">
              <div className="min-w-[30px] rounded border-DEFAULT p-1 text-center">
                {modifier}
              </div>
              <div className="min-w-[30px] rounded border-DEFAULT p-1 text-center">
                Shift
              </div>
              <div className="min-w-[30px] rounded border-DEFAULT p-1 text-center">
                {shortcut.key}
              </div>
            </div>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuItem className="flex justify-between">
          <div>Gönder / yeni satır</div>
          <div className="opacity-60">Enter / Shift + Enter</div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
