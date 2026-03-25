-- T14: Aggiunge colonne Stripe e is_pro reale al DB

-- Aggiunge is_pro e stripe_customer_id alla tabella profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_pro BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Indice per lookup veloce del customer Stripe nel webhook
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id
  ON profiles (stripe_customer_id);
