"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bell, Calendar, RefreshCw, Trash2, Check } from "lucide-react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { showToast } from "@/components/ui/toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Notification {
  id: number
  user_id: string
  message: string
  created_at: string
  is_read_mdrr: string | null
  action_type: string
  related_id: number
}

export default function MDRRStaffNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<{ type: "delete"; id: number } | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const fetchCurrentUser = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      setCurrentUserId(user.id)
    }
  }, [])

  useEffect(() => {
    fetchCurrentUser()
  }, [fetchCurrentUser])

  const fetchNotifications = useCallback(async () => {
    if (!currentUserId) return

    setIsLoading(true)
    setError(null)
    try {
      // Check if the user is an MDRR staff
      const { data: userDetails, error: userDetailsError } = await supabase
        .from("users")
        .select("account_type")
        .eq("id", currentUserId)
        .single()

      if (userDetailsError) throw userDetailsError

      if (userDetails.account_type !== "mdrr_staff") {
        throw new Error("User is not an MDRR staff member")
      }

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false })

      if (error) throw error

      setNotifications(data || [])
    } catch (error) {
      console.error("Error fetching notifications:", error)
      setError(error instanceof Error ? error.message : "An unknown error occurred")
    } finally {
      setIsLoading(false)
    }
  }, [currentUserId])

  useEffect(() => {
    if (currentUserId) {
      fetchNotifications()

      const channel = supabase
        .channel("mdrr-notifications")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${currentUserId}`,
          },
          () => fetchNotifications(),
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [currentUserId, fetchNotifications])

  const getNotificationIcon = (actionType: string) => {
    switch (actionType) {
      case "new_booking":
        return <Calendar className="h-5 w-5 text-blue-500" />
      case "booking_approved":
        return <Calendar className="h-5 w-5 text-green-500" />
      case "booking_declined":
        return <Calendar className="h-5 w-5 text-red-500" />
      case "booking_cancelled":
        return <Calendar className="h-5 w-5 text-gray-500" />
      case "booking_reminder":
        return <Bell className="h-5 w-5 text-yellow-500" />
      default:
        return <Bell className="h-5 w-5 text-gray-500" />
    }
  }

  const markAsRead = async (notificationId: number) => {
    try {
      const { error } = await supabase.from("notifications").update({ is_read_mdrr: "yes" }).eq("id", notificationId)

      if (error) throw error

      setNotifications(
        notifications.map((notification) =>
          notification.id === notificationId ? { ...notification, is_read_mdrr: "yes" } : notification,
        ),
      )

      showToast("Notification marked as read", "success")
    } catch (error) {
      console.error("Error marking notification as read:", error)
      showToast("Failed to mark notification as read", "error")
    }
  }

  const deleteNotification = async (notificationId: number) => {
    try {
      const { error } = await supabase.from("notifications").delete().eq("id", notificationId)

      if (error) throw error

      setNotifications(notifications.filter((notification) => notification.id !== notificationId))
      showToast("Notification deleted", "success")
    } catch (error) {
      console.error("Error deleting notification:", error)
      showToast("Failed to delete notification", "error")
    }
  }

  const handleConfirm = () => {
    if (confirmAction) {
      deleteNotification(confirmAction.id)
      setConfirmAction(null)
    }
  }

  const isNotificationRead = (notification: Notification) => {
    return notification.is_read_mdrr === "yes"
  }

  if (isLoading) {
    return <div>Loading notifications...</div>
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl">MDRR Staff Notifications</CardTitle>
          <Button onClick={fetchNotifications} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-red-500">Error: {error}</p>
          ) : notifications.length === 0 ? (
            <p>No notifications at this time.</p>
          ) : (
            <ul className="space-y-4">
              {notifications.map((notification) => (
                <li
                  key={notification.id}
                  className={`flex items-start space-x-4 p-4 rounded-lg transition-colors duration-200 ${
                    isNotificationRead(notification) ? "bg-gray-50" : "bg-blue-50 shadow-md"
                  }`}
                >
                  <div className="flex-shrink-0 mt-1">{getNotificationIcon(notification.action_type)}</div>
                  <div className="flex-grow">
                    <p
                      className={`text-sm ${isNotificationRead(notification) ? "text-gray-800" : "text-blue-800 font-semibold"}`}
                    >
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {format(new Date(notification.created_at), "MMM d, yyyy h:mm a")}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <Badge variant={isNotificationRead(notification) ? "secondary" : "default"}>
                      {isNotificationRead(notification) ? "Read" : "New"}
                    </Badge>
                    {!isNotificationRead(notification) && (
                      <Button
                        onClick={() => markAsRead(notification.id)}
                        variant="outline"
                        size="sm"
                        className="text-green-600 hover:text-green-700"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      onClick={() => setConfirmAction({ type: "delete", id: notification.id })}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this notification?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
