# Tax Rates

SavSpot allows you to configure tax rates that are applied to your services and displayed on invoices. Set up your tax rates to ensure accurate billing and compliance with local tax regulations.

## Configuring Tax Rates

1. Navigate to **Settings > Tax Rates** (`/settings/tax-rates`).
2. Click **Add Tax Rate**.
3. Enter the tax details:
   - **Name** -- A descriptive label (e.g., "Sales Tax", "VAT", "GST")
   - **Rate** -- The percentage to apply (e.g., 8.25)
   - **Description** -- Optional notes about when this tax applies
4. Save the tax rate.

> **Tip:** Create separate tax rates for different jurisdictions or tax types rather than combining them into a single rate. This provides clearer breakdowns on invoices.

## Applying Taxes to Services

Once tax rates are configured, you can apply them to your services:

1. When creating or editing a service, select the applicable tax rate(s).
2. The tax will be calculated automatically based on the service price.
3. Clients see the tax amount as a separate line item during checkout.

You can also apply tax rates when creating invoices manually by selecting the appropriate rate for each line item.

## Tax Display on Invoices

Invoices show tax information in a clear, itemized format:

| Invoice Section | What Is Displayed |
|---|---|
| Line items | Individual service prices (before tax) |
| Subtotal | Sum of all line items |
| Tax line(s) | Each applied tax rate with name and calculated amount |
| Total | Final amount including all taxes |

If multiple tax rates apply to a single invoice, each tax is listed separately so clients can see the exact breakdown.

## Multiple Tax Rates

Some businesses need to collect more than one type of tax. SavSpot supports applying multiple tax rates to the same service or invoice:

- **Compound taxes** -- Taxes calculated on top of other taxes (e.g., provincial + federal)
- **Independent taxes** -- Multiple taxes calculated on the base price independently

> **Tip:** Check with your local tax authority to determine whether your taxes should be compounded or applied independently. Incorrect tax configuration can lead to compliance issues.
