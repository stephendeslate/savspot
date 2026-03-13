import { Injectable, Logger } from '@nestjs/common';
import {
  AccountingProviderInterface,
  AccountingTokens,
  AccountingAccount,
  InvoiceData,
  PaymentData,
  ClientData,
  SyncResult,
} from '../interfaces/accounting-provider.interface';

interface XeroTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

interface XeroConnection {
  tenantId: string;
  tenantName: string;
  tenantType: string;
}

interface XeroInvoiceResponse {
  Invoices: Array<{ InvoiceID: string }>;
}

interface XeroPaymentResponse {
  Payments: Array<{ PaymentID: string }>;
}

interface XeroContactResponse {
  Contacts: Array<{ ContactID: string }>;
}

interface XeroAccountResponse {
  Accounts: Array<{
    AccountID: string;
    Name: string;
    Type: string;
    Code?: string;
  }>;
}

@Injectable()
export class XeroProvider implements AccountingProviderInterface {
  private readonly logger = new Logger(XeroProvider.name);

  private readonly XERO_AUTH_URL = 'https://login.xero.com/identity/connect/authorize';
  private readonly XERO_TOKEN_URL = 'https://identity.xero.com/connect/token';
  private readonly XERO_API_BASE = 'https://api.xero.com/api.xro/2.0';
  private readonly XERO_SCOPES = 'openid profile email accounting.transactions accounting.contacts offline_access';

  private assertFeatureEnabled(): void {
    if (process.env['FEATURE_ACCOUNTING'] !== 'true') {
      throw new Error('Accounting feature is not enabled');
    }
  }

  private getBasicAuthHeader(): string {
    const clientId = process.env['XERO_CLIENT_ID'] ?? '';
    const clientSecret = process.env['XERO_CLIENT_SECRET'] ?? '';
    return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
  }

  private getApiHeaders(tokens: AccountingTokens): Record<string, string> {
    return {
      Authorization: `Bearer ${tokens.accessToken}`,
      'xero-tenant-id': tokens.tenantId ?? '',
      'Content-Type': 'application/json',
    };
  }

