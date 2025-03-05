/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from "@react-google-maps/api"
import { Button } from "@/components/ui/button"
import { Video } from "lucide-react"
import type React from "react"

interface PopularUse {
  purpose: string
  booking_count: number
  percentage?: number // Make percentage optional
}

interface Facility {
  id: number
  name: string
  location: string
  latitude: number
  longitude: number
  type: string
  capacity: number
  price_per_hour: number
  video_url?: string
  popular_uses: PopularUse[]
}

interface FacilitiesMapProps {
  facilities: Facility[]
  onVideoClick: (videoUrl: string) => void
  selectedFacility: Facility | null
}

const mapContainerStyle = {
  width: "100%",
  height: "400px",
}

const mapOptions: google.maps.MapOptions = {
  mapTypeId: "satellite",
  mapTypeControl: true,
  mapTypeControlOptions: {
    style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
    position: google.maps.ControlPosition.TOP_RIGHT,
  },
  streetViewControl: false,
  fullscreenControl: false,
  zoomControl: true,
}

declare global {
  interface Window {
    google: typeof google
  }
}

const FacilitiesMap: React.FC<FacilitiesMapProps> = ({ facilities, onVideoClick, selectedFacility }) => {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
    libraries: ["places"],
  })

  const [activeMarker, setActiveMarker] = useState<number | null>(null)
  const mapRef = useRef<google.maps.Map | null>(null)

  const onLoad = useCallback(
    (map: google.maps.Map) => {
      const bounds = new google.maps.LatLngBounds()
      facilities.forEach((facility) => {
        bounds.extend({ lat: facility.latitude, lng: facility.longitude })
      })
      map.fitBounds(bounds)
      map.setMapTypeId("satellite")
      mapRef.current = map
    },
    [facilities],
  )

  const onUnmount = useCallback(() => {
    mapRef.current = null
  }, [])

  const handleMarkerClick = (facilityId: number) => {
    setActiveMarker(facilityId === activeMarker ? null : facilityId)
  }

  useEffect(() => {
    if (mapRef.current && selectedFacility) {
      const newCenter = { lat: selectedFacility.latitude, lng: selectedFacility.longitude }
      mapRef.current.panTo(newCenter)
      mapRef.current.setZoom(18)
      setActiveMarker(selectedFacility.id)
    } else if (mapRef.current && facilities.length > 0) {
      const bounds = new google.maps.LatLngBounds()
      facilities.forEach((facility) => {
        bounds.extend({ lat: facility.latitude, lng: facility.longitude })
      })
      mapRef.current.fitBounds(bounds)
    }
  }, [selectedFacility, facilities])

  const getMarkerIcon = (facility: Facility) => {
    const isPopular = facility.popular_uses.length > 0 && facility.popular_uses[0].booking_count > 0
    if (isPopular) {
      return "http://maps.google.com/mapfiles/ms/icons/yellow-dot.png"
    }
    switch (facility.type.toLowerCase()) {
      case "indoor":
        return "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
      case "outdoor":
        return "http://maps.google.com/mapfiles/ms/icons/green-dot.png"
      default:
        return "http://maps.google.com/mapfiles/ms/icons/red-dot.png"
    }
  }

  const groupedFacilities = facilities.reduce(
    (acc, facility) => {
      const key = `${facility.latitude},${facility.longitude}`
      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(facility)
      return acc
    },
    {} as Record<string, Facility[]>,
  )

  const getAdjustedPosition = (lat: number, lng: number, index: number) => {
    const offsetFactor = 0.0001 // Adjust this value to increase or decrease the spread
    const angle = (index / 8) * 2 * Math.PI // Distribute markers in a circle
    const adjustedLat = lat + offsetFactor * Math.cos(angle)
    const adjustedLng = lng + offsetFactor * Math.sin(angle)
    return { lat: adjustedLat, lng: adjustedLng }
  }

  if (!isLoaded) return <div>Loading map...</div>

  return (
    <div className="relative overflow-hidden rounded-lg">
      <GoogleMap mapContainerStyle={mapContainerStyle} options={mapOptions} onLoad={onLoad} onUnmount={onUnmount}>
        {Object.entries(groupedFacilities).map(([key, groupedFacilities]) => {
          const [baseLat, baseLng] = key.split(",").map(Number)
          return groupedFacilities.map((facility, index) => {
            const position = getAdjustedPosition(baseLat, baseLng, index)
            return (
              <Marker
                key={facility.id}
                position={position}
                icon={getMarkerIcon(facility)}
                onClick={() => handleMarkerClick(facility.id)}
              >
                {activeMarker === facility.id && (
                  <InfoWindow position={position} onCloseClick={() => setActiveMarker(null)}>
                    <div className="p-2 max-w-xs">
                      <h4 className="font-semibold mb-2">{facility.name}</h4>
                      <p className="text-sm mb-1">
                        <strong>Type:</strong> {facility.type}
                      </p>
                      <p className="text-sm mb-1">
                        <strong>Capacity:</strong> {facility.capacity} people
                      </p>
                      <p className="text-sm mb-2">
                        <strong>Price:</strong>{" "}
                        {facility.price_per_hour > 0 ? `₱${facility.price_per_hour}/hour` : "Free"}
                      </p>
                      {facility.popular_uses.length > 0 && (
                        <div className="text-sm mb-2">
                          <strong>Popular Uses:</strong>
                          <ul className="list-disc list-inside">
                            {facility.popular_uses.slice(0, 3).map((use, index) => (
                              <li key={index}>
                                {use.purpose}: {use.booking_count} booking{use.booking_count !== 1 ? "s" : ""} (
                                {use.percentage?.toFixed(2) || 0}%)
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {facility.video_url && (
                        <Button size="sm" className="w-full mt-2" onClick={() => onVideoClick(facility.video_url!)}>
                          <Video className="w-4 h-4 mr-2" />
                          Watch Video
                        </Button>
                      )}
                    </div>
                  </InfoWindow>
                )}
              </Marker>
            )
          })
        })}
      </GoogleMap>
    </div>
  )
}

export default FacilitiesMap

