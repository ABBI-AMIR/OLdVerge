# Staging image loading and layout stability — 11 November 2026

## Scope and deployed revision

Existing staging only: `https://o-ld-verge.vercel.app`, Supabase `qeczhyiwgvglilwqbveh`. Application revision `0c7d0b1c490f2560f8d1dfd04e5c5a4d5fde81b3` is deployed from GitHub to Vercel project `o-ld-verge`. No main merge, production project, domain/DNS changes, remote load test, order, email or inventory write was performed.

## Verified causes and fixes

- Hero images were discovered late because the animated ribbon initially emitted no usable geometry. It now renders its image elements and balanced geometry in the initial server HTML. First visible images have explicit dimensions and eager/high-priority loading; CSS ribbon motion remains.
- Generic server layouts were replaced by substantially different hydrated layouts. The initial hero, collection and product geometry now match the interactive first paint. Both route-level and collection-level Suspense retain the exact public snapshot while its code loads. Exact query matching prevents displaying another filter's results. Partial public pages never become a complete cart catalogue cache, and private state is not serialized.
- Twenty-one approved stored PNG covers lacked the checksums required to activate existing responsive derivatives. Each original was downloaded and byte-verified against its repository source/manifest before recording SHA-256 metadata. Cover identity and original objects remain unchanged. Black and Navy's other approved covers were retained.
- Three approved ribbon Storage photos have smaller immutable WebP copies. Two local owner ribbon photos also get repeatable, hashed 960-pixel WebP copies through the existing prebuild image script. The clothes card reuses the optimized owner collage. Originals are retained.
- Footer newsletter verification previously loaded its third-party payload on every page view. It now starts on form focus/submit intent. A missing token is rejected locally, and server verification remains enforced. Checkout/contact verification defaults are unchanged. This run tested script activation on focus without submitting a form or completing a CAPTCHA.
- The opening brand animation now overlaps public bootstrap rather than waiting for it. Its CSS letter/bar/lift sequence is retained; a small text-only counter avoids per-frame React rerenders and loading Framer solely for that counter. Already-visible server hero content is not hidden and replayed after hydration. Reduced-motion support remains.

## Hosted mobile lab comparison

Sequential Lighthouse navigations in headless Edge: fresh profile per page, 390 × 844 viewport, DPR 1, 150 ms RTT, approximately 1.6 Mbps and 4× CPU slowdown. Product repeat uses the same profile. Existing Vercel protection stayed enabled; its access credential remained in memory and was restricted to staging requests. No global authorization headers were sent to third-party origins. Baseline is recorded in `hosted-mobile-ip-verification-2026-11-11.md`.

| Page | Profile | LCP before | LCP after | CLS before | CLS after | Transfer before → after |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Homepage | Fresh | 28.66 s | 8.17 s | 0.334 | 0.0142 | 7.31 → 1.45 MiB |
| Shop | Fresh | 13.56 s | 3.92 s | 0.517 | 0.00013 | 9.30 → 0.82 MiB |
| Black quarter zip | Fresh | 7.82 s | 3.87 s | 0.334 | 0.00153 | 5.91 → 1.21 MiB |
| Black quarter zip | Repeat | 6.36 s | 2.49 s | 0.335 | 0.00235 | 1.83 → 0.023 MiB |

These individual lab observations show substantial improvement, not a field Core Web Vitals pass or a true function cold-start measurement. All tested pages are below the 0.1 CLS threshold. Fresh-page LCP remains above 2.5 seconds; the preserved intro, JavaScript/main-thread work and protected/throttled navigation remain material. Final total blocking times were 1.61 s / 1.23 s / 1.09 s / 0.94 s respectively. Main-thread performance is not declared resolved. Results vary between runs and local machine contention can affect CPU measurements.

## Validation and safety

- 336 frontend/handler/SSR tests passed, including new regressions for initial hero discovery/animation markup, optimized owner photo order, exact SSR browse seeding and query-specific pending layouts.
- GitHub CI passed for the deployed application revision, including 129 isolated database tests, Edge Function type checks, lint, production client/SSR builds, local uncached SSR checks, local browse load checks, bundle budgets and secret-pattern scans.
- Initial JavaScript: 185.9 KiB gzip; server entry: 303.2 KiB raw, within existing budgets. Secret-pattern scanning cannot prove the absence of every possible credential.
- Browser checks confirmed five loaded ribbon photos with running CSS animations, no captured React hydration errors, no remaining loader/inert lock, shop navigation, and a loaded product cover without horizontal overflow at a 320-pixel requested viewport. Temporary viewport settings were reset.
- Checkout explicitly displayed “Orders are not open yet.” No purchase/cart action was used; the pre-existing bag was preserved.
- Read-only before/after database checks: ordering `false`; order count `4` unchanged; outbox count `8` unchanged; full inventory checksum unchanged; published/ready products `23` unchanged. Image-only path/checksum metadata was the only hosted database mutation in this task.

Sanitized machine reports, byte-verification evidence and screenshots remain in ignored `scripts/out/`. Diagnostic helpers, browser credentials, downloaded originals and temporary tools are not published. The unrelated local Session Log edit was excluded from commits.