  async getAuthUrl(tenantId: string, redirectUri: string): Promise<string> {
    this.assertFeatureEnabled();

    const clientId = process.env['XERO_CLIENT_ID'] ?? '';
    const state = Buffer.from(JSON.stringify({ tenantId, provider: 'XERO' })).toString('base64url');

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      scope: this.XERO_SCOPES,
      redirect_uri: redirectUri,
      state,
    });

    return `${this.XERO_AUTH_URL}?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<AccountingTokens> {
    this.assertFeatureEnabled();
    this.logger.log(`Exchanging Xero auth code (redirect: ${redirectUri})`);

    const tokenResponse = await fetch(this.XERO_TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: this.getBasicAuthHeader(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Xero token exchange failed (${tokenResponse.status}): ${errorText}`);
    }

    const tokenData = (await tokenResponse.json()) as XeroTokenResponse;

    const connectionsResponse = await fetch('https://api.xero.com/connections', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!connectionsResponse.ok) {
      const errorText = await connectionsResponse.text();
      throw new Error(`Xero connections fetch failed (${connectionsResponse.status}): ${errorText}`);
    }

    const connections = (await connectionsResponse.json()) as XeroConnection[];
    const xeroTenantId = connections[0]?.tenantId;

    if (!xeroTenantId) {
      throw new Error('No Xero tenant found in connections response');
    }

    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
      tenantId: xeroTenantId,
    };
  }

  async refreshToken(refreshTokenValue: string): Promise<AccountingTokens> {
    this.assertFeatureEnabled();
    this.logger.log('Refreshing Xero token');

    const tokenResponse = await fetch(this.XERO_TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: this.getBasicAuthHeader(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshTokenValue,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Xero token refresh failed (${tokenResponse.status}): ${errorText}`);
    }

    const tokenData = (await tokenResponse.json()) as XeroTokenResponse;

    const connectionsResponse = await fetch('https://api.xero.com/connections', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!connectionsResponse.ok) {
      const errorText = await connectionsResponse.text();
      throw new Error(`Xero connections fetch failed (${connectionsResponse.status}): ${errorText}`);
    }

    const connections = (await connectionsResponse.json()) as XeroConnection[];
    const xeroTenantId = connections[0]?.tenantId;

    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
      tenantId: xeroTenantId,
    };
  }

  async syncInvoice(tokens: AccountingTokens, invoice: InvoiceData): Promise<SyncResult> {
    this.assertFeatureEnabled();
    this.logger.log(`Syncing invoice ${invoice.invoiceNumber} to Xero (tenant: ${tokens.tenantId})`);

    try {
      const xeroInvoice = {
        Invoices: [
          {
            Type: 'ACCREC',
            Contact: {
              Name: invoice.clientName,
              EmailAddress: invoice.clientEmail,
            },
            LineItems: invoice.lineItems.map((item) => ({
              Description: item.description,
              Quantity: item.quantity,
              UnitAmount: item.unitPrice,
              LineAmount: item.total,
            })),
            Date: invoice.dueDate.toISOString().split('T')[0],
            DueDate: invoice.dueDate.toISOString().split('T')[0],
            CurrencyCode: invoice.currency,
            InvoiceNumber: invoice.invoiceNumber,
          },
        ],
      };

      const response = await fetch(`${this.XERO_API_BASE}/Invoices`, {
        method: 'PUT',
        headers: this.getApiHeaders(tokens),
        body: JSON.stringify(xeroInvoice),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Xero invoice sync failed (${response.status}): ${errorText}`);
        return { success: false, error: `Xero API error (${response.status}): ${errorText}` };
      }

      const data = (await response.json()) as XeroInvoiceResponse;
      const invoiceId = data.Invoices[0]?.InvoiceID;

      return {
        success: true,
        externalId: invoiceId,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Xero invoice sync error: ${message}`);
      return { success: false, error: message };
    }
  }

  async syncPayment(tokens: AccountingTokens, payment: PaymentData): Promise<SyncResult> {
    this.assertFeatureEnabled();
    this.logger.log(`Syncing payment ${payment.id} to Xero (tenant: ${tokens.tenantId})`);

    try {
      const xeroPayment: Record<string, unknown> = {
        Payments: [
          {
            ...(payment.invoiceExternalId
              ? { Invoice: { InvoiceID: payment.invoiceExternalId } }
              : {}),
            Amount: payment.amount,
            Date: payment.paymentDate.toISOString().split('T')[0],
            CurrencyRate: 1,
            Account: { Code: '090' },
          },
        ],
      };

      const response = await fetch(`${this.XERO_API_BASE}/Payments`, {
        method: 'PUT',
        headers: this.getApiHeaders(tokens),
        body: JSON.stringify(xeroPayment),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Xero payment sync failed (${response.status}): ${errorText}`);
        return { success: false, error: `Xero API error (${response.status}): ${errorText}` };
      }

      const data = (await response.json()) as XeroPaymentResponse;
      const paymentId = data.Payments[0]?.PaymentID;

      return {
        success: true,
        externalId: paymentId,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Xero payment sync error: ${message}`);
      return { success: false, error: message };
    }
  }

  async syncClient(tokens: AccountingTokens, client: ClientData): Promise<SyncResult> {
    this.assertFeatureEnabled();
    this.logger.log(`Syncing client ${client.name} to Xero (tenant: ${tokens.tenantId})`);

    try {
      const phones = client.phone
        ? [{ PhoneType: 'DEFAULT', PhoneNumber: client.phone }]
        : [];

      const xeroContact = {
        Contacts: [
          {
            Name: client.name,
            EmailAddress: client.email,
            Phones: phones,
          },
        ],
      };

      const response = await fetch(`${this.XERO_API_BASE}/Contacts`, {
        method: 'PUT',
        headers: this.getApiHeaders(tokens),
        body: JSON.stringify(xeroContact),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Xero client sync failed (${response.status}): ${errorText}`);
        return { success: false, error: `Xero API error (${response.status}): ${errorText}` };
      }

      const data = (await response.json()) as XeroContactResponse;
      const contactId = data.Contacts[0]?.ContactID;

      return {
        success: true,
        externalId: contactId,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Xero client sync error: ${message}`);
      return { success: false, error: message };
    }
  }

  async getAccounts(tokens: AccountingTokens): Promise<AccountingAccount[]> {
    this.assertFeatureEnabled();
    this.logger.log(`Fetching Xero chart of accounts (tenant: ${tokens.tenantId})`);

    const response = await fetch(`${this.XERO_API_BASE}/Accounts`, {
      headers: this.getApiHeaders(tokens),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Xero accounts fetch failed (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as XeroAccountResponse;

    return data.Accounts.map((account) => ({
      id: account.AccountID,
      name: account.Name,
      type: account.Type,
      code: account.Code,
    }));
  }
}
