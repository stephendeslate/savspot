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
export class XeroProvider implements AccountingProviderInterface {
  private readonly logger = new Logger(XeroProvider.name);

  private readonly XERO_AUTH_URL = 'https://login.xero.com/identity/connect/authorize';
  private readonly XERO_SCOPES = 'openid profile email accounting.transactions accounting.contacts offline_access';

  private assertFeatureEnabled(): void {
    if (process.env['FEATURE_ACCOUNTING'] !== 'true') {
      throw new Error('Accounting feature is not enabled');
    }
  }

  async getAuthUrl(tenantId: string, redirectUri: string): Promise<string> {
    this.assertFeatureEnabled();

    const clientId = process.env['XERO_CLIENT_ID'] ?? '';
    const state = Buffer.from(JSON.stringify({ tenantId, provider: 'XERO' })).toString('base64url');

    // TODO: Replace with real Xero OAuth2 authorization URL construction
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

    // TODO: Call Xero token endpoint POST https://identity.xero.com/connect/token
    // with grant_type=authorization_code, code, redirect_uri
    void code;
    void redirectUri;

    return {
      accessToken: 'xero_stub_access_token',
      refreshToken: 'xero_stub_refresh_token',
      expiresAt: new Date(Date.now() + 1800 * 1000),
      tenantId: 'xero_stub_tenant_id',
    };
  }

  async refreshToken(refreshTokenValue: string): Promise<AccountingTokens> {
    this.assertFeatureEnabled();
    this.logger.log('Refreshing Xero token');

    // TODO: Call Xero token endpoint with grant_type=refresh_token
    void refreshTokenValue;

    return {
      accessToken: 'xero_stub_refreshed_access_token',
      refreshToken: 'xero_stub_refreshed_refresh_token',
      expiresAt: new Date(Date.now() + 1800 * 1000),
      tenantId: 'xero_stub_tenant_id',
    };
  }

  async syncInvoice(tokens: AccountingTokens, invoice: InvoiceData): Promise<SyncResult> {
    this.assertFeatureEnabled();
    this.logger.log(`Syncing invoice ${invoice.invoiceNumber} to Xero (tenant: ${tokens.tenantId})`);

    // TODO: PUT to Xero Invoices API
    // PUT https://api.xero.com/api.xro/2.0/Invoices
    // Header: xero-tenant-id: {tokens.tenantId}
    void tokens;

    return {
      success: true,
      externalId: `xero_inv_${invoice.id.slice(0, 8)}`,
    };
  }

  async syncPayment(tokens: AccountingTokens, payment: PaymentData): Promise<SyncResult> {
    this.assertFeatureEnabled();
    this.logger.log(`Syncing payment ${payment.id} to Xero (tenant: ${tokens.tenantId})`);

    // TODO: PUT to Xero Payments API
    // PUT https://api.xero.com/api.xro/2.0/Payments
    void tokens;

    return {
      success: true,
      externalId: `xero_pmt_${payment.id.slice(0, 8)}`,
    };
  }

  async syncClient(tokens: AccountingTokens, client: ClientData): Promise<SyncResult> {
    this.assertFeatureEnabled();
    this.logger.log(`Syncing client ${client.name} to Xero (tenant: ${tokens.tenantId})`);

    // TODO: PUT to Xero Contacts API
    // PUT https://api.xero.com/api.xro/2.0/Contacts
    void tokens;

    return {
      success: true,
      externalId: `xero_contact_${client.id.slice(0, 8)}`,
    };
  }

  async getAccounts(tokens: AccountingTokens): Promise<AccountingAccount[]> {
    this.assertFeatureEnabled();
    this.logger.log(`Fetching Xero chart of accounts (tenant: ${tokens.tenantId})`);

    // TODO: GET from Xero Accounts API
    // GET https://api.xero.com/api.xro/2.0/Accounts
    void tokens;

    return [
      { id: 'xero_acc_1', name: 'Sales', type: 'REVENUE', code: '200' },
      { id: 'xero_acc_2', name: 'Accounts Receivable', type: 'CURRENT', code: '610' },
    ];
  }
}
