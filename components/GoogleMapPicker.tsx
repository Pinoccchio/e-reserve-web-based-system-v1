"use client"

import type React from "react"
import { useState, useCallback, useRef, useEffect } from "react"
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from "@react-google-maps/api"

interface GoogleMapPickerProps {
  initialLocation: { lat: number; lng: number }
  markerContent?: React.ReactNode
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

export function GoogleMapPicker({ initialLocation, markerContent }: GoogleMapPickerProps) {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
    libraries: ["places"],
  })

  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [infoWindowOpen, setInfoWindowOpen] = useState(false)
  const isDragging = useRef(false)

  const onLoad = useCallback(
    (map: google.maps.Map) => {
      map.setCenter(initialLocation)
      setMap(map)
      setInfoWindowOpen(true)
    },
    [initialLocation],
  )

  const onUnmount = useCallback(() => {
    setMap(null)
  }, [])

  const toggleInfoWindow = () => {
    setInfoWindowOpen(!infoWindowOpen)
  }

  useEffect(() => {
    if (map) {
      const dragStartListener = map.addListener("dragstart", () => {
        isDragging.current = true
      })

      const dragEndListener = map.addListener("dragend", () => {
        isDragging.current = false
        setTimeout(() => {
          if (!isDragging.current) {
            map.panTo(initialLocation)
          }
        }, 200) // Short delay to ensure drag has fully ended
      })

      const mouseDownListener = map.addListener("mousedown", () => {
        isDragging.current = true
      })

      const mouseUpListener = map.addListener("mouseup", () => {
        isDragging.current = false
        setTimeout(() => {
          if (!isDragging.current) {
            map.panTo(initialLocation)
          }
        }, 200)
      })

      const touchStartListener = map.addListener("touchstart", () => {
        isDragging.current = true
      })

      const touchEndListener = map.addListener("touchend", () => {
        isDragging.current = false
        setTimeout(() => {
          if (!isDragging.current) {
            map.panTo(initialLocation)
          }
        }, 200)
      })

      return () => {
        if (google && google.maps) {
          google.maps.event.removeListener(dragStartListener)
          google.maps.event.removeListener(dragEndListener)
          google.maps.event.removeListener(mouseDownListener)
          google.maps.event.removeListener(mouseUpListener)
          google.maps.event.removeListener(touchStartListener)
          google.maps.event.removeListener(touchEndListener)
        }
      }
    }
  }, [map, initialLocation])

  return isLoaded ? (
    <div className="relative overflow-hidden rounded-lg">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={initialLocation}
        options={mapOptions}
        onLoad={onLoad}
        onUnmount={onUnmount}
      >
        <Marker position={initialLocation} onClick={toggleInfoWindow}>
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

