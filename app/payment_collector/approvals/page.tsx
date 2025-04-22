"use client"

import { useState, useEffect, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { format, differenceInHours } from "date-fns"
import { Calendar, Building, Users, AlertCircle, DollarSign, Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { showToast } from "@/components/ui/toast"

interface Facility {
  id: number
  name: string
  location: string
  price_per_hour: number
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
  total_price: number
  is_read_payment_collector?: "yes" | "no" | null
}

export default function PaymentCollectorApprovalsPage() {
  const [approvals, setApprovals] = useState<PaymentApproval[]>([])
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [readFilter, setReadFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchApprovals()
  }, [])

  async function fetchApprovals() {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from("payment_collector_approval")
        .select(`
          *,
          facility:facilities(id, name, location, price_per_hour)
        `)
        .order("created_at", { ascending: false })

      if (error) throw error

      const approvalsWithTotalPrice = data.map((approval: any) => ({
        ...approval,
        total_price: approval.total_price || calculateTotalPrice(approval),
      }))

      setApprovals(approvalsWithTotalPrice)
      setIsLoading(false)
    } catch (error) {
      console.error("Error fetching approvals:", error)
      setError("Failed to fetch approvals. Please try again.")
      setApprovals([])
      setIsLoading(false)
    }
  }

  function calculateTotalPrice(approval: PaymentApproval): number {
    const hours = differenceInHours(new Date(approval.end_time), new Date(approval.start_time))
    return hours * approval.facility.price_per_hour
  }

  const handleStatusChange = async (approvalId: number, newStatus: "approved" | "declined") => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError

      const approval = approvals.find((a) => a.id === approvalId)
      if (!approval) throw new Error("Approval not found")

      const totalPrice = approval.total_price || calculateTotalPrice(approval)

      const updateData = {
        status: newStatus,
        action_by: userData.user?.id,
        action_at: new Date().toISOString(),
        total_price: totalPrice,
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
          user_id: approval.user_id,
          facility_id: approval.facility_id,
          booker_name: approval.booker_name,
          booker_email: approval.booker_email,
          booker_phone: approval.booker_phone,
          start_time: approval.start_time,
          end_time: approval.end_time,
          status: "pending", // Set to pending for admin review
          purpose: approval.purpose,
          number_of_attendees: approval.number_of_attendees,
          special_requests: approval.special_requests,
          created_by: userData.user.id,
          last_updated_by: userData.user.id,
          total_price: totalPrice,
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
          message: `Payment collector ${userData.user.email} has approved a booking for ${approval.facility.name} by ${approval.booker_name}. It requires your review.`,
          action_type: "payment_collector_approved",
          related_id: approvalId,
        }

        const { error: adminNotificationError } = await supabase.from("notifications").insert(adminNotificationData)

        if (adminNotificationError) throw adminNotificationError
      }

      // Add transaction history
      const transactionData = {
        user_id: approval.user_id,
        facility_id: approval.facility_id,
        action: `booking_${newStatus}`,
        action_by: userData.user.id,
        action_by_role: "payment_collector",
        target_user_id: approval.user_id,
        status: newStatus,
        details: JSON.stringify({
          approval_id: approvalId,
          facility_name: approval.facility.name,
          start_time: approval.start_time,
          end_time: approval.end_time,
          total_price: totalPrice,
        }),
      }

      const { error: transactionError } = await supabase.from("transactions").insert(transactionData)

      if (transactionError) throw transactionError

      // Create notification for the end-user
      const endUserNotificationData = {
        user_id: approval.user_id,
        message:
          newStatus === "approved"
            ? `Your booking for ${approval.facility.name} has been approved by the payment collector and is pending final admin approval. Total price: ₱${totalPrice.toFixed(2)}`
            : `Your booking for ${approval.facility.name} has been declined.`,
        action_type: `booking_${newStatus}`,
        related_id: approvalId,
      }

      const { error: endUserNotificationError } = await supabase.from("notifications").insert(endUserNotificationData)

      if (endUserNotificationError) throw endUserNotificationError

      // Create notification for the payment collector
      const paymentCollectorNotificationData = {
        user_id: userData.user.id,
        message: `You have ${newStatus} the booking for ${approval.facility.name} by ${approval.booker_name}. Total price: ₱${totalPrice.toFixed(2)}`,
        action_type: `booking_${newStatus}`,
        related_id: approvalId,
      }

      const { error: paymentCollectorNotificationError } = await supabase
        .from("notifications")
        .insert(paymentCollectorNotificationData)

      if (paymentCollectorNotificationError) throw paymentCollectorNotificationError

      setApprovals(approvals.map((a) => (a.id === approvalId ? { ...a, ...updateData } : a)))

      showToast(`Booking has been ${newStatus}. Total price: ₱${totalPrice.toFixed(2)}`, "success")
    } catch (error) {
      console.error("Error updating approval status:", error)
      showToast("There was an error updating the approval status.", "error")
    }
  }

  const isApprovalNew = (approval: PaymentApproval) => {
    return approval.is_read_payment_collector === "no" || approval.is_read_payment_collector === null
  }

  const unreadCount = useMemo(() => {
    return approvals.filter((a) => isApprovalNew(a)).length
  }, [approvals])

  const markAsRead = async (approvalId: number) => {
    try {
      const { error } = await supabase
        .from("payment_collector_approval")
        .update({ is_read_payment_collector: "yes" })
        .eq("id", approvalId)

      if (error) throw error

      setApprovals(
        approvals.map((approval) =>
          approval.id === approvalId ? { ...approval, is_read_payment_collector: "yes" } : approval,
        ),
      )
    } catch (error) {
      console.error("Error marking approval as read:", error)
      showToast("Failed to mark approval as read", "error")
    }
  }

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from("payment_collector_approval")
        .update({ is_read_payment_collector: "yes" })
        .or("is_read_payment_collector.eq.no,is_read_payment_collector.is.null")

      if (error) throw error

      setApprovals(
        approvals.map((approval) => ({
          ...approval,
          is_read_payment_collector: "yes",
        })),
      )

      showToast("All approvals marked as read", "success")
    } catch (error) {
      console.error("Error marking all approvals as read:", error)
      showToast("Failed to mark all approvals as read", "error")
    }
  }

  const filteredApprovals = useMemo(() => {
    return approvals.filter((approval) => {
      const statusMatch = statusFilter === "all" || approval.status === statusFilter
      const readMatch =
        readFilter === "all" ||
        (readFilter === "unread" && isApprovalNew(approval)) ||
        (readFilter === "read" && approval.is_read_payment_collector === "yes")
      const searchMatch =
        searchQuery === "" ||
        approval.booker_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        approval.booker_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        approval.facility.name.toLowerCase().includes(searchQuery.toLowerCase())
      return statusMatch && searchMatch && readMatch
    })
  }, [approvals, statusFilter, readFilter, searchQuery])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      case "approved":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "declined":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      case "cancelled":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
      case "completed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    }
  }

  return (
    <div className="space-y-6 p-6 max-w-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Payment Collector Approvals</h1>
        {unreadCount > 0 && (
          <Button onClick={markAllAsRead} variant="outline" size="sm" className="flex items-center">
            <Check className="h-4 w-4 mr-2" />
            Mark All as Read ({unreadCount})
          </Button>
        )}
      </div>
      <div className="flex items-center space-x-4">
        <Input
          type="text"
          placeholder="Search by name, email, or facility..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by Status" />
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
        <Select value={readFilter} onValueChange={setReadFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by Read Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="unread">Unread</SelectItem>
            <SelectItem value="read">Read</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {isLoading ? (
        <p>Loading approvals...</p>
      ) : error ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mr-2 inline-block" />
          {error}
        </div>
      ) : approvals.length === 0 ? (
        <p>No approvals found.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Booker Name</TableHead>
              <TableHead className="w-[200px]">Facility</TableHead>
              <TableHead className="w-[200px]">Start Time</TableHead>
              <TableHead className="w-[200px]">End Time</TableHead>
              <TableHead className="w-[120px]">Total Price</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead className="text-right w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredApprovals.map((approval) => (
              <TableRow
                key={approval.id}
                className={isApprovalNew(approval) ? "bg-blue-50 shadow-md" : ""}
                onClick={() => isApprovalNew(approval) && markAsRead(approval.id)}
              >
                <TableCell className="font-medium">
                  {approval.booker_name}
                  {isApprovalNew(approval) && (
                    <Badge variant="default" className="ml-2">
                      New
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{approval.facility.name}</TableCell>
                <TableCell>{format(new Date(approval.start_time), "MMM d, yyyy h:mm a")}</TableCell>
                <TableCell>{format(new Date(approval.end_time), "MMM d, yyyy h:mm a")}</TableCell>
                <TableCell>₱{approval.total_price.toFixed(2)}</TableCell>
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
                          <div className="space-y-2">
                            <h3 className="font-semibold mb-2 flex items-center">
                              <Users className="mr-2 h-5 w-5" />
                              Booker Information
                            </h3>
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
                          <div className="space-y-2">
                            <h3 className="font-semibold mb-2 flex items-center">
                              <Building className="mr-2 h-5 w-5" />
                              Facility Information
                            </h3>
                            <p>
                              <strong>Facility:</strong> {approval.facility.name}
                            </p>
                            <p>
                              <strong>Location:</strong> {approval.facility.location}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <h3 className="font-semibold mb-2 flex items-center">
                              <Calendar className="mr-2 h-5 w-5" />
                              Booking Information
                            </h3>
                            <p>
                              <strong>Start Time:</strong> {format(new Date(approval.start_time), "MMM d, yyyy h:mm a")}
                            </p>
                            <p>
                              <strong>End Time:</strong> {format(new Date(approval.end_time), "MMM d, yyyy h:mm a")}
                            </p>
                            <p>
                              <strong>Purpose:</strong> {approval.purpose || "N/A"}
                            </p>
                            <p>
                              <strong>Number of Attendees:</strong> {approval.number_of_attendees || "N/A"}
                            </p>
                            <p>
                              <strong>Special Requests:</strong> {approval.special_requests || "N/A"}
                            </p>
                          </div>
                          <div>
                            <h3 className="font-semibold mb-2 flex items-center">
                              <DollarSign className="mr-2 h-5 w-5" />
                              Pricing Information
                            </h3>
                            <div className="space-y-2">
                              <p>
                                <strong>Price per Hour:</strong> ₱{approval.facility.price_per_hour.toFixed(2)}
                              </p>
                              <p>
                                <strong>Total Price:</strong> ₱{approval.total_price.toFixed(2)}
                              </p>
                            </div>
                          </div>
                          {approval.status === "pending" && (
                            <div className="flex justify-end space-x-2 mt-4">
                              <Button onClick={() => handleStatusChange(approval.id, "approved")} variant="default">
                                Approve
                              </Button>
                              <Button onClick={() => handleStatusChange(approval.id, "declined")} variant="destructive">
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
      )}
    </div>
  )
}
