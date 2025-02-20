"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase"
import { showToast } from "@/components/ui/toast"

interface Facility {
  id: number
  name: string
  description: string
  capacity: number
  type: string
  price_per_hour: number
  payment_collector_id: string
}

interface PageProps {
  params: Promise<{
    id: string
  }>
}

const SPECIAL_VENUES = ["SK Building", "Cultural Center", "Sports Complex"]

export default function BookingPage({ params }: PageProps) {
  const { id: facilityId } = React.use(params)
  const [facility, setFacility] = useState<Facility | null>(null)
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [bookerName, setBookerName] = useState("")
  const [bookerEmail, setBookerEmail] = useState("")
  const [bookerPhone, setBookerPhone] = useState("")
  const [purpose, setPurpose] = useState("")
  const [numberOfAttendees, setNumberOfAttendees] = useState("")
  const [specialRequests, setSpecialRequests] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const fetchFacilityAndUserData = async () => {
      try {
        // Fetch facility data
        const { data: facilityData, error: facilityError } = await supabase
          .from("facilities")
          .select("*")
          .eq("id", facilityId)
          .single()

        if (facilityError) throw facilityError

        // Set facility state only if data is returned
        if (facilityData) {
          setFacility(facilityData)
        }

        // Fetch user data
        const { data: userData, error: userError } = await supabase.auth.getUser()

        if (userError) throw userError

        if (userData?.user) {
          const { data: profileData, error: profileError } = await supabase
            .from("users")
            .select("first_name, last_name, email")
            .eq("id", userData.user.id)
            .single()

          if (profileError) throw profileError

          if (profileData) {
            setBookerName(`${profileData.first_name} ${profileData.last_name}`)
            setBookerEmail(profileData.email)
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        showToast("Failed to fetch necessary data. Please try again.", "error")
      }
    }

    fetchFacilityAndUserData()
  }, [facilityId])

  const checkOverlappingBookings = async (facilityId: number, startTime: string, endTime: string) => {
    const table = SPECIAL_VENUES.includes(facility?.name || "") ? "payment_collector_approval" : "reservations"
    const { data, error } = await supabase
      .from(table)
      .select("id, status")
      .eq("facility_id", facilityId)
      .lte("start_time", endTime)
      .gte("end_time", startTime)
      .in("status", ["approved", "pending"])

    if (error) {
      console.error("Error checking overlapping bookings:", error)
      return true // Assume there's a conflict if we can't check
    }

    return data.length > 0 // Returns true if there are overlapping approved or pending bookings
  }

  const validateDateTimeInputs = (startDate: Date, endDate: Date, startTime: string, endTime: string) => {
    const start = new Date(startDate)
    start.setHours(Number.parseInt(startTime.split(":")[0]), Number.parseInt(startTime.split(":")[1]))

    const end = new Date(endDate)
    end.setHours(Number.parseInt(endTime.split(":")[0]), Number.parseInt(endTime.split(":")[1]))

    const now = new Date()

    if (start < now) {
      showToast("Start date and time cannot be in the past", "error")
      return false
    }

    if (end <= start) {
      showToast("End date and time must be after the start date and time", "error")
      return false
    }

    return true
  }

  const handleStartDateSelect = (date: Date | undefined) => {
    setStartDate(date)
    if (date && endDate && date > endDate) {
      setEndDate(undefined)
      showToast("End date must be after the start date", "error")
    }
  }

  const handleEndDateSelect = (date: Date | undefined) => {
    if (date && startDate && date < startDate) {
      showToast("End date must be after the start date", "error")
    } else {
      setEndDate(date)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!startDate || !endDate || !startTime || !endTime || !bookerName || !bookerEmail || !bookerPhone || !facility) {
      showToast("Please fill in all required fields", "error")
      return
    }

    if (!validateDateTimeInputs(startDate, endDate, startTime, endTime)) {
      return
    }

    setIsLoading(true)

    const startDateTime = new Date(startDate)
    startDateTime.setHours(Number(startTime.split(":")[0]), Number(startTime.split(":")[1]))

    const endDateTime = new Date(endDate)
    endDateTime.setHours(Number(endTime.split(":")[0]), Number(endTime.split(":")[1]))

    try {
      // Check for overlapping bookings
      const hasOverlap = await checkOverlappingBookings(
        facility.id,
        startDateTime.toISOString(),
        endDateTime.toISOString(),
      )

      if (hasOverlap) {
        showToast("This time slot is already booked or pending approval. Please choose a different time.", "error")
        setIsLoading(false)
        return
      }

      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError

      const bookingData = {
        user_id: userData.user.id,
        facility_id: facility.id,
        booker_name: bookerName,
        booker_email: bookerEmail,
        booker_phone: bookerPhone,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        status: "pending",
        purpose: purpose,
        number_of_attendees: numberOfAttendees ? Number.parseInt(numberOfAttendees) : null,
        special_requests: specialRequests,
      }

      const isSpecialVenue = SPECIAL_VENUES.includes(facility.name)
      const table = isSpecialVenue ? "payment_collector_approval" : "reservations"
      const { data, error } = await supabase.from(table).insert(bookingData).select()

      if (error) throw error

      if (!data || data.length === 0) {
        throw new Error("No data returned from booking insertion")
      }

      const newBooking = data[0]

      // Create notification for the end-user
      const { error: notificationError } = await supabase.from("notifications").insert({
        user_id: userData.user.id,
        message: `Your booking request for ${facility.name} has been submitted and is pending approval.`,
        action_type: "booking_created",
        related_id: newBooking.id,
      })

      if (notificationError) throw notificationError

      // Add transaction history
      const transactionData = {
        user_id: userData.user.id,
        facility_id: facility.id,
        action: "booking_created",
        action_by: userData.user.id,
        action_by_role: "end_user",
        target_user_id: null,
        status: "pending",
        details: JSON.stringify({
          booking_id: newBooking.id,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          purpose: purpose,
        }),
      }

      const { error: transactionError } = await supabase.from("transactions").insert(transactionData)

      if (transactionError) throw transactionError

      if (isSpecialVenue) {
        // Create notification for payment collectors
        const { data: paymentCollectors, error: pcError } = await supabase
          .from("users")
          .select("id")
          .eq("account_type", "payment_collector")

        if (pcError) throw pcError

        const notificationPromises = paymentCollectors.map((pc) => {
          return supabase.from("notifications").insert({
            user_id: pc.id,
            message: `New booking request for ${facility.name}`,
            action_type: "new_booking",
            related_id: newBooking.id,
          })
        })

        await Promise.all(notificationPromises)
      } else if (facility.name === "MO Conference Room") {
        // Create notification for MDRR staff for MO Conference Room
        const { data: mdrrStaff, error: mdrrError } = await supabase
          .from("users")
          .select("id")
          .eq("account_type", "mdrr_staff")

        if (mdrrError) throw mdrrError

        const notificationPromises = mdrrStaff.map((staff) => {
          return supabase.from("notifications").insert({
            user_id: staff.id,
            message: `New booking request for MO Conference Room`,
            action_type: "new_booking",
            related_id: newBooking.id,
          })
        })

        await Promise.all(notificationPromises)
      } else {
        // Create notification for admins for other non-special venues
        const { data: admins, error: adminError } = await supabase
          .from("users")
          .select("id")
          .eq("account_type", "admin")

        if (adminError) throw adminError

        const notificationPromises = admins.map((admin) => {
          return supabase.from("notifications").insert({
            user_id: admin.id,
            message: `New booking request for ${facility.name}`,
            action_type: "new_booking",
            related_id: newBooking.id,
          })
        })

        await Promise.all(notificationPromises)
      }

      showToast("Your booking request has been submitted for approval.", "success")
      router.push("/end-user/dashboard/reservation")
    } catch (error) {
      console.error("Error submitting booking:", error)
      showToast("There was an error submitting your booking. Please try again.", "error")
    } finally {
      setIsLoading(false)
    }
  }

  if (!facility) {
    return <div>Loading...</div>
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Book {facility.name}</CardTitle>
          <CardDescription>{facility.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="booker-name">Your Name</Label>
              <Input id="booker-name" value={bookerName} onChange={(e) => setBookerName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="booker-email">Your Email</Label>
              <Input
                id="booker-email"
                type="email"
                value={bookerEmail}
                onChange={(e) => setBookerEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="booker-phone">Your Phone Number</Label>
              <Input id="booker-phone" value={bookerPhone} onChange={(e) => setBookerPhone(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : <span>Pick a start date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={handleStartDateSelect}
                    disabled={(date) => date < new Date() || false}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : <span>Pick an end date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={handleEndDateSelect}
                    disabled={(date) => (startDate ? date < startDate : date < new Date()) || false}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="start-time">Start Time</Label>
              <Input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time">End Time</Label>
              <Input id="end-time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="purpose">Purpose of Reservation</Label>
              <Input
                id="purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="e.g., Wedding, Conference, Birthday Party"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="number-of-attendees">Number of Attendees</Label>
              <Input
                id="number-of-attendees"
                type="number"
                value={numberOfAttendees}
                onChange={(e) => {
                  const value = Number.parseInt(e.target.value)
                  if (!isNaN(value) && value >= 0 && value <= facility.capacity) {
                    setNumberOfAttendees(e.target.value)
                  }
                }}
                min="0"
                max={facility.capacity}
                placeholder={`Enter the expected number of attendees (max ${facility.capacity})`}
              />
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
        </CardContent>
      </Card>
    </div>
  )
}

