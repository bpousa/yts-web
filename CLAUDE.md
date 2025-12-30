# YTS-Web - Claude Code Instructions

## Project Overview

YTS-Web is a Next.js 14 application that transforms YouTube videos into AI-generated content. It's the web version of a Python/Streamlit app, now with multi-user support via Supabase.

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes (Serverless)
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth (Email + Google OAuth)
- **AI Services:** Claude (Anthropic), Groq Whisper, Gemini
- **Deployment:** Vercel

## Development Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
npm run start    # Start production server
```

## Environment Variables

Required in `.env.local` (and Vercel):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GROQ_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_AI_API_KEY=
YOUTUBE_API_KEY=
```

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Auth pages (login, signup, callback)
│   ├── (dashboard)/      # Protected pages (transcripts, generator, search, settings)
│   ├── api/              # API routes
│   └── page.tsx          # Landing page
├── components/
│   ├── layout/           # Sidebar, headers
│   ├── ui/               # Reusable UI components
│   └── features/         # Feature-specific components
├── lib/
│   ├── supabase/         # Supabase client utilities
│   ├── services/         # Business logic services
│   ├── utils/            # Utility functions
│   └── prompts/          # AI prompt templates
├── hooks/                # React hooks
└── types/                # TypeScript types
```

## API Route Pattern

All API routes follow this structure:

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Auth check
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Validate input with Zod
  // Execute business logic via service
  // Return response
}
```

## Database Tables

| Table | Purpose |
|-------|---------|
| profiles | User profiles (auto-created on signup) |
| projects | Organize transcripts into projects |
| transcripts | Stored video transcripts |
| generated_content | AI-generated content |
| tone_profiles | Voice cloning profiles |
| webhook_configs | Dynamic webhook configurations |
| webhook_logs | Webhook execution history |

## Key AI Prompts Location

- **Content Generation:** `src/lib/prompts/content-generation.ts`
- **SEO Analysis:** `src/lib/prompts/seo-analysis.ts`
- **Tone Analysis:** `src/lib/prompts/tone-analysis.ts`
- **Image Generation:** `src/lib/prompts/image-generation.ts`

## Critical: Anti-Cliché System

When generating content, NEVER use these words/phrases:
- delve, realm, tapestry, symphony, unleash, unlock, game-changer
- landscape, fostering, harnessing, leveraging, pivotal, crucial
- "In the fast-paced world of...", "In today's ever-evolving..."

Style rules:
- NO em dashes (—)
- NO rhetorical questions
- MAX 1 emoji
- Write conversationally ("coffee talk" tone)

## Supabase CLI

```bash
supabase link --project-ref fakxlxggvkwswbspkics
supabase db push      # Push migrations
supabase db pull      # Pull remote schema
supabase gen types typescript --local > src/types/database.ts
```

## Testing

When implementing features:
1. Test API routes with curl or Postman
2. Verify Supabase RLS policies work (user isolation)
3. Check error handling returns proper status codes
4. Ensure all inputs are validated with Zod

## Git Workflow

- Main branch deploys to production via Vercel
- Commit messages should be descriptive
- Reference the plan file for implementation order
