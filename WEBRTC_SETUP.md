# WebRTC Integration Guide for HRLeave Mobile

This guide explains how to build the HRLeave mobile app with full WebRTC video/audio calling support.

## Overview

The app now includes WebRTC-based audio and video calling functionality, similar to the web version. Calls work through:
- **STUN/TURN servers** (Metered.ca) for NAT traversal
- **Convex** for signaling (call state management)
- **react-native-webrtc** for native media handling

## Prerequisites

1. **Node.js** 18+ installed
2. **EAS CLI** installed: `npm install -g eas-cli`
3. **Expo account** with proper credentials
4. **iOS**: Mac with Xcode 15+ (for iOS builds)
5. **Android**: Android Studio with SDK 33+ (for Android builds)

## Installation Steps

### 1. Install Dependencies

```bash
cd C:\Users\namel\Desktop\office-mobile
npm install
```

**Installed packages:**
- `react-native-webrtc` - WebRTC implementation for React Native
- `expo-av` - Audio/Video utilities (already installed)

### 2. Prebuild Native Modules

WebRTC requires native code, so you need to prebuild:

```bash
npx expo prebuild --clean
```

This generates native iOS and Android projects with WebRTC support.

### 3. Build for Android

```bash
# Development build (APK)
eas build --platform android --profile development

# Production build (AAB for Play Store)
eas build --platform android --profile production
```

### 4. Build for iOS

```bash
# Development build
eas build --platform ios --profile development

# Production build (App Store)
eas build --platform ios --profile production
```

## Testing Locally

### Android Emulator

WebRTC works on Android emulators, but camera/microphone may be limited:

```bash
npx expo run:android
```

### iOS Simulator

**Note:** WebRTC doesn't work on iOS Simulator. Test on a real device:

```bash
npx expo run:ios
```

### Physical Device (Recommended)

For best testing, use a physical device:

```bash
# Start development server
npx expo start

# Scan QR code with Expo Go app (limited WebRTC support)
# OR
# Use development build for full WebRTC support
```

## Configuration

### STUN/TURN Servers

The app uses Metered.ca TURN servers (configured in `CallModal.tsx`):

```javascript
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  {
    urls: 'turn:global.relay.metered.ca:80',
    username: 'ac986faa3d8fec75bb7c4aff',
    credential: 'WOCnG2giai1RFd3N',
  },
  // ... more servers
];
```

**To use your own TURN servers:**
1. Sign up at [Metered.ca](https://www.metered.ca/)
2. Replace credentials in `CallModal.tsx`

### Permissions

Permissions are configured in `app.json`:

**iOS:**
- `NSMicrophoneUsageDescription` - Microphone for calls
- `NSCameraUsageDescription` - Camera for video calls
- `UIBackgroundModes: voip` - VoIP background support

**Android:**
- `RECORD_AUDIO` - Microphone
- `CAMERA` - Camera
- `MODIFY_AUDIO_SETTINGS` - Audio routing
- `BLUETOOTH_CONNECT` - Bluetooth headsets
- `FOREGROUND_SERVICE` - Call notifications

## Features

### Audio Calls
- One-tap audio calling in direct messages
- Mute/unmute microphone
- Speaker toggle
- Call duration timer

### Video Calls
- Picture-in-picture local video
- Camera toggle (on/off)
- Front/back camera switching (future enhancement)
- Adaptive quality based on network

### Call States
- **Connecting** - Initializing media and peer connection
- **Ringing** - Waiting for remote peer
- **Active** - Call connected, duration timer running
- **Ended** - Call terminated

## Signaling via Convex

Call signaling is handled through Convex database:

1. **startCall** - Creates call message record
2. **answerCall** - Marks call as answered
3. **endCall** - Ends call and resets status
4. **getActiveCall** - Polls for active call state
5. **getIncomingCalls** - Checks for incoming calls

**Future enhancement:** Real-time signaling with Convex actions/webhooks for instant call notifications.

## Troubleshooting

### "WebRTC not available" Error

**Solution:** Rebuild native modules:
```bash
npx expo prebuild --clean
npm install
```

### Camera/Microphone Not Working

**iOS:**
- Check permissions in Settings > HRLeave
- Ensure `NSCameraUsageDescription` and `NSMicrophoneUsageDescription` are in `app.json`

**Android:**
- Check permissions in Settings > Apps > HRLeave > Permissions
- Ensure all audio/camera permissions are granted

### Call Quality Issues

1. **Check network** - WebRTC requires good UDP connectivity
2. **TURN servers** - Ensure TURN credentials are valid
3. **Firewall** - Ports 80, 443, 3478 must be open

### Build Fails

**Clean and rebuild:**
```bash
# Clear cache
npx expo start -c

# Rebuild
npx expo prebuild --clean
eas build --platform android --profile development
```

## Testing Checklist

- [ ] Audio call initiation works
- [ ] Video call initiation works
- [ ] Mute/unmute toggles correctly
- [ ] Camera on/off works
- [ ] Speaker toggle works
- [ ] Call duration timer displays
- [ ] Call ends properly
- [ ] Presence status updates to "in_call"
- [ ] Incoming call detection works
- [ ] Permissions are requested correctly

## Future Enhancements

1. **Real-time signaling** - WebSocket-based instant call setup
2. **Call notifications** - Push notifications for incoming calls
3. **Group calls** - Multi-party conferencing
4. **Screen sharing** - Share screen during video calls
5. **Call recording** - Record calls (with consent)
6. **Bluetooth headset** - Full Bluetooth audio support
7. **Call history** - Store call logs in database

## Support

For issues or questions:
- Check [react-native-webrtc docs](https://github.com/react-native-webrtc/react-native-webrtc)
- Review [Expo WebRTC guide](https://docs.expo.dev/versions/latest/sdk/webrtc/)
- Contact: romangulanyan@gmail.com
