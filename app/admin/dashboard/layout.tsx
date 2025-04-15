"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter, usePathname } from "next/navigation"
import { Home, Building, Calendar, Bell, ChevronDown, User, Menu, X, LogOut, MessageSquare } from "lucide-react"
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
  { icon: Home, label: "Dashboard", href: "/admin/dashboard" },
  { icon: Building, label: "Facilities", href: "/admin/dashboard/facilities" },
  { icon: Calendar, label: "Reservation", href: "/admin/dashboard/reservation" },
  { icon: MessageSquare, label: "Chat", href: "/admin/dashboard/chat" },
  { icon: Bell, label: "Notification", href: "/admin/dashboard/notification" },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [adminName, setAdminName] = useState("")
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [unreadReservations, setUnreadReservations] = useState(0)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  // Completely disable browser back/forward navigation
  useEffect(() => {
    // This function will be called whenever the user tries to navigate
    const disableBackButton = () => {
      // Push the current state again to prevent navigation
      window.history.pushState(null, "", window.location.href)
    }

    // Push state on initial load to replace the entry that got us here
    window.history.pushState(null, "", window.location.href)

    // Add event listener for popstate (triggered when back/forward buttons are clicked)
    window.addEventListener("popstate", disableBackButton)

    // Clean up the event listener when the component unmounts
    return () => {
      window.removeEventListener("popstate", disableBackButton)
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

  const fetchAdminData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      setCurrentUserId(user.id)
      const { data, error } = await supabase.from("users").select("first_name, last_name").eq("id", user.id).single()

      if (error) {
        console.error("Error fetching admin data:", error)
      } else if (data) {
        setAdminName(`${data.first_name} ${data.last_name}`)
      }
    } else {
      router.push("/")
    }
  }, [router])

  useEffect(() => {
    fetchAdminData()
  }, [fetchAdminData])

  const fetchUnreadCounts = useCallback(async () => {
    if (currentUserId) {
      const [
        { count: messageCount, error: messageError },
        { count: reservationCount, error: reservationError },
        { count: notificationCount, error: notificationError },
      ] = await Promise.all([
        supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("receiver_id", currentUserId)
          .eq("is_read", "no"),
        supabase.from("reservations").select("*", { count: "exact", head: true }).eq("is_read_admin", "no"),
        supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", currentUserId)
          .eq("is_read_admin", "no"),
      ])

      if (messageError) {
        console.error("Error fetching unread messages:", messageError)
      } else {
        setUnreadMessages(messageCount || 0)
      }

      if (reservationError) {
        console.error("Error fetching unread reservations:", reservationError)
      } else {
        setUnreadReservations(reservationCount || 0)
      }

      if (notificationError) {
        console.error("Error fetching unread notifications:", notificationError)
      } else {
        setUnreadNotifications(notificationCount || 0)
      }
    }
  }, [currentUserId])

  useEffect(() => {
    if (currentUserId) {
      fetchUnreadCounts()

      const channel = supabase
        .channel("admin-dashboard")
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
            table: "reservations",
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
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [currentUserId, fetchUnreadCounts])

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      showToast("Signed out successfully", "success")

      // Allow navigation when logging out
      window.onpopstate = null

      // Use location.replace to avoid adding to history
      window.location.replace("/")
    } catch (error) {
      console.error("Error signing out:", error)
      showToast("Error signing out. Please try again.", "error")
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center py-2 md:py-4">
            <div className="flex items-center">
              <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="mr-2">
                {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
              <Link href="/admin/dashboard" className="flex items-center">
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
                  <span className="hidden md:inline">{adminName || "Admin"}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => router.push("/admin/dashboard/profile")}>
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
                {item.label === "Reservation" && unreadReservations > 0 && (
                  <Badge variant="destructive">{unreadReservations}</Badge>
                )}
                {item.label === "Notification" && unreadNotifications > 0 && (
                  <Badge variant="destructive">{unreadNotifications}</Badge>
                )}
              </Link>
            ))}
          </nav>
        </aside>

        {isSidebarOpen && isMobile && (
          <div className="fixed inset-0 bg-black/20 z-30" onClick={() => setIsSidebarOpen(false)} />
        )}

        <main className={`flex-1 transition-all duration-300 ease-in-out ${isSidebarOpen ? "md:ml-64" : "ml-0"}`}>
          <div className="container mx-auto px-4 py-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
