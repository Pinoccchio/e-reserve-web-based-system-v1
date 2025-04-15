"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Calendar, Bell, MapPin, ChevronDown, User, Menu, X, LogOut, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { supabase } from "@/lib/supabase"
import { showToast } from "@/components/ui/toast"
import { Badge } from "@/components/ui/badge"

const menuItems = [
  { icon: MapPin, label: "Facilities", href: "/end-user/dashboard/facilities" },
  { icon: Calendar, label: "My Reservations", href: "/end-user/dashboard/reservation" },
  { icon: MessageSquare, label: "Chat", href: "/end-user/dashboard/chat" },
  { icon: Bell, label: "Notifications", href: "/end-user/dashboard/notification" },
]

export default function EndUserDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [userName, setUserName] = useState("")
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const router = useRouter()
  const [unreadReservations, setUnreadReservations] = useState(0)

  // Disable browser back/forward buttons
  useEffect(() => {
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
  }, [])

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const fetchUserData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      setCurrentUserId(user.id)
      const { data, error } = await supabase.from("users").select("first_name, last_name").eq("id", user.id).single()

      if (error) {
        console.error("Error fetching user data:", error)
      } else if (data) {
        setUserName(`${data.first_name} ${data.last_name}`)
      }
    } else {
      router.push("/")
    }
  }, [router])

  useEffect(() => {
    fetchUserData()
  }, [fetchUserData])

  const fetchUnreadCounts = useCallback(async () => {
    if (currentUserId) {
      const { count: messageCount, error: messageError } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", currentUserId)
        .eq("is_read", "no")

      if (messageError) {
        console.error("Error fetching unread messages:", messageError)
      } else {
        setUnreadMessages(messageCount || 0)
      }

      const { count: notificationCount, error: notificationError } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", currentUserId)
        .eq("read", false)

      if (notificationError) {
        console.error("Error fetching unread notifications:", notificationError)
      } else {
        setUnreadNotifications(notificationCount || 0)
      }

      // Fetch unread reservations count from both tables
      const [{ count: reservationCount, error: reservationError }, { count: approvalCount, error: approvalError }] =
        await Promise.all([
          supabase
            .from("reservations")
            .select("*", { count: "exact", head: true })
            .eq("user_id", currentUserId)
            .eq("is_read", "no"),
          supabase
            .from("payment_collector_approval")
            .select("*", { count: "exact", head: true })
            .eq("user_id", currentUserId)
            .eq("is_read", "no"),
        ])

      if (reservationError) {
        console.error("Error fetching unread reservations:", reservationError)
      }
      if (approvalError) {
        console.error("Error fetching unread payment collector approvals:", approvalError)
      }

      const totalUnreadReservations = (reservationCount || 0) + (approvalCount || 0)
      setUnreadReservations(totalUnreadReservations)
    }
  }, [currentUserId])

  useEffect(() => {
    if (currentUserId) {
      fetchUnreadCounts()

      const channel = supabase
        .channel("unread_counts")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "messages",
            filter: `receiver_id=eq.${currentUserId}`,
          },
          () => fetchUnreadCounts(),
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${currentUserId}`,
          },
          () => fetchUnreadCounts(),
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "reservations",
            filter: `user_id=eq.${currentUserId}`,
          },
          () => fetchUnreadCounts(),
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "payment_collector_approval",
            filter: `user_id=eq.${currentUserId}`,
          },
          () => fetchUnreadCounts(),
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [currentUserId, fetchUnreadCounts])

  const handleLogout = async () => {
    try {
      // Remove the popstate event listener before logging out
      window.removeEventListener("popstate", () => {})

      const { error } = await supabase.auth.signOut()
      if (error) throw error

      showToast("Signed out successfully", "success")

      // Use window.location.replace to allow navigation after logout
      window.location.replace("/")
    } catch (error) {
      console.error("Error signing out:", error)
      showToast("Error signing out. Please try again.", "error")
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* App Bar */}
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center py-2 md:py-4">
            <div className="flex items-center">
              <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="mr-2">
                {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
              <Link href="/end-user/dashboard/facilities" className="flex items-center">
                <Image
                  src="/libmanan-logo.png"
                  alt="Bayan ng Libmanan Logo"
                  width={40}
                  height={40}
                  className="object-contain"
                  priority
                />
                <span className="ml-2 text-base md:text-xl font-semibold text-gray-800 line-clamp-1">
                  {isMobile ? "LIBMANAN" : "LOCAL GOVERNMENT OF LIBMANAN"}
                </span>
              </Link>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span className="hidden md:inline">{userName || "User"}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => router.push("/end-user/dashboard/profile")}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`fixed left-0 top-[57px] md:top-[73px] h-[calc(100vh-57px)] md:h-[calc(100vh-73px)] bg-white shadow-md transition-all duration-300 ease-in-out z-40 ${
            isSidebarOpen ? "w-64 translate-x-0" : "w-64 -translate-x-full"
          }`}
        >
          <nav className="flex flex-col space-y-1 p-4 h-full overflow-y-auto">
            {menuItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center space-x-2 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                onClick={() => isMobile && setIsSidebarOpen(false)}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
                {item.label === "Chat" && unreadMessages > 0 && <Badge variant="destructive">{unreadMessages}</Badge>}
                {item.label === "Notifications" && unreadNotifications > 0 && (
                  <Badge variant="destructive">{unreadNotifications}</Badge>
                )}
                {item.label === "My Reservations" && unreadReservations > 0 && (
                  <Badge variant="destructive">{unreadReservations}</Badge>
                )}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Overlay for mobile */}
        {isSidebarOpen && isMobile && (
          <div className="fixed inset-0 bg-black/20 z-30" onClick={() => setIsSidebarOpen(false)} />
        )}

        {/* Main Content */}
        <main className={`flex-1 transition-all duration-300 ease-in-out ${isSidebarOpen ? "md:ml-64" : "ml-0"}`}>
          <div className="container mx-auto px-4 py-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
