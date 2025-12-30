-- ============================================
-- Webhook System Tables
-- ============================================

-- Webhook configurations table
CREATE TABLE IF NOT EXISTS webhook_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  endpoint_url TEXT NOT NULL,
  http_method VARCHAR(10) NOT NULL DEFAULT 'POST' CHECK (http_method IN ('POST', 'PUT', 'PATCH')),
  headers JSONB NOT NULL DEFAULT '{}',
  auth_type VARCHAR(20) NOT NULL DEFAULT 'none' CHECK (auth_type IN ('none', 'bearer', 'api_key', 'basic', 'custom_header')),
  auth_config JSONB NOT NULL DEFAULT '{}',
  payload_template JSONB NOT NULL DEFAULT '{}',
  field_mappings JSONB NOT NULL DEFAULT '{}',
  enabled BOOLEAN NOT NULL DEFAULT true,
  retry_count INTEGER NOT NULL DEFAULT 3 CHECK (retry_count >= 0 AND retry_count <= 5),
  timeout_ms INTEGER NOT NULL DEFAULT 30000 CHECK (timeout_ms >= 1000 AND timeout_ms <= 60000),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhook execution logs table
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_id UUID NOT NULL REFERENCES webhook_configs(id) ON DELETE CASCADE,
  content_id UUID REFERENCES generated_content(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('success', 'failed', 'pending')),
  status_code INTEGER,
  request_payload JSONB NOT NULL DEFAULT '{}',
  response_body TEXT,
  error_message TEXT,
  duration_ms INTEGER,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_webhook_configs_user_id ON webhook_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_configs_enabled ON webhook_configs(user_id, enabled);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_id ON webhook_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON webhook_logs(webhook_id, status);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_executed_at ON webhook_logs(webhook_id, executed_at DESC);

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE webhook_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Webhook configs policies
CREATE POLICY "Users can view their own webhooks"
  ON webhook_configs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own webhooks"
  ON webhook_configs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own webhooks"
  ON webhook_configs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own webhooks"
  ON webhook_configs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Webhook logs policies (users can only view logs for their webhooks)
CREATE POLICY "Users can view logs for their webhooks"
  ON webhook_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM webhook_configs
      WHERE webhook_configs.id = webhook_logs.webhook_id
      AND webhook_configs.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert webhook logs"
  ON webhook_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM webhook_configs
      WHERE webhook_configs.id = webhook_logs.webhook_id
      AND webhook_configs.user_id = auth.uid()
    )
  );

-- ============================================
-- Triggers
-- ============================================

-- Update timestamp trigger for webhook_configs
CREATE TRIGGER update_webhook_configs_updated_at
  BEFORE UPDATE ON webhook_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Add transcript_ids to generated_content if not exists
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'generated_content'
    AND column_name = 'transcript_ids'
  ) THEN
    ALTER TABLE generated_content ADD COLUMN transcript_ids UUID[] DEFAULT '{}';
  END IF;
END $$;
