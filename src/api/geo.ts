import apiClient from './client';

export interface PlaceResult {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
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
};
