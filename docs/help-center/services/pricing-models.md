# Pricing Models

SavSpot supports four pricing models that determine how a service is priced. You select the pricing model when creating or editing a service.

## Available Pricing Models

| Model | Description | Example |
|-------|-------------|---------|
| **Fixed Price** | A single flat rate for the service | "$50.00 for a 30-minute consultation" |
| **Hourly Rate** | Price calculated based on the service duration | "$75/hour for coaching" |
| **Tiered Pricing** | Multiple price tiers that clients can choose from | "$40 Basic / $60 Premium / $80 VIP" |
| **Free** | No charge collected at booking | "Free initial consultation" |

## Fixed Price

The most common model. Enter a base price and every booking for this service costs that amount.

1. Open the service editor.
2. Set the **Pricing Model** to **Fixed Price**.
3. Enter the **Base Price** (e.g., 50.00).
4. Save the service.

## Hourly Rate

Price scales with the service duration. Enter the hourly rate as the base price. SavSpot calculates the total based on the service's configured duration.

1. Set the **Pricing Model** to **Hourly Rate**.
2. Enter the hourly rate in the **Base Price** field.
3. Save the service.

A "Hourly" badge appears next to the service name in your service list.

## Tiered Pricing

Offer multiple price tiers for the same service. Tiers are configured using JSON in the Advanced Settings section.

1. Set the **Pricing Model** to **Tiered Pricing**.
2. Expand **Advanced Settings**.
3. In the **Tier Config (JSON)** field, define your tiers:

```json
[
  {"name": "Basic", "priceCents": 4000},
  {"name": "Premium", "priceCents": 6000},
  {"name": "VIP", "priceCents": 8000}
]
```

Note that tier prices are in **cents** (minor currency units), unlike the base price which is in major units.

A "Tiered" badge appears next to the service name in your service list.

## Free

For services with no charge. Set the pricing model to **Free** and the payment step is skipped during the booking flow. Free services still appear on your calendar and in booking history.

> **Tip:** Free services work well for discovery calls or initial consultations. You can always change the pricing model later without affecting past bookings.

## How Prices Display

Prices appear on your public booking page next to the service name. All prices are stored in major currency units (dollars, euros, pounds) as decimal values. Currency conversion to cents only happens at the payment processing boundary (Stripe).
