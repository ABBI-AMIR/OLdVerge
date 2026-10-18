# OLDVERGE — project handover

Written during the Claude Code takeover. Sections 1–9 describe what was **verified in this repo** at the takeover. Section 10 lists work that was **requested but not built** at that time. **Section 12 records the collection-navigation and shop-layout update and section 13 the later content-pages and copy-cleanup update** (what was implemented, verified, left untested, and what is still missing); where it conflicts with sections 1–11, section 12 is newer. Nothing was deployed or published.

> **Current state (2026-10-18).** This document is append-only history, so older sections describe states that were later changed (for example the wishlist, quick view, `InfoPage`, `CursorRipple`, `ZipperIntro`, the `oldverge-pakistan-store-v3` storage key and the "/account shows About" bug no longer exist or are fixed). For the current picture read `CLAUDE.md`, `README.md` and `docs/code-audit.md`. The 2026-10-18 audit also removed about 100 kB of CSS that no JSX could use and the unused Rubik font files.

## 1. How it was verified
- `npm ci` and `npm run build` run from a clean copy of the source (no `node_modules`, no `dist`): installed 12 top-level packages from the lockfile, build succeeded (Vite 6.4.4, 2015 modules, JS 499.6 kB / 157.6 kB gzip, CSS 142.4 kB / 29.8 kB gzip).
- No startup or build errors were found, so **no source fixes were needed for the handover**.
- Earlier in the session (before the handover) the app was exercised in headless Chromium at 390, 768 and 1440 px on 7 routes: no horizontal overflow, console clean in dev and production, plus the scroll, drawer and colour-explorer checks listed in section 6.
- **Not verified:** real touch-swipe scrolling (test harness cannot synthesise it), real devices, Safari/Firefox, screen readers, Lighthouse/performance.
- `npm audit` reports 7 vulnerabilities (2 moderate, 5 high) in the dev toolchain. Not touched; run `npm audit` and judge before upgrading anything.

## 2. Stack (installed vs used)
| Item | Evidence | Used? |
|---|---|---|
| React 19.3, react-dom | `main.jsx` | yes |
| Vite 6.4 + plugin-react 4.7 | `vite.config.js` (only the React plugin) | yes |
| react-router-dom 7.18 | `BrowserRouter` in `main.jsx`, routes in `App.jsx` | yes |
| zustand 5.0 | `src/store.js`, `persist` to localStorage | yes |
| framer-motion 12.4 | page transition in `App.jsx`, carousel, hero, ColorExplorer | yes |
| lenis 1.3.27 | `SmoothScroll.jsx` | yes |
| lucide-react 0.468 | icons across Shell/pages | yes |
| tailwindcss 3.4, postcss, autoprefixer | `tailwind.config.js`, `postcss.config.js`, `@tailwind` in `styles.css` | **installed, loaded, but no utility classes used** (grep found none). It only contributes its base reset. |
| TypeScript | none | no, plain JS/JSX |
| Backend / DB / auth / payments / email / forms | none; no `fetch`, no `.env` reads, only one search `<form>` (unreachable) | absent |
| Deployment config | none | absent |

Recommendation: **keep the stack** (React + Vite + CSS + zustand). It is small, builds cleanly, and nothing here justifies a migration. Decide separately whether to remove Tailwind or start using it; leaving it half-installed is the only real stack wart.

## 3. Architecture and data flow
- `main.jsx` mounts `<BrowserRouter><App/></BrowserRouter>`. `App.jsx` renders `SmoothScroll`, `Header`, animated `RouteContent`, `Footer`, `CursorRipple`, `BrandLoader`. The theme is forced to light.
- Routes: `/`, `/shop`, `/shop/:category`, `/product/:slug`, `/wishlist`, `/cart`, `/checkout`, `/about`, `/contact`, `/faq`, `/shipping`, `/size-guide`, `/tracking`, `/order-tracking` (all `InfoPage`), `*` → NotFound. `/account` also renders `InfoPage` (see bugs).
- Data: `src/data/products.js` builds 10 products with two helpers: 6 watches (Casio ×2, Timex, Seiko, Citizen, Orient) and 4 quarter-zips (Black, Beige, Navy, Olive, all 8,490 PKR). Exports `products`, `categories = ['Watches','Quarter-Zips']`, `watchBrands`, `formatPrice`.
- State: `store.js` holds `cart`, `wishlist`, `recentlyViewed`, `recentSearches`, `theme`, `toast`. Persisted keys: cart, wishlist, recentlyViewed, recentSearches, theme (localStorage `oldverge-pakistan-store-v3`). Other storage: sessionStorage `ov-intro-seen` (loader), `ov-scroll-positions` (scroll restore).
- Shop filters and sort are component state in `ShopPage`, not URL state (except `?q=` and `?brand=`). Filters reset when you leave the page.
- Scroll: one Lenis instance in `SmoothScroll.jsx`; overlays register through `lib/scrollLock.js`.

