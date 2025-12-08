'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useLoadScript, GoogleMap, Marker } from '@react-google-maps/api'
import { MapPin, X } from 'lucide-react'

const libraries: ('places')[] = ['places']

interface LocationViewerProps {
  address: string
  onClose: () => void
}

const mapContainerStyle = {
  width: '100%',
  height: '400px',
}

const defaultCenter = {
  lat: 45.5017, // Montréal par défaut
  lng: -73.5673,
}

export function LocationViewer({ address, onClose }: LocationViewerProps) {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [mapCenter, setMapCenter] = useState(defaultCenter)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [isGeocoding, setIsGeocoding] = useState(false)
  const geocodedAddressRef = useRef<string>('')

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
  
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries,
  })

  // Geocoder l'adresse quand la carte est chargée (une seule fois par adresse)
  useEffect(() => {
    if (!isLoaded || !address || !address.trim()) return
    if (geocodedAddressRef.current === address) return // Déjà géocodé
    
    setIsGeocoding(true)
    geocodedAddressRef.current = address
    
    const geocoder = new google.maps.Geocoder()
    geocoder.geocode({ address: address }, (results, status) => {
      setIsGeocoding(false)
      if (status === 'OK' && results && results[0]) {
        const loc = results[0].geometry.location
        const lat = loc.lat()
        const lng = loc.lng()
        
        setLocation({ lat, lng })
        setMapCenter({ lat, lng })
      } else {
        // En cas d'erreur, garder la référence pour éviter de réessayer en boucle
        console.warn('Geocoding failed:', status)
      }
    })
  }, [isLoaded, address])

  // Réinitialiser quand l'adresse change
  useEffect(() => {
    setLocation(null)
    setMapCenter(defaultCenter)
    geocodedAddressRef.current = ''
  }, [address])

  // Empêcher le scroll du body quand la modale est ouverte
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  if (!apiKey) {
    return (
      <>
        <div
          className="fixed inset-0 bg-black/50 z-50 transition-opacity duration-300"
          onClick={onClose}
          aria-hidden="true"
        />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Localisation
                </h3>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-yellow-700">
                <p className="font-medium mb-2">Clé API Google Maps non configurée</p>
                <p className="text-sm">{address}</p>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (loadError) {
    return (
      <>
        <div
          className="fixed inset-0 bg-black/50 z-50 transition-opacity duration-300"
          onClick={onClose}
          aria-hidden="true"
        />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Localisation
                </h3>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
                <p className="font-medium mb-2">Erreur lors du chargement de Google Maps</p>
                <p className="text-sm">{address}</p>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Localisation
              </h3>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Fermer"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-1">Adresse :</p>
              <p className="text-sm text-gray-900">{address}</p>
            </div>

            {!isLoaded && (
              <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center" style={mapContainerStyle}>
                <p className="text-gray-600">Chargement de la carte...</p>
              </div>
            )}

            {isLoaded && (
              <>
                {isGeocoding && (
                  <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center" style={mapContainerStyle}>
                    <p className="text-gray-600">Recherche de la localisation...</p>
                  </div>
                )}
                
                {!isGeocoding && (
                  <div className="border border-gray-300 rounded-lg overflow-hidden">
                    <GoogleMap
                      mapContainerStyle={mapContainerStyle}
                      center={mapCenter}
                      zoom={location ? 15 : 10}
                      onLoad={(map) => {
                        if (!map) return
                        setMap(map)
                      }}
                      options={{
                        disableDefaultUI: false,
                        zoomControl: true,
                        streetViewControl: true,
                        mapTypeControl: false,
                        fullscreenControl: true,
                      }}
                    >
                      {location && (
                        <Marker
                          position={location}
                          animation={google.maps.Animation.DROP}
                        />
                      )}
                    </GoogleMap>
                  </div>
                )}

                {location && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                    <p className="font-medium text-blue-900 mb-1">Coordonnées :</p>
                    <p className="text-blue-700">
                      {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                    </p>
                  </div>
                )}

                {!location && !isGeocoding && isLoaded && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
                    <p>Impossible de localiser cette adresse sur la carte.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

