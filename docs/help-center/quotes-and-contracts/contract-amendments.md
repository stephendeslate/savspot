# Contract Amendments

Contract amendments allow changes to be made to an existing contract after it has been signed. While the data model supports amendments, the amendment feature does not currently have a web interface.

## Current Status

The `ContractAmendment` model exists in the backend and supports tracking changes to signed contracts. However, **there is no amendment UI** in the web application — you cannot create, view, or manage amendments from the contracts page.

## Available Contract Actions

From the **Contracts** page (`/contracts`), you can currently:

- **Create** new contracts (with optional template)
- **Edit** draft contracts
- **Send** draft contracts to clients
- **Void** sent or signed contracts

## Workaround

If you need to modify the terms of a signed contract:

1. **Void** the existing contract from the Contracts page.
2. **Create** a new contract with the updated terms.
3. **Send** the new contract to the client for signing.

This ensures a clear record of the original and updated agreements.

> **Tip:** When voiding and replacing a contract, reference the original contract in the new version so both parties have clear context on what changed and why.
