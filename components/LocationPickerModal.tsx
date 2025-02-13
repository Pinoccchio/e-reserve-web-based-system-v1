"use client"

import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import Script from "next/script"

interface LocationPickerModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectLocation: (location: { address: string; lat: number; lng: number }) => void
  defaultAddress?: string
}

export function LocationPickerModal({ isOpen, onClose, onSelectLocation, defaultAddress }: LocationPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState(defaultAddress || "")
  const [map, setMap] = useState<any>(null)
  const [marker, setMarker] = useState<any>(null)
  const [selectedLocation, setSelectedLocation] = useState<{
    address: string
    lat: number
    lng: number
  } | null>(null)
  const [isMapLoaded, setIsMapLoaded] = useState(false)

  const mapRef = useRef<HTMLDivElement>(null)
  const searchBoxRef = useRef<any>(null)

  // Initialize map when the script is loaded
  const handleMapInit = () => {
    if (!mapRef.current || !window.google || !isOpen) return

    const defaultLocation = { lat: 12.8797, lng: 121.774 } // Philippines center
    const mapInstance = new window.google.maps.Map(mapRef.current, {
      center: defaultLocation,
      zoom: 6,
      styles: [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }],
        },
      ],
    })

    setMap(mapInstance)

    const markerInstance = new window.google.maps.Marker({
      map: mapInstance,
      draggable: true,
    })

    setMarker(markerInstance)

    const input = document.getElementById("location-search") as HTMLInputElement
    const searchBox = new window.google.maps.places.SearchBox(input)
    searchBoxRef.current = searchBox

    mapInstance.addListener("bounds_changed", () => {
      const bounds = mapInstance.getBounds()
      if (bounds) {
        searchBox.setBounds(bounds)
      }
    })

    searchBox.addListener("places_changed", () => {
      const places = searchBox.getPlaces()
      if (!places || places.length === 0) return

      const place = places[0]
      if (!place.geometry || !place.geometry.location) return

      mapInstance.setCenter(place.geometry.location)
      mapInstance.setZoom(17)
      markerInstance.setPosition(place.geometry.location)

      setSelectedLocation({
        address: place.formatted_address || "",
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      })
      setSearchQuery(place.formatted_address || "")
    })

    markerInstance.addListener("dragend", async () => {
      const position = markerInstance.getPosition()
      if (!position) return

      const lat = position.lat()
      const lng = position.lng()

      const geocoder = new window.google.maps.Geocoder()
      const response = await geocoder.geocode({ location: { lat, lng } })

      if (response.results[0]) {
        setSelectedLocation({
          address: response.results[0].formatted_address,
          lat,
          lng,
        })
        setSearchQuery(response.results[0].formatted_address)
      }
    })

    setIsMapLoaded(true)
  }

  // Reset map when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setMap(null)
      setMarker(null)
      setIsMapLoaded(false)
    }
  }, [isOpen])

  // Initialize map when modal is opened and script is loaded
  useEffect(() => {
    if (isOpen && window.google && !isMapLoaded) {
      handleMapInit()
    }
  }, [isOpen, isMapLoaded]) // Removed handleMapInit from dependencies

  const handleConfirm = () => {
    if (selectedLocation) {
      onSelectLocation(selectedLocation)
      onClose()
    }
  }

  return (
    <>
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
        onLoad={handleMapInit}
      />
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle>Select Location</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  id="location-search"
                  className="pl-10"
                  placeholder="Search for a location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div
                ref={mapRef}
                className="w-full h-[400px] rounded-lg border border-input bg-muted"
                style={{ minHeight: "400px" }}
              />

              {selectedLocation && (
                <div className="text-sm text-muted-foreground">Selected: {selectedLocation.address}</div>
              )}
            </div>
          </div>

          <DialogFooter className="p-6 pt-2">
            <Button onClick={handleConfirm} disabled={!selectedLocation}>
              Confirm Location
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

