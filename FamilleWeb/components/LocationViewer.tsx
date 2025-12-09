'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useLoadScript, GoogleMap, Marker, Autocomplete } from '@react-google-maps/api'
import { MapPin, X, Search } from 'lucide-react'

const libraries: ('places')[] = ['places']

interface LocationViewerProps {
  address: string
  onClose: () => void
  onSave?: (newAddress: string) => void
  canSave?: boolean
}

const mapContainerStyle = {
  width: '100%',
  height: '400px',
}

const defaultCenter = {
  lat: 45.5017, // Montréal par défaut
  lng: -73.5673,
}

export function LocationViewer({ address, onClose, onSave, canSave = false }: LocationViewerProps) {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [mapCenter, setMapCenter] = useState(defaultCenter)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [searchAddress, setSearchAddress] = useState(address)
  const [searchResults, setSearchResults] = useState<google.maps.GeocoderResult[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([])
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null)
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null)
  const geocodedAddressRef = useRef<string>('')
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
  
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries,
  })

  // Initialiser les services Places quand la carte est chargée
  useEffect(() => {
    if (isLoaded && map) {
      autocompleteServiceRef.current = new google.maps.places.AutocompleteService()
      placesServiceRef.current = new google.maps.places.PlacesService(map)
    }
  }, [isLoaded, map])

  // Obtenir la position de l'utilisateur
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        (error) => {
          console.warn('Geolocation error:', error)
          // Continuer sans la position de l'utilisateur
        },
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 60000, // Cache pendant 1 minute
        }
      )
    }
  }, [])

  // Calculer la distance entre deux points (formule de Haversine)
  const calculateDistance = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number => {
    const R = 6371 // Rayon de la Terre en km
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLng = ((lng2 - lng1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  // Geocoder l'adresse quand la carte est chargée (une seule fois par adresse)
  useEffect(() => {
    if (!isLoaded || !address || !address.trim()) return
    if (geocodedAddressRef.current === address) return // Déjà géocodé
    
    setIsGeocoding(true)
    geocodedAddressRef.current = address
    
    const geocoder = new google.maps.Geocoder()
    
    // Préparer les options de géocodage avec la position de l'utilisateur si disponible
    const geocodeOptions: google.maps.GeocoderRequest = { address: address }
    
    // Si on a la position de l'utilisateur, créer une zone de recherche autour de cette position
    if (userLocation) {
      const bounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(userLocation.lat - 0.5, userLocation.lng - 0.5),
        new google.maps.LatLng(userLocation.lat + 0.5, userLocation.lng + 0.5)
      )
      geocodeOptions.bounds = bounds
    }
    
    geocoder.geocode(geocodeOptions, (results, status) => {
      setIsGeocoding(false)
      if (status === 'OK' && results && results.length > 0) {
        let bestResult = results[0]
        
        // Si on a la position de l'utilisateur, trouver le résultat le plus proche
        if (userLocation && results.length > 1) {
          let minDistance = Infinity
          for (const result of results) {
            if (result.geometry?.location) {
              const loc = result.geometry.location
              const distance = calculateDistance(
                userLocation.lat,
                userLocation.lng,
                loc.lat(),
                loc.lng()
              )
              if (distance < minDistance) {
                minDistance = distance
                bestResult = result
              }
            }
          }
        }
        
        if (bestResult.geometry?.location) {
          const loc = bestResult.geometry.location
          const lat = loc.lat()
          const lng = loc.lng()
          
          setLocation({ lat, lng })
          setMapCenter({ lat, lng })
        }
      } else if (status === 'ZERO_RESULTS' && userLocation) {
        // Si aucun résultat exact, utiliser la position de l'utilisateur comme fallback
        console.warn('No exact match found, using user location as reference')
        setLocation(userLocation)
        setMapCenter(userLocation)
      } else {
        // En cas d'erreur, garder la référence pour éviter de réessayer en boucle
        console.warn('Geocoding failed:', status)
      }
    })
  }, [isLoaded, address, userLocation])

  // Réinitialiser quand l'adresse change
  useEffect(() => {
    setLocation(null)
    setMapCenter(defaultCenter)
    setSearchAddress(address)
    geocodedAddressRef.current = ''
  }, [address])

  // Rechercher une adresse
  const handleSearch = () => {
    if (!searchAddress || !searchAddress.trim()) return
    
    setIsGeocoding(true)
    setShowSearchResults(false)
    
    const geocoder = new google.maps.Geocoder()
    const geocodeOptions: google.maps.GeocoderRequest = { address: searchAddress }
    
    if (userLocation) {
      const bounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(userLocation.lat - 0.5, userLocation.lng - 0.5),
        new google.maps.LatLng(userLocation.lat + 0.5, userLocation.lng + 0.5)
      )
      geocodeOptions.bounds = bounds
    }
    
    geocoder.geocode(geocodeOptions, (results, status) => {
      setIsGeocoding(false)
      if (status === 'OK' && results && results.length > 0) {
        if (results.length === 1) {
          // Un seul résultat, l'afficher directement
          selectLocation(results[0])
        } else {
          // Plusieurs résultats, les afficher pour sélection
          setSearchResults(results)
          setShowSearchResults(true)
        }
      } else {
        setSearchResults([])
        setShowSearchResults(false)
        alert('Aucun résultat trouvé pour cette adresse.')
      }
    })
  }

  // Sélectionner un résultat
  const selectLocation = (result: google.maps.GeocoderResult) => {
    if (result.geometry?.location) {
      const loc = result.geometry.location
      const lat = loc.lat()
      const lng = loc.lng()
      const formattedAddress = result.formatted_address || searchAddress
      
      setLocation({ lat, lng })
      setMapCenter({ lat, lng })
      setSearchAddress(formattedAddress)
      setShowSearchResults(false)
      geocodedAddressRef.current = formattedAddress
    }
  }

  // Rechercher des suggestions d'autocomplete
  const handleAutocompleteSearch = (input: string) => {
    if (!autocompleteServiceRef.current || !input || input.trim().length < 3) {
      setAutocompleteSuggestions([])
      setShowAutocomplete(false)
      return
    }

    // Annuler la recherche précédente si elle existe
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Délai pour éviter trop de requêtes
    searchTimeoutRef.current = setTimeout(() => {
      if (!autocompleteServiceRef.current) return

      const request: google.maps.places.AutocompletionRequest = {
        input: input,
        types: ['establishment', 'geocode'],
      }

      // Ajouter les bounds si on a la position de l'utilisateur
      if (userLocation) {
        request.bounds = new google.maps.LatLngBounds(
          new google.maps.LatLng(userLocation.lat - 0.5, userLocation.lng - 0.5),
          new google.maps.LatLng(userLocation.lat + 0.5, userLocation.lng + 0.5)
        )
      }

      autocompleteServiceRef.current.getPlacePredictions(request, (predictions, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          setAutocompleteSuggestions(predictions)
          setShowAutocomplete(true)
          setSelectedSuggestionIndex(-1)
        } else {
          setAutocompleteSuggestions([])
          setShowAutocomplete(false)
        }
      })
    }, 300)
  }

  // Sélectionner une suggestion d'autocomplete
  const selectAutocompleteSuggestion = (placeId: string, description: string) => {
    if (!placesServiceRef.current) return

    setSearchAddress(description)
    setShowAutocomplete(false)
    setAutocompleteSuggestions([])

    placesServiceRef.current.getDetails(
      {
        placeId: placeId,
        fields: ['geometry', 'formatted_address', 'name'],
      },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
          const lat = place.geometry.location.lat()
          const lng = place.geometry.location.lng()
          const formattedAddress = place.formatted_address || description

          setLocation({ lat, lng })
          setMapCenter({ lat, lng })
          setSearchAddress(formattedAddress)
          geocodedAddressRef.current = formattedAddress
        }
      }
    )
  }

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

            <div className="mb-4 space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-1">Adresse d'origine :</p>
                <p className="text-sm text-gray-900">{address}</p>
              </div>

              <div className="relative">
                <label htmlFor="location-search" className="block text-xs font-medium text-gray-700 mb-1">
                  Rechercher une autre adresse
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <textarea
                      id="location-search"
                      value={searchAddress}
                      onChange={(e) => {
                        const value = e.target.value
                        setSearchAddress(value)
                        handleAutocompleteSearch(value)
                      }}
                      onKeyDown={(e) => {
                        if (showAutocomplete && autocompleteSuggestions.length > 0) {
                          if (e.key === 'ArrowDown') {
                            e.preventDefault()
                            setSelectedSuggestionIndex((prev) =>
                              prev < autocompleteSuggestions.length - 1 ? prev + 1 : prev
                            )
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault()
                            setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : -1))
                          } else if (e.key === 'Enter') {
                            e.preventDefault()
                            if (selectedSuggestionIndex >= 0) {
                              const suggestion = autocompleteSuggestions[selectedSuggestionIndex]
                              selectAutocompleteSuggestion(suggestion.place_id, suggestion.description)
                            } else if (e.ctrlKey || e.metaKey) {
                              handleSearch()
                            }
                          } else if (e.key === 'Escape') {
                            setShowAutocomplete(false)
                          }
                        } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                          e.preventDefault()
                          handleSearch()
                        }
                      }}
                      onFocus={() => {
                        if (autocompleteSuggestions.length > 0) {
                          setShowAutocomplete(true)
                        }
                      }}
                      onBlur={() => {
                        // Délai pour permettre le clic sur une suggestion
                        setTimeout(() => setShowAutocomplete(false), 200)
                      }}
                      placeholder="Rechercher une adresse..."
                      className="input w-full text-xs resize-none"
                      rows={2}
                      style={{ fontSize: '0.75rem', lineHeight: '1.25rem', padding: '0.375rem 0.5rem' }}
                    />
                    {showAutocomplete && autocompleteSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {autocompleteSuggestions.map((suggestion, index) => (
                          <button
                            key={suggestion.place_id}
                            type="button"
                            onClick={() => selectAutocompleteSuggestion(suggestion.place_id, suggestion.description)}
                            className={`w-full text-left p-2 text-xs hover:bg-blue-50 border-b border-gray-200 last:border-b-0 transition-colors ${
                              index === selectedSuggestionIndex ? 'bg-blue-50' : ''
                            }`}
                          >
                            <p className="font-medium text-gray-900">{suggestion.description}</p>
                            {suggestion.structured_formatting?.secondary_text && (
                              <p className="text-gray-600 mt-0.5">{suggestion.structured_formatting.secondary_text}</p>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleSearch}
                    className="btn btn-sm btn-primary flex items-center justify-center p-2 h-auto"
                    disabled={isGeocoding}
                    title="Rechercher"
                  >
                    <Search className="w-3.5 h-3.5" />
                  </button>
                </div>

                {showSearchResults && searchResults.length > 0 && (
                  <div className="mt-2 border border-gray-300 rounded-lg bg-white shadow-lg max-h-48 overflow-y-auto">
                    <div className="p-2 bg-gray-100 border-b border-gray-300">
                      <p className="text-xs font-medium text-gray-700">
                        {searchResults.length} résultat{searchResults.length > 1 ? 's' : ''} trouvé{searchResults.length > 1 ? 's' : ''}
                      </p>
                    </div>
                    {searchResults.map((result, index) => (
                      <button
                        key={index}
                        onClick={() => selectLocation(result)}
                        className="w-full text-left p-3 hover:bg-blue-50 border-b border-gray-200 last:border-b-0 transition-colors"
                      >
                        <p className="text-sm font-medium text-gray-900">
                          {result.formatted_address}
                        </p>
                        {result.address_components && (
                          <p className="text-xs text-gray-600 mt-1">
                            {result.address_components
                              .filter(comp => comp.types.includes('locality') || comp.types.includes('administrative_area_level_1'))
                              .map(comp => comp.long_name)
                              .join(', ')}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
                  <div className="mt-4 space-y-3">
                    {canSave && onSave && searchAddress && searchAddress !== address && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded">
                        <p className="text-sm font-medium text-green-900 mb-2">
                          Nouvelle adresse sélectionnée
                        </p>
                        <p className="text-xs text-green-700 mb-3">{searchAddress}</p>
                        <button
                          onClick={() => onSave(searchAddress)}
                          className="btn btn-sm btn-primary text-xs px-3 py-2"
                        >
                          Mettre à jour la localisation
                        </button>
                      </div>
                    )}
                                        <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                      <p className="font-medium text-blue-900 mb-1">Coordonnées :</p>
                      <p className="text-blue-700">
                        {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                      </p>
                    </div>

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

