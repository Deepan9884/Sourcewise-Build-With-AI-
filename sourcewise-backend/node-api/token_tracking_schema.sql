        -- SourceWise Token Tracking + Credits Schema (v12)
        -- Run this in Supabase SQL Editor AFTER v2_schema.sql and v5_lirs_schema.sql

        -- =====================================================
        -- ADMIN FLAG ON USERS
        -- =====================================================
        ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS credit_tier text DEFAULT 'free';

        -- =====================================================
        -- USER CREDIT ACCOUNTS
        -- =====================================================
        CREATE TABLE IF NOT EXISTS user_credits (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id uuid REFERENCES users(id) ON DELETE CASCADE,
          total_credits bigint DEFAULT 100000,
          used_credits bigint DEFAULT 0,
          reserved_credits bigint DEFAULT 0,
          credit_tier text DEFAULT 'free',
          billing_cycle_start timestamptz DEFAULT now(),
          billing_cycle_end timestamptz,
          auto_recharge_enabled boolean DEFAULT false,
          auto_recharge_threshold bigint DEFAULT 1000,
          auto_recharge_amount bigint DEFAULT 10000,
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now(),
          UNIQUE(user_id)
        );

        -- =====================================================
        -- TOKEN USAGE LEDGER (immutable audit trail)
        -- =====================================================
        CREATE TABLE IF NOT EXISTS token_usage_logs (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id uuid REFERENCES users(id) ON DELETE CASCADE,
          session_id uuid,
          source_id uuid,
          request_id text NOT NULL,
          endpoint text NOT NULL,
          provider text NOT NULL,
          model text NOT NULL,
          prompt_tokens integer NOT NULL DEFAULT 0,
          completion_tokens integer NOT NULL DEFAULT 0,
          total_tokens integer NOT NULL DEFAULT 0,
          estimated_cost_usd numeric(10, 6) DEFAULT 0,
          context_chunks_count integer DEFAULT 0,
          context_tokens_estimate integer DEFAULT 0,
          compression_applied boolean DEFAULT false,
          compression_ratio numeric(4, 2) DEFAULT 1.0,
          success boolean DEFAULT true,
          error_message text,
          latency_ms integer,
          created_at timestamptz DEFAULT now()
        );

        -- =====================================================
        -- CREDIT TRANSACTIONS
        -- =====================================================
        CREATE TABLE IF NOT EXISTS credit_transactions (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id uuid REFERENCES users(id) ON DELETE CASCADE,
          type text NOT NULL,
          amount bigint NOT NULL,
          balance_after bigint NOT NULL,
          description text,
          reference_id text,
          metadata jsonb DEFAULT '{}',
          created_at timestamptz DEFAULT now()
        );

        -- =====================================================
        -- SYSTEM METRICS
        -- =====================================================
        CREATE TABLE IF NOT EXISTS system_metrics (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          metric_name text NOT NULL,
          metric_value numeric(20, 6) NOT NULL,
          metric_unit text,
          tags jsonb DEFAULT '{}',
          recorded_at timestamptz DEFAULT now()
        );

        -- =====================================================
        -- PROVIDER PRICING (admin-configurable, per 1k tokens)
        -- =====================================================
        CREATE TABLE IF NOT EXISTS provider_pricing (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          provider text NOT NULL,
          model text NOT NULL,
          input_price_per_1k_tokens numeric(10, 6) NOT NULL,
          output_price_per_1k_tokens numeric(10, 6) NOT NULL,
          effective_from timestamptz DEFAULT now(),
          effective_until timestamptz,
          is_active boolean DEFAULT true,
          UNIQUE(provider, model, effective_from)
        );

        -- Seed default pricing (Gemini 1.5 Flash + Grok Beta reference prices)
        INSERT INTO provider_pricing (provider, model, input_price_per_1k_tokens, output_price_per_1k_tokens)
        VALUES
          ('gemini', 'gemini-1.5-flash', 0.000075, 0.0003),
          ('gemini', 'gemini-1.5-pro', 0.00125, 0.005),
          ('gemini', 'gemini-2.0-flash', 0.0001, 0.0004),
          ('grok', 'grok-beta', 0.005, 0.015),
          ('grok', 'grok-2', 0.002, 0.01)
        ON CONFLICT DO NOTHING;

        -- =====================================================
        -- INDEXES
        -- =====================================================
        CREATE INDEX IF NOT EXISTS idx_user_credits_tier ON user_credits(credit_tier);
        CREATE INDEX IF NOT EXISTS idx_token_usage_logs_user ON token_usage_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_token_usage_logs_created ON token_usage_logs(created_at);
        CREATE INDEX IF NOT EXISTS idx_token_usage_logs_provider ON token_usage_logs(provider, model);
        CREATE INDEX IF NOT EXISTS idx_token_usage_logs_request ON token_usage_logs(request_id);
        CREATE INDEX IF NOT EXISTS idx_token_usage_logs_endpoint ON token_usage_logs(endpoint);
        CREATE INDEX IF NOT EXISTS idx_credit_transactions_user ON credit_transactions(user_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_system_metrics_name ON system_metrics(metric_name, recorded_at);
        CREATE INDEX IF NOT EXISTS idx_users_admin ON users(is_admin);

        -- =====================================================
        -- RLS (service-role key bypasses; deny direct anon access)
        -- =====================================================
        ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
        ALTER TABLE token_usage_logs ENABLE ROW LEVEL SECURITY;
        ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
        ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
        ALTER TABLE provider_pricing ENABLE ROW LEVEL SECURITY;
        -- No permissive policies: direct key access denied, API server uses service role.
