-- PostgreSQL initialization script for CHRONOS multi-tenant setup
-- This script sets up Row Level Security (RLS) for multi-tenant isolation

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create a function to get current tenant ID from context
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(current_setting('app.current_tenant_id', true), '');
END;
$$ LANGUAGE plpgsql STABLE;

-- Create a function to set tenant context
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id TEXT) RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', tenant_id, false);
END;
$$ LANGUAGE plpgsql;

-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (
      tenant_id, user_id, action, resource, resource_id,
      new_values, ip_address, user_agent, timestamp
    ) VALUES (
      NEW.tenant_id,
      COALESCE(current_setting('app.current_user_id', true), NULL),
      'INSERT',
      TG_TABLE_NAME,
      NEW.id,
      row_to_json(NEW),
      current_setting('app.client_ip', true),
      current_setting('app.user_agent', true),
      NOW()
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (
      tenant_id, user_id, action, resource, resource_id,
      old_values, new_values, ip_address, user_agent, timestamp
    ) VALUES (
      NEW.tenant_id,
      COALESCE(current_setting('app.current_user_id', true), NULL),
      'UPDATE',
      TG_TABLE_NAME,
      NEW.id,
      row_to_json(OLD),
      row_to_json(NEW),
      current_setting('app.client_ip', true),
      current_setting('app.user_agent', true),
      NOW()
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (
      tenant_id, user_id, action, resource, resource_id,
      old_values, ip_address, user_agent, timestamp
    ) VALUES (
      OLD.tenant_id,
      COALESCE(current_setting('app.current_user_id', true), NULL),
      'DELETE',
      TG_TABLE_NAME,
      OLD.id,
      row_to_json(OLD),
      current_setting('app.client_ip', true),
      current_setting('app.user_agent', true),
      NOW()
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create function to automatically create RLS policies for new tables
CREATE OR REPLACE FUNCTION create_tenant_rls_policy(table_name TEXT) RETURNS VOID AS $$
BEGIN
  -- Enable RLS on the table
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);

  -- Create policy for tenant isolation
  EXECUTE format('
    CREATE POLICY tenant_isolation ON %I
    FOR ALL
    TO PUBLIC
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id())
  ', table_name);

  -- Create audit trigger
  EXECUTE format('
    CREATE TRIGGER audit_trigger_%I
    AFTER INSERT OR UPDATE OR DELETE ON %I
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function()
  ', table_name, table_name);
END;
$$ LANGUAGE plpgsql;

-- Create database roles
DO $$
BEGIN
  -- Application role with limited permissions
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'chronos_app') THEN
    CREATE ROLE chronos_app WITH LOGIN;
  END IF;

  -- Read-only role for reporting
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'chronos_readonly') THEN
    CREATE ROLE chronos_readonly WITH LOGIN;
  END IF;

  -- Admin role for maintenance
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'chronos_admin') THEN
    CREATE ROLE chronos_admin WITH LOGIN CREATEDB;
  END IF;
END
$$;

-- Set up connection limits
ALTER ROLE chronos_app CONNECTION LIMIT 50;
ALTER ROLE chronos_readonly CONNECTION LIMIT 10;
ALTER ROLE chronos_admin CONNECTION LIMIT 5;

-- Performance optimizations
-- Increase shared_buffers if not already set
-- ALTER SYSTEM SET shared_buffers = '256MB';
-- ALTER SYSTEM SET effective_cache_size = '1GB';
-- ALTER SYSTEM SET maintenance_work_mem = '64MB';
-- ALTER SYSTEM SET checkpoint_completion_target = 0.9;
-- ALTER SYSTEM SET wal_buffers = '16MB';
-- ALTER SYSTEM SET default_statistics_target = 100;

-- Create indexes for common query patterns
-- These will be created after Prisma migration

-- Log configuration
ALTER SYSTEM SET log_destination = 'stderr';
ALTER SYSTEM SET log_statement = 'mod';
ALTER SYSTEM SET log_min_duration_statement = 1000;
ALTER SYSTEM SET log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h ';

-- Reload configuration
SELECT pg_reload_conf();