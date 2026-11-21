import { useEffect, useRef, useState } from "react"

const TICK_MS = 25
const MIN_CHARS_PER_TICK = 2
// Gelen metnin gerisinde kalınca hızlanır: kalan kısmın ~1/12'si her adımda.
const CATCH_UP_DIVISOR = 12

/**
 * Akan metni daktilo gibi yazar.
 * - Ekrana geldiğinde akış yoksa (geçmişten yüklenen mesaj) metnin tamamı gösterilir.
 * - Akış bittiğinde, yazı ekrana yetişene kadar animasyon sürer.
 */
export const useTypewriter = (text: string, streaming: boolean) => {
  const [length, setLength] = useState(() => (streaming ? 0 : text.length))

  const textRef = useRef(text)
  textRef.current = text

  // Metin kısalırsa (ör. yeniden oluşturma) baştan başla.
  useEffect(() => {
    setLength(prev => (prev > text.length ? text.length : prev))
  }, [text])

  const caughtUp = length >= text.length

  useEffect(() => {
    if (caughtUp) return

    const id = window.setInterval(() => {
      setLength(prev => {
        const target = textRef.current.length
        if (prev >= target) return prev

        const backlog = target - prev
        let next = Math.min(
          target,
          prev +
            Math.max(MIN_CHARS_PER_TICK, Math.ceil(backlog / CATCH_UP_DIVISOR))
        )

        // UTF-16 vekil çiftini (ör. emoji) ortadan bölme.
        const code = textRef.current.charCodeAt(next - 1)
        if (code >= 0xd800 && code <= 0xdbff && next < target) next++

        return next
      })
    }, TICK_MS)

    return () => window.clearInterval(id)
  }, [caughtUp])

  return {
    displayedText: caughtUp ? text : text.slice(0, length),
    isTyping: !caughtUp
  }
}
