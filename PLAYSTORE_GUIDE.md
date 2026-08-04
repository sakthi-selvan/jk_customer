# JK Taxi - Play Store Release Guide

## Prerequisites

1. **EAS CLI Installation**
   ```bash
   npm install -g eas-cli
   ```

2. **Expo Account**
   - Create account at https://expo.dev
   - Login: `eas login`

3. **Google Play Console Account**
   - Create at https://play.google.com/console
   - Pay one-time $25 registration fee

## Build Configuration

### 1. Update Production API URL

Edit `.env.production`:
```env
EXPO_PUBLIC_API_URL=https://your-actual-production-api.com
```

Update `src/config.ts` if needed for production URL.

### 2. Install Dependencies

```bash
cd /home/sakthi-selvan/jk_taxi/app/customer
npm install
```

### 3. Build for Production

**Preview Build (APK for testing):**
```bash
eas build --platform android --profile preview
```

**Production Build (AAB for Play Store):**
```bash
eas build --platform android --profile production
```

The build will:
- Create Android App Bundle (.aab) for Play Store
- Handle signing automatically
- Take 15-20 minutes

## Play Store Assets Required

### App Icons
✅ Already configured in `assets/images/`:
- `icon.png` - 1024x1024
- `android-icon-foreground.png` - Adaptive icon foreground
- `android-icon-background.png` - Adaptive icon background

### Screenshots (Required)
Create 2-8 screenshots (minimum 2):
- **Phone:** 1080x1920 or higher
- **7-inch tablet:** 1536x2048 or higher  
- **10-inch tablet:** 2048x2732 or higher

Recommended screenshots:
1. **Home/Map screen** - Show map with "Book Ride" button
2. **Booking screen** - Vehicle selection and fare breakdown
3. **Active ride** - Live tracking with driver location
4. **Profile/Rides** - User profile and ride history
5. **Rating screen** - Trip completion and rating

### Feature Graphic
- Size: 1024x500
- Shows in Play Store header
- Use yellow and purple brand colors

### Store Listing Content

**Short Description (80 chars max):**
```
Book rides instantly. Track drivers live. Safe, reliable taxi service.
```

**Full Description:**
```
JK Taxi - Your Trusted Ride Partner

Book rides in seconds with JK Taxi, the convenient and reliable taxi booking app. Whether you need a quick ride to work or a comfortable journey across town, we've got you covered.

KEY FEATURES:
✓ Instant Booking - Find rides in seconds
✓ Live Tracking - Track your driver in real-time
✓ Multiple Vehicle Options - Choose from bike, auto, sedan, or SUV
✓ Transparent Pricing - See fare breakdown before booking
✓ Schedule Rides - Book rides in advance
✓ Safe & Secure - Verified drivers and secure payments
✓ 24/7 Support - Help available anytime
✓ Ride History - Access all your past trips
✓ Favorites - Save frequent locations

RIDE TYPES:
• Now Rides - Instant pickup
• Later Rides - Schedule for future
• Rental - Book by hour
• Outstation - Long distance trips

VEHICLE CATEGORIES:
🏍️ Bike - Quick and economical
🛺 Auto - Perfect for short distances
🚗 Sedan - Comfortable for 4 passengers
🚙 SUV - Spacious for groups

ENHANCED FEATURES:
• Real-time fare calculation
• Multiple pickup/drop locations
• Trip preferences (AC, pet-friendly, etc.)
• Driver ratings and reviews
• Share ride details with family
• In-app chat with driver

WHY CHOOSE JK TAXI?
✓ Verified professional drivers
✓ Competitive pricing
✓ Clean and well-maintained vehicles
✓ Quick response time
✓ Easy cancellation policy
✓ Multiple payment options

Download now and experience hassle-free rides!

For support: support@jktaxi.com
Website: https://jktaxi.com
```

**Category:** Maps & Navigation

**Content Rating:** Everyone

**Privacy Policy URL:** (Create and host privacy policy)

## App Information

### Required App Details

```yaml
App Name: JK Taxi
Package Name: com.jktaxi.customer
Version: 1.0.0
Version Code: 1

Contact Details:
  Email: support@jktaxi.com
  Phone: +91-XXXXXXXXXX
  Website: https://jktaxi.com

Target Audience: Everyone
Content Rating: Everyone
```

### Permissions Explanation

When submitting, explain why each permission is needed:

