"use client"

import { useState, useEffect } from "react"
import { Search, Eye, Calendar, MapPin, Users, Building, CurrencyIcon as LucidePhilippinePeso, PhilippinePesoIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { VirtualTourModal } from "@/components/VirtualTourModal"
import Image from "next/image"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

interface Facility {
  id: number
  name: string
  location: string
  latitude: number
  longitude: number
  description: string
  capacity: number
  type: string
  price_per_hour: number
  images: { image_url: string }[]
}

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [virtualTourFacility, setVirtualTourFacility] = useState<Facility | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchFacilities()
  }, [])

  async function fetchFacilities() {
    const { data, error } = await supabase.from("facilities").select(`
      *,
      images:facility_images(image_url)
    `)

    if (error) {
      console.error("Error fetching facilities:", error)
    } else {
      setFacilities(data as Facility[])
    }
  }

  const filteredFacilities = facilities.filter(
    (facility) =>
      facility.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (filterType === "all" || facility.type === filterType),
  )

  const handleBookNow = (facilityId: number) => {
    // TODO: Implement booking functionality
    console.log("Booking facility:", facilityId)
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-8 px-4 sm:px-6 rounded-lg shadow-xl">
        <h1 className="text-2xl md:text-4xl font-extrabold mb-4">Available Facilities</h1>
        <p className="text-lg md:text-xl mb-6">Browse and book our premium venues for your next event</p>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-grow">
            <Input
              type="text"
              placeholder="Search facilities..."
              className="w-full pl-10 bg-white text-gray-900"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-[180px] bg-white text-gray-900">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Indoor">Indoor</SelectItem>
              <SelectItem value="Outdoor">Outdoor</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredFacilities.map((facility) => (
          <Card key={facility.id} className="overflow-hidden transition-all duration-300 hover:shadow-lg flex flex-col">
            <CardHeader className="p-0">
              <div className="relative w-full h-48">
                <Image
                  src={facility.images[0]?.image_url || "/libmanan-logo.png"}
                  alt={facility.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6 flex-grow">
              <CardTitle className="text-xl mb-2">{facility.name}</CardTitle>
              <div className="space-y-1">
                <p className="text-sm text-gray-600 flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  {facility.location}
                </p>
                <p className="text-sm text-gray-600 flex items-center">
                  <Users className="w-4 h-4 mr-2" />
                  Capacity: {facility.capacity}
                </p>
                <p className="text-sm text-gray-600 flex items-center">
                  <Building className="w-4 h-4 mr-2" />
                  Type: {facility.type}
                </p>
                <p className="text-sm text-gray-600 flex items-center">
                  <PhilippinePesoIcon className="w-4 h-4 mr-2" />
                  Price: {facility.price_per_hour === 0 ? "Free" : `₱${facility.price_per_hour}/hour`}
                </p>
              </div>
              <p className="text-sm text-gray-700 mt-4 line-clamp-3">{facility.description}</p>
            </CardContent>
            <CardFooter className="p-4 flex flex-col gap-2">
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <Button
                  variant="outline"
                  className="flex items-center justify-center w-full sm:w-1/2"
                  onClick={() => setVirtualTourFacility(facility)}
                >
                  <Eye className="mr-2 h-4 w-4" /> Virtual Tour
                </Button>
                <Button
                  variant="outline"
                  className="flex items-center justify-center w-full sm:w-1/2"
                  onClick={() => router.push(`/end-user/dashboard/facilities/view/${facility.id}`)}
                >
                  <Search className="mr-2 h-4 w-4" />
                  View Details
                </Button>
              </div>
              <Button className="w-full flex items-center justify-center" onClick={() => handleBookNow(facility.id)}>
                <Calendar className="mr-2 h-4 w-4" />
                Book Now
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {filteredFacilities.length === 0 && (
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold text-gray-600">No facilities found</h2>
          <p className="text-gray-500 mt-2">Try adjusting your search or filter criteria</p>
        </div>
      )}

      {virtualTourFacility && (
        <VirtualTourModal
          isOpen={!!virtualTourFacility}
          onClose={() => setVirtualTourFacility(null)}
          facilityName={virtualTourFacility.name}
          images={virtualTourFacility.images}
        />
      )}
    </div>
  )
}

