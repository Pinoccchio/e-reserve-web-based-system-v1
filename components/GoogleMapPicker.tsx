"use client"

import { useState, useCallback, useEffect } from "react"
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api"

interface GoogleMapPickerProps {
  onLocationSelect: (location: { address: string; lat: number; lng: number } | null) => void
  initialLocation?: { lat: number; lng: number }
  searchedLocation?: { lat: number; lng: number }
}

const mapContainerStyle = {
  width: "100%",
  height: "400px",
}

const bagumbayanCenter = {
  lat: 13.3553,
  lng: 123.3242,
}

export function GoogleMapPicker({ onLocationSelect, initialLocation, searchedLocation }: GoogleMapPickerProps) {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
    libraries: ["places"],
  })

  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [markerPosition, setMarkerPosition] = useState<google.maps.LatLngLiteral | null>(null)

  useEffect(() => {
    if (searchedLocation) {
      setMarkerPosition(searchedLocation)
      map?.panTo(searchedLocation)
    }
  }, [searchedLocation, map])

  const onLoad = useCallback(
    (map: google.maps.Map) => {
      map.setCenter(bagumbayanCenter)
      map.setZoom(14) // Adjust this value to get the desired initial zoom level
      setMap(map)
      if (initialLocation) {
        setMarkerPosition(initialLocation)
        map.setCenter(initialLocation)
      }
    },
    [initialLocation],
  )

  const onUnmount = useCallback(() => {
    setMap(null)
  }, [])

  const onClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      setMarkerPosition({ lat: e.latLng.lat(), lng: e.latLng.lng() })
      updateLocationInfo(e.latLng)
    }
  }, [])

  const updateLocationInfo = (position: google.maps.LatLng) => {
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

  return isLoaded ? (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={initialLocation || bagumbayanCenter}
      zoom={14}
      onLoad={onLoad}
      onUnmount={onUnmount}
      onClick={onClick}
    >
      {markerPosition && <Marker position={markerPosition} />}
    </GoogleMap>
  ) : (
    <></>
  )
}

