"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { MoreVertical, Check, X, Send, RefreshCw } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { format } from "date-fns"

interface User {
  id: string
  first_name: string
  last_name: string
  email: string
  account_type: string
  unread_count?: number
  last_message_at?: string | null
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
  const [isLoading, setIsLoading] = useState(false)
  const [newMessageNotification, setNewMessageNotification] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Updated scrollToBottom function to scroll only the chat container
  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }, [])

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
        setCurrentUser(data as User)
      } else {
        throw new Error("No authenticated user found")
      }
    } catch (error) {
      console.error("Error fetching current user:", error)
      setError("Failed to fetch current user. Please try again later.")
    }
  }, [])

  const fetchUsers = useCallback(async () => {
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

      // Fetch the most recent message timestamp for each user
      const usersWithLastMessagePromises = userData.map(async (user) => {
        // Get the most recent message between this user and the admin (in either direction)
        const { data: lastMessage } = await supabase
          .from("messages")
          .select("created_at")
          .or(
            `and(sender_id.eq.${user.id},receiver_id.eq.${currentUser.id}),and(sender_id.eq.${currentUser.id},receiver_id.eq.${user.id})`,
          )
          .order("created_at", { ascending: false })
          .limit(1)
          .single()

        return {
          ...user,
          unread_count: groupedCounts.find((count) => count.sender_id === user.id)?.count || 0,
          last_message_at: lastMessage?.created_at || null,
        }
      })

      const usersWithLastMessage = await Promise.all(usersWithLastMessagePromises)

      // Sort users: first by unread messages (desc), then by last message timestamp (desc)
      const sortedUsers = usersWithLastMessage.sort((a, b) => {
        // First sort by unread count (users with unread messages come first)
        if (a.unread_count !== b.unread_count) {
          return b.unread_count - a.unread_count
        }

        // Then sort by last message timestamp (most recent first)
        if (!a.last_message_at && !b.last_message_at) return 0
        if (!a.last_message_at) return 1
        if (!b.last_message_at) return -1

        return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      })

      setUsers(sortedUsers)
    } catch (error) {
      console.error("Error fetching users:", error)
      setError("Failed to fetch users. Please try again later.")
    }
  }, [currentUser])

  const fetchMessages = useCallback(async () => {
    if (!currentUser || !selectedUser) return

    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${currentUser.id})`,
        )
        .order("created_at", { ascending: true })

      if (error) throw error
      setMessages(data || [])

      // Mark messages as read
      const unreadMessages = data?.filter((msg) => msg.receiver_id === currentUser.id && msg.is_read === "no") || []

      if (unreadMessages.length > 0) {
        await Promise.all(
          unreadMessages.map((msg) => supabase.from("messages").update({ is_read: "yes" }).eq("id", msg.id)),
        )
        fetchUsers() // Refresh unread counts
      }

      // Scroll to bottom after messages are updated
      setTimeout(scrollToBottom, 100)
    } catch (error) {
      console.error("Error fetching messages:", error)
      setError("Failed to fetch messages. Please try again later.")
    } finally {
      setIsLoading(false)
    }
  }, [currentUser, selectedUser, fetchUsers, scrollToBottom])

  // Handle new message from real-time subscription
  const handleNewMessage = useCallback(
    (payload: any) => {
      const newMsg = payload.new as Message

      // If we're in a conversation with the sender/receiver of this message
      if (
        selectedUser &&
        ((newMsg.sender_id === currentUser?.id && newMsg.receiver_id === selectedUser.id) ||
          (newMsg.sender_id === selectedUser.id && newMsg.receiver_id === currentUser?.id))
      ) {
        // Check if message already exists to avoid duplicates
        const messageExists = messages.some((msg) => msg.id === newMsg.id)

        if (!messageExists) {
          setMessages((prevMessages) => [...prevMessages, newMsg])

          // If message is from user to admin, mark as read
          if (
            newMsg.sender_id === selectedUser.id &&
            newMsg.receiver_id === currentUser?.id &&
            newMsg.is_read === "no"
          ) {
            // Update read status
            supabase
              .from("messages")
              .update({ is_read: "yes" })
              .eq("id", newMsg.id)
              .then(() => {
                // Update unread counts after marking as read
                fetchUsers()
              })
          }

          // Show notification for new messages from user
          if (newMsg.sender_id === selectedUser.id) {
            setNewMessageNotification(true)
            setTimeout(() => setNewMessageNotification(false), 3000)
          }

          // Scroll to bottom
          setTimeout(scrollToBottom, 100)
        }
      }

      // Always update user list to refresh unread counts and sort order
      fetchUsers()
    },
    [currentUser, selectedUser, messages, fetchUsers, scrollToBottom],
  )

  useEffect(() => {
    fetchCurrentUser()
  }, [fetchCurrentUser])

  useEffect(() => {
    if (currentUser) {
      fetchUsers()

      // Set up real-time subscriptions
      const receiverChannel = supabase
        .channel("admin-messages-receiver")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "messages",
            filter: `receiver_id=eq.${currentUser.id}`,
          },
          (payload) => {
            handleNewMessage(payload)
            fetchUsers()
          },
        )
        .subscribe()

      // Channel for sent messages
      const senderChannel = supabase
        .channel("admin-messages-sender")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `sender_id=eq.${currentUser.id}`,
          },
          (payload) => {
            handleNewMessage(payload)
          },
        )
        .subscribe()

      return () => {
        supabase.removeChannel(receiverChannel)
        supabase.removeChannel(senderChannel)
      }
    }
  }, [currentUser, fetchUsers, handleNewMessage])

  useEffect(() => {
    if (currentUser && selectedUser) {
      fetchMessages()
    }
  }, [currentUser, selectedUser, fetchMessages])

  // Call scrollToBottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom()
    }
  }, [messages, scrollToBottom])

  const sendMessage = async () => {
    if (!currentUser || !selectedUser || !newMessage.trim()) return

    try {
      // Create optimistic message for immediate UI update
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        sender_id: currentUser.id,
        receiver_id: selectedUser.id,
        content: newMessage.trim(),
        created_at: new Date().toISOString(),
        is_read: "no",
      }

      // Add to UI immediately
      setMessages((prevMessages) => [...prevMessages, optimisticMessage])

      // Clear input
      setNewMessage("")

      // Scroll to bottom
      setTimeout(scrollToBottom, 10)

      // Actually send to server
      const { error } = await supabase.from("messages").insert({
        sender_id: currentUser.id,
        receiver_id: selectedUser.id,
        content: newMessage.trim(),
        is_read: "no",
      })

      if (error) throw error

      // No need to fetch messages as real-time subscription will handle it
    } catch (error) {
      console.error("Error sending message:", error)
      setError("Failed to send message. Please try again.")

      // Remove optimistic message on error
      setMessages((prevMessages) => prevMessages.filter((msg) => !msg.id.startsWith("temp-")))
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

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Add polling as a fallback for real-time updates
  useEffect(() => {
    if (!currentUser || !selectedUser) return

    // Poll for new messages every 10 seconds as a fallback
    const pollingInterval = setInterval(() => {
      fetchMessages()
    }, 10000)

    return () => clearInterval(pollingInterval)
  }, [currentUser, selectedUser, fetchMessages])

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Admin Chat</h1>
        <Button onClick={() => fetchUsers()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Users
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1 flex flex-col h-[600px]">
          <CardHeader className="flex-none">
            <CardTitle>End Users</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto min-h-0 p-0">
            {users.length === 0 ? (
              <p className="p-4">No users available</p>
            ) : (
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
                    {user.unread_count !== undefined &&
                      (user.unread_count > 0 ? (
                        <Badge variant="destructive" className="animate-pulse">
                          {user.unread_count} new
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-400">
                          0
                        </Badge>
                      ))}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2 flex flex-col h-[600px]">
          <CardHeader className="flex-none">
            <CardTitle>
              {selectedUser ? (
                <div className="flex items-center">
                  <span>{`Chat with ${selectedUser.first_name} ${selectedUser.last_name}`}</span>
                  {newMessageNotification && (
                    <Badge variant="destructive" className="ml-2 animate-pulse">
                      New message
                    </Badge>
                  )}
                </div>
              ) : (
                "Select a user to start chatting"
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0">
            {selectedUser ? (
              <>
                <div
                  ref={messagesContainerRef}
                  className="overflow-y-auto h-[calc(100%-4rem)] mb-4 space-y-4 p-4 flex flex-col"
                  id="chat-messages-container"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <p>Loading messages...</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <p>No messages yet. Start a conversation!</p>
                    </div>
                  ) : (
                    <div className="flex-grow">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex items-start gap-2 mb-4 ${
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
                  )}
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    sendMessage()
                  }}
                  className="flex-none flex w-full items-center space-x-2"
                >
                  <Input
                    type="text"
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={isLoading || !newMessage.trim()}>
                    <Send className="h-4 w-4 mr-2" />
                    Send
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <p>Select a user to start chatting</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
