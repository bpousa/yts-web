# YTS-Web Project Management

## Quick Links

- **GitHub:** https://github.com/bpousa/yts-web
- **Vercel:** https://yts-web.vercel.app
- **Supabase:** https://supabase.com/dashboard/project/fakxlxggvkwswbspkics
- **Plan File:** `/home/mike/.claude/plans/velvety-marinating-blum.md`

---

## Project Status: Phase 4 Complete

**Last Updated:** December 30, 2024

The core application is now fully functional with all API routes implemented and frontend pages integrated.

### Summary
- **Total Files Created:** 50+
- **API Routes:** 17 endpoints
- **Dashboard Pages:** 5 (Transcripts, Search, Generator, Settings, Webhooks)
- **Services:** 9 backend services
- **Build Status:** Passing

---

## Feature Roadmap

### Completed

#### Infrastructure
- [x] Project scaffold (Next.js 14, TypeScript, Tailwind)
- [x] Supabase integration (auth, database)
- [x] Vercel deployment with environment variables
- [x] GitHub repository connected
- [x] Authentication system (login, signup, OAuth)
- [x] Database schema (profiles, projects, transcripts, content, tones, webhooks)

#### Phase 1: Foundation (Utilities & Prompts)
- [x] YouTube URL parser (`src/lib/utils/youtube-parser.ts`)
- [x] Input validators with Zod (`src/lib/utils/validators.ts`)
- [x] Text formatter (`src/lib/utils/text-formatter.ts`)
- [x] URL scraper (`src/lib/utils/scraper.ts`)
- [x] Content generation prompts (`src/lib/prompts/content-generation.ts`)
- [x] SEO analysis prompts (`src/lib/prompts/seo-analysis.ts`)
- [x] Tone analysis prompts (`src/lib/prompts/tone-analysis.ts`)
- [x] Image generation prompts (`src/lib/prompts/image-generation.ts`)

#### Phase 2: Service Layer
- [x] Transcript service (`src/lib/services/transcript.service.ts`)
- [x] YouTube service (`src/lib/services/youtube.service.ts`)
- [x] Claude service (`src/lib/services/claude.service.ts`)
- [x] Gemini service (`src/lib/services/gemini.service.ts`)
- [x] Groq/Whisper service (`src/lib/services/groq.service.ts`)
- [x] SEO service (`src/lib/services/seo.service.ts`)
- [x] Tone service (`src/lib/services/tone.service.ts`)
- [x] Webhook service (`src/lib/services/webhook.service.ts`)
- [x] Content service (`src/lib/services/content.service.ts`)

#### Phase 3: API Routes
| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/transcripts` | GET, POST | Done |
| `/api/transcripts/[id]` | GET, DELETE | Done |
| `/api/transcripts/batch` | POST | Done |
| `/api/youtube/search` | GET | Done |
| `/api/tones` | GET, POST | Done |
| `/api/tones/[id]` | GET, PUT, DELETE | Done |
| `/api/tones/analyze` | POST | Done |
| `/api/generate` | POST | Done |
| `/api/generate/[id]` | GET, DELETE | Done |
| `/api/generate/image` | POST | Done |
| `/api/seo` | POST | Done |
| `/api/webhooks` | GET, POST | Done |
| `/api/webhooks/[id]` | GET, PUT, DELETE | Done |
| `/api/webhooks/[id]/test` | POST | Done |
| `/api/webhooks/trigger` | POST | Done |

#### Phase 4: Frontend Integration
- [x] Transcripts page - fetch, batch, list, delete, download
- [x] Search page - YouTube search, filters, batch add to queue
- [x] Generator page - content generation, image generation, SEO analysis
- [x] Settings page - tone profile CRUD, analysis
- [x] Webhooks page - templates, CRUD, testing, execution logs
- [x] Sidebar navigation updated

---

## Current Sprint: Phase 5 - Polish

### Completed
- [x] Toast notifications for all user actions (using sonner library)
- [x] Skeleton loading components for all async operations
- [x] Confirmation dialogs for destructive actions (delete operations)
- [x] User-friendly error messages with toast feedback

### Up Next
- [ ] Rate limiting on API routes
- [ ] Input sanitization review
- [ ] Usage analytics/metrics

---

## Known Issues / Technical Debt

| Issue | Impact | Status |
|-------|--------|--------|
| yt-dlp on Vercel serverless | May timeout for long videos (>10min) | Using cobalt.tools API as fallback |
| Supabase types workaround | Using `AnySupabase` type alias | Works, but not type-safe |
| Image generation | Gemini API may have rate limits | Consider caching or alternatives |
| No streaming for content generation | UX could be improved | Streaming support exists in service layer |

---

## Environment Variables Required

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI Services
ANTHROPIC_API_KEY=         # Claude for content generation
GOOGLE_AI_API_KEY=         # Gemini for image generation
GROQ_API_KEY=              # Whisper for audio transcription

# YouTube
YOUTUBE_API_KEY=           # YouTube Data API v3
```

