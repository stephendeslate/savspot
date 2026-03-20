# Client Profiles

Each client in SavSpot has a profile page that brings together their stats, booking history, payment records, tags, and notes.

## Accessing a Client Profile

1. Navigate to **Clients** (`/clients`).
2. Click on a client's card in the directory.

## Profile Header

The top of the profile shows:

- **Avatar** (initials) + **Name**
- **Email** (with mail icon)
- **Phone** (with phone icon, if provided)
- **Member since** date (month and year)

## Stat Cards

Four metric cards appear below the header:

| Card | Description |
|------|-------------|
| **Total Bookings** | All-time booking count |
| **Total Revenue** | Total amount paid across all bookings |
| **Last Visit** | Date of the most recent appointment |
| **No-Shows** | Number of times the client did not arrive |

## Booking History

A table of all bookings associated with this client, showing up to 10 entries:

| Column | Description |
|--------|-------------|
| **Date** | Booking date and time (e.g., "Jan 1, 2026 2:00 PM") |
| **Service** | Service name |
| **Status** | Color-coded status badge |
| **Amount** | Booking total |

Click any row to open the booking detail at `/bookings/{id}`.

## Payment History

A table of all payments, showing up to 10 entries:

| Column | Description |
|--------|-------------|
| **Invoice** | Invoice number (or "--" if none) |
| **Amount** | Payment amount |
| **Status** | Payment status badge |
| **Date** | Payment date |

## Tags

The right sidebar includes a **Tags** card where you can:

- View existing tags as badges
- Remove a tag by clicking the X button
- Add a new tag by typing in the input field and pressing Enter or clicking the plus button

Tags are useful for segmenting clients (e.g., "VIP", "Referred", "New").

## Notes

Two note systems are available on the right sidebar. See [Client Notes](./client-notes.md) for details.

> **Tip:** Contact information on client profiles is read-only from the management interface. Client details are updated when clients modify their own profile through the portal.
