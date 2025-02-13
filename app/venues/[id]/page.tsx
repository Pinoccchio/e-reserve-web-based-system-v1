"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Calendar, MapPin, Users, CurrencyIcon as LucidePhilippinePeso, ArrowLeft, Navigation } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Loader } from "@googlemaps/js-api-loader"
import { GoogleMapPicker } from "@/components/GoogleMapPicker"
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog"
import { AuthDialogs } from "@/app/components/AuthDialog"
import type React from "react"

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
}

const VisuallyHidden = ({ children }: { children: React.ReactNode }) => <span className="sr-only">{children}</span>

export default function ViewFacilityPage({ params }: { params: { id: string } }) {
  const { id: facilityId } = params
  const [facility, setFacility] = useState<Facility | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const router = useRouter()
  const [isSignInOpen, setIsSignInOpen] = useState(false)
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false)

  useEffect(() => {
    const fetchFacility = async () => {
      setIsLoading(true)
      const { data, error } = await supabase
        .from("facilities")
        .select(`*, images:facility_images(id, image_url)`)
        .eq("id", facilityId)
        .single()

      if (error) {
        console.error("Error fetching facility:", error)
        setIsLoading(false)
        return
      }

      setFacility(data)
      setIsLoading(false)
    }

    fetchFacility()
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

  const handleBookNow = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      setIsAuthDialogOpen(true)
    } else {
      // TODO: Implement booking functionality for authenticated users
      console.log("Booking facility:", facility?.id)
    }
  }

  const openSignInDialog = () => {
    setIsSignInOpen(true)
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

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <Button variant="outline" className="mb-6" onClick={() => router.push("/")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Homepage
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
                <span>Price: ₱{facility.price_per_hour}/hour</span>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Description</h3>
              <p>{facility.description}</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Location</h3>
            <div className="rounded-md overflow-hidden border border-input h-[300px]">
              <GoogleMapPicker
                onLocationSelect={() => {}}
                initialLocation={{ lat: facility.latitude, lng: facility.longitude }}
                searchedLocation={{ lat: facility.latitude, lng: facility.longitude }}
              />
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
            <h3 className="text-xl font-semibold">Facility Images</h3>
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
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-end space-x-4 mt-6">
          <AuthDialogs isOpen={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen}>
            <Button onClick={handleBookNow} className="w-full sm:w-auto">
              <Calendar className="mr-2 h-4 w-4" />
              Book Now
            </Button>
          </AuthDialogs>
        </CardFooter>
      </Card>
    </div>
  )
}

