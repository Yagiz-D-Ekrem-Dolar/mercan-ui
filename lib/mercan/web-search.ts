// Yalnızca sunucu tarafında kullanılır: web araması ve sonuçların isteme eklenmesi.

import { ChatAPIMessage, WebSource } from "@/types"

type Provider = "duckduckgo" | "searxng" | "tavily"

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

const TIMEOUT_MS = 8000

// Sinyallerden biri iptal edilince iptal olan sinyal (AbortSignal.any yerine).
const anySignal = (signals: AbortSignal[]) => {
  const controller = new AbortController()

  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason)
      break
    }

    signal.addEventListener("abort", () => controller.abort(signal.reason), {
      once: true
    })
  }

  return controller.signal
}

const maxResults = () => {
  const value = Number(process.env.WEB_SEARCH_MAX_RESULTS)
  return Number.isFinite(value) && value > 0 ? Math.min(value, 10) : 5
}

export const getSearchProvider = (): Provider => {
  const value = (process.env.WEB_SEARCH_PROVIDER || "").trim().toLowerCase()

  if (value === "searxng" && process.env.SEARXNG_URL) return "searxng"
  if (value === "tavily" && process.env.TAVILY_API_KEY) return "tavily"
  if (!value && process.env.TAVILY_API_KEY) return "tavily"
  if (!value && process.env.SEARXNG_URL) return "searxng"
  return "duckduckgo"
}

const decodeEntities = (text: string) =>
  text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")

const stripTags = (html: string) =>
  decodeEntities(html.replace(/<[^>]+>/g, ""))
    .replace(/\s+/g, " ")
    .trim()

const clip = (text: string, max = 400) =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text

const searchDuckDuckGo = async (
  query: string,
  signal: AbortSignal
): Promise<WebSource[]> => {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&kl=tr-tr`

  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.6"
    },
    signal
  })

  if (!response.ok) throw new Error(`DuckDuckGo HTTP ${response.status}`)

  const html = await response.text()
  const results: WebSource[] = []

  const linkRegex =
    /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g
  const snippetRegex =
    /<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/g

  const snippets = Array.from(html.matchAll(snippetRegex)).map(match =>
    stripTags(match[1])
  )

  let index = 0
  for (const match of Array.from(html.matchAll(linkRegex))) {
    let href = decodeEntities(match[1])
    const snippet = snippets[index] ?? ""
    index++

    // Reklam bağlantılarını atla
    if (href.includes("duckduckgo.com/y.js")) continue

    if (href.startsWith("//")) href = `https:${href}`

    try {
      const parsed = new URL(href)
      const target = parsed.searchParams.get("uddg")
      if (target) href = target
    } catch {
      continue
    }

    if (!/^https?:\/\//.test(href)) continue

    results.push({ title: stripTags(match[2]), url: href, snippet })
  }

  return results
}

const searchSearxng = async (
  query: string,
  signal: AbortSignal
): Promise<WebSource[]> => {
  const base = (process.env.SEARXNG_URL || "").replace(/\/+$/, "")
  const url = `${base}/search?q=${encodeURIComponent(query)}&format=json&language=tr`

  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`SearXNG HTTP ${response.status}`)

  const data = await response.json()

  return (data?.results ?? []).map((item: any) => ({
    title: String(item.title ?? ""),
    url: String(item.url ?? ""),
    snippet: String(item.content ?? "")
  }))
}

const searchTavily = async (
  query: string,
  signal: AbortSignal
): Promise<WebSource[]> => {
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query,
      max_results: maxResults(),
      search_depth: "basic"
    }),
    signal
  })

  if (!response.ok) throw new Error(`Tavily HTTP ${response.status}`)

  const data = await response.json()

  return (data?.results ?? []).map((item: any) => ({
    title: String(item.title ?? ""),
    url: String(item.url ?? ""),
    snippet: String(item.content ?? "")
  }))
}

// Anahtarsız yedek: Türkçe Vikipedi araması
const searchWikipedia = async (
  query: string,
  signal: AbortSignal
): Promise<WebSource[]> => {
  const url = `https://tr.wikipedia.org/w/api.php?action=query&list=search&format=json&utf8=1&srlimit=${maxResults()}&srsearch=${encodeURIComponent(query)}`

  const response = await fetch(url, {
    headers: { "User-Agent": "MercanUI/0.1 (web arama yedegi)" },
    signal
  })

  if (!response.ok) throw new Error(`Vikipedi HTTP ${response.status}`)

  const data = await response.json()

  return (data?.query?.search ?? []).map((item: any) => ({
    title: String(item.title ?? ""),
    url: `https://tr.wikipedia.org/wiki/${encodeURIComponent(
      String(item.title ?? "").replace(/ /g, "_")
    )}`,
    snippet: stripTags(String(item.snippet ?? ""))
  }))
}

export const webSearch = async (
  rawQuery: string,
  parentSignal?: AbortSignal
): Promise<WebSource[]> => {
  const query = rawQuery.replace(/\s+/g, " ").trim().slice(0, 300)
  if (!query) return []

  const signal = parentSignal
    ? anySignal([parentSignal, AbortSignal.timeout(TIMEOUT_MS)])
    : AbortSignal.timeout(TIMEOUT_MS)

  const provider = getSearchProvider()

  let results: WebSource[] = []
  let primaryError: unknown = null

  try {
    if (provider === "searxng") results = await searchSearxng(query, signal)
    else if (provider === "tavily") results = await searchTavily(query, signal)
    else results = await searchDuckDuckGo(query, signal)
  } catch (error) {
    if (parentSignal?.aborted) throw error
    primaryError = error
  }

  if (results.length === 0) {
    try {
      results = await searchWikipedia(query, AbortSignal.timeout(TIMEOUT_MS))
    } catch (error) {
      if (primaryError) throw primaryError
      throw error
    }
  }

  const seen = new Set<string>()

  return results
    .filter(result => {
      if (!result.url || seen.has(result.url)) return false
      seen.add(result.url)
      return true
    })
    .slice(0, maxResults())
    .map(result => ({
      title: clip(result.title || result.url, 160),
      url: result.url,
      snippet: clip(result.snippet)
    }))
}

// Arama sonuçlarını son kullanıcı mesajının başına ekler.
export const injectSearchResults = (
  messages: ChatAPIMessage[],
  sources: WebSource[]
): ChatAPIMessage[] => {
  if (sources.length === 0) return messages

  const lastIndex = messages.length - 1
  const last = messages[lastIndex]

  const context = sources
    .map(
      (source, index) =>
        `[${index + 1}] ${source.title}\n${source.snippet}\nKaynak: ${source.url}`
    )
    .join("\n\n")

  const content =
    "Aşağıda kullanıcının sorusuyla ilgili web arama sonuçları var. Yanıtını bu bilgilere dayandır ve kullandığın bilginin kaynağını [1] biçiminde numarasıyla belirt. Sonuçlar soruyla ilgisizse bunu söyle ve kendi bilgini kullan.\n\n" +
    `${context}\n\nSoru: ${last.content}`

  return [...messages.slice(0, lastIndex), { role: "user", content }]
}
