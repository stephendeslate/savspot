# Creating Services

Services are the foundation of your SavSpot booking page. Each service represents an offering that clients can book, such as a haircut, consultation, or training session. This guide walks you through creating your first service.

## Getting Started

1. Navigate to **Services** in the sidebar, or go directly to `/services`.
2. Click the **New Service** button in the top-right corner. This takes you to `/services/new`.
3. Fill in the service details using the form fields described below.
4. Click **Save** to publish the service to your booking page.

## Service Form Fields

| Field | Required | Description |
|-------|----------|-------------|
| **Name** | Yes | The public-facing name of the service (e.g., "60-Minute Massage"). |
| **Description** | No | A short summary shown to clients during booking. Supports basic formatting. |
| **Duration** | Yes | How long the service takes, in minutes. Choose from preset increments or enter a custom value. |
| **Buffer Time** | No | Minutes of padding added before or after each booking. Use this for cleanup, preparation, or travel between appointments. |
| **Max Capacity** | No | The maximum number of clients who can book the same time slot. Defaults to 1 for one-on-one services. Set higher for group classes or workshops. |
| **Price** | No | The cost of the service. See [Pricing Models](./pricing-models.md) for details on different pricing options. |
| **Category** | No | Assign the service to a category for organization. See [Service Categories](./service-categories.md). |

## Buffer Time Explained

Buffer time prevents back-to-back bookings. For example, a 60-minute service with a 15-minute buffer will block out 75 minutes total on your calendar. This gives you time to reset between clients without manually adjusting your availability.

> **Tip:** If your service requires setup before the client arrives, use buffer time rather than inflating the service duration. This keeps the client-facing duration accurate while protecting your schedule.

## Group Services

Setting **Max Capacity** above 1 turns the service into a group booking. Multiple clients can book the same time slot until the capacity is reached. The calendar shows how many spots remain for each slot.

> **Tip:** Start with a single service and refine the details after your first few bookings. You can always edit a service later from the service detail page.
