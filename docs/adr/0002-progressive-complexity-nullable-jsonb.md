# ADR-0002: Progressive Complexity via Nullable JSONB

## Status

Accepted

## Context

SavSpot serves businesses ranging from solo practitioners to multi-location enterprises. Features like custom intake forms, booking policies, staff permissions, and service add-ons are essential for larger businesses but overwhelming for smaller ones.

A traditional approach would use separate tables for each feature with boolean flags to enable/disable them. This leads to schema bloat and complex join queries even when most tenants don't use the features.

## Decision

Use nullable JSONB columns on existing tables to represent optional features. The convention is:

- **`NULL`** = feature is inactive / not configured (the business hasn't opted in)
- **Non-null JSON object** = feature is active with the stored configuration

For example, a `Service` might have `intake_form Json?` — when null, the booking flow skips the intake step entirely. When populated, it contains the form schema that drives a dynamic form in the booking flow.

## Consequences

**Positive:**
- Zero-cost for tenants who don't use a feature — no empty rows, no joins, no boolean checks
- Adding a new optional feature is a single migration (`ALTER TABLE ADD COLUMN ... JSONB`)
- Frontend can use null-checks to conditionally render feature UI
- Schema stays flat — avoids an explosion of feature-flag tables

**Negative:**
- JSONB columns lack schema enforcement at the database level — validation must happen in application code
- Prisma's `Json?` type returns parsed objects, not strings — frontend TypeScript types must match the expected shape
- Querying inside JSONB requires PostgreSQL JSON operators, which are less ergonomic than column-level queries
- Migration from JSONB to a dedicated table (if a feature grows complex enough) requires data transformation
