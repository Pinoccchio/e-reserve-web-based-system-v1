"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function PaymentCollectorDashboard() {
  const router = useRouter()

  useEffect(() => {
    router.push("/payment_collector/approvals")
  }, [router])

  return null
}

