# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

TEMCAR is a Brazilian vehicle classifieds site (compra e venda de veículos). It is a server-rendered Express + EJS app backed by MySQL. The entire codebase — variable names, comments, route paths, DB columns — is in Portuguese (pt-BR); match that convention when adding code. SEO is a first-class concern: a large part of the logic exists to generate titles, descriptions, canonical URLs, sitemaps, and JSON-LD for crawlable city/brand/model pages.

There is no test framework (`npm test` just errors out) and no build step — it runs `index.js` directly.

## Commands

```bash
cp .env.example .env      # first-time setup
npm install
npm run db:up             # start MySQL 8 in Docker (host 127.0.0.1:3307)
npm run dev               # nodemon on http://localhost:3000
npm start                 # node index.js (production)

npm run db:logs           # follow MySQL logs
npm run db:down           # stop container
npm run db:reset          # destroy volume + re-import temcar.sql from scratch

npm run banners:cidades   # scripts/atualizar-banners-cidades.js
node scripts/converter-imagens-webp.js   # batch-convert uploaded images to webp
```

On first `db:up`, Docker imports `temcar.sql` automatically (mounted as an init script). Local DB creds are `temcar/temcar`, database `temcar`.

Validate SEO output locally with curl, e.g.:
```bash
curl -s http://localhost:3000/carros/colatina/es | grep -Ei "<title>|description|canonical|og:"
```

## Architecture

### Request lifecycle ([index.js](index.js))
Global middleware runs in this order and matters:
1. **Canonical domain redirect** — forces `https://www.temcar.com.br` (apex/http → www/https) via 301, skipped for localhost. Derived from `SITE_URL`.
2. **Static files** from `public/` served with aggressive no-cache headers for css/js/html.
3. **siteConfig middleware** — loads logo/favicon from `configuracoes_site` into `res.locals.siteConfig` with a 5-minute in-memory cache.
4. **SEO locals** — sets `res.locals.siteUrl` and `res.locals.currentUrl`.
5. **URL normalization** — 301-redirects to strip trailing slashes and force lowercase (skips `/api/` and paths with a dot).

Then route modules are mounted. **Route mount order is significant**: `RotasVeiculos` (`/carros`, `/motos`, brand/model pages) must be registered before `RotasCidade` and regional routes, because they share path-prefix space. A catch-all renders `error-page` as 404.

### Routes ([routes/](routes/))
- `routes/rotas_paginas/` — public page routers, one file per page concept. Each is an Express `Router` that queries the pool directly and `res.render`s an EJS view.
- `routes/rotas_paginas/rotas_painel/` — logged-in seller/owner dashboard (anúncio CRUD, user info).
- `routes/rotas_paginas/rotas_admin/` — admin pages.
- `routes/sitemap.js`, `routes/bairros.js`, `routes/logout.js` — mounted at root.

Many route files define their own local `slugify`/`capitalize` helpers (deburr accents, lowercase, hyphenate). These are duplicated across files — prefer importing from `helpers/anuncio-url.js` when adding new code, but expect to see copies.

### Database ([database/](database/))
- `pool_connection.js` — the shared `mysql2/promise` pool. Import this everywhere for queries.
- `start_db.js` — runs once at boot ([index.js](index.js) `start_DB()`). It is the schema source of truth: creates the DB and all tables with `CREATE TABLE IF NOT EXISTS`, runs **idempotent inline migrations** (checks `information_schema` before `ALTER TABLE`), seeds plans via `planos.js`, and creates the admin user (`id = 1`). There are no migration files — to change schema, edit `start_db.js` and write the change so it is safe to run on every boot. Some routes (e.g. `cidade.js`) also self-heal columns at request time with `garantirColuna...` helpers.
- Key tables: `usuarios` (revenda/particular, admin is id 1), `anuncios` + `anuncios_imagens`, `bairros`, `cidades`, `regioes_imagens`, and `seo_templates` (DB-driven SEO, see below).

### SEO system ([helpers/seo.js](helpers/seo.js), [helpers/schema.js](helpers/schema.js))
This is the most intricate part of the codebase. `helpers/seo.js` exports `getSeo`, `getSeoAnuncio`, `getSeoCidade`, `getSeoRevenda`, `getSeoMarca`, `getSeoMarcaModelo`, `getSeoCarroceria`. Each:
1. Has a hardcoded fallback (`SEO_DEFAULTS` + `makeDefaultSeo`).
2. Looks up an optional row in `seo_templates` (editable from admin) keyed by `pagina`.
3. Substitutes placeholders (`#marca`, `#modelo`, `#cidade`, `#estado`, `#bairro`, `#localizacao`, `#localizacao_curta`, `#tipo`, `#carroceria`) — separately for display text vs. URL slugs.
4. Falls back to the local default when a template lacks a placeholder it needs (e.g. a bairro-specific page whose template has no `#bairro`).

Routes call these and pass the resulting `seo` object + `breadcrumbs` to `res.render`. `helpers/schema.js` builds the schema.org `Vehicle` JSON-LD for listing pages. **SEO-relevant convention (see memory):** schema/per-city pages should only be emitted when there are real anúncios — empty pages get indexable meta but no fake structured data.

URL builders live in `helpers/anuncio-url.js` (`montarUrlVenda` → `/venda/{marca-modelo}/{cidade}/{estado}`) and `helpers/revenda-url.js`. Use these so canonical URLs, sitemap entries, and links stay consistent.

### Auth ([middlewares/authMiddleware.js](middlewares/authMiddleware.js))
`checkAuth(role)` returns middleware. Auth is JWT stored in `req.session.token` (express-session). `role === 'public'` passes through; `'private'` requires a valid token AND `decoded.id === 1` (the admin). With no role it reads `permissoes_paginas.status_acesso` from the DB to decide. Failures `redirect('/login')` or `/pagina-restrita`.

### Image uploads ([middlewares/](middlewares/))
`uploadImagens.js` — multer disk storage to `public/uploads/anuncios`, image-only, max 20 files × 5MB. `converterWebp.js` uses `sharp` to generate webp versions. Uploaded files live under `public/uploads/` (served statically).

### Views
EJS templates in `public/paginas/` (set as the views dir). Shared partials in `public/paginas/reutilizavel/`. Dashboard/admin views under `painel/` and `admin/`. Note several stale view files exist with suffixes like `.ejs-2[antiga]`, `home.ejs-v2` — these are not the active templates. Likewise the repo root contains old loose copies (`home.ejs`, `veiculos.js-3`, etc.) that are not wired into the app; the live code is under `routes/` and `public/paginas/`.

## Environment variables
`SITE_URL` (drives canonical host + all generated URLs), `PORT`, `DB_HOST`/`DB_PORT`/`DB_USER`/`DB_PASSWORD`/`DB_NAME`, `SESSION_SECRET`, `JWT_SECRET`, `PRIMARY_PASSWORD` (admin seed password). See `.env.example`.
