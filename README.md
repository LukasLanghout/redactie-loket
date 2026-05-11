# Redactie Loket

Community-platform voor tips, vragen en ervaringen (Pointer-stijl), met redactioneel dashboard.

**Stack:** React 18 + Vite + TypeScript · Tailwind CSS · Supabase (Auth + Postgres + Storage, RLS) · TanStack Query · React Router · **Groq** (LLM) via Vercel serverless function + Vite dev-middleware.

## Features (MVP)

- Auth: registreren, inloggen, uitloggen (Supabase Auth)
- Tip-formulier met onderwerp, type (tip/vraag/ervaring), file upload, anoniem-optie, simpele captcha
- Publieke feed van goedgekeurde verhalen met filters + zoek
- Submission detail + reacties van redactie
- Profielpagina: "Mijn bijdragen" met status (pending/approved/rejected/published)
- Redactie-dashboard: filters, bulk approve/reject/publiceren/verwijderen, moderatie-notities, basis AI-flagging
- Light/dark mode
- Rolgebaseerde toegang (public/moderator/editor/admin) via Postgres RLS
- **AI-assistent (Groq)**:
  - In het tipformulier: "Stel onderwerp voor" (categorize) en "Help me deze tip beter maken" (doorvragen + rewrite)
  - In het redactie-dashboard: "AI-analyse" per submission (samenvatting, thema's, entiteiten, PII-detectie, prioriteit). Resultaten worden toegevoegd aan de moderatie-notities, en `ai_flagged` wordt gezet bij hoge prio of PII.

## Setup

### 1. Dependencies

```bash
npm install
```

### 2. Supabase project

1. Maak een gratis project op https://supabase.com
2. Open de **SQL Editor** en run achtereenvolgens:
   - `database/migrations/001_schema.sql`
   - `database/migrations/002_rls.sql`
   - (optioneel) `database/seed.sql` voor voorbeeld-onderwerpen
3. **Auth → Providers**: Email aanzetten. Zet "Confirm email" eventueel uit voor lokaal testen.
4. **Storage**: maak een bucket aan met de naam **`attachments`** (Public). File upload werkt zonder bucket ook — die stap wordt dan netjes overgeslagen.
5. **Project Settings → API**: kopieer `Project URL` en `anon public` key.

### 3. Env vars

```bash
cp .env.example .env
```

Vul in `.env`:

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile
```

> ⚠️ `GROQ_API_KEY` heeft géén `VITE_` prefix met opzet — anders zou Vite hem in de browser-bundle stoppen. De key wordt alleen server-side gebruikt (Vite dev-middleware lokaal, Vercel function in productie).

Een gratis Groq key haal je op https://console.groq.com/keys (geen creditcard nodig).

### 4. Draaien

```bash
npm run dev
```

Open http://localhost:5173.

### 5. Eerste admin maken

Registreer een account in de app. Open daarna in Supabase de SQL editor:

```sql
update public.profiles set role = 'admin' where email = 'jouw@email.nl';
```

Daarna verschijnt het **Dashboard** in de navigatie en kun je onderwerpen + submissions beheren.

## Deploy naar Vercel

1. Push deze repo naar GitHub.
2. Importeer 'm in Vercel.
3. Voeg deze env-vars toe in Project Settings → Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `GROQ_API_KEY` (zonder VITE_ prefix — server-side)
   - `GROQ_MODEL` (optioneel; default `llama-3.3-70b-versatile`)
4. Build command: `npm run build` · Output: `dist`. De `api/` folder wordt automatisch als serverless functions gedeployed.

## Project structuur

```
src/
  components/    Layout, ProtectedRoute, SubmissionCard
  hooks/         useAuth (Supabase session + profile)
  lib/           supabase client + database types
  pages/         Home, Login, Register, Submit, Feed, SubmissionDetail, Dashboard, Profile
database/
  migrations/    SQL schema + RLS policies
  seed.sql       voorbeeld-onderwerpen
```

## Roadmap (nice-to-haves)

- E-mail notificatie bij reactie van redactie (Supabase Edge Function + Resend)
- Likes/upvotes UI (tabel is er al)
- Real hCaptcha i.p.v. som-captcha
- Rate-limiting op `submissions.insert` via Postgres function
- Admin UI voor onderwerpen (nu via SQL)
