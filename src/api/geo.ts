import apiClient from './client';

export interface PlaceResult {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface DirectionsResult {
  coordinates: [number, number][];
  distance_m: number;
  duration_s: number;
  source: string;
}

export const geoApi = {
  async search(
    query: string,
    opts?: { limit?: number; proximity?: { longitude: number; latitude: number } }
  ): Promise<PlaceResult[]> {
    const params: Record<string, string | number> = {
      q: query,
      limit: opts?.limit ?? 5,
    };
    if (
      opts?.proximity &&
      Number.isFinite(opts.proximity.longitude) &&
      Number.isFinite(opts.proximity.latitude)
    ) {
      params.proximity = `${opts.proximity.longitude},${opts.proximity.latitude}`;
    }
    const response = await apiClient.get<{ results: PlaceResult[]; source: string }>(
      '/api/v2/geo/search',
      { params }
    );
    return response.data.results || [];
  },

  async reverse(latitude: number, longitude: number): Promise<PlaceResult | null> {
    const response = await apiClient.get<{ result: PlaceResult | null }>(
      '/api/v2/geo/reverse',
      { params: { lat: latitude, lng: longitude } }
    );
    return response.data.result || null;
  },

  async getMapboxToken(): Promise<{ access_token: string; style_url?: string }> {
    const response = await apiClient.get<{ access_token: string; style_url?: string }>(
      '/api/v2/geo/mapbox-token'
    );
    return response.data;
  },

  async directions(opts: {
    from: { latitude: number; longitude: number };
    to: { latitude: number; longitude: number };
    profile?: string;
  }): Promise<DirectionsResult> {
    const response = await apiClient.get<DirectionsResult>('/api/v2/geo/directions', {
      params: {
        from_lat: opts.from.latitude,
        from_lng: opts.from.longitude,
        to_lat: opts.to.latitude,
        to_lng: opts.to.longitude,
        profile: opts.profile,
      },
    });
    return response.data;
  },
};
