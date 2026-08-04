# Play Store Assets Generation Guide

## Required Assets Checklist

### 1. App Icon (Already Done ✅)
- Location: `assets/images/icon.png`
- Size: 1024x1024 px
- Format: PNG (no alpha)
- Design: JK Taxi logo with yellow background

### 2. Screenshots (Need to Create)

#### Phone Screenshots (Required)
Create 2-8 screenshots, recommended dimensions: **1080x1920** or **1080x2400**

**Recommended 5 Screenshots:**

1. **Home Screen with Map**
   - Show: Map view, location marker, "Book Ride" button
   - Caption: "Find rides instantly near you"

2. **Booking Screen**
   - Show: Vehicle selection, fare breakdown, pickup/drop locations
   - Caption: "Choose your ride and see transparent pricing"

3. **Active Ride Tracking**
   - Show: Map with route, driver location, ETA, driver info card
   - Caption: "Track your driver in real-time"

4. **Ride History**
   - Show: List of past rides with dates, fares, ratings
   - Caption: "View all your trips and receipts"

5. **Profile & Ratings**
   - Show: Profile screen or rating modal
   - Caption: "Rate your ride and manage your account"

#### How to Capture Screenshots

**Method 1: From Running App**
```bash
# Start app in Android emulator (Pixel 5)
npm run android

# In Android Studio > Emulator:
# - Use toolbar camera icon
# - Or: Ctrl+Shift+S (Windows) / Cmd+Shift+S (Mac)
```

**Method 2: Using ADB**
```bash
# Connect device/emulator
adb devices

# Capture screenshot
adb shell screencap -p /sdcard/screenshot.png
adb pull /sdcard/screenshot.png ./screenshots/
```

**Method 3: Device Screenshots**
```bash
# On physical device:
# 1. Open app
# 2. Take screenshots using device buttons
# 3. Transfer via USB or cloud
```

### 3. Feature Graphic (Need to Create)
- Size: **1024x500** px
- Format: JPG or 24-bit PNG (no alpha)
- Used in: Play Store header

