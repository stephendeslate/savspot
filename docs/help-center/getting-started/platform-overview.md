# Platform Overview

SavSpot is a multi-tenant SaaS booking platform built for service businesses. Whether you run a salon, spa, consulting firm, fitness studio, or photography business, SavSpot provides the tools you need to manage bookings, clients, payments, and your team from a single dashboard.

## Core Features

| Feature | Description | Location |
|---------|-------------|----------|
| Dashboard | Real-time KPIs, today's schedule, and quick actions | `/dashboard` |
| Bookings | Create, manage, and track all appointments | `/bookings` |
| Calendar | Daily, weekly, and monthly schedule views | `/calendar` |
| Services | Define your offerings with pricing and durations | `/services` |
| Clients | Client profiles, notes, and booking history | `/clients` |
| Payments | Stripe-powered payment processing and tracking | `/payments` |
| Settings | Business profile, branding, team, and configuration | `/settings` |

## Navigation

The SavSpot sidebar organizes your workspace into four sections:

- **Core** -- Dashboard, Calendar, Bookings
- **Business** -- Services, Clients, Payments
- **Communication** -- Notifications and messaging
- **System** -- Settings and account management

## How It Works

1. **Create your account** and complete the onboarding wizard
2. **Define your services** with pricing, durations, and availability
3. **Share your booking page** with clients or create bookings manually
4. **Manage your schedule** from the calendar and bookings views
5. **Track performance** through dashboard KPIs and metrics

> **Tip:** SavSpot adapts to your business type. During onboarding, selecting your business type pre-configures sensible defaults so you can get started faster.

## Multi-Tenant Architecture

Each SavSpot account operates as an independent tenant with fully isolated data. Your client information, bookings, and business settings are never shared with or visible to other accounts on the platform.
