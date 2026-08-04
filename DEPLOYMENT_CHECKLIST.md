# JK Taxi - Production Deployment Checklist

## Pre-Deployment

### Configuration
- [ ] Update production API URL in `.env.production`
- [ ] Verify Mapbox token is valid and has sufficient quota
- [ ] Check app version and build number in `app.json`
- [ ] Review all environment variables
- [ ] Update privacy policy with actual contact info
- [ ] Add actual support email and phone numbers

### Code Review
- [ ] Remove all `console.log` statements (or use production logger)
- [ ] Remove debug code and test accounts
- [ ] Check for hardcoded URLs or credentials
- [ ] Verify error handling on all API calls
- [ ] Test offline mode
- [ ] Review permissions usage

### Testing
- [ ] Login flow works
- [ ] OTP verification works
- [ ] Location permission handling
- [ ] Map loads correctly
- [ ] Ride booking flow complete
- [ ] Schedule ride works
- [ ] Cancel ride works
- [ ] Ride history displays
- [ ] Profile update works
- [ ] Push notifications work
- [ ] Background location tracking works
- [ ] App handles poor network
- [ ] App recovers from crashes
- [ ] Payment flow (if implemented)

### Performance
- [ ] App launches in < 3 seconds
- [ ] No memory leaks
- [ ] Smooth scrolling
- [ ] Images load quickly
- [ ] API responses cached appropriately
- [ ] Battery usage reasonable

## Build Preparation

### Dependencies
- [ ] Run `npm audit fix` for security issues
- [ ] Update outdated packages (carefully)
- [ ] Remove unused dependencies
- [ ] Verify all dependencies are compatible
- [ ] Check bundle size is reasonable

### Assets
- [ ] App icon (1024x1024) ready
- [ ] Adaptive icons configured
- [ ] Splash screen configured
- [ ] All images optimized
- [ ] Fonts loaded correctly

### EAS Setup
- [ ] EAS CLI installed globally
- [ ] Logged into Expo account
- [ ] Project configured with `eas build:configure`
- [ ] `eas.json` reviewed
- [ ] Build profiles configured

## Play Store Preparation

### Assets Created
- [ ] App icon (1024x1024)
- [ ] Feature graphic (1024x500)
- [ ] At least 2 phone screenshots
- [ ] Optional: Tablet screenshots
- [ ] Optional: Promo video

### Store Listing
- [ ] App title decided (max 30 chars)
- [ ] Short description written (max 80 chars)
- [ ] Full description written (max 4000 chars)
- [ ] Keywords for ASO identified
- [ ] Category selected (Maps & Navigation)
- [ ] Content rating completed

### Legal & Compliance
- [ ] Privacy policy published online
- [ ] Terms of service published
- [ ] Data safety form completed
- [ ] Permissions explained
- [ ] GDPR compliance reviewed (if applicable)
- [ ] COPPA compliance (app not for children)

### Play Console Setup
- [ ] Google Play Developer account created ($25 paid)
- [ ] App created in console
- [ ] Store listing filled
- [ ] Privacy policy URL added
- [ ] Contact email verified
- [ ] Content rating completed
- [ ] Target audience set
- [ ] Countries selected

## Build Process

### Preview Build (Testing)
```bash
# Build APK for internal testing
eas build --platform android --profile preview
```
- [ ] Build completed successfully
- [ ] Downloaded APK
- [ ] Installed on test device
- [ ] Tested all features
- [ ] No crashes found

### Production Build
```bash
# Build AAB for Play Store
eas build --platform android --profile production
```
- [ ] Build completed successfully
- [ ] Downloaded AAB
- [ ] File size reasonable (< 100MB)
- [ ] Build logs checked for warnings

## Internal Testing

### Test Distribution
- [ ] Created internal testing track in Play Console
- [ ] Added tester emails (up to 100)
- [ ] Uploaded AAB to internal track
- [ ] Shared test link with testers

### Testing Phase
- [ ] At least 3 testers tried the app
- [ ] Tested on different devices
- [ ] Tested on different Android versions
- [ ] All features work as expected
- [ ] No critical bugs found
- [ ] Performance is acceptable
- [ ] Battery usage acceptable

