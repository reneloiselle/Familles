import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:google_places_flutter/google_places_flutter.dart';
import 'package:google_places_flutter/model/prediction.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../config/supabase_config.dart';

class LocationPicker extends StatefulWidget {
  final String? initialValue;
  final Function(String address, double? lat, double? lng) onLocationSelected;
  final VoidCallback? onClose;

  const LocationPicker({
    super.key,
    this.initialValue,
    required this.onLocationSelected,
    this.onClose,
  });

  @override
  State<LocationPicker> createState() => _LocationPickerState();
}

class _LocationPickerState extends State<LocationPicker> {
  GoogleMapController? _mapController;
  LatLng? _selectedLocation;
  LatLng _mapCenter = const LatLng(45.5017, -73.5673); // Montréal par défaut
  final TextEditingController _addressController = TextEditingController();
  final TextEditingController _searchController = TextEditingController();
  String? _apiKey;
  bool _isLoadingPlace = false;

  @override
  void initState() {
    super.initState();
    _addressController.text = widget.initialValue ?? '';
    _loadApiKey();
    _getCurrentLocation();
    if (widget.initialValue != null && widget.initialValue!.isNotEmpty) {
      _geocodeAddress(widget.initialValue!);
    }
  }

  @override
  void dispose() {
    _addressController.dispose();
    _searchController.dispose();
    _mapController?.dispose();
    super.dispose();
  }

  Future<void> _loadApiKey() async {
    setState(() {
      _apiKey = GoogleMapsConfig.apiKey;
    });
  }

