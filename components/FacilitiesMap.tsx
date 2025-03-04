/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from "@react-google-maps/api"
import { Button } from "@/components/ui/button"
import { Video } from "lucide-react"

interface PopularUse {
  purpose: string
  booking_count: number
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
    google: any
  }
}

export function FacilitiesMap({ facilities, onVideoClick, selectedFacility }: FacilitiesMapProps) {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
    libraries: ["places"],
  })

  const [map, setMap] = useState<google.maps.Map | null>(null)
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
      setMap(map)
    },
    [facilities],
  )

  const onUnmount = useCallback(() => {
    mapRef.current = null
    setMap(null)
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

  if (!isLoaded) return <div>Loading map...</div>

  return (
    <div className="relative overflow-hidden rounded-lg">
      <GoogleMap mapContainerStyle={mapContainerStyle} options={mapOptions} onLoad={onLoad} onUnmount={onUnmount}>
        {facilities.map((facility) => (
          <Marker
            key={facility.id}
            position={{ lat: facility.latitude, lng: facility.longitude }}
            onClick={() => handleMarkerClick(facility.id)}
          >
            {activeMarker === facility.id && (
              <InfoWindow
                position={{ lat: facility.latitude, lng: facility.longitude }}
                onCloseClick={() => setActiveMarker(null)}
              >
                <div className="p-2 max-w-xs">
                  <h4 className="font-semibold mb-2">{facility.name}</h4>
                  <p className="text-sm mb-1">
                    <strong>Type:</strong> {facility.type}
                  </p>
                  <p className="text-sm mb-1">
                    <strong>Capacity:</strong> {facility.capacity} people
                  </p>
                  <p className="text-sm mb-2">
                    <strong>Price:</strong> {facility.price_per_hour > 0 ? `₱${facility.price_per_hour}/hour` : "Free"}
                  </p>
                  {facility.popular_uses && facility.popular_uses.length > 0 && (
                    <div className="text-sm mb-2">
                      <strong>Popular Uses:</strong>
                      <ul className="list-disc list-inside">
                        {facility.popular_uses.slice(0, 3).map((use, index) => (
                          <li key={index}>
                            {use.purpose}: {use.booking_count} booking{use.booking_count !== 1 ? "s" : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {facility.video_url && (
                    <Button size="sm" className="w-full" onClick={() => onVideoClick(facility.video_url!)}>
                      <Video className="w-4 h-4 mr-2" />
                      Watch Video
                    </Button>
                  )}
                </div>
              </InfoWindow>
            )}
          </Marker>
        ))}
      </GoogleMap>
    </div>
  )
}

