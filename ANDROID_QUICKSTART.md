# Android Build - Quick Start

Follow these steps to build your Effort Ledger Android APK.

## First Time Setup

```bash
# 1. Install Capacitor (if network blocked in Claude Code environment, run locally)
npm install @capacitor/core @capacitor/cli @capacitor/android

# 2. Add Android platform
npm run android:init

# You only need to do this once
```

## Build APK

```bash
# Quick build (creates debug APK)
npm run android:build
```

Your APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

## Development Workflow

```bash
# After making changes to the web app:
npm run android:sync     # Rebuild web app and sync to Android

# Open in Android Studio to test on emulator/device:
npm run android:open

# Or build APK directly:
npm run android:build
```

## Install APK

### On Physical Device (USB)
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### On Emulator
Drag and drop the APK file onto the emulator

### Manual Install
Transfer APK to device and open it to install

## Requirements

- **Android Studio**: https://developer.android.com/studio
- **JDK 17**: Bundled with Android Studio
- **Enable USB Debugging**: Developer Options on your device

## For Play Store Release

See `ANDROID_BUILD.md` for complete instructions on:
- Creating signed release APK
- App icons and splash screens
- Play Store submission

## Troubleshooting

**Gradle errors?**
```bash
cd android
./gradlew clean
```

**App won't install?**
Enable "Install from Unknown Sources" in device settings

**Storage not working?**
It should work automatically - IndexedDB is supported natively

## File Structure After Setup

```
/android/                      # Full Android Studio project
/capacitor.config.ts          # Capacitor configuration
/out/                         # Built web app (synced to Android)
```
