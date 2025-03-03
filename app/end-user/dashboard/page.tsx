"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function EndUserDashboard() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/end-user/dashboard/facilities")
  }, [router])

  return null
}

