"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, MapPin } from "lucide-react"
import { useRouter } from "next/navigation"

export default function EndUserDashboard() {
  const router = useRouter()

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Welcome to Your Dashboard</h1>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button onClick={() => router.push("/end-user/dashboard/reservations")}>
            <Calendar className="mr-2 h-4 w-4" />
            My Reservations
          </Button>
          <Button onClick={() => router.push("/end-user/dashboard/facilities")}>
            <MapPin className="mr-2 h-4 w-4" />
            Browse Facilities
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Reservations</CardTitle>
        </CardHeader>
        <CardContent>
          <p>You have no upcoming reservations.</p>
          {/* Placeholder for future reservation list */}
        </CardContent>
      </Card>
    </div>
  )
}

