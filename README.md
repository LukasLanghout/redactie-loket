# Redactie Loket

Community-platform voor tips, vragen en ervaringen (Pointer-stijl), met redactioneel dashboard.

**Stack:** React 18 + Vite + TypeScript · Tailwind CSS · Supabase (Auth + Postgres + Storage, RLS) · TanStack Query · React Router.

## Features (MVP)

- Auth: registreren, inloggen, uitloggen (Supabase Auth)
- Tip-formulier met onderwerp, type (tip/vraag/ervaring), file upload, anoniem-optie, simpele captcha
- Publieke feed van goedgekeurde verhalen met filters + zoek
- Submission detail + reacties van redactie
- Profielpagina: "Mijn bijdragen" met status (pending/approved/rejected/published)
- Redactie-dashboard: filters, bulk approve/reject/publiceren/verwijderen, moderatie-notities, basis AI-flagging
- Light/dark mode
- Rolgebaseerde toegang (public/moderator/editor/admin) via Postgres RLS

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
```

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
3. Voeg dezelfde twee env-vars toe in Project Settings → Environment Variables.
4. Build command: `npm run build` · Output: `dist`.

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
