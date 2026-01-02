-- Add title column to generated_content table
-- This column stores the auto-generated title for content pieces

ALTER TABLE public.generated_content
ADD COLUMN IF NOT EXISTS title TEXT;

-- Add an index for searching by title
CREATE INDEX IF NOT EXISTS idx_generated_content_title
ON public.generated_content(title)
WHERE title IS NOT NULL;
