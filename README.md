# OLDVERGE — storefront preview

Front-end storefront for OLDVERGE watches and menswear (prices in PKR). React + Vite. There is **no backend**: **orders are not open and all prices are samples**. The checkout, sign-in, account, tracking and newsletter screens are labelled demonstrations; nothing is stored on a server, paid, emailed or shipped.

## Requirements
- Node.js `^22.13.0 || >=24.0.0` (see `engines` in `package.json`; `.nvmrc` pins 22). Lint and tests need it; the production build alone also works on Node 20.19+.
- npm (the repo uses `package-lock.json`)

## Run locally
```sh
npm ci          # install exactly what the lockfile says
npm run dev     # dev server, usually http://localhost:5173
```

## Scripts
| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run lint` | ESLint (flat config, `eslint.config.js`) |
| `npm test` | Vitest unit tests (`src/**/*.test.js`: money, collection filters, cart/Buy now store) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve `dist/` locally |

CI (`.github/workflows/ci.yml`) runs `npm ci`, lint, tests and the build on pull requests and on pushes to `main`. It uses a read-only token and no secrets.

## Environment variables
Names only; copy `.env.example` to `.env.local` if you need one. Only public values belong in `VITE_*` variables, because Vite inlines them into the browser bundle.

| Name | Used by | Notes |
|---|---|---|
| `VITE_CONTACT_FORM_ENDPOINT` | `src/data/siteInfo.js`, `ContactForm.jsx` | Optional. An `https:` URL that accepts the contact form as JSON. Unset (default) keeps the contact form in a disabled demo state. |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | not read yet | Reserved for the planned Supabase phase. A secret/service-role key must never use the `VITE_` prefix. |

## Deployment
No deployment config exists and nothing has been deployed from this repo. `dist/` is a static site that uses `BrowserRouter`, so the host must rewrite every path to `/index.html` and serve it from the domain root (Vite `base` is `/`). Examples: Netlify `public/_redirects` with `/* /index.html 200`; Vercel `vercel.json` with a rewrite of `/(.*)` to `/index.html`.

## Stack
React 19, Vite 6, react-router-dom 7, zustand 5, framer-motion 12, Lenis (smooth scroll), lucide-react. Styling is hand-written CSS (`src/styles.css`, `src/home.css`, `src/store.css`). Tailwind and PostCSS are installed only for Tailwind's base reset (`@tailwind base`); no Tailwind utility classes are used.

Last verified production build (2026-10-18): 2,049 modules, JS about 571 kB (178 kB gzip), CSS about 112 kB (22 kB gzip). Vite warns that the JS chunk exceeds 500 kB; code-splitting is not done yet.

## What exists
- Home (hero, featured carousel, quarter-zip colour explorer, category and editorial sections), Our Story, FAQ, Contact (layout preview), four policy pages, 404.
- Collections `/shop`, `/shop/watches`, `/shop/watches?brand=<id>`, `/shop/quarter-zips` with breadcrumbs, an All/Watches/Clothes switcher and a Filter drawer. Filters and sort live in the URL. Rolex, Patek Philippe, Cartier, Franck Muller and Best Win show an empty-collection state because no verified listings or photos exist (`src/data/demoListings.js`).
- Search (header panel and `/search`), product pages with colour and size, add to bag and Buy now, bag drawer and page, demo checkout and confirmation, demo account, shipping, returns and track-order demo pages.
- Cart lines and the Buy now item persist in the browser (localStorage `oldverge-store-v4`), along with recent searches. Buy now never changes the bag.
- Lenis smooth scroll with scroll lock for overlays, scroll restore on back/forward, reduced-motion fallback.

## What does not exist
- Real checkout, payments, orders, inventory, delivery or exchange terms, real accounts, email, reviews, a wishlist, a 3D viewer.
- A contact channel: `src/data/siteInfo.js` holds email, phone, WhatsApp and Instagram as `null`.
- Real shipping and returns terms: those two policy pages only state that no orders are accepted yet.

## Assets
- Photos in `public/images/` are Unsplash stand-ins (what each shows and its credit: `docs/asset-sources.md`). They approximate the products and are not OLDVERGE product photography; several do not match their listing.
- Fonts in `public/fonts/`: Quattrocento and an Inter-based Helvetica stand-in. Cormorant Garamond and Manrope load from Google Fonts.
- Product data: `src/data/products.js`; collections and navigation: `src/data/collections.js`.

## Documentation
- `CLAUDE.md`: working rules and brand/commerce constraints
- `CONTRIBUTING.md`: Git workflow
- `docs/code-audit.md`: latest code audit, fixes and remaining risks
- `docs/project-handover.md`: engineering history
- `docs/asset-sources.md`: photo provenance
