# Code audit, 2026-10-18

Audit and cleanup of the OLDVERGE storefront before its first publication to Git. Frontend only. The Supabase backend is a separate, later phase and was **not** started.

## 1. Scope and exclusions
- **Reviewed:** every first-party file under `src/` (about 70 files), `index.html`, `vite.config.js`, `postcss.config.js`, `tailwind.config.js`, `package.json`, `package-lock.json`, `public/` references, `docs/` and the root docs.
- **Not reviewed:** dependency source under `node_modules/` (assessed through `npm audit` and engine metadata only); image contents beyond what `docs/asset-sources.md` already records; WebP dimensions; any hosted service (none is configured).
- **Method:** four parallel read-only audit agents (architecture and duplication; security and configuration; frontend behaviour and accessibility; Git, packaging and CI readiness), then fixes by the lead, then a separate review agent that did not write the fixes (section 8).
- **Not claimed:** the code is bug-free. Coverage means "read and reasoned about", not "exercised on every device".

## 2. Findings and what was done
Severity is the auditor's estimate. "Fixed" means changed in this pass and covered by the checks in section 6.

### Fixed
| # | Finding | Evidence | Sev | Fix |
|---|---|---|---|---|
| A | Privacy policy contradicted the code: it listed saved items and recently viewed products (removed), said there are "no customer accounts", omitted the Buy now item, the demo sign-in data in sessionStorage and, if a form endpoint is set, the phone number | `src/data/policies.js`, `src/store.js` | Medium | Text rewritten to match what is actually stored and sent |
| B | Account notes said "Nothing you type is saved or sent" although name, email and phone are written to sessionStorage (`ov-demo-customer`); "changes last until you close this tab" was wrong for addresses and orders (lost on reload) | `src/pages/account.jsx` | Medium | Wording corrected |
| C | Track order marked an order placed in this demo as "Handed to courier" | `src/pages/support.jsx` | Low-Med | Stages only for the sample orders |
| D | Adding past the 9-per-line cap announced "added" while silently capping | `src/store.js` | Low-Med | `addToCart` returns `capped` and announces the limit; unit-tested |
| E | A malformed `#%E0%A4%A` in the URL made `decodeURIComponent` throw inside a layout effect | `src/components/SmoothScroll.jsx` | Low | try/catch; page loads (checked in the browser) |
| F | Contact endpoint accepted any URL scheme; `AbortSignal.timeout` fails on older Safari | `siteInfo.js`, `ContactForm.jsx` | Low | https-only (http on localhost in dev); `AbortController` with cleanup |
| G | Free delivery wording "free over" disagreed with the `>=` rule; shipping bar rounded up to 100% while money was still due | `money.js`, `ProductPage.jsx`, `support.jsx`, `CartDrawer.jsx` | Low | "free from"; `Math.floor` |
| H | `fetchpriority` attribute casing (React warns) and a reduced-motion carousel that still scrolled smoothly | `ProductPage.jsx`, `FeaturedCarousel.jsx` | Low | Corrected |
| I | Newsletter lead-in invited an action that does nothing | `NewsletterForm.jsx` | Low | Now says it is a preview |
| J | Docs contradicted the code (wishlist, quick view, `InfoPage`, storage key, "no env vars", "search unreachable", mojibake in `CLAUDE.md`) | `README.md`, `CLAUDE.md`, `docs/project-handover.md` | Medium | Rewritten; handover got a "current state" banner |
| K | No `.gitignore`, no lint, no tests, no CI, no `engines`, no `.env.example` | repo root | Medium | Added (section 5) |

