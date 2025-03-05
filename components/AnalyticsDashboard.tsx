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
  revenueByFacility: { name: string; revenue: number; percentage: number }[]
  bookingTrend: { date: string; count: number }[]
  frequentlyBookedFacilities: { name: string; count: number; percentage: number }[]
  totalBookingsPerMonth: { month: string; count: number }[]
  mostPopularFacilities: { name: string; count: number; percentage: number }[]
  mostPopularFacilitiesByPurpose: MostPopularFacilityByPurpose[]
}

interface MostPopularFacilityByPurpose {
  facility_name: string
  purpose: string
  booking_count: number
  percentage: number
}

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82ca9d",
  "#ffc658",
  "#8dd1e1",
  "#a4de6c",
  "#d0ed57",
]

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
        mostPopularFacilitiesByPurpose,
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
        supabase.rpc("get_most_popular_facilities_by_purpose"),
      ])

      setAnalyticsData({
        bookingsByPurpose: bookingsByPurpose.data || [],
        bookingsByFacility: bookingsByFacility.data || [],
        revenueByFacility: revenueByFacility.data || [],
        bookingTrend: bookingTrend.data || [],
        frequentlyBookedFacilities: frequentlyBookedFacilities.data || [],
        totalBookingsPerMonth: totalBookingsPerMonth.data || [],
        mostPopularFacilities: mostPopularFacilities.data || [],
        mostPopularFacilitiesByPurpose: mostPopularFacilitiesByPurpose.data || [],
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
          <ResponsiveContainer width="100%" height={400}>
            <ChartComponent data={data} {...chartProps} />
          </ResponsiveContainer>
        </CardContent>
      </Card>
    )
  }

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border border-gray-300 rounded shadow">
          <p className="font-bold">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index}>
              {entry.name}:{" "}
              {entry.name === "revenue"
                ? `₱${entry.value.toFixed(2)}`
                : entry.name === "percentage"
                  ? `${entry.value.toFixed(2)}%`
                  : entry.value}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const renderMostPopularFacilitiesByPurpose = () => {
    if (!analyticsData.mostPopularFacilitiesByPurpose || analyticsData.mostPopularFacilitiesByPurpose.length === 0) {
      return null
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>Most Popular Facilities by Purpose</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={analyticsData.mostPopularFacilitiesByPurpose}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="purpose" type="category" width={150} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as MostPopularFacilityByPurpose
                    return (
                      <div className="bg-white p-2 border border-gray-300 rounded shadow">
                        <p className="font-bold">{data.purpose}</p>
                        <p>Facility: {data.facility_name}</p>
                        <p>Bookings: {data.booking_count}</p>
                        <p>Percentage: {data.percentage.toFixed(2)}%</p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Legend />
              <Bar dataKey="booking_count" fill="#8884d8" name="Booking Count" />
            </BarChart>
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
              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(2)}%)`}
            >
              {analyticsData.frequentlyBookedFacilities?.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>,
            <Tooltip content={customTooltip} key="tooltip" />,
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
      </div>

      {renderChart("Most Popular Facilities", analyticsData.mostPopularFacilities, BarChart, {
        layout: "vertical",
        children: [
          <CartesianGrid strokeDasharray="3 3" key="grid" />,
          <XAxis type="number" key="x-axis" />,
          <YAxis dataKey="name" type="category" width={150} key="y-axis" />,
          <Tooltip content={customTooltip} key="tooltip" />,
          <Legend key="legend" />,
          <Bar dataKey="count" fill="#ffc658" key="bar" name="Count" />,
          <Bar dataKey="percentage" fill="#8884d8" key="bar-percentage" name="Percentage" />,
        ],
      })}

      {renderMostPopularFacilitiesByPurpose()}

      {renderChart("Revenue by Facility", analyticsData.revenueByFacility, BarChart, {
        layout: "vertical",
        children: [
          <CartesianGrid strokeDasharray="3 3" key="grid" />,
          <XAxis type="number" key="x-axis" />,
          <YAxis dataKey="name" type="category" width={150} key="y-axis" />,
          <Tooltip content={customTooltip} key="tooltip" />,
          <Legend key="legend" />,
          <Bar dataKey="revenue" fill="#82ca9d" key="bar" name="Revenue" />,
          <Bar dataKey="percentage" fill="#8884d8" key="bar-percentage" name="Percentage" />,
        ],
      })}

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

