# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in SavSpot, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, email: **security@savspot.co**

Please include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

## Response Timeline

- **Acknowledgment:** Within 48 hours
- **Initial assessment:** Within 5 business days
- **Fix timeline:** Depends on severity, typically within 14 days for critical issues

## Scope

This policy applies to the SavSpot codebase and the managed instance at savspot.co.

### In Scope

- Authentication and authorization bypasses
- SQL injection, XSS, CSRF
- RLS (Row-Level Security) tenant isolation bypasses
- Sensitive data exposure
- Payment processing vulnerabilities

### Out of Scope

- Vulnerabilities in third-party dependencies (report these upstream)
- Social engineering
- Denial of service attacks
- Issues in the demo instance (it resets daily)

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest release | Yes |
| Older releases | Best effort |

## Disclosure

We follow coordinated disclosure. Once a fix is released, we will:

1. Credit the reporter (unless anonymity is requested)
2. Publish a security advisory on GitHub
3. Release a patched version
