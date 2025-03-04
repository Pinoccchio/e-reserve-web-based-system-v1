"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts"

interface AnalyticsData {
  bookingsByPurpose: { purpose: string; count: number }[]
  bookingsByFacility: { name: string; count: number }[]
  revenueByFacility: { name: string; revenue: number }[]
  bookingTrend: { date: string; count: number }[]
  frequentlyBookedFacilities: { name: string; count: number }[]
  totalBookingsPerMonth: { month: string; count: number }[]
  mostPopularFacilities: { name: string; count: number }[]
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

export function AnalyticsDashboard() {
  const [analyticsData, setAnalyticsData] = useState<Partial<AnalyticsData>>({})
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchAnalyticsData()
  }, [])

  async function fetchAnalyticsData() {
    try {
      setError(null)
      setIsLoading(true)

      const [
        bookingsByPurpose,
        bookingsByFacility,
        revenueByFacility,
        bookingTrend,
        frequentlyBookedFacilities,
        totalBookingsPerMonth,
        mostPopularFacilities,
      ] = await Promise.all([
        supabase.rpc("get_bookings_by_purpose"),
        supabase.rpc("get_bookings_by_facility"),
        supabase.rpc("get_revenue_by_facility"),
        supabase.rpc("get_daily_booking_count", {
          start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        }),
        supabase.rpc("get_frequently_booked_facilities"),
        supabase.rpc("get_total_bookings_per_month"),
        supabase.rpc("get_most_popular_facilities"),
      ])

      setAnalyticsData({
        bookingsByPurpose: bookingsByPurpose.data || [],
        bookingsByFacility: bookingsByFacility.data || [],
        revenueByFacility: revenueByFacility.data || [],
        bookingTrend: bookingTrend.data || [],
        frequentlyBookedFacilities: frequentlyBookedFacilities.data || [],
        totalBookingsPerMonth: totalBookingsPerMonth.data || [],
        mostPopularFacilities: mostPopularFacilities.data || [],
      })
    } catch (error) {
      console.error("Error fetching analytics data:", error)
      setError(error instanceof Error ? error.message : String(error))
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <div>Loading analytics data...</div>
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>
  }

  const renderChart = (title: string, data: any[] | undefined, ChartComponent: any, chartProps: any) => {
    if (!data || data.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-gray-500">No data available</div>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ChartComponent data={data} {...chartProps} />
          </ResponsiveContainer>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderChart("Frequently Booked Facilities", analyticsData.frequentlyBookedFacilities, PieChart, {
          children: [
            <Pie
              key="pie"
              data={analyticsData.frequentlyBookedFacilities}
              dataKey="count"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              fill="#8884d8"
              label
            >
              {analyticsData.frequentlyBookedFacilities?.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>,
            <Tooltip key="tooltip" />,
            <Legend key="legend" />,
          ],
        })}

        {renderChart("Total Bookings per Month", analyticsData.totalBookingsPerMonth, BarChart, {
          children: [
            <CartesianGrid strokeDasharray="3 3" key="grid" />,
            <XAxis dataKey="month" key="x-axis" />,
            <YAxis key="y-axis" />,
            <Tooltip key="tooltip" />,
            <Legend key="legend" />,
            <Bar dataKey="count" fill="#82ca9d" key="bar" />,
          ],
        })}

        {renderChart("Most Popular Facilities", analyticsData.mostPopularFacilities, BarChart, {
          children: [
            <CartesianGrid strokeDasharray="3 3" key="grid" />,
            <XAxis dataKey="name" key="x-axis" />,
            <YAxis key="y-axis" />,
            <Tooltip key="tooltip" />,
            <Legend key="legend" />,
            <Bar dataKey="count" fill="#ffc658" key="bar" />,
          ],
        })}

        {renderChart("Revenue by Facility", analyticsData.revenueByFacility, BarChart, {
          children: [
            <CartesianGrid strokeDasharray="3 3" key="grid" />,
            <XAxis dataKey="name" key="x-axis" />,
            <YAxis key="y-axis" />,
            <Tooltip key="tooltip" formatter={(value) => `₱${Number(value).toFixed(2)}`} />,
            <Legend key="legend" />,
            <Bar dataKey="revenue" fill="#82ca9d" key="bar" />,
          ],
        })}
      </div>

      {renderChart("Booking Trend (Last 30 Days)", analyticsData.bookingTrend, LineChart, {
        children: [
          <CartesianGrid strokeDasharray="3 3" key="grid" />,
          <XAxis dataKey="date" key="x-axis" />,
          <YAxis key="y-axis" />,
          <Tooltip key="tooltip" />,
          <Legend key="legend" />,
          <Line type="monotone" dataKey="count" stroke="#8884d8" key="line" />,
        ],
      })}
    </div>
  )
}

