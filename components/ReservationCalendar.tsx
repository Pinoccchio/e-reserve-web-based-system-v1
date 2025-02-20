"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { format, parseISO } from "date-fns"
import { CalendarIcon, ChevronLeft, ChevronRight, MapPin, Users } from "lucide-react"
import { showToast } from "@/components/ui/toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Facility {
  id: number
  name: string
  location: string
}

interface Reservation {
  id: string
  start_time: string
  end_time: string
  facility: Facility
  status: "pending" | "approved" | "rejected" | "cancelled" | "completed"
  booker_name: string
  booker_email: string
  booker_phone: string
  purpose: string | null
  number_of_attendees: number | null
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

export function ReservationCalendar() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const fetchReservations = useCallback(async () => {
    try {
      setIsLoading(true)
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString()
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString()

      const { data, error } = await supabase
        .from("reservations")
        .select(`
          *,
          facility:facilities(id, name, location)
        `)
        .gte("start_time", startOfMonth)
        .lte("start_time", endOfMonth)
        .order("start_time", { ascending: true })

      if (error) throw error

      if (data) {
        setReservations(data as Reservation[])
      }
    } catch (error) {
      console.error("Error fetching reservations:", error)
      showToast("Failed to load reservations. Please try again.", "error")
    } finally {
      setIsLoading(false)
    }
  }, [currentDate])

  useEffect(() => {
    fetchReservations()
  }, [fetchReservations])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-200 text-yellow-800"
      case "approved":
        return "bg-green-200 text-green-800"
      case "rejected":
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
      const dayReservations = reservations.filter(
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
            <div
              key={index}
              className={`text-xs mt-1 p-1 rounded ${getStatusColor(reservation.status)} cursor-pointer`}
              onClick={() => setSelectedReservation(reservation)}
            >
              {reservation.facility.name}
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
          <p className="text-gray-600">Loading reservations...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Card className="mb-16">
        <CardHeader>
          <CardTitle className="text-2xl">Reservation Calendar</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      <Dialog open={!!selectedReservation} onOpenChange={() => setSelectedReservation(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Reservation Details</DialogTitle>
          </DialogHeader>
          {selectedReservation && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-semibold flex items-center mb-3">
                    <CalendarIcon className="mr-2 h-5 w-5" />
                    Facility Information
                  </h3>
                  <div className="space-y-2 pl-7">
                    <div>
                      <span className="font-medium">Name: </span>
                      {selectedReservation.facility.name}
                    </div>
                    <div className="flex items-start">
                      <MapPin className="mr-2 h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{selectedReservation.facility.location}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-semibold flex items-center mb-3">
                    <CalendarIcon className="mr-2 h-5 w-5" />
                    Booking Details
                  </h3>
                  <div className="space-y-2 pl-7">
                    <div>
                      <span className="font-medium">Start: </span>
                      {format(parseISO(selectedReservation.start_time), "MMMM d, yyyy h:mm a")}
                    </div>
                    <div>
                      <span className="font-medium">End: </span>
                      {format(parseISO(selectedReservation.end_time), "MMMM d, yyyy h:mm a")}
                    </div>
                    <div>
                      <span className="font-medium">Booker: </span>
                      {selectedReservation.booker_name}
                    </div>
                    <div>
                      <span className="font-medium">Email: </span>
                      {selectedReservation.booker_email}
                    </div>
                    <div>
                      <span className="font-medium">Phone: </span>
                      {selectedReservation.booker_phone}
                    </div>
                    <div>
                      <span className="font-medium">Purpose: </span>
                      {selectedReservation.purpose || "N/A"}
                    </div>
                    <div className="flex items-center">
                      <Users className="mr-2 h-4 w-4" />
                      <span className="font-medium">Attendees: </span>
                      <span className="ml-1">{selectedReservation.number_of_attendees || "N/A"}</span>
                    </div>
                    <div>
                      <span className="font-medium">Status: </span>
                      <Badge className={getStatusColor(selectedReservation.status)}>
                        {selectedReservation.status.charAt(0).toUpperCase() + selectedReservation.status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

