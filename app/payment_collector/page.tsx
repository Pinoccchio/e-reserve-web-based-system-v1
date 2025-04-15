"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function PaymentCollectorDashboard() {
  const router = useRouter()

  useEffect(() => {
    // Check authentication
    const checkAuth = async () => {
      const { data } = await supabase.auth.getUser()

      if (!data.user) {
        // If not authenticated, redirect to home
        window.location.replace("/")
        return
      }

      // If authenticated, push state to prevent back navigation
      window.history.pushState(null, "", window.location.pathname)

      // Redirect to approvals page
      router.replace("/payment_collector/approvals")
    }

    checkAuth()

    // Handle popstate event (when user clicks back/forward)
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.pathname)
    }

    // Add event listener
    window.addEventListener("popstate", handlePopState)

    // Clean up
    return () => {
      window.removeEventListener("popstate", handlePopState)
    }
  }, [router])

  return null
}
