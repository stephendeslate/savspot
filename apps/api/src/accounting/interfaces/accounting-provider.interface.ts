export interface AccountingTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  realmId?: string;
  tenantId?: string;
}

export interface SyncResult {
  success: boolean;
  externalId?: string;
  error?: string;
}

export interface InvoiceData {
  id: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  taxAmount: number;
  total: number;
  currency: string;
  dueDate: Date;
}

export interface PaymentData {
  id: string;
  amount: number;
  currency: string;
  invoiceExternalId?: string;
  paymentDate: Date;
  method: string;
}

export interface ClientData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
}

export interface AccountingAccount {
  id: string;
  name: string;
  type: string;
  code?: string;
}

export interface AccountingProviderInterface {
  getAuthUrl(tenantId: string, redirectUri: string): Promise<string>;
  exchangeCode(code: string, redirectUri: string): Promise<AccountingTokens>;
  refreshToken(refreshToken: string): Promise<AccountingTokens>;
  syncInvoice(tokens: AccountingTokens, invoice: InvoiceData): Promise<SyncResult>;
  syncPayment(tokens: AccountingTokens, payment: PaymentData): Promise<SyncResult>;
  syncClient(tokens: AccountingTokens, client: ClientData): Promise<SyncResult>;
  getAccounts(tokens: AccountingTokens): Promise<AccountingAccount[]>;
}
