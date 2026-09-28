-- ==============================================================================
-- AMAZON SELLER PROFIT TRACKER — SUPABASE CLOUD SCHEMA (100% FREE TIER READY)
-- ==============================================================================
-- Instructions:
-- 1. Create a free project at https://supabase.com
-- 2. Open SQL Editor in the left sidebar
-- 3. Paste and run this entire script
-- ==============================================================================

-- 1. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  order_id TEXT NOT NULL,
  tracking_id TEXT NOT NULL,
  shipment_id TEXT,
  product_id TEXT,
  product_name TEXT,
  sku TEXT,
  asin TEXT,
  quantity INTEGER DEFAULT 1,
  scan_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  transaction_status TEXT NOT NULL DEFAULT 'PENDING',
  handover_status TEXT NOT NULL DEFAULT 'PENDING',
  payment_status TEXT NOT NULL DEFAULT 'PENDING',
  selling_amount NUMERIC(12, 2) DEFAULT 0.00,
  amazon_fees NUMERIC(12, 2) DEFAULT 0.00,
  net_revenue NUMERIC(12, 2) DEFAULT 0.00,
  purchase_cost NUMERIC(12, 2) DEFAULT 0.00,
  additional_cost NUMERIC(12, 2) DEFAULT 0.00,
  profit NUMERIC(12, 2) DEFAULT 0.00,
  profit_margin NUMERIC(8, 2) DEFAULT 0.00,
  order_status TEXT DEFAULT 'Pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_order_id UNIQUE (user_id, order_id)
);

-- 2. PRODUCTS MASTER TABLE
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_name TEXT NOT NULL,
  asin TEXT,
  sku TEXT,
  barcode TEXT,
  current_purchase_cost NUMERIC(12, 2) DEFAULT 0.00,
  previous_purchase_cost NUMERIC(12, 2),
  cost_effective_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. PURCHASE COST HISTORY
CREATE TABLE IF NOT EXISTS public.purchase_cost_history (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id TEXT NOT NULL,
  purchase_cost NUMERIC(12, 2) NOT NULL,
  effective_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  order_id TEXT NOT NULL,
  transaction_id TEXT,
  transaction_date TIMESTAMPTZ,
  product_name TEXT,
  sku TEXT,
  asin TEXT,
  selling_amount NUMERIC(12, 2) DEFAULT 0.00,
  amazon_fees NUMERIC(12, 2) DEFAULT 0.00,
  net_amount NUMERIC(12, 2) DEFAULT 0.00,
  refund_amount NUMERIC(12, 2) DEFAULT 0.00,
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_transaction UNIQUE (user_id, order_id)
);

-- 5. HANDOVER RECORDS TABLE
CREATE TABLE IF NOT EXISTS public.handover_records (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tracking_id TEXT NOT NULL,
  shipment_id TEXT,
  fba_shipment_id TEXT,
  manifest_id TEXT,
  carrier TEXT,
  handover_date TIMESTAMPTZ DEFAULT NOW(),
  shipout_time TEXT,
  total_packages INTEGER DEFAULT 1,
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_handover UNIQUE (user_id, tracking_id)
);

-- 6. USER SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  marketplace TEXT DEFAULT 'Amazon Saudi Arabia',
  currency TEXT DEFAULT 'SAR',
  auto_save_scans BOOLEAN DEFAULT TRUE,
  sound_effects BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR FAST MULTI-DEVICE PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_orders_user_order ON public.orders(user_id, order_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_tracking ON public.orders(user_id, tracking_id);
CREATE INDEX IF NOT EXISTS idx_products_user ON public.products(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_order ON public.transactions(user_id, order_id);
CREATE INDEX IF NOT EXISTS idx_handover_user_tracking ON public.handover_records(user_id, tracking_id);
CREATE INDEX IF NOT EXISTS idx_cost_history_user ON public.purchase_cost_history(user_id, product_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) — STRICT PER-USER DATA ISOLATION
-- User A can NEVER view or modify User B's records!
-- ==============================================================================
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_cost_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.handover_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Orders RLS Policy
DROP POLICY IF EXISTS "User owns orders" ON public.orders;
CREATE POLICY "User owns orders" ON public.orders
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Products RLS Policy
DROP POLICY IF EXISTS "User owns products" ON public.products;
CREATE POLICY "User owns products" ON public.products
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Cost History RLS Policy
DROP POLICY IF EXISTS "User owns cost history" ON public.purchase_cost_history;
CREATE POLICY "User owns cost history" ON public.purchase_cost_history
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Transactions RLS Policy
DROP POLICY IF EXISTS "User owns transactions" ON public.transactions;
CREATE POLICY "User owns transactions" ON public.transactions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Handover Records RLS Policy
DROP POLICY IF EXISTS "User owns handovers" ON public.handover_records;
CREATE POLICY "User owns handovers" ON public.handover_records
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- User Settings RLS Policy
DROP POLICY IF EXISTS "User owns settings" ON public.user_settings;
CREATE POLICY "User owns settings" ON public.user_settings
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- ENABLE REALTIME REPLICATION (Instant Multi-Device Sync)
-- ==============================================================================
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.purchase_cost_history;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.handover_records;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;
