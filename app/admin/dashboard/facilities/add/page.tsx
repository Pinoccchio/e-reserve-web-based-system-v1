"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@supabase/supabase-js"
import { v4 as uuidv4 } from "uuid"
import { X, Upload, ImageIcon, MapPin, Loader2 } from "lucide-react"
import { Loader } from "@googlemaps/js-api-loader"
import { GoogleMapPicker } from "@/components/GoogleMapPicker"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { motion, AnimatePresence } from "framer-motion"

declare global {
  interface Window {
    google: typeof google
  }
}

const bagumbayanCenter = {
  lat: 13.3553,
  lng: 123.3242,
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

interface Location {
  address: string
  lat: number
  lng: number
}

export default function AddFacilityPage() {
  const router = useRouter()

  const [name, setName] = useState("")
  const [location, setLocation] = useState<Location | null>(null)
  const [description, setDescription] = useState("")
  const [capacity, setCapacity] = useState("")
  const [type, setType] = useState("")
  const [pricePerHour, setPricePerHour] = useState("")
  const [imageSets, setImageSets] = useState<File[][]>([])
  const [currentImages, setCurrentImages] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchedLocation, setSearchedLocation] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    const loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
      version: "weekly",
      libraries: ["places"],
    })

    loader.load().then(() => {
      if (window.google && window.google.maps && window.google.maps.places) {
        const autocompleteInput = document.getElementById("location-search") as HTMLInputElement
        if (autocompleteInput) {
          const autocompleteInstance = new window.google.maps.places.Autocomplete(autocompleteInput, {
            fields: ["formatted_address", "geometry"],
          })

          autocompleteInstance.addListener("place_changed", () => {
            const place = autocompleteInstance.getPlace()
            if (place.geometry && place.geometry.location) {
              const newLocation = {
                address: place.formatted_address || "",
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
              }
              setLocation(newLocation)
              setSearchQuery(newLocation.address)
              setSearchedLocation({ lat: newLocation.lat, lng: newLocation.lng })
            }
          })
        }
      } else {
        console.error("Google Maps Places API not loaded correctly.")
      }
    })
  }, [])

  const handleLocationSelect = (selectedLocation: Location | null) => {
    if (selectedLocation) {
      setLocation(selectedLocation)
      setSearchQuery(selectedLocation.address)
      setSearchedLocation({ lat: selectedLocation.lat, lng: selectedLocation.lng })
    }
  }

  const clearLocation = () => {
    setLocation(null)
    setSearchQuery("")
    setSearchedLocation(bagumbayanCenter)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setCurrentImages(Array.from(e.target.files))
    }
  }

  const uploadImage = async (file: File) => {
    try {
      const fileExt = file.name.split(".").pop()
      const fileName = `${uuidv4()}.${fileExt}`
      const filePath = `${fileName}`

      const { data, error: uploadError } = await supabase.storage
        .from("facility-images")
        .upload(filePath, file, { cacheControl: "3600", upsert: false })

      if (uploadError) throw uploadError
      if (!data) throw new Error("Upload succeeded but no data returned")

      const { data: urlData } = supabase.storage.from("facility-images").getPublicUrl(filePath)
      if (!urlData) throw new Error("Failed to get public URL for uploaded file")

      return urlData.publicUrl
    } catch (error) {
      console.error("Error in uploadImage function:", error)
      throw error
    }
  }

  const handleAddImageSet = () => {
    if (currentImages.length > 0) {
      setImageSets([...imageSets, currentImages])
      setCurrentImages([])
      // Clear the file input
      const fileInput = document.getElementById("images") as HTMLInputElement
      if (fileInput) fileInput.value = ""
    }
  }

  const handleRemoveImageSet = (index: number) => {
    setImageSets(imageSets.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Upload all images
      const allImageUrls = await Promise.all(imageSets.flat().map(uploadImage))

      // Insert facility data
      const { data: facilityData, error: facilityError } = await supabase
        .from("facilities")
        .insert([
          {
            name,
            location: location?.address,
            latitude: location?.lat,
            longitude: location?.lng,
            description,
            capacity: Number.parseInt(capacity),
            type,
            price_per_hour: Number.parseFloat(pricePerHour),
          },
        ])
        .select()

      if (facilityError) throw facilityError

      if (!facilityData || facilityData.length === 0) {
        throw new Error("No facility data returned after insertion")
      }

      const facilityId = facilityData[0].id

      // Insert image data
      const imageInserts = allImageUrls.map((url) => ({
        facility_id: facilityId,
        image_url: url,
      }))

      const { error: imageError } = await supabase.from("facility_images").insert(imageInserts)
      if (imageError) throw imageError

      console.log("Facility Added: The new facility has been successfully added.")

      router.push("/admin/dashboard/facilities")
    } catch (error) {
      console.error("Error adding facility:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-3xl font-bold mb-8 text-center">Add New Facility</h1>
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Facility Details</CardTitle>
            <CardDescription>Enter the information for the new facility</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location-search">Location</Label>
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <Input
                      id="location-search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search for a location"
                      className="flex-grow"
                      required
                    />
                    <Button type="button" variant="outline" onClick={clearLocation}>
                      Clear
                    </Button>
                  </div>
                  {location && <div className="text-sm text-muted-foreground mt-2">Selected: {location.address}</div>}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Map</Label>
                <div className="rounded-md overflow-hidden border border-input">
                  <GoogleMapPicker
                    onLocationSelect={handleLocationSelect}
                    initialLocation={location ? { lat: location.lat, lng: location.lng } : bagumbayanCenter}
                    searchedLocation={searchedLocation || bagumbayanCenter}
                    isAdmin={true}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[100px]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="capacity">Capacity</Label>
                  <Input
                    id="capacity"
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select value={type} onValueChange={setType} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Indoor">Indoor</SelectItem>
                      <SelectItem value="Outdoor">Outdoor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pricePerHour">Price per Hour</Label>
                  <Input
                    id="pricePerHour"
                    type="number"
                    value={pricePerHour}
                    onChange={(e) => setPricePerHour(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label>Images</Label>
                <div className="flex items-center space-x-4">
                  <Input
                    id="images"
                    type="file"
                    multiple
                    onChange={handleImageChange}
                    className="flex-grow"
                    accept="image/*"
                  />
                  <Button
                    type="button"
                    onClick={handleAddImageSet}
                    disabled={currentImages.length === 0}
                    className="shrink-0"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Add Set
                  </Button>
                </div>

                {currentImages.length > 0 && (
                  <div className="text-sm text-muted-foreground">{currentImages.length} file(s) selected</div>
                )}

                {imageSets.length > 0 && (
                  <div className="space-y-2 bg-muted/50 rounded-lg p-4">
                    <Label className="text-sm font-medium">Image Sets ({imageSets.length})</Label>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                      <AnimatePresence>
                        {imageSets.map((set, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                            className="flex items-center justify-between bg-background p-3 rounded-md shadow-sm"
                          >
                            <div className="flex items-center space-x-2">
                              <ImageIcon className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">
                                Set {index + 1}: {set.length} image(s)
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveImageSet(index)}
                              className="h-8 w-8 p-0"
                            >
                              <X className="w-4 h-4" />
                              <span className="sr-only">Remove image set {index + 1}</span>
                            </Button>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                )}
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={() => router.push("/admin/dashboard/facilities")}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || imageSets.length === 0 || !location}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Facility"
              )}
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}

