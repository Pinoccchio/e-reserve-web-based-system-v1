"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, CalendarIcon, MapPin, Users } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { format, parseISO } from "date-fns"

interface Reservation {
  id: number
  start_time: string
  end_time: string
  facility: {
    name: string
    location: string
  } | null
  status: "pending" | "approved" | "declined" | "cancelled" | "completed"
  booker_name: string
  booker_email: string
  booker_phone: string
  purpose: string | null
  number_of_attendees: number | null
}

interface EndUserCalendarAttachmentProps {
  reservations: Reservation[]
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

export function EndUserCalendarAttachment({ reservations }: EndUserCalendarAttachmentProps) {
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
      cells.push(<div key={`empty-${i}`} className="p-2 h-24"></div>)
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      const dayReservations = reservations.filter(
        (reservation) =>
          new Date(reservation.start_time).getDate() === date.getDate() &&
          new Date(reservation.start_time).getMonth() === date.getMonth() &&
          new Date(reservation.start_time).getFullYear() === date.getFullYear(),
      )
      const isToday =
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      cells.push(
        <div
          key={day}
          className={`p-2 border border-gray-200 h-24 overflow-y-auto ${isToday ? "bg-yellow-100 font-bold" : ""}`}
        >
          <span className={`${isToday ? "text-blue-600" : ""}`}>{day}</span>
          <div className="mt-1 space-y-1">
            {dayReservations.map((reservation, index) => (
              <div
                key={index}
                className={`text-xs p-1 rounded ${getStatusColor(reservation.status)} cursor-pointer`}
                onClick={() => setSelectedReservation(reservation)}
              >
                {reservation.facility?.name}
              </div>
            ))}
          </div>
        </div>,
      )
    }
    return cells
  }

  return (
    <>
      <Card className="mb-16 h-[600px] flex flex-col">
        <CardHeader>
          <CardTitle className="text-2xl">My Reservations</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow overflow-y-auto">
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
              <div className="grid grid-cols-7 gap-1 auto-rows-fr">
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
                      {selectedReservation.facility?.name}
                    </div>
                    <div className="flex items-start">
                      <MapPin className="mr-2 h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{selectedReservation.facility?.location}</span>
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

