import { WebSource } from "@/types"
import {
  IconCaretDownFilled,
  IconCaretRightFilled,
  IconWorld
} from "@tabler/icons-react"
import { FC, useState } from "react"

const hostname = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

interface MessageSourcesProps {
  sources: WebSource[]
}

// Web aramasında bulunan ve modele verilen kaynaklar.
export const MessageSources: FC<MessageSourcesProps> = ({ sources }) => {
  const [viewSources, setViewSources] = useState(false)

  return (
    <div className="border-primary mt-6 border-t pt-4 font-bold">
      <div
        className="flex cursor-pointer items-center text-lg hover:opacity-50"
        onClick={() => setViewSources(!viewSources)}
      >
        <IconWorld className="mr-2" size={20} />
        {sources.length} web kaynağı
        {viewSources ? (
          <IconCaretDownFilled className="ml-1" />
        ) : (
          <IconCaretRightFilled className="ml-1" />
        )}
      </div>

      {viewSources && (
        <div className="mt-3 space-y-1">
          {sources.map((source, index) => (
            <a
              key={`${source.url}-${index}`}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:bg-accent flex flex-col rounded p-2 font-normal"
            >
              <div className="flex items-center space-x-2 text-sm font-semibold">
                <span className="text-muted-foreground">[{index + 1}]</span>
                <span className="truncate">{source.title}</span>
              </div>

              <div className="text-muted-foreground ml-7 truncate text-xs">
                {hostname(source.url)}
              </div>

              {source.snippet && (
                <div className="ml-7 mt-1 line-clamp-2 text-sm opacity-80">
                  {source.snippet}
                </div>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