## 4. Pages and components
- `pages.jsx`: HomePage, ShopPage, ProductPage, WishlistPage, CartPage, CheckoutPage, InfoPage, NotFoundPage.
- `components/Shell.jsx`: Header (espresso nav, merged account/saved dropdown, mega menu, bag), ProductCard (hover reveal, quick view), bag drawer, Footer (with the sample-price disclosure). Also contains `ZipperIntro` (unused).
- `HomeHero.jsx` / `TiltedGridHero.jsx` (ribbon hero), `FeaturedCarousel.jsx` (drag + wheel carousel; name and price appear on hover/focus, always visible on touch), `ColorExplorer.jsx`, `Reveal.jsx`, `BrandLoader.jsx`, `CursorRipple.jsx`, `ProductArt.jsx` (photo or CSS-drawn art with pointer tilt).
- `introState.js` is used by BrandLoader and HomeHero.

## 5. Assets
- `public/images/`: `oldverge-hero-model.jpg`, `oldverge-hero-watch-detail.jpg`, `oldverge-watch-editorial.jpg`, `quarter-zip-{black,beige,navy,olive,neutral,soft-knit}.jpg`, `watch-{casio-a168,casio-mtp,citizen-eco,orient-bambino,hero-wrist,seiko-sports,timex-weekender}.jpg` (all Unsplash, replaced 2026-10-17; see `docs/asset-sources.md`).
- `public/fonts/`: `quattrocento-400/700.woff2`, `ov-sans-300/700.woff2` (the "OV Helvetica" files are Inter-based, not real Helvetica). Cormorant Garamond and Manrope load from Google Fonts in `index.html` (needs internet).
- On the user's machine only: stale `rubik-500-latin*.woff2` files in `public/fonts/` are unused and can be deleted by the owner.
- Source and licence of the photos are not recorded in the repo. The old README said hero photos are Pexels stock.

## 6. Feature status (verified)
| Feature | Status | Notes |
|---|---|---|
| Homepage and nav | Implemented | Order: hero → featured carousel → colour explorer → two essentials → three-column editorial → trust strip. Espresso nav, "Clothes" label, no search/theme buttons. |
| Hero | Implemented | "Timeless Elegance" H1, moving image ribbon (own rAF loop). |
| Featured carousel | Implemented | Drag and horizontal wheel work; own rAF loop. |
| Shop grid | Implemented | `/shop`, `/shop/watches`, `/shop/quarter-zips`. |
| All / Watches / Clothes switching | Superseded (see section 12) | A switcher now sits above the grid. |
| Filtering | Superseded (see section 12) | Originally a permanent sidebar with component state. Now a Filter drawer with URL state. Size is no longer offered because every quarter-zip lists all of S–XXL; there is no stock data. |
| Sorting | Superseded (see section 12) | Featured, price low→high, high→low, in the URL. The "New Arrivals" link was removed. |
| Product pages | Implemented | Breadcrumbs, size picker, add to bag, JSON-LD, related, recently viewed. |
| Colour swatches | **Partial** | On quarter-zip pages a swatch navigates to the sibling product (`/product/quarter-zip-<colour>`). It is a route change, not an in-page image swap. |
| Colour images match colours | **Broken (data)** | The four quarter-zip product photos are lifestyle shots: Black → model in charcoal, Beige → cream-knit portrait, Navy → taupe collar close-up, Olive → knit on a hanger. Navy and Olive do not look navy or olive. |
| Colour explorer | Implemented with stand-ins | Default = original photo + caption link; hover/focus/tap shows one large SVG **illustration** of that colour; link reads "View X quarter-zip". Illustrations are labelled and are not photos. `quarterZipVariants.js` is the swap-in map (all null). |
| 3D viewer | **Absent** | No 3D models, no three.js/model-viewer. Only static photos, CSS art with a pointer-tilt, and SVG illustrations. Do not call any of it 3D. |
| Cart | Implemented | Drawer + `/cart`; quantity, size change, remove; persisted; PKR totals. |
| Checkout | Intentionally not functional | Shows "ORDERING IS NOT CONFIGURED", collects nothing. Keep. |
| Footer, forms | Footer yes; forms **absent** | No contact form, no newsletter, no email. Contact is an info page. |
| Responsive | Verified headless | 390/768/1440, no overflow on 7 routes. Touch swipe untested. |
| Scroll animation, Lenis | Implemented | Settings: `lerp 0.14`, `wheelMultiplier 1`, `smoothWheel true`, `syncTouch false`, vertical, `autoRaf false`, one manual rAF loop. Not created under reduced motion. Route change resets scroll; back/forward restores it; overlays lock scroll (`html.ov-scroll-locked` + `lenis.stop()`); `data-lenis-prevent` on drawers. Reveal animates once (≈500 ms rise). |