### Documented, not fixed (owner decision, or low value, or out of scope)
| # | Finding | Why left |
|---|---|---|
| L | **Delivery numbers (PKR 250 and 600, 3-5 and 1-2 working days, PKR 10,000 threshold) appear in the UI** and on `/pages/shipping` as "illustrative". `CLAUDE.md` forbids inventing delivery terms but also approved the demo journey. | Owner decides whether demo delivery options may stay. Launch blocker either way. |
| M | `/pages/shipping`, `/pages/returns` duplicate the topics of `/shipping`, `/refund-policy`; the footer links the `/pages/*` versions | Needs one canonical page per topic; owner decision |
| N | Tailwind, PostCSS and Autoprefixer are installed only so `@tailwind base` can load Preflight, a reset the layout depends on. No utility classes are used. (The `components` and `utilities` directives were removed in this pass: they generated stray `.block`, `.flex`, `.hidden`, `.filter` ... classes from words in the code, a collision risk.) Dropping Tailwind entirely needs a replacement reset. | Keep and document; decide later |
| O | `npm audit`: 7 dev-only findings (5 high, 2 moderate) reached through `tailwindcss` 3.x (braces ReDoS, postcss-selector-parser). The production dependency audit is clean (0). The suggested fix is a Tailwind major upgrade. | Build-time only, no runtime exposure. Resolve together with decision N. |
| P | `siteInfo.isContactPublic()` is unused although `CLAUDE.md` described a contact gate; the contact page currently renders as a labelled layout preview | Owner decides gate vs preview |
| Q | Buy now item persists in localStorage indefinitely (a stale item can reappear days later) | Persistence on refresh is wanted; owner decides expiry |
| R | Low-priority accessibility: newsletter errors are not focused or announced; checkout field errors clear only on the next submit; identical announcements are not repeated; `useDialogFocus` queries the first dialog in the document; filter drawer counts a reversed price range unswapped; `RouteContent` re-renders on every announcement; PasswordField hint not tied by `aria-describedby`; card has two adjacent links to one target; Lightbox lacks `data-lenis-prevent`; FAQ `#anchor` may be scrolled twice (Lenis and `scrollIntoView`, unconfirmed) | Polish; none blocks a demo |
| S | Hero, carousel and home category images lack `width`/`height`; every product card image is `loading="eager"` | Performance polish |
| T | JS bundle is 571 kB (178 kB gzip), Vite warns above 500 kB; no code splitting | Optimisation, not a defect |
| U | Order ids `OV-DEMO-<last 6 digits of Date.now()>` can repeat; orders re-price from the live catalogue | Harmless in a demo. Must not become a real key. |
| V | `persist` `version: 1` has no `migrate` | Add when the version is bumped |
| W | Google Fonts are a third-party request (disclosed in the Privacy policy) | Self-hosting Cormorant and Manrope would remove it |
| X | No `<meta name="robots">`, favicon, `og:image` | Add at launch |

### Areas checked and clean
No secrets, tokens, real emails or phone numbers anywhere in the tree; no `dangerouslySetInnerHTML`, `innerHTML`, `eval`; no open redirects (`next` is restricted to `/account*`); no `console.*` calls; user text is rendered only through React text nodes; prices are never read from storage (`resolveLines` takes them from the catalogue); URL filter parsing rejects NaN, negatives, decimals and oversized values; product/variant ids are consistent; every image and font path used exists; scroll lock registry and effect cleanup are sound.

