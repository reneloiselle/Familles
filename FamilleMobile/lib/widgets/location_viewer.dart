import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../config/supabase_config.dart';

class LocationViewer extends StatefulWidget {
  final String address;
  final VoidCallback onClose;

  const LocationViewer({
    super.key,
    required this.address,
    required this.onClose,
  });

  @override
  State<LocationViewer> createState() => _LocationViewerState();
}

class _LocationViewerState extends State<LocationViewer> {
  GoogleMapController? _mapController;
  LatLng? _location;
  LatLng _mapCenter = const LatLng(45.5017, -73.5673); // Montréal par défaut
  bool _isLoading = true;
  String? _apiKey;

  @override
  void initState() {
    super.initState();
    _loadApiKey();
    _getCurrentLocation();
    if (widget.address.isNotEmpty) {
      _geocodeAddress(widget.address);
    }
  }

  @override
  void dispose() {
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
      });
    } catch (e) {
      // Ignorer les erreurs de géolocalisation
    }
  }

  Future<void> _geocodeAddress(String address) async {
    if (_apiKey == null || _apiKey!.isEmpty || address.isEmpty) {
      setState(() => _isLoading = false);
      return;
    }

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

        setState(() {
          _location = LatLng(lat, lng);
          _mapCenter = LatLng(lat, lng);
          _isLoading = false;
        });

        _mapController?.animateCamera(
          CameraUpdate.newLatLngZoom(_mapCenter, 15),
        );
      } else {
        setState(() => _isLoading = false);
      }
    } catch (e) {
      setState(() => _isLoading = false);
    }
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
              const Expanded(
                child: Text(
                  'Localisation',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close),
                onPressed: widget.onClose,
              ),
            ],
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.grey.shade50,
              border: Border.all(color: Colors.grey.shade300),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              widget.address,
              style: const TextStyle(fontSize: 14),
            ),
          ),
          const SizedBox(height: 16),
          if (_apiKey != null && _apiKey!.isNotEmpty)
            SizedBox(
              height: 300,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: _isLoading
                    ? const Center(child: CircularProgressIndicator())
                    : GoogleMap(
                        key: ValueKey(_apiKey),
                        initialCameraPosition: CameraPosition(
                          target: _mapCenter,
                          zoom: _location != null ? 15 : 10,
                        ),
                        onMapCreated: (controller) {
                          _mapController = controller;
                          // S'assurer que la carte est centrée après création
                          if (_location != null) {
                            controller.animateCamera(
                              CameraUpdate.newLatLngZoom(_location!, 15),
                            );
                          } else if (_mapCenter != const LatLng(45.5017, -73.5673)) {
                            controller.animateCamera(
                              CameraUpdate.newLatLngZoom(_mapCenter, 10),
                            );
                          }
                        },
                        markers: _location != null
                            ? {
                                Marker(
                                  markerId: const MarkerId('location'),
                                  position: _location!,
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
              height: 400,
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
                  ],
                ),
              ),
            ),
          if (_location != null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                border: Border.all(color: Colors.blue.shade200),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                'Coordonnées : ${_location!.latitude.toStringAsFixed(6)}, ${_location!.longitude.toStringAsFixed(6)}',
                style: TextStyle(fontSize: 12, color: Colors.blue.shade700),
              ),
            ),
          ],
          const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}