---

## Future Enhancements (Backlog)

### High Priority
- [ ] Streaming content generation (show text as it's generated)
- [ ] Content history/versioning
- [ ] Bulk operations (delete multiple transcripts)
- [ ] Export to multiple formats (MD, HTML, DOCX)

### Medium Priority
- [ ] Team/workspace support
- [ ] API key management per user (bring your own keys)
- [ ] Scheduled content generation
- [ ] Content calendar integration

### Low Priority
- [ ] A/B testing for content variants
- [ ] Analytics dashboard
- [ ] Mobile app (React Native)
- [ ] Browser extension for quick capture

---

## Webhook Templates Available

| Template | Endpoint Example | Auth Type |
|----------|-----------------|-----------|
| WordPress REST API | `your-site.com/wp-json/wp/v2/posts` | Bearer |
| Zapier Webhook | `hooks.zapier.com/hooks/catch/...` | None |
| Make (Integromat) | `hook.make.com/...` | None |
| N8N Webhook | `your-n8n.com/webhook/...` | None |
| Notion API | `api.notion.com/v1/pages` | Bearer |
| Custom JSON | User-defined | Configurable |

---

## API Reference

### Transcripts
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/transcripts` | GET | List user's transcripts |
| `/api/transcripts` | POST | Fetch single transcript from YouTube URL |
| `/api/transcripts/batch` | POST | Batch fetch up to 50 transcripts |
| `/api/transcripts/[id]` | GET | Get single transcript with content |
| `/api/transcripts/[id]` | DELETE | Delete transcript |

### YouTube
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/youtube/search` | GET | Search YouTube videos with filters |

### Content Generation
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/generate` | POST | Generate content from transcripts |
| `/api/generate/[id]` | GET | Get generated content |
| `/api/generate/[id]` | DELETE | Delete generated content |
| `/api/generate/image` | POST | Generate image for content |
| `/api/seo` | POST | Analyze content for SEO |

### Tone Profiles
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/tones` | GET | List user's tone profiles |
| `/api/tones` | POST | Create new tone profile |
| `/api/tones/[id]` | GET | Get tone profile |
| `/api/tones/[id]` | PUT | Update tone profile |
| `/api/tones/[id]` | DELETE | Delete tone profile |
| `/api/tones/analyze` | POST | Analyze text/URL for style DNA |

### Webhooks
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/webhooks` | GET | List user's webhooks |
| `/api/webhooks` | POST | Create new webhook |
| `/api/webhooks/[id]` | GET | Get webhook with execution logs |
| `/api/webhooks/[id]` | PUT | Update webhook |
| `/api/webhooks/[id]` | DELETE | Delete webhook |
| `/api/webhooks/[id]/test` | POST | Test webhook with sample data |
| `/api/webhooks/trigger` | POST | Trigger webhook for content |

---

## Architecture Overview

```
src/
├── app/
│   ├── (auth)/           # Login, Signup pages
│   ├── (dashboard)/      # Protected pages
│   │   ├── transcripts/
│   │   ├── search/
│   │   ├── generator/
│   │   ├── settings/
│   │   └── webhooks/
│   └── api/              # API routes
│       ├── transcripts/
│       ├── youtube/
│       ├── generate/
│       ├── seo/
│       ├── tones/
│       └── webhooks/
├── components/
│   └── layout/           # Sidebar, etc.
├── hooks/                # useAuth, etc.
├── lib/
│   ├── prompts/          # AI prompt templates
│   ├── services/         # Business logic
│   ├── supabase/         # Database client
│   └── utils/            # Helpers
└── types/                # TypeScript types
```

---

## Notes

- Original Python app location: `/mnt/c/Projects/yts`
- Key prompts are in `Content_Generator.py` (anti-cliché system)
- Tone DNA format example: `/mnt/c/Projects/yts/tone_profiles/OnlyOneMike Long Form Style.txt`
- Claude model: `claude-sonnet-4-20250514`
- Gemini model: `gemini-2.0-flash-preview-image-generation`
- Whisper model: `whisper-large-v3` (via Groq)