## 7. Integrations
None. No analytics, payment, email, CMS or API. Only third-party request: Google Fonts.

## 8. Known bugs and gaps
1. Product photos for Black/Navy/Olive quarter-zips do not match their colours (above). Real product-only photos are missing. Four assets needed; see `quarterZipVariants.js`.
2. Data reuse: Citizen Eco-Drive uses the Casio MTP photo; Orient Bambino uses the Timex photo. These are not photos of those watches. Casio A168 etc. are described as sample listings with unconfirmed references.
3. ~~Nav "New Arrivals" links to `/shop?sort=new`~~ Resolved in section 12 (link removed; `sort=new` is ignored).
4. `/account` shows the About page. **Wider than recorded:** `InfoPage` reads `useParams().slug`, but none of its routes (`/about`, `/contact`, `/faq`, `/shipping`, `/size-guide`, `/tracking`, `/order-tracking`, `/account`) define a `:slug`, so all of them render the About copy and the FAQ/size-guide/tracking extras never appear. Confirmed in a browser for `/contact`. Not fixed.
5. The search overlay and `?q=` handling exist but there is no button to open the overlay.
6. Old-palette remnants: lime `.button-volt` and navy ink in the bag drawer and modal buttons; legacy rules in `styles.css`; `ProductArt` colour table still has Volt/Lilac/Ink entries.
7. Unused code: `ZipperIntro` (Shell.jsx), `HERO` export, `isScrollLocked` export. Left in place deliberately.
8. Tailwind installed but unused.
9. Three animation loops still run independently of Lenis (hero ribbon, carousel, CursorRipple/BrandLoader). Acceptable now; consolidate only if profiling shows a problem.
10. ~~Filters and sort are not in the URL~~ Resolved in section 12.
11. Photos and fonts from Google need internet; no offline fallback beyond system fonts.
12. `npm audit`: 7 findings (dev toolchain), unreviewed.

## 9. Brand and copy that must be preserved
Espresso nav `#30251F`, ivory/champagne palette, Quattrocento/OV Helvetica body, Cormorant/Manrope shell, "Timeless Elegance" H1, "Considered clothing. Distinctive watches. Your everyday signature.", "Displayed prices are samples. Orders are not open yet.", footer disclosure, checkout not-configured page. Rubik was reverted by the owner.

## 10. Requested but NOT implemented (do not treat as done)
- ~~Clear All / Watches / Clothes controls on Shop, with per-category browsing state~~ Done in section 12.
- One page scroll on Shop (the current sidebar is not a separate scroller, but the requirement has not been audited on mobile).
- Real colour-matched product photography and an actual in-page colour → image swap on product pages.
- A real 3D viewer (needs real models; none exist).
- Filters based only on real attributes: size availability, stock and material data do not exist yet (every quarter-zip lists all sizes).
- Working checkout, payment provider, delivery and exchange terms, order tracking.
- Contact and newsletter forms.
- Reviews (no verified review data exists, so none may be shown).
- Real touch-device verification of Lenis (`syncTouch` is off, so native touch scroll is used).

