"use client"

import { useState, useEffect, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { format } from "date-fns"
import { Calendar, MapPin, Building, Users, AlertCircle, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { showToast } from "@/components/ui/toast"

interface Facility {
  id: number
  name: string
  location: string
}

interface PaymentApproval {
  id: number
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
  created_at: string
  user_id: string
  facility: Facility
}

export default function PaymentCollectorApprovalsPage() {
  const [approvals, setApprovals] = useState<PaymentApproval[]>([])
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchApprovals()
  }, [])

  async function fetchApprovals() {
    try {
      const { data, error } = await supabase
        .from("payment_collector_approval")
        .select(`
          *,
          facility:facilities(id, name, location)
        `)
        .order("created_at", { ascending: false })

      if (error) throw error

      setApprovals(data as PaymentApproval[])
      setIsLoading(false)
    } catch (error) {
      console.error("Error fetching approvals:", error)
      setError("Failed to fetch approvals. Please try again.")
      setApprovals([])
      setIsLoading(false)
    }
  }

  const handleStatusChange = async (approvalId: number, newStatus: "approved" | "declined") => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError

      // Fetch the approval data first
      const { data: approvalData, error: approvalFetchError } = await supabase
        .from("payment_collector_approval")
        .select(`*, facility:facilities(name)`)
        .eq("id", approvalId)
        .single()

      if (approvalFetchError) throw approvalFetchError

      if (!approvalData) throw new Error("Approval data not found")

      const updateData = {
        status: newStatus,
        action_by: userData.user?.id,
        action_at: new Date().toISOString(),
      }

      // Update the payment_collector_approval table
      const { error: approvalUpdateError } = await supabase
        .from("payment_collector_approval")
        .update(updateData)
        .eq("id", approvalId)

      if (approvalUpdateError) throw approvalUpdateError

      // If approved, insert into reservations table with status "pending"
      if (newStatus === "approved") {
        const { error: reservationError } = await supabase.from("reservations").insert({
          user_id: approvalData.user_id,
          facility_id: approvalData.facility_id,
          booker_name: approvalData.booker_name,
          booker_email: approvalData.booker_email,
          booker_phone: approvalData.booker_phone,
          start_time: approvalData.start_time,
          end_time: approvalData.end_time,
          status: "pending", // Set to pending for admin review
          purpose: approvalData.purpose,
          number_of_attendees: approvalData.number_of_attendees,
          special_requests: approvalData.special_requests,
          created_by: userData.user.id,
          last_updated_by: userData.user.id,
        })

        if (reservationError) throw reservationError

        // Create notification for the admin
        const { data: adminData, error: adminError } = await supabase
          .from("users")
          .select("id")
          .eq("account_type", "admin")
          .limit(1)
          .single()

        if (adminError) throw adminError

        const adminNotificationData = {
          user_id: adminData.id,
          message: `Payment collector ${userData.user.email} has approved a booking for ${approvalData.facility.name} by ${approvalData.booker_name}. It requires your review.`,
          action_type: "payment_collector_approved",
          related_id: approvalId,
        }

        const { error: adminNotificationError } = await supabase.from("notifications").insert(adminNotificationData)

        if (adminNotificationError) throw adminNotificationError
      }

      // Add transaction history
      const transactionData = {
        user_id: approvalData.user_id,
        facility_id: approvalData.facility_id,
        action: `booking_${newStatus}`,
        action_by: userData.user.id,
        action_by_role: "payment_collector",
        target_user_id: approvalData.user_id,
        status: newStatus,
        details: JSON.stringify({
          approval_id: approvalId,
          facility_name: approvalData.facility.name,
          start_time: approvalData.start_time,
          end_time: approvalData.end_time,
        }),
      }

      const { error: transactionError } = await supabase.from("transactions").insert(transactionData)

      if (transactionError) throw transactionError

      // Create notification for the end-user
      const endUserNotificationData = {
        user_id: approvalData.user_id,
        message:
          newStatus === "approved"
            ? `Your booking for ${approvalData.facility.name} has been approved by the payment collector and is pending final admin approval.`
            : `Your booking for ${approvalData.facility.name} has been declined.`,
        action_type: `booking_${newStatus}`,
        related_id: approvalId,
      }

      const { error: endUserNotificationError } = await supabase.from("notifications").insert(endUserNotificationData)

      if (endUserNotificationError) throw endUserNotificationError

      // Create notification for the payment collector
      const paymentCollectorNotificationData = {
        user_id: userData.user.id,
        message: `You have ${newStatus} the booking for ${approvalData.facility.name} by ${approvalData.booker_name}.`,
        action_type: `booking_${newStatus}`,
        related_id: approvalId,
      }

      const { error: paymentCollectorNotificationError } = await supabase
        .from("notifications")
        .insert(paymentCollectorNotificationData)

      if (paymentCollectorNotificationError) throw paymentCollectorNotificationError

      setApprovals(
        approvals.map((approval) => (approval.id === approvalId ? { ...approval, ...updateData } : approval)),
      )

      showToast(`Booking has been ${newStatus}.`, "success")
    } catch (error) {
      console.error("Error updating approval status:", error)
      showToast("There was an error updating the approval status.", "error")
    }
  }

  const filteredApprovals = useMemo(() => {
    return approvals
      .filter((approval) => statusFilter === "all" || approval.status === statusFilter)
      .filter((approval) =>
        searchQuery
          ? approval.booker_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            approval.facility.name.toLowerCase().includes(searchQuery.toLowerCase())
          : true,
      )
  }, [approvals, statusFilter, searchQuery])

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
          <p className="text-gray-600 text-lg">Loading approvals...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 max-w-full">
      <h1 className="text-3xl font-bold">Payment Collector Approvals</h1>
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
          {filteredApprovals.length > 0 ? (
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
                      {filteredApprovals.map((approval) => (
                        <TableRow key={approval.id}>
                          <TableCell className="font-medium">{approval.booker_name}</TableCell>
                          <TableCell>{approval.facility.name}</TableCell>
                          <TableCell>{format(new Date(approval.start_time), "MMM d, yyyy h:mm a")}</TableCell>
                          <TableCell>{format(new Date(approval.end_time), "MMM d, yyyy h:mm a")}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getStatusColor(approval.status)}>
                              {approval.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  View Details
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl w-[90vw]">
                                <DialogHeader>
                                  <DialogTitle>Approval Details</DialogTitle>
                                </DialogHeader>
                                <ScrollArea className="max-h-[80vh]">
                                  <div className="space-y-6 p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                      <div className="space-y-4">
                                        <div>
                                          <h3 className="font-semibold mb-2">Booker Information</h3>
                                          <div className="space-y-2">
                                            <p>
                                              <strong>Name:</strong> {approval.booker_name}
                                            </p>
                                            <p>
                                              <strong>Email:</strong> {approval.booker_email}
                                            </p>
                                            <p>
                                              <strong>Phone:</strong> {approval.booker_phone}
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
                                              <strong>Name:</strong> {approval.facility.name}
                                            </p>
                                            <p className="flex items-center">
                                              <MapPin className="mr-2 h-4 w-4 text-gray-500" />
                                              {approval.facility.location}
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
                                              {format(new Date(approval.start_time), "MMMM d, yyyy h:mm a")}
                                            </p>
                                            <p>
                                              <strong>End:</strong>{" "}
                                              {format(new Date(approval.end_time), "MMMM d, yyyy h:mm a")}
                                            </p>
                                            <p>
                                              <strong>Purpose:</strong> {approval.purpose || "N/A"}
                                            </p>
                                            <p className="flex items-center">
                                              <Users className="mr-2 h-4 w-4 text-gray-500" />
                                              <strong>Attendees:</strong> {approval.number_of_attendees || "N/A"}
                                            </p>
                                            <p>
                                              <strong>Special Requests:</strong> {approval.special_requests || "N/A"}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    {approval.status === "pending" && (
                                      <div className="flex justify-end space-x-2 mt-4">
                                        <Button
                                          onClick={() => handleStatusChange(approval.id, "approved")}
                                          variant="default"
                                        >
                                          Approve
                                        </Button>
                                        <Button
                                          onClick={() => handleStatusChange(approval.id, "declined")}
                                          variant="destructive"
                                        >
                                          Decline
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
              <h3 className="mt-4 text-lg font-semibold text-gray-900">No approvals found</h3>
              <p className="mt-2 text-sm text-gray-500">
                {statusFilter === "all"
                  ? "There are no reservations requiring approval at this time."
                  : `There are no ${statusFilter} reservations.`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

