-- Podcast Jobs Table
-- Tracks podcast generation jobs (script + optional audio)

CREATE TABLE IF NOT EXISTS podcast_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id UUID REFERENCES generated_content(id) ON DELETE SET NULL,

  -- Job status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'generating_script',
    'generating_audio',
    'stitching',
    'complete',
    'failed'
  )),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  error TEXT,

  -- Generation options (stored as JSONB)
  options JSONB DEFAULT '{}',

  -- Generated content
  script JSONB,
  audio_url TEXT,
  duration INTEGER, -- in seconds

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_podcast_jobs_user_id ON podcast_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_podcast_jobs_status ON podcast_jobs(status);
CREATE INDEX IF NOT EXISTS idx_podcast_jobs_content_id ON podcast_jobs(content_id);
CREATE INDEX IF NOT EXISTS idx_podcast_jobs_created_at ON podcast_jobs(created_at DESC);

-- RLS Policies
ALTER TABLE podcast_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own podcast jobs"
  ON podcast_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own podcast jobs"
  ON podcast_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own podcast jobs"
  ON podcast_jobs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own podcast jobs"
  ON podcast_jobs FOR DELETE
  USING (auth.uid() = user_id);

-- Updated at trigger
CREATE TRIGGER update_podcast_jobs_updated_at
  BEFORE UPDATE ON podcast_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE podcast_jobs IS 'Tracks podcast generation jobs including script and audio';
COMMENT ON COLUMN podcast_jobs.options IS 'Generation options: targetDuration, tone, ttsProvider, hostNames, voices';
COMMENT ON COLUMN podcast_jobs.script IS 'Generated podcast script with segments';
COMMENT ON COLUMN podcast_jobs.duration IS 'Total duration in seconds';