### Pre-Launch Report
- [ ] Reviewed pre-launch report from Play Console
- [ ] Fixed critical issues
- [ ] Addressed security vulnerabilities
- [ ] Checked accessibility score
- [ ] Reviewed performance metrics

## Production Release

### Final Checks
- [ ] All internal testing passed
- [ ] All Play Console sections completed (green checkmarks)
- [ ] Screenshots look professional
- [ ] Description has no typos
- [ ] Contact information correct
- [ ] Privacy policy accessible
- [ ] App version correct

### Submission
- [ ] Uploaded AAB to production track
- [ ] Added release notes
- [ ] Selected rollout percentage (or 100%)
- [ ] Reviewed release summary
- [ ] Clicked "Send for review"

### Post-Submission
- [ ] Review status: Pending
- [ ] Received confirmation email
- [ ] Estimated review time: 1-3 days
- [ ] Monitoring review status

## Post-Launch

### Monitoring (Week 1)
- [ ] Check crash reports daily
- [ ] Monitor user reviews
- [ ] Track install numbers
- [ ] Watch performance metrics
- [ ] Check API server load
- [ ] Monitor error tracking

### User Feedback
- [ ] Respond to reviews within 24h
- [ ] Collect user feedback
- [ ] Track common issues
- [ ] Plan bug fixes
- [ ] Prioritize feature requests

### Analytics Setup
- [ ] Firebase Analytics configured (if using)
- [ ] Key events tracked:
  - [ ] User signups
  - [ ] Rides booked
  - [ ] Rides completed
  - [ ] App opens
  - [ ] Feature usage
- [ ] Crash reporting active
- [ ] Performance monitoring active

### Marketing (Optional)
- [ ] Announce launch on social media
- [ ] Send email to beta users
- [ ] Create launch blog post
- [ ] Reach out to local media
- [ ] Run paid ads (if budget allows)

## First Update (1-2 Weeks)

### Prepare Update
- [ ] Fix critical bugs from user reports
- [ ] Improve performance issues
- [ ] Update version in `app.json`:
  ```json
  "version": "1.0.1",
  "android": {
    "versionCode": 2
  }
  ```

### Release Update
```bash
eas build --platform android --profile production
```
- [ ] Upload new AAB to Play Console
- [ ] Write release notes listing fixes
- [ ] Submit update

## Ongoing Maintenance

### Weekly
- [ ] Review crash reports
- [ ] Respond to user reviews
- [ ] Monitor performance metrics
- [ ] Check API logs

### Monthly
- [ ] Review analytics
- [ ] Plan feature updates
- [ ] Update dependencies
- [ ] Security audit

### Quarterly
- [ ] Major feature release
- [ ] Update screenshots if UI changed
- [ ] Refresh store listing
- [ ] Review and update privacy policy

## Emergency Response

### If App Crashes
1. Check crash reports in Play Console
2. Fix critical bug
3. Build emergency update
4. Release with "Emergency bug fix" in release notes
5. Monitor deployment

### If Policy Violation
1. Review violation email from Google
2. Fix issue immediately
3. Reply to Google with explanation
4. Submit update
5. Appeal if necessary

### If Negative Reviews
1. Respond politely within 24h
2. Offer to help via support email
3. Fix issue if legitimate
4. Release update
5. Thank user for feedback

## Success Metrics

### Week 1 Targets
- [ ] 0 critical crashes
- [ ] < 5% crash rate
- [ ] > 4.0 rating
- [ ] 100+ installs
- [ ] < 50% uninstall rate

### Month 1 Targets
- [ ] > 4.5 rating
- [ ] 1000+ installs
- [ ] < 30% uninstall rate
- [ ] 50+ reviews
- [ ] Featured feature requests

## Resources

- **Play Console:** https://play.google.com/console
- **Expo Dashboard:** https://expo.dev
- **Mapbox Dashboard:** https://mapbox.com/account
- **Support Email:** support@jktaxi.com

## Notes

- Keep this checklist updated with each release
- Share with team members
- Document any issues encountered
- Celebrate launch! 🎉

---

**Last Updated:** June 18, 2026
**Next Review:** Post-launch week 1
