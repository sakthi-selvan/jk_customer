# JK Taxi Customer App - Build & Deploy Guide

## 🚀 Quick Start - Build for Play Store

### Step 1: Install EAS CLI

```bash
npm install -g eas-cli
```

### Step 2: Login to Expo

```bash
eas login
```
**Enter your Expo account credentials** (create account at https://expo.dev if you don't have one)

### Step 3: Configure EAS Build (First Time Only)

```bash
cd /home/sakthi-selvan/jk_taxi/app/customer
eas build:configure
```
This will link your project to Expo.

### Step 4: Install Dependencies

```bash
npm install
```

### Step 5: Update Production API URL

Edit `.env.production` and set your actual production API:
```env
EXPO_PUBLIC_API_URL=https://your-actual-api-url.com
```

### Step 6: Build for Play Store

**Option A: Preview Build (APK for Testing)**
```bash
eas build --platform android --profile preview
```
- Creates APK file
- Good for testing on devices
- Can install directly without Play Store
- Build time: ~15-20 minutes

**Option B: Production Build (AAB for Play Store)**
```bash
eas build --platform android --profile production
```
- Creates AAB (Android App Bundle)
- Required for Play Store submission
- Optimized for distribution
- Build time: ~15-20 minutes

### Step 7: Monitor Build

The build will run on Expo's servers. You'll see:
```
✔ Build started, it may take a few minutes to complete.
You can monitor the build at:
https://expo.dev/accounts/[your-account]/projects/jk-taxi-customer/builds/[build-id]
```

Visit that URL to watch the build progress.

### Step 8: Download Build

Once complete, download the APK/AAB from:
- Expo dashboard: https://expo.dev/accounts/[your-account]/projects/jk-taxi-customer/builds
- Or the link provided in terminal

---

## 📱 Testing with Expo Go (Development)

### What is Expo Go?
- Free app for testing during development
- Available on Play Store
- No build required
- Perfect for rapid development

### Setup for Expo Go Testing

1. **Install Expo Go on your phone:**
   ```
   Play Store: Search "Expo Go" and install
   ```

2. **Start development server:**
   ```bash
   cd /home/sakthi-selvan/jk_taxi/app/customer
   npm start
   ```

3. **Connect your phone:**
   - Scan the QR code with Expo Go app
   - Or press `a` to run on Android emulator
   - Or enter the URL manually in Expo Go

4. **Update .env for local testing:**
   ```env
   EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:8000
   ```
   Replace `YOUR_LOCAL_IP` with your computer's IP (find with `ipconfig` or `ifconfig`)

### Expo Go Limitations

⚠️ **Expo Go CANNOT be used for:**
- Play Store submission (need to build APK/AAB)
- Testing background features fully
- Production testing

✅ **Expo Go IS GOOD for:**
- Development and debugging
- UI testing
- Feature development
- Quick iterations

---

## 🏗️ Complete Build Commands

### Development Commands

```bash
# Start development server
npm start

# Start with cache clear
npm start -- --clear

# Start on specific platform
npm run android  # Android emulator
npm run ios      # iOS simulator
npm run web      # Web browser
```

### Production Build Commands

```bash
# Login to EAS
eas login

# Check build status
eas build:list

# Build preview APK (for testing)
eas build --platform android --profile preview

# Build production AAB (for Play Store)
eas build --platform android --profile production

# Build for both platforms
eas build --platform all --profile production

# View build details
eas build:view [build-id]

# Cancel a build
eas build:cancel
```

### Submission Commands (After Building)

```bash
# Submit to Play Store (after manual Play Console setup)
eas submit --platform android

# Check submission status
eas submit:list
```

---

## 🔧 Configuration Files

### app.json
Main Expo configuration:
- App name, version, permissions
- Icons and splash screen
- Build settings

### eas.json
EAS Build configuration:
- Build profiles (development, preview, production)
- Environment variables
- Build types (APK vs AAB)

### .env files
- `.env` - Development (local testing)
- `.env.development` - Development API
- `.env.production` - Production API

---

## 📋 Pre-Build Checklist

Before running production build:

- [ ] Updated `EXPO_PUBLIC_API_URL` in `.env.production`
- [ ] Verified Mapbox token is valid
- [ ] Incremented version in `app.json` if updating
- [ ] Tested app with `npm start` and Expo Go
- [ ] Removed debug code and console.logs
- [ ] Verified all features work
- [ ] Committed changes to git

---

## 🎯 Step-by-Step: First Production Build

### 1. Install and Login
```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login (creates account if needed)
eas login
```

### 2. Prepare Project
```bash
cd /home/sakthi-selvan/jk_taxi/app/customer

# Install dependencies
npm install

# Configure EAS (first time only)
eas build:configure
```

### 3. Set Production API
Edit `.env.production`:
```env
EXPO_PUBLIC_API_URL=https://your-production-api.com
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=YOUR_MAPBOX_PUBLIC_TOKEN
EXPO_PUBLIC_ENVIRONMENT=production
```

### 4. Build
```bash
# For testing (creates APK)
eas build --platform android --profile preview

# For Play Store (creates AAB)
eas build --platform android --profile production
```

### 5. Wait for Build
- Takes 15-20 minutes
- Monitor at: https://expo.dev
- You'll get email when complete

### 6. Download
```bash
# Download automatically
eas build:download [build-id]

# Or download from dashboard
# https://expo.dev/accounts/[your-account]/projects/jk-taxi-customer/builds
```

### 7. Test APK (if preview build)
```bash
# Install on connected device
adb install customer-*.apk

# Or share the download link from Expo dashboard
```

### 8. Submit AAB to Play Store
- Go to Google Play Console
- Create app (if first time)
- Upload AAB to production track
- Fill in store listing
- Submit for review

---

## 🐛 Troubleshooting

### Build Fails

**Error: "Invalid credentials"**
```bash
# Re-login
eas logout
eas login
```

**Error: "Project not configured"**
```bash
# Run configure again
eas build:configure
```

**Error: "Dependencies error"**
```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Can't Connect to Expo Go

**Same network required:**
- Phone and computer must be on same WiFi
- Check firewall isn't blocking port 8081

**Try tunnel:**
```bash
npm start -- --tunnel
```

### Build Takes Too Long

- Normal time: 15-20 minutes
- If > 30 minutes, check build logs
- Cancel and retry if stuck

### Can't Download Build

**Option 1: Dashboard**
```
https://expo.dev → Projects → jk-taxi-customer → Builds → Download
```

**Option 2: CLI**
```bash
eas build:list
eas build:download [build-id]
```

**Option 3: Direct Link**
- Check your email for build complete notification
- Contains direct download link

---

## 📊 Build Profiles Explained

### Development Profile
```json
"development": {
  "developmentClient": true,
  "distribution": "internal"
}
```
- For development builds with dev tools
- Not for production

### Preview Profile
```json
"preview": {
  "distribution": "internal",
  "android": {
    "buildType": "apk"
  }
}
```
- Creates APK for easy testing
- Can install on any Android device
- Good for beta testing

### Production Profile
```json
"production": {
  "android": {
    "buildType": "aab"
  }
}
```
- Creates AAB for Play Store
- Optimized and smaller size
- Required for Play Store

---

## 🔐 Environment Variables

### Development (.env)
```env
EXPO_PUBLIC_API_URL=http://10.40.122.233:8000
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.eyJ1...
EXPO_PUBLIC_ENVIRONMENT=development
```

### Production (.env.production)
```env
EXPO_PUBLIC_API_URL=https://api.jktaxi.com
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.eyJ1...
EXPO_PUBLIC_ENVIRONMENT=production
```

Variables are accessed in code:
```typescript
process.env.EXPO_PUBLIC_API_URL
```

---

## 📦 What Gets Built

### APK (Preview)
- File: `customer-[version].apk`
- Size: ~50-70 MB
- Can install directly
- Good for: Testing, internal distribution

### AAB (Production)
- File: `customer-[version].aab`
- Size: ~40-50 MB
- Play Store generates optimized APKs
- Good for: Play Store submission

---

## 🎉 You're Ready!

Your app is configured and ready to build. Just run:

```bash
# Login
eas login

# Build for testing
eas build --platform android --profile preview

# Or build for Play Store
eas build --platform android --profile production
```

For detailed Play Store submission, see `PLAYSTORE_GUIDE.md`.

---

## 📞 Need Help?

- **EAS Build Docs:** https://docs.expo.dev/build/introduction/
- **Expo Forums:** https://forums.expo.dev/
- **Discord:** https://chat.expo.dev/
- **Email:** support@jktaxi.com
