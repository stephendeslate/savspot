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

@Injectable()
export class QuickBooksProvider implements AccountingProviderInterface {
  private readonly logger = new Logger(QuickBooksProvider.name);

  private readonly QB_AUTH_URL = 'https://appcenter.intuit.com/connect/oauth2';
  private readonly QB_TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
  private readonly QB_API_BASE = 'https://quickbooks.api.intuit.com/v3/company';
  private readonly QB_SCOPES = 'com.intuit.quickbooks.accounting';

  private assertFeatureEnabled(): void {
    if (process.env['FEATURE_ACCOUNTING'] !== 'true') {
      throw new Error('Accounting feature is not enabled');
    }
  }

  private getBasicAuthHeader(): string {
    const clientId = process.env['QUICKBOOKS_CLIENT_ID'] ?? '';
    const clientSecret = process.env['QUICKBOOKS_CLIENT_SECRET'] ?? '';
    return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
  }

  async getAuthUrl(_tenantId: string, redirectUri: string, state: string): Promise<string> {
    this.assertFeatureEnabled();

    const clientId = process.env['QUICKBOOKS_CLIENT_ID'] ?? '';

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      scope: this.QB_SCOPES,
      redirect_uri: redirectUri,
      state,
    });

    return `${this.QB_AUTH_URL}?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<AccountingTokens> {
    this.assertFeatureEnabled();
    this.logger.log(`Exchanging QuickBooks auth code (redirect: ${redirectUri})`);

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    });

    const response = await fetch(this.QB_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: this.getBasicAuthHeader(),
        Accept: 'application/json',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`QuickBooks token exchange failed: ${response.status} ${errorText}`);
      throw new Error(`QuickBooks token exchange failed: ${response.status}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    // Note: realmId is not returned in the token response. It comes from the
    // OAuth callback URL query parameter and must be set by the caller after exchange.
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async refreshToken(refreshTokenValue: string): Promise<AccountingTokens> {
    this.assertFeatureEnabled();
    this.logger.log('Refreshing QuickBooks token');

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshTokenValue,
    });

    const response = await fetch(this.QB_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: this.getBasicAuthHeader(),
        Accept: 'application/json',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`QuickBooks token refresh failed: ${response.status} ${errorText}`);
      throw new Error(`QuickBooks token refresh failed: ${response.status}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async syncInvoice(tokens: AccountingTokens, invoice: InvoiceData): Promise<SyncResult> {
    this.assertFeatureEnabled();
    this.logger.log(`Syncing invoice ${invoice.invoiceNumber} to QuickBooks (realm: ${tokens.realmId})`);

    try {
      const qbInvoice = {
        DocNumber: invoice.invoiceNumber,
        DueDate: invoice.dueDate.toISOString().split('T')[0],
        CurrencyRef: { value: invoice.currency },
        CustomerRef: { name: invoice.clientName },
        BillEmail: { Address: invoice.clientEmail },
        Line: invoice.lineItems.map((item) => ({
          DetailType: 'SalesItemLineDetail',
          Amount: item.total,
          Description: item.description,
          SalesItemLineDetail: {
            Qty: item.quantity,
            UnitPrice: item.unitPrice,
          },
        })),
        TxnTaxDetail: {
          TotalTax: invoice.taxAmount,
        },
      };

      const response = await fetch(`${this.QB_API_BASE}/${tokens.realmId}/invoice`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(qbInvoice),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`QuickBooks invoice sync failed: ${response.status} ${errorText}`);
        return { success: false, error: `QuickBooks API error: ${response.status}` };
      }

      const data = (await response.json()) as { Invoice: { Id: string } };
      return { success: true, externalId: data.Invoice.Id };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`QuickBooks invoice sync error: ${message}`);
      return { success: false, error: message };
    }
  }

  async syncPayment(tokens: AccountingTokens, payment: PaymentData): Promise<SyncResult> {
    this.assertFeatureEnabled();
    this.logger.log(`Syncing payment ${payment.id} to QuickBooks (realm: ${tokens.realmId})`);

    try {
      const qbPayment: Record<string, unknown> = {
        TotalAmt: payment.amount,
        CurrencyRef: { value: payment.currency },
        TxnDate: payment.paymentDate.toISOString().split('T')[0],
        PaymentMethodRef: { name: payment.method },
      };

      if (payment.invoiceExternalId) {
        qbPayment['Line'] = [
          {
            Amount: payment.amount,
            LinkedTxn: [{ TxnId: payment.invoiceExternalId, TxnType: 'Invoice' }],
          },
        ];
      }

      const response = await fetch(`${this.QB_API_BASE}/${tokens.realmId}/payment`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(qbPayment),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`QuickBooks payment sync failed: ${response.status} ${errorText}`);
        return { success: false, error: `QuickBooks API error: ${response.status}` };
      }

      const data = (await response.json()) as { Payment: { Id: string } };
      return { success: true, externalId: data.Payment.Id };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`QuickBooks payment sync error: ${message}`);
      return { success: false, error: message };
    }
  }

  async syncClient(tokens: AccountingTokens, client: ClientData): Promise<SyncResult> {
    this.assertFeatureEnabled();
    this.logger.log(`Syncing client ${client.name} to QuickBooks (realm: ${tokens.realmId})`);

    try {
      const qbCustomer: Record<string, unknown> = {
        DisplayName: client.name,
        PrimaryEmailAddr: { Address: client.email },
      };

      if (client.phone) {
        qbCustomer['PrimaryPhone'] = { FreeFormNumber: client.phone };
      }

      if (client.address) {
        qbCustomer['BillAddr'] = { Line1: client.address };
      }

      const response = await fetch(`${this.QB_API_BASE}/${tokens.realmId}/customer`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(qbCustomer),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`QuickBooks customer sync failed: ${response.status} ${errorText}`);
        return { success: false, error: `QuickBooks API error: ${response.status}` };
      }

      const data = (await response.json()) as { Customer: { Id: string } };
      return { success: true, externalId: data.Customer.Id };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`QuickBooks customer sync error: ${message}`);
      return { success: false, error: message };
    }
  }

  async getAccounts(tokens: AccountingTokens): Promise<AccountingAccount[]> {
    this.assertFeatureEnabled();
    this.logger.log(`Fetching QuickBooks chart of accounts (realm: ${tokens.realmId})`);

    const query = encodeURIComponent('select * from Account');
    const response = await fetch(`${this.QB_API_BASE}/${tokens.realmId}/query?query=${query}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`QuickBooks accounts fetch failed: ${response.status} ${errorText}`);
      throw new Error(`QuickBooks accounts fetch failed: ${response.status}`);
    }

    const data = (await response.json()) as {
      QueryResponse: {
        Account?: Array<{
          Id: string;
          Name: string;
          AccountType: string;
          AcctNum?: string;
        }>;
      };
    };

    const accounts = data.QueryResponse.Account ?? [];
    return accounts.map((acct) => ({
      id: acct.Id,
      name: acct.Name,
      type: acct.AccountType,
      code: acct.AcctNum,
    }));
  }
}
