import { useEffect } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';
import { useAuthStore } from '../src/store/authStore';
import { Colors } from '../src/constants/theme';
import { OfflineBanner } from '../src/components/common/OfflineBanner';

export const unstable_settings = {
  initialRouteName: '(auth)/login',
};

// Keep native splash up until auth is ready. Fail soft so Expo preview never crashes.
try {
  SplashScreen.preventAutoHideAsync().catch(() => undefined);
} catch {
  // Preview / web may not support splash APIs
}

export default function RootLayout() {
  const { isAuthenticated, isInitializing, pendingWelcome, loadUser } = useAuthStore();

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (isInitializing) return;

    // Hide native splash once JS is ready — never throw
    SplashScreen.hideAsync().catch(() => undefined);

    if (isAuthenticated) {
      if (pendingWelcome) {
        router.replace('/(auth)/welcome');
      } else {
        router.replace('/');
      }
    } else {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, isInitializing, pendingWelcome]);

  if (isInitializing) {
    return (
      <View style={styles.boot}>
        <Image
          source={require('../assets/images/jk_taxi_logo.png')}
          style={styles.bootLogo}
          resizeMode="contain"
        />
        <Text style={styles.bootTitle}>JK Taxi</Text>
        <Text style={styles.bootTag}>Book · Ride · Relax</Text>
        <ActivityIndicator size="small" color="#FFFFFF" style={{ marginTop: 28 }} />
        <StatusBar style="light" translucent />
      </View>
    );
  }

  return (
    <ThemeProvider value={DefaultTheme}>
      <View style={{ flex: 1 }}>
        <OfflineBanner />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.background },
            freezeOnBlur: true,
          }}
        >
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="index" options={{ freezeOnBlur: true }} />
          <Stack.Screen name="rides" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="book-ride" />
          <Stack.Screen name="book-ride-map" />
          <Stack.Screen name="book-ride-enhanced" />
          <Stack.Screen name="book-ride-complete" />
          <Stack.Screen name="pick-on-map" />
          <Stack.Screen name="edit-profile" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="privacy" />
          <Stack.Screen name="help-center" />
          <Stack.Screen name="contact-support" />
          <Stack.Screen name="terms" />
          <Stack.Screen name="ride-ui-preview" />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="dark" translucent={true} />
      </View>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B3A8A',
    paddingHorizontal: 32,
  },
  bootLogo: {
    width: 280,
    height: 140,
  },
  bootTitle: {
    marginTop: 20,
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  bootTag: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 1,
  },
});
