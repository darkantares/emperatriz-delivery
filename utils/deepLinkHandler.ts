import * as Linking from 'expo-linking';
import Constants from 'expo-constants';

interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Extract coordinates from various URL formats:
 * - geo:lat,lng
 * - geo:lat,lng?q=lat,lng
 * - https://maps.google.com/?q=lat,lng
 * - https://maps.google.com/maps?q=lat,lng
 * - https://www.google.com/maps?q=lat,lng
 * - https://goo.gl/maps/...
 */
export function extractCoordinatesFromUrl(url: string): Coordinates | null {
  try {
    console.log('[DeepLink] Extracting coordinates from URL:', url);

    // Handle geo: scheme
    if (url.startsWith('geo:')) {
      const geoMatch = url.match(/geo:([-\d.]+),([-\d.]+)/);
      if (geoMatch) {
        const latitude = parseFloat(geoMatch[1]);
        const longitude = parseFloat(geoMatch[2]);
        
        if (!isNaN(latitude) && !isNaN(longitude)) {
          console.log('[DeepLink] Extracted coordinates from geo:', { latitude, longitude });
          return { latitude, longitude };
        }
      }
    }

    // Handle https://maps.google.com and similar
    if (url.includes('maps.google.com') || url.includes('google.com/maps') || url.includes('goo.gl/maps')) {
      // Try to extract from q= parameter
      const qMatch = url.match(/[?&]q=([-\d.]+),([-\d.]+)/);
      if (qMatch) {
        const latitude = parseFloat(qMatch[1]);
        const longitude = parseFloat(qMatch[2]);
        
        if (!isNaN(latitude) && !isNaN(longitude)) {
          console.log('[DeepLink] Extracted coordinates from q parameter:', { latitude, longitude });
          return { latitude, longitude };
        }
      }

      // Try to extract from @lat,lng format
      const atMatch = url.match(/@([-\d.]+),([-\d.]+)/);
      if (atMatch) {
        const latitude = parseFloat(atMatch[1]);
        const longitude = parseFloat(atMatch[2]);
        
        if (!isNaN(latitude) && !isNaN(longitude)) {
          console.log('[DeepLink] Extracted coordinates from @ format:', { latitude, longitude });
          return { latitude, longitude };
        }
      }

      // Try to extract from /place/ format
      const placeMatch = url.match(/\/place\/([-\d.]+),([-\d.]+)/);
      if (placeMatch) {
        const latitude = parseFloat(placeMatch[1]);
        const longitude = parseFloat(placeMatch[2]);
        
        if (!isNaN(latitude) && !isNaN(longitude)) {
          console.log('[DeepLink] Extracted coordinates from place format:', { latitude, longitude });
          return { latitude, longitude };
        }
      }
    }

    console.log('[DeepLink] Could not extract coordinates from URL');
    return null;
  } catch (error) {
    console.error('[DeepLink] Error extracting coordinates:', error);
    return null;
  }
}

/**
 * Send coordinates to backend OSRM endpoint
 */
export async function sendCoordinatesToBackend(coordinates: Coordinates): Promise<any> {
  try {
    const apiUrl = Constants.expoConfig?.extra?.apiUrl?.EXPO_PUBLIC_API_URL_DEFAULT || 'http://192.168.100.24:5000';
    
    // Formato: origin_lng,origin_lat;dest_lng,dest_lat
    // Por ahora usamos las mismas coordenadas como origen y destino (puedes ajustar según necesites)
    const coordinatesParam = `${coordinates.longitude},${coordinates.latitude};${coordinates.longitude},${coordinates.latitude}`;
    
    const url = `${apiUrl}/admin/osrm/route?coordinates=${coordinatesParam}&steps=true`;
    
    console.log('[DeepLink] Sending coordinates to backend:', url);

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Backend request failed with status: ${response.status}`);
    }

    const data = await response.json();
    console.log('[DeepLink] Backend response:', JSON.stringify(data, null, 2));
    
    return data;
  } catch (error) {
    console.error('[DeepLink] Error sending coordinates to backend:', error);
    throw error;
  }
}

/**
 * Handle incoming deep link
 */
export async function handleDeepLink(url: string): Promise<void> {
  try {
    console.log('[DeepLink] Handling deep link:', url);

    const coordinates = extractCoordinatesFromUrl(url);
    
    if (coordinates) {
      console.log('[DeepLink] Successfully extracted coordinates:', coordinates);
      
      // Send to backend
      const result = await sendCoordinatesToBackend(coordinates);
      console.log('[DeepLink] Backend processing complete:', result);
      
      // Aquí puedes agregar navegación o actualización de estado si lo necesitas
      // Por ejemplo: navigation.navigate('MapScreen', { coordinates, route: result });
    } else {
      console.log('[DeepLink] No coordinates found in URL');
    }
  } catch (error) {
    console.error('[DeepLink] Error handling deep link:', error);
  }
}

/**
 * Setup deep link listeners
 */
export function setupDeepLinkListeners(): () => void {
  console.log('[DeepLink] Setting up deep link listeners');

  // Handle initial URL when app is opened from a deep link
  Linking.getInitialURL().then((url) => {
    if (url) {
      console.log('[DeepLink] Initial URL detected:', url);
      handleDeepLink(url);
    }
  });

  // Handle URLs when app is already open
  const subscription = Linking.addEventListener('url', (event) => {
    console.log('[DeepLink] URL event received:', event.url);
    handleDeepLink(event.url);
  });

  // Return cleanup function
  return () => {
    console.log('[DeepLink] Cleaning up deep link listeners');
    subscription.remove();
  };
}
