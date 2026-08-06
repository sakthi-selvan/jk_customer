import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useAuthStore } from '../src/store/authStore';
import { Colors } from '../src/constants/theme';
import { OfflineBanner } from '../src/components/common/OfflineBanner';

export const unstable_settings = {
  initialRouteName: '(auth)/login',
};

export default function RootLayout() {
  const { isAuthenticated, isInitializing, pendingWelcome, loadUser } = useAuthStore();

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (isInitializing) return;

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
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
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
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="dark" translucent={true} />
      </View>
    </ThemeProvider>
  );
}
