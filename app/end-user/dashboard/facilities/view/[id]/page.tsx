"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Calendar,
  MapPin,
  Users,
  CurrencyIcon as LucidePhilippinePeso,
  ArrowLeft,
  Navigation,
  Video,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Loader } from "@googlemaps/js-api-loader"
import { GoogleMapPicker } from "@/components/GoogleMapPicker"
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog"
import React from "react"
import { VideoPlayer } from "@/components/VideoPlayer"

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
  images: { id: number; image_url: string }[]
  video_url: string
}

interface VenueStats {
  purpose: string
  booking_count: number
  total_attendees: number
  percentage: number
}

const VisuallyHidden = ({ children }: { children: React.ReactNode }) => <span className="sr-only">{children}</span>

export default function ViewFacilityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: facilityId } = React.use(params)
  const [facility, setFacility] = useState<Facility | null>(null)
  const [venueStats, setVenueStats] = useState<VenueStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const fetchFacilityAndStats = async () => {
      setIsLoading(true)
      const [facilityData, statsData] = await Promise.all([
        supabase
          .from("facilities")
          .select(`*, images:facility_images(id, image_url), video_url`)
          .eq("id", facilityId)
          .single(),
        supabase
          .from("venue_booking_stats")
          .select("purpose, booking_count, total_attendees, percentage")
          .eq("facility_id", facilityId)
          .order("booking_count", { ascending: false })
          .limit(5),
      ])

      if (facilityData.error) {
        console.error("Error fetching facility:", facilityData.error)
      } else {
        setFacility(facilityData.data)
      }

      if (statsData.error) {
        console.error("Error fetching venue stats:", statsData.error)
      } else {
        setVenueStats(statsData.data)
      }

      setIsLoading(false)
    }

    fetchFacilityAndStats()
  }, [facilityId])

  useEffect(() => {
    const loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
      version: "weekly",
      libraries: ["places"],
    })

    loader
      .load()
      .then(() => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              setUserLocation({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              })
            },
            () => {
              console.error("Error: The Geolocation service failed.")
            },
          )
        } else {
          console.error("Error: Your browser doesn't support geolocation.")
        }
      })
      .catch((error) => {
        console.error("Error loading Google Maps API:", error)
      })
  }, [])

  const handleBookNow = () => {
    if (facility) {
      router.push(`/end-user/dashboard/facilities/book/${facility.id}`)
    }
  }

  const handleNavigate = () => {
    if (facility && userLocation) {
      const url = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${facility.latitude},${facility.longitude}`
      window.open(url, "_blank")
    }
  }

  if (isLoading) {
    return <div className="text-center py-12">Loading...</div>
  }

  if (!facility) {
    return <div className="text-center py-12">Facility not found</div>
  }

  const renderMarkerContent = () => {
    return (
      <div className="bg-white p-3 rounded shadow-md max-w-xs">
        <h4 className="font-semibold mb-2 text-sm">{facility?.name}</h4>
        <div className="text-xs mb-2">
          <p>
            <strong>Type:</strong> {facility?.type}
          </p>
          <p>
            <strong>Capacity:</strong> {facility?.capacity} people
          </p>
          <p>
            <strong>Price:</strong> {facility?.price_per_hour ? `₱${facility.price_per_hour}/hour` : "Free"}
          </p>
        </div>
        {venueStats.length > 0 && (
          <>
            <h5 className="font-medium mb-1 text-xs border-t pt-1">Popular Uses:</h5>
            <ul className="text-xs">
              {venueStats.slice(0, 3).map((stat, index) => (
                <li key={index} className="mb-1">
                  {stat.purpose}: {stat.booking_count} bookings ({stat.percentage.toFixed(2)}%)
                </li>
              ))}
            </ul>
          </>
        )}
        {facility?.video_url && (
          <Button size="sm" className="mt-2 w-full" onClick={() => setIsVideoModalOpen(true)}>
            <Video className="w-4 h-4 mr-2" />
            Watch Video
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <Button variant="outline" className="mb-6" onClick={() => router.push("/end-user/dashboard/facilities")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Facilities
      </Button>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">{facility.name}</CardTitle>
          <CardDescription className="flex items-center text-lg">
            <MapPin className="mr-2 h-5 w-5" />
            {facility.location}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center">
                <Users className="mr-2 h-5 w-5" />
                <span>Capacity: {facility.capacity}</span>
              </div>
              <div className="flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                <span>Type: {facility.type}</span>
              </div>
              <div className="flex items-center">
                <LucidePhilippinePeso className="mr-2 h-5 w-5" />
                <span>Price: {facility.price_per_hour > 0 ? `₱${facility.price_per_hour}/hour` : "Free"}</span>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Description</h3>
              <p>{facility.description}</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Venue Booking Statistics</h3>
            {venueStats.length > 0 ? (
              <ul className="space-y-2">
                {venueStats.map((stat, index) => (
                  <li key={index} className="flex justify-between items-center">
                    <span>{stat.purpose}</span>
                    <span>
                      {stat.booking_count} bookings ({stat.total_attendees} total attendees,{" "}
                      {stat.percentage.toFixed(2)}%)
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No booking statistics available for this venue yet.</p>
            )}
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Location</h3>
            <div className="rounded-md overflow-hidden border border-input h-[400px]">
              {facility && (
                <GoogleMapPicker
                  initialLocation={{ lat: facility.latitude, lng: facility.longitude }}
                  markerContent={renderMarkerContent()}
                />
              )}
            </div>
            {userLocation && (
              <Button onClick={handleNavigate} className="mt-2">
                <Navigation className="mr-2 h-4 w-4" />
                Navigate to Facility
              </Button>
            )}
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Facility Images and Video</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {facility.images.map((image) => (
                <Dialog key={image.id}>
                  <DialogTrigger asChild>
                    <div className="relative aspect-video cursor-pointer">
                      <Image
                        src={image.image_url || "/placeholder.svg"}
                        alt={`${facility.name} - Image`}
                        fill
                        className="object-cover rounded-lg"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    </div>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl w-full h-full flex items-center justify-center">
                    <VisuallyHidden>
                      <DialogTitle>{`Full-size image of ${facility.name}`}</DialogTitle>
                    </VisuallyHidden>
                    <div className="relative w-full h-full">
                      <Image
                        src={image.image_url || "/placeholder.svg"}
                        alt={`${facility.name} - Full Image`}
                        fill
                        className="object-contain"
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              ))}
              {facility.video_url && (
                <div className="aspect-video">
                  <VideoPlayer url={facility.video_url} />
                </div>
              )}
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-end space-x-4 mt-6">
          <Button onClick={handleBookNow} className="w-full sm:w-auto">
            <Calendar className="mr-2 h-4 w-4" />
            Book Now
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={isVideoModalOpen} onOpenChange={setIsVideoModalOpen}>
        <DialogContent className="max-w-4xl w-full p-0">
          <VisuallyHidden>
            <DialogTitle>{`Video of ${facility?.name}`}</DialogTitle>
          </VisuallyHidden>
          <div className="aspect-video w-full">
            <VideoPlayer url={facility?.video_url || ""} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

