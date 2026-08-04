# JK Taxi Customer App - Troubleshooting Guide

## CORS Issues

### Problem: "CORS Missing Allow Origin"

**Error Message:**
```
Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource at http://localhost:8000/api/auth/login. (Reason: CORS header 'Access-Control-Allow-Origin' missing).
```

**Solution:**

1. **Backend CORS is now configured to allow all origins**. The backend has been updated to:
   ```python
   allow_origins=["*"]  # Allow all origins for development
   ```

2. **Restart the backend server:**
   ```bash
   # Stop the server (Ctrl+C if running)
   # Then restart:
   source ~/billion/bin/activate
   cd backend
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

3. **Update API URL for your platform:**

   Edit `app/customer/src/config.ts`:

   **For Web (Expo Web):**
   ```typescript
   BASE_URL: 'http://localhost:8000'
   ```

   **For Android Emulator:**
   ```typescript
   BASE_URL: 'http://10.0.2.2:8000'
   ```

   **For iOS Simulator:**
   ```typescript
   BASE_URL: 'http://localhost:8000'
   ```

   **For Physical Device:**
   ```typescript
   BASE_URL: 'http://192.168.1.XXX:8000'  // Your computer's IP
   ```

4. **Find your local IP:**
   ```bash
   # Windows
   ipconfig
   
   # Mac/Linux
   ifconfig
   # or
   ip addr show
   
   # Look for: 192.168.x.x or 10.0.x.x
   ```

---

## React Text Node Error

### Problem: "A text node cannot be a child of a View"

**Error Message:**
```
Unexpected text node: . A text node cannot be a child of a <View>.
```

**Solution:**

This has been fixed. The issue was spaces between Text components inside View. Changed from:
```jsx
<Text>Don't have an account? </Text>  // Space at end
```

To:
```jsx
<Text>Don't have an account?</Text>  // No space
```

**If you see this error elsewhere:**
1. Find the View component with the error
2. Make sure all text is wrapped in `<Text>` components
3. Remove spaces between Text and other components

---

## API Connection Issues

### Problem: Cannot connect to backend

**Checklist:**

1. **Is backend running?**
   ```bash
   curl http://localhost:8000/health
   # Should return: {"status":"healthy","app":"JK Taxi API"}
   ```

2. **Check backend logs:**
   ```bash
   # Look for errors in the terminal running uvicorn
   ```

3. **Test API directly:**
   ```bash
   curl -X POST http://localhost:8000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"phone":"9876543210","password":"password123"}'
   ```

4. **Check firewall:**
   - Allow port 8000 through firewall
   - On Windows: `netsh advfirewall firewall add rule name="FastAPI" dir=in action=allow protocol=TCP localport=8000`
   - On Mac: System Preferences → Security → Firewall
   - On Linux: `sudo ufw allow 8000`

5. **Network connectivity:**
   - Phone and computer on same WiFi
   - No VPN blocking connections
   - Router not blocking ports

---

## Common Errors and Fixes

### 1. "Network request failed"

**Cause:** Cannot reach backend

**Fix:**
- Update API URL in `src/config.ts`
- Use correct IP for your device
- Check backend is running
- Check network connectivity

### 2. "Login failed" or "Invalid credentials"

**Cause:** Wrong phone/password

**Fix:**
- Use test credentials: `9876543210` / `password123`
- Or register new account
- Check backend logs for actual error

### 3. "Invalid OTP"

**Cause:** Wrong OTP code

**Fix:**
- Use static OTP: `123456`
- This always works in development

### 4. App crashes on startup

**Cause:** Various issues

**Fix:**
```bash
# Clear cache and restart
cd app/customer
npx expo start --clear
```

### 5. "Cannot find module" errors

**Cause:** Missing dependencies

**Fix:**
```bash
cd app/customer
rm -rf node_modules
npm install
```

### 6. TypeScript errors

**Cause:** Type mismatches

**Fix:**
```bash
# Check tsconfig.json
# Ensure all imports use correct paths
# Run: npx tsc --noEmit
```

---

## Testing the Connection

### Step-by-step test:

1. **Test backend health:**
   ```bash
   curl http://localhost:8000/health
   ```
   Expected: `{"status":"healthy","app":"JK Taxi API"}`

2. **Test CORS:**
   ```bash
   curl -i -X OPTIONS http://localhost:8000/api/auth/login \
     -H "Origin: http://localhost:19006" \
     -H "Access-Control-Request-Method: POST"
   ```
   Should see: `Access-Control-Allow-Origin: *`

3. **Test login API:**
   ```bash
   curl -X POST http://localhost:8000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"phone":"9876543210","password":"password123"}'
   ```
   Should return access token

4. **Test from app:**
   - Open app
   - Try to login
   - Check browser console (if web)
   - Check Metro bundler logs
   - Check backend logs

---

## Platform-Specific Issues

### Web (Expo Web)

**Issue:** CORS errors on web

**Fix:**
- Backend now allows all origins
- Use `http://localhost:8000` in config
- Clear browser cache
- Use Chrome DevTools to check network tab

### Android Emulator

**Issue:** Cannot connect to localhost

**Fix:**
- Use `10.0.2.2` instead of `localhost`
- Update config.ts:
  ```typescript
  BASE_URL: 'http://10.0.2.2:8000'
  ```

### iOS Simulator

**Issue:** Connection refused

**Fix:**
- Use `localhost` or `127.0.0.1`
- Make sure backend binds to `0.0.0.0` not `127.0.0.1`

### Physical Device

**Issue:** Cannot reach backend

**Fix:**
- Find your computer's IP: `ipconfig` or `ifconfig`
- Use that IP in config.ts
- Ensure phone and computer on same WiFi
- Check firewall allows port 8000

---

## Quick Fixes

### Reset Everything

```bash
# 1. Stop all servers (Ctrl+C)

# 2. Backend
cd backend
source ~/billion/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 3. Frontend (new terminal)
cd app/customer
npx expo start --clear

# 4. Test health
curl http://localhost:8000/health
```

### Clear App Data

```bash
# Android
adb shell pm clear host.exp.exponent

# iOS Simulator
Device → Erase All Content and Settings
```

### View Logs

```bash
# Backend logs
# Check terminal running uvicorn

# Frontend logs
# Check Metro bundler terminal

# Browser logs (if web)
# Open DevTools → Console

# Mobile logs
# Use React Native Debugger
# Or: npx react-native log-android
# Or: npx react-native log-ios
```

---

## Environment Variables

Make sure `.env` file exists in root:

```bash
cd /home/sakthi-selvan/jk_taxi
cat .env
# Should show DATABASE_URL, SECRET_KEY, etc.
```

---

## Getting Help

1. **Check API docs:** http://localhost:8000/docs
2. **Test APIs:** Use Swagger UI at /docs
3. **View logs:** Backend terminal and Metro bundler
4. **Network tab:** Browser DevTools (if web)
5. **React DevTools:** For component debugging

---

## Pro Tips

1. **Always test backend first** before debugging frontend
2. **Check network tab** to see actual API requests
3. **Use Postman/Insomnia** to test APIs independently
4. **Clear cache often** when making config changes
5. **Use React Native Debugger** for better debugging experience

---

## Contact

If issues persist:
1. Check backend is running and healthy
2. Verify API URL matches your platform
3. Ensure CORS is configured (it is now)
4. Test API with curl/Postman first
5. Check console logs for specific errors
