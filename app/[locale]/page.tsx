"use client"

import { HOME_WORKSPACE_ID, ensureLocalSetup } from "@/db/local-setup"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import Loading from "./loading"

// Giriş ekranı yok: doğrudan Mercan sohbetine geçilir.
export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    ensureLocalSetup()
    router.replace(`/${HOME_WORKSPACE_ID}/chat`)
  }, [router])

  return <Loading />
}
