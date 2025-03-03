"use client"

import type React from "react"
import { useState, useCallback, useRef, useEffect } from "react"
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from "@react-google-maps/api"

interface Location {
  lat: number
  lng: number
}

interface GoogleMapPickerProps {
  initialLocation: Location
  markerContent?: React.ReactNode
  onLocationSelect?: (location: { address: string; lat: number; lng: number } | null) => void
  isAdmin?: boolean
  searchedLocation?: Location
}

const mapContainerStyle = {
  width: "100%",
  height: "400px",
}

const mapOptions: google.maps.MapOptions = {
  mapTypeId: "satellite",
  zoom: 19,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  zoomControl: false,
  scrollwheel: true,
  gestureHandling: "greedy",
  draggable: true,
  keyboardShortcuts: false,
  disableDoubleClickZoom: true,
  maxZoom: 20,
  minZoom: 18,
  styles: [
    {
      featureType: "poi",
      elementType: "labels",
      stylers: [{ visibility: "off" }],
    },
  ],
}

export function GoogleMapPicker({
  initialLocation,
  markerContent,
  onLocationSelect,
  isAdmin = false,
  searchedLocation,
}: GoogleMapPickerProps) {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
    libraries: ["places"],
  })

  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [infoWindowOpen, setInfoWindowOpen] = useState(false)
  const [markerPosition, setMarkerPosition] = useState<Location>(initialLocation)
  const isDragging = useRef(false)

  const onLoad = useCallback(
    (map: google.maps.Map) => {
      map.setCenter(searchedLocation || initialLocation)
      setMap(map)
      setInfoWindowOpen(true)
    },
    [initialLocation, searchedLocation],
  )

  const onUnmount = useCallback(() => {
    setMap(null)
  }, [])

  const toggleInfoWindow = () => {
    setInfoWindowOpen(!infoWindowOpen)
  }

  useEffect(() => {
    if (searchedLocation) {
      setMarkerPosition(searchedLocation)
      map?.panTo(searchedLocation)
    }
  }, [searchedLocation, map])

  useEffect(() => {
    if (map) {
      const listeners = [
        map.addListener("dragstart", () => {
          isDragging.current = true
        }),
        map.addListener("dragend", () => {
          isDragging.current = false
          setTimeout(() => {
            if (!isDragging.current) {
              map.panTo(markerPosition)
            }
          }, 200)
        }),
        map.addListener("mousedown", () => {
          isDragging.current = true
        }),
        map.addListener("mouseup", () => {
          isDragging.current = false
          setTimeout(() => {
            if (!isDragging.current) {
              map.panTo(markerPosition)
            }
          }, 200)
        }),
        map.addListener("touchstart", () => {
          isDragging.current = true
        }),
        map.addListener("touchend", () => {
          isDragging.current = false
          setTimeout(() => {
            if (!isDragging.current) {
              map.panTo(markerPosition)
            }
          }, 200)
        }),
      ]

      return () => {
        listeners.forEach((listener) => {
          if (window.google && window.google.maps) {
            google.maps.event.removeListener(listener)
          }
        })
      }
    }
  }, [map, markerPosition])

  const onClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (isAdmin && e.latLng) {
        const newPosition = { lat: e.latLng.lat(), lng: e.latLng.lng() }
        setMarkerPosition(newPosition)
        updateLocationInfo(e.latLng)
      }
    },
    [isAdmin],
  )

  const updateLocationInfo = (position: google.maps.LatLng) => {
    if (onLocationSelect) {
      const geocoder = new google.maps.Geocoder()
      geocoder.geocode({ location: position }, (results, status) => {
        if (status === "OK" && results && results[0]) {
          onLocationSelect({
            address: results[0].formatted_address,
            lat: position.lat(),
            lng: position.lng(),
          })
        }
      })
    }
  }

  return isLoaded ? (
    <div className="relative overflow-hidden rounded-lg">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={searchedLocation || initialLocation}
        options={mapOptions}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={onClick}
      >
        <Marker position={markerPosition} onClick={toggleInfoWindow}>
          {infoWindowOpen && markerContent && (
            <InfoWindow onCloseClick={toggleInfoWindow}>
              <div>{markerContent}</div>
            </InfoWindow>
          )}
        </Marker>
      </GoogleMap>

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle 550px at 50% 50%, transparent 0%, rgba(255,255,255,0.7) 520px, white 550px)",
          zIndex: 1,
        }}
      />
    </div>
  ) : (
    <></>
  )
}

