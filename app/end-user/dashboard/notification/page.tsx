"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bell, Calendar, RefreshCw, Trash2 } from "lucide-react"
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
  read: boolean
  action_type: string
  related_id: number
}

export default function EndUserNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<{ type: "read" | "delete"; id: number } | null>(null)

  useEffect(() => {
    fetchNotifications()
  }, [])

  async function fetchNotifications() {
    setIsLoading(true)
    setError(null)
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError

      if (!userData.user) {
        throw new Error("No authenticated user found")
      }

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false })

      if (error) throw error

      setNotifications(data || [])
    } catch (error) {
      console.error("Error fetching notifications:", error)
      setError(error instanceof Error ? error.message : "An unknown error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const getNotificationIcon = (actionType: string) => {
    switch (actionType) {
      case "booking_created":
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
      const { error } = await supabase.from("notifications").update({ read: true }).eq("id", notificationId)

      if (error) throw error

      setNotifications(
        notifications.map((notification) =>
          notification.id === notificationId ? { ...notification, read: true } : notification,
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
      if (confirmAction.type === "read") {
        markAsRead(confirmAction.id)
      } else {
        deleteNotification(confirmAction.id)
      }
      setConfirmAction(null)
    }
  }

  if (isLoading) {
    return <div>Loading notifications...</div>
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl">My Notifications</CardTitle>
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
                <li key={notification.id} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                  {getNotificationIcon(notification.action_type)}
                  <div className="flex-1">
                    <p className="text-sm text-gray-800">{notification.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {format(new Date(notification.created_at), "MMM d, yyyy h:mm a")}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={notification.read ? "secondary" : "default"}>
                      {notification.read ? "Read" : "New"}
                    </Badge>
                    {!notification.read && (
                      <Button
                        onClick={() => setConfirmAction({ type: "read", id: notification.id })}
                        variant="outline"
                        size="sm"
                      >
                        Mark as Read
                      </Button>
                    )}
                    <Button
                      onClick={() => setConfirmAction({ type: "delete", id: notification.id })}
                      variant="ghost"
                      size="sm"
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
            <AlertDialogDescription>
              {confirmAction?.type === "read"
                ? "Are you sure you want to mark this notification as read?"
                : "Are you sure you want to delete this notification?"}
            </AlertDialogDescription>
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

