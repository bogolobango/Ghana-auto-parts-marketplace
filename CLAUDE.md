# CLAUDE.md — Voom Ghana Marketplace

## Project Overview

Voom Ghana is a **vehicle spare parts marketplace** for Ghana. Vendors list auto parts (engine, brakes, suspension, etc.) and buyers search, filter by vehicle make/model/year, add to cart, and place orders. Currency is GHS (Ghana Cedis). Built as a full-stack TypeScript monorepo.

One-liner: "The Abossey Okai that fits in your pocket."

## Current Phase: CATALOG-FIRST LAUNCH (No Payments Yet)

**CRITICAL CONTEXT:** We are launching as a discovery + WhatsApp relay marketplace for the first 30 days. Buyers browse, find parts, and contact vendors via WhatsApp deep links. There is NO payment processing yet. Flutterwave integration is planned for Day 31+ after an IRL launch event in Accra.

What this means for development:
- **DO NOT** build Paystack or Flutterwave integration yet
- **DO NOT** add payment processing UI to checkout
- **DO** make the catalog, search, vendor pages, and WhatsApp flow flawless
- **DO** add waitlist capture for buyers who want to pay via MoMo when payments launch
- **DO** add vendor image upload so real vendors can list real products with real photos
- **DO** optimize for SEO — every day of indexing before the IRL launch is free distribution
- **DO** fix any false payment claims in the UI

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Node.js + TypeScript (ESM) |
| **Frontend** | React 19, Vite 7, wouter (routing), TanStack React Query |
| **API** | tRPC v11 over Express, superjson transformer |
| **Database** | PostgreSQL via drizzle-orm + node-postgres (pg) |
| **Styling** | Tailwind CSS v4, shadcn/ui (new-york style), Radix primitives |
| **Auth** | Email/password (bcrypt), Google OAuth, WhatsApp OTP (Twilio Verify) |
| **Storage** | Cloudinary (image uploads), Forge API proxy (fallback) |
| **Search** | PostgreSQL full-text search (tsvector) + trigram fuzzy fallback + custom synonym dictionary |
| **Package Manager** | pnpm (v10.4.1, enforced via packageManager field) |

## Project Structure

```
├── client/src/
│   ├── _core/hooks/          # Internal hooks (useAuth)
│   ├── components/           # App components (Navbar, Footer, ProductCard, CategoryOrb, VehicleSearch)
│   ├── components/ui/        # shadcn/ui primitives — DO NOT edit manually
│   ├── contexts/             # React contexts (ThemeContext)
│   ├── hooks/                # Custom hooks (useMobile, useComposition, usePersistFn)
│   ├── lib/                  # Utilities (trpc client, cn() helper)
│   ├── pages/                # Route pages — see Routes section below
│   ├── App.tsx               # Router + layout (wouter Switch)
│   └── main.tsx              # Entry point (tRPC + QueryClient setup)
├── server/
│   ├── _core/                # Server infrastructure (Express, tRPC, OAuth, env, cookies)
│   │   ├── index.ts          # Server entry point
│   │   ├── env.ts            # Environment variables
│   │   ├── trpc.ts           # tRPC setup + middleware
│   │   ├── oauth.ts          # Google OAuth + legacy OAuth routes
│   │   └── cookies.ts        # Session cookie config
│   ├── routers.ts            # All tRPC routes (50+ procedures)
│   ├── db.ts                 # Database helpers (all CRUD operations)
│   ├── storage.ts            # Cloudinary image upload + Forge fallback
│   ├── paystack.ts           # Paystack service (FUTURE — not wired to checkout yet)
│   ├── search-synonyms.ts    # Ghana auto-parts synonym dictionary
│   ├── sanitize.ts           # XSS sanitization for user inputs
│   ├── rateLimit.ts          # In-memory rate limiter
│   ├── seed.ts               # Category + vendor seed data
│   └── seed-products.ts      # Product seed data
├── shared/
│   ├── marketplace.ts        # Ghana-specific constants (regions, cities, vehicle makes, GHS formatting, WhatsApp link generator, phone validation)
│   ├── const.ts              # Constants (cookie name, timeouts)
│   └── types.ts              # Re-exports from schema
├── drizzle/
│   ├── schema.ts             # PostgreSQL schema — all tables + type exports
│   ├── relations.ts          # Drizzle relations
│   └── *.sql                 # Migration files
├── drizzle.config.ts         # Drizzle Kit config (PostgreSQL dialect)
└── VOOM_PAYMENT_SPRINT.md    # Future payment integration spec (Flutterwave + Paystack abstraction)
```

