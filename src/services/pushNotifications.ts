import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure how notifications are displayed
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface PushNotification {
  title: string;
  body: string;
  data?: Record<string, any>;
}

export class PushNotificationService {
  private static instance: PushNotificationService;
  private expoPushToken: string | null = null;

  private constructor() {}

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  async initialize(): Promise<string | null> {
    try {
      // Request permissions
      const token = await this.registerForPushNotifications();

      if (token) {
        this.expoPushToken = token;
        await AsyncStorage.setItem('push_token', token);
        console.log('Push notification token:', token);
      }

      return token;
    } catch (error) {
      console.error('Error initializing push notifications:', error);
      return null;
    }
  }

  private async registerForPushNotifications(): Promise<string | null> {
    if (!Device.isDevice) {
      console.log('Push notifications only work on physical devices');
      return null;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push notification permission');
        return null;
      }

      // Get the Expo push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'jk-taxi-customer', // Should match app.json extra.eas.projectId
      });

      const token = tokenData.data;

      // Configure Android notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FFEB3B',
        });

        await Notifications.setNotificationChannelAsync('ride-updates', {
          name: 'Ride Updates',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4CAF50',
          description: 'Updates about your active rides',
        });

        await Notifications.setNotificationChannelAsync('driver-arrival', {
          name: 'Driver Arrival',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 500, 200, 500],
          lightColor: '#FF9800',
          description: 'Notifications when driver arrives',
          sound: 'default',
        });
      }

      return token;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  async sendLocalNotification(notification: PushNotification): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
          sound: true,
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      console.error('Error sending local notification:', error);
    }
  }

  async sendRideUpdateNotification(
    status: string,
    driverName?: string,
    eta?: number
  ): Promise<void> {
    let title = 'Ride Update';
    let body = '';

    switch (status) {
      case 'driver_assigned':
        title = 'Driver Assigned';
        body = driverName
          ? `${driverName} is on the way to pick you up`
          : 'A driver has been assigned to your ride';
        break;
      case 'driver_arrived':
        title = 'Driver Arrived';
        body = driverName
          ? `${driverName} has arrived at your pickup location`
          : 'Your driver has arrived';
        break;
      case 'in_progress':
        title = 'Ride Started';
        body = 'Your ride has started';
        break;
      case 'completed':
        title = 'Ride Completed';
        body = 'Your ride has been completed. Thank you for using JK Taxi!';
        break;
      case 'cancelled':
        title = 'Ride Cancelled';
        body = 'Your ride has been cancelled';
        break;
      default:
        body = 'Your ride status has been updated';
    }

    if (eta && eta > 0) {
      body += `. ETA: ${eta} minutes`;
    }

    await this.sendLocalNotification({
      title,
      body,
      data: { type: 'ride_update', status },
    });
  }

  addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(callback);
  }

  addNotificationResponseReceivedListener(
    callback: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }

  async clearBadge(): Promise<void> {
    await Notifications.setBadgeCountAsync(0);
  }

  async dismissAllNotifications(): Promise<void> {
    await Notifications.dismissAllNotificationsAsync();
  }

  getExpoPushToken(): string | null {
    return this.expoPushToken;
  }

  async getStoredPushToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('push_token');
    } catch (error) {
      console.error('Error getting stored push token:', error);
      return null;
    }
  }
}

export const pushNotificationService = PushNotificationService.getInstance();
