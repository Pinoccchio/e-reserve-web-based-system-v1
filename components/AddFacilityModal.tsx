"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@supabase/supabase-js"
import { v4 as uuidv4 } from "uuid"
import { X, Upload, ImageIcon } from "lucide-react"
import { Loader } from "@googlemaps/js-api-loader"

declare global {
  interface Window {
    google?: any
  }
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

interface AddFacilityModalProps {
  isOpen: boolean
  onClose: () => void
  onAddFacility: () => void
}

interface Location {
  address: string
  lat: number
  lng: number
}

export function AddFacilityModal({ isOpen, onClose, onAddFacility }: AddFacilityModalProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [name, setName] = useState("")
  const [location, setLocation] = useState<Location | null>(null)
  const [description, setDescription] = useState("")
  const [capacity, setCapacity] = useState("")
  const [type, setType] = useState("")
  const [pricePerHour, setPricePerHour] = useState("")
  const [imageSets, setImageSets] = useState<File[][]>([])
  const [currentImages, setCurrentImages] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null)

  useEffect(() => {
    let autocompleteInstance: google.maps.places.Autocomplete | null = null
    const loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
      version: "weekly",
    })

    async function initAutocomplete() {
      const { Autocomplete } = (await loader.importLibrary("places")) as google.maps.PlacesLibrary
      const autocompleteInput = document.getElementById("location-search") as HTMLInputElement
      autocompleteInstance = new Autocomplete(autocompleteInput, {
        fields: ["formatted_address", "geometry"],
      })

      autocompleteInstance.addListener("place_changed", () => {
        const place = autocompleteInstance?.getPlace()
        if (place?.geometry?.location) {
          const newLocation = {
            address: place.formatted_address || "",
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          }
          setLocation(newLocation)
          setSearchQuery(newLocation.address)
        }
      })
    }

    initAutocomplete()

    return () => {
      if (autocompleteInstance) {
        google.maps.event.clearInstanceListeners(autocompleteInstance)
      }
    }
  }, [])

  useEffect(() => {
    const savedState = localStorage.getItem("addFacilityModalState")
    if (savedState) {
      const parsedState = JSON.parse(savedState)
      setName(parsedState.name)
      setDescription(parsedState.description)
      setCapacity(parsedState.capacity)
      setType(parsedState.type)
      setPricePerHour(parsedState.pricePerHour)
      setImageSets(parsedState.imageSets)
      setCurrentImages(parsedState.currentImages)
      localStorage.removeItem("addFacilityModalState")
    }
  }, [])

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
      const allImageUrls = await Promise.all(imageSets.flat().map(uploadImage))

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

      const facilityId = facilityData[0].id
      const imageInserts = allImageUrls.map((url) => ({
        facility_id: facilityId,
        image_url: url,
      }))

      const { error: imageError } = await supabase.from("facility_images").insert(imageInserts)
      if (imageError) throw imageError

      onAddFacility()
      onClose()
    } catch (error) {
      console.error("Error adding facility:", error)
      alert("An error occurred while adding the facility. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Add New Facility</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location-search">Location</Label>
                <Input
                  id="location-search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for a location..."
                  className="w-full"
                />
                {location && <div className="text-sm text-muted-foreground">Selected: {location.address}</div>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity</Label>
                <Input id="capacity" type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Indoor">Indoor</SelectItem>
                    <SelectItem value="Outdoor">Outdoor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pricePerHour">Price per Hour</Label>
              <Input
                id="pricePerHour"
                type="number"
                value={pricePerHour}
                onChange={(e) => setPricePerHour(e.target.value)}
              />
            </div>

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
                    {imageSets.map((set, index) => (
                      <div
                        key={index}
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
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>

        <DialogFooter className="p-6 pt-2">
          <Button type="submit" onClick={handleSubmit} disabled={isSubmitting || imageSets.length === 0 || !location}>
            {isSubmitting ? "Adding..." : "Add Facility"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

