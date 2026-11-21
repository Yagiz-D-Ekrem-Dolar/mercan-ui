// Tarayıcı içinde çalışan basit tablo deposu. Orijinal chatbot-ui'daki Supabase
// veritabanının yerini alır: her tablo localStorage'da JSON dizisi olarak tutulur.

import { v4 as uuidv4 } from "uuid"

export const LOCAL_USER_ID = "yerel-kullanici"

const PREFIX = "mercan-ui:v1:"

export type TableName =
  | "profiles"
  | "workspaces"
  | "chats"
  | "messages"
  | "folders"
  | "presets"
  | "prompts"

const TABLES: TableName[] = [
  "profiles",
  "workspaces",
  "chats",
  "messages",
  "folders",
  "presets",
  "prompts"
]

type Row = { id: string; [key: string]: any }

const cache = new Map<TableName, Row[]>()

const isBrowser = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined"

if (isBrowser()) {
  // Başka bir sekme veriyi değiştirirse önbelleği bırak.
  window.addEventListener("storage", event => {
    if (!event.key) {
      cache.clear()
      return
    }

    if (event.key.startsWith(PREFIX)) {
      cache.delete(event.key.slice(PREFIX.length) as TableName)
    }
  })
}

const read = (table: TableName): Row[] => {
  if (!isBrowser()) return []

  const cached = cache.get(table)
  if (cached) return cached

  try {
    const raw = window.localStorage.getItem(PREFIX + table)
    const rows = raw ? (JSON.parse(raw) as Row[]) : []
    cache.set(table, rows)
    return rows
  } catch (error) {
    console.error(`"${table}" tablosu okunamadı:`, error)
    return []
  }
}

const write = (table: TableName, rows: Row[]) => {
  cache.set(table, rows)

  if (!isBrowser()) return

  try {
    window.localStorage.setItem(PREFIX + table, JSON.stringify(rows))
  } catch (error) {
    console.error(`"${table}" tablosu kaydedilemedi:`, error)
    throw new Error(
      "Tarayıcı depolama alanı dolu ya da erişilemiyor. Eski sohbetleri silmeyi deneyin."
    )
  }
}

const copy = <T>(row: Row): T => ({ ...row }) as T

export const localDb = {
  list<T>(table: TableName): T[] {
    return read(table).map(row => copy<T>(row))
  },

  get<T>(table: TableName, id: string): T | null {
    const row = read(table).find(row => row.id === id)
    return row ? copy<T>(row) : null
  },

  filter<T>(table: TableName, predicate: (row: any) => boolean): T[] {
    return read(table)
      .filter(predicate)
      .map(row => copy<T>(row))
  },

  insert<T>(table: TableName, values: Record<string, any>): T {
    const row: Row = {
      user_id: LOCAL_USER_ID,
      created_at: new Date().toISOString(),
      updated_at: null,
      ...values,
      id: values.id ?? uuidv4()
    }

    write(table, [...read(table), row])
    return copy<T>(row)
  },

  update<T>(table: TableName, id: string, patch: Record<string, any>): T {
    const rows = read(table)
    const index = rows.findIndex(row => row.id === id)

    if (index === -1) {
      throw new Error(`Kayıt bulunamadı (${table}/${id}).`)
    }

    const updated: Row = {
      ...rows[index],
      ...patch,
      id,
      updated_at: patch.updated_at ?? new Date().toISOString()
    }

    const nextRows = [...rows]
    nextRows[index] = updated
    write(table, nextRows)

    return copy<T>(updated)
  },

  updateWhere(
    table: TableName,
    predicate: (row: any) => boolean,
    patch: Record<string, any>
  ): number {
    let count = 0
    const rows = read(table).map(row => {
      if (!predicate(row)) return row
      count++
      return { ...row, ...patch }
    })

    if (count > 0) write(table, rows)
    return count
  },

  remove(table: TableName, id: string) {
    write(
      table,
      read(table).filter(row => row.id !== id)
    )
  },

  removeWhere(table: TableName, predicate: (row: any) => boolean): number {
    const rows = read(table)
    const kept = rows.filter(row => !predicate(row))

    if (kept.length !== rows.length) write(table, kept)
    return rows.length - kept.length
  },

  exportAll(): Record<TableName, Row[]> {
    return TABLES.reduce(
      (acc, table) => ({ ...acc, [table]: read(table) }),
      {} as Record<TableName, Row[]>
    )
  },

  clearAll() {
    cache.clear()
    if (!isBrowser()) return
    TABLES.forEach(table => window.localStorage.removeItem(PREFIX + table))
  }
}
