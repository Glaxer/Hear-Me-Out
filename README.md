# Hear Me Out — shareable tier lists

Make a tier list template, rank it, share the link, and see everyone's rankings of the same template on one page.

Built with SvelteKit 2 + Svelte 5 (runes) + TypeScript, Supabase for the database, sign-in and image storage, and hosted on Vercel.

## Setup

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free project.
   Pick the region **Central EU (Frankfurt)**: the app's server code runs in Vercel's Frankfurt region (`fra1`),
   so keeping both in the same place keeps pages fast.
2. Open **SQL Editor → New query**, paste everything from `supabase/schema.sql` and click **Run**.
   This creates the tables, Row Level Security (RLS) policies and the `item-images` storage bucket.
3. Open **Authentication → URL Configuration** and set:
   - **Site URL**: `http://localhost:5173`
   - **Redirect URLs**: add `http://localhost:5173/auth/confirm`
     (you'll add the Vercel URLs here too, see "Deploy to Vercel")
4. Optional for local development: **Authentication → Sign In / Providers → Email** → turn off
   **Confirm email**, so new accounts can log in straight away.

### 2. Run the app

```bash
cp .env.example .env
# Fill in PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY from
# Supabase → Project Settings → API (or "Connect" → App Frameworks)

npm install
npm run dev
```

Open http://localhost:5173.

### Useful scripts

```bash
npm run dev      # dev server
npm run check    # svelte-check (types + Svelte diagnostics)
npm run build    # production build
npm run preview  # serve the production build
```

## Deploy to Vercel

The project uses `@sveltejs/adapter-vercel`, configured in `svelte.config.js` to run server code in
Frankfurt (`fra1`). Vercel's Hobby plan is free for non-commercial personal use.

### First deploy

1. Push the project to a **public GitHub repo** (never commit `.env`; it is already in `.gitignore`):

   ```bash
   cd hear-me-out
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/hear-me-out.git
   git push -u origin main
   ```

2. Go to [vercel.com](https://vercel.com), sign up with GitHub, and click **Add New → Project**.
   If the repo isn't listed, click **Adjust GitHub App Permissions** and give Vercel access to it.
3. Import the repo. Vercel detects SvelteKit automatically; leave the build settings as they are.
4. Under **Environment Variables**, add the values from your `.env`:
   - `PUBLIC_SUPABASE_URL`
   - `PUBLIC_SUPABASE_ANON_KEY`
   - `PUBLIC_SOURCE_URL` (optional): the GitHub repo URL, shown as a "Source code" link in the footer
5. Click **Deploy**. You'll get a URL like `https://hear-me-out-abc123.vercel.app`
   (you can rename the project, or add your own domain, under **Settings → Domains**).

### Point Supabase at the live site

In Supabase, **Authentication → URL Configuration**:

- **Site URL**: your production URL, e.g. `https://hear-me-out.vercel.app`
- **Redirect URLs**, keep the localhost one and add:
  - `https://hear-me-out.vercel.app/auth/confirm`
  - `https://*-<your-vercel-username>.vercel.app/auth/confirm` (so sign-up also works on preview deployments)

Without this, confirmation emails send people to `localhost`.

### After that

- Every push to `main` deploys to production automatically.
- Every other branch or pull request gets its own preview URL.
- The `PUBLIC_*` variables are read at build time, so if you change them in Vercel, redeploy.

### Things to keep in mind

- **Hobby is non-commercial only.** Ads, payments, or being paid to build or host the site need Vercel Pro.
- **Supabase free projects pause** after a period without activity. If the site suddenly can't load
  data, check the Supabase dashboard and restore the project.

## How it fits together

```
src/
  hooks.server.ts            Supabase client per request + login guard for protected pages
  lib/
    types.ts                 Tier, TemplateItem, Template, TierList
    tiers.ts                 Default tiers, categories, form parsing/validation
    images.ts                Public URLs for stored item images
    upload.ts                Browser-side image shrink (256px WebP) + upload
    supabase-browser.ts      Browser client (only used for image uploads)
    server/data.ts           Shared loaders (template + items, tier list)
    server/listForm.ts       Validation for the save/edit tier list form
    components/
      TierEditor.svelte      Drag-and-drop editor (+ tap/keyboard "select then place")
      TierControls.svelte    Rename, recolour, reorder, add, remove tiers
      TierListView.svelte    Read-only tier list (full and compact)
      ListForm.svelte        Title + visibility + editor + save
      TemplateCard.svelte    Card used in grids
  routes/
    /                        Popular templates + freshly ranked lists
    /templates               Search, filter by category, sort by popular/new
    /templates/new           Create a template (images and/or text items)
    /templates/[id]          Template page: your rankings + everyone's rankings
    /templates/[id]/rank     Make a ranking
    /lists/[id]              Shared tier list page with share link
    /lists/[id]/edit         Edit your ranking
    /me                      Your tier lists and templates
    /signup, /login, /logout, /auth/confirm
supabase/schema.sql          Tables, triggers, RLS, storage bucket
```

### Data model

- **profiles** — username per user (created automatically on sign-up).
- **templates** — title, description, category, default tiers, `visibility` (`public` or
  `unlisted`, i.e. link only) and `list_count` (kept up to date by a trigger, used for "most ranked" sorting).
- **template_items** — label, a 256px thumbnail (`image_path`) and a large version for the
  image viewer (`full_image_path`), ordered by `position`.
- **tier_lists** — a person's ranking: their own copy of the tiers (so they can rename/add tiers),
  `placements`, a map of `tierId → [itemId, …]` in order (items not in any tier are unranked), and
  `visibility` (`public`, `unlisted` or `private`). `is_public` is derived from it by a trigger.

Security is done with RLS in the database, so even direct API calls can only change your own rows.
Private tier lists are only visible to their owner.

## Ideas for next steps

These are the "later" features from the project description, with a hint on where they'd go:

- **Average ranking per template** — a Postgres view or function that scores each item by tier index
  across all public lists of a template; show it at the top of `/templates/[id]`.
- **Comments / reactions** — a `reactions` table keyed on `tier_list_id` + `user_id`.
- **Export as image** — render `TierListView` to a canvas in the browser (e.g. with `html-to-image`).
- **Editing templates** — add items to an existing template; existing lists simply show new items as unranked.

## License

Copyright (C) 2026 Jacob

This program is free software: you can redistribute it and/or modify it under the terms of the
GNU Affero General Public License, version 3, as published by the Free Software Foundation.
See [`LICENSE`](LICENSE) for the full text.

In short: you can use, change and host this code, but if you run a modified version as a website,
you must make your changed source code available to its users under the same license.
