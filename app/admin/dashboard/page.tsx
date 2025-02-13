import Link from 'next/link'
import { CalendarIcon, Clock, MapPin, ArrowRight } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import DashboardCalendar from '../../components/DashboardCalendar'

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4">My Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
        <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg">
          <CardHeader className="bg-blue-600 text-white p-6">
            <CardTitle className="text-2xl flex items-center">
              <CalendarIcon className="w-6 h-6 mr-2" />
              My Reservations
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-4xl font-bold text-gray-900">3</p>
            <CardDescription className="text-gray-600 mt-2">
              Active reservations
            </CardDescription>
          </CardContent>
          <CardFooter>
            <Button asChild variant="ghost" className="w-full">
              <Link href="/dashboard/my-reservations">
                View My Reservations
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg">
          <CardHeader className="bg-green-600 text-white p-6">
            <CardTitle className="text-2xl flex items-center">
              <Clock className="w-6 h-6 mr-2" />
              Upcoming Event
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-xl font-semibold text-gray-900">Town Hall Meeting</p>
            <CardDescription className="text-gray-600 mt-2">
              {new Date(new Date().setDate(new Date().getDate() + 2)).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </CardDescription>
          </CardContent>
          <CardFooter>
            <Button asChild variant="ghost" className="w-full">
              <Link href="/dashboard/upcoming-events">
                View All Events
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg">
          <CardHeader className="bg-purple-600 text-white p-6">
            <CardTitle className="text-2xl flex items-center">
              <MapPin className="w-6 h-6 mr-2" />
              Popular Venues
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-xl font-semibold text-gray-900">Libmanan Civic Center</p>
            <CardDescription className="text-gray-600 mt-2">
              Most booked this month
            </CardDescription>
          </CardContent>
          <CardFooter>
            <Button asChild variant="ghost" className="w-full">
              <Link href="/venues">
                Explore Venues
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="mb-16">
        <h2 className="text-3xl font-bold mb-6">Upcoming Events</h2>
        <DashboardCalendar />
      </div>

      <div className="bg-white rounded-lg shadow-xl p-8 md:p-12">
        <h2 className="text-3xl font-bold text-center mb-8">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="flex flex-col items-center text-center">
            <div className="bg-blue-100 p-3 rounded-full mb-4">
              <CalendarIcon className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">New Reservation</h3>
            <p className="text-gray-600 mb-4">Book a venue for your next event.</p>
            <Button asChild variant="outline">
              <Link href="/venues">Book Now</Link>
            </Button>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="bg-green-100 p-3 rounded-full mb-4">
              <Clock className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Manage Bookings</h3>
            <p className="text-gray-600 mb-4">View or modify your reservations.</p>
            <Button asChild variant="outline">
              <Link href="/dashboard/my-reservations">Manage</Link>
            </Button>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="bg-purple-100 p-3 rounded-full mb-4">
              <MapPin className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Venue Directory</h3>
            <p className="text-gray-600 mb-4">Explore our available venues.</p>
            <Button asChild variant="outline">
              <Link href="/venues">View Venues</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

