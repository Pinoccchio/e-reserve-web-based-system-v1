"use client"

import { useState, useEffect, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { showToast } from "@/components/ui/toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { format } from "date-fns"
import { Calendar, MapPin, Building, Users, AlertCircle, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface Facility {
  id: number
  name: string
  location: string
}

interface Reservation {
  id: string
  created_at: string
  start_time: string
  end_time: string
  purpose: string | null
  number_of_attendees: number | null
  special_requests: string | null
  status: "pending" | "approved" | "declined" | "cancelled" | "completed"
  booker_name: string
  booker_email: string
  booker_phone: string
  facility_id: number
  facility: Facility
  cancellation_reason: string | null
  is_read_admin: "yes" | "no"
  admin_action_by: string | null
  admin_action_at: string | null
}

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchReservations()
  }, [])

  async function fetchReservations() {
    try {
      const { data, error } = await supabase
        .from("reservations")
        .select(`
          *,
          facility:facilities(id, name, location)
        `)
        .order("created_at", { ascending: false })

      if (error) throw error

      setReservations(data as Reservation[])
      setIsLoading(false)
    } catch (error) {
      console.error("Error fetching reservations:", error)
      setError("Failed to fetch reservations. Please try again.")
      setReservations([])
      setIsLoading(false)
    }
  }

  const handleStatusChange = async (reservationId: string, newStatus: "approved" | "declined" | "cancelled") => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError

      // Fetch the reservation data first
      const { data: reservationData, error: reservationFetchError } = await supabase
        .from("reservations")
        .select(`*, facility:facilities(name)`)
        .eq("id", reservationId)
        .single()

      if (reservationFetchError) throw reservationFetchError

      if (!reservationData) throw new Error("Reservation data not found")

      const updateData: Partial<Reservation> = {
        status: newStatus,
        admin_action_by: userData.user?.id ?? null,
        admin_action_at: new Date().toISOString(),
        is_read_admin: "yes",
      }

      // Update the reservations table
      const { data: updatedReservation, error: reservationUpdateError } = await supabase
        .from("reservations")
        .update(updateData)
        .eq("id", reservationId)
        .select()
        .single()

      if (reservationUpdateError) throw reservationUpdateError

      if (!updatedReservation) throw new Error("Failed to update reservation")

      // Add transaction history
      const transactionData = {
        user_id: reservationData.user_id,
        facility_id: reservationData.facility_id,
        action: `reservation_${newStatus}`,
        action_by: userData.user.id,
        action_by_role: "admin",
        target_user_id: reservationData.user_id,
        status: newStatus,
        details: JSON.stringify({
          reservation_id: reservationId,
          facility_name: reservationData.facility.name,
          start_time: reservationData.start_time,
          end_time: reservationData.end_time,
        }),
      }

      const { error: transactionError } = await supabase.from("transactions").insert(transactionData)

      if (transactionError) throw transactionError

      // Create notification for the end-user (booker)
      const endUserNotificationData = {
        user_id: reservationData.user_id,
        message: `Your reservation for ${reservationData.facility.name} has been ${newStatus} by the admin.`,
        action_type: `reservation_${newStatus}`,
        related_id: reservationId,
        is_read: "no",
        is_read_admin: "no",
      }

      const { error: endUserNotificationError } = await supabase.from("notifications").insert(endUserNotificationData)

      if (endUserNotificationError) throw endUserNotificationError

      // Create notification for the admin
      const adminNotificationData = {
        user_id: userData.user.id,
        message: `You have ${newStatus} the reservation for ${reservationData.facility.name} by ${reservationData.booker_name}.`,
        action_type: `reservation_${newStatus}`,
        related_id: reservationId,
        is_read: "no",
        is_read_admin: "no",
      }

      const { error: adminNotificationError } = await supabase.from("notifications").insert(adminNotificationData)

      if (adminNotificationError) throw adminNotificationError

      // Create notification for payment collectors
      const { data: paymentCollectors, error: paymentCollectorError } = await supabase
        .from("users")
        .select("id")
        .eq("account_type", "payment_collector")

      if (paymentCollectorError) throw paymentCollectorError

      const paymentCollectorNotifications = paymentCollectors.map((collector) => ({
        user_id: collector.id,
        message: `Reservation for ${reservationData.facility.name} has been ${newStatus} by the admin.`,
        action_type: `reservation_${newStatus}`,
        related_id: reservationId,
        is_read: "no",
        is_read_admin: "no",
      }))

      const { error: paymentCollectorNotificationError } = await supabase
        .from("notifications")
        .insert(paymentCollectorNotifications)

      if (paymentCollectorNotificationError) throw paymentCollectorNotificationError

      setReservations(
        reservations.map((reservation) =>
          reservation.id === reservationId ? { ...reservation, ...updateData } : reservation,
        ),
      )

      showToast(`Reservation has been ${newStatus}.`, "success")
    } catch (error) {
      console.error("Error updating reservation status:", error)
      showToast(
        `Error updating reservation status: ${error instanceof Error ? error.message : "Unknown error"}`,
        "error",
      )
    }
  }

  const markAsRead = async (reservationId: string) => {
    try {
      const { error } = await supabase.from("reservations").update({ is_read_admin: "yes" }).eq("id", reservationId)

      if (error) throw error

      setReservations(
        reservations.map((reservation) =>
          reservation.id === reservationId ? { ...reservation, is_read_admin: "yes" } : reservation,
        ),
      )
    } catch (error) {
      console.error("Error marking reservation as read:", error)
      showToast("Failed to mark reservation as read", "error")
    }
  }

  const filteredReservations = useMemo(() => {
    return reservations
      .filter((reservation) => statusFilter === "all" || reservation.status === statusFilter)
      .filter((reservation) =>
        searchQuery
          ? reservation.booker_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            reservation.facility.name.toLowerCase().includes(searchQuery.toLowerCase())
          : true,
      )
  }, [reservations, statusFilter, searchQuery])

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
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading reservations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 max-w-full">
      <h1 className="text-3xl font-bold">Admin Reservations</h1>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="w-full sm:w-auto">
              <Select onValueChange={(value) => setStatusFilter(value)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-auto relative flex-grow sm:max-w-md">
              <Input
                type="text"
                placeholder="Search by name or facility"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>
          {filteredReservations.length > 0 ? (
            <div className="overflow-x-auto -mx-6">
              <div className="inline-block min-w-full align-middle">
                <div className="overflow-hidden border border-gray-200 sm:rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">Booker Name</TableHead>
                        <TableHead className="w-[200px]">Facility</TableHead>
                        <TableHead className="w-[200px]">Start Time</TableHead>
                        <TableHead className="w-[200px]">End Time</TableHead>
                        <TableHead className="w-[120px]">Status</TableHead>
                        <TableHead className="text-right w-[120px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReservations.map((reservation) => (
                        <TableRow
                          key={reservation.id}
                          className={reservation.is_read_admin === "no" ? "bg-blue-50" : ""}
                        >
                          <TableCell className="font-medium">{reservation.booker_name}</TableCell>
                          <TableCell>{reservation.facility.name}</TableCell>
                          <TableCell>{format(new Date(reservation.start_time), "MMM d, yyyy h:mm a")}</TableCell>
                          <TableCell>{format(new Date(reservation.end_time), "MMM d, yyyy h:mm a")}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getStatusColor(reservation.status)}>
                              {reservation.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    if (reservation.is_read_admin === "no") {
                                      markAsRead(reservation.id)
                                    }
                                  }}
                                >
                                  View Details
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl w-[90vw]">
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
                                              <strong>Name:</strong> {reservation.facility.name}
                                            </p>
                                            <p className="flex items-center">
                                              <MapPin className="mr-2 h-4 w-4 text-gray-500" />
                                              {reservation.facility.location}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="space-y-4">
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
                                        {reservation.cancellation_reason && (
                                          <div>
                                            <h3 className="font-semibold mb-2">Cancellation Information</h3>
                                            <p className="text-gray-600">{reservation.cancellation_reason}</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    {reservation.status === "pending" && (
                                      <div className="flex justify-end space-x-2 mt-4">
                                        <Button
                                          onClick={() => handleStatusChange(reservation.id, "approved")}
                                          variant="default"
                                        >
                                          Approve
                                        </Button>
                                        <Button
                                          onClick={() => handleStatusChange(reservation.id, "declined")}
                                          variant="destructive"
                                        >
                                          Decline
                                        </Button>
                                      </div>
                                    )}
                                    {reservation.status === "approved" && (
                                      <div className="flex justify-end space-x-2 mt-4">
                                        <Button
                                          onClick={() => handleStatusChange(reservation.id, "cancelled")}
                                          variant="destructive"
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </ScrollArea>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">No reservations found</h3>
              <p className="mt-2 text-sm text-gray-500">
                {statusFilter === "all"
                  ? "There are no reservations at this time."
                  : `There are no ${statusFilter} reservations.`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

