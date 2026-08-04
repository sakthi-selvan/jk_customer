# JK Taxi Customer App - Build Instructions

## Prerequisites

1. **Install dependencies**:
   ```bash
   cd app/customer
   npm install
   ```

2. **Install EAS CLI** (if not already installed):
   ```bash
   npm install -g eas-cli
   ```

3. **Login to Expo**:
   ```bash
   eas login
   ```

## Building Development Build

### Android Development Build

```bash
cd app/customer
eas build --profile development --platform android
```

This will:
- Build a development APK
- Include Mapbox SDK with proper authentication
- Enable hot reloading and debugging
- Take ~15-20 minutes

**Download and install**:
```bash
# After build completes, scan QR code or download from link
# Install on device: adb install app-development.apk
```

### iOS Development Build

```bash
cd app/customer
eas build --profile development --platform ios
```

**Note**: Requires Apple Developer account ($99/year)

## Building Production Build

### Android Production (Preview)

```bash
eas build --profile preview --platform android
```

This creates an APK for testing before Play Store submission.

### Android Production (Play Store)

```bash
eas build --profile production --platform android
```

This creates an AAB for Play Store submission.

## Local Development (No EAS)

### Setup
```bash
cd app/customer
npx expo prebuild
```

### Android
```bash
npx expo run:android
```

### iOS
```bash
npx expo run:ios
```

## Testing the App

### With Expo Go (Limited)
❌ **Will NOT work** - Mapbox requires custom native code

### With Development Build
✅ **Recommended** - Full features + fast refresh

1. Build and install development build (see above)
2. Start dev server:
   ```bash
   npm start
   ```
3. Open app on device
4. Shake device → "Enter URL manually" → enter Metro bundler URL

## Environment Configuration

All tokens are pre-configured:

**Mapbox**:
- Public token in `app.json`
- Secret token in `android/gradle.properties`
- Maven auth in `.netrc`

**Backend API**:
- Production: `https://your-api.com`
- Development: `http://localhost:3000`
- Set in env variables

## Common Build Errors

### Error: "Could not find com.mapbox.maps:android"
**Fix:**
```bash
# Ensure .netrc exists with Mapbox token
cat .netrc

# Should show:
# machine api.mapbox.com
# login mapbox
# password sk.eyJ1...
```

### Error: "401 Unauthorized" from Mapbox
**Fix:** Token expired. Update in:
1. `android/gradle.properties`
2. `.netrc`
3. Get new token from https://account.mapbox.com/

### Error: "SDK location not found"
**Fix:**
```bash
# Create local.properties
echo "sdk.dir=$ANDROID_HOME" > android/local.properties
```

### Error: "Java heap space"
**Fix:** Increase memory in `android/gradle.properties`:
```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m
```

## EAS Build Profiles

### `development`
- Development build with debugging
- Includes dev menu
- Hot reload enabled
- Larger file size

### `preview`
- Production-like build
- No debugging
- Optimized
- For internal testing

### `production`
- Play Store ready
- Fully optimized
- Signed with upload key
- Smallest size

## Submission Checklist

Before submitting to Google Play:

- [ ] Test all major flows (login, booking, payment)
- [ ] Test on multiple devices and Android versions
- [ ] Verify permissions (location, notifications)
- [ ] Test maps and routing
- [ ] Check app size (<150MB preferred)
- [ ] Update version in `app.json`
- [ ] Create screenshots and store listing
- [ ] Set up Google Play Console
- [ ] Generate upload signing key
- [ ] Build with `production` profile
- [ ] Submit AAB to Google Play

## Development Workflow

1. **Make changes** in code
2. **Test locally** with dev build
3. **Build preview** when ready for testing
4. **Share APK** with testers
5. **Build production** when approved
6. **Submit to Play Store**

## Device Testing

### Minimum Requirements
- Android 7.0 (API 24) or higher
- 2GB RAM minimum
- GPS enabled
- Internet connection

### Recommended Testing Devices
- Samsung Galaxy A series (mid-range)
- Google Pixel (reference device)
- Xiaomi/Redmi (popular in India)
- Various screen sizes (5" to 6.5")

## Performance Tips

1. **Enable Hermes**: Already enabled in `app.json`
2. **Use production builds**: Much faster than development
3. **Optimize images**: Use WebP format
4. **Lazy load**: Routes load on demand with Expo Router
5. **Cache API responses**: Implement caching strategy

## Next Steps After Build

1. **Install on device**
2. **Test booking flow**:
   - Login/signup
   - Set pickup/dropoff
   - Select vehicle type
   - Confirm booking
   - Track ride
3. **Test maps**:
   - Map loads correctly
   - Routes display properly
   - Location search works
   - GPS tracking functional
4. **Test features**:
   - Scheduling rides
   - Ride history
   - Payments
   - Notifications
   - OTP verification

## Support

For build issues:
1. Check EAS build logs
2. Review Expo documentation
3. Check Mapbox SDK compatibility
4. Verify all tokens are valid

## Useful Commands

```bash
# Check build status
eas build:list

# View build details
eas build:view [BUILD_ID]

# Cancel ongoing build
eas build:cancel

# Check account info
eas whoami

# Clear cache
npm start -- --reset-cache

# Check dependencies
npx expo-doctor

# Update dependencies
npx expo install --fix
```
