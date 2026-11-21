"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect } from "react"
import Loading from "../loading"

export default function WorkspacePage() {
  const router = useRouter()
  const params = useParams()

  useEffect(() => {
    router.replace(`/${params.workspaceid}/chat`)
  }, [router, params.workspaceid])

  return <Loading />
}
