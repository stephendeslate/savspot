# SavSpot Mobile App

React Native / Expo mobile app for the SavSpot booking platform.

## Setup

```bash
# Install dependencies (from monorepo root)
pnpm install

# Start development server
cd apps/mobile
pnpm dev

# Run on iOS simulator
pnpm ios

# Run on Android emulator
pnpm android
```

## Build

```bash
# Development build
eas build --profile development

# Preview build
eas build --profile preview

# Production build
eas build --profile production
```

## Features

- Booking flow (service selection, date/time, payment, confirmation)
- Client portal (view bookings, history, payments)
- Push notifications (booking confirmations, reminders)
- Biometric authentication (Face ID / Fingerprint)
- Secure token storage (Keychain / Keystore)
- Offline mode (cached bookings)
- Deep linking (savspot://book/[slug])
- Directory search
