"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { format, parseISO } from "date-fns"
import { CalendarIcon, MapPin, AlertCircle, Building, Users, FileText, ChevronLeft, ChevronRight } from "lucide-react"
import { showToast } from "@/components/ui/toast"

interface Facility {
  name: string
  location: string
}

interface Reservation {
  id: number
  user_id: string
  facility_id: number
  booker_name: string
  booker_email: string
  booker_phone: string
  start_time: string
  end_time: string
  status: "pending" | "approved" | "declined" | "cancelled" | "completed"
  receipt_image_url: string | null
  purpose: string | null
  number_of_attendees: number | null
  special_requests: string | null
  created_by: string
  last_updated_by: string
  admin_action_by: string | null
  admin_action_at: string | null
  cancellation_reason: string | null
  facility: Facility | null
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [statusFilter, setStatusFilter] = useState("all")
  const [isLoading, setIsLoading] = useState(true)
  const [userName, setUserName] = useState("")
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [currentDate, setCurrentDate] = useState(new Date())

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  useEffect(() => {
    fetchReservations()
    fetchUserName()
  }, [])

  async function fetchReservations() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        throw new Error("No authenticated user found")
      }

      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString()
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString()

      const { data, error } = await supabase
        .from("reservations")
        .select(`
          *,
          facility:facilities(name, location)
        `)
        .eq("user_id", user.id)
        .gte("start_time", startOfMonth)
        .lte("start_time", endOfMonth)
        .order("start_time", { ascending: true })

      if (error) {
        throw new Error(`Supabase error: ${error.message}`)
      }

      if (!data) {
        throw new Error("No data returned from Supabase")
      }

      const typedReservations: Reservation[] = data.map((reservation: any) => ({
        ...reservation,
        facility: reservation.facility ?? null,
      }))

      setReservations(typedReservations)
      setIsLoading(false)
      showToast(`Successfully fetched ${typedReservations.length} reservations.`, "success")
    } catch (error) {
      console.error("Error fetching reservations:", error)
      showToast("Failed to load reservations. Please try again.", "error")
      setReservations([])
      setIsLoading(false)
    }
  }

  async function fetchUserName() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const { data, error } = await supabase.from("users").select("first_name, last_name").eq("id", user.id).single()

        if (error) throw error
        if (data) {
          setUserName(`${data.first_name} ${data.last_name}`)
        }
      }
    } catch (error) {
      console.error("Error fetching user name:", error)
      showToast("Failed to load user information.", "error")
    }
  }

  const handleCancelReservation = async (id: number) => {
    try {
      const { error } = await supabase
        .from("reservations")
        .update({
          status: "cancelled",
          cancellation_reason: `Cancelled by ${userName}`,
        })
        .eq("id", id)

      if (error) throw error

      showToast("Reservation cancelled successfully", "success")
      fetchReservations()
    } catch (error) {
      console.error("Error cancelling reservation:", error)
      showToast("Failed to cancel reservation. Please try again.", "error")
    }
  }

  const filteredReservations = reservations.filter(
    (reservation) => statusFilter === "all" || reservation.status === statusFilter,
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-200 text-yellow-800"
      case "approved":
        return "bg-green-200 text-green-800"
      case "declined":
        return "bg-red-200 text-red-800"
      case "cancelled":
        return "bg-gray-200 text-gray-800"
      case "completed":
        return "bg-blue-200 text-blue-800"
      default:
        return "bg-gray-200 text-gray-800"
    }
  }

  const renderCells = () => {
    const cells = []
    const today = new Date()
    for (let i = 0; i < firstDayOfMonth; i++) {
      cells.push(<div key={`empty-${i}`} className="p-2"></div>)
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      const dayReservations = filteredReservations.filter(
        (reservation) => new Date(reservation.start_time).getDate() === date.getDate(),
      )
      const isToday =
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      cells.push(
        <div key={day} className={`p-2 border border-gray-200 ${isToday ? "bg-yellow-100 font-bold" : ""}`}>
          <span className={`${isToday ? "text-blue-600" : ""}`}>{day}</span>
          {dayReservations.map((reservation, index) => (
            <div key={index} className={`text-xs mt-1 p-1 rounded ${getStatusColor(reservation.status)}`}>
              {reservation.facility?.name}
            </div>
          ))}
        </div>,
      )
    }
    return cells
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your reservations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">My Reservations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex justify-between items-center">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reservations</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredReservations.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">No reservations found</h3>
              <p className="mt-2 text-sm text-gray-500">
                {statusFilter === "all"
                  ? "You haven't made any reservations yet."
                  : `You don't have any ${statusFilter} reservations.`}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="w-full">
                <div className="bg-white p-4 rounded-lg shadow-md mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <Button onClick={prevMonth} variant="outline" size="icon">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <h2 className="text-xl font-bold">
                      {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </h2>
                    <Button onClick={nextMonth} variant="outline" size="icon">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {DAYS.map((day) => (
                      <div key={day} className="font-semibold text-center p-2">
                        {day}
                      </div>
                    ))}
                    {renderCells()}
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Upcoming Reservations</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredReservations.map((reservation) => (
                    <div
                      key={reservation.id}
                      className="p-4 rounded-lg border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setSelectedReservation(reservation)}
                    >
                      <div className="flex flex-col justify-between h-full">
                        <div>
                          <h4 className="font-medium">{reservation.facility?.name}</h4>
                          <p className="text-sm text-gray-500">
                            {format(parseISO(reservation.start_time), "MMM d, yyyy h:mm a")} -{" "}
                            {format(parseISO(reservation.end_time), "h:mm a")}
                          </p>
                        </div>
                        <Badge className={`${getStatusColor(reservation.status)} mt-2`}>
                          {reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedReservation} onOpenChange={() => setSelectedReservation(null)}>
        <DialogContent className="max-w-3xl w-[90vw]">
          <DialogHeader>
            <DialogTitle>Reservation Details</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[80vh]">
            {selectedReservation && (
              <div className="space-y-6 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center">
                        <Building className="mr-2 h-5 w-5" />
                        Facility Information
                      </h3>
                      <div className="space-y-2">
                        <p className="flex items-center">
                          <span className="font-medium">Name:</span>
                          <span className="ml-2">{selectedReservation.facility?.name ?? "Unknown Facility"}</span>
                        </p>
                        <p className="flex items-center">
                          <MapPin className="mr-2 h-4 w-4 text-gray-500" />
                          {selectedReservation.facility?.location ?? "Unknown Location"}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-3 flex items-center">
                        <CalendarIcon className="mr-2 h-5 w-5" />
                        Booking Details
                      </h3>
                      <div className="space-y-2">
                        <p>
                          <span className="font-medium">Start:</span>{" "}
                          {format(parseISO(selectedReservation.start_time), "MMMM d, yyyy h:mm a")}
                        </p>
                        <p>
                          <span className="font-medium">End:</span>{" "}
                          {format(parseISO(selectedReservation.end_time), "MMMM d, yyyy h:mm a")}
                        </p>
                        <p>
                          <span className="font-medium">Purpose:</span> {selectedReservation.purpose || "N/A"}
                        </p>
                        <p className="flex items-center">
                          <Users className="mr-2 h-4 w-4 text-gray-500" />
                          <span className="font-medium">Attendees:</span>{" "}
                          <span className="ml-1">{selectedReservation.number_of_attendees || "N/A"}</span>
                        </p>
                      </div>
                    </div>

                    {selectedReservation.special_requests && (
                      <div>
                        <h3 className="font-semibold mb-2">Special Requests</h3>
                        <p className="text-gray-600">{selectedReservation.special_requests}</p>
                      </div>
                    )}
                  </div>

                  {selectedReservation.receipt_image_url && (
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center">
                        <FileText className="mr-2 h-5 w-5" />
                        Receipt
                      </h3>
                      <div className="rounded-lg overflow-hidden border">
                        <img
                          src={selectedReservation.receipt_image_url || "/placeholder.svg"}
                          alt="Receipt"
                          className="w-full h-auto object-contain"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </ScrollArea>
          {selectedReservation && selectedReservation.status === "pending" && (
            <DialogFooter>
              <Button variant="destructive" onClick={() => handleCancelReservation(selectedReservation.id)}>
                Cancel Reservation
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