## 11. Next steps, in priority order
1. **Get real product photography** (four quarter-zip colours, plus correct photos for Citizen and Orient) and wire it via `quarterZipVariants.js` and `products.js`. Everything visual downstream (swatch swap, explorer, shop grid) depends on this. Without it the colour features are cosmetic.
2. ~~Build the All / Watches / Clothes control and URL filter state~~ Done (section 12). `/account` and the other info pages are still not fixed.
3. **Decide the commerce path** before more UI: pick a provider or a manual order flow (WhatsApp/COD), get delivery and exchange terms, then build checkout. Until then keep the notices.
4. Clean up: remove old-palette button styles, unused `ZipperIntro`, stale Rubik files, and decide on Tailwind (use it or remove it).
5. Test on real phones (touch scroll, drawers), then run an accessibility and performance pass.

## 12. Collection navigation and shop layout update

### 12.1 What was received
- A project folder (not a ZIP) at `Downloads/oldv/oldv` containing `src/`, `public/`, `docs/`, config files, `package.json` and `package-lock.json`. All source files named in sections 3-4 were present. The surrounding `Downloads/oldv` folder also held `OLDVERGE-brand-identity/` (guidelines PDF, colours-and-fonts note), which is not part of the app.
- **No reference screenshots were included.** The layout follows the written brief and the existing OLDVERGE styling.
- Conflicts between source and earlier handover:
  - The received `node_modules` was incomplete (no `lenis`), so `npm run build` failed until `npm ci` was run. A clean `npm ci` then built successfully.
  - Local runtime was Node 24.19 / npm 11.17, not the Node 22.22 recorded in section 1. The build worked on it.
  - `/account` is not the only broken info route (see section 8, item 4).
  - `public/images/watch-casio-mtp.jpg` is not a Casio photo: the dial reads "OMEGA Seamaster Co-Axial Chronometer". It is used for "Casio MTP-1302" and "Citizen Eco-Drive". Section 8 only said the photos are reused. This was **not changed** (existing products were to be kept) and needs an owner decision.
  - Quarter-zip photos, as seen in the browser: Navy shows a dark green-grey knit collar and Olive shows a dark knit on a hanger, so they do not read as navy or olive. Black and Beige are lifestyle shots. Still unresolved.

### 12.2 Implemented
- **Navigation** (`Shell.jsx`, `data/collections.js`, `home.css`): Watches dropdown (All Watches, Rolex, Patek Philippe, Cartier, Franck Muller, Best Win) and Clothes dropdown (Quarter Zips). The label is a link to the collection; a separate chevron button (`aria-expanded`, `aria-controls`) opens the list; mouse hover opens it; Escape closes it and returns focus to the button; it also closes on route change. The mobile menu uses expandable groups with the same links, closes on Escape and on navigation, and its button shows an X while open. "New Arrivals" removed. Footer label changed to "Quarter Zips".
- **Routes**: `/shop`, `/shop/watches`, `/shop/quarter-zips`, `/product/:slug` unchanged. Brands use `/shop/watches?brand=<id>` (ids: `rolex`, `patek-philippe`, `cartier`, `franck-muller`, `best-win`, plus `casio`, `timex`, `seiko`, `citizen`, `orient` from the catalogue). `?brand=Casio` (display name) still works. Unknown `/shop/<x>` now shows the 404 page.
- **One shared page** (`CollectionPage.jsx`): breadcrumbs (Home / Shop / Watches / Brand, and Home / Shop / Clothes / Quarter Zips), heading, product count, All / Watches / Clothes switcher, one Filter button with active-count badge, removable filter chips, grid (4 columns wide desktop, 3 from 1099px down, 2 from 650px down), empty states. The permanent sidebar and the sort `<select>` were removed. The product page breadcrumb uses the same trail.
- **Filter drawer** (`FilterDrawer.jsx`): dialog with focus trap and Escape (reuses `useDialogFocus`), shared scroll lock, `data-lenis-prevent`, internal scrolling, reduced-motion fallback, Apply (shows a live match count), Clear all, close button. Watches: sort, brand (requested brands first, with real counts), style, price min/max. Quarter zips: sort, colour. All: sort, price.
- **URL state** (`lib/collectionFilters.js`): `brand`, `style`, `colour`, `price_min`, `price_max`, `sort`. Each category's last query is remembered in sessionStorage for the switcher links only; the URL always wins.
- **Facets come from data**: a filter appears only if it can change the result. Quarter-zip size is hidden (every product lists every size) and quarter-zip price is hidden (all 8,490).
- **`?sort=new`**: no date data exists, so the nav link was removed and the param is ignored.
- **Data**: `productBuilders.js` (constructors moved out of `products.js`), `demoListings.js` (empty, documented), `collections.js`.
- `App.jsx`: route transition keyed by pathname only (filters update in place); document title per collection or brand.
- Cards show "Quarter Zips" instead of "Quarter-Zips" (the data value is unchanged).
- New styles were appended to `home.css`. The old sidebar rules in `styles.css` are now unused.

