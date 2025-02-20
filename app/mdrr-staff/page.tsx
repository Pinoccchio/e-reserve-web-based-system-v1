"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function MDRRStaffDashboard() {
  const router = useRouter()

  useEffect(() => {
    router.push("/mdrr-staff/approvals")
  }, [router])

  return null
}

