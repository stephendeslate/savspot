# Pricing Models

SavSpot supports several pricing models to match how your business charges for services. Whether you offer flat-rate appointments, variable pricing based on options, or complimentary sessions, you can configure it all from the service editor.

## Available Pricing Models

| Model | Use Case | Example |
|-------|----------|---------|
| **Fixed Price** | Single price for the service | "$50.00 for a 30-minute consultation" |
| **Variable Price** | Multiple price points based on options | "$40 / $60 / $80 for short / medium / long sessions" |
| **Free** | No charge collected at booking | "Free initial consultation" |

## Setting a Fixed Price

1. Open the service editor for a new or existing service.
2. In the **Price** field, enter the amount in your local currency (e.g., `50.00`).
3. Save the service.

The price displays to clients on the booking page exactly as entered. All prices are stored in major currency units (dollars, euros, pounds) as decimal values. Currency conversion to minor units (cents) only happens at the payment processing boundary.

## Setting Up Variable Pricing

Variable pricing lets you offer the same service at different price points. This is useful when the price depends on a client selection such as session length, experience level, or package tier.

1. Open the service editor.
2. Enable **Variable Pricing**.
3. Add each price variant with a label and amount.
4. Save the service.

During booking, clients choose from the available price options before confirming.

> **Tip:** Use descriptive labels for variable pricing options so clients understand exactly what they are selecting. "Premium (90 min, includes follow-up)" is clearer than "Option C."

## Free Services

To offer a service at no cost, leave the price field empty or set it to `0.00`. Free services skip the payment step during booking but still appear on your calendar and in client booking history.

> **Tip:** Free services work well for discovery calls or initial consultations. You can always update the pricing model later without affecting past bookings.

## How Prices Display

Prices appear on your public booking page next to the service name. For variable pricing, the range is shown (e.g., "$40 - $80") until the client selects a specific option.
