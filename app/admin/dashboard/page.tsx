"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { format, parseISO, isSameDay } from "date-fns"
import { CalendarIcon, MapPin, Building, Users, ChevronLeft, ChevronRight } from "lucide-react"
import { showToast } from "@/components/ui/toast"
import { AnalyticsDashboard } from "@/components/AnalyticsDashboard"

interface Reservation {
  id: string
  start_time: string
  end_time: string
  status: "pending" | "approved" | "rejected" | "cancelled"
  facility: {
    name: string
    location: string
  }
  booker_name: string
  booker_email: string
  booker_phone: string
  purpose: string
  number_of_attendees: number
  special_requests: string | null
}

const ITEMS_PER_PAGE = 10
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

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
}

export default function AdminDashboard() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const router = useRouter()

  // Check authentication on page load
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        window.location.replace("/")
      }
    }

    checkAuth()
  }, [])

  const fetchReservations = useCallback(async () => {
    setIsLoading(true)
    try {
      let query = supabase
        .from("reservations")
        .select(
          `
          *,
          facility:facilities(name, location)
        `,
          { count: "exact" },
        )
        .order("start_time", { ascending: false })

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter)
      }

      const { data, count, error } = await query

      if (error) throw error

      setReservations(data as Reservation[])
      setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE))
    } catch (error) {
      console.error("Error fetching reservations:", error)
      showToast("Failed to fetch reservations. Please try again.", "error")
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchReservations()
  }, [fetchReservations])

  const renderCalendar = () => {
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()

    const cells = []

    for (let i = 0; i < firstDayOfMonth; i++) {
      cells.push(<div key={`empty-${i}`} className="p-2 h-24"></div>)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      const dateReservations = reservations.filter((reservation) => {
        const reservationDate = parseISO(reservation.start_time)
        return isSameDay(reservationDate, date)
      })

      cells.push(
        <div key={day} className="p-2 border border-gray-200 h-24 overflow-y-auto">
          <div className="font-semibold mb-1">{day}</div>
          <div className="space-y-1">
            {dateReservations.map((reservation, index) => (
              <Badge
                key={index}
                variant="secondary"
                className={`w-full justify-start text-xs ${STATUS_COLORS[reservation.status]} cursor-pointer`}
                onClick={() => setSelectedReservation(reservation)}
              >
                {reservation.facility.name}
              </Badge>
            ))}
          </div>
        </div>,
      )
    }

    return cells
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>

      {/* Analytics Dashboard */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Analytics Overview</h2>
        <AnalyticsDashboard />
      </div>

      {/* Calendar View */}
      <Card className="mb-16 h-[600px] flex flex-col">
        <CardHeader>
          <CardTitle>Reservation Calendar</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow overflow-y-auto">
          <div className="w-full">
            <div className="bg-white p-4 rounded-lg shadow-md mb-6">
              <div className="flex justify-between items-center mb-4">
                <Button
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                  variant="outline"
                  size="icon"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-xl font-bold">
                  {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
                <Button
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
                  variant="outline"
                  size="icon"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-7 gap-1 auto-rows-fr">
                {DAYS.map((day) => (
                  <div key={day} className="font-semibold text-center p-2">
                    {day}
                  </div>
                ))}
                {renderCalendar()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reservations Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Reservations Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isLoading ? (
            <div className="text-center py-4">Loading reservations...</div>
          ) : (
            <>
              <div className="space-y-4">
                {reservations
                  .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                  .map((reservation) => (
                    <div
                      key={reservation.id}
                      className="border p-4 rounded-lg hover:bg-gray-50 transition cursor-pointer"
                      onClick={() => setSelectedReservation(reservation)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{reservation.facility.name}</h3>
                          <p className="text-sm text-gray-600">{reservation.booker_name}</p>
                        </div>
                        <Badge className={STATUS_COLORS[reservation.status]}>{reservation.status}</Badge>
                      </div>
                      <div className="mt-2 text-sm text-gray-600">
                        <p>
                          {format(parseISO(reservation.start_time), "PPP p")} -{" "}
                          {format(parseISO(reservation.end_time), "p")}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
              <div className="mt-4 flex justify-between items-center">
                <Button onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1}>
                  <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                </Button>
                <span>
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedReservation} onOpenChange={() => setSelectedReservation(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reservation Details</DialogTitle>
          </DialogHeader>
          {selectedReservation && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">{selectedReservation.facility.name}</h3>
                <p className="text-sm text-gray-600 flex items-center">
                  <MapPin className="mr-1 h-4 w-4" /> {selectedReservation.facility.location}
                </p>
              </div>
              <div className="space-y-2">
                <p className="flex items-center">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(parseISO(selectedReservation.start_time), "PPP p")} -{" "}
                  {format(parseISO(selectedReservation.end_time), "p")}
                </p>
                <p className="flex items-center">
                  <Users className="mr-2 h-4 w-4" />
                  {selectedReservation.number_of_attendees} attendees
                </p>
                <p className="flex items-center">
                  <Building className="mr-2 h-4 w-4" />
                  Purpose: {selectedReservation.purpose}
                </p>
              </div>
              <div>
                <h4 className="font-semibold">Booker Information</h4>
                <p>{selectedReservation.booker_name}</p>
                <p>{selectedReservation.booker_email}</p>
                <p>{selectedReservation.booker_phone}</p>
              </div>
              {selectedReservation.special_requests && (
                <div>
                  <h4 className="font-semibold">Special Requests</h4>
                  <p>{selectedReservation.special_requests}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
