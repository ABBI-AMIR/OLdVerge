<!-- SNAPSHOT exported from the canonical Obsidian brain (Downloads/oldv/brain). Do not edit here: edit the brain, then run `node scripts/export-brain.mjs`. -->
---
type: project
updated: 2026-10-18
---
# Git and GitHub

## Repository boundary
- The Git repository is **`Downloads\oldv\oldv` only** (initialised 2026-10-18, branch `main`). The parent folder is the Obsidian vault and is **not** in the repo: `brain/`, `.obsidian/`, `.claude/`, `OLDVERGE-brand-identity/`, `rembg-env/`, `Claude outputs/` and the zips stay local. Never run `git init` in `Downloads\oldv`.
- Tracked: source, `package-lock.json`, `public/` images and fonts (4 MB, no LFS needed), `docs/`, config, CI, `.env.example`.
- Ignored: `node_modules/`, `dist/`, `.env*` (except `.env.example`), logs, `.claude/`, `.obsidian/`, venvs, archives, future database dumps and exports.

## Git identity on this machine
`git config --global` is `SpideyAB` / `<redacted>`. The owner confirmed in chat (2026-10-18) that **SpideyAB** is the GitHub account that owns the repo.

## GitHub status (2026-10-18)
- **Published.** Private repository **https://github.com/SpideyAB/oldverge-storefront**, branch `main`, two commits: `baea942` "Initial commit: OLDVERGE storefront (audited front end)" and `590ff69` "Add CI workflow (lint, test, build)" (106 tracked files). Local `main` tracks `origin/main`, working tree clean.
- GitHub CLI 2.102 was installed with winget (2026-10-18) and signed in as SpideyAB with scopes `gist`, `read:org`, `repo`, `workflow`. The token lives in the Windows credential store; it was never printed. To push, use `git -c credential.helper= -c "credential.helper=!'C:/Program Files/GitHub CLI/gh.exe' auth git-credential" push` (global Git config was not changed).
- **CI is active and green.** The first push without the workflow was needed because the login lacked the `workflow` scope; the owner then approved that scope in Chrome and `.github/workflows/ci.yml` was added in `590ff69`. Run 39134102607 on that commit passed on Linux with Node 22: `npm ci`, lint, tests, build (28 s). GitHub annotated that `actions/checkout@v4` and `actions/setup-node@v4` run on a deprecated Node 20 runtime (forced to Node 24) and that `ubuntu-latest` moves to Ubuntu 26 on 2026-10-19: bump the action major versions after confirming the newer tags exist.
- The first commit was amended before it was pushed (it was unpublished) to leave the workflow file out; no published history was rewritten.
- No branch protection or paid security features were enabled.

## Workflow
See `oldv/CONTRIBUTING.md`: branch, one focused change, review the diff for secrets, run lint/test/build, commit, push, check CI. No force-push, no rewriting published history, no auto-push hooks.

## Secrets
Names only in `.env.example`. Only public values may use the `VITE_` prefix. A secret/service-role key must never be `VITE_*`. See [[Stack]].

Related: [[Code Audit 2026-10-18]] · [[Commands]]

## GitHub publish complete — 2026-10-23
Owner authorized review/exclusions/final tests/commit/push. Published b44bde3ac2f70859cbe1b3af2247e0139f1c9d24 to ABBI-AMIR/OLdVerge branch publish/staging-integration; remote ref verified. Main remains bc33237222d80be2ce8211b7fed434e258b96b30; no merge/PR/manual deploy/domain changes. Clean single-commit snapshot based on remote main avoids unpublished chat_history export ancestry; original fix/cart-synchronization and its four unpublished commits preserved locally. Chat export retained locally and ignored. Prior remote docs/brain/Session Log.md kept in publish tree; its local update remains unstaged. Excluded local draft maintenance schedule, ad hoc backend inspection script and superseded scanner remain untracked.

Validation:300unit/126localDB, lint, client+SSR build,172.5KiBgzip initial JS/251.4KiB SSR,12Denoentrypoints,3processSSRprofile,local10RPS20sload(200requests/zerofailures), productionnpm audit0 vulnerabilities, source/build/history and333indexfile secret scans, whitespace checks. Fixed only trailing whitespace in new font license/CSS assets during publishing review. All15stagingSELECTpostconditions pass,orderingclosed/stockunchanged/noemails/neworders. Vercel project production Gitbranchmain and onlyvercel.app aliases; featurepushmayautocreateprotectedpreview. ExistingGitHubCIpushtrigger is main; noPRopenedso don'tclaimremoteCIpassed. Publishreport oldv/docs/github-publishing-review-2026-10-23.md. Environmentcredentials/build/evidenceignored, notcommitted. Current checkout now publish/staging-integration trackingremote. No further order/stock/domain authorization.

## PR1 and hosted CI verified — 2026-10-23
Created and attached https://github.com/ABBI-AMIR/OLdVerge/pull/1 from publish/staging-integration to main. No merge; autoMergefalse. Added aa0fff6 branch-specific vercel.json git.deploymentEnabled=false for publish/staging-integration before PR creation to prevent automatic preview deployments under owner's no-deploy instruction; main behavior unchanged. Initial hosted edge-check failed because clean runner had no installed npm package dependencies. Fixed in e749faad920f2da2dc7a3e60308ef90d0f36621e: setup-node22 and npmci--ignore-scripts before Deno checks. Both check and edge-check SUCCESS at exact finalhead e749faa, CI run39963468374 (https://github.com/ABBI-AMIR/OLdVerge/actions/runs/39963468374). All workflow steps including source/build scans, dependency audit, lint, unit+DB, build/budgets, isolatedSSR/local load passed. Verified15 hosted read-only staging postconditions alltrue/orderingclosed; no hosted sends/orders/inventory writes, no manualdeployments or oldverge.com changes. Main remains untouched. Ignored evidence github-integration-ci.json/pr-ci-staging-postconditions.json. Prior branch/source exclusions remain local and unstaged; don't include them in followupcommits.

## PR1 merged without deployment — 2026-10-23
Owner explicitly authorized merge into main with no deployment and orderingclosed/stockunchanged/domainuntouched. Added7ce263b main:false alongside publish/staging-integration:false in vercel.json git.deploymentEnabled before merge; exactlatesthead CIcheck+edge-check bothsuccess, mergeabletrue. Merged PR1 using GitHub merge API with exact head SHA precondition, merge commit d1de633bc99752fa7c148042e976d70590be9f49; remote main SHA verified, PRclosed/mergedtrue. No autoMerge enabled, no manualdeployment and no Vercel settings/domainchanges. Read-only Vercel deployment-list baseline11 entries; immediate and delayed aftermerge lists show zero newdeployments. Existing earlierb44bde3 branchpreview remains unchanged (not created by this merge). Main automatic deployments remain blocked until a separately approved future configchange; manual CLI deployments require separate authorization. All15 staging SELECTpostconditions pass before/after and identical; orderingclosed, existingcancelledorder/stock/cart/notificationstateunchanged. No sends/neworders/inventorywrites/oldverge.com requests or changes. Original localbranches and excludedlocalfiles preserved; fetched origin/main but did not switch localmain/overwriteworktree. Ignored evidence pr1-merge-result.json, merge-deployments-before/after.json, merge-staging-before/after.json. PR https://github.com/ABBI-AMIR/OLdVerge/pull/1.

2026-10-24 merged main staging deploy COMPLETE: exact d1de633 exported/allowlisted source, dpl_3xMMjSmn9E6kjSjzkMsgNAv9LX3a READY; stable https://o-ld-verge.vercel.app now points to https://o-ld-verge-o26m92iyb-abdullah-f9b8.vercel.app.8read-onlyGETcases pass on generated+stable, anonymousauthprotected. Fullinventory/orders/outboxhashes identical, orderingfalse; no neworders/sends/inventory/domainchanges. Gitautodeployblocksretained. Evidence ignored scripts/out/main-deploy-report-20261024.md. Localexcludedfilespreserved; no sourcecommit needed.
