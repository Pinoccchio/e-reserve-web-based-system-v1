"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter, usePathname } from "next/navigation"
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

export default function PaymentCollectorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [userName, setUserName] = useState("")
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [unreadApprovals, setUnreadApprovals] = useState(0)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const router = useRouter()
  const pathname = usePathname()
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
      window.location.replace("/")
    }
  }, [])

  useEffect(() => {
    fetchUserData()
  }, [fetchUserData])

  const fetchUnreadCounts = useCallback(async () => {
    try {
      // Fetch unread approvals count - similar to MDRR pattern
      const { count: approvalCount, error: approvalError } = await supabase
        .from("payment_collector_approval")
        .select("*", { count: "exact", head: true })
        .or("is_read_payment_collector.eq.no,is_read_payment_collector.is.null")

      if (approvalError) {
        console.error("Error fetching unread approvals:", approvalError)
      } else {
        setUnreadApprovals(approvalCount || 0)
      }

      if (currentUserId) {
        // Fetch unread notifications count - this still needs user_id
        const { count: notificationCount, error: notificationError } = await supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", currentUserId)
          .or("is_read_payment_collector.eq.no,is_read_payment_collector.is.null")

        if (notificationError) {
          console.error("Error fetching unread notifications:", notificationError)
        } else {
          setUnreadNotifications(notificationCount || 0)
        }
      }
    } catch (error) {
      console.error("Error in fetchUnreadCounts:", error)
    }
  }, [currentUserId])

  useEffect(() => {
    fetchUnreadCounts()

    const channel = supabase
      .channel("payment-collector-dashboard")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payment_collector_approval",
        },
        () => fetchUnreadCounts(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () => fetchUnreadCounts(),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchUnreadCounts, currentUserId])

  const handleMenuItemClick = async (path: string) => {
    if (isMobile) {
      setIsSidebarOpen(false)
    }

    // If clicking on approvals, mark all as read
    if (path.includes("/approvals")) {
      try {
        const { error } = await supabase
          .from("payment_collector_approval")
          .update({ is_read_payment_collector: "yes" })
          .or("is_read_payment_collector.eq.no,is_read_payment_collector.is.null")

        if (error) {
          console.error("Error updating read status:", error)
        } else {
          setUnreadApprovals(0)
        }
      } catch (error) {
        console.error("Error in handleMenuItemClick:", error)
      }
    }

    // Navigate to the page
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
      href: "/payment_collector/approvals",
      unreadCount: unreadApprovals,
    },
    {
      icon: Bell,
      label: "Notifications",
      href: "/payment_collector/notifications",
      unreadCount: unreadNotifications,
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center py-2 md:py-4">
            <div className="flex items-center">
              <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="mr-2">
                {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
              <Link href="/payment_collector/approvals" className="flex items-center">
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
                <DropdownMenuItem onSelect={() => router.push("/payment_collector/profile")}>
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
              <button
                key={item.label}
                onClick={() => handleMenuItemClick(item.href)}
                className="flex items-center justify-between px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-md transition-colors text-left w-full"
              >
                <div className="flex items-center space-x-2">
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </div>
                {item.unreadCount > 0 && <Badge variant="destructive">{item.unreadCount}</Badge>}
              </button>
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