# Custom Domains

Use your own domain name for your SavSpot booking page instead of the default `savspot.co/book/{slug}` URL. Custom domains are configured at **Settings > Domains** (`/settings/domains`).

> **Note:** Custom domains require a **Team** or **Business** subscription tier.

## Adding a Custom Domain

1. Navigate to `/settings/domains` and click **Add Domain**.
2. Enter your desired domain (e.g., `book.yourbusiness.com`).
3. SavSpot displays the required **DNS records**.
4. Add the DNS records at your domain registrar.
5. Return to SavSpot and click **Verify DNS**.

## Domain Statuses

| Status | Meaning |
|--------|---------|
| **Pending** | DNS records have not been detected yet |
| **Verified** | DNS records confirmed, domain is being activated |
| **Active** | Domain is live and serving your booking page |
| **Failed** | DNS verification failed — review the required records and click **Retry Verification** |

## Verifying Your Domain

After adding DNS records at your registrar, click **Verify DNS** on the domain entry. DNS changes can take up to 48 hours to propagate, though most complete within minutes.

If verification fails, the status changes to **Failed**. Review your DNS configuration and click **Retry Verification** to try again.

## Removing a Domain

To remove a custom domain, find it in the domain list and click the delete action. Your booking page reverts to the default SavSpot URL.

> **Tip:** DNS changes can take time to propagate. If verification fails on the first attempt, wait a few minutes and click "Retry" before troubleshooting your DNS records.
