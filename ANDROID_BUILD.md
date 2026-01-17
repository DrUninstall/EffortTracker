# Android Build Guide - Effort Ledger

This guide walks you through building an Android APK from the Effort Ledger web app using Capacitor.

## Prerequisites

1. **Node.js and npm** (already installed)
2. **Android Studio** - Download from https://developer.android.com/studio
3. **Java Development Kit (JDK)** - JDK 17 recommended (bundled with Android Studio)

## Step 1: Install Capacitor Dependencies

Run this in your project root:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
```

## Step 2: Build the Next.js App

Capacitor wraps your static Next.js export, so build it first:

```bash
npm run build
```

This creates the `/out` directory with your static site.

## Step 3: Initialize Capacitor (First Time Only)

The configuration file `capacitor.config.ts` is already created. Now initialize the native projects:

```bash
npx cap init "Effort Ledger" "com.effortledger.app" --web-dir=out
```

## Step 4: Add Android Platform

```bash
npx cap add android
```

This creates the `/android` directory with a full Android Studio project.

## Step 5: Sync Web Assets to Android

Every time you rebuild the web app, sync it:

```bash
npm run build
npx cap sync android
```

## Step 6: Configure Android Project

### Update Android App Name and Icon

1. **App Name**: Edit `/android/app/src/main/res/values/strings.xml`
2. **App Icon**: Replace icons in `/android/app/src/main/res/mipmap-*/`
   - Use Android Asset Studio: https://romannurik.github.io/AndroidAssetStudio/

### Set Minimum SDK Version

Edit `/android/variables.gradle`:
```gradle
minSdkVersion = 22
targetSdkVersion = 34
compileSdkVersion = 34
```

## Step 7: Build the APK

### Option A: Using Android Studio (Recommended for First Build)

1. Open Android Studio
2. Open the `/android` folder as an existing project
3. Wait for Gradle sync to complete
4. Go to **Build > Build Bundle(s) / APK(s) > Build APK(s)**
5. APK will be at: `/android/app/build/outputs/apk/debug/app-debug.apk`

### Option B: Using Command Line

```bash
cd android
./gradlew assembleDebug
```

APK location: `/android/app/build/outputs/apk/debug/app-debug.apk`

### For Release/Signed APK

1. Create a keystore:
```bash
keytool -genkey -v -keystore my-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias my-key-alias
```

2. Update `capacitor.config.ts` with keystore details:
```typescript
android: {
  buildOptions: {
    keystorePath: 'path/to/my-release-key.jks',
    keystorePassword: 'your-password',
    keystoreAlias: 'my-key-alias',
    keystoreAliasPassword: 'your-alias-password',
    releaseType: 'APK'
  }
}
```

3. Build release APK:
```bash
cd android
./gradlew assembleRelease
```

## Step 8: Install APK on Device

### Via USB (Android Debug Bridge)

1. Enable Developer Options on your Android device
2. Enable USB Debugging
3. Connect via USB
4. Run:
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### Via File Transfer

1. Copy APK to your device
2. Open the file and install (may need to allow installation from unknown sources)

## Development Workflow

```bash
# 1. Make changes to web app
# 2. Rebuild and sync
npm run build && npx cap sync android

# 3. Open in Android Studio to run on emulator/device
npx cap open android

# Or build APK directly
cd android && ./gradlew assembleDebug
```

## NPM Scripts (Add to package.json)

```json
{
  "scripts": {
    "android:sync": "npm run build && npx cap sync android",
    "android:open": "npx cap open android",
    "android:build": "npm run build && npx cap sync android && cd android && ./gradlew assembleDebug"
  }
}
```

## Troubleshooting

### "Command not found: cap"
- Install Capacitor CLI globally: `npm install -g @capacitor/cli`
- Or use `npx cap` instead

### Gradle Build Errors
- Update Android Studio to latest version
- File > Invalidate Caches and Restart
- Delete `/android/.gradle` and rebuild

### App Won't Install
- Check minimum SDK version matches your device
- Enable "Install from Unknown Sources" in device settings

### Storage Not Working
- IndexedDB and localStorage work natively in Capacitor's WebView
- No code changes needed for storage

### App Crashes on Launch
- Check logcat in Android Studio: View > Tool Windows > Logcat
- Verify the web build (`/out`) is complete and error-free

## Testing Locally Before Building APK

You can test the built web app locally:

```bash
npm run build
npx serve out
```

## App Distribution

### Google Play Store
1. Create a signed release APK (see Step 7)
2. Create a Google Play Developer account ($25 one-time fee)
3. Follow Play Console upload process

### Direct Distribution
- Share the APK file directly
- Users must enable "Install from Unknown Sources"
- Consider signing APK for better trust

## Storage Considerations

Your app uses IndexedDB (with localStorage fallback) which works perfectly in Capacitor:
- Data persists between app sessions
- Stored locally on device
- No code changes needed
- Same storage API as web version

## Next Steps

- **App Icon**: Create proper launcher icons
- **Splash Screen**: Add splash screen images to `/android/app/src/main/res/drawable/`
- **Permissions**: Review AndroidManifest.xml for required permissions
- **Status Bar**: Customize status bar color in `capacitor.config.ts`
