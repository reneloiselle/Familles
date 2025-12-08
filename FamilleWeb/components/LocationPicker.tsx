'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useLoadScript, GoogleMap, Marker, Autocomplete } from '@react-google-maps/api'
import { MapPin, X } from 'lucide-react'

const libraries: ('places')[] = ['places']

interface LocationPickerProps {
  value: string
  onChange: (address: string, lat?: number, lng?: number) => void
  onClose?: () => void
}

const mapContainerStyle = {
  width: '100%',
  height: '400px',
}

const defaultCenter = {
  lat: 45.5017, // Montréal par défaut
  lng: -73.5673,
}

export function LocationPicker({ value, onChange, onClose }: LocationPickerProps) {
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [mapCenter, setMapCenter] = useState(defaultCenter)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const [address, setAddress] = useState(value)

  // Synchroniser avec la valeur externe
  useEffect(() => {
    setAddress(value)
  }, [value])

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
  
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries,
  })

  const onPlaceChanged = useCallback(() => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace()
      
      if (place.geometry?.location) {
        const lat = place.geometry.location.lat()
        const lng = place.geometry.location.lng()
        const formattedAddress = place.formatted_address || place.name || ''
        
        setSelectedLocation({ lat, lng })
        setMapCenter({ lat, lng })
        setAddress(formattedAddress)
        onChange(formattedAddress, lat, lng)
      }
    }
  }, [onChange])

  const onMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const lat = e.latLng.lat()
      const lng = e.latLng.lng()
      
      setSelectedLocation({ lat, lng })
      setMapCenter({ lat, lng })
      
      // Reverse geocoding pour obtenir l'adresse
      if (map) {
        const geocoder = new google.maps.Geocoder()
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const formattedAddress = results[0].formatted_address
            setAddress(formattedAddress)
            onChange(formattedAddress, lat, lng)
          } else {
            // Si le geocoding échoue, utiliser les coordonnées
            const coordAddress = `${lat.toFixed(6)}, ${lng.toFixed(6)}`
            setAddress(coordAddress)
            onChange(coordAddress, lat, lng)
          }
        })
      }
    }
  }, [map, onChange])

  const handleManualInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAddress = e.target.value
    setAddress(newAddress)
    onChange(newAddress)
  }

  const clearLocation = () => {
    setSelectedLocation(null)
    setAddress('')
    onChange('')
  }

  if (!apiKey) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-yellow-700">
        <p className="font-medium mb-2">Clé API Google Maps non configurée</p>
        <p className="text-sm">
          Pour utiliser la sélection de localisation, ajoutez <code className="bg-yellow-100 px-1 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> dans votre fichier <code className="bg-yellow-100 px-1 rounded">.env.local</code>
        </p>
        <p className="text-xs mt-2">
          Vous pouvez toujours saisir manuellement une adresse dans le champ de texte.
        </p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
        <p className="font-medium mb-2">Erreur lors du chargement de Google Maps</p>
        <p className="text-sm">
          Vérifiez que votre clé API est valide et que les APIs suivantes sont activées :
        </p>
        <ul className="text-sm list-disc list-inside mt-2">
          <li>Maps JavaScript API</li>
          <li>Places API</li>
          <li>Geocoding API</li>
        </ul>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded text-gray-700 text-center">
        Chargement de la carte...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Sélectionner une localisation
        </h3>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div>
        <label htmlFor="autocomplete" className="block text-sm font-medium text-gray-700 mb-1">
          Rechercher une adresse
        </label>
        <Autocomplete
          onLoad={(autocomplete) => {
            autocompleteRef.current = autocomplete
          }}
          onPlaceChanged={onPlaceChanged}
          options={{
            types: ['establishment', 'geocode'],
            fields: ['geometry', 'formatted_address', 'name'],
          }}
        >
          <input
            id="autocomplete"
            type="text"
            value={address}
            onChange={handleManualInput}
            placeholder="Tapez une adresse ou cliquez sur la carte"
            className="input w-full"
          />
        </Autocomplete>
      </div>

      <div className="border border-gray-300 rounded-lg overflow-hidden">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={mapCenter}
          zoom={selectedLocation ? 15 : 10}
          onClick={onMapClick}
          onLoad={setMap}
          options={{
            disableDefaultUI: false,
            zoomControl: true,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: true,
          }}
        >
          {selectedLocation && (
            <Marker
              position={selectedLocation}
              animation={google.maps.Animation.DROP}
            />
          )}
        </GoogleMap>
      </div>

      {selectedLocation && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
          <p className="font-medium text-blue-900">Localisation sélectionnée :</p>
          <p className="text-blue-700">{address}</p>
          <p className="text-blue-600 text-xs mt-1">
            Coordonnées : {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
          </p>
        </div>
      )}

      {address && (
        <button
          type="button"
          onClick={clearLocation}
          className="btn btn-secondary text-sm"
        >
          Effacer la localisation
        </button>
      )}

      <p className="text-xs text-gray-500">
        💡 Tapez une adresse dans le champ de recherche ou cliquez directement sur la carte pour sélectionner un point.
      </p>
    </div>
  )
}

