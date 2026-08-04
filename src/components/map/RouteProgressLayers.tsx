import React, { useMemo } from 'react';
import Mapbox from '@rnmapbox/maps';
import type { LngLat } from '../../utils/routeProgress';

/** Google Maps navigation colors */
export const GMAPS_ROUTE = {
  remaining: '#4285F4',
  remainingDark: '#1A73E8',
  travelled: '#B0B3B8',
  casing: '#FFFFFF',
} as const;

interface RouteProgressLayersProps {
  travelled: LngLat[] | null;
  remaining: LngLat[] | null;
  idPrefix?: string;
}

function toLineFeature(coords: LngLat[] | null) {
  if (!coords || coords.length < 2) return null;
  return {
    type: 'Feature' as const,
    geometry: { type: 'LineString' as const, coordinates: coords },
    properties: {},
  };
}

/**
 * Google Maps–style route: white casing, grey travelled, blue remaining on top.
 */
export const RouteProgressLayers: React.FC<RouteProgressLayersProps> = ({
  travelled,
  remaining,
  idPrefix = 'gmaps',
}) => {
  const travelledFeature = useMemo(() => toLineFeature(travelled), [travelled]);
  const remainingFeature = useMemo(() => toLineFeature(remaining), [remaining]);

  if (!travelledFeature && !remainingFeature) return null;

  const casingId = `${idPrefix}-casing`;
  const travelledId = `${idPrefix}-travelled`;
  const remainingId = `${idPrefix}-remaining`;
  const remainingBorderId = `${idPrefix}-remaining-border`;

  return (
    <>
      {remainingFeature && (
        <Mapbox.ShapeSource id={`${idPrefix}-src-casing`} shape={remainingFeature}>
          <Mapbox.LineLayer
            id={casingId}
            style={{
              lineColor: GMAPS_ROUTE.casing,
              lineWidth: 12,
              lineOpacity: 1,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        </Mapbox.ShapeSource>
      )}

      {travelledFeature && (
        <Mapbox.ShapeSource id={`${idPrefix}-src-travelled`} shape={travelledFeature}>
          <Mapbox.LineLayer
            id={travelledId}
            style={{
              lineColor: GMAPS_ROUTE.travelled,
              lineWidth: 8,
              lineOpacity: 0.95,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        </Mapbox.ShapeSource>
      )}

      {remainingFeature && (
        <Mapbox.ShapeSource id={`${idPrefix}-src-remaining`} shape={remainingFeature}>
          <Mapbox.LineLayer
            id={remainingBorderId}
            style={{
              lineColor: GMAPS_ROUTE.remainingDark,
              lineWidth: 10,
              lineOpacity: 0.35,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
          <Mapbox.LineLayer
            id={remainingId}
            style={{
              lineColor: GMAPS_ROUTE.remaining,
              lineWidth: 7,
              lineOpacity: 1,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        </Mapbox.ShapeSource>
      )}
    </>
  );
};
