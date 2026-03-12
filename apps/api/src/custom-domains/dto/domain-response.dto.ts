export interface DnsInstruction {
  name: string;
  value: string;
}

export interface DnsInstructions {
  txt: DnsInstruction;
  cname: DnsInstruction;
}

export interface DomainResponse {
  id: string;
  tenantId: string;
  domain: string;
  verificationToken: string;
  status: string;
  sslStatus: string;
  verifiedAt: Date | null;
  lastCheckedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  dnsInstructions: DnsInstructions;
}

export interface DomainVerifyResponse {
  status: string;
  message: string;
}

export interface DomainRemoveResponse {
  removed: boolean;
}
