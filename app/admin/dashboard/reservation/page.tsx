"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { showToast } from "@/components/ui/toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { format } from "date-fns"
import { Calendar, Clock, MapPin, Building, Users, FileText } from "lucide-react"

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
  facility: {
    name: string
    location: string
  } | null
}

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [statusFilter, setStatusFilter] = useState("all")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchReservations()
  }, [])

  async function fetchReservations() {
    try {
      const { data, error } = await supabase
        .from("reservations")
        .select(`
          *,
          facility:facilities(name, location)
        `)
        .order("created_at", { ascending: false })

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
      setError(null)
      showToast(`Successfully fetched ${typedReservations.length} reservations.`, "success")
    } catch (error) {
      console.error("Error fetching reservations:", error)
      setError(`Failed to fetch reservations: ${error instanceof Error ? error.message : "Unknown error"}`)
      setReservations([])
      showToast("There was an error loading the reservations. Please try again.", "error")
    }
  }

  const filteredReservations = reservations.filter(
    (reservation) => statusFilter === "all" || reservation.status === statusFilter,
  )

  const handleStatusChange = async (
    reservationId: number,
    newStatus: "approved" | "declined" | "completed" | "cancelled",
  ) => {
    try {
      const { error } = await supabase
        .from("reservations")
        .update({
          status: newStatus,
          admin_action_by: (await supabase.auth.getUser()).data.user?.id,
          admin_action_at: new Date().toISOString(),
        })
        .eq("id", reservationId)

      if (error) throw error

      setReservations(
        reservations.map((reservation) =>
          reservation.id === reservationId ? { ...reservation, status: newStatus } : reservation,
        ),
      )

      showToast(`Reservation has been ${newStatus}.`, "success")
    } catch (error) {
      console.error("Error updating reservation status:", error)
      showToast("There was an error updating the reservation status.", "error")
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Reservations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {filteredReservations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Facility</TableHead>
                  <TableHead>Booker</TableHead>
                  <TableHead>Start Date & Time</TableHead>
                  <TableHead>End Date & Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReservations.map((reservation) => (
                  <TableRow key={reservation.id}>
                    <TableCell>{reservation.facility?.name ?? "Unknown Facility"}</TableCell>
                    <TableCell>{reservation.booker_name}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center text-sm">
                          <Calendar className="mr-2 h-4 w-4 text-gray-500" />
                          {format(new Date(reservation.start_time), "MMMM d, yyyy")}
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <Clock className="mr-2 h-4 w-4" />
                          {format(new Date(reservation.start_time), "h:mm a")}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center text-sm">
                          <Calendar className="mr-2 h-4 w-4 text-gray-500" />
                          {format(new Date(reservation.end_time), "MMMM d, yyyy")}
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <Clock className="mr-2 h-4 w-4" />
                          {format(new Date(reservation.end_time), "h:mm a")}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`capitalize font-medium ${getStatusColor(reservation.status)}`}>
                        {reservation.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              View Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl w-[90vw]">
                            <DialogHeader>
                              <DialogTitle>Reservation Details</DialogTitle>
                            </DialogHeader>
                            <ScrollArea className="max-h-[80vh]">
                              <div className="space-y-6 p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="space-y-4">
                                    <div>
                                      <h3 className="font-semibold mb-2">Booker Information</h3>
                                      <div className="space-y-2">
                                        <p>
                                          <strong>Name:</strong> {reservation.booker_name}
                                        </p>
                                        <p>
                                          <strong>Email:</strong> {reservation.booker_email}
                                        </p>
                                        <p>
                                          <strong>Phone:</strong> {reservation.booker_phone}
                                        </p>
                                      </div>
                                    </div>
                                    <div>
                                      <h3 className="font-semibold mb-2 flex items-center">
                                        <Building className="mr-2 h-5 w-5" />
                                        Facility Information
                                      </h3>
                                      <div className="space-y-2">
                                        <p>
                                          <strong>Name:</strong> {reservation.facility?.name}
                                        </p>
                                        <p className="flex items-center">
                                          <MapPin className="mr-2 h-4 w-4 text-gray-500" />
                                          {reservation.facility?.location}
                                        </p>
                                      </div>
                                    </div>
                                    <div>
                                      <h3 className="font-semibold mb-2 flex items-center">
                                        <Calendar className="mr-2 h-5 w-5" />
                                        Reservation Details
                                      </h3>
                                      <div className="space-y-2">
                                        <p>
                                          <strong>Start:</strong>{" "}
                                          {format(new Date(reservation.start_time), "MMMM d, yyyy h:mm a")}
                                        </p>
                                        <p>
                                          <strong>End:</strong>{" "}
                                          {format(new Date(reservation.end_time), "MMMM d, yyyy h:mm a")}
                                        </p>
                                        <p>
                                          <strong>Purpose:</strong> {reservation.purpose || "N/A"}
                                        </p>
                                        <p className="flex items-center">
                                          <Users className="mr-2 h-4 w-4 text-gray-500" />
                                          <strong>Attendees:</strong> {reservation.number_of_attendees || "N/A"}
                                        </p>
                                        <p>
                                          <strong>Special Requests:</strong> {reservation.special_requests || "N/A"}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  {reservation.receipt_image_url && (
                                    <div>
                                      <h3 className="font-semibold mb-2 flex items-center">
                                        <FileText className="mr-2 h-5 w-5" />
                                        Receipt
                                      </h3>
                                      <div className="relative rounded-lg overflow-hidden border">
                                        <img
                                          src={reservation.receipt_image_url || "/placeholder.svg"}
                                          alt="Receipt"
                                          className="w-full h-auto object-contain"
                                        />
                                      </div>
                                    </div>
                                  )}
                                  {reservation.cancellation_reason && (
                                    <div>
                                      <h3 className="font-semibold mb-2">Cancellation Information</h3>
                                      <p className="text-gray-600">{reservation.cancellation_reason}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </ScrollArea>
                          </DialogContent>
                        </Dialog>
                        {reservation.status === "pending" && (
                          <>
                            <Button size="sm" onClick={() => handleStatusChange(reservation.id, "approved")}>
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleStatusChange(reservation.id, "declined")}
                            >
                              Decline
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleStatusChange(reservation.id, "cancelled")}
                            >
                              Cancel
                            </Button>
                          </>
                        )}
                        {reservation.status === "approved" && (
                          <Button size="sm" onClick={() => handleStatusChange(reservation.id, "completed")}>
                            Mark as Completed
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-4">No reservations found.</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function getStatusColor(status: string) {
  switch (status) {
    case "pending":
      return "text-yellow-600"
    case "approved":
      return "text-green-600"
    case "declined":
      return "text-red-600"
    case "cancelled":
      return "text-orange-600"
    case "completed":
      return "text-blue-600"
    default:
      return "text-gray-600"
  }
}