## Routes

| Path | Page | Auth | Description |
|------|------|------|-------------|
| `/` | Home | Public | Hero, search, featured products, categories, trust signals |
| `/products` | Products | Public | Search + filter by make/model/year/category/condition/price |
| `/products/:id` | ProductDetail | Public | Product images, specs, vendor info, WhatsApp link |
| `/cart` | Cart | Protected | Cart items, quantity adjustment |
| `/checkout` | Checkout | Protected | Order form + WhatsApp confirmation (NO payments yet) |
| `/orders` | Orders | Protected | Buyer order history |
| `/vendors` | Vendors | Public | Vendor directory |
| `/vendors/:id` | VendorDetail | Public | Vendor shop page with products |
| `/vendor/register` | VendorRegister | Protected | Vendor application form |
| `/vendor/dashboard` | VendorDashboard | Vendor | Product CRUD with image upload, order management |
| `/categories` | Categories | Public | Category listing |
| `/notifications` | Notifications | Protected | In-app notifications |
| `/admin` | AdminDashboard | Admin | Stats, vendor approval, order overview |
| `/sign-in` | SignIn | Public | Email/password, Google OAuth, WhatsApp OTP |

## Key Commands

```bash
pnpm dev          # Start dev server (tsx watch + Vite HMR)
pnpm build        # Vite build (client) + esbuild (server) → dist/
pnpm start        # Run production build
pnpm check        # TypeScript type-check (tsc --noEmit)
pnpm format       # Prettier format all files
pnpm test         # Run vitest (server tests only)
pnpm db:push      # Generate + run Drizzle migrations
```

## Path Aliases

- `@/*` → `client/src/*` (frontend imports)
- `@shared/*` → `shared/*` (shared code)
- `@assets` → `attached_assets/` (static assets)

## Architecture Patterns

### API Layer (tRPC)
- **Router location**: `server/routers.ts` — single file with all route definitions
- **Procedures**: `publicProcedure`, `protectedProcedure` (requires auth), `vendorProcedure` (requires approved vendor), `adminProcedure` (requires admin role)
- **Validation**: Zod schemas inline on each procedure input
- **Transport**: superjson over HTTP batch link at `/api/trpc`
- **Client usage**: `trpc.routerName.procedureName.useQuery()` / `.useMutation()` via `@/lib/trpc`

### Database
- **ORM**: Drizzle with PostgreSQL dialect
- **Schema**: `drizzle/schema.ts` — all tables defined here with type exports
- **Helpers**: `server/db.ts` — all CRUD functions, lazy-initialized connection
- **Migrations**: `drizzle-kit generate` + `drizzle-kit migrate` (run via `pnpm db:push`)
- Tables: `users`, `vendors`, `products`, `categories`, `cart_items`, `orders`, `order_items`, `reviews`, `notifications`, `waitlist`

### Frontend
- **Routing**: wouter `<Switch>` in `App.tsx` — file-per-page in `client/src/pages/`
- **State**: TanStack React Query (server state), React context (theme)
- **UI Components**: shadcn/ui (new-york variant) — do NOT manually edit files in `components/ui/`
- **Styling**: Tailwind CSS v4 with CSS variables for theming
- **Forms**: react-hook-form + @hookform/resolvers + Zod

### Auth Flow
- Three auth methods: email/password (bcrypt), Google OAuth, WhatsApp OTP (Twilio Verify)
- Session stored in cookie (`app_session_id`), JWT-signed
- Auto-redirect to login on `UNAUTHORIZED` tRPC errors (client-side)
- `OWNER_OPEN_ID` env var auto-assigns admin role

