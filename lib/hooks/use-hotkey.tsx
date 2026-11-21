import { useEffect } from "react"

// Klavye düzeninden bağımsız eşleşme (ör. Türkçe Q klavyede Shift+I = "İ").
const matchesKey = (event: KeyboardEvent, key: string) => {
  if (event.key.toLowerCase() === key.toLowerCase()) return true
  if (/^[a-z]$/i.test(key)) return event.code === `Key${key.toUpperCase()}`
  if (key === "/") return event.code === "Slash"
  return false
}

// ⌘ + Shift + tuş (macOS) / Ctrl + Shift + tuş (Windows, Linux)
const useHotkey = (key: string, callback: () => void): void => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.shiftKey &&
        matchesKey(event, key)
      ) {
        event.preventDefault()
        callback()
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [key, callback])
}

export default useHotkey
