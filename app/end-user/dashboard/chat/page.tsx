"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { MoreVertical, Check, X, MessageSquare, Bot, Send } from "lucide-react"
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

interface BotMessage {
  role: "user" | "assistant"
  content: string
}

interface PreparedQuestion {
  question: string
  answer: string
}

interface Venue {
  id: number
  name: string
  location: string
  latitude: number
  longitude: number
  description: string
  capacity: number
  type: string
  price_per_hour: number
}

const venues: Venue[] = [
  {
    id: 4,
    name: "SK Building",
    location: "M3X6+H34, Libmanan, Camarines Sur, Philippines",
    latitude: 13.6988807,
    longitude: 123.0601918,
    description:
      "The SK Building in Bagumbayan Libmanan is a spacious indoor venue ideal for various events such as weddings, birthdays, seminars, training, and other special occasions. With a capacity of 150 people, it features air conditioning, ample seating, and a well-maintained tiled floor. The venue provides a comfortable and organized setting, ensuring a smooth experience for all attendees.",
    capacity: 150,
    type: "Outdoor",
    price_per_hour: 1500,
  },
  {
    id: 5,
    name: "Cultural Center",
    location: "Libod I, Libmanan, Camarines Sur, Philippines",
    latitude: 13.6954201,
    longitude: 123.0641297,
    description:
      "The Cultural Center in Libod I, Libmanan, Camarines Sur, is a spacious venue designed for large gatherings, cultural events, weddings, birthdays, seminars, and other special occasions. With a seating capacity of 700, it offers an open and versatile space ideal for various functions. The facility features a high ceiling with a sturdy metal framework, a stage for performances or presentations and wide open areas for seating or event setups. Its strategic location and well-lit interior make it a suitable choice for public and private events, ensuring accessibility and convenience for attendees.",
    capacity: 700,
    type: "Outdoor",
    price_per_hour: 1500,
  },
  {
    id: 6,
    name: "Sports Complex",
    location: "Libod I, Libmanan, Camarines Sur, Philippines",
    latitude: 13.6954201,
    longitude: 123.0641297,
    description:
      "The Sports Complex on Libmanan, is the premier choice for hosting large-scale events, accommodating up to 900 people. This expansive venue is perfect for sports tournaments, conventions, festivals, concerts, job fairs, weddings, pageant and major community celebrations. The complex's state-of-the-art facilities and central location provide a professional and inviting atmosphere for all occasions.",
    capacity: 900,
    type: "Outdoor",
    price_per_hour: 1500,
  },
  {
    id: 7,
    name: "Potot Evacuation",
    location: "Potot, Libmanan, Camarines Sur, Philippines",
    latitude: 13.6860636,
    longitude: 123.0549844,
    description:
      "The Potot Evacuation Center in Barangay Potot is a multifunctional venue with a 400-person capacity. While primarily serving as a safe haven during emergencies, it also transforms into a practical space for hosting events like health seminars, training workshops, educational activities, community programs, and private functions. Its adaptability makes it a reliable choice for any occasion.",
    capacity: 400,
    type: "Outdoor",
    price_per_hour: 0,
  },
  {
    id: 8,
    name: "GMVCC Blue Court",
    location: "Potot, Libmanan, Camarines Sur, Philippines",
    latitude: 13.6860636,
    longitude: 123.0549844,
    description:
      "The GMVCC Blue Court, located in Potot, Libmanan, offers a dynamic and versatile venue with a capacity of 400 guests. This vibrant blue multipurpose court is ideal for a wide range of events, including sports tournaments, team-building activities, community fairs, cultural celebrations, and private functions. Its professional-grade facilities and adaptable space ensure a seamless and memorable experience for all types of occasions.",
    capacity: 400,
    type: "Outdoor",
    price_per_hour: 0,
  },
  {
    id: 9,
    name: "Skating Rink",
    location: "Libod I, Libmanan, Camarines Sur, Philippines",
    latitude: 13.6954201,
    longitude: 123.0641297,
    description:
      "Skating Rink Libmanan's Skating Rink, located in Camarines Sur, provides a unique and flexible venue option for all types of events. With a capacity of 200 guests, this venue is ideal not only for skating activities but also for fairs, markets, themed parties, corporate events, and community gatherings. Its open and adaptable space ensures that every event is executed with ease and style.",
    capacity: 200,
    type: "Outdoor",
    price_per_hour: 0,
  },
  {
    id: 10,
    name: "MO Conference Room",
    location: "M3V6+R29, Libmanan, Camarines Sur, Philippines",
    latitude: 13.6945445,
    longitude: 123.0600949,
    description:
      "The MO Conference Room, situated within the Municipal Hall of Libmanan, is a sophisticated indoor venue perfect for hosting formal and intimate events. With a capacity of 40 attendees, it is well-suited for meetings, seminars, workshops, and training sessions. The conference room's professional setting and modern amenities provide an ideal environment for both corporate and personal gatherings.",
    capacity: 40,
    type: "Indoor",
    price_per_hour: 0,
  },
  {
    id: 11,
    name: "Municipal Lobby",
    location: "M3V6+R29, Libmanan, Camarines Sur, Philippines",
    latitude: 13.6945445,
    longitude: 123.0600949,
    description:
      "The Municipal Hall Lobby in Barangay Libod I, Libmanan, is a welcoming and adaptable venue that accommodates up to 50 guests. It is an excellent choice for civic programs, exhibitions, small ceremonies, corporate events, and social gatherings. Its strategic location and flexible layout make it suitable for both public engagements and private celebrations.",
    capacity: 50,
    type: "Indoor",
    price_per_hour: 0,
  },
  {
    id: 12,
    name: "Plaza Rizal",
    location: "Libod I, Libmanan, Camarines Sur, Philippines",
    latitude: 13.6954201,
    longitude: 123.0641297,
    description:
      "Plaza Rizal Plaza Rizal, located at the heart of Libod I, Libmanan, offers an expansive outdoor venue with a capacity of 500 people. Its well-maintained grounds and historic ambiance provide an exceptional setting for large-scale events such as festivals, concerts, weddings, cultural showcases, community fairs, and public ceremonies. The plaza's open space is ideal for bringing people together for memorable experiences.",
    capacity: 500,
    type: "Outdoor",
    price_per_hour: 0,
  },
  {
    id: 13,
    name: "Municipal Quadrangle",
    location: "Libod I, Libmanan, Camarines Sur, Philippines",
    latitude: 13.6954201,
    longitude: 123.0641297,
    description:
      "The Municipal Quadrangle is a spacious outdoor venue located in libod 1 Libmanan Camarines Sur. With a capacity of 400 people, it is an ideal space for public gatherings, ceremonies, and community events. The open layout provides flexibility for different setups, while the well-paved flooring ensures comfort for attendees. It is commonly used for municipal programs, cultural events, and large social gatherings.",
    capacity: 400,
    type: "Outdoor",
    price_per_hour: 0,
  },
]

