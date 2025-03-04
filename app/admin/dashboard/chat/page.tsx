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

interface UnreadCount {
  sender_id: string
  count: number
}

export default function AdminChatPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchCurrentUser()
  }, [])

  useEffect(() => {
    if (currentUser) {
      fetchUsers()
      const channel = supabase
        .channel("messages")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `receiver_id=eq.${currentUser.id}`,
          },
          () => {
            fetchUsers()
            if (selectedUser) {
              fetchMessages()
            }
          },
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [currentUser, selectedUser])

  useEffect(() => {
    if (selectedUser) {
      fetchMessages()
    }
  }, [selectedUser])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const fetchCurrentUser = async () => {
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
        setCurrentUser(data as User)
      } else {
        throw new Error("No authenticated user found")
      }
    } catch (error) {
      console.error("Error fetching current user:", error)
      setError("Failed to fetch current user. Please try again later.")
    }
  }

  const fetchUsers = async () => {
    if (!currentUser) return

    try {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, first_name, last_name, email, account_type")
        .eq("account_type", "end-user")

      if (userError) throw userError

      // Fetch unread counts without grouping
      const { data: unreadCounts, error: countError } = await supabase
        .from("messages")
        .select("sender_id, is_read")
        .eq("receiver_id", currentUser.id)
        .eq("is_read", "no")

      if (countError) throw countError

      // Group unread counts manually
      const groupedCounts: UnreadCount[] = unreadCounts.reduce((acc, message) => {
        const existingCount = acc.find((count) => count.sender_id === message.sender_id)
        if (existingCount) {
          existingCount.count += 1 // Increment existing count
        } else {
          acc.push({ sender_id: message.sender_id, count: 1 }) // New count
        }
        return acc
      }, [] as UnreadCount[])

      const usersWithUnreadCounts = userData.map((user) => ({
        ...user,
        unread_count: groupedCounts.find((count) => count.sender_id === user.id)?.count || 0,
      }))

      setUsers(usersWithUnreadCounts)
    } catch (error) {
      console.error("Error fetching users:", error)
      setError("Failed to fetch users. Please try again later.")
    }
  }

  const fetchMessages = useCallback(async () => {
    if (!currentUser || !selectedUser) return

    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${currentUser.id})`,
        )
        .order("created_at", { ascending: true })

      if (error) throw error
      setMessages(data || [])
    } catch (error) {
      console.error("Error fetching messages:", error)
      setError("Failed to fetch messages. Please try again later.")
    }
  }, [currentUser, selectedUser])

  const sendMessage = async () => {
    if (!currentUser || !selectedUser || !newMessage.trim()) return

    try {
      const { error } = await supabase.from("messages").insert({
        sender_id: currentUser.id,
        receiver_id: selectedUser.id,
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
      await fetchUsers() // Update unread counts for all users
    } catch (error) {
      console.error("Error toggling message read status:", error)
      setError("Failed to update message status. Please try again.")
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Admin Chat</h1>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>End Users</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {users.length === 0 ? (
              <p className="p-4">No users available</p>
            ) : (
              <div className="h-[500px] overflow-y-auto"> {/* Fixed height with scrolling */}
                <ul className="space-y-2 p-2">
                  {users.map((user) => (
                    <li
                      key={user.id}
                      className={`flex items-center space-x-2 p-2 rounded-md cursor-pointer ${
                        selectedUser?.id === user.id ? "bg-gray-100" : "hover:bg-gray-50"
                      }`}
                      onClick={() => setSelectedUser(user)}
                    >
                      <Avatar>
                        <AvatarFallback>{getInitials(`${user.first_name} ${user.last_name}`)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-grow">
                        <p className="font-semibold">{`${user.first_name} ${user.last_name}`}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                      {user.unread_count && user.unread_count > 0 && (
                        <Badge variant="destructive" className="animate-pulse">
                          {user.unread_count} new
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>
              {selectedUser
                ? `Chat with ${selectedUser.first_name} ${selectedUser.last_name}`
                : "Select a user to start chatting"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedUser ? (
              <>
                <div className="h-[400px] overflow-y-auto mb-4 space-y-4 p-4"> {/* Fixed height with scrolling */}
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
              <p className="text-center text-gray-500">Select a user to start chatting</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}