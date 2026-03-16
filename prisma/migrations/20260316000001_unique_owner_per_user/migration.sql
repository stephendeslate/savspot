-- Ensure each user can only be an OWNER of one tenant.
-- This is a DB-level safety net against TOCTOU races in the application layer.
CREATE UNIQUE INDEX "tenant_memberships_one_owner_per_user"
  ON "tenant_memberships" ("user_id")
  WHERE "role" = 'OWNER';
