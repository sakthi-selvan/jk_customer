import { MAPBOX_ACCESS_TOKEN } from '../config/mapbox';

interface Coordinate {
  latitude: number;
  longitude: number;
}

interface RouteResponse {
  distance: number; // in meters
  duration: number; // in seconds
  coordinates: Coordinate[];
}

interface GeocodingResult {
  latitude: number;
  longitude: number;
  address: string;
  placeName: string;
}

/**
 * Mapbox Service - Handles all Mapbox API interactions
 * Use this for routing, directions, and geocoding
 */
export class MapboxService {
  private static baseUrl = 'https://api.mapbox.com';

  /**
   * Get driving directions between two points
   * Mapbox has superior routing algorithms with real-time traffic
   */
  static async getDirections(
    origin: Coordinate,
    destination: Coordinate,
    profile: 'driving' | 'driving-traffic' | 'walking' | 'cycling' = 'driving-traffic'
  ): Promise<RouteResponse | null> {
    try {
      const url = `${this.baseUrl}/directions/v5/mapbox/${profile}/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?geometries=geojson&overview=full&steps=true&access_token=${MAPBOX_ACCESS_TOKEN}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];

        return {
          distance: route.distance,
          duration: route.duration,
          coordinates: route.geometry.coordinates.map((coord: [number, number]) => ({
            latitude: coord[1],
            longitude: coord[0],
          })),
        };
      }

      return null;
    } catch (error) {
      console.error('Mapbox directions error:', error);
      return null;
    }
  }

  /**
   * Get multiple route alternatives
   */
  static async getRouteAlternatives(
    origin: Coordinate,
    destination: Coordinate
  ): Promise<RouteResponse[]> {
    try {
      const url = `${this.baseUrl}/directions/v5/mapbox/driving-traffic/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?geometries=geojson&overview=full&alternatives=true&steps=true&access_token=${MAPBOX_ACCESS_TOKEN}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.routes) {
        return data.routes.map((route: any) => ({
          distance: route.distance,
          duration: route.duration,
          coordinates: route.geometry.coordinates.map((coord: [number, number]) => ({
            latitude: coord[1],
            longitude: coord[0],
          })),
        }));
      }

      return [];
    } catch (error) {
      console.error('Mapbox route alternatives error:', error);
      return [];
    }
  }

  /**
   * Reverse geocoding - Convert coordinates to address
   */
  static async reverseGeocode(
    latitude: number,
    longitude: number
  ): Promise<GeocodingResult | null> {
    try {
      const url = `${this.baseUrl}/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAPBOX_ACCESS_TOKEN}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const feature = data.features[0];

        return {
          latitude,
          longitude,
          address: feature.place_name,
          placeName: feature.text,
        };
      }

      return null;
    } catch (error) {
      console.error('Mapbox reverse geocode error:', error);
      return null;
    }
  }

  /**
   * Forward geocoding - Convert address to coordinates
   */
  static async geocode(address: string): Promise<GeocodingResult[]> {
    try {
      const encodedAddress = encodeURIComponent(address);
      const url = `${this.baseUrl}/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${MAPBOX_ACCESS_TOKEN}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.features) {
        return data.features.map((feature: any) => ({
          latitude: feature.center[1],
          longitude: feature.center[0],
          address: feature.place_name,
          placeName: feature.text,
        }));
      }

      return [];
    } catch (error) {
      console.error('Mapbox geocode error:', error);
      return [];
    }
  }

  /**
   * Get static map image URL
   * Useful for thumbnails and previews
   */
  static getStaticMapUrl(
    latitude: number,
    longitude: number,
    width: number = 600,
    height: number = 400,
    zoom: number = 14
  ): string {
    return `${this.baseUrl}/styles/v1/mapbox/streets-v12/static/pin-s+ff0000(${longitude},${latitude})/${longitude},${latitude},${zoom},0/${width}x${height}@2x?access_token=${MAPBOX_ACCESS_TOKEN}`;
  }

  /**
   * Get static map with route
   */
  static getStaticRouteMapUrl(
    origin: Coordinate,
    destination: Coordinate,
    width: number = 600,
    height: number = 400
  ): string {
    const path = `path-5+6B46C1-0.8(${encodeURIComponent(`polyline(${origin.latitude},${origin.longitude},${destination.latitude},${destination.longitude})`)})`;
    return `${this.baseUrl}/styles/v1/mapbox/streets-v12/static/${path}/auto/${width}x${height}@2x?access_token=${MAPBOX_ACCESS_TOKEN}`;
  }
}
