-- Pronunciation Rules Table
-- Allows users to define custom word-to-pronunciation mappings for TTS

CREATE TABLE IF NOT EXISTS pronunciation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  find_text TEXT NOT NULL,
  replace_with TEXT NOT NULL,
  is_regex BOOLEAN DEFAULT false,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Prevent duplicate rules for same user
  CONSTRAINT unique_user_rule UNIQUE (user_id, find_text)
);

-- Enable RLS
ALTER TABLE pronunciation_rules ENABLE ROW LEVEL SECURITY;

-- Users can only see their own rules
CREATE POLICY "Users can view own pronunciation rules"
  ON pronunciation_rules FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own rules
CREATE POLICY "Users can insert own pronunciation rules"
  ON pronunciation_rules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own rules
CREATE POLICY "Users can update own pronunciation rules"
  ON pronunciation_rules FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own rules
CREATE POLICY "Users can delete own pronunciation rules"
  ON pronunciation_rules FOR DELETE
  USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX idx_pronunciation_rules_user ON pronunciation_rules(user_id);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_pronunciation_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pronunciation_rules_updated_at
  BEFORE UPDATE ON pronunciation_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_pronunciation_rules_updated_at();
