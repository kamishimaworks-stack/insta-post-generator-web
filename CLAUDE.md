# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
# Development
npm run dev                    # Start Next.js dev server
npm run build                  # Production build
npm run lint                   # ESLint

# E2E Testing
npx playwright test            # Run all E2E tests
npx playwright test e2e/create.spec.ts  # Single test file

# Supabase Edge Functions
npx supabase link --project-ref ekrbysjicnqewsplqocz
npx supabase functions deploy generate-caption
npx supabase functions deploy analyze-tone
npx supabase functions deploy analyze-hashtags
npx supabase functions deploy modify-prompt

# Deployment
git push origin main           # Triggers Vercel auto-deploy
```

## Architecture

**Next.js 16 + Supabase + dual AI pipeline (Gemini + Claude)**

### AI Pipeline

```
User Input (image + theme + description + taste?)
  → Supabase Storage (image upload, client-side)
  → Edge Function: generate-caption
    → Gemini 3 Flash (image analysis, base64)
    → Claude Sonnet 4.6 (caption generation, tool_use for structured JSON)
  → Response {caption, hashtags, image_analysis}
```

Claude uses `tool_choice: { type: "tool", name: "generate_post" }` for guaranteed structured output. Fallback parses markdown code fences. Both API calls have 1 automatic retry.

### Style Analysis Pipeline (settings page)

```
Past posts + past hashtags
  → analyze-tone + analyze-hashtags (parallel Edge Functions)
  → Returns tone_analysis + hashtag_strategy (stored in profile custom_instructions)
```

`modify-prompt` Edge Function allows users to tweak generated prompts via natural language.

### Screen Flow

`(authenticated)/layout.tsx` wraps AuthGuard → unauthenticated redirects to `/login`. Authenticated users see Navigation with 3 tabs: Create → Result ↔ Settings. First-time users go through `/setup` wizard.

### State Management

Single Zustand store (`stores/useGenerationStore.ts`). Result page reuses `imagePath` from store for regeneration (avoids re-uploading).

### Data Flow

- Profile CRUD: Direct Supabase client queries with RLS (no Edge Function)
- Caption generation: Client → Edge Function → AI APIs → DB insert → response
- Image upload: Client-side resize (1024px, JPEG, 0.8 quality) → Supabase Storage (`post-images/{userId}/{file}`)
- Style analysis: Client → 2 parallel Edge Functions → results stored in profile

## Key Conventions

- **All types use `readonly`** — immutability enforced at type level
- **Path alias `@/*`** maps to `src/*` — use `@/lib/supabase`, `@/types`, etc.
- **All UI text in Japanese** — error messages, labels, placeholders
- **Supabase Auth via `@supabase/ssr`** — uses `createBrowserClient` (not raw `createClient`)
- **Error responses use typed codes** — `ErrorCode` type: VALIDATION_ERROR, UNAUTHORIZED, RATE_LIMIT_EXCEEDED, IMAGE_ANALYSIS_FAILED, GENERATION_FAILED, INTERNAL_ERROR
- **Theme color: `#2563EB`** (blue) — used throughout all components

## Supabase

- **Project ref**: `ekrbysjicnqewsplqocz`
- **DB tables**: `profiles` (user settings with genre, follower_scale, competitors), `generations` (history with taste, image_analysis)
- **RLS**: All tables enforce `auth.uid() = user_id`
- **Trigger**: `handle_new_user()` auto-creates empty profile on signup
- **Rate limit**: 30 generations/day per user (checked in Edge Function)
- **Edge Function secrets**: `GEMINI_API_KEY`, `CLAUDE_API_KEY`
- **Storage bucket**: `post-images` (authenticated, path: `{user_id}/{filename}`)

## Validation Constraints

- Theme: 1–100 chars
- Video description: 1–500 chars
- Taste: 0–200 chars (optional)
- Image: max 5MB, JPEG/PNG/HEIC (converted to JPEG client-side)

## Relationship to Mobile App

A React Native (Expo) version exists at `../instagram-post-generator/`. Both share the same Supabase backend. The web version has additional features: style analysis, setup wizard, prompt modification. The mobile version's Edge Function (`generate-caption`) is shared.
