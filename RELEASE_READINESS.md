# Customer Android release review

Reviewed 5 October 2026. The source has been hardened, but a signed AAB and a Play-delivered install have not been verified. Do not interpret a successful JavaScript export as proof that the native app cannot crash.

## Changes

- Preserved the production API: https://api.jktaxitamilnadu.com. Development still uses the local Wi-Fi API.
- Fixed booking methods, scheduled_datetime and fare fields to match the backend; driver details use the backend's flat response fields.
- Added a bounded token refresh, shared refresh for concurrent requests, and retained saved sessions on network/server failures.
- Added safe timeout/offline/server error messages and a screen recovery boundary. Requests that create bookings are not automatically retried.
- Fixed the main scheduled booking timezone and future-time validation; blocked concurrent submissions from repeated taps.
- Fixed Mapbox token initialization, missing-token map placeholders, optional telemetry timing, and the notification project ID/channel order.
- Removed literal EAS @token placeholders. The native Mapbox plugin reads RNMAPBOX_MAPS_DOWNLOAD_TOKEN from the build environment; secret download credentials are not placed in public plugin options.
- Excluded local .env files and submission credentials from the EAS archive. Enabled remote Android version tracking and production version increments.
- Removed unused Android background-location permission; active driver tracking uses the API and WebSocket. The unused background tracking service is not enabled in this release.
- Preserved brand colors; refined the home destination card and support/privacy/notification screens. Removed fake support tickets and nonfunctional privacy/notification switches. Existing contact details were retained as instructed.
- Applied Expo SDK 54 patch alignment and compatible Axios/shell-quote dependency patches.

## Verification completed

- TypeScript: no errors.
- ESLint: no errors; existing warnings remain (unused code and hook dependencies among them).
- Expo Doctor: 18/18 checks passed.
- Regression tests: validation messages, server-error redaction, booking timeout wording, concurrent refresh, offline session retention, incorrect OTP behavior, rejected refresh logout, production API and AAB configuration.
- Optimized Android Hermes export: succeeded, 1,617 modules and 57 assets. Output: D:\jk\.tools\release-export-final.
- Android native prebuild: succeeded. Generated native files are ignored by Git and excluded from cloud upload; EAS will regenerate them.
- Production /health responded healthy. No authenticated production booking, cancellation, or user-data mutations were made.
- Dependency audit after targeted patches: 0 critical, 31 high, 17 moderate, 1 low. Findings include transitive Expo/React Native tooling; they are unresolved findings, not verified runtime exploits. A broader SDK migration needs its own compatibility and device validation.

## Remaining release gates

1. Expo account login completed for the existing ssakthitselvan project on 5 October 2026.
2. RNMAPBOX_MAPS_DOWNLOAD_TOKEN is configured locally and as an EAS preview secret; native SDK download access verified (HTTP 200). Configure the production environment before an AAB build. Configure EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN as a public/sensitive pk. token, or verify the authenticated backend map-token endpoint supplies one. Private download tokens must never be bundled as public runtime tokens.
3. Build and install a preview APK, then produce the signed production AAB. Signing and build-number state need the authenticated EAS account. No AAB has been produced or uploaded in this review.
4. Test the actual Play internal-track install: cold start without Metro, OTP/sign-in, session restore, pickup/search, fares, immediate/scheduled bookings, cancellation, driver updates, completion/rating, history, logout, offline recovery, permission denial, back navigation and small-screen layouts. Use a controlled test account/driver.
5. Inspect all native libraries in the actual AAB for 16 KB compatibility and test on a 16 KB Android emulator/device. Source/prebuild checks do not certify packaged native libraries. See https://developer.android.com/guide/practices/page-sizes.
6. Provide working public privacy-policy and account-deletion request web URLs in Play Console. The in-app deletion/data flow opens an email draft to support@jktaxi.app; it does not delete accounts automatically. Confirm support monitors this address, processes deletion of associated data, and discloses any retained data. The backend currently has no account-deletion endpoint. See https://support.google.com/googleplay/android-developer/answer/13327111.
7. Complete Data safety, permissions declarations, reviewer access, store assets, and the Play pre-launch report. Review the bundled terms/privacy text against actual business practices before publication.
8. Remote push delivery is not verified. The notification helper is not currently invoked by the app, and no backend push registration/delivery integration or Firebase credentials were validated. Foreground live tracking is separate from remote push.
9. Review remaining dependency advisories before release; no forced major Expo/React Native upgrades were made.

## Commands

```powershell
. D:\jk\setup-shell.ps1
cd D:\jk\jk_customer
npm run test:release
npm run typecheck
npx expo-doctor
eas login
eas build --platform android --profile preview
# After testing the preview and configuring production secrets:
eas build --platform android --profile production
```

EAS variables are configured per environment, not as @placeholder strings: https://docs.expo.dev/eas/environment-variables/.

## Customer APK build

Preview build submitted with the existing remote Android keystore, production API, version 1.0.0 / versionCode 1:
https://expo.dev/accounts/ssakthitselvan/projects/jk-taxi-customer/builds/71a2aa18-3fe3-47bb-9d4b-87080f7443d1

Build FINISHED successfully; Gradle release build completed in 19m 52s. APK downloaded to `D:\jk\jk_customer\build\JK-Taxi-Customer-1.0.0-preview.apk` (192.9 MiB).

Download: https://expo.dev/artifacts/eas/R9JaparRsrF01NxjD4QWpXHSdsr7K7sIqwgDrt7i5sA.apk

Archive CRC check passed. Manifest, Android bytecode, bundled JavaScript and native libraries for arm64-v8a, armeabi-v7a, x86 and x86_64 are present. The private Mapbox download credential is absent from inspected non-native APK entries. This is archive validation, not a native signature audit or device smoke test.

SHA256: `ff462b5e36944640b64f3f968e936dabab47da97e2ad3773d88392a606485845`

Physical-device testing and production AAB/Play testing remain pending.
