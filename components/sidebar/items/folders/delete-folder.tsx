import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { ChatbotUIContext } from "@/context/context"
import { deleteFolder, deleteFolderItems } from "@/db/folders"
import { Tables } from "@/types/database"
import { ContentType } from "@/types"
import { IconTrash } from "@tabler/icons-react"
import { FC, useContext, useRef, useState } from "react"
import { toast } from "sonner"

interface DeleteFolderProps {
  folder: Tables<"folders">
  contentType: ContentType
}

export const DeleteFolder: FC<DeleteFolderProps> = ({
  folder,
  contentType
}) => {
  const { setChats, setFolders } = useContext(ChatbotUIContext)

  const buttonRef = useRef<HTMLButtonElement>(null)

  const [showFolderDialog, setShowFolderDialog] = useState(false)

  const handleDeleteFolderOnly = async () => {
    await deleteFolder(folder.id)

    setFolders(prevState => prevState.filter(c => c.id !== folder.id))

    setShowFolderDialog(false)

    setChats(prevItems =>
      prevItems.map(item =>
        item.folder_id === folder.id ? { ...item, folder_id: null } : item
      )
    )
  }

  const handleDeleteFolderAndItems = async () => {
    try {
      await deleteFolderItems(contentType, folder.id)
    } catch (error) {
      toast.error(`Klasördeki sohbetler silinemedi. ${error}`)
      return
    }

    setChats(prevItems =>
      prevItems.filter(item => item.folder_id !== folder.id)
    )

    handleDeleteFolderOnly()
  }

  return (
    <Dialog open={showFolderDialog} onOpenChange={setShowFolderDialog}>
      <DialogTrigger asChild>
        <IconTrash className="hover:opacity-50" size={18} />
      </DialogTrigger>

      <DialogContent className="min-w-[550px]">
        <DialogHeader>
          <DialogTitle>Klasörü sil: {folder.name}</DialogTitle>

          <DialogDescription>
            Bu klasörü silmek istediğinize emin misiniz?
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setShowFolderDialog(false)}>
            Vazgeç
          </Button>

          <Button
            ref={buttonRef}
            variant="destructive"
            onClick={handleDeleteFolderAndItems}
          >
            Klasörü ve Sohbetleri Sil
          </Button>

          <Button variant="destructive" onClick={handleDeleteFolderOnly}>
            Yalnızca Klasörü Sil
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
