# Hype Fans — Generation 02 Build Gate

This repository uses `.github/workflows/generation-02-gate.yml` as the independent verification gate for Generation 02.

For pushes and pull requests to `main` or `generation-02`, GitHub Actions must run:

1. `npm ci`
2. `npx prisma generate`
3. `npx prisma validate`
4. `npx tsc --noEmit`
5. `npm run build`

A milestone may be labeled **PROGRAMMED + VERIFIED** only after the applicable gate is green and any milestone-specific tests have also passed. A source-code review alone is not a verification pass.

The workflow uses a disposable SQLite database URL and a CI-only NextAuth secret. Production secrets are never committed to source control.
