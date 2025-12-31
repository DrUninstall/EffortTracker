# Effort Ledger

A local-first, quota-based personal productivity web app for tracking intentional effort toward your goals.

## Purpose

Effort Ledger tracks intentional effort toward quotas (study, reading, workouts, etc.).

**Core loop:** Accumulate effort → see remaining → hit quota → feel "done" → move on mentally.

This app exists to provide **mental closure**. It is NOT a planner, habit tracker, or life OS. It is a quota-based effort ledger with pacing support, progress feedback, and long-term history for self-calibration.

## Features

- **Quota-based tracking**: Daily or weekly quotas for each task
- **Low-friction logging**: Quick add buttons (+5, +10, +15, +25 minutes) for 1-2 tap logging
- **Timer/Pomodoro**: Stopwatch and Pomodoro timer modes with auto-logging
- **Carryover support**: Optional overflow from previous days reduces today's quota
- **History & Analytics**: Track total effort, quota hit rates, streaks, and more
- **Local-first**: All data stored in IndexedDB (with localStorage fallback)
- **Export/Import**: Full JSON backup of all tasks and logs
- **Responsive**: Mobile-first design with bottom navigation, desktop sidebar

## Tech Stack

- Next.js 14+ (App Router)
- TypeScript
- React
- CSS Modules (no Tailwind)
- Framer Motion for animations
- Zustand for state management with persist middleware
- IndexedDB via custom storage adapter
- Radix UI primitives (unstyled components)
- Lucide React icons

## Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, or pnpm

### Installation

```bash
# Install dependencies
npm install
# or
yarn install
# or
pnpm install
```

### Development

```bash
# Start development server
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
# Build for production
npm run build
# or
yarn build
# or
pnpm build
```

## Default Demo Tasks

On first run, the app creates three demo tasks:

1. **EA Study** — 240m/day — CORE
2. **Reading** — 10m/day — IMPORTANT
3. **Workout** — 60m/day — IMPORTANT

## Core Principles

1. **Everything is quota-based** (daily or weekly)
2. **Logging must be extremely low friction** (1–2 taps)
3. **Pomodoro is a pacing aid**, not the score
4. **Gamification provides progress feedback**, not pressure
5. **History exists to tune future quotas**, not to judge the user

## Data Model

### Task
- Name, priority (CORE/IMPORTANT/OPTIONAL)
- Quota type (DAILY/WEEKLY)
- Quota minutes
- Carryover toggle (daily only)
- Pomodoro defaults
- Optional color

### IncrementLog
- Task ID
- Date (YYYY-MM-DD)
- Minutes logged
- Source (QUICK_ADD/TIMER/POMODORO/MANUAL)
- Timestamp

## License

MIT
