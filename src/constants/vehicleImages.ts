import { ImageSourcePropType } from 'react-native';

/** Studio product shots for each ride category (assets/car_options). */
export const VEHICLE_IMAGES: Record<string, ImageSourcePropType> = {
  bike: require('../../assets/car_options/bike_.png'),
  auto: require('../../assets/car_options/auto.png'),
  mini: require('../../assets/car_options/mini_car_.png'),
  sedan: require('../../assets/car_options/sedan.png'),
  suv: require('../../assets/car_options/suv_car_.png'),
};

export function getVehicleImage(type: string): ImageSourcePropType | undefined {
  return VEHICLE_IMAGES[String(type).toLowerCase()];
}
