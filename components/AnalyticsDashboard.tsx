/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
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
  Label,
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

  // Format date labels to be more compact
  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  // Format X-axis tick values for revenue
  const formatRevenue = (value: number) => {
    if (value >= 1000) {
      return `₱${(value / 1000).toFixed(0)}k`
    }
    return `₱${value}`
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
              margin={{ top: 20, right: 30, left: 150, bottom: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number">
                <Label value="Number of Bookings" position="insideBottom" offset={-10} />
              </XAxis>
              <YAxis dataKey="purpose" type="category" width={140} tick={{ fontSize: 12 }} />
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
          margin: { top: 20, right: 30, left: 30, bottom: 20 },
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
              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
            >
              {analyticsData.frequentlyBookedFacilities?.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>,
            <Tooltip content={customTooltip} key="tooltip" />,
            <Legend key="legend" layout="horizontal" verticalAlign="bottom" align="center" />,
          ],
        })}

        {renderChart("Total Bookings per Month", analyticsData.totalBookingsPerMonth, BarChart, {
          margin: { top: 20, right: 30, left: 60, bottom: 60 },
          children: [
            <CartesianGrid strokeDasharray="3 3" key="grid" />,
            <XAxis dataKey="month" key="x-axis" tick={{ fontSize: 12 }}>
              <Label value="Month" position="bottom" offset={20} />
            </XAxis>,
            <YAxis key="y-axis" tick={{ fontSize: 12 }}>
              <Label
                value="Number of Bookings"
                angle={-90}
                position="insideLeft"
                offset={-40}
                style={{ textAnchor: "middle" }}
              />
            </YAxis>,
            <Tooltip key="tooltip" />,
            <Legend key="legend" verticalAlign="top" height={36} />,
            <Bar dataKey="count" fill="#82ca9d" key="bar" name="Bookings" />,
          ],
        })}
      </div>

      {renderChart("Most Popular Facilities", analyticsData.mostPopularFacilities, BarChart, {
        layout: "vertical",
        margin: { top: 20, right: 30, left: 150, bottom: 60 },
        children: [
          <CartesianGrid strokeDasharray="3 3" key="grid" />,
          <XAxis type="number" key="x-axis" tick={{ fontSize: 12 }}>
            <Label value="Number of Bookings / Percentage" position="bottom" offset={20} />
          </XAxis>,
          <YAxis dataKey="name" type="category" width={140} key="y-axis" tick={{ fontSize: 12 }} />,
          <Tooltip content={customTooltip} key="tooltip" />,
          <Legend key="legend" verticalAlign="top" height={36} />,
          <Bar dataKey="count" fill="#ffc658" key="bar" name="Count" />,
          <Bar dataKey="percentage" fill="#8884d8" key="bar-percentage" name="Percentage" />,
        ],
      })}

      {renderMostPopularFacilitiesByPurpose()}

      {renderChart("Revenue by Facility", analyticsData.revenueByFacility, BarChart, {
        layout: "vertical",
        margin: { top: 20, right: 30, left: 150, bottom: 60 },
        children: [
          <CartesianGrid strokeDasharray="3 3" key="grid" />,
          <XAxis type="number" key="x-axis" tick={{ fontSize: 12 }} tickFormatter={formatRevenue}>
            <Label value="Revenue (₱) / Percentage" position="bottom" offset={20} />
          </XAxis>,
          <YAxis dataKey="name" type="category" width={140} key="y-axis" tick={{ fontSize: 12 }} />,
          <Tooltip content={customTooltip} key="tooltip" />,
          <Legend key="legend" verticalAlign="top" height={36} />,
          <Bar dataKey="revenue" fill="#82ca9d" key="bar" name="Revenue" />,
          <Bar dataKey="percentage" fill="#8884d8" key="bar-percentage" name="Percentage" />,
        ],
      })}

      {renderChart("Booking Trend (Last 30 Days)", analyticsData.bookingTrend, LineChart, {
        margin: { top: 20, right: 30, left: 60, bottom: 60 },
        children: [
          <CartesianGrid strokeDasharray="3 3" key="grid" />,
          <XAxis
            dataKey="date"
            key="x-axis"
            tick={{ fontSize: 10 }}
            tickFormatter={formatDateLabel}
            interval={2} // Show fewer ticks to prevent overlap
          >
            <Label value="Date" position="bottom" offset={20} />
          </XAxis>,
          <YAxis key="y-axis" tick={{ fontSize: 12 }}>
            <Label
              value="Number of Bookings"
              angle={-90}
              position="insideLeft"
              offset={-40}
              style={{ textAnchor: "middle" }}
            />
          </YAxis>,
          <Tooltip key="tooltip" labelFormatter={(label) => new Date(label).toLocaleDateString()} />,
          <Legend key="legend" verticalAlign="top" height={36} />,
          <Line type="monotone" dataKey="count" stroke="#8884d8" key="line" name="Bookings" />,
        ],
      })}
    </div>
  )
}
