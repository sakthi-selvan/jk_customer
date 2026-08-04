import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, Linking } from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { useAuthStore } from '../src/store/authStore';
import { useRideStore } from '../src/store/rideStore';
import { MapHomeScreen } from '../src/components/map/MapHomeScreen';
import { BottomNav } from '../src/components/navigation/BottomNav';
import { Colors } from '../src/constants/theme';

export default function HomeScreen() {
  const { getActiveRide, activeRide } = useRideStore();
  const [locationChecked, setLocationChecked] = useState(false);
  const hideNav = !!(activeRide && ['pending', 'accepted', 'started'].includes(activeRide.status));

  useEffect(() => {
    getActiveRide();
    checkLocationPermission();
  }, []);

  // Poll for active ride updates every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      getActiveRide();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const checkLocationPermission = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Location Access Required',
          'JK Taxi needs access to your location to provide better service and accurate pickup points.',
          [
            {
              text: 'Not Now',
              style: 'cancel',
              onPress: () => setLocationChecked(true),
            },
            {
              text: 'Enable Location',
              onPress: async () => {
                const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
                if (newStatus !== 'granted') {
                  Alert.alert(
                    'Permission Denied',
                    'You can enable location access later in Settings.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Open Settings', onPress: () => Linking.openSettings() },
                    ]
                  );
                }
                setLocationChecked(true);
              },
            },
          ]
        );
      } else {
        setLocationChecked(true);
      }
    } catch (error) {
      console.error('Error checking location permission:', error);
      setLocationChecked(true);
    }
  };

  const handleBookRide = async () => {
    // Check location permission before booking
    const { status } = await Location.getForegroundPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        'Enable Location for Better Experience',
        'Allow location access to use your current location automatically. You can still book by entering locations manually.',
        [
          {
            text: 'Continue Without GPS',
            style: 'cancel',
            onPress: () => router.push('/book-ride'),
          },
          {
            text: 'Enable Location',
            onPress: async () => {
              const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
              router.push('/book-ride');
            },
          },
        ]
      );
    } else {
      router.push('/book-ride');
    }
  };

  return (
    <View style={styles.container}>
      <MapHomeScreen onBookRide={handleBookRide} />
      <BottomNav hidden={hideNav} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
