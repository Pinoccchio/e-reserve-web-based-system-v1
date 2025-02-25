"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { MoreVertical, Check, X } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { format } from "date-fns"

interface User {
  id: string
  first_name: string
  last_name: string
  email: string
  account_type: string
  unread_count?: number
}

interface Message {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  created_at: string
  is_read: "yes" | "no"
}

export default function ChatPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [admins, setAdmins] = useState<User[]>([])
  const [selectedAdmin, setSelectedAdmin] = useState<User | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchCurrentUser = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const { data, error } = await supabase
          .from("users")
          .select("id, first_name, last_name, email, account_type")
          .eq("id", user.id)
          .single()

        if (error) throw error
        setCurrentUser(data)
      } else {
        throw new Error("No authenticated user found")
      }
    } catch (error) {
      console.error("Error fetching current user:", error)
      setError("Failed to fetch current user. Please try again later.")
    }
  }, [])

  const fetchAdmins = useCallback(async () => {
    if (!currentUser) return

    try {
      const { data: adminData, error: adminError } = await supabase
        .from("users")
        .select("id, first_name, last_name, email, account_type")
        .eq("account_type", "admin")

      if (adminError) throw adminError

      // Fetch unread counts
      const { data: unreadCounts, error: countError } = await supabase
        .from("messages")
        .select("sender_id, is_read")
        .eq("receiver_id", currentUser.id)
        .eq("is_read", "no")

      if (countError) throw countError

      // Group unread counts manually
      const groupedCounts = unreadCounts.reduce(
        (acc, message) => {
          acc[message.sender_id] = (acc[message.sender_id] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      )

      const adminsWithUnreadCounts = adminData.map((admin) => ({
        ...admin,
        unread_count: groupedCounts[admin.id] || 0,
      }))

      setAdmins(adminsWithUnreadCounts)
    } catch (error) {
      console.error("Error fetching admins:", error)
      setError("Failed to fetch admins. Please try again later.")
    }
  }, [currentUser])

  useEffect(() => {
    fetchCurrentUser()
  }, [fetchCurrentUser])

  useEffect(() => {
    if (currentUser) {
      fetchAdmins()
      const channel = supabase
        .channel("messages")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "messages",
            filter: `receiver_id=eq.${currentUser.id}`,
          },
          () => {
            fetchAdmins()
            if (selectedAdmin) {
              fetchMessages()
            }
          },
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [currentUser, selectedAdmin, fetchAdmins])

  const fetchMessages = useCallback(async () => {
    if (!currentUser || !selectedAdmin) return

    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedAdmin.id}),and(sender_id.eq.${selectedAdmin.id},receiver_id.eq.${currentUser.id})`,
        )
        .order("created_at", { ascending: true })

      if (error) throw error
      setMessages(data || [])
    } catch (error) {
      console.error("Error fetching messages:", error)
      setError("Failed to fetch messages. Please try again later.")
    }
  }, [currentUser, selectedAdmin])

  useEffect(() => {
    if (currentUser && selectedAdmin) {
      fetchMessages()
    }
  }, [currentUser, selectedAdmin, fetchMessages])

  useEffect(() => {
    scrollToBottom()
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const sendMessage = async () => {
    if (!currentUser || !selectedAdmin || !newMessage.trim()) return

    try {
      const { error } = await supabase.from("messages").insert({
        sender_id: currentUser.id,
        receiver_id: selectedAdmin.id,
        content: newMessage.trim(),
        is_read: "no",
      })

      if (error) throw error

      setNewMessage("")
      await fetchMessages()
    } catch (error) {
      console.error("Error sending message:", error)
      setError("Failed to send message. Please try again.")
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const formatMessageDateTime = (timestamp: string) => {
    return format(new Date(timestamp), "MMM d, yyyy h:mm a")
  }

  const toggleMessageReadStatus = async (messageId: string, currentStatus: "yes" | "no") => {
    try {
      const newStatus = currentStatus === "yes" ? "no" : "yes"
      const { error } = await supabase.from("messages").update({ is_read: newStatus }).eq("id", messageId)

      if (error) throw error
      await fetchMessages()
      await fetchAdmins() // Update unread counts for all admins
    } catch (error) {
      console.error("Error toggling message read status:", error)
      setError("Failed to update message status. Please try again.")
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Chat with Admin</h1>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Admins</CardTitle>
          </CardHeader>
          <CardContent>
            {admins.length === 0 ? (
              <p>No admins available</p>
            ) : (
              <ul className="space-y-2">
                {admins.map((admin) => (
                  <li
                    key={admin.id}
                    className={`flex items-center space-x-2 p-2 rounded-md cursor-pointer ${
                      selectedAdmin?.id === admin.id ? "bg-gray-100" : "hover:bg-gray-50"
                    }`}
                    onClick={() => setSelectedAdmin(admin)}
                  >
                    <Avatar>
                      <AvatarFallback>{getInitials(`${admin.first_name} ${admin.last_name}`)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-grow">
                      <p className="font-semibold">{`${admin.first_name} ${admin.last_name}`}</p>
                      <p className="text-sm text-gray-500">{admin.email}</p>
                    </div>
                    {admin.unread_count && admin.unread_count > 0 && (
                      <Badge variant="destructive" className="animate-pulse">
                        {admin.unread_count} new
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>
              {selectedAdmin
                ? `Chat with ${selectedAdmin.first_name} ${selectedAdmin.last_name}`
                : "Select an admin to start chatting"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedAdmin ? (
              <>
                <div className="h-[400px] overflow-y-auto mb-4 space-y-4 p-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex items-start gap-2 ${
                        message.sender_id === currentUser?.id ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`relative max-w-[70%] p-3 rounded-lg ${
                          message.sender_id === currentUser?.id
                            ? "bg-blue-500 text-white"
                            : message.is_read === "no"
                              ? "bg-blue-100 text-gray-800"
                              : "bg-gray-200 text-gray-800"
                        }`}
                      >
                        <div className="mb-1">{message.content}</div>
                        <div className="text-xs opacity-70">{formatMessageDateTime(message.created_at)}</div>
                      </div>
                      {message.sender_id !== currentUser?.id && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => toggleMessageReadStatus(message.id, message.is_read)}>
                              {message.is_read === "yes" ? (
                                <>
                                  <X className="mr-2 h-4 w-4" />
                                  <span>Mark as unread</span>
                                </>
                              ) : (
                                <>
                                  <Check className="mr-2 h-4 w-4" />
                                  <span>Mark as read</span>
                                </>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                <div className="flex space-x-2">
                  <Input
                    type="text"
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                    className="flex-1"
                  />
                  <Button onClick={sendMessage}>Send</Button>
                </div>
              </>
            ) : (
              <p className="text-center text-gray-500">Select an admin to start chatting</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

