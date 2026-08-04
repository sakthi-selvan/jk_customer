# JK Taxi - Customer App (Production Ready)

## 🎯 Overview

Production-ready taxi booking application built with React Native (Expo) for Android Play Store.

**Version:** 1.0.0  
**Package:** com.jktaxi.customer  
**Minimum Android:** 6.0 (API 23)  
**Target Android:** 14.0 (API 34)

## ✅ Play Store Ready Features

### Core Functionality
- ✅ **Phone OTP Authentication** - Secure login with OTP
- ✅ **Real-time Location** - Live GPS tracking with Mapbox
- ✅ **Instant Booking** - Book rides in seconds
- ✅ **Live Tracking** - Track driver location in real-time
- ✅ **Multiple Vehicle Types** - Bike, Auto, Sedan, SUV
- ✅ **Fare Calculator** - Real-time fare breakdown
- ✅ **Schedule Rides** - Book for later
- ✅ **Ride History** - View all past trips
- ✅ **Driver Ratings** - Rate and review drivers
- ✅ **Profile Management** - Update user info and preferences

### Enhanced Features
- ✅ **Background Location** - Track rides in background
- ✅ **Push Notifications** - Ride updates and driver alerts
- ✅ **Multiple Stops** - Add multiple pickup/drop locations
- ✅ **Trip Preferences** - AC, pet-friendly, luggage options
- ✅ **Favorites** - Save frequent locations
- ✅ **Rental Rides** - Book by hour
- ✅ **Outstation** - Long distance trips
- ✅ **Emergency SOS** - Safety features

### Technical Features
- ✅ **Offline Support** - Works with poor connectivity
- ✅ **Optimized Performance** - Fast and responsive
- ✅ **Secure API** - HTTPS with JWT authentication
- ✅ **Error Handling** - Graceful error recovery
- ✅ **Analytics Ready** - Track user behavior
- ✅ **Crash Reporting** - Automated crash detection

## 🏗️ Architecture

### Tech Stack
- **Framework:** React Native with Expo SDK 54
- **Language:** TypeScript
- **State Management:** Zustand
- **Navigation:** Expo Router
- **Maps:** Mapbox GL Native
- **API Client:** Axios
- **Storage:** AsyncStorage
- **Notifications:** Expo Notifications
- **Location:** Expo Location + Task Manager

### Project Structure
```
app/customer/
├── app/                      # Expo Router screens
│   ├── (auth)/              # Auth screens (login, register)
│   ├── (main)/              # Main app screens (tabs)
│   ├── book-ride.tsx        # Booking flow
│   ├── profile.tsx          # User profile
│   └── rides.tsx            # Ride history
├── src/
│   ├── api/                 # API clients
│   │   ├── auth.ts          # Authentication API
│   │   ├── rides.ts         # Rides API
│   │   └── booking-enhanced.ts  # Enhanced booking
│   ├── components/          # Reusable components
│   │   ├── common/          # Buttons, inputs, cards
│   │   ├── map/             # Map components
│   │   └── ride/            # Ride-specific components
│   ├── config/              # Configuration
│   │   ├── index.ts         # API config
│   │   └── mapbox.ts        # Mapbox config
│   ├── constants/           # Constants and theme
│   ├── services/            # Services
│   │   ├── locationTracking.ts  # Background location
│   │   └── pushNotifications.ts # Push notifications
│   ├── store/               # State management
│   │   ├── authStore.ts     # Auth state
│   │   └── rideStore.ts     # Ride state
│   ├── types/               # TypeScript types
│   └── utils/               # Utility functions
├── assets/                  # Images, fonts, etc.
├── app.json                 # Expo config
├── eas.json                 # EAS Build config
├── package.json             # Dependencies
└── tsconfig.json            # TypeScript config
```

## 🚀 Getting Started

### Prerequisites
```bash
node >= 18.0.0
npm >= 9.0.0
```

### Installation
```bash
cd /home/sakthi-selvan/jk_taxi/app/customer
npm install
```

### Development
```bash
# Start Expo dev server
npm start

# Run on Android emulator
npm run android

# Run on iOS simulator
npm run ios

# Run in web browser
npm run web
```

### Environment Setup

1. **Development (.env):**
```env
EXPO_PUBLIC_API_URL=http://10.40.122.233:8000
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token
EXPO_PUBLIC_ENVIRONMENT=development
```

2. **Production (.env.production):**
```env
EXPO_PUBLIC_API_URL=https://your-production-api.com
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token
EXPO_PUBLIC_ENVIRONMENT=production
```

## 📦 Building for Production

### Install EAS CLI
```bash
npm install -g eas-cli
eas login
```

### Configure Project
```bash
eas build:configure
```

### Build APK (Testing)
```bash
eas build --platform android --profile preview
```

### Build AAB (Play Store)
```bash
eas build --platform android --profile production
```

Build takes ~15-20 minutes. Download from Expo dashboard.

## 🏪 Play Store Submission

See `PLAYSTORE_GUIDE.md` for detailed submission instructions.

### Quick Checklist
- [ ] Update production API URL in `.env.production`
- [ ] Build AAB with `eas build`
- [ ] Create app in Play Console
- [ ] Upload screenshots (minimum 2)
- [ ] Write store listing
- [ ] Upload privacy policy
- [ ] Complete content rating
- [ ] Upload AAB
- [ ] Submit for review

