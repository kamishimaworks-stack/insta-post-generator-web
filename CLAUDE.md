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

# Supabase Edge Functions (requires supabase CLI or npx)
# Binary path: C:/Users/user/AppData/Roaming/npm/node_modules/supabase/bin/supabase
supabase link --project-ref ekrbysjicnqewsplqocz
supabase functions deploy generate-caption --no-verify-jwt
supabase functions deploy analyze-tone --no-verify-jwt
supabase functions deploy analyze-hashtags --no-verify-jwt
supabase functions deploy modify-prompt --no-verify-jwt
supabase functions deploy analyze-style --no-verify-jwt

# Deployment
git push origin main           # Triggers Vercel auto-deploy
```

**All Edge Functions MUST be deployed with `--no-verify-jwt`** — the functions do their own JWT verification with CORS headers. Without this flag, the Supabase gateway rejects expired tokens before the function can respond, and the 401 lacks CORS headers (causing `data: null` on the client).

## Architecture

**Next.js 16 + Supabase + dual AI pipeline (Gemini + Claude)**

### AI Pipeline

```
User Input (theme + description + taste? + images?)
  → [if images] Supabase Storage upload (client-side, up to 10 images)
  → Edge Function: generate-caption
    → [if images] Gemini 3 Flash Preview (image analysis per image, base64)
    → Claude Sonnet 4.6 (caption generation, tool_use for structured JSON)
  → Response {caption, hashtags, image_analysis}
```

Images are optional (0–10). When omitted, Gemini step is skipped and Claude generates from text inputs only. Multiple images are analyzed individually and concatenated with `---` separator.

Claude uses `tool_choice: { type: "tool", name: "generate_post" }` for guaranteed structured output. Fallback parses markdown code fences. Both API calls have 1 automatic retry.

Edge Function accepts both `image_paths` (string array, current) and `image_path` (single string, legacy) for backward compatibility.

### Style Analysis Pipeline (settings page)

```
Past posts + past hashtags
  → analyze-tone + analyze-hashtags (parallel Edge Functions)
  → Returns tone_analysis + hashtag_strategy (stored in profile custom_instructions)
```

`modify-prompt` Edge Function allows users to tweak generated prompts via natural language.

Legacy `analyze-style` Edge Function combines both analyses in a single call (used by mobile app).

### Screen Flow

`(authenticated)/layout.tsx` wraps AuthGuard → unauthenticated redirects to `/login`. Authenticated users see Navigation with 3 tabs: Create → Result ↔ Settings. First-time users go through `/setup` wizard (9-step profile setup).

### State Management

Single Zustand store (`stores/useGenerationStore.ts`):
- **Image state**: `imageFiles: File[]`, `imagePreviews: string[]`, `imagePaths: string[]` — supports up to 10 images with grid preview and per-image removal. `resetInput()` revokes object URLs to prevent memory leaks.
- **Candidate comparison**: `candidates: Candidate[]`, `activeCandidateIndex: number` — each `setResult()` appends to candidates. Users switch between candidates via tabs. `setCaption()`/`setHashtags()` sync edits back to the active candidate entry.
- Result page reuses `imagePaths` from store for regeneration (avoids re-uploading).

### Purpose Selection

Setup (step 3) and Settings use a button selection UI with 7 preset options + "その他" free-text. The `purpose` field stores either the preset text or custom text. `PURPOSE_OPTIONS` constant is defined in each file that needs it.

### Data Flow

- Profile CRUD: Direct Supabase client queries with RLS (no Edge Function)
- Caption generation: Client → Edge Function → AI APIs → DB insert → response
- Image upload: Client-side resize (1024px, JPEG, 0.8 quality) → Supabase Storage (`post-images/{userId}/{file}`)
- Style analysis: Client → 2 parallel Edge Functions → results stored in profile

### Error Handling (Client ↔ Edge Function)

Supabase JS client v2 returns `{ data: null, error, response }` for non-2xx responses. The `data` is always `null` on errors — read the error body from `response` (raw Response object). See `src/lib/api.ts` for the pattern.

## Key Conventions

- **All types use `readonly`** — immutability enforced at type level
- **Path alias `@/*`** maps to `src/*` — use `@/lib/supabase`, `@/types`, etc.
- **All UI text in Japanese** — error messages, labels, placeholders
- **No real company names in placeholders** — use generic examples like `○○会社【公式】`, `#自社名 #業界名`
- **Supabase Auth via `@supabase/ssr`** — uses `createBrowserClient` (not raw `createClient`)
- **Error responses use typed codes** — `ErrorCode` type: VALIDATION_ERROR, UNAUTHORIZED, RATE_LIMIT_EXCEEDED, IMAGE_ANALYSIS_FAILED, GENERATION_FAILED, INTERNAL_ERROR
- **Theme color: `#2563EB`** (blue) — used throughout all components

## Supabase

- **Project ref**: `ekrbysjicnqewsplqocz`
- **DB tables**: `profiles` (user settings with genre, follower_scale, competitors), `generations` (history with taste, image_analysis; `image_path` column stores JSON-stringified array of paths)
- **RLS**: All tables enforce `auth.uid() = user_id`
- **Trigger**: `handle_new_user()` auto-creates empty profile on signup
- **Rate limit**: 30 generations/day per user (checked in Edge Function)
- **Edge Function secrets**: `GEMINI_API_KEY`, `CLAUDE_API_KEY`
- **Edge Function AI models**: `gemini-3-flash-preview` (Gemini), `claude-sonnet-4-6` (Claude)
- **Storage bucket**: `post-images` (authenticated, path: `{user_id}/{filename}`)

## Validation Constraints

- Theme: 1–100 chars
- Video description: 1–500 chars
- Taste: 0–200 chars (optional)
- Images: max 10, each max 5MB, JPEG/PNG/HEIC (converted to JPEG client-side), optional

## Relationship to Mobile App

A React Native (Expo) version exists at `../instagram-post-generator/`. Both share the same Supabase backend and Edge Functions. The web version has additional features: style analysis (separate tone/hashtag functions), setup wizard, prompt modification. The mobile version uses the legacy combined `analyze-style` Edge Function.
