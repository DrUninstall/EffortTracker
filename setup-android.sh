#!/bin/bash
# setup-android.sh - Android APK Setup Script
# Run this script when you're on a computer with npm access

set -e  # Exit on error

echo "🚀 Setting up Android APK build for Effort Ledger..."
echo ""

# Step 1: Install Capacitor dependencies
echo "📦 Step 1/4: Installing Capacitor dependencies..."
npm install @capacitor/core @capacitor/cli @capacitor/android
echo "✅ Capacitor installed"
echo ""

# Step 2: Build the Next.js app
echo "🔨 Step 2/4: Building Next.js app..."
npm run build
echo "✅ Web app built"
echo ""

# Step 3: Initialize Android platform
echo "🤖 Step 3/4: Initializing Android platform..."
npx cap add android
echo "✅ Android platform added"
echo ""

# Step 4: Sync web app to Android
echo "🔄 Step 4/4: Syncing web app to Android..."
npx cap sync android
echo "✅ Web app synced to Android"
echo ""

echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Download Android Studio from https://developer.android.com/studio"
echo "2. Open the /android folder in Android Studio"
echo "3. Wait for Gradle sync to complete"
echo "4. Build > Build Bundle(s) / APK(s) > Build APK(s)"
echo "5. Your APK will be at: android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo "Or run: npm run android:build"
