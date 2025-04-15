"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { format, addDays, isSameDay, parseISO, setHours, isAfter, isBefore, differenceInHours } from "date-fns"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase"
import { showToast } from "@/components/ui/toast"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Printer } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { jsPDF } from "jspdf"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Facility {
  id: number
  name: string
  description: string
  capacity: number
  type: string
  price_per_hour: number
  payment_collector_id: string
}

interface Reservation {
  id: number
  start_time: string
  end_time: string
  status: "pending" | "approved" | "declined" | "cancelled" | "completed"
  facility: {
    name: string
  }
  is_read: "yes" | "no"
  source: "admin" | "payment_collector"
}

interface PageProps {
  params: Promise<{
    id: string
  }>
}

interface ReceiptData {
  id: number
  booking_id: number | null
  facility_name: string
  booker_name: string
  booker_email: string
  booker_phone: string
  start_time: string
  end_time: string
  purpose: string
  number_of_attendees: number | null
  special_requests: string | null
  status: string
  price_per_hour: number
}

interface VenueStats {
  purpose: string
  booking_count: number
  total_attendees: number
}

// Venues that require payment collector approval
const SPECIAL_VENUES = ["SK Building", "Cultural Center", "Sports Complex"]

// Free venues that require admin approval
const FREE_VENUES = ["Skating Rink", "MO Conference Room", "Municipal Lobby", "Plaza Rizal", "Municipal Quadrangle"]

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
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  declined: "bg-red-100 text-red-800 border-red-200",
  cancelled: "bg-gray-100 text-gray-800 border-gray-200",
  completed: "bg-blue-100 text-blue-800 border-blue-200",
}

const RESERVATION_PURPOSES = [
  "Birthday",
  "Wedding",
  "Oath taking",
  "Seminar",
  "Training",
  "Pageant",
  "Conference",
  "Meeting",
]

