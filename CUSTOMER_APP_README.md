# JK Taxi Customer App

Professional taxi booking mobile application built with Expo SDK 54 and React Native.

## Features

- User Authentication (Login/Register/OTP Verification)
- Real-time Ride Booking
- Ride History
- Profile Management
- Mock Payment Integration
- Professional Dark Theme UI

## Tech Stack

- **Framework**: Expo SDK 54
- **Language**: TypeScript
- **Navigation**: Expo Router
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Icons**: @expo/vector-icons (Ionicons)
- **Storage**: AsyncStorage

## Setup

### 1. Install Dependencies
```bash
cd app/customer
npm install
```

### 2. Configure API URL

Edit `src/config.ts` and update the BASE_URL:

**For Physical Device:**
```typescript
BASE_URL: 'http://YOUR_LOCAL_IP:8000'  // e.g., 'http://192.168.1.100:8000'
```

**For Android Emulator:**
```typescript
BASE_URL: 'http://10.0.2.2:8000'
```

**For iOS Simulator:**
```typescript
BASE_URL: 'http://localhost:8000'
```

To find your local IP:
- **Windows**: Run `ipconfig` in terminal
- **Mac/Linux**: Run `ifconfig` or `ip addr`
- Look for IP like `192.168.x.x` or `10.0.x.x`

### 3. Start the App

```bash
npm start
```

Then press:
- `a` for Android
- `i` for iOS
- `w` for Web

## Project Structure

```
app/customer/
├── app/
│   ├── (auth)/              # Authentication screens
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── verify-otp.tsx
│   ├── (tabs)/              # Main app tabs
│   │   ├── index.tsx        # Home/Booking
│   │   ├── rides.tsx        # Ride History
│   │   └── profile.tsx      # Profile
│   └── _layout.tsx          # Root layout
├── src/
│   ├── api/                 # API clients
│   │   ├── client.ts        # Axios config
│   │   ├── auth.ts          # Auth APIs
│   │   └── rides.ts         # Ride APIs
│   ├── components/          # Reusable components
│   │   └── common/
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       └── Card.tsx
│   ├── constants/           # Theme & constants
│   │   └── theme.ts
│   ├── store/               # Zustand stores
│   │   ├── authStore.ts
│   │   └── rideStore.ts
│   ├── types/               # TypeScript types
│   │   └── index.ts
│   ├── utils/               # Utilities
│   │   └── validation.ts
│   └── config.ts            # App config
└── package.json
```

## Screens

### Authentication Flow
1. **Login** - Phone & password login
2. **Register** - User registration with OTP
3. **OTP Verification** - Static OTP: `123456`

### Main App
1. **Home (Booking)** - Book rides, view active ride
2. **Rides** - View ride history, cancel pending rides
3. **Profile** - User profile, settings, logout

## API Integration

All API calls are made to the backend FastAPI server:

### Auth APIs
- POST `/api/auth/register` - Register user
- POST `/api/auth/login` - Login user
- POST `/api/auth/verify-otp` - Verify OTP

### Ride APIs
- POST `/api/bookings` - Create ride
- GET `/api/bookings/active` - Get active ride
- GET `/api/bookings/history/all` - Get ride history
- PUT `/api/bookings/{id}/cancel` - Cancel ride

## Test Credentials

**Static OTP**: `123456` (works for any number)

**Test User** (if already created):
- Phone: `9876543210`
- Password: `password123`

## Theme

Professional dark theme with purple neon accents:
- Primary: `#8B5CF6` (Purple)
- Background: `#0F172A` (Dark Navy)
- Surface: `#1E293B` (Lighter Navy)
- Text: `#F1F5F9` (Light Gray)

## Features Implemented

- ✅ User Authentication (JWT)
- ✅ Ride Booking with Location Input
- ✅ Active Ride Tracking
- ✅ Ride History
- ✅ Ride Cancellation
- ✅ User Profile Management
- ✅ Professional UI/UX
- ✅ Form Validation
- ✅ Error Handling
- ✅ Loading States
- ✅ Dark Theme

## Troubleshooting

### Cannot Connect to API

1. **Check backend is running**: Visit `http://localhost:8000/health`
2. **Update API URL**: Edit `src/config.ts` with correct IP
3. **Check network**: Ensure phone and computer are on same WiFi
4. **Firewall**: Allow port 8000 through firewall

### OTP Not Working

Static OTP is `123456` - it always works. No real SMS integration.

### Build Errors

```bash
# Clear cache and reinstall
rm -rf node_modules
npm install
npx expo start --clear
```

## Development

### Adding New Screens

1. Create screen in `app/` directory
2. Update navigation in `_layout.tsx`
3. Import and use stores for state management

### Adding New API Calls

1. Add TypeScript types in `src/types/index.ts`
2. Create API function in `src/api/`
3. Add store action in `src/store/`
4. Call from component

### Styling

Use theme constants from `src/constants/theme.ts`:
```typescript
import { Colors, Spacing, FontSizes } from '../constants/theme';
```

## Building for Production

### Android
```bash
eas build --platform android
```

### iOS
```bash
eas build --platform ios
```

## Support

For issues:
1. Check backend is running
2. Verify API URL in `src/config.ts`
3. Check console logs for errors
4. Review API docs: `http://localhost:8000/docs`
