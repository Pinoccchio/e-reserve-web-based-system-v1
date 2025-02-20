"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { format, parseISO } from "date-fns"
import { CalendarIcon, MapPin, AlertCircle, Building, Users } from "lucide-react"
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
import { EndUserCalendarAttachment } from "@/components/EndUserCalendarAttachment"

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
  purpose: string | null
  number_of_attendees: number | null
  special_requests: string | null
  created_by: string
  last_updated_by: string
  action_by: string | null
  action_at: string | null
  cancellation_reason: string | null
  facility: Facility | null
  source: "payment_approval" | "admin"
}

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [statusFilter, setStatusFilter] = useState("all")
  const [isLoading, setIsLoading] = useState(true)
  const [userName, setUserName] = useState("")
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [isConfirmCancelOpen, setIsConfirmCancelOpen] = useState(false)
  const [reservationToCancel, setReservationToCancel] = useState<Reservation | null>(null)

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

      const [reservationsData, paymentApprovalData] = await Promise.all([
        supabase
          .from("reservations")
          .select(`
            *,
            facility:facilities(name, location)
          `)
          .eq("user_id", user.id)
          .order("start_time", { ascending: true }),
        supabase
          .from("payment_collector_approval")
          .select(`
            *,
            facility:facilities(name, location)
          `)
          .eq("user_id", user.id)
          .order("start_time", { ascending: true }),
      ])

      if (reservationsData.error) throw reservationsData.error
      if (paymentApprovalData.error) throw paymentApprovalData.error

      const typedReservations: Reservation[] = [
        ...(reservationsData.data || []).map((reservation) => ({
          ...reservation,
          facility: reservation.facility
            ? {
                name: reservation.facility.name,
                location: reservation.facility.location,
              }
            : null,
          source: "admin" as const,
        })),
        ...(paymentApprovalData.data || []).map((reservation) => ({
          ...reservation,
          facility: reservation.facility
            ? {
                name: reservation.facility.name,
                location: reservation.facility.location,
              }
            : null,
          source: "payment_approval" as const,
        })),
      ]

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

  const canCancelReservation = (reservation: Reservation) => {
    const startTime = new Date(reservation.start_time)
    const now = new Date()

    // Calculate the difference in hours
    const hoursDifference = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60)

    // Allow cancellation only if:
    // 1. The reservation hasn't started yet
    // 2. There's at least 24 hours before the start time
    return hoursDifference > 24 && now < startTime
  }

  const handleCancelReservation = async (id: number, source: "payment_approval" | "admin") => {
    try {
      const table = source === "payment_approval" ? "payment_collector_approval" : "reservations"
      const { error } = await supabase
        .from(table)
        .update({
          status: "cancelled",
          cancellation_reason: `Cancelled by ${userName}`,
        })
        .eq("id", id)

      if (error) throw error

      showToast("Reservation cancelled successfully", "success")
      setIsConfirmCancelOpen(false)
      setReservationToCancel(null)
      setSelectedReservation(null)
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
              <EndUserCalendarAttachment reservations={filteredReservations} />
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
                          <p className="text-xs text-gray-400 mt-1">
                            Source: {reservation.source === "payment_approval" ? "Payment Approval" : "Admin"}
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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Reservation Details</DialogTitle>
          </DialogHeader>
          {selectedReservation && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-semibold flex items-center mb-3">
                    <Building className="mr-2 h-5 w-5" />
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
                      <span className="font-medium">Source: </span>
                      {selectedReservation.source === "payment_approval" ? "Payment Approval" : "Admin"}
                    </div>
                  </div>
                </div>

                {selectedReservation.special_requests && (
                  <div>
                    <h3 className="text-base font-semibold mb-2">Special Requests</h3>
                    <p className="text-gray-600 pl-7">{selectedReservation.special_requests}</p>
                  </div>
                )}
              </div>

              {selectedReservation.status === "pending" && (
                <div className="pt-4">
                  {canCancelReservation(selectedReservation) ? (
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => {
                        setReservationToCancel(selectedReservation)
                        setIsConfirmCancelOpen(true)
                      }}
                    >
                      Cancel Reservation
                    </Button>
                  ) : (
                    <p className="text-center text-sm text-red-600">
                      This reservation cannot be cancelled as it is within 24 hours of the start time.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={isConfirmCancelOpen} onOpenChange={setIsConfirmCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Reservation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this reservation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {reservationToCancel && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <div className="font-medium">{reservationToCancel.facility?.name}</div>
              <div className="text-sm text-muted-foreground">
                {format(parseISO(reservationToCancel.start_time), "MMMM d, yyyy h:mm a")} -{" "}
                {format(parseISO(reservationToCancel.end_time), "h:mm a")}
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setIsConfirmCancelOpen(false)
                setReservationToCancel(null)
              }}
            >
              No, keep reservation
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                reservationToCancel && handleCancelReservation(reservationToCancel.id, reservationToCancel.source)
              }
            >
              Yes, cancel reservation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

