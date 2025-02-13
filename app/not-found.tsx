"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"

export default function NotFound() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleSignOutAndReturn = async () => {
    setIsLoading(true)
    try {
      // Sign out the user
      await supabase.auth.signOut()

      // Use replace to avoid history stack issues
      router.replace("/")

      // Force a hard refresh to clear any cached state
      window.location.reload()
    } catch (error) {
      console.error("Error signing out:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
      <p className="text-gray-600 mb-8 text-center">
        Sorry, the page you are looking for does not exist or has been moved.
      </p>
      <Button onClick={handleSignOutAndReturn} disabled={isLoading}>
        {isLoading ? "Signing Out..." : "Return Home"}
      </Button>
    </div>
  )
}