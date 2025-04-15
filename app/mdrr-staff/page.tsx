"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function MDRRStaffDashboard() {
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
      router.replace("/mdrr-staff/approvals")
    }

    checkAuth()
  }, [router])

  return null
}
