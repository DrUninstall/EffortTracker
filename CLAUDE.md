# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Build for production (static export)
npm run lint     # Run ESLint

# Android (requires Capacitor setup - see ANDROID_QUICKSTART.md)
npm run android:init         # Initialize Android platform (one-time)
npm run android:sync         # Build web app and sync to Android
npm run android:open         # Open in Android Studio
npm run android:build        # Build debug APK
npm run android:build:release  # Build release APK
```

## Architecture

Effort Ledger is a local-first, quota-based personal productivity app built with Next.js 14 (App Router).

### Core Concepts

- **Tasks**: Have daily or weekly quotas, priority levels (CORE/IMPORTANT/OPTIONAL), optional carryover
- **IncrementLogs**: Track logged minutes per task per date, with source type (QUICK_ADD/TIMER/POMODORO/MANUAL)
- **Core loop**: Accumulate effort → see remaining → hit quota → feel "done"

### State Management

Zustand store (`src/stores/taskStore.ts`) with persist middleware handles all app state:
- Tasks and logs stored in IndexedDB (with localStorage fallback via `src/lib/storage.ts`)
- Store hydration is async; components must handle `isHydrated` state
- Computed progress uses `getTaskProgress()` and `getAllTaskProgress()` which calculate remaining quota, carryover, etc.

### Styling

- **CSS Modules only** (no Tailwind)
- Design tokens defined in `src/app/globals.css` (see `DESIGN_SYSTEM.md` for reference)
- Semantic color variables auto-switch for dark mode: `--text-strong`, `--background-base`, `--stroke-weak`, etc.
- 4px spacing grid: `--space-2` (8px), `--space-4` (16px), etc.

### Key Patterns

- Radix UI primitives for accessible components (unstyled, styled via CSS Modules)
- Framer Motion for animations (prefer S-tier compositor properties: transform, opacity)
- Path alias `@/*` maps to `./src/*`
- Static export enabled (`output: 'export'` in next.config.js) with base path `/EffortTracker`
- All dates stored as `YYYY-MM-DD` strings in user's local timezone

### File Structure

- `src/app/` - Next.js App Router pages (home, timer, history, settings)
- `src/components/` - React components with co-located CSS Modules
- `src/stores/` - Zustand stores (taskStore, timerStore, onboardingStore)
- `src/types/index.ts` - All TypeScript types
- `src/lib/storage.ts` - IndexedDB/localStorage adapter
- `src/utils/` - Date utilities, UUID generation

## Android App

The web app can be wrapped as a native Android APK using Capacitor.

### Quick Start

See `ANDROID_QUICKSTART.md` for setup and build instructions.

### How it Works

- Capacitor wraps the Next.js static export (`/out`) in a native WebView
- IndexedDB and localStorage work natively (no code changes needed)
- The app runs completely offline with native performance
- `capacitor.config.ts` configures the native wrapper

### Build Process

1. Install Capacitor: `npm install @capacitor/core @capacitor/cli @capacitor/android`
2. Initialize: `npm run android:init`
3. Build APK: `npm run android:build`
4. Output: `android/app/build/outputs/apk/debug/app-debug.apk`

### Requirements

- Android Studio (includes JDK)
- For device testing: Enable USB debugging
- For Play Store: Create signed release build (see `ANDROID_BUILD.md`)

### Storage Compatibility

The existing IndexedDB/localStorage storage layer works perfectly in Capacitor's WebView:
- All data persists locally on device
- No API changes needed
- Same storage limits as native apps
