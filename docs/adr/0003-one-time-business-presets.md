# ADR-0003: One-Time Business Presets (Not Persistent Config)

## Status

Accepted

## Context

During onboarding, SavSpot asks the business owner to select their industry (e.g., barbershop, dental clinic, yoga studio). This selection determines the initial configuration: default services, booking durations, cancellation policies, and UI labels.

Two approaches were considered:

1. **Persistent preset reference** — store the preset ID on the tenant and continuously derive behavior from it
2. **One-time application** — use the preset to seed initial data, then discard the reference

## Decision

Business presets are one-time onboarding functions that generate initial configuration, not persistent references. After onboarding:

- The preset's default services, durations, and policies are written as concrete rows in the tenant's data
- The preset ID is stored only for analytics (which preset was chosen), not for runtime behavior
- All configuration is fully editable by the business owner after onboarding

## Consequences

**Positive:**
- Business owners have full control — they can modify any preset-generated value without constraint
- No coupling between runtime behavior and preset definitions — presets can be updated for new tenants without affecting existing ones
- Simpler runtime code — no need to merge preset defaults with tenant overrides at query time

**Negative:**
- Changes to a preset don't propagate to existing tenants (by design, but could be a feature request)
- Onboarding logic is more complex — must expand a preset into multiple table inserts within a transaction
- If a preset is poorly designed, the business owner must manually fix each generated value
