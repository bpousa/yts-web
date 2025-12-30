# YTS-Web Project Management

## Quick Links

- **GitHub:** https://github.com/bpousa/yts-web
- **Vercel:** https://yts-web.vercel.app
- **Supabase:** https://supabase.com/dashboard/project/fakxlxggvkwswbspkics
- **Plan File:** `/home/mike/.claude/plans/velvety-marinating-blum.md`

---

## Current Sprint: Phase 1 - Core APIs

### In Progress
- [ ] Utility functions and validators
- [ ] Prompt template system
- [ ] Service layer (8 services)
- [ ] Transcript fetching API
- [ ] YouTube search API

### Up Next
- [ ] Content generation API
- [ ] Tone profile APIs

---

## Feature Roadmap

### Completed
- [x] Project scaffold (Next.js 14, TypeScript, Tailwind)
- [x] Supabase integration (auth, database)
- [x] UI scaffolds for all dashboard pages
- [x] Database schema v1 (profiles, projects, transcripts, content, tones)
- [x] Vercel deployment with environment variables
- [x] GitHub repository connected
- [x] Authentication system (login, signup, OAuth)

### Phase 1: Foundation (Current)
| Task | Status | Files |
|------|--------|-------|
| YouTube URL parser | Pending | `src/lib/utils/youtube-parser.ts` |
| Input validators (Zod) | Pending | `src/lib/utils/validators.ts` |
| Text formatter | Pending | `src/lib/utils/text-formatter.ts` |
| URL scraper | Pending | `src/lib/utils/scraper.ts` |
| Content generation prompts | Pending | `src/lib/prompts/content-generation.ts` |
| SEO analysis prompts | Pending | `src/lib/prompts/seo-analysis.ts` |
| Tone analysis prompts | Pending | `src/lib/prompts/tone-analysis.ts` |
| Image generation prompts | Pending | `src/lib/prompts/image-generation.ts` |
| Transcript service | Pending | `src/lib/services/transcript.service.ts` |
| YouTube service | Pending | `src/lib/services/youtube.service.ts` |
| Claude service | Pending | `src/lib/services/claude.service.ts` |
| Gemini service | Pending | `src/lib/services/gemini.service.ts` |
| Groq service | Pending | `src/lib/services/groq.service.ts` |
| SEO service | Pending | `src/lib/services/seo.service.ts` |
| Tone service | Pending | `src/lib/services/tone.service.ts` |
| Webhook service | Pending | `src/lib/services/webhook.service.ts` |

### Phase 2: APIs
| Task | Status | Files |
|------|--------|-------|
| Transcript API (list, fetch) | Pending | `src/app/api/transcripts/route.ts` |
| Transcript API (single, delete) | Pending | `src/app/api/transcripts/[id]/route.ts` |
| Transcript batch API | Pending | `src/app/api/transcripts/batch/route.ts` |
| YouTube search API | Pending | `src/app/api/youtube/search/route.ts` |
| Tone list/create API | Pending | `src/app/api/tones/route.ts` |
| Tone CRUD API | Pending | `src/app/api/tones/[id]/route.ts` |
| Tone analyze API | Pending | `src/app/api/tones/analyze/route.ts` |
| Content generation API | Pending | `src/app/api/generate/route.ts` |
| Image generation API | Pending | `src/app/api/generate/image/route.ts` |
| SEO analysis API | Pending | `src/app/api/seo/route.ts` |

### Phase 3: Webhooks
| Task | Status | Files |
|------|--------|-------|
| Webhook DB migration | Pending | `supabase/migrations/...webhook_system.sql` |
| Webhook list/create API | Pending | `src/app/api/webhooks/route.ts` |
| Webhook CRUD API | Pending | `src/app/api/webhooks/[id]/route.ts` |
| Webhook test API | Pending | `src/app/api/webhooks/[id]/test/route.ts` |
| Webhook trigger API | Pending | `src/app/api/webhooks/trigger/route.ts` |
| Webhook templates | Pending | `src/lib/services/webhook-templates.ts` |
| Webhook management UI | Pending | `src/app/(dashboard)/webhooks/page.tsx` |

**Pre-built Templates:**
- [ ] WordPress REST API
- [ ] Zapier webhooks
- [ ] Make (Integromat) webhooks
- [ ] N8N webhooks
- [ ] Notion API
- [ ] Custom JSON (user-defined)

### Phase 4: Frontend Integration
| Task | Status | Files |
|------|--------|-------|
| Transcripts page API integration | Pending | `src/app/(dashboard)/transcripts/page.tsx` |
| Search page API integration | Pending | `src/app/(dashboard)/search/page.tsx` |
| Generator page API integration | Pending | `src/app/(dashboard)/generator/page.tsx` |
| Settings page API integration | Pending | `src/app/(dashboard)/settings/page.tsx` |

### Phase 5: Polish
- [ ] Error handling improvements
- [ ] Loading states and optimistic updates
- [ ] Rate limiting
- [ ] Usage analytics

---

## Known Issues / Blockers

| Issue | Impact | Workaround |
|-------|--------|------------|
| yt-dlp on Vercel serverless | May timeout for long videos | Consider external service or Vercel Pro |

---

## Future Enhancements (Backlog)

- [ ] Team/workspace support
- [ ] API key management per user (bring your own keys)
- [ ] Scheduled content generation
- [ ] Content calendar integration
- [ ] A/B testing for content variants
- [ ] Analytics dashboard
- [ ] Mobile app

---

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/transcripts` | GET | List user's transcripts |
| `/api/transcripts` | POST | Fetch single transcript |
| `/api/transcripts/batch` | POST | Batch fetch transcripts |
| `/api/transcripts/[id]` | GET | Get single transcript |
| `/api/transcripts/[id]` | DELETE | Delete transcript |
| `/api/youtube/search` | GET | Search YouTube videos |
| `/api/generate` | POST | Generate content |
| `/api/generate/image` | POST | Generate image |
| `/api/seo` | POST | Analyze SEO |
| `/api/tones` | GET | List tone profiles |
| `/api/tones` | POST | Create tone profile |
| `/api/tones/[id]` | GET/PUT/DELETE | Tone profile CRUD |
| `/api/tones/analyze` | POST | Analyze writing sample |
| `/api/webhooks` | GET | List webhooks |
| `/api/webhooks` | POST | Create webhook |
| `/api/webhooks/[id]` | GET/PUT/DELETE | Webhook CRUD |
| `/api/webhooks/[id]/test` | POST | Test webhook |
| `/api/webhooks/trigger` | POST | Trigger webhook |

---

## Notes

- Original Python app location: `/mnt/c/Projects/yts`
- Key prompts are in `Content_Generator.py` (anti-cliché system)
- Tone DNA format example: `/mnt/c/Projects/yts/tone_profiles/OnlyOneMike Long Form Style.txt`
