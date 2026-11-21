import { ContentType } from "@/types"

interface ContentLabels {
  plural: string
  searchPlaceholder: string
}

export const CONTENT_LABELS: Record<ContentType, ContentLabels> = {
  chats: {
    plural: "Sohbetler",
    searchPlaceholder: "Sohbetlerde ara..."
  }
}