1. **Location (Background)**
   - "Used to track user location during active rides for safety and navigation"

2. **Location (Foreground)**
   - "Used to show nearby drivers and pickup location"

3. **Internet**
   - "Required for booking rides and communicating with drivers"

4. **Notifications**
   - "Send ride updates, driver arrival alerts, and trip completion notifications"

## Submission Steps

### 1. Create App in Play Console

1. Go to https://play.google.com/console
2. Click "Create app"
3. Fill in app details:
   - App name: JK Taxi
   - Default language: English (US)
   - App or game: App
   - Free or paid: Free

### 2. Set Up Store Listing

1. Navigate to "Store presence" > "Main store listing"
2. Upload all required assets
3. Fill in descriptions
4. Select category and tags

### 3. App Content

1. **Privacy Policy** - Add your privacy policy URL
2. **App access** - Provide test credentials if login required:
   ```
   Phone: +91-1234567890
   OTP: 123456
   ```
3. **Ads** - Declare if app contains ads
4. **Content rating** - Complete questionnaire
5. **Target audience** - Select age groups
6. **News app** - Declare if applicable

### 4. Upload AAB

1. Go to "Release" > "Production"
2. Click "Create new release"
3. Upload the .aab file from EAS Build
4. Add release notes:
   ```
   Initial release of JK Taxi:
   - Book rides instantly
   - Live driver tracking
   - Multiple vehicle options
   - Scheduled rides
   - Safe and secure
   ```

### 5. Pricing & Distribution

1. Select countries (or "All countries")
2. Confirm pricing (Free)
3. Check all compliance requirements

### 6. Review & Publish

1. Complete all sections (marked with checkmarks)
2. Click "Send for review"
3. Review typically takes 1-3 days

## Testing Before Submission

### Internal Testing Track

1. Create internal testing release first
2. Add testers (up to 100 email addresses)
3. Share test link
4. Test thoroughly:
   - Phone OTP login
   - Location permissions
   - Ride booking flow
   - Live tracking
   - Payment
   - Notifications

### Pre-Launch Report

Google automatically tests your app:
- Crashes
- Security vulnerabilities
- Accessibility issues
- Performance

Fix any critical issues before production release.

## Post-Launch

### Monitor

1. **Crash reports** - Fix crashes immediately
2. **Reviews** - Respond to user feedback
3. **Statistics** - Track installs and engagement
4. **Updates** - Regular feature updates

### Update Process

For future updates:

1. Increment version in `app.json`:
   ```json
   "version": "1.0.1",
   "android": {
     "versionCode": 2
   }
   ```

2. Build new version:
   ```bash
   eas build --platform android --profile production
   ```

3. Upload to Play Console > Production > Create new release

## Troubleshooting

### Common Issues

**Build fails:**
- Check `eas.json` configuration
- Verify all dependencies installed
- Check Expo SDK compatibility

**App rejected:**
- Usually due to missing privacy policy
- Insufficient screenshots
- Permissions not explained
- Test credentials not working

**Crashes on devices:**
- Test on different Android versions
- Check memory usage
- Verify API endpoints are accessible

## Support Resources

- **Expo Docs:** https://docs.expo.dev
- **EAS Build:** https://docs.expo.dev/build/introduction/
- **Play Console Help:** https://support.google.com/googleplay/android-developer

## Checklist

Before submitting:

- [ ] Production API URL configured
- [ ] App icons ready (1024x1024)
- [ ] Screenshots taken (minimum 2)
- [ ] Feature graphic created (1024x500)
- [ ] Store listing written
- [ ] Privacy policy published
- [ ] Content rating completed
- [ ] Test credentials provided
- [ ] AAB file built successfully
- [ ] Internal testing completed
- [ ] All Play Console sections completed

## Commands Quick Reference

```bash
# Install dependencies
npm install

# Login to EAS
eas login

# Configure EAS (first time)
eas build:configure

# Preview build (APK)
eas build --platform android --profile preview

# Production build (AAB)
eas build --platform android --profile production

# Submit to Play Store (after manual setup)
eas submit --platform android

# Check build status
eas build:list
```

## Production Readiness

Your app is now configured with:

✅ Proper package name (com.jktaxi.customer)
✅ Android permissions configured
✅ Mapbox integration for maps
✅ Background location tracking
✅ Push notifications setup
✅ Production environment configuration
✅ EAS Build configuration
✅ App icons and splash screen

Ready to build and submit to Play Store!
