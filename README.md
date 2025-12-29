# YTS Web

A web-based version of YTS (YouTube Transcript System) - Transform YouTube videos into engaging, original content with AI-powered transcription and content generation.

## Features

- **Transcript Fetching**: Automatically fetch transcripts from YouTube videos with AI transcription fallback
- **AI Content Generation**: Transform transcripts into various formats (LinkedIn, Twitter, Blog, Newsletter, etc.)
- **Voice Cloning**: Create and manage tone profiles to match your unique writing style
- **Video Search**: Search YouTube directly with advanced filters
- **Multi-user Support**: Each user has their own isolated workspace with authentication

## Tech Stack

- **Frontend**: Next.js 14+ (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (Serverless)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **AI Services**:
  - Claude (Anthropic) - Content generation
  - Groq Whisper - Audio transcription
  - Gemini - Image generation
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- API keys for: Anthropic (Claude), Groq, Google AI, YouTube Data API

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/yts-web.git
   cd yts-web
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Fill in your API keys and Supabase credentials.

4. Set up Supabase:
   - Create a new Supabase project
   - Run the SQL schema from `supabase/schema.sql` in the SQL Editor
   - Enable Google OAuth in Authentication settings (optional)

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Authentication pages
│   │   ├── login/
│   │   ├── signup/
│   │   └── callback/
│   ├── (dashboard)/      # Protected dashboard pages
│   │   ├── transcripts/
│   │   ├── generator/
│   │   ├── search/
│   │   └── settings/
│   ├── api/              # API routes
│   └── page.tsx          # Landing page
├── components/
│   ├── layout/           # Layout components
│   ├── ui/               # Reusable UI components
│   └── features/         # Feature-specific components
├── lib/
│   ├── supabase/         # Supabase client utilities
│   └── api/              # API helper functions
├── hooks/                # Custom React hooks
└── types/                # TypeScript type definitions
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the repository in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

## License

MIT