### 12.3 Verified (this session: Vite dev server in the in-app browser, plus a production build)
- `npm ci` and `npm run build` succeed (2021 modules; JS 511 kB / 162 kB gzip; CSS 153 kB / 31 kB gzip).
- 1440, 768 and 390 px emulation: no horizontal overflow on the collection pages; columns 4 / 3 / 2 as designed.
- Console: no errors or warnings during the session (only Vite and React DevTools info lines).
- Desktop dropdown by hover and by keyboard (Enter opens, Tab reaches the first link, Escape closes and returns focus). Mobile menu: expand, Escape, closes on navigation, scroll lock released.
- Filter drawer: open, Apply (two brands, price minimum, sort) updates the URL, chips and count; Escape returns focus to the Filter button; scroll lock released; Shift+Tab wraps inside the dialog.
- The switcher restores each category's last query; browser Back steps through the correct URLs.
- Direct URLs: brand pages, legacy `?brand=Casio`, unknown brand, ignored params, `?sort=new`, `/shop/foo`.
- Product page breadcrumb; "add to bag" and "save" persisted to localStorage (test data was cleared afterwards).

### 12.4 Not verified
- Real touch devices, Safari, Firefox, screen readers, Lighthouse/performance.
- Reduced-motion behaviour of the new code (written, not exercised).
- Scroll position after Back/Forward from a filtered page was not measured. The existing `SmoothScroll` is unchanged, and only the URLs restored by Back were checked.
- The production build was not served with `npm run preview`.
- Keyboard focus order was spot-checked, not audited.

### 12.5 Missing images and product data
- **Rolex, Patek Philippe, Cartier, Franck Muller, Best Win**: no listings. No supplied or permitted photographs, model references or prices exist, so these collections show "No <brand> watches listed yet." Nothing was invented and no other watch photo is labelled as one of these brands. To add a listing, follow the steps in `src/data/demoListings.js`.
- **Quarter zips**: no colour-accurate quarter-zip photos. No images were sourced or downloaded in this update, so no image rights were checked and there is no source list to record.
- **Existing watches**: `watch-casio-mtp.jpg` shows an Omega Seamaster (see 12.1); `watch-timex-weekender.jpg` is also reused for "Orient Bambino". They need correct photos or relabelled/removed listings.
- Image source and licence for all existing photos are still unrecorded.

### 12.6 Remaining work
1. Decide what to do about the mislabelled watch photos (Casio MTP-1302, Citizen Eco-Drive, Orient Bambino).
2. Supply or approve photography for the five requested brands and for four colour-matched quarter-zips; then add the listings and wire `quarterZipVariants.js`.
3. Fix `InfoPage` routing so `/about`, `/contact`, `/faq`, `/shipping`, `/size-guide`, `/tracking` and `/account` show their own copy.
4. Remove the dead sidebar CSS (`.ov-shop-layout`, `.ov-filter-panel`, `.ov-filter-toggle` and related rules in `styles.css`).
5. Size filtering only makes sense once per-size availability data exists.
6. Real-device, Safari/Firefox and accessibility testing; run `npm audit` and decide on upgrades.

## 13. Content pages, minimal cards and copy cleanup

