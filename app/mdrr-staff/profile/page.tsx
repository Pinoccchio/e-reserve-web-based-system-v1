"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { showToast } from "@/components/ui/toast"

interface MDRRStaffProfile {
  first_name: string
  last_name: string
  email: string
  account_type: string
}

export default function MDRRStaffProfilePage() {
  const [profile, setProfile] = useState<MDRRStaffProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchMDRRStaffProfile()
  }, [])

  const fetchMDRRStaffProfile = async () => {
    try {
      setIsLoading(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data, error } = await supabase
          .from("users")
          .select("first_name, last_name, email, account_type")
          .eq("id", user.id)
          .single()

        if (error) throw error

        if (data.account_type !== "mdrr_staff") {
          throw new Error("User is not an MDRR staff member")
        }

        setProfile(data)
      }
    } catch (error) {
      console.error("Error fetching MDRR staff profile:", error)
      showToast("Failed to load MDRR staff profile", "error")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <div>Loading profile...</div>
  }

  if (!profile) {
    return <div>No profile data available.</div>
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">MDRR Staff Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="first_name">First Name</Label>
            <Input id="first_name" value={profile.first_name} readOnly />
          </div>
          <div>
            <Label htmlFor="last_name">Last Name</Label>
            <Input id="last_name" value={profile.last_name} readOnly />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={profile.email} readOnly />
          </div>
          <div>
            <Label htmlFor="account_type">Account Type</Label>
            <Input id="account_type" value={profile.account_type} readOnly />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

