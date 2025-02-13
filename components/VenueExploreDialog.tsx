"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import Image from "next/image"
import Link from "next/link"
import { Users, MapPin } from "lucide-react"

interface Venue {
  id: number
  name: string
  capacity: number
  location: string
  type: string
  images: { image_url: string }[]
}

export function VenueExploreDialog({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [venues, setVenues] = useState<Venue[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [venueType, setVenueType] = useState("all")

  const handleExplore = async () => {
    setIsOpen(true)
    const { data, error } = await supabase
      .from("facilities")
      .select("id, name, capacity, location, type, images:facility_images(image_url)")
      .order("name")

    if (error) {
      console.error("Error fetching venues:", error)
    } else {
      setVenues(data as Venue[])
    }
  }

  const filteredVenues = venues.filter(
    (venue) =>
      venue.name.toLowerCase().includes(searchTerm.toLowerCase()) && (venueType === "all" || venue.type === venueType),
  )

  return (
    <>
      <span onClick={handleExplore}>{children}</span>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Explore Venues</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Input
              placeholder="Search venues..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-grow"
            />
            <Select value={venueType} onValueChange={setVenueType}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Venue Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Indoor">Indoor</SelectItem>
                <SelectItem value="Outdoor">Outdoor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredVenues.map((venue) => (
              <Card key={venue.id} className="overflow-hidden">
                <CardHeader className="p-0">
                  <div className="relative w-full h-40">
                    <Image
                      src={venue.images[0]?.image_url || "/libmanan-logo.png"}
                      alt={venue.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <CardTitle className="text-lg mb-2">{venue.name}</CardTitle>
                  <CardDescription>
                    <div className="flex items-center mb-1">
                      <Users className="w-4 h-4 mr-2" />
                      Capacity: {venue.capacity}
                    </div>
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2" />
                      {venue.location}
                    </div>
                  </CardDescription>
                </CardContent>
                <CardFooter>
                  <Button asChild variant="outline" className="w-full">
                    <Link href={`/venues/${venue.id}`}>View Details</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

