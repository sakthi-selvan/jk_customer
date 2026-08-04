# JK Taxi - All Commands Reference

## 🎯 Most Important Commands

### Build for Play Store (Production)
```bash
cd /home/sakthi-selvan/jk_taxi/app/customer
eas login
eas build --platform android --profile production
```

### Build for Testing (Preview APK)
```bash
cd /home/sakthi-selvan/jk_taxi/app/customer
eas build --platform android --profile preview
```

### Test with Expo Go (Development)
```bash
cd /home/sakthi-selvan/jk_taxi/app/customer
npm start
```

---

## 📦 Initial Setup Commands

### Install EAS CLI (One Time)
```bash
npm install -g eas-cli
```

### Login to Expo
```bash
eas login
```

### Navigate to Project
```bash
cd /home/sakthi-selvan/jk_taxi/app/customer
```

### Install Dependencies
```bash
npm install
```

### Configure EAS Build (First Time)
```bash
eas build:configure
```

---

## 🔨 Build Commands

### Preview Build (APK for Testing)
```bash
eas build --platform android --profile preview
```

### Production Build (AAB for Play Store)
```bash
eas build --platform android --profile production
```

### Build Both Platforms
```bash
eas build --platform all --profile production
```

### Check Build Status
```bash
eas build:list
```

### View Specific Build
```bash
eas build:view [build-id]
```

### Download Build
```bash
eas build:download [build-id]
```

### Cancel Build
```bash
eas build:cancel
```

---

## 🧪 Development Commands

### Start Development Server
```bash
npm start
```

### Start with Clear Cache
```bash
npm start -- --clear
```

### Start with Tunnel (for remote testing)
```bash
npm start -- --tunnel
```

### Run on Android Emulator
```bash
npm run android
```

### Run on iOS Simulator
```bash
npm run ios
```

### Run on Web
```bash
npm run web
```

### Lint Code
```bash
npm run lint
```

---

## 📱 Device Testing Commands

### Install APK on Connected Device
```bash
adb install jk-taxi-customer-*.apk
```

### Check Connected Devices
```bash
adb devices
```

### View Device Logs
```bash
adb logcat
```

### View React Native Logs
```bash
npx react-native log-android
```

### Uninstall from Device
```bash
adb uninstall com.jktaxi.customer
```

---

## 🔄 Submission Commands

### Submit to Play Store
```bash
eas submit --platform android
```

### Check Submission Status
```bash
eas submit:list
```

---

## 🛠️ Maintenance Commands

### Update Dependencies
```bash
npm update
```

### Check for Outdated Packages
```bash
npm outdated
```

### Security Audit
```bash
npm audit
```

### Fix Security Issues
```bash
npm audit fix
```

### Clean Install
```bash
rm -rf node_modules package-lock.json
npm install
```

### Clear Expo Cache
```bash
npx expo start --clear
```

---

## 📊 Info Commands

### Check Expo Account
```bash
eas whoami
```

### Check Project Info
```bash
eas project:info
```

### Check Build Info
```bash
eas build:list
```

### Check Device Info
```bash
eas device:list
```

---

## 🔐 Credential Commands

### View Credentials
```bash
eas credentials
```

### Configure Android Keystore
```bash
eas credentials -p android
```

---

## 📝 Environment Commands

### Copy Environment File
```bash
cp .env.development .env
```

### Edit Environment File
```bash
nano .env.production
```

---

## 🧹 Cleanup Commands

### Remove Node Modules
```bash
rm -rf node_modules
```

### Remove Build Artifacts
```bash
rm -rf .expo dist build
```

### Full Clean
```bash
rm -rf node_modules package-lock.json .expo dist build
npm install
```

---

## 🚀 One-Liner Commands

### Quick Production Build
```bash
cd /home/sakthi-selvan/jk_taxi/app/customer && npm install && eas build --platform android --profile production
```

### Quick Preview Build
```bash
cd /home/sakthi-selvan/jk_taxi/app/customer && npm install && eas build --platform android --profile preview
```

### Quick Dev Start
```bash
cd /home/sakthi-selvan/jk_taxi/app/customer && npm install && npm start
```

### Full Clean and Build
```bash
cd /home/sakthi-selvan/jk_taxi/app/customer && rm -rf node_modules package-lock.json && npm install && eas build --platform android --profile production
```

---

## 📲 QR Code Commands

### Generate QR Code for Testing
```bash
npx expo start --tunnel
```
Then scan with Expo Go app

---

## 🔍 Debug Commands

### View Metro Bundler Logs
```bash
npx react-native start
```

### Reset Metro Cache
```bash
npx react-native start --reset-cache
```

### Check TypeScript Errors
```bash
npx tsc --noEmit
```

---

## 📦 Build Profile Commands

### Build with Specific Profile
```bash
# Development
eas build --platform android --profile development

# Preview
eas build --platform android --profile preview

# Production
eas build --platform android --profile production
```

---

## 🌍 Environment-Specific Builds

### Build with Development Environment
```bash
EXPO_PUBLIC_API_URL=http://localhost:8000 eas build --platform android --profile preview
```

### Build with Production Environment
```bash
EXPO_PUBLIC_API_URL=https://api.jktaxi.com eas build --platform android --profile production
```

---

## 📱 Expo Go Commands

### Open in Expo Go
```bash
# Start server
npm start

# Options:
# - Press 'a' for Android
# - Press 'i' for iOS
# - Press 'w' for web
# - Scan QR with Expo Go app
```

---

## 🎨 Asset Commands

### Optimize Images
```bash
npx expo-optimize
```

### Generate App Icons
```bash
npx expo prebuild --clean
```

---

## 📊 Analytics Commands

### Check App Size
```bash
du -sh node_modules/
```

### Check Bundle Size
```bash
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output test.bundle && ls -lh test.bundle && rm test.bundle
```

---

## 🔄 Update Commands

### Update Expo SDK
```bash
npx expo install expo@latest
```

### Update All Expo Packages
```bash
npx expo install --fix
```

### Check for Updates
```bash
npx expo-cli upgrade
```

---

## 📝 Git Commands (Helpful)

### Commit Changes
```bash
git add .
git commit -m "Ready for Play Store"
git push
```

### Create Release Tag
```bash
git tag -a v1.0.0 -m "Version 1.0.0 - Play Store Release"
git push --tags
```

---

## ⚡ Quick Reference

**Most Used:**
```bash
npm start              # Dev server
eas login             # Login
eas build -p android  # Build
```

**Troubleshooting:**
```bash
npm start -- --clear   # Clear cache
rm -rf node_modules    # Clean install
npm install            # Reinstall
```

**Building:**
```bash
eas build -p android --profile preview     # Test APK
eas build -p android --profile production  # Play Store AAB
```

---

## 📞 Help Commands

### Expo Help
```bash
eas --help
eas build --help
eas submit --help
```

### NPM Help
```bash
npm help
npm help install
npm help start
```

---

## 🎯 The Only Commands You Really Need

```bash
# 1. Install EAS (once)
npm install -g eas-cli

# 2. Login (once)
eas login

# 3. Go to project
cd /home/sakthi-selvan/jk_taxi/app/customer

# 4. Install dependencies
npm install

# 5. Build for Play Store
eas build --platform android --profile production

# 6. Done! Download AAB and submit to Play Store
```

That's it! 🎉
