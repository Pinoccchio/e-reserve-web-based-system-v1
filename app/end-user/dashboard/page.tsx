"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function EndUserDashboard() {
  const router = useRouter()

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession()

      if (!data.session) {
        // If not authenticated, redirect to home
        window.location.replace("/")
        return
      }

      // If authenticated, redirect to facilities page
      router.replace("/end-user/dashboard/facilities")
    }

    checkAuth()

    // Push current state to history to prevent going back
    window.history.pushState(null, "", window.location.href)

    // Handle popstate event (when user clicks back/forward)
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href)
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