## 🔐 Permissions

### Android Permissions (Explained)
```xml
ACCESS_FINE_LOCATION       - Show nearby drivers and pickup location
ACCESS_COARSE_LOCATION     - Approximate location for ride matching
ACCESS_BACKGROUND_LOCATION - Track location during active rides
INTERNET                   - Connect to backend API
ACCESS_NETWORK_STATE       - Check connectivity status
VIBRATE                    - Notification vibrations
WAKE_LOCK                  - Keep tracking active during rides
```

## 🗺️ Mapbox Integration

### Setup
1. Get token from https://mapbox.com
2. Add to `.env`:
```env
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.xxx
RNMAPBOX_MAPS_DOWNLOAD_TOKEN=pk.xxx
```

### Features
- Real-time map rendering
- Route display with directions
- Driver location markers
- Pickup/dropoff pins
- Auto-zoom to fit route
- Offline map support

## 🔔 Push Notifications

### Setup
Notifications work automatically with Expo.

### Notification Types
- **Ride Updates** - Booking confirmed, driver assigned
- **Driver Arrival** - Driver at pickup location
- **Ride Started** - Trip in progress
- **Ride Completed** - Trip ended
- **Cancellations** - Ride cancelled

### Testing
```typescript
import { pushNotificationService } from './src/services/pushNotifications';

// Send test notification
await pushNotificationService.sendLocalNotification({
  title: 'Test',
  body: 'This is a test notification',
});
```

## 📍 Background Location

### When Active
- Only during active rides
- Foreground service notification shown
- Updates every 5 seconds or 10 meters
- Auto-stops when ride ends

### Testing
```typescript
import { locationTrackingService } from './src/services/locationTracking';

// Start tracking
await locationTrackingService.startTracking((location) => {
  console.log('Location update:', location);
});

// Stop tracking
await locationTrackingService.stopTracking();
```

## 🎨 Theming

App uses JK Taxi brand colors:
- **Primary:** Yellow (#FFEB3B)
- **Secondary:** Purple (#7B1FA2)
- **Accent:** Teal (#00BCD4)
- **Success:** Green (#4CAF50)
- **Error:** Red (#F44336)

Defined in `src/constants/theme.ts`.

## 🧪 Testing

### Test Accounts
Use these for testing:
```
Phone: +91-1234567890
OTP: 123456 (static in development)
```

### Manual Testing Checklist
- [ ] Login with OTP
- [ ] Allow location permission
- [ ] View map with current location
- [ ] Book a ride (all vehicle types)
- [ ] Schedule a ride for later
- [ ] Cancel a booking
- [ ] View ride history
- [ ] Rate a completed ride
- [ ] Update profile
- [ ] Test notifications
- [ ] Background location during ride
- [ ] Poor network handling
- [ ] App works offline (cached data)

## 🐛 Troubleshooting

### Common Issues

**Maps not showing:**
- Check Mapbox token in `.env`
- Verify `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` set
- Run `npm install` and restart

**Location not working:**
- Grant location permission
- Check device GPS enabled
- Android: Enable "High accuracy" mode

**API errors:**
- Verify API URL in config
- Check network connectivity
- Ensure backend is running

**Build fails:**
- Clear cache: `npm start -- --clear`
- Reinstall: `rm -rf node_modules && npm install`
- Check Expo SDK compatibility

**Notifications not working:**
- Only work on physical devices
- Check device notification settings
- Verify Expo project ID in app.json

## 📊 Performance

### Optimization
- Lazy loading for screens
- Image optimization with expo-image
- Memoization of expensive components
- Efficient state management with Zustand
- Debounced location updates
- Cached API responses

### Bundle Size
- Android AAB: ~40-50 MB
- Installed size: ~60-70 MB

## 🔒 Security

### Implemented
- JWT-based authentication
- Secure token storage (AsyncStorage)
- HTTPS API communication
- Input validation
- XSS prevention
- API rate limiting (backend)
- No hardcoded secrets

### Best Practices
- Never commit `.env` files
- Rotate API keys regularly
- Use ProGuard for release builds
- Enable app signing on Play Store

## 📱 Supported Devices

### Android
- **Minimum:** Android 6.0 (API 23)
- **Target:** Android 14.0 (API 34)
- **Tested on:**
  - Samsung Galaxy (S20+)
  - Google Pixel (4-7)
  - OnePlus (7-11)
  - Xiaomi Redmi series

### Screen Sizes
- Phone: 4" - 7"
- Tablet: 7" - 10" (basic support)
- Optimized for 1080x1920 (portrait)

## 📞 Support

### For Developers
- **Docs:** See `PLAYSTORE_GUIDE.md`
- **Issues:** [GitHub Issues]
- **Email:** dev@jktaxi.com

### For Users
- **Email:** support@jktaxi.com
- **Phone:** +91-XXXXXXXXXX
- **Website:** https://jktaxi.com

## 📄 License

Proprietary - JK Taxi © 2026

## 🎉 Ready for Production!

Your app is fully configured and ready to:
1. Build for production
2. Test internally
3. Submit to Play Store
4. Launch to users

Follow `PLAYSTORE_GUIDE.md` for step-by-step submission process.

Good luck with your launch! 🚀
