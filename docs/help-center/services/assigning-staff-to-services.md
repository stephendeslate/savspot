# Assigning Staff to Services

When your business has multiple team members, you can control which staff members (called "providers") are eligible to deliver each service.

## Accessing the Providers Page

1. Navigate to **Services** (`/services`).
2. Click on a service to open its detail page.
3. Click **Manage Providers** (users icon) in the top right, or go directly to `/services/[id]/providers`.

## Assigning a Provider

1. Click **Assign Provider** (plus icon).
2. A dialog shows available team members with their name, email, and role.
3. Click **Assign** next to the team member you want to add.

If all team members are already assigned, the dialog shows "No available team members."

## Current Providers

The page lists all assigned providers with:

- Avatar (initials) + Name + Email
- Role badge (Owner, Admin, or Staff)
- **Remove** button (user-minus icon)

## Removing a Provider

1. Click **Remove** on the provider you want to unassign.
2. A confirmation dialog appears: "Are you sure you want to remove [name] from this service?"
3. Click **Remove** to confirm.

Changes take effect immediately for future bookings. Existing bookings are not affected.

## Impact on the Booking Flow

When a service has multiple assigned providers, a **Provider Selection** step appears in the client booking flow. Clients can choose which provider they want. If only one provider is assigned, the step is skipped.

SavSpot calculates available time slots by checking each assigned provider's availability. Clients see combined availability across all providers.

> **Tip:** Make sure each assigned provider has availability rules configured at **Settings > Availability** (`/settings/availability`). Without availability rules, no slots will appear for that provider.
