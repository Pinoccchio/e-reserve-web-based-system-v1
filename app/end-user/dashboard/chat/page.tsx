"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { MoreVertical, Check, X, MessageSquare, Bot, Send, RefreshCw } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
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

interface BotMessage {
  role: "user" | "assistant"
  content: string
}

interface UnreadCount {
  sender_id: string
  count: number
}

export default function ChatPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [admins, setAdmins] = useState<User[]>([])
  const [selectedAdmin, setSelectedAdmin] = useState<User | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [botMessages, setBotMessages] = useState<BotMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isChatBotMode, setIsChatBotMode] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [newMessageNotification, setNewMessageNotification] = useState(false)

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      // Only scroll the chat container, not the whole page
      const chatContainer = messagesContainerRef.current
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight
      }
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
      // Get ADMIN users for end-users to chat with
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

      // Group unread counts by sender
      const groupedCounts: UnreadCount[] = unreadCounts.reduce((acc, message) => {
        const existingCount = acc.find((count) => count.sender_id === message.sender_id)
        if (existingCount) {
          existingCount.count += 1 // Increment existing count
        } else {
          acc.push({ sender_id: message.sender_id, count: 1 }) // New count
        }
        return acc
      }, [] as UnreadCount[])

      // Fetch the most recent message timestamp for each admin
      const adminsWithLastMessagePromises = adminData.map(async (admin) => {
        // Get the most recent message between this admin and the current user (in either direction)
        const { data: lastMessage } = await supabase
          .from("messages")
          .select("created_at")
          .or(
            `and(sender_id.eq.${admin.id},receiver_id.eq.${currentUser.id}),and(sender_id.eq.${currentUser.id},receiver_id.eq.${admin.id})`,
          )
          .order("created_at", { ascending: false })
          .limit(1)
          .single()

        return {
          ...admin,
          unread_count: groupedCounts.find((count) => count.sender_id === admin.id)?.count || 0,
          last_message_at: lastMessage?.created_at || null,
        }
      })

      const adminsWithLastMessage = await Promise.all(adminsWithLastMessagePromises)

      // Sort admins: first by unread messages (desc), then by last message timestamp (desc)
      const sortedAdmins = adminsWithLastMessage.sort((a, b) => {
        // First sort by unread count (admins with unread messages come first)
        if (a.unread_count !== b.unread_count) {
          return b.unread_count - a.unread_count
        }

        // Then sort by last message timestamp (most recent first)
        if (!a.last_message_at && !b.last_message_at) return 0
        if (!a.last_message_at) return 1
        if (!b.last_message_at) return -1

        return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      })

      setAdmins(sortedAdmins)
    } catch (error) {
      console.error("Error fetching admins:", error)
      setError("Failed to fetch admins. Please try again later.")
    }
  }, [currentUser])

  const fetchMessages = useCallback(async () => {
    if (!currentUser || !selectedAdmin) return

    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedAdmin.id}),and(sender_id.eq.${selectedAdmin.id},receiver_id.eq.${currentUser.id})`,
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
        fetchAdmins() // Update unread counts after marking messages as read
      }

      // Scroll to bottom after messages are updated
      setTimeout(scrollToBottom, 100)
    } catch (error) {
      console.error("Error fetching messages:", error)
      setError("Failed to fetch messages. Please try again later.")
    } finally {
      setIsLoading(false)
    }
  }, [currentUser, selectedAdmin, fetchAdmins, scrollToBottom])

  // Handle new message from real-time subscription
  const handleNewMessage = useCallback(
    (payload: any) => {
      const newMsg = payload.new as Message

      // If we're in a conversation with the sender/receiver of this message
      if (
        selectedAdmin &&
        ((newMsg.sender_id === currentUser?.id && newMsg.receiver_id === selectedAdmin.id) ||
          (newMsg.sender_id === selectedAdmin.id && newMsg.receiver_id === currentUser?.id))
      ) {
        // Check if message already exists to avoid duplicates
        const messageExists = messages.some((msg) => msg.id === newMsg.id)

        if (!messageExists) {
          setMessages((prevMessages) => [...prevMessages, newMsg])

          // If message is from admin to current user, mark as read
          if (
            newMsg.sender_id === selectedAdmin.id &&
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
                fetchAdmins()
              })
          }

          // Show notification for new messages from admin
          if (newMsg.sender_id === selectedAdmin.id) {
            setNewMessageNotification(true)
            setTimeout(() => setNewMessageNotification(false), 3000)
          }

          // Scroll to bottom
          setTimeout(scrollToBottom, 100)
        }
      }

      // Always update admin list to refresh unread counts
      fetchAdmins()
    },
    [currentUser, selectedAdmin, messages, fetchAdmins, scrollToBottom],
  )

  useEffect(() => {
    fetchCurrentUser()
  }, [fetchCurrentUser])

  useEffect(() => {
    if (currentUser) {
      fetchAdmins()

      // Set up real-time subscriptions
      const receiverChannel = supabase
        .channel("messages-receiver")
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
            fetchAdmins()
            if (selectedAdmin) {
              fetchMessages()
            }
          },
        )
        .subscribe()

      // Channel for sent messages
      const senderChannel = supabase
        .channel("messages-sender")
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
  }, [currentUser, selectedAdmin, fetchAdmins, fetchMessages, handleNewMessage])

  useEffect(() => {
    if (currentUser && selectedAdmin && !isChatBotMode) {
      fetchMessages()
    }
  }, [currentUser, selectedAdmin, fetchMessages, isChatBotMode])

  // Scroll to bottom whenever messages or botMessages change
  useEffect(() => {
    if (messages.length > 0 || botMessages.length > 0) {
      scrollToBottom()
    }
  }, [messages, botMessages, scrollToBottom])

  const sendMessage = async () => {
    if (!currentUser || !selectedAdmin || !newMessage.trim()) return

    try {
      // Create optimistic message for immediate UI update
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        sender_id: currentUser.id,
        receiver_id: selectedAdmin.id,
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
        receiver_id: selectedAdmin.id,
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
      await fetchAdmins()
    } catch (error) {
      console.error("Error toggling message read status:", error)
      setError("Failed to update message status. Please try again.")
    }
  }

  const toggleChatMode = () => {
    setIsChatBotMode(!isChatBotMode)
    setSelectedAdmin(null)
    if (!isChatBotMode) {
      setBotMessages([
        {
          role: "assistant",
          content: "Hello! How can I help you today with our venue reservation system?",
        },
      ])
      // Scroll to bottom when switching to chatbot mode
      setTimeout(scrollToBottom, 100)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newMessage.trim() === "" || isLoading) return

    if (isChatBotMode) {
      const userMessage: BotMessage = { role: "user", content: newMessage }
      setBotMessages((prevMessages) => [...prevMessages, userMessage])
      setNewMessage("")
      setIsLoading(true)
      setError(null)

      // Add a temporary "typing" message
      setBotMessages((prevMessages) => [...prevMessages, { role: "assistant", content: "Typing..." }])

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: newMessage,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Failed to get response")
        }

        // Remove the temporary "typing" message and add the real response
        setBotMessages((prevMessages) => [
          ...prevMessages.slice(0, -1),
          {
            role: "assistant",
            content: data.output || "I'm sorry, I couldn't process that request.",
          },
        ])

        setTimeout(scrollToBottom, 100)
      } catch (error) {
        console.error("Error getting chatbot response:", error)
        setError(error instanceof Error ? error.message : "Failed to get response. Please try again.")

        // Remove the temporary "typing" message if there's an error
        setBotMessages((prevMessages) => prevMessages.slice(0, -1))
      } finally {
        setIsLoading(false)
      }
    } else {
      await sendMessage()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage(e as unknown as React.FormEvent)
    }
  }

  // Add polling as a fallback for real-time updates
  useEffect(() => {
    if (!currentUser || !selectedAdmin || isChatBotMode) return

    // Poll for new messages every 10 seconds as a fallback
    const pollingInterval = setInterval(() => {
      fetchMessages()
    }, 10000)

    return () => clearInterval(pollingInterval)
  }, [currentUser, selectedAdmin, isChatBotMode, fetchMessages])

  return (
    <div className="container mx-auto p-4 flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Chat</h1>
        <Button onClick={() => fetchAdmins()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
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
            <CardTitle className="flex justify-between items-center">
              <span>{isChatBotMode ? "ChatBot" : "Admins"}</span>
              <Button variant="outline" size="sm" onClick={toggleChatMode}>
                {isChatBotMode ? <MessageSquare className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto min-h-0">
            {isChatBotMode ? (
              <p>Chat with our AI assistant for quick answers about venue reservations.</p>
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
                    {admin.unread_count !== undefined &&
                      (admin.unread_count > 0 ? (
                        <Badge variant="destructive" className="animate-pulse">
                          {admin.unread_count} new
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
              {isChatBotMode ? (
                "Chat with AI Assistant"
              ) : selectedAdmin ? (
                <div className="flex items-center">
                  <span>{`Chat with ${selectedAdmin.first_name} ${selectedAdmin.last_name}`}</span>
                  {newMessageNotification && (
                    <Badge variant="destructive" className="ml-2 animate-pulse">
                      New message
                    </Badge>
                  )}
                </div>
              ) : (
                "Select an admin to start chatting"
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0">
            <div
              ref={messagesContainerRef}
              className="overflow-y-auto h-[calc(100%-4rem)] mb-4 space-y-4 p-4 flex flex-col"
              id="chat-messages-container"
            >
              {isLoading && !isChatBotMode ? (
                <div className="flex items-center justify-center h-full">
                  <p>Loading messages...</p>
                </div>
              ) : isChatBotMode ? (
                <div className="flex-grow">
                  {botMessages.map((message, index) => (
                    <div key={index} className={`mb-4 ${message.role === "user" ? "text-right" : "text-left"}`}>
                      <span
                        className={`inline-block rounded-lg px-3 py-2 ${
                          message.role === "user" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-800"
                        } ${message.content === "Typing..." ? "animate-pulse" : ""}`}
                      >
                        {message.content}
                      </span>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <p>
                    {selectedAdmin ? "No messages yet. Start a conversation!" : "Select an admin to start chatting"}
                  </p>
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
            <form onSubmit={handleSendMessage} className="flex-none flex w-full items-center space-x-2">
              <Input
                type="text"
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={isLoading || (!isChatBotMode && !selectedAdmin)}
                className="flex-1"
              />
              <Button type="submit" disabled={isLoading || (!isChatBotMode && !selectedAdmin) || !newMessage.trim()}>
                <Send className="h-4 w-4 mr-2" />
                Send
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
