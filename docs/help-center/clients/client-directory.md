# Client Directory

The client directory displays everyone who has booked with your business as a card grid with search, tag filtering, and sorting.

## Accessing the Client Directory

Navigate to **Clients** in the sidebar, or go directly to `/clients`.

## Client Cards

Each client appears as a card showing:

- **Avatar** (initials) + **Name**
- **Email** address
- **Phone** number (if provided)
- **Stats**: Bookings count, Revenue (formatted), Last Visit date
- **Tags** (if any) as badges

Click any card to open the client's profile at `/clients/{id}`.

## Searching

Use the search bar at the top to find clients by name, email, or phone number. Results update as you type with a 300ms debounce.

## Filtering by Tag

Use the tag dropdown to filter clients by a specific tag. Select "All Tags" to clear the filter.

## Sorting

Use the sort dropdown to order clients by:

| Sort Option | Description |
|-------------|-------------|
| **Last Visit** | Most recently seen clients first (default) |
| **Total Bookings** | Most active clients first |
| **Total Revenue** | Highest-spending clients first |
| **Name** | Alphabetical order |

## Pagination

The directory shows 20 clients per page with Previous/Next buttons and page number navigation.

## How Clients Are Added

Clients are added to the directory automatically when they complete a booking through your booking page or when a walk-in booking includes their name and email. There is no manual "Add Client" button — clients are created through the booking process.

> **Tip:** Encourage clients to use the same email address for every booking. This keeps their history consolidated under a single profile rather than creating duplicates.
