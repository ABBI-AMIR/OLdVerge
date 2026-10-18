# Contributing

This is a private project. The workflow below applies to everyone, including coding assistants.

## One change, one branch
1. Check where you are: `git status` and `git branch --show-current`. Keep unrelated local work out of your change.
2. Branch from `main`: `git switch -c <short-topic>`.
3. Make one focused change. No drive-by rewrites.
4. Review the diff: `git diff` and `git diff --staged`. Look for secrets (`.env`, keys, tokens, customer data), generated folders (`node_modules/`, `dist/`) and large binaries. Stage named paths (`git add path/to/file`), not `git add .` from an uncertain directory.
5. Run the checks:
   ```sh
   npm ci          # first time, or after lockfile changes
   npm run lint
   npm test
   npm run build
   ```
   For UI changes also check 390, 768 and 1440 px in a browser: no horizontal overflow, console clean, drawers and menus close with Escape.
6. Commit with a message that says what and why.
7. Push the branch and open a pull request. Once the CI workflow is active (it is prepared in `docs/ci/ci.yml`; see README), wait for it and fix failures at the cause; do not weaken a check to get green. Until then run lint, tests and build locally before pushing.

## Rules
- Never commit secrets or `.env*` files. Only `.env.example` (names, blank values) is tracked. Only public values may use the `VITE_` prefix.
- Never force-push, rewrite published history or merge your own change into a protected branch without review.
- Keep the brand and commerce rules in `CLAUDE.md`: no invented products, prices, stock or terms; no wishlist or discount codes; sample-price notice stays.
- Update `README.md`, `CLAUDE.md` and `docs/` when behaviour changes.

## Backend phase
SQL migrations, Edge Functions, RLS tests and safe examples will be version controlled when the Supabase phase is implemented. Database contents, privileged keys, private Storage files and customer exports must stay out of Git.
