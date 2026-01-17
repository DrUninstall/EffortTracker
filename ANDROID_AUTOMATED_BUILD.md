# 🤖 Automated Android APK Builds

No need to run commands! GitHub Actions automatically builds your APK.

## How It Works

Every time you push code to GitHub, a workflow automatically:
1. ✅ Builds your Next.js app
2. ✅ Sets up Android build environment
3. ✅ Compiles the APK
4. ✅ Uploads it for download

**Build time:** ~5-10 minutes

## Download Your APK (From Your Phone!)

### Method 1: From GitHub Actions Page

1. **Open your repo on GitHub** (in phone browser)
   ```
   https://github.com/DrUninstall/EffortTracker
   ```

2. **Go to "Actions" tab** (top menu)

3. **Click the latest workflow run** (green checkmark ✓)

4. **Scroll down to "Artifacts"**

5. **Click "effort-ledger-apk"** to download

6. **Install the APK** on your phone

### Method 2: Direct Link Pattern

After a successful build, the artifact URL follows this pattern:
```
https://github.com/DrUninstall/EffortTracker/actions/runs/[RUN_ID]
```

You can bookmark the Actions page for quick access.

## Manual Trigger (No Code Changes Needed)

Want to build without pushing code?

1. Go to **Actions** tab on GitHub
2. Click **"Build Android APK"** workflow (left sidebar)
3. Click **"Run workflow"** button (right side)
4. Select your branch
5. Click **"Run workflow"**
6. Wait ~5-10 minutes
7. Download from artifacts!

## What Triggers Automatic Builds

✅ Push to `main` or `master` branch
✅ Push to any `claude/**` branch
✅ Manual trigger via Actions tab

## Build Status

Check build status on GitHub:
- ✅ Green checkmark = Success (APK ready!)
- 🟡 Yellow dot = Building...
- ❌ Red X = Failed (check logs)

## Troubleshooting

### "No artifacts found"
- Build might still be running (yellow dot)
- Check the logs if build failed (red X)

### "Artifact expired"
- Artifacts are kept for 30 days
- Trigger a new build to get a fresh APK

### "Can't download artifact"
- Make sure you're logged into GitHub
- Try desktop mode in your phone browser

## For Development

If you're actively developing and want faster iteration:

**Use Codespace:**
```bash
npm run android:build
cp android/app/build/outputs/apk/debug/app-debug.apk ./EffortLedger.apk
# Download EffortLedger.apk from file explorer
```

**Use GitHub Actions:** for final builds and releases

## File Size

Expect APK size: ~15-30 MB (includes React, Next.js, and Android WebView wrapper)

## Next Steps

### For Testing
- Download the debug APK from artifacts
- Install on your device (allow unknown sources)

### For Release/Play Store
- See `ANDROID_BUILD.md` for signed release builds
- Signed releases require a keystore (can be automated too!)

## Benefits of Automated Builds

✅ No need for Android Studio on your device
✅ No manual command running
✅ Consistent build environment
✅ Build history and artifacts
✅ Works from your phone's browser
✅ Can share download link with testers

---

**Quick Link Template** (replace RUN_ID after first build):
```
https://github.com/DrUninstall/EffortTracker/actions
```

Save this link on your phone for instant access to builds!
