# Development Build Guide

## Issues Fixed

### ✅ 1. PlatformConsultants Error
**Fixed:** Updated package versions to match Expo SDK 54
- expo-speech: 55.0.8 → 14.0.8
- react-native: 0.76.9 → 0.81.5
- react: 19.2.4 → 19.1.0

### ✅ 2. Native Module Errors
**Fixed:** Added required native module plugins to app.json:
- expo-camera
- expo-speech-recognition
- expo-face-detector

## Build Instructions

### First Time Setup

1. **Login to EAS**
   ```bash
   npx eas login
   ```

2. **Build Development Client for Android**
   ```bash
   npx eas build --profile development --platform android
   ```
   
   This will:
   - Take 5-10 minutes
   - Generate an APK file
   - Give you a download link

3. **Install the APK**
   - Download the APK from the EAS build page
   - Transfer to your Android device
   - Install it (enable "Install from Unknown Sources" if needed)

4. **Start Development Server**
   ```bash
   npx expo start --dev-client
   ```

5. **Connect Your Device**
   - Open the installed "HRLeave (dev)" app on your device
   - Scan the QR code from the terminal
   - App will load with all native modules working!

### Daily Development

After the first build, you only need to run:
```bash
npx expo start --dev-client
```

### When to Rebuild

Only rebuild when you:
- Add new native modules/plugins
- Change native configuration in app.json
- Upgrade Expo SDK version

## iOS Build (Optional)

```bash
npx eas build --profile development --platform ios
```

Note: Requires Apple Developer account ($99/year)

## Troubleshooting

**"Cannot find module" errors:**
- Make sure you built and installed the development client
- Use `--dev-client` flag when starting

**Build fails:**
- Check EAS build logs
- Verify app.json is valid JSON
- Ensure all dependencies are installed

**App crashes on device:**
- Check Metro bundler terminal for errors
- Verify permissions are granted in device settings