const preparedQuestions: PreparedQuestion[] = [
  {
    question: "What venues are available for booking?",
    answer:
      "We have several venues available for booking in Libmanan, Camarines Sur:\n\n" +
      venues.map((venue) => `- ${venue.name} (Capacity: ${venue.capacity}, Type: ${venue.type})`).join("\n") +
      "\n\nEach venue has its own unique features and is suitable for different types of events.",
  },
  {
    question: "How do I make a reservation?",
    answer:
      "To make a reservation, follow these steps:\n\n1. Go to the Facilities page on our website.\n2. Select your desired venue.\n3. Choose your preferred date and time.\n4. Click on 'Book Now'.\n5. Fill in the required information (name, email, phone, purpose, number of attendees).\n6. For special venues (SK Building, Cultural Center, Sports Complex), you'll need to pay a fee of ₱1,500.\n7. Submit your booking request.\n\nFor special venues, you'll receive a digital receipt. You'll need to visit the payment collector to confirm your payment. For other venues, your booking will be sent directly for approval.",
  },
  {
    question: "What are the special venues and their booking process?",
    answer:
      "The special venues are:\n\n1. SK Building\n2. Cultural Center\n3. Sports Complex\n\nThese venues have a booking fee of ₱1,500 per hour. The booking process for special venues is as follows:\n\n1. Book the venue through our website.\n2. Receive a digital receipt.\n3. Visit the payment collector to confirm your payment of ₱1,500.\n4. Once payment is confirmed, your booking will be processed.\n\nFor all other venues, the booking is free and will be directly sent for approval.",
  },
  {
    question: "Are there any fees for booking regular venues?",
    answer:
      "No, regular venues (those not listed as special venues) are free to book. You can reserve these venues directly through our online system without any payment required. However, all bookings, including free venues, still require approval from the appropriate staff.",
  },
  {
    question: "What's the capacity of each venue?",
    answer:
      "Here's a list of our venues and their capacities:\n\n" +
      venues.map((venue) => `- ${venue.name}: ${venue.capacity} people`).join("\n") +
      "\n\nPlease note that these capacities are maximum limits, and actual allowed capacity may vary based on the type of event and current regulations.",
  },
  {
    question: "How does the approval process work?",
    answer:
      "The approval process varies depending on the venue:\n\n1. For special venues (SK Building, Cultural Center, Sports Complex), your booking request goes to a payment collector for fee confirmation.\n2. For the MO Conference Room, it's sent to MDRR staff for approval.\n3. For other regular venues, the request is sent to admins for approval.\n\nYou'll receive notifications about the status of your booking throughout the process.",
  },
  {
    question: "Can I cancel or modify my booking?",
    answer:
      "Yes, you can cancel your booking up to 24 hours before the reservation time without any penalty. To modify a booking, you may need to cancel the existing one and create a new reservation. For special venues, please check with the payment collector regarding refund policies for the ₱1,500 fee if you need to cancel.",
  },
  {
    question: "How can I check the status of my booking?",
    answer:
      "You can check the status of your booking in the 'My Reservations' section of your dashboard. You'll also receive notifications about any updates to your booking status. The possible statuses are:\n\n- Pending: Your booking is awaiting approval\n- Approved: Your booking has been confirmed\n- Declined: Your booking request was not approved\n- Cancelled: The booking has been cancelled\n- Completed: The event has taken place",
  },
  {
    question: "What should I do after I receive my booking receipt?",
    answer:
      "After receiving your booking receipt:\n\n1. For regular (free) venues: No further action is needed. Your booking will be reviewed by the appropriate staff.\n\n2. For special venues (SK Building, Cultural Center, Sports Complex):\n   - Take your receipt to the payment collector\n   - Confirm your payment of ₱1,500\n   - Once payment is verified, your booking will be processed\n\nKeep your receipt safe as you may need to present it on the day of your event.",
  },
  {
    question: "Are there any discounts available for special venues?",
    answer:
      "While regular venues are free, we occasionally offer discounts on the ₱1,500 fee for special venues (SK Building, Cultural Center, Sports Complex) for certain community organizations or events. These discounts are assessed on a case-by-case basis. To inquire about potential discounts, please contact our admin team with details about your organization and the nature of your event.",
  },
]

