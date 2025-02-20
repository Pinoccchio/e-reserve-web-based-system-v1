"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"

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

interface Reservation {
  id: number
  start_time: string
  end_time: string
  status: string
  facility: {
    name: string
  }
}

interface Props {
  statusFilter?: string
}

export default function EndUserCalendar({ statusFilter = "all" }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [reservations, setReservations] = useState<Reservation[]>([])

  useEffect(() => {
    fetchReservations()
  }, [currentDate.getFullYear(), currentDate.getMonth(), statusFilter]) // Add statusFilter to dependency array

  const fetchReservations = async () => {
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString()
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString()

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return

    let query = supabase
      .from("reservations")
      .select("id, start_time, end_time, status, facility:facilities(name)")
      .eq("user_id", userData.user.id)
      .gte("start_time", startOfMonth)
      .lte("start_time", endOfMonth)
      .order("start_time")

    // Add status filter if not "all"
    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching reservations:", error)
    } else {
      const transformedData: Reservation[] = data.map((item: any) => ({
        id: item.id,
        start_time: item.start_time,
        end_time: item.end_time,
        status: item.status,
        facility: {
          name: item.facility?.name || "Unknown Facility",
        },
      }))
      setReservations(transformedData)
    }
  }

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
        return "bg-yellow-200"
      case "approved":
        return "bg-green-200"
      case "declined":
        return "bg-red-200"
      case "cancelled":
        return "bg-gray-200"
      case "completed":
        return "bg-blue-200"
      default:
        return "bg-gray-100"
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
            <div key={index} className={`text-xs mt-1 p-1 rounded ${getStatusColor(reservation.status)}`}>
              {reservation.facility.name}
            </div>
          ))}
        </div>,
      )
    }
    return cells
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
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
  )
}

