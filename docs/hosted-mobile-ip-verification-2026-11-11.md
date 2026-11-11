# Hosted mobile and IP-header verification — 11 November 2026

## Scope

Existing staging only: `https://o-ld-verge.vercel.app` and Supabase project `qeczhyiwgvglilwqbveh`. Starting revision: `7f9db178c56a4cb4aa3e919e92a93d8c07e35979`. No orders, inventory changes, emails, business form submissions, production projects or oldverge.com requests. These are sequential browser/diagnostic checks, not a remote load test.

## Mobile functional results

- Homepage, watch collection and quarter-zip product fit the 390 and 430 px requested viewports (375 and 415 px available content with desktop scrollbars).
- Menu navigation worked. Cartier filtering changed the watch collection from 19 to two results.
- Product size S selected correctly; sizes remain S/M/L/XL. Size chart opened on request and showed the owner measurements. Image enlargement opened and closed. No cart/purchase action was used and the pre-existing bag was preserved.
- At a 320 px requested viewport, the body's fixed 320 px minimum exceeded the available width with a scrollbar. Removed that minimum and constrained the mobile product grid/copy to shrink while preserving the chart's horizontal scrolling.
- Checkout displayed “Orders are not open yet.” The closed state deliberately prevents end-to-end checkout form testing in this run.
- No observed failed image loads or console errors on the browsed pages. This is not an exhaustive device/accessibility certification or physical iOS/Android test.

## Hosted mobile lab performance: further work required

Lighthouse used a separate fresh headless Edge profile per page, a 390×844 emulated mobile screen, 150 ms network latency, approximately 1.6 Mbps throughput and 4× CPU slowdown. Protection remained enabled; an existing Vercel automation credential was used only at the Vercel origin, without global extra request headers. Reports exclude credentials and raw traces.

| Page | Profile | Performance score | LCP | CLS | Total blocking time |
| --- | --- | ---: | ---: | ---: | ---: |
| Homepage | Fresh | 12/100 | 28.66 s | 0.334 | 1.85 s |
| Shop | Fresh | 18/100 | 13.56 s | 0.517 | 0.92 s |
| Black quarter zip | Fresh | 26/100 | 7.82 s | 0.334 | 1.05 s |
| Black quarter zip | Repeat | 33/100 | 6.36 s | 0.335 | 1.07 s |

These are diagnostic lab observations, not real-user Core Web Vitals or proof of a new hosted function cold start. Vercel protection redirects contribute overhead. Some initial audits overlapped local tools; an isolated homepage repeat is retained separately to assess contention. INP has not been measured as field data.

Verified follow-up areas:

1. The homepage transferred approximately 7.3 MiB. Large stored PNG covers still load because their verified-checksum metadata has not yet activated the responsive image variants. Byte-verify each object before recording a checksum; do not silently replace approved covers by slug.
2. `PublicPage.jsx` renders a generic catalogue/product layout, then `ClientBoot.jsx` replaces it with the full app after catalogue/site loading. The substantial layout difference is a verified source of visible layout movement. Align the initial server/client layout rather than hiding the page until JavaScript loads.
3. Main-thread work and image discovery require profiling. Do not attribute every millisecond to Supabase or assume that animations alone explain the measurements. Keep requested animation aesthetics and reduced-motion support when optimizing.

Performance readiness is **not passed** by these results. Keep ordering closed while the above changes are implemented and remeasured.

## Hosted IP-header results and hardening

A temporary, expiring staging GET function imported the real `clientIp` helper and returned nonce-salted fingerprints only. It contained no database client or mailer. Requests required an existing staging server credential held only in the diagnostic runner's memory. An initial JWT-gateway authentication attempt was rejected and cleaned up; the completed run used the same application-level server-key authentication model as the existing Edge Functions. The diagnostic was deleted after each attempt.

| Completed run case | HTTP status | Observation |
| --- | ---: | --- |
| No diagnostic credential | 401 | Denied |
| Baseline | 200 | Established selected/CF fingerprints |
| Forged CF-Connecting-IP | 403 | Rejected before the diagnostic handler |
| Forged X-Forwarded-For | 200 | Selected and CF fingerprints unchanged |
| Forged X-Real-IP | 200 | Selected and CF fingerprints unchanged |
| All forged aliases | 403 | Rejected before the handler |
| Malformed CF-Connecting-IP | 403 | Rejected before the handler |
| Baseline afterward | 200 | Same selected/CF fingerprint; stable observed egress |

The last XFF entry was **not stable**, so it is not a verified trusted fallback. The patch removes XFF fallback entirely, validates/canonicalizes CF IPv4/IPv6, and shares a conservative limiter identity when CF is absent or invalid. Unit tests cover those cases. A local database-backed regression verifies that rotating forwarded aliases without ingress identity cannot rotate the rate-limit bucket; no hosted business endpoint was used for this test.

This verifies the observed direct hosted ingress path, not every possible gateway, IPv6 path, Cloudflare Worker configuration or production penetration scenario. Recheck after infrastructure changes. Raw client IPs and credentials are not retained in this report.

## Local validation

332 frontend/handler/SSR tests and 129 isolated database tests passed. Lint, client/SSR builds, bundle budgets and secret-pattern checks passed. Hosted verification and cleanup evidence is retained in ignored `scripts/out/` reports; temporary credentials/tools are not committed.
