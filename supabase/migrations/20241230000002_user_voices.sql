-- User Voices Table
-- Stores saved voices for podcast generation (ElevenLabs)

CREATE TABLE IF NOT EXISTS user_voices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Voice identification
  provider TEXT NOT NULL DEFAULT 'elevenlabs',
  voice_id TEXT NOT NULL,          -- ElevenLabs voice_id
  name TEXT NOT NULL,              -- Display name

  -- Voice metadata
  description TEXT,                -- User's description or ElevenLabs description
  gender TEXT,                     -- 'male', 'female', 'neutral'
  accent TEXT,                     -- 'american', 'british', etc.
  age TEXT,                        -- 'young', 'middle-aged', 'old'
  preview_url TEXT,                -- Audio sample URL

  -- Source tracking
  source TEXT NOT NULL CHECK (source IN ('library', 'designed', 'cloned')),
  design_prompt TEXT,              -- If designed: the description used

  -- Usage defaults
  is_default_host1 BOOLEAN DEFAULT false,
  is_default_host2 BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_voices_user_id ON user_voices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_voices_provider ON user_voices(provider);

-- Partial unique indexes for default hosts (only one default per user per host)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_voices_default_host1
  ON user_voices(user_id) WHERE is_default_host1 = true;
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_voices_default_host2
  ON user_voices(user_id) WHERE is_default_host2 = true;

-- Prevent duplicate voice_id per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_voices_unique_voice
  ON user_voices(user_id, provider, voice_id);

-- RLS Policies
ALTER TABLE user_voices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own voices"
  ON user_voices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own voices"
  ON user_voices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own voices"
  ON user_voices FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own voices"
  ON user_voices FOR DELETE
  USING (auth.uid() = user_id);

-- Updated at trigger
CREATE TRIGGER update_user_voices_updated_at
  BEFORE UPDATE ON user_voices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE user_voices IS 'User saved voices for podcast TTS generation';
COMMENT ON COLUMN user_voices.voice_id IS 'ElevenLabs voice ID';
COMMENT ON COLUMN user_voices.source IS 'library = pre-made, designed = AI-generated from description, cloned = from audio sample';
COMMENT ON COLUMN user_voices.design_prompt IS 'The text description used to generate this voice (if source = designed)';
COMMENT ON COLUMN user_voices.is_default_host1 IS 'Default voice for podcast Host 1 (skeptic)';
COMMENT ON COLUMN user_voices.is_default_host2 IS 'Default voice for podcast Host 2 (expert)';