### 13.1 Implemented
- **Mobile menu ghosting**: the mobile menu no longer uses an exit animation (it could be left half-faded over the page). It now mounts instantly with a short CSS fade-in, has an opaque background, and the old side panel text was removed.
- **Product cards** (`Shell.jsx`, `home.css`): image, then one line with the name and price. Removed from cards: brand overlay, category label, variant line, "Sample listing" line, and the permanent Quick add / Quick view buttons. Those two buttons now appear on hover or keyboard focus on devices that can hover, and are hidden on touch devices (tap the card to open the product).
- **Product page**: the full photograph at its own proportions (`object-fit: contain`, intrinsic width/height set), details column sticks while scrolling, no overlays or captions, no accordion filler. Descriptions in `products.js` no longer contain "confirm with the seller" instructions.
- **Saved items**: the header icon now goes to `/wishlist` (with a count). The `/account` page never existed (it showed the About copy) and is gone from the header and mobile menu; `/account` now shows the 404 page. `/tracking` and `/order-tracking` are also gone (nothing to track). `/size-guide` redirects to `/faq#sizing`.
- **New pages** (dedicated components in `src/pages/`): FAQ (`/faq`), Our Story (`/about`), Contact (`/contact`, see below). The old generic `InfoPage` was removed, which also fixes the bug where every info route rendered the About copy.
- **FAQ**: accessible accordion (button with `aria-expanded` and `aria-controls`, answer region labelled by its question, keyboard operable, visible focus), hairline dividers, `#anchor` links open and scroll to an answer. Only two groups exist (Products & Sizing; Orders & Payments) because nothing is confirmed for Shipping, Returns or Product Care.
- **Our Story**: editorial layout following the Alder & Co. reference (title and short intro, two photographs, a statement line, photograph beside two short text blocks, one contextual shopping line). Copy uses only facts in the project.
- **Policy layout** (`PolicyPage.jsx`, `data/policies.js`): reusable document layout. `POLICIES` is empty, so no policy route or footer link exists yet.
- **Footer**: three plain-text groups (Shop; About & Help; Policies, shown only when a policy is published). The Contact link appears only when contact is published.
- **Copy removed**: the home "SAMPLE PRICES… / NOT YET SET / NOT CONFIGURED" strip, the carousel "Displayed prices are samples… Shop the collection" line, "Prices shown in PKR", the shop-page catalog note, "Sample listing" lines, product-page purchase/authenticity/delivery notes, "illustrative" in alt text, the footer "customer care" blurb and "payment options not configured" label, and "Delivery charges are not configured" in the bag drawer.
- **One notice**: the footer carries "Displayed prices are samples. Orders are not open yet." on every page. Short, necessary statements remain next to the actions they explain (product page, bag drawer, bag page, and the checkout page's "ORDERING IS NOT CONFIGURED").
- Page titles and meta descriptions per page (`PAGE_META` in `data/siteInfo.js`).

### 13.2 Contact page: gated until a real channel exists
- `data/siteInfo.js` holds all contact details as `null`. The route `/contact` and the footer link exist only if a channel is set or `VITE_CONTACT_FORM_ENDPOINT` (name only) is provided at build time. Until then `/contact` is the 404 page.
- `ContactForm.jsx` posts JSON `{ name, email, subject, message }` to that endpoint and reports success only on a 2xx response. It validates every field, keeps the text on failure, and times out after 15 s.
- No form service, email address, phone number, WhatsApp, Instagram or address was supplied. **This is a launch blocker**: the site currently gives visitors no way to reach the business.

### 13.3 Policies: internal drafts only
- `src/policy-drafts/drafts.js` has drafts for Shipping Policy, Returns & Refunds, Privacy Policy and Terms & Conditions, each with a `missing` list. They render only in the dev server at `/drafts/<slug>` (`shipping`, `refund-policy`, `privacy-policy`, `terms-and-conditions`) and are not in the production bundle (confirmed by searching `dist/`).
- Publishing one means moving a completed entry into `src/data/policies.js` (canonical paths `/shipping`, `/refund-policy`, `/privacy-policy`, `/terms-and-conditions`; aliases redirect).
- **Missing information, by policy**
  - Shipping: delivery areas, courier(s), processing/dispatch commitment, delivery charges or free-delivery threshold, cash-on-delivery handling, tracking, what to do about delays/loss/damage.
  - Returns & Refunds: return/exchange window (or none), item-condition rules and exclusions (watches may need separate terms), how to request a return and the contact channel, who pays return shipping, exchange rules, refund method and timeline, damaged or wrong item handling.
  - Privacy: legal name of the responsible business, a privacy contact, analytics decision, form provider and retention, any legal review. The factual sections (localStorage/sessionStorage use, no accounts/analytics/payments/forms in the code, Google Fonts requests) are drafted from the code.
  - Terms: legal entity and address, governing law, order/payment/cancellation terms, an intellectual-property statement (some photos are third-party), contact details, any legal review.
- FAQ groups Shipping, Returns & Refunds and Product Care are omitted for the same reason.

### 13.4 Taste-skill
- The skill is not installed here (no matching skill in the environment). I did not run `npx skills add`. I read the rules of the repository's minimalist variant (`skills/minimalist-skill/SKILL.md`) as text and applied the compatible parts: hairline-only FAQ rows, constrained text widths, no heavy shadows or gradients, restrained motion, no marketing clichés. Where it conflicts with the project (it bans Lucide icons and Inter-based fonts), the OLDVERGE identity won. The default taste-skill was not read or used.

### 13.5 Images
- No photographs were added; see `docs/asset-sources.md` for what each existing file shows and the unrecorded provenance.
- Observed while checking: two watch photos show another brand's name on the dial (Fossil on the "Casio Vintage A168" photo, Omega Seamaster on the "Casio MTP-1302" and "Citizen Eco-Drive" photo), and the quarter-zip photos still do not match their listed colours. Listings were left unchanged at the owner's request.
- The Our Story page uses existing project photos only. It avoids the two Fossil/Omega photos.
- The three reference screenshots were identified by content, not by attachment order: FAQ (Claude support prompts page), Contact (Miros), Our Story (Alder & Co.). Two further attachments (a "Hanger" shop and product page) guided the card and product-page changes.

### 13.6 Verified
- `npm run build` passes; the draft policy text is absent from `dist/`.
- Dev server, in-app browser: every new route and redirect (`/faq`, `/about`, `/contact` gated, `/shipping` and `/privacy-policy` 404, `/size-guide` redirect, `/account` 404, `/drafts/*` dev only); footer groups and links; one-line cards on collection pages; product page image sizing; no horizontal overflow on 12 pages at 390 px; FAQ keyboard operation (Enter opens, visible focus); mobile menu open/close, opaque and instantly removed.
- Contact form against a temporary local mock endpoint (since deleted): validation errors, focus moves to the first invalid field, a valid message arrives as the expected JSON, a stopped endpoint shows the failure message and keeps the text. This proves the component, not a real service.
- Bag, quick add, quick view, saved items, persistence, bag drawer, bag page and checkout page still behave.

### 13.7 Not verified
- Real touch devices, Safari, Firefox, screen readers.
- Hover reveal of Quick add / Quick view with a real mouse (markup and CSS checked, hover not exercised).
- Reduced-motion behaviour of the new pages.
- Contact form with a real provider; behaviour of the endpoint's own spam protection.
- The pane was sometimes hidden or resized while testing, which stalls animations; screenshots caught pages mid-fade and were re-taken.
- Remaining console messages seen were Vite connection errors from restarting the dev server during testing, not application errors.

### 13.8 Remaining work and launch blockers
1. A real contact channel (email, WhatsApp, form service) and confirmation of which to publish.
2. The business decisions listed in 13.3, then publish the policies.
3. Correct, owner-approved photographs: the five requested watch brands, four colour-matched quarter zips, and correct watch photos for the Casio, Citizen, Orient and Timex listings. Record each in `docs/asset-sources.md`.
4. Resize `oldverge-quarter-zip-campaign.jpg` (611 KB).
5. Optional: shipping/returns/care FAQ entries once those policies exist.

## 14. Minimal design pass (no backend)

The owner asked to finish the design before any backend work. Section 13 items on policy drafts and the "no contact page" state are superseded here.

### 14.1 Implemented
- **Product cards**: only the photograph, then name and price on one line. The wishlist heart, Quick add, Quick view and brand overlay were removed from photos; the quick-view dialog code is gone. Saving and adding to the bag happen on the product page. The whole card is a link.
- **Collection pages**: heading, breadcrumbs, All/Watches/Clothes tabs, one Filter button with the piece count beside it. Removed the "of N" line, italic dot and extra text.
- **Product page** (Hanger reference): large photograph at its own proportions, name and price on one row, colour and size (clothes), full-width Add to bag, outlined Save, description. Removed the size-guide link and dialog, the "orders not open" line, the recently-viewed row and the eyebrow label. A mobile bug (image column collapsing) was found and fixed during checking.
- **Contact page** (Miros reference): very large heading, underlined fields on the left, a dark card of channels on the right, pill Send button. It lists only configured channels. In the live build it is still hidden until `siteInfo.contact` has a channel or `VITE_CONTACT_FORM_ENDPOINT` is set; in the dev server it always shows with the form disabled and a "development preview" note so the layout can be reviewed.
- **Four policy pages** published and linked in the footer under Policies: Shipping Policy (`/shipping`), Returns & Refunds (`/refund-policy`), Privacy Policy (`/privacy-policy`), Terms & Conditions (`/terms-and-conditions`), plus aliases (`/shipping-policy`, `/returns`, `/privacy`, `/terms`). The draft folder and dev-only draft route were removed.
- Home: removed the "A STUDY IN THE EVERYDAY" label and the "Made to wear often. Chosen with care." line.
- **Skills installed** (copied, nothing executed except one read-only search): UI UX Pro Max and the 18 context-engineering skills, under `Downloads/oldv/.claude/skills`. Both repositories are MIT licensed; licences are stored beside them. Scripts were reviewed first (no network, shell or deletion calls apart from a demo cleanup in one example). Claude Code's `/plugin install` route was not used (it is an interactive command). Skills added mid-session may only load in a new session.
- UI UX Pro Max's generated design system suggested Cormorant with a warm-neutral palette (consistent with OLDVERGE) and a "Liquid Glass" style (rejected: not minimal). Only its accessibility and UX checklist was applied.

### 14.2 Policy details still needed (the pages state this plainly and invent nothing)
- Shipping: delivery areas, couriers, processing time, delivery charges or free-delivery threshold, cash on delivery, tracking, delayed/lost/damaged parcels.
- Returns & Refunds: return window, condition rules and exclusions (watches may differ), how to request a return, who pays return shipping, exchanges, refund method and timeline, damaged or wrong items.
- Privacy: name of the responsible business, a contact for privacy requests, analytics decision, form provider and retention if the contact form goes live.
- Terms: legal name and address, governing law, order/payment/cancellation terms once ordering opens, an intellectual-property statement (some photographs are third-party), contact details.
- These two pages and the Terms "Orders" section currently say only that no orders are accepted yet. That is accurate but is a placeholder in spirit; replace with real terms.

### 14.3 Images
- The supplied `oldverge-images.zip` holds the same 12 photographs already in `public/images` (identical names and sizes). No image was added or changed. The photo problems in `docs/asset-sources.md` still apply (Fossil and Omega dials, quarter-zip colours).

### 14.4 Backend removed
- The owner asked for design only. The Supabase SQL, database tests and the packages added for them (`@supabase/supabase-js`, `zod`, `pg`, `embedded-postgres`) were deleted; `package.json` is back to its original dependencies and the storefront has no backend or API code. Do not start backend work until the owner asks.

### 14.5 Verified
- `npm run build` passes.
- 390, 768 and 1440 px in the in-app browser: no horizontal overflow on home, shop, product, contact, FAQ, Our Story, the four policy pages, wishlist, bag and checkout (checked in groups); collection columns 4 / 3 / 2; product image and column layout at 390 and 768.
- Cards contain no buttons; footer groups and policy links; aliases redirect; contact preview page renders with the form disabled.

### 14.6 Not verified
- Real touch devices, Safari, Firefox, screen readers; keyboard walk-through of the new product page; reduced motion.
- The in-app browser was often hidden or slow, so screenshots caught pages mid-fade. Layout was confirmed by measurement as well.
- A live contact form (needs a real endpoint).

### 14.7 Pictures not showing: loading fixes
- All 12 photos were already in `public/images`, byte-identical to `oldverge-images.zip`; every path the code uses exists, and a fresh unzip, `npm ci` and build loaded all of them. The problem was how slowly they appeared on a low-frame-rate screen.
- Page transitions and scroll-reveals now use CSS (not JavaScript animation frames) and start at about 55-60% opacity, so pictures are never invisible while an effect waits to run. The old framer-motion page transition could also keep the previous page on screen.
- Product photos now load immediately instead of lazily. `oldverge-quarter-zip-campaign.jpg` was downscaled from 2000x3000 (611 KB) to 1000x1500 (227 KB); the original remains in the zip.
- Measured in the in-app browser: its frame rate was about one frame per second, so screenshots lag behind the real page. In a normal browser these effects finish in well under a second.