**Design Elements:**
- Background: Gradient (Yellow #FFEB3B to Teal #00BCD4)
- Text: "JK Taxi" in large font
- Subtitle: "Your Trusted Ride Partner"
- Icons: Taxi/car icon, location pin
- Style: Modern, clean, professional

**Tools to Create:**
- Figma (free): https://figma.com
- Canva (free): https://canva.com
- Adobe Express (free): https://adobe.com/express
- GIMP (free): https://gimp.org

### 4. Promo Video (Optional but Recommended)
- Length: 30 seconds - 2 minutes
- Format: MP4 or MOV
- Aspect ratio: 16:9
- Shows: App features in action

## Quick Creation Steps

### Screenshot Preparation

1. **Setup Emulator**
```bash
# Use Pixel 5 (1080x2340) in Android Studio
# Set to "Book" mode for clean status bar
```

2. **Prepare Test Data**
```bash
# Login with test account
Phone: +91-1234567890
OTP: 123456

# Add mock rides in backend if needed
```

3. **Capture Screens**
- Home: Map showing current location
- Booking: Fill in pickup/drop, select vehicle
- Active: Mock an active ride (or use backend to create one)
- History: Show rides list
- Profile: Open profile screen

4. **Edit Screenshots** (Optional)
- Remove status bar personal info
- Add device frame
- Add captions/annotations
- Consistent device mockup

**Tools for Editing:**
- **Device Art Generator:** https://developer.android.com/distribute/marketing-tools/device-art-generator
- **Screenshot Frames:** https://screenshots.pro
- **Figma Templates:** Search "app screenshot template"

### Feature Graphic Creation

**Template Structure:**
```
┌─────────────────────────────────────┐
│  1024 x 500 px                      │
│                                     │
│     🚕  JK TAXI                     │
│     Your Trusted Ride Partner      │
│                                     │
│  [Gradient Background]              │
└─────────────────────────────────────┘
```

**Figma Instructions:**
1. Create 1024x500 frame
2. Add gradient background (Yellow to Teal)
3. Add "JK Taxi" text (Pacifico or similar font)
4. Add tagline in smaller text
5. Add taxi icon from Iconify or Flaticon
6. Export as PNG

**Canva Instructions:**
1. Create custom size: 1024x500
2. Search "app store feature graphic" templates
3. Customize with JK Taxi branding
4. Download as PNG

## Asset Organization

Create this folder structure:
```
playstore-assets/
├── icon.png (1024x1024)
├── feature-graphic.png (1024x500)
├── screenshots/
│   ├── phone/
│   │   ├── 1-home.png
│   │   ├── 2-booking.png
│   │   ├── 3-tracking.png
│   │   ├── 4-history.png
│   │   └── 5-profile.png
│   └── tablet/ (optional)
│       └── *.png
└── promo-video.mp4 (optional)
```

## Tools & Resources

### Screenshot Tools
- **Android Studio Emulator:** Built-in screenshot tool
- **ADB:** Command-line screenshot capture
- **Scrcpy:** https://github.com/Genymobile/scrcpy (screen mirror + capture)

### Design Tools (Free)
- **Figma:** https://figma.com - Professional design tool
- **Canva:** https://canva.com - Easy templates
- **Adobe Express:** https://adobe.com/express - Quick graphics
- **GIMP:** https://gimp.org - Open-source Photoshop alternative

### Device Frames
- **Device Art Generator:** https://developer.android.com/distribute/marketing-tools/device-art-generator
- **MockUPhone:** https://mockuphone.com
- **Screely:** https://screely.com (browser mockups)

### Stock Images (If Needed)
- **Unsplash:** https://unsplash.com
- **Pexels:** https://pexels.com
- **Pixabay:** https://pixabay.com

### Icons
- **Iconify:** https://iconify.design
- **Flaticon:** https://flaticon.com
- **Noun Project:** https://thenounproject.com

## Automated Screenshot Generation

For future updates, consider:

### Fastlane Screenshots
```ruby
# Install fastlane
gem install fastlane

# Setup screenshots
fastlane snapshot init

# Configure devices and tests
# Run automated screenshot capture
fastlane snapshot
```

### Detox E2E Tests
```javascript
// Take screenshots during tests
await device.takeScreenshot('home-screen');
```

## Quality Guidelines

### Screenshots
✅ DO:
- Use real content (not lorem ipsum)
- Show actual features
- Keep consistent device/orientation
- Use clean, readable UI states
- Remove sensitive test data

❌ DON'T:
- Use low resolution images
- Include personal information
- Show error states
- Use different devices per screenshot
- Include development debug info

### Feature Graphic
✅ DO:
- Use brand colors
- Keep text large and readable
- Use high contrast
- Show app name clearly
- Keep design simple

❌ DON'T:
- Use too much text
- Use low-res images
- Copy competitors
- Use misleading images
- Include small details

## Validation

Before uploading to Play Console:

**Screenshots:**
```bash
# Check dimensions
identify screenshot.png
# Should be: 1080x1920 or 1080x2400

# Check file size
ls -lh screenshot.png
# Should be: < 8 MB
```

**Feature Graphic:**
```bash
# Check dimensions
identify feature-graphic.png
# Should be: 1024x500

# Check file size
ls -lh feature-graphic.png
# Should be: < 1 MB
```

## Ready to Upload

Once assets are created:

1. Copy icon from `assets/images/icon.png`
2. Place screenshots in `playstore-assets/screenshots/phone/`
3. Place feature graphic in `playstore-assets/feature-graphic.png`
4. Compress all in ZIP for easy upload
5. Follow `PLAYSTORE_GUIDE.md` for submission

## Need Help?

If you need professional assets:
- **Fiverr:** Hire designer ($20-50)
- **99designs:** Design contest
- **Upwork:** Freelance designer

Most designers can create full Play Store asset package in 1-2 days.

---

**Pro Tip:** Create assets once, reuse with minor updates for all future app releases!