  Future<void> _getCurrentLocation() async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        return;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          return;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        return;
      }

      Position position = await Geolocator.getCurrentPosition();
      setState(() {
        _mapCenter = LatLng(position.latitude, position.longitude);
        if (_selectedLocation == null) {
          _selectedLocation = _mapCenter;
        }
      });
      _mapController?.animateCamera(
        CameraUpdate.newLatLng(_mapCenter),
      );
    } catch (e) {
      // Ignorer les erreurs de géolocalisation
    }
  }

  Future<void> _geocodeAddress(String address) async {
    if (_apiKey == null || address.isEmpty) return;

    try {
      final url = Uri.parse(
        'https://maps.googleapis.com/maps/api/geocode/json?address=${Uri.encodeComponent(address)}&key=$_apiKey',
      );
      final response = await http.get(url);
      final data = json.decode(response.body);

      if (data['status'] == 'OK' && data['results'].isNotEmpty) {
        final result = data['results'][0];
        final location = result['geometry']['location'];
        final lat = location['lat'] as double;
        final lng = location['lng'] as double;
        final formattedAddress = result['formatted_address'] as String;

        setState(() {
          _selectedLocation = LatLng(lat, lng);
          _mapCenter = LatLng(lat, lng);
          _addressController.text = formattedAddress;
          _searchController.text = formattedAddress;
        });

        _mapController?.animateCamera(
          CameraUpdate.newLatLngZoom(_mapCenter, 15),
        );
      }
    } catch (e) {
      // Erreur de géocodage
    }
  }

  Future<void> _onPlaceSelected(Prediction prediction) async {
    if (_apiKey == null || _apiKey!.isEmpty || prediction.placeId == null) return;

    setState(() {
      _isLoadingPlace = true;
    });

    try {
      final url = Uri.parse(
        'https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.placeId}&key=$_apiKey&fields=geometry,formatted_address,name,address_components&language=fr',
      );
      final response = await http.get(url);
      final data = json.decode(response.body);

      if (data['status'] == 'OK' && data['result'] != null) {
        final result = data['result'];
        final location = result['geometry']['location'];
        final lat = location['lat'] as double;
        final lng = location['lng'] as double;
        final address = result['formatted_address'] as String;

        if (mounted) {
          setState(() {
            _selectedLocation = LatLng(lat, lng);
            _mapCenter = LatLng(lat, lng);
            _addressController.text = address;
            _searchController.text = address;
            _isLoadingPlace = false;
          });

          _mapController?.animateCamera(
            CameraUpdate.newLatLngZoom(_mapCenter, 15),
          );

          widget.onLocationSelected(address, lat, lng);
        }
      } else {
        debugPrint('Erreur Place Details API: ${data['status']} - ${data['error_message'] ?? ''}');
        if (mounted) {
          setState(() {
            _isLoadingPlace = false;
          });
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Erreur: ${data['error_message'] ?? 'Impossible de récupérer les détails du lieu'}'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      debugPrint('Erreur lors de la sélection du lieu: $e');
      if (mounted) {
        setState(() {
          _isLoadingPlace = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _reverseGeocode(LatLng location) async {
    if (_apiKey == null) return;

    try {
      final url = Uri.parse(
        'https://maps.googleapis.com/maps/api/geocode/json?latlng=${location.latitude},${location.longitude}&key=$_apiKey',
      );
      final response = await http.get(url);
      final data = json.decode(response.body);

      if (data['status'] == 'OK' && data['results'].isNotEmpty) {
        final formattedAddress = data['results'][0]['formatted_address'] as String;
        setState(() {
          _addressController.text = formattedAddress;
          _searchController.text = formattedAddress;
        });
        widget.onLocationSelected(formattedAddress, location.latitude, location.longitude);
      } else {
        // Si le géocodage échoue, utiliser les coordonnées
        final coordAddress = '${location.latitude.toStringAsFixed(6)}, ${location.longitude.toStringAsFixed(6)}';
        setState(() {
          _addressController.text = coordAddress;
          _searchController.text = coordAddress;
        });
        widget.onLocationSelected(coordAddress, location.latitude, location.longitude);
      }
    } catch (e) {
      // Erreur de reverse geocoding
      final coordAddress = '${location.latitude.toStringAsFixed(6)}, ${location.longitude.toStringAsFixed(6)}';
      setState(() {
        _addressController.text = coordAddress;
        _searchController.text = coordAddress;
      });
      widget.onLocationSelected(coordAddress, location.latitude, location.longitude);
    }
  }

  void _onMapTap(LatLng location) {
    setState(() {
      _selectedLocation = location;
    });
    _reverseGeocode(location);
  }


  void _clearLocation() {
    setState(() {
      _selectedLocation = null;
      _addressController.clear();
    });
    widget.onLocationSelected('', null, null);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
        left: 16,
        right: 16,
        top: 16,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: const Text(
                  'Sélectionner une localisation',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close),
                onPressed: widget.onClose ?? () => Navigator.pop(context),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (_apiKey == null)
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.yellow.shade50,
                border: Border.all(color: Colors.yellow.shade300),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Text(
                'Clé API Google Maps non configurée. Vous pouvez toujours saisir manuellement une adresse.',
                style: TextStyle(fontSize: 12),
              ),
            ),
          const SizedBox(height: 12),
          if (_apiKey != null && _apiKey!.isNotEmpty)
            GooglePlaceAutoCompleteTextField(
              textEditingController: _searchController,
              googleAPIKey: _apiKey!,
              inputDecoration: InputDecoration(
                labelText: 'Rechercher une adresse',
                border: const OutlineInputBorder(),
                hintText: 'Tapez une adresse ou cliquez sur la carte',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _isLoadingPlace
                    ? const Padding(
                        padding: EdgeInsets.all(12.0),
                        child: SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                      )
                    : _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear),
                            onPressed: () {
                              setState(() {
                                _searchController.clear();
                                _addressController.clear();
                                _selectedLocation = null;
                              });
                            },
                          )
                        : null,
              ),
              debounceTime: 400,
              countries: const ['fr', 'ca'],
              isLatLngRequired: true,
              getPlaceDetailWithLatLng: (prediction) {
                _onPlaceSelected(prediction);
              },
              itemClick: (prediction) {
                _searchController.text = prediction.description ?? '';
                _onPlaceSelected(prediction);
              },
              itemBuilder: (context, index, prediction) {
                return Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  child: Row(
                    children: [
                      Icon(
                        Icons.location_on,
                        color: Colors.blue.shade700,
                        size: 24,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              prediction.structuredFormatting?.mainText ?? prediction.description ?? '',
                              style: const TextStyle(
                                fontWeight: FontWeight.w500,
                                fontSize: 14,
                              ),
                            ),
                            if (prediction.structuredFormatting?.secondaryText != null) ...[
                              const SizedBox(height: 2),
                              Text(
                                prediction.structuredFormatting!.secondaryText!,
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey.shade600,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              },
              seperatedBuilder: Divider(
                height: 1,
                color: Colors.grey.shade200,
              ),
              containerHorizontalPadding: 0,
              containerVerticalPadding: 0,
            )
          else
            TextField(
              controller: _searchController,
              decoration: const InputDecoration(
                labelText: 'Rechercher une adresse',
                border: OutlineInputBorder(),
                hintText: 'Tapez une adresse ou cliquez sur la carte',
                prefixIcon: Icon(Icons.search),
              ),
              onSubmitted: (value) {
                if (value.trim().isNotEmpty) {
                  _geocodeAddress(value.trim());
                }
              },
            ),
          const SizedBox(height: 12),
          if (_apiKey != null && _apiKey!.isNotEmpty)
            SizedBox(
              height: 250,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: GoogleMap(
                  key: ValueKey(_apiKey),
                  initialCameraPosition: CameraPosition(
                    target: _mapCenter,
                    zoom: _selectedLocation != null ? 15 : 10,
                  ),
                  onMapCreated: (controller) {
                    _mapController = controller;
                    debugPrint('Google Maps créé avec succès');
                    debugPrint('Centre de la carte: ${_mapCenter.latitude}, ${_mapCenter.longitude}');
                    // S'assurer que la carte est centrée après création
                    Future.delayed(const Duration(milliseconds: 500), () {
                      if (_selectedLocation != null) {
                        controller.animateCamera(
                          CameraUpdate.newLatLngZoom(_selectedLocation!, 15),
                        );
                      } else if (_mapCenter != const LatLng(45.5017, -73.5673)) {
                        controller.animateCamera(
                          CameraUpdate.newLatLngZoom(_mapCenter, 10),
                        );
                      }
                    });
                  },
                  onTap: _onMapTap,
                  markers: _selectedLocation != null
                      ? {
                          Marker(
                            markerId: const MarkerId('selected_location'),
                            position: _selectedLocation!,
                          ),
                        }
                      : {},
                  myLocationEnabled: true,
                  myLocationButtonEnabled: true,
                  zoomControlsEnabled: true,
                  mapType: MapType.normal,
                  compassEnabled: true,
                  rotateGesturesEnabled: true,
                  scrollGesturesEnabled: true,
                  tiltGesturesEnabled: true,
                  zoomGesturesEnabled: true,
                ),
              ),
            )
          else
            Container(
              height: 300,
              decoration: BoxDecoration(
                color: Colors.grey.shade200,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.map, size: 48, color: Colors.grey),
                    SizedBox(height: 8),
                    Text(
                      'Clé API Google Maps non configurée',
                      style: TextStyle(color: Colors.grey),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'Vous pouvez toujours saisir manuellement une adresse',
                      style: TextStyle(fontSize: 12, color: Colors.grey),
                    ),
                  ],
                ),
              ),
            ),
          if (_selectedLocation != null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                border: Border.all(color: Colors.blue.shade200),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Localisation sélectionnée :',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _addressController.text,
                    style: const TextStyle(fontSize: 12),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Coordonnées : ${_selectedLocation!.latitude.toStringAsFixed(6)}, ${_selectedLocation!.longitude.toStringAsFixed(6)}',
                    style: TextStyle(fontSize: 10, color: Colors.blue.shade700),
                  ),
                ],
              ),
            ),
          ],
          if (_addressController.text.isNotEmpty) ...[
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: _clearLocation,
              icon: const Icon(Icons.clear),
              label: const Text('Effacer la localisation'),
            ),
          ],
          const SizedBox(height: 8),
          ElevatedButton(
            onPressed: () {
              widget.onLocationSelected(
                _addressController.text,
                _selectedLocation?.latitude,
                _selectedLocation?.longitude,
              );
              if (widget.onClose != null) {
                widget.onClose!();
              } else {
                Navigator.pop(context);
              }
            },
            child: const Text('Confirmer'),
          ),
          const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}

