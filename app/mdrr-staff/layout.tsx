"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ClipboardList, Bell, ChevronDown, User, Menu, X, LogOut } from "lucide-react"
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

export default function MDRRStaffLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [userName, setUserName] = useState("")
  const [unreadApprovals, setUnreadApprovals] = useState(0)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const router = useRouter()
  const [disableBackListener, setDisableBackListener] = useState<(() => void) | null>(null)

  // Disable browser back button
  useEffect(() => {
    // Push current state to history stack
    window.history.pushState(null, "", window.location.pathname)

    // Function to handle popstate (back/forward button clicks)
    const handlePopState = () => {
      // Push state again to prevent navigation
      window.history.pushState(null, "", window.location.pathname)
    }

    // Add event listener
    window.addEventListener("popstate", handlePopState)

    // Store the cleanup function
    setDisableBackListener(() => () => {
      window.removeEventListener("popstate", handlePopState)
    })

    // Cleanup on unmount
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

  useEffect(() => {
    const fetchUserData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const { data, error } = await supabase.from("users").select("first_name, last_name").eq("id", user.id).single()

        if (error) {
          console.error("Error fetching user data:", error)
        } else if (data) {
          setUserName(`${data.first_name} ${data.last_name}`)
        }
      } else {
        window.location.replace("/")
      }
    }

    fetchUserData()
  }, [router])

  // Fetch unread counts
  useEffect(() => {
    const fetchUnreadCounts = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // Fetch unread approvals count - check for both "no" and null values --FORADMIM
      const { count: approvalsCount, error: approvalsError } = await supabase
        .from("reservations")
        .select("*", { count: "exact", head: true })
        .or("is_read_mdrr.eq.no,is_read_mdrr.is.null")

      if (approvalsError) {
        console.error("Error fetching unread approvals:", approvalsError)
      } else {
        setUnreadApprovals(approvalsCount || 0)
      }

      // Fetch unread notifications count - check for both "no" and null values
      const { count: notificationsCount, error: notificationsError } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .or("is_read_mdrr.eq.no,is_read_mdrr.is.null")
        .eq("user_id", user.id)

      if (notificationsError) {
        console.error("Error fetching unread notifications:", notificationsError)
      } else {
        setUnreadNotifications(notificationsCount || 0)
      }
    }

    fetchUnreadCounts()

    // Set up a subscription to refresh counts when data changes
    const subscription = supabase
      .channel("mdrr-schema-db-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reservations",
        },
        () => {
          fetchUnreadCounts()
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () => {
          fetchUnreadCounts()
        },
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleMenuItemClick = async (path: string) => {
    if (isMobile) {
      setIsSidebarOpen(false)
    }

    // If clicking on approvals, mark all as read
    if (path.includes("/approvals")) {
      const { error } = await supabase
        .from("reservations")
        .update({ is_read_mdrr: "yes" })
        .or("is_read_mdrr.eq.no,is_read_mdrr.is.null")

      if (error) {
        console.error("Error updating read status:", error)
      } else {
        setUnreadApprovals(0)
      }
    }

    // We don't mark notifications as read here - that's handled in the notifications page

    router.push(path)
  }

  const handleLogout = async () => {
    try {
      // Remove the popstate event listener before logout
      if (disableBackListener) {
        disableBackListener()
      }

      const { error } = await supabase.auth.signOut()
      if (error) throw error

      showToast("Signed out successfully", "success")
      window.location.replace("/")
    } catch (error) {
      console.error("Error signing out:", error)
      showToast("Error signing out. Please try again.", "error")
    }
  }

  // Define menu items with badge counts
  const menuItems = [
    {
      icon: ClipboardList,
      label: "Approvals",
      href: "/mdrr-staff/approvals",
      unreadCount: unreadApprovals,
    },
    {
      icon: Bell,
      label: "Notifications",
      href: "/mdrr-staff/notifications",
      unreadCount: unreadNotifications,
    },
  ]

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
              <Link href="/mdrr-staff/approvals" className="flex items-center">
                <Image
                  src="/libmanan-logo.png"
                  alt="Bayan ng Libmanan Logo"
                  width={40}
                  height={40}
                  className="object-contain"
                  priority
                />
                <span className="ml-2 text-base md:text-xl font-semibold text-gray-800 line-clamp-1">
                  {isMobile ? "LIBMANAN MDRR" : "LIBMANAN MDRR STAFF PORTAL"}
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
                <DropdownMenuItem onSelect={() => router.push("/mdrr-staff/profile")}>
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
              <button
                key={item.label}
                onClick={() => handleMenuItemClick(item.href)}
                className="flex items-center justify-between px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-md transition-colors text-left w-full"
              >
                <div className="flex items-center space-x-2">
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </div>
                {item.unreadCount > 0 && <Badge className="bg-red-500">{item.unreadCount}</Badge>}
              </button>
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
