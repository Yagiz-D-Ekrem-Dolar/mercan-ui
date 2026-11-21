import { ChatbotUIContext } from "@/context/context"
import { updateWorkspace } from "@/db/workspaces"
import { localDb } from "@/lib/local-db"
import {
  DEFAULT_CHAT_SETTINGS,
  clampChatSettings,
  workspaceDefaultsFromChatSettings
} from "@/lib/mercan/settings"
import { cn } from "@/lib/utils"
import { ChatSettings } from "@/types"
import {
  IconFileDownload,
  IconMoon,
  IconSettings,
  IconSun,
  IconTrash
} from "@tabler/icons-react"
import { useTheme } from "next-themes"
import { FC, useContext, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Button } from "../ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "../ui/dialog"
import { Label } from "../ui/label"
import { SettingsForm } from "../ui/settings-form"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "../ui/sheet"

interface SettingsProps {
  iconSize: number
}

// Sol alttaki Ayarlar paneli: sistem istemi, hiperparametreler, tema, veriler.
// Model seçimi burada değil, sağ üstteki model düğmesindedir.
export const Settings: FC<SettingsProps> = ({ iconSize }) => {
  const {
    selectedWorkspace,
    setSelectedWorkspace,
    setWorkspaces,
    chatSettings,
    setChatSettings
  } = useContext(ChatbotUIContext)

  const { theme, setTheme } = useTheme()

  const buttonRef = useRef<HTMLButtonElement>(null)

  const [isOpen, setIsOpen] = useState(false)
  const [showClearDialog, setShowClearDialog] = useState(false)
  const [draft, setDraft] = useState<ChatSettings>(
    chatSettings ?? DEFAULT_CHAT_SETTINGS
  )

  useEffect(() => {
    if (isOpen && chatSettings) setDraft(chatSettings)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const handleSave = async () => {
    if (!selectedWorkspace) return

    const next = clampChatSettings({
      ...draft,
      model: chatSettings?.model ?? draft.model
    })

    const updatedWorkspace = await updateWorkspace(
      selectedWorkspace.id,
      workspaceDefaultsFromChatSettings(next)
    )

    setSelectedWorkspace(updatedWorkspace)
    setWorkspaces(workspaces =>
      workspaces.map(workspace =>
        workspace.id === updatedWorkspace.id ? updatedWorkspace : workspace
      )
    )
    setChatSettings(next)

    setIsOpen(false)
    toast.success("Ayarlar kaydedildi.")
  }

  const handleExport = () => {
    const data = JSON.stringify(localDb.exportAll(), null, 2)
    const blob = new Blob([data], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `mercan-veriler-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleClearAll = () => {
    localDb.clearAll()
    window.location.href = "/"
  }

  const changeTheme = (value: "light" | "dark") => {
    try {
      localStorage.setItem("theme", value)
    } catch {
      // yoksay
    }
    setTheme(value)
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          title="Ayarlar"
          aria-label="Ayarlar"
        >
          <IconSettings size={iconSize} />
        </Button>
      </SheetTrigger>

      <SheetContent
        className="flex flex-col justify-between sm:max-w-md"
        side="left"
        // İlk odaklanılabilir öğe bilgi ipucu olduğundan, açılışta ipucunun
        // kendiliğinden açılıp metin kutusunu kapatmasını önle.
        onOpenAutoFocus={event => event.preventDefault()}
      >
        <div className="grow overflow-auto pr-1">
          <SheetHeader>
            <SheetTitle>Ayarlar</SheetTitle>

            <div className="text-muted-foreground text-sm">
              Sistem istemi ve hiperparametreler tüm sohbetlerde kullanılır.
            </div>
          </SheetHeader>

          <div className="mt-6 space-y-8">
            <SettingsForm settings={draft} onChange={setDraft} />

            <div className="space-y-2 border-t pt-6">
              <Label>Tema</Label>

              <div className="border-input flex w-fit rounded-lg border p-1">
                {(
                  [
                    { value: "light", label: "Açık", icon: IconSun },
                    { value: "dark", label: "Koyu", icon: IconMoon }
                  ] as const
                ).map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => changeTheme(option.value)}
                    className={cn(
                      "flex items-center space-x-1 rounded-md px-3 py-1.5 text-sm",
                      theme === option.value
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <option.icon size={16} />
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 border-t pt-6">
              <Label>Veriler</Label>

              <div className="text-muted-foreground text-sm">
                Sohbetleriniz yalnızca bu tarayıcıda saklanır.
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <IconFileDownload className="mr-1" size={18} />
                  Dışa aktar (JSON)
                </Button>

                <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-red-500">
                      <IconTrash className="mr-1" size={18} />
                      Tüm verileri sil
                    </Button>
                  </DialogTrigger>

                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Tüm veriler silinsin mi?</DialogTitle>

                      <DialogDescription>
                        Bu tarayıcıdaki tüm sohbetler ve ayarlar kalıcı olarak
                        silinir. Bu işlem geri alınamaz.
                      </DialogDescription>
                    </DialogHeader>

                    <DialogFooter>
                      <Button
                        variant="ghost"
                        onClick={() => setShowClearDialog(false)}
                      >
                        Vazgeç
                      </Button>

                      <Button variant="destructive" onClick={handleClearAll}>
                        Hepsini sil
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-2">
          <Button variant="ghost" onClick={() => setIsOpen(false)}>
            Vazgeç
          </Button>

          <Button ref={buttonRef} onClick={handleSave}>
            Kaydet
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
