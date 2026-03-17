# ADR-0004: Dynamic Booking Step Resolution

## Status

Accepted

## Context

The customer-facing booking flow varies significantly based on service configuration. A simple haircut might need: select time → confirm. A medical consultation might need: select provider → select time → intake form → payment → confirm. A class booking might need: select date → select spots → waiver → payment → confirm.

A static booking flow with conditional steps would require the frontend to understand every possible combination. Adding a new step type (e.g., document upload) would require changes throughout the booking UI.

## Decision

The booking flow uses dynamic step resolution driven by the service's configuration. As defined in SRS-1 Section 8:

- Each service's configuration (nullable JSONB fields per ADR-0002) determines which steps are included
- The API returns an ordered list of steps for a given service, each with its type and required data schema
- The frontend renders steps sequentially using a step-type registry (each type maps to a component)
- Adding a new step type requires: a new JSONB field on the service, a step resolver entry, and a frontend component

## Consequences

**Positive:**
- Business owners control the booking experience through service configuration, not code changes
- New step types are additive — they don't modify existing step logic
- The frontend booking flow is a generic stepper that doesn't need to know about specific business logic
- Different services within the same business can have completely different booking flows

**Negative:**
- Step ordering logic lives in the API — the frontend trusts the API to return steps in the correct order
- Testing requires covering many step combinations to ensure they compose correctly
- The step-type registry on the frontend must stay in sync with the API's step definitions
- Complex step dependencies (e.g., "show payment only if intake form indicates insurance") require additional resolution logic