### Search Architecture
Three tiers in `server/db.ts`:
1. **Full-text search** — Weighted tsvector: name (A), brand+make+model (B), description+SKU (C)
2. **Fuzzy ILIKE fallback** — Expands query via synonym dictionary
3. **Trigram suggestions** — `pg_trgm` similarity for "did you mean..." alternatives

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SUPABASE_DATABASE_URL` | Alternative: Supabase PostgreSQL (takes precedence) |
| `JWT_SECRET` | Cookie/session signing |
| `VITE_APP_ID` | App identifier (client-accessible) |
| `OAUTH_SERVER_URL` | OAuth provider URL |
| `OWNER_OPEN_ID` | Auto-admin user OpenID |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `TWILIO_ACCOUNT_SID` | Twilio account (for WhatsApp OTP) |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_VERIFY_SERVICE_SID` | Twilio Verify service SID |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary image hosting |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `PAYSTACK_SECRET_KEY` | Paystack API secret (FUTURE — not used yet) |
| `VITE_PAYSTACK_PUBLIC_KEY` | Paystack public key (FUTURE — not used yet) |
| `BUILT_IN_FORGE_API_URL` | Storage proxy URL (Replit fallback) |
| `BUILT_IN_FORGE_API_KEY` | Storage proxy auth key |
| `PORT` | Server port (default: 3000) |

## User Roles

- **user** — browse, search, cart, order, review
- **vendor** — all user abilities + product CRUD with image upload, order management (requires admin approval)
- **admin** — all abilities + vendor approval/rejection, stats, category seeding

## Five Differentiators (vs. Tonaton/Jiji)

1. **Search by Make → Model → Year** — Structured vehicle compatibility on every listing
2. **Real Prices** — No "call for pricing" — GHS prices displayed on every product
3. **Verified Vendors** — Admin approval workflow, status badges, review system
4. **WhatsApp Trust Bridge** — Pre-filled deep links on every product card and checkout confirmation
5. **Ghana-Localized Search** — Synonym dictionary handles local terminology (tyre↔tire, bonnet↔hood, absorber→shock absorber)

## Conventions

- All code is TypeScript with strict mode enabled
- Use `pnpm` exclusively (not npm or yarn)
- Server entry: `server/_core/index.ts`
- Database types are inferred from Drizzle schema (`$inferSelect` / `$inferInsert`)
- Shared constants go in `shared/const.ts`
- Ghana-specific constants go in `shared/marketplace.ts`
- New tRPC routes go in `server/routers.ts`, new DB helpers in `server/db.ts`
- New pages go in `client/src/pages/`, add route in `App.tsx`
- Use `sonner` for toast notifications (client-side)
- Currency display: `formatGHS()` from `@shared/marketplace` (renders `GH₵X,XXX.XX`)
- Phone validation: `isValidGhanaPhone()` from `@shared/marketplace`
- WhatsApp links: `generateWhatsAppLink()` from `@shared/marketplace`
- Order numbers: `VOM-${nanoid(8).toUpperCase()}`
- Tests: server-side only, `*.test.ts` or `*.spec.ts` in `server/`
- Components: shadcn/ui (new-york variant) — DO NOT manually edit `components/ui/`
- Styling: Tailwind CSS v4, CSS variables for theming, `zen-card` / `zen-bg` custom classes
- Mobile-first design — Ghana's market is 70%+ mobile

## FUTURE: Payment Integration (Day 25-30)

Full spec will be in `VOOM_PAYMENT_SPRINT.md`. Summary:
- Provider: Flutterwave v3 (bridge) → Paystack (when Ghana business is incorporated)
- Server code already exists in `server/paystack.ts` (initialize, verify, charge MoMo, webhook validation)
- Channels: MTN MoMo, Vodafone Cash, AirtelTigo Money, cards
- Webhook endpoint already exists at `POST /api/paystack/webhook`
- Payment tRPC routes exist (`payment.initialize`, `payment.verify`, `payment.chargeMomo`) but are NOT wired to checkout UI
