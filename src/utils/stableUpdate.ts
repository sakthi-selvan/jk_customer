/** Keep screens stable during background polls. */

export function rideUiKey(ride: any): string {
  if (!ride) return '';
  return [
    ride.id,
    ride.status,
    ride.otp_verified ? 1 : 0,
    Math.round(Number(ride.fare) || 0),
    Number(ride.distance_km)?.toFixed?.(1) ?? ride.distance_km,
    Math.round(Number(ride.eta_minutes) || 0),
    ride.pickup_location,
    ride.dropoff_location,
    ride.driver_id,
    ride.driver_name,
    ride.driver_phone,
    ride.driver_vehicle_number,
    ride.driver_vehicle_type,
    ride.driver_total_rides,
    ride.driver_average_rating,
    ride.customer_rating,
    ride.rejection_count,
    ride.updated_at,
  ].join('|');
}

export function sameRideUi(a: any, b: any): boolean {
  return rideUiKey(a) === rideUiKey(b);
}

export function sameRideListUi(a: any[] = [], b: any[] = []): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!sameRideUi(a[i], b[i])) return false;
  }
  return true;
}

export function samePinList(
  a: Array<{ id?: string; latitude?: number; longitude?: number }> = [],
  b: Array<{ id?: string; latitude?: number; longitude?: number }> = []
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (String(a[i]?.id ?? '') !== String(b[i]?.id ?? '')) return false;
    if (Number(a[i]?.latitude).toFixed(5) !== Number(b[i]?.latitude).toFixed(5)) return false;
    if (Number(a[i]?.longitude).toFixed(5) !== Number(b[i]?.longitude).toFixed(5)) return false;
  }
  return true;
}
