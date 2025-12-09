/// Configuration Supabase
/// 
/// IMPORTANT: Remplacez ces valeurs par celles de votre projet Supabase
/// Vous pouvez les obtenir depuis: Settings > API dans votre projet Supabase
class SupabaseConfig {
  // TODO: Remplacez par votre URL Supabase
  static const String url = 'https://zoremxppfoiatdaxgukx.supabase.co';
  
  // TODO: Remplacez par votre clé anonyme Supabase (anon key)
  static const String anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvcmVteHBwZm9pYXRkYXhndWt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNTY5NTcsImV4cCI6MjA3OTkzMjk1N30.yBbJSYOzejO4r-lC6Mntd2t4BEE2_CHTnRQL_EmVsH8';
}

/// Configuration Google Maps
/// 
/// IMPORTANT: Remplacez cette valeur par votre clé API Google Maps
/// Vous pouvez l'obtenir depuis: https://console.cloud.google.com/
/// Activez les APIs suivantes:
/// - Maps SDK for Android
/// - Maps SDK for iOS
/// - Places API
/// - Geocoding API
class GoogleMapsConfig {
  // TODO: Remplacez par votre clé API Google Maps
  static const String apiKey = 'AIzaSyCXQZuzzjNFl9HGP0P3Vb1XEngPK3cKnrk';
}

/// Configuration de l'API du serveur web
/// 
/// IMPORTANT: Remplacez cette valeur par l'URL de votre application web Next.js
/// 
/// Options:
/// - Développement local (simulateur iOS/Android): http://localhost:3000
/// - Développement local (appareil physique): http://VOTRE_IP_LOCALE:3000 (ex: http://192.168.1.100:3000)
/// - Production: https://votre-app.vercel.app ou votre URL de déploiement
/// 
/// Pour trouver votre IP locale:
/// - macOS/Linux: ifconfig | grep "inet " | grep -v 127.0.0.1
/// - Windows: ipconfig (cherchez IPv4 Address)
class ApiConfig {
  // TODO: Remplacez par l'URL de votre serveur web Next.js
  // 
  // Pour simulateur iOS/Android: http://localhost:3000
  // Pour simulateur Android: http://10.0.2.2:3000
  // Pour appareil physique: http://VOTRE_IP_LOCALE:3000
  // 
  // Votre IP locale détectée: 10.0.0.122
  // Si vous utilisez un appareil physique, utilisez cette IP:
  static const String baseUrl = 'http://10.0.0.122:3000';
  
  // Pour simulateur iOS (sur macOS):
  // static const String baseUrl = 'http://localhost:3000';
  
  // Pour simulateur Android:
  // static const String baseUrl = 'http://10.0.2.2:3000';
  
  // Pour production (déploiement):
  // static const String baseUrl = 'https://votre-app.vercel.app';
}