export default function ChatPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [admins, setAdmins] = useState<User[]>([])
  const [selectedAdmin, setSelectedAdmin] = useState<User | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [botMessages, setBotMessages] = useState<BotMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isChatBotMode, setIsChatBotMode] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
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

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

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

  const toggleChatMode = () => {
    setIsChatBotMode(!isChatBotMode)
    setSelectedAdmin(null)
    if (!isChatBotMode && botMessages.length === 0) {
      setBotMessages([
        {
          role: "assistant",
          content: "Hello! How can I help you today with our venue reservation system?",
        },
      ])
    }
  }

  const handleSendMessage = async () => {
    if (newMessage.trim() === "" || isLoading) return

    if (isChatBotMode) {
      const userMessage: BotMessage = { role: "user", content: newMessage }
      setBotMessages((prevMessages) => [...prevMessages, userMessage])
      setNewMessage("")
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [...botMessages, userMessage],
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Failed to get response")
        }

        const assistantMessage: BotMessage = {
          role: "assistant",
          content: data.output,
        }

        setBotMessages((prevMessages) => [...prevMessages, assistantMessage])
      } catch (error) {
        console.error("Error getting chatbot response:", error)
        setError(error instanceof Error ? error.message : "Failed to get response. Please try again.")
      } finally {
        setIsLoading(false)
      }
    } else {
      await sendMessage()
    }
  }

  const handlePreparedQuestion = (question: PreparedQuestion) => {
    const userMessage: BotMessage = { role: "user", content: question.question }
    const assistantMessage: BotMessage = { role: "assistant", content: question.answer }

    setBotMessages((prevMessages) => [...prevMessages, userMessage, assistantMessage])
    scrollToBottom()
  }

  useEffect(() => {
    scrollToBottom()
  }, [scrollToBottom])

  return (
    <div className="container mx-auto p-4 flex flex-col">
      <h1 className="text-2xl font-bold mb-4">Chat</h1>
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
              <div className="space-y-2">
                <p className="font-semibold mb-2">Frequently Asked Questions:</p>
                {preparedQuestions.map((q, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="w-full justify-start text-left"
                    onClick={() => handlePreparedQuestion(q)}
                  >
                    {q.question}
                  </Button>
                ))}
              </div>
            ) : admins.length === 0 ? (
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
        <Card className="md:col-span-2 flex flex-col h-[600px]">
          <CardHeader className="flex-none">
            <CardTitle>
              {isChatBotMode
                ? "Chat with AI Assistant"
                : selectedAdmin
                  ? `Chat with ${selectedAdmin.first_name} ${selectedAdmin.last_name}`
                  : "Select an admin to start chatting"}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0">
            {isChatBotMode || selectedAdmin ? (
              <>
                <div className="overflow-y-auto h-[calc(100%-4rem)] mb-4 space-y-4 p-4">
                  {isChatBotMode
                    ? botMessages.map((message, index) => (
                        <div key={index} className={`mb-4 ${message.role === "user" ? "text-right" : "text-left"}`}>
                          <span
                            className={`inline-block rounded-lg px-3 py-2 ${
                              message.role === "user" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-800"
                            }`}
                          >
                            {message.content}
                          </span>
                        </div>
                      ))
                    : messages.map((message) => (
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
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleSendMessage()
                  }}
                  className="flex-none flex w-full items-center space-x-2"
                >
                  <Input
                    type="text"
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={isLoading}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
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

