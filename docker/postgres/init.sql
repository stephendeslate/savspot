-- SavSpot PostgreSQL initialization
-- Runs on first container creation only

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create application role for RLS
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'savspot_app') THEN
    CREATE ROLE savspot_app LOGIN PASSWORD 'savspot_app_dev';
  END IF;
END
$$;

-- Grant permissions to application role
GRANT ALL PRIVILEGES ON DATABASE savspot_dev TO savspot_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO savspot_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO savspot_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO savspot_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO savspot_app;