## 3. Consolidation and removal manifest
| Item | Evidence it was safe | Replacement |
|---|---|---|
| `formatPrice` in `src/data/products.js` | Two import paths, identical behaviour | `src/lib/money.js` is the only definition; 7 importers updated |
| `originalPhoto` copy in `FeaturedCarousel.jsx` | Same regex as `productImages.js` | Import from `src/data/productImages.js` |
| Duplicate price sort in `SearchPage.jsx` | Same comparator as `collectionFilters.js` | `sortProducts()` exported from `collectionFilters.js` |
| `categories`, `watchBrands` (`products.js`) | Zero importers; `watchBrandOptions()` covers the second | none |
| `ButtonLink` (`ui.jsx`), `policyBySlug` (`policies.js`), `clearDirect` (`store.js`) | Zero references | none |
| Unused colour keys in `ProductArt.jsx` (Ink, Volt, Lilac, Ember, Ocean, Chalk, Gold) | No product uses those colours | Palette keeps Olive, Silver, Stone, Black |
| `public/fonts/rubik-500-latin.woff2`, `rubik-500-latin-ext.woff2` (30 KB) | Zero references in `src/` and `index.html`; the owner reverted Rubik | none |
| Dead CSS: `styles.css` 122 KB to 33 KB, `home.css` 72 KB to 60 KB, `store.css` 35 KB to 34 KB (316 + 54 + 6 classes, about 1,000 rules) including the old filter sidebar, `.button-volt`, quick-view, zipper, cursor-ripple, old hero and cart styles | Each removed selector needs a class that appears in no JS/JSX/HTML token and matches no dynamic prefix (`ovg-`, `ov-swatch-`, `ov-cx-*`, `tgh-*`, `faq-*`, `is-v*`). Selectors using `:not/:is/:where/:has` and `@keyframes` were left alone. | Layout fingerprints of 17 routes at 390, 768 and 1440 px were identical before and after (51 of 51); built CSS fell from about 200 kB to 112 kB |
| 14 unreferenced `@keyframes` (`blob-drift`, `watch-float` x2, `marquee`, `timeless-watch-float`, `garment-reveal`, `clay-drift`, `hero-watch-turn`, `unzip-left/right/fade`, `zipper-simple-fade`, `ov-hero-reveal`, `ov-menu-in`) and an orphan wishlist comment | Not named by any `animation` declaration or in JS | none |
| Tailwind `@tailwind components` and `@tailwind utilities` directives | No Tailwind utility classes used; they emitted stray utility classes | `@tailwind base` only |
| Not removed on purpose | `lib/lenisInstance.js` (single importer, harmless), unused `export` keywords, `isContactPublic`, Tailwind, `/shop/all` duplicate URL, the originals of all images | owner decisions or no benefit |

## 4. Security, environment and dependencies
- Environment variable names in code: `VITE_CONTACT_FORM_ENDPOINT` only. `.env.example` documents it and reserves `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (not read yet). `.gitignore` ignores `.env*` except `.env.example`. A secret must never carry the `VITE_` prefix.
- No environment file existed, so none had to be untracked. The repository had no Git history before this pass, so there was no history to scan; the proposed first commit was scanned (section 6).
- Client-side money is acceptable for a demo only. A real backend must recompute prices, delivery and tax server-side and never trust totals or the delivery id from the browser.
- The demo sign-in accepts any valid email and password. It is not authentication.
- Dependencies: production audit 0 findings; development audit 7 (decision O). No `npm audit fix --force` was run.

## 5. Tooling added
`.gitignore`, `.gitattributes` (LF), `.env.example`, `.nvmrc` (22), `eslint.config.js`, `engines.node` `^22.13.0 || >=24.0.0` (ESLint 10 and Vitest 5 require it; the production build alone also works on Node 20.19+), `license` `UNLICENSED`, scripts `lint` and `test`, three Vitest suites, `.github/workflows/ci.yml` (lint, test, build; `contents: read`; no secrets; no deploy; added in a second commit after the GitHub login received the `workflow` scope), `CONTRIBUTING.md`.

ESLint enables `rules-of-hooks` (error) and `exhaustive-deps` (warning) from `eslint-plugin-react-hooks` but not its React Compiler rules (`set-state-in-effect`, `refs`, `static-components`, ...), which flagged about ten established patterns as style findings. They can be adopted later with the React Compiler.

## 6. Checks actually run (Node 24.19, npm 11.17, Windows)
| Check | Result |
|---|---|
| `npm run lint` | exit 0, no warnings (unused-var rule has no capital-letter exemption) |
| `npm test` | 3 files, 33 tests passed |
| `npm run build` | passes; 2,049 modules; JS 571 kB (178 kB gzip), CSS 112 kB (22 kB gzip); chunk-size warning |
| `npm audit --omit=dev` | 0 vulnerabilities |
| Layout fingerprints, 17 routes x 390/768/1440 px, before vs after all CSS changes (computed layout/colour/type of every element, in document order) | 48 of 51 identical; on the 3 home captures every baseline element is still present and identical, plus 99/132/165 extra elements that are the featured carousel's loop clones (created by its animation loop, which did not run when the baseline was taken in a hidden pane). No element changed style. |
| Browser (Vite dev server): add to bag x10 caps at 9 with the limit message; Buy now leaves the bag unchanged; search panel and filter drawer open, Escape closes, scroll lock released; `/faq#%E0%A4%A` loads; console clean; no horizontal overflow at the pane width | passed |
| Clean-clone install and build | see section 7 |

