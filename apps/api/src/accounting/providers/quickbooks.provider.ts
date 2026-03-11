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
  private readonly QB_SCOPES = 'com.intuit.quickbooks.accounting';

  private assertFeatureEnabled(): void {
    if (process.env['FEATURE_ACCOUNTING'] !== 'true') {
      throw new Error('Accounting feature is not enabled');
    }
  }

  async getAuthUrl(tenantId: string, redirectUri: string): Promise<string> {
    this.assertFeatureEnabled();

    const clientId = process.env['QUICKBOOKS_CLIENT_ID'] ?? '';
    const state = Buffer.from(JSON.stringify({ tenantId, provider: 'QUICKBOOKS' })).toString('base64url');

    // TODO: Replace with real Intuit OAuth2 authorization URL construction
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

    // TODO: Call Intuit token endpoint POST https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer
    // with grant_type=authorization_code, code, redirect_uri
    void code;
    void redirectUri;

    return {
      accessToken: 'qb_stub_access_token',
      refreshToken: 'qb_stub_refresh_token',
      expiresAt: new Date(Date.now() + 3600 * 1000),
      realmId: 'stub_realm_id',
    };
  }

  async refreshToken(refreshTokenValue: string): Promise<AccountingTokens> {
    this.assertFeatureEnabled();
    this.logger.log('Refreshing QuickBooks token');

    // TODO: Call Intuit token endpoint with grant_type=refresh_token
    void refreshTokenValue;

    return {
      accessToken: 'qb_stub_refreshed_access_token',
      refreshToken: 'qb_stub_refreshed_refresh_token',
      expiresAt: new Date(Date.now() + 3600 * 1000),
      realmId: 'stub_realm_id',
    };
  }

  async syncInvoice(tokens: AccountingTokens, invoice: InvoiceData): Promise<SyncResult> {
    this.assertFeatureEnabled();
    this.logger.log(`Syncing invoice ${invoice.invoiceNumber} to QuickBooks (realm: ${tokens.realmId})`);

    // TODO: POST to QuickBooks Invoice API
    // POST https://quickbooks.api.intuit.com/v3/company/{realmId}/invoice
    void tokens;

    return {
      success: true,
      externalId: `qb_inv_${invoice.id.slice(0, 8)}`,
    };
  }

  async syncPayment(tokens: AccountingTokens, payment: PaymentData): Promise<SyncResult> {
    this.assertFeatureEnabled();
    this.logger.log(`Syncing payment ${payment.id} to QuickBooks (realm: ${tokens.realmId})`);

    // TODO: POST to QuickBooks Payment API
    // POST https://quickbooks.api.intuit.com/v3/company/{realmId}/payment
    void tokens;

    return {
      success: true,
      externalId: `qb_pmt_${payment.id.slice(0, 8)}`,
    };
  }

  async syncClient(tokens: AccountingTokens, client: ClientData): Promise<SyncResult> {
    this.assertFeatureEnabled();
    this.logger.log(`Syncing client ${client.name} to QuickBooks (realm: ${tokens.realmId})`);

    // TODO: POST to QuickBooks Customer API
    // POST https://quickbooks.api.intuit.com/v3/company/{realmId}/customer
    void tokens;

    return {
      success: true,
      externalId: `qb_cust_${client.id.slice(0, 8)}`,
    };
  }

  async getAccounts(tokens: AccountingTokens): Promise<AccountingAccount[]> {
    this.assertFeatureEnabled();
    this.logger.log(`Fetching QuickBooks chart of accounts (realm: ${tokens.realmId})`);

    // TODO: GET from QuickBooks Account API
    // GET https://quickbooks.api.intuit.com/v3/company/{realmId}/query?query=select * from Account
    void tokens;

    return [
      { id: 'qb_acc_1', name: 'Services Revenue', type: 'Income', code: '4000' },
      { id: 'qb_acc_2', name: 'Accounts Receivable', type: 'AccountsReceivable', code: '1100' },
    ];
  }
}