export default function BookingPage({ params }: PageProps) {
  const { id: facilityId } = React.use(params)
  const [facility, setFacility] = useState<Facility | null>(null)
  const [allReservations, setAllReservations] = useState<Reservation[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [bookerName, setBookerName] = useState("")
  const [bookerEmail, setBookerEmail] = useState("")
  const [bookerPhone, setBookerPhone] = useState("")
  const [purpose, setPurpose] = useState("")
  const [numberOfAttendees, setNumberOfAttendees] = useState("")
  const [specialRequests, setSpecialRequests] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null)
  const [venueStats, setVenueStats] = useState<VenueStats[]>([])
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const getReservationsForDate = (date: Date) => {
    return allReservations.filter((reservation) => {
      const reservationDate = parseISO(reservation.start_time)
      return isSameDay(reservationDate, date)
    })
  }

  const handleDateSelect = (date: Date) => {
    const dateReservations = getReservationsForDate(date)
    const hasConflict = dateReservations.some(
      (res) => res.facility.name === facility?.name && res.status !== "cancelled",
    )

    if (hasConflict) {
      const nextAvailableDates = findNextAvailableDates(date, 3)
      const formattedDates = nextAvailableDates.map((date) => format(date, "MMMM d, yyyy")).join(", ")

      showToast(`This date is not available. Next available dates: ${formattedDates}`, "info")
      return
    }

    setSelectedDate(date)
    setShowBookingForm(true)
    // Clear any previous form errors
    setFormErrors({})
  }

  const findNextAvailableDates = (startDate: Date, count: number): Date[] => {
    const availableDates: Date[] = []
    let currentDate = addDays(startDate, 1)

    while (availableDates.length < count) {
      const dateReservations = getReservationsForDate(currentDate)
      const hasConflict = dateReservations.some(
        (res) => res.facility?.name === facility?.name && res.status !== "cancelled",
      )

      if (!hasConflict) {
        availableDates.push(new Date(currentDate))
      }
      currentDate = addDays(currentDate, 1)
    }

    return availableDates
  }

  const renderCalendar = () => {
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()

    const cells = []

    for (let i = 0; i < firstDayOfMonth; i++) {
      cells.push(<div key={`empty-${i}`} className="p-2 min-h-[100px]"></div>)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      const dateReservations = getReservationsForDate(date)
      const isSelected = selectedDate && isSameDay(date, selectedDate)
      const hasConflict = dateReservations.some(
        (res) => res.facility.name === facility?.name && res.status !== "cancelled",
      )
      const isPastDate = date < new Date(new Date().setHours(0, 0, 0, 0))

      cells.push(
        <div
          key={day}
          className={`p-2 border border-gray-200 min-h-[100px] ${
            isSelected ? "bg-gray-800 text-white" : hasConflict ? "bg-red-50" : isPastDate ? "bg-gray-100" : ""
          } ${hasConflict || isPastDate ? "cursor-not-allowed opacity-75" : "cursor-pointer hover:bg-gray-100"}`}
          onClick={() => {
            if (!hasConflict && !isPastDate) {
              handleDateSelect(date)
            } else if (isPastDate) {
              showToast("Cannot book past dates", "error")
            }
          }}
        >
          <div className={`font-semibold mb-1 ${isSelected ? "text-white" : ""}`}>
            {day}
            {isPastDate && <span className="ml-1 text-xs text-gray-500">(Past)</span>}
          </div>
          <div className="space-y-1">
            {dateReservations.map((reservation, index) => (
              <Badge
                key={index}
                variant="secondary"
                className={`w-full justify-start text-xs ${
                  isSelected ? "bg-gray-700 text-white" : STATUS_COLORS[reservation.status]
                }`}
              >
                {reservation.facility.name}
                <span className="ml-1 text-[10px]">
                  ({reservation.source === "admin" ? "Admin" : "Payment Collector"})
                </span>
              </Badge>
            ))}
            {hasConflict && (
              <Badge
                variant="secondary"
                className={`w-full justify-start text-xs ${
                  isSelected ? "bg-gray-700 text-white" : "bg-red-100 text-red-800 border-red-200"
                }`}
              >
                Not Available
              </Badge>
            )}
          </div>
        </div>,
      )
    }

    return cells
  }

  // Validate all form fields
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    // Validate required fields
    if (!selectedDate) errors.date = "Please select a date"
    if (!startTime) errors.startTime = "Start time is required"
    if (!endTime) errors.endTime = "End time is required"
    if (!bookerName.trim()) errors.bookerName = "Name is required"
    if (!purpose) errors.purpose = "Event type is required"

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!bookerEmail.trim()) {
      errors.bookerEmail = "Email is required"
    } else if (!emailRegex.test(bookerEmail)) {
      errors.bookerEmail = "Please enter a valid email address"
    }

    // Validate phone number (numbers only)
    const phoneRegex = /^\d+$/
    if (!bookerPhone.trim()) {
      errors.bookerPhone = "Phone number is required"
    } else if (!phoneRegex.test(bookerPhone)) {
      errors.bookerPhone = "Phone number must contain only digits"
    } else if (bookerPhone.length < 10) {
      errors.bookerPhone = "Phone number must be at least 10 digits"
    }

    // Validate number of attendees
    if (numberOfAttendees) {
      const attendeesNum = Number.parseInt(numberOfAttendees)
      if (isNaN(attendeesNum)) {
        errors.numberOfAttendees = "Number of attendees must be a valid number"
      } else if (attendeesNum < 0) {
        errors.numberOfAttendees = "Number of attendees cannot be negative"
      } else if (facility && attendeesNum > facility.capacity) {
        errors.numberOfAttendees = `Number of attendees cannot exceed facility capacity (${facility.capacity})`
      }
    }

    // Validate time logic
    if (startTime && endTime) {
      if (!selectedDate) return false

      const startDateTime = new Date(selectedDate)
      startDateTime.setHours(Number(startTime.split(":")[0]), Number(startTime.split(":")[1]))

      const endDateTime = new Date(selectedDate)
      endDateTime.setHours(Number(endTime.split(":")[0]), Number(endTime.split(":")[1]))

      // Check if end time is after start time
      if (!isAfter(endDateTime, startDateTime)) {
        errors.endTime = "End time must be after start time"
      }

      // Check if booking is within allowed hours (e.g., 7 AM to 10 PM)
      const openingTime = setHours(selectedDate, 7)
      const closingTime = setHours(selectedDate, 22)

      if (isBefore(startDateTime, openingTime)) {
        errors.startTime = "Bookings are only allowed from 7 AM"
      }

      if (isAfter(endDateTime, closingTime)) {
        errors.endTime = "Bookings are only allowed until 10 PM"
      }

      // Check if booking duration is at least 1 hour
      const durationInMinutes = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60)
      if (durationInMinutes < 60) {
        errors.endTime = "Booking duration must be at least 1 hour"
      }
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate all form fields
    if (!validateForm()) {
      // Show a general error message
      showToast("Please correct the errors in the form", "error")
      return
    }

    setIsLoading(true)

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError) throw new Error("Failed to authenticate user")
      if (!userData.user) throw new Error("No authenticated user found")

      const startDateTime = new Date(selectedDate!)
      startDateTime.setHours(Number(startTime.split(":")[0]), Number(startTime.split(":")[1]))

      const endDateTime = new Date(selectedDate!)
      endDateTime.setHours(Number(endTime.split(":")[0]), Number(endTime.split(":")[1]))

      const usageHours = differenceInHours(endDateTime, startDateTime)
      const totalPrice = facility!.price_per_hour * usageHours

      const isSpecialVenue = SPECIAL_VENUES.includes(facility!.name)
      const isFreeVenue = FREE_VENUES.includes(facility!.name)
      const isMOConferenceRoom = facility!.name === "MO Conference Room"

      // Determine which table to use for the booking
      // Special venues go to payment_collector_approval
      // Free venues and all other venues go to reservations
      const bookingData = {
        user_id: userData.user.id,
        facility_id: facility!.id,
        booker_name: bookerName,
        booker_email: bookerEmail,
        booker_phone: bookerPhone,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        status: "pending",
        purpose: purpose,
        number_of_attendees: numberOfAttendees ? Number.parseInt(numberOfAttendees) : null,
        special_requests: specialRequests,
        is_read: "no",
        // New fields
        event_type: purpose,
        attendees_count: Number.parseInt(numberOfAttendees) || 0,
        total_price: totalPrice,
        // Add fields for admin notification
        ...((!isSpecialVenue || isFreeVenue) && {
          is_read_admin: "no",
        }),
        // Add fields for MDRR notification if it's MO Conference Room
        ...(isMOConferenceRoom && {
          is_read_mdrr: "no",
        }),
      }

      // Special venues go to payment_collector_approval
      // All other venues (including free venues) go to reservations
      const table = isSpecialVenue && !isFreeVenue ? "payment_collector_approval" : "reservations"

      console.log("Inserting booking data into table:", table)
      console.log("Booking data:", bookingData)

      const { data, error } = await supabase.from(table).insert(bookingData).select()

      if (error) {
        console.error("Error inserting booking:", error)
        throw new Error(`Failed to insert booking: ${error.message}`)
      }

      if (!data || data.length === 0) {
        throw new Error("No data returned from booking insertion")
      }

      const newBooking = data[0]
      console.log("New booking created:", newBooking)

      // Add facility usage data
      await supabase.from("facility_usage").insert({
        facility_id: facility!.id,
        reservation_id: newBooking.id,
        usage_date: startDateTime.toISOString().split("T")[0],
        usage_hours: usageHours,
        revenue: totalPrice,
      })

      const receiptData = {
        booking_id: isSpecialVenue && !isFreeVenue ? null : newBooking.id,
        facility_id: facility!.id,
        user_id: userData.user.id,
        booker_name: bookerName,
        booker_email: bookerEmail,
        booker_phone: bookerPhone,
        facility_name: facility!.name,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        purpose: purpose,
        number_of_attendees: numberOfAttendees ? Number.parseInt(numberOfAttendees) : null,
        special_requests: specialRequests,
        status: "Pending Approval",
        price_per_hour: facility!.price_per_hour,
      }

      console.log("Inserting receipt data")
      console.log("Receipt data:", receiptData)

      const { data: receiptDataFromDB, error: receiptError } = await supabase
        .from("receipts")
        .insert(receiptData)
        .select()
        .single()

      if (receiptError) {
        console.error("Error creating receipt:", receiptError)
        throw new Error(`Failed to create receipt: ${receiptError.message}`)
      }

      console.log("Receipt created:", receiptDataFromDB)

      setReceiptData(receiptDataFromDB)
      setShowReceipt(true)

      const { error: notificationError } = await supabase.from("notifications").insert({
        user_id: userData.user.id,
        message: `Your booking request for ${facility!.name} has been submitted and is pending approval.`,
        action_type: "booking_created",
        related_id: receiptDataFromDB.id,
      })

      if (notificationError) {
        console.error("Error creating end-user notification:", notificationError)
        throw new Error(`Failed to create end-user notification: ${notificationError.message}`)
      }

      const transactionData = {
        user_id: userData.user.id,
        facility_id: facility!.id,
        action: "booking_created",
        action_by: userData.user.id,
        action_by_role: "end_user",
        target_user_id: null,
        status: "pending",
        details: JSON.stringify({
          receipt_id: receiptDataFromDB.id,
          booking_id: isSpecialVenue && !isFreeVenue ? newBooking.id : receiptDataFromDB.booking_id,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          purpose: purpose,
        }),
      }

      console.log("Inserting transaction data")
      console.log("Transaction data:", transactionData)

      const { error: transactionError } = await supabase.from("transactions").insert(transactionData)

      if (transactionError) {
        console.error("Error creating transaction:", transactionError)
        throw new Error(`Failed to create transaction: ${transactionError.message}`)
      }

      // Create notifications based on venue type
      if (isSpecialVenue && !isFreeVenue) {
        // Special paid venues go to payment collectors
        await createNotificationsForPaymentCollectors(facility!.name, receiptDataFromDB.id)
      } else if (isMOConferenceRoom) {
        // MO Conference Room goes to MDRR staff
        await createNotificationsForMDRRStaff(receiptDataFromDB.id)
      } else {
        // All other venues (including free venues) go to admins
        await createNotificationsForAdmins(facility!.name, receiptDataFromDB.id)

        // If it's a free venue, also notify MDRR staff
        if (isFreeVenue) {
          await createNotificationsForMDRRStaff(receiptDataFromDB.id)
        }
      }

      showToast("Your booking request has been submitted for approval.", "success")
      setShowBookingForm(false)
      setSelectedDate(undefined)
    } catch (error) {
      console.error("Error submitting booking:", error)
      showToast(`Error submitting booking: ${error instanceof Error ? error.message : "Unknown error"}`, "error")
    } finally {
      setIsLoading(false)
    }
  }

  async function createNotificationsForPaymentCollectors(facilityName: string, receiptId: number) {
    const { data: paymentCollectors, error: pcError } = await supabase
      .from("users")
      .select("id")
      .eq("account_type", "payment_collector")

    if (pcError) {
      console.error("Error fetching payment collectors:", pcError)
      throw new Error(`Failed to fetch payment collectors: ${pcError.message}`)
    }

    const notificationPromises = paymentCollectors.map((pc) => {
      return supabase.from("notifications").insert({
        user_id: pc.id,
        message: `New booking request for ${facilityName}`,
        action_type: "new_booking",
        related_id: receiptId,
        is_read: "no",
      })
    })

    try {
      await Promise.all(notificationPromises)
    } catch (error) {
      console.error("Error creating notifications for payment collectors:", error)
      throw new Error("Failed to create notifications for payment collectors")
    }
  }

  async function createNotificationsForMDRRStaff(receiptId: number) {
    if (!facility) {
      console.error("Facility is null")
      return
    }

    const { data: mdrrStaff, error: mdrrError } = await supabase
      .from("users")
      .select("id")
      .eq("account_type", "mdrr_staff")

    if (mdrrError) {
      console.error("Error fetching MDRR staff:", mdrrError)
      throw new Error(`Failed to fetch MDRR staff: ${mdrrError.message}`)
    }

    const notificationPromises = mdrrStaff.map((staff) => {
      return supabase.from("notifications").insert({
        user_id: staff.id,
        message: `New booking request for ${facility.name}`,
        action_type: "new_booking",
        related_id: receiptId,
        is_read: "no",
      })
    })

    try {
      await Promise.all(notificationPromises)
    } catch (error) {
      console.error("Error creating notifications for MDRR staff:", error)
      throw new Error("Failed to create notifications for MDRR staff")
    }
  }

  async function createNotificationsForAdmins(facilityName: string, receiptId: number) {
    const { data: admins, error: adminError } = await supabase.from("users").select("id").eq("account_type", "admin")

    if (adminError) {
      console.error("Error fetching admins:", adminError)
      throw new Error(`Failed to fetch admins: ${adminError.message}`)
    }

    const notificationPromises = admins.map((admin) => {
      return supabase.from("notifications").insert({
        user_id: admin.id,
        message: `New booking request for ${facilityName}`,
        action_type: "new_booking",
        related_id: receiptId,
        is_read: "no",
      })
    })

    try {
      await Promise.all(notificationPromises)
    } catch (error) {
      console.error("Error creating notifications for admins:", error)
      throw new Error("Failed to create notifications for admins")
    }
  }

  const renderReceipt = () => {
    if (!receiptData) return null

    const getDestination = () => {
      if (SPECIAL_VENUES.includes(receiptData.facility_name) && !FREE_VENUES.includes(receiptData.facility_name)) {
        return "Payment Collector"
      } else if (receiptData.facility_name === "MO Conference Room") {
        return "MDRR Staff"
      } else {
        return "Admin"
      }
    }

    const generatePDF = () => {
      const doc = new jsPDF()
      const lineHeight = 10
      let y = 20

      // Set font
      doc.setFont("helvetica", "normal")
      doc.setFontSize(22)
      doc.text("Booking Receipt", 105, y, { align: "center" })
      y += lineHeight * 2

      doc.setFontSize(12)
      const addLine = (label: string, value: string | number | null) => {
        if (value !== null && value !== undefined) {
          doc.text(`${label}: ${value}`, 20, y)
          y += lineHeight
        }
      }

      addLine("Receipt ID", receiptData.id)
      if (receiptData.booking_id) {
        addLine("Booking ID", receiptData.booking_id)
      }
      addLine("Facility", receiptData.facility_name)
      addLine("Booker Name", receiptData.booker_name)
      addLine("Booker Email", receiptData.booker_email)
      addLine("Booker Phone", receiptData.booker_phone)
      addLine("Start Time", format(parseISO(receiptData.start_time), "PPpp"))
      addLine("End Time", format(parseISO(receiptData.end_time), "PPpp"))
      addLine("Purpose", receiptData.purpose)
      addLine("Number of Attendees", receiptData.number_of_attendees?.toString() ?? "Not specified")
      addLine("Special Requests", receiptData.special_requests || "None")
      addLine("Status", receiptData.status)
      addLine("Destination", getDestination())

      // Add price information
      if (receiptData.price_per_hour > 0) {
        addLine("Price", `₱${receiptData.price_per_hour.toFixed(2)} per day`)
      } else {
        addLine("Price", "Free (still requires approval)")
      }

      y += lineHeight
      doc.setFontSize(10)
      doc.setFont("helvetica", "italic")
      doc.text("Thank you for your reservation. For any inquiries, please contact the facility management.", 20, y, {
        maxWidth: 170,
      })

      // Save the PDF
      doc.save(`booking_receipt_${receiptData.id}.pdf`)
    }

    return (
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Booking Receipt</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              <strong>Receipt ID:</strong> {receiptData.id}
            </p>
            {receiptData.booking_id && (
              <p>
                <strong>Booking ID:</strong> {receiptData.booking_id}
              </p>
            )}
            <p>
              <strong>Facility:</strong> {receiptData.facility_name}
            </p>
            <p>
              <strong>Booker Name:</strong> {receiptData.booker_name}
            </p>
            <p>
              <strong>Booker Email:</strong> {receiptData.booker_email}
            </p>
            <p>
              <strong>Booker Phone:</strong> {receiptData.booker_phone}
            </p>
            <p>
              <strong>Start Time:</strong> {format(parseISO(receiptData.start_time), "PPpp")}
            </p>
            <p>
              <strong>End Time:</strong> {format(parseISO(receiptData.end_time), "PPpp")}
            </p>
            <p>
              <strong>Purpose:</strong> {receiptData.purpose}
            </p>
            <p>
              <strong>Number of Attendees:</strong> {receiptData.number_of_attendees ?? "Not specified"}
            </p>
            <p>
              <strong>Special Requests:</strong> {receiptData.special_requests || "None"}
            </p>
            <p>
              <strong>Status:</strong> {receiptData.status}
            </p>
            <p>
              <strong>Destination:</strong> {getDestination()}
            </p>
            <p>
              <strong>Price:</strong>{" "}
              {receiptData.price_per_hour > 0
                ? `₱${receiptData.price_per_hour.toFixed(2)} per day`
                : "Free (still requires approval)"}
            </p>
          </div>
          <DialogFooter className="flex justify-between">
            <Button onClick={() => setShowReceipt(false)}>Close</Button>
            <div className="space-x-2">
              <Button onClick={generatePDF} className="flex items-center gap-2">
                <Printer className="w-4 h-4" />
                Download PDF
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  useEffect(() => {
    const fetchFacilityAndReservations = async () => {
      try {
        setIsLoading(true)
        const { data: facilityData, error: facilityError } = await supabase
          .from("facilities")
          .select("*")
          .eq("id", facilityId)
          .single()

        if (facilityError) throw facilityError
        if (facilityData) setFacility(facilityData)

        // Fetch venue booking stats
        const { data: statsData, error: statsError } = await supabase
          .from("venue_booking_stats")
          .select("purpose, booking_count, total_attendees")
          .eq("facility_id", facilityId)
          .order("booking_count", { ascending: false })
          .limit(5)

        if (statsError) throw statsError
        setVenueStats(statsData)

        const [reservationsData, paymentApprovalData] = await Promise.all([
          supabase
            .from("reservations")
            .select(`
              id,
              start_time,
              end_time,
              status,
              facility:facilities(name),
              is_read
            `)
            .in("status", ["approved", "pending"]),
          supabase
            .from("payment_collector_approval")
            .select(`
              id,
              start_time,
              end_time,
              status,
              facility:facilities(name),
              is_read
            `)
            .in("status", ["approved", "pending"]),
        ])

        if (reservationsData.error) throw reservationsData.error
        if (paymentApprovalData.error) throw paymentApprovalData.error

        const combinedReservations: Reservation[] = [
          ...(reservationsData.data || []).map((r) => ({
            ...r,
            source: "admin" as const,
            facility: Array.isArray(r.facility) ? r.facility[0] : r.facility,
            is_read: r.is_read || "no",
          })),
          ...(paymentApprovalData.data || []).map((r) => ({
            ...r,
            source: "payment_collector" as const,
            facility: Array.isArray(r.facility) ? r.facility[0] : r.facility,
            is_read: r.is_read || "no",
          })),
        ]

        setAllReservations(combinedReservations)

        const { data: userData } = await supabase.auth.getUser()
        if (userData?.user) {
          const { data: profileData } = await supabase
            .from("users")
            .select("first_name, last_name, email")
            .eq("id", userData.user.id)
            .single()

          if (profileData) {
            setBookerName(`${profileData.first_name} ${profileData.last_name}`)
            setBookerEmail(profileData.email)
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        showToast("Failed to fetch necessary data. Please try again.", "error")
      } finally {
        setIsLoading(false)
      }
    }

    fetchFacilityAndReservations()
  }, [facilityId])

  const renderVenueStats = () => {
    if (venueStats.length === 0) return null

    return (
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-2">Venue Booking Statistics</h3>
        <ul className="space-y-2">
          {venueStats.map((stat, index) => (
            <li key={index} className="flex justify-between items-center">
              <span>{stat.purpose}</span>
              <span>
                {stat.booking_count} bookings ({stat.total_attendees} total attendees)
              </span>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  if (!facility) {
    return <div>Loading...</div>
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Book {facility?.name}</CardTitle>
          <CardDescription>{facility?.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {renderVenueStats()}
          <div className="mb-6">
            <Label>Select a Date</Label>
            <div className="bg-white p-4 rounded-lg shadow-md mb-6">
              <div className="flex justify-between items-center mb-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-xl font-bold">
                  {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {DAYS.map((day) => (
                  <div key={day} className="font-semibold text-center p-2">
                    {day}
                  </div>
                ))}
                {renderCalendar()}
              </div>
              <div className="mt-4 space-y-2">
                <p className="font-medium text-sm">Legend:</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="bg-red-50 text-red-800 border-red-200">
                    Reserved/Not Available
                  </Badge>
                  <Badge variant="secondary" className="bg-gray-800 text-white">
                    Selected Date
                  </Badge>
                  <Badge variant="secondary" className="bg-gray-100 text-gray-800 border-gray-200">
                    Past Date
                  </Badge>
                  <Badge variant="secondary" className="bg-white text-gray-800 border-gray-200">
                    Available
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          {showBookingForm && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="start-time">Start Time (7 AM - 10 PM)</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  min="07:00"
                  max="22:00"
                  required
                  className={formErrors.startTime ? "border-red-500" : ""}
                />
                {formErrors.startTime && <p className="text-red-500 text-sm mt-1">{formErrors.startTime}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-time">End Time (7 AM - 10 PM)</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  min="07:00"
                  max="22:00"
                  required
                  className={formErrors.endTime ? "border-red-500" : ""}
                />
                {formErrors.endTime && <p className="text-red-500 text-sm mt-1">{formErrors.endTime}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="booker-name">Your Name</Label>
                <Input
                  id="booker-name"
                  value={bookerName}
                  onChange={(e) => setBookerName(e.target.value)}
                  required
                  className={formErrors.bookerName ? "border-red-500" : ""}
                />
                {formErrors.bookerName && <p className="text-red-500 text-sm mt-1">{formErrors.bookerName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="booker-email">Your Email</Label>
                <Input
                  id="booker-email"
                  type="email"
                  value={bookerEmail}
                  onChange={(e) => setBookerEmail(e.target.value)}
                  required
                  className={formErrors.bookerEmail ? "border-red-500" : ""}
                />
                {formErrors.bookerEmail && <p className="text-red-500 text-sm mt-1">{formErrors.bookerEmail}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="booker-phone">Your Phone Number</Label>
                <Input
                  id="booker-phone"
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={bookerPhone}
                  onChange={(e) => {
                    // Only allow numeric input
                    const value = e.target.value.replace(/[^0-9]/g, "")
                    setBookerPhone(value)
                  }}
                  required
                  placeholder="Enter your phone number"
                  className={formErrors.bookerPhone ? "border-red-500" : ""}
                />
                {formErrors.bookerPhone && <p className="text-red-500 text-sm mt-1">{formErrors.bookerPhone}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-type">Event Type</Label>
                <Select value={purpose} onValueChange={setPurpose} required>
                  <SelectTrigger id="event-type" className={formErrors.purpose ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    {RESERVATION_PURPOSES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.purpose && <p className="text-red-500 text-sm mt-1">{formErrors.purpose}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="number-of-attendees">Number of Attendees</Label>
                <Input
                  id="number-of-attendees"
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={numberOfAttendees}
                  onChange={(e) => {
                    // Only allow numeric input
                    const value = e.target.value.replace(/[^0-9]/g, "")
                    if (value === "" || (Number.parseInt(value) >= 0 && Number.parseInt(value) <= facility.capacity)) {
                      setNumberOfAttendees(value)
                    }
                  }}
                  min="0"
                  max={facility.capacity}
                  placeholder={`Enter the expected number of attendees (max ${facility.capacity})`}
                  className={formErrors.numberOfAttendees ? "border-red-500" : ""}
                />
                {formErrors.numberOfAttendees && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.numberOfAttendees}</p>
                )}
                <p className="text-sm text-muted-foreground mt-1">Maximum capacity: {facility.capacity}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="special-requests">Special Requests</Label>
                <Textarea
                  id="special-requests"
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="Any special requests or additional information"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Submitting..." : "Submit Booking"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
      {renderReceipt()}
    </div>
  )
}
