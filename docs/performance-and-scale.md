# Performance and catalogue scaling — 2026-10-22

## Changes

- Backend collections and both search interfaces use the `catalog_page` RPC. Filtering, sorting, total counts and facet counts happen in PostgreSQL before pagination. Requests default to 24 products, are capped at 48 by SQL, and use deterministic sort/name/id ordering. Products after the former 500-item ceiling are reachable. The collection UI exposes URL-backed filters, sorting and Previous/Next links; browser history retains the selected page.
- The browser initially loads one catalog page and the product details required by the saved cart/Buy now item. Product deep links hydrate by slug. A maximum of three product-hydration/availability requests run concurrently; availability batches contain at most 200 variant IDs.
- A bounded 256-product cache keeps recent details, protecting cart items and the current product. Protected items are retained even if they alone exceed the normal cache budget. Remote account-cart products hydrate before the login merge. Cache refresh retains concurrent newly hydrated products and removes products no longer returned by the backend. No sample-data fallback was added.
- Public settings and cached product data become stale after 60 seconds. Visible tabs refresh on the interval, focus, visibility return and reconnect. Requests are deduplicated. Background refresh retains the page; a failure is shown with retry. Settings-refresh failure closes the checkout UI until recovery; the server remains authoritative for ordering, stock and totals.
- Product, checkout, account, support, homepage and admin screens load as separate route chunks. Search/cart drawers load when opened. Backend browsing no longer pulls the demo filter drawer into its route bundle. React and Supabase have separate cacheable vendor chunks. A lightweight IntersectionObserver reveal replaces the footer's eager Framer Motion dependency while respecting reduced motion and showing content when observation is unavailable.
- Hero/carousel images carry intrinsic dimensions; the hero no longer preloads every available photograph. The homepage loader waits for three hero images instead of six and is not imported on other routes.
- Cormorant Garamond and Manrope Latin faces are self-hosted. The three WOFF2 files are the exact Google Fonts responses for the existing weights/styles; OFL licences are included. `public/fonts/store-fonts.css` retains font-display: swap. Runtime Google font connections were removed. The bundled demo privacy text and initial seed reflect this; already published backend policies must be reviewed by the owner.
- Added a favicon and robots exclusions for private/transactional routes. Route title/description and Open Graph text refresh when an asynchronously loaded product arrives.
- `npm run check:bundle` checks the complete initial JavaScript static-import closure using Vite's manifest, not just the entry file. CI enforces a 200 KiB gzip shell budget and verifies that product, checkout and admin remain deferred.

## Measurements and verification

Before this pass the initial main bundle was approximately 895 kB / 264 kB gzip. The updated initial shell plus its static JS dependencies is approximately 171.4 KiB gzip (175.5 kB). The entry itself is approximately 143 kB / 47 kB gzip. Route chunks add to this when opened; these are build-size measurements, not measured Core Web Vitals or a claim about total homepage transfer. All emitted JS chunks are below Vite's 500 kB warning threshold.

Tests cover products beyond position 500, deterministic paging, bounded page sizes, filters/facets, draft isolation, batched availability concurrency, cache eviction/pinning, cold/warm failure behavior, request deduplication/freshness, concurrent cache hydration, refresh-event cleanup, URL normalization, page rendering, and remote-cart hydration. Existing cart and security suites remain part of verification. Browser smoke checks used an isolated local demo configuration for product, cart drawer and Buy now checkout; no hosted orders or database changes were made.

## Rollout and limits

Apply `supabase/migrations/20261022000300_catalog_paging.sql` after the cart and security migrations, before deploying this frontend. The combined fresh-schema setup includes it. Run the existing security rollout steps as well; no earlier cart/security migration or production bot/MFA requirement was removed.

The UI is still a client-rendered SPA. Dynamic crawler/social previews requiring server-rendered HTML, a canonical-domain sitemap, actual hosted Core Web Vitals and production concurrency/load tests are not established by these changes. A production domain was not invented. SQL uses paged queries and catalog indexes, but total/facet aggregates still cost database work and deep OFFSET pages can be expensive at very large catalog sizes; measure hosted query plans before setting throughput targets. Offset pagination is deterministic for an unchanged catalog; concurrent catalog edits can move page boundaries. Backend policies, credentials and services were not deployed or changed.

Font provenance: fetched from the existing Google Fonts stylesheet on 2026-10-22; licences from the Google Fonts repository (`ofl/cormorantgaramond/OFL.txt`, `ofl/manrope/OFL.txt`). Original image assets and their provenance are unchanged.