**Not verified:** real touch devices, Safari, Firefox, screen readers, Lighthouse/performance, reduced-motion behaviour of changed code, hover reveals with a real mouse, a contact form with a real endpoint, `npm run preview`, GitHub Actions (nothing is pushed yet). The embedded browser pane runs at about one frame per second and was sometimes hidden, so exit animations (for example the filter drawer) did not finish there; layout was confirmed by computed-style measurement instead of screenshots.

## 7. Agent review responsibilities and conclusions
- Four audit agents were read-only and reported findings; the lead agent alone edited files and handles Git.
- Independent reviewer: a separate agent that did not write the fixes re-ran lint, tests and build, scanned the whole tree for secrets (clean), checked `.gitignore` against `git status --ignored` (safe; 105 files, nothing over 1 MB), checked the CI file (valid, read-only), and tried to find a class the CSS purge wrongly removed (none found). Findings and fixes are in section 9. No sign-off is claimed beyond that.

## 8. Remaining launch blockers (unchanged by this pass)
Correct licensed photography; confirmed prices, SKUs and stock; business contact channel; approved shipping, returns, privacy and terms text; selected payment and delivery methods; owner decisions L, M, N, P, Q above. Publishing code does not resolve any of them. Live ordering stays closed.

## 9. Review results and follow-up
The review found no critical or high issue. Confirmed findings and what was done:
- **`engines` contradicted the new devDependencies** (Vitest 5 needs Node 22.12+, ESLint 10 needs 22.13+): fixed, `engines.node` is `^22.13.0 || >=24.0.0`, docs updated.
- **The lint unused-var exemption hid an unused `Link` import (`ui.jsx`) and three `import React` lines**: removed them and narrowed the exemption to `^_`.
- **`@tailwind components/utilities` still emitted stray utility classes**: removed; `@tailwind base` stays. Layout re-verified (section 6).
- **13 unreferenced keyframes, a duplicate `watch-float` and an orphan comment survived the purge**: removed.
- **Tests depended on the real catalogue and lacked a positive `validateOptions` case**: comments explain the intentional coupling, a positive case was added (33 tests), the store test resets `announcement`.
- **Privacy text said checkout details are held "for that page only"**: now "until you reload or leave the site".
- **`CLAUDE.md` had a UTF-8 BOM**: removed.
- Not acted on: pin the two GitHub Actions by commit SHA (they use the official `v4` tags; optional hardening); unused CSS custom properties (`--shadow-light`, `--radius-xl`, `--radius-md`, `--ov-charcoal`, `--ov-cocoa`), left as harmless.

## 10. Next phase: Supabase integration points
Replace `src/data/products.js` and `productBuilders.js` with a catalogue service; replace `resolveLines` re-pricing and `computeTotals` with server quotes; replace `completeOrder` and `sampleCustomer.js` with an order function and real Auth; replace the contact `fetch` with a function-backed endpoint; add `src/lib/supabase.js` reading only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Keep migrations, functions and RLS tests in `supabase/` under version control and keep data, dumps and secrets out.
