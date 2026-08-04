# 🚀 Quick Start - Build for Play Store

## Step-by-Step Commands

### 1. Install EAS CLI
```bash
npm install -g eas-cli
```

### 2. Login to Expo
```bash
eas login
```
*(Create account at https://expo.dev if needed)*

### 3. Navigate to Project
```bash
cd /home/sakthi-selvan/jk_taxi/app/customer
```

### 4. Install Dependencies
```bash
npm install
```

### 5. Configure EAS (First Time Only)
```bash
eas build:configure
```

### 6. Set Production API URL
Edit `.env.production`:
```env
EXPO_PUBLIC_API_URL=https://your-production-api-url.com
```

### 7. Build!

**For Testing (APK):**
```bash
eas build --platform android --profile preview
```

**For Play Store (AAB):**
```bash
eas build --platform android --profile production
```

### 8. Monitor Build
- Build takes 15-20 minutes
- Monitor at: https://expo.dev
- Download when complete

---

## 📱 Test with Expo Go (Development)

### Quick Test Commands
```bash
cd /home/sakthi-selvan/jk_taxi/app/customer
npm start
```
Then scan QR code with Expo Go app on your phone!

---

## ✅ Your App is Ready!

**Configured:**
- ✅ Package name: `com.jktaxi.customer`
- ✅ App name: `JK Taxi`
- ✅ Version: `1.0.0`
- ✅ Permissions: Location, Internet, Notifications
- ✅ Maps: React Native Maps (Expo Go compatible)
- ✅ API: Configurable via environment
- ✅ Icons: Ready
- ✅ Splash: Configured
- ✅ Background location: Enabled
- ✅ Push notifications: Setup

**Ready for:**
- ✅ Development with Expo Go
- ✅ Building APK for testing
- ✅ Building AAB for Play Store
- ✅ Play Store submission

---

## 📚 Full Guides

- **BUILD_GUIDE.md** - Complete build instructions
- **PLAYSTORE_GUIDE.md** - Play Store submission guide
- **DEPLOYMENT_CHECKLIST.md** - Pre-launch checklist
- **README_PRODUCTION.md** - Full technical documentation

---

## 🎯 One-Command Build

Copy and paste this entire block:

```bash
cd /home/sakthi-selvan/jk_taxi/app/customer && \
npm install && \
eas build --platform android --profile production
```

That's it! Your app will build and be ready for Play Store submission. 🎉
