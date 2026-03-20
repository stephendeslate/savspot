# Custom Domains

Use your own domain name for your SavSpot booking page instead of the default `yourname.savspot.com` URL. Custom domains are configured at **Settings > Domains** (`/settings/domains`).

## Setting Up a Custom Domain

1. Navigate to `/settings/domains` and click **Add Domain**.
2. Enter your desired domain (e.g., `book.yourbusiness.com`).
3. SavSpot will display the required DNS records.
4. Add the DNS records at your domain registrar.
5. Return to SavSpot and click **Verify Domain**.
6. Once verified, your booking page will be accessible at your custom domain.

## DNS Configuration

Add the following record at your domain registrar or DNS provider:

| Record Type | Host / Name | Value | TTL |
|-------------|-------------|-------|-----|
| CNAME | Your subdomain (e.g., `book`) | `cname.savspot.com` | 3600 |

If you are using a root domain (e.g., `yourbusiness.com` without a subdomain), you will need to use an ALIAS or ANAME record instead of a CNAME. Not all DNS providers support this -- check with your provider.

> Tip: DNS changes can take up to 48 hours to propagate, though most complete within a few minutes. If verification fails, wait and try again.

## SSL Certificates

SavSpot automatically provisions and renews SSL certificates for your custom domain using Let's Encrypt. No manual configuration is required. After domain verification, HTTPS will be enabled automatically.

## Verification Status

| Status | Meaning |
|--------|---------|
| Pending | DNS records have not been detected yet |
| Verified | Domain is active and serving your booking page |
| Error | DNS records are incorrect or missing -- review the required configuration |

## Removing a Custom Domain

To remove a custom domain, navigate to `/settings/domains`, find the domain in your list, and click **Remove**. Your booking page will revert to the default SavSpot URL immediately.

> Tip: Before switching to a custom domain, ensure any existing links to your default SavSpot URL are updated, as the default URL will redirect to your custom domain once configured.
