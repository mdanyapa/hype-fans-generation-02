# Hype Fans Generation 02 — Build & Handoff

This repository is developed from the existing HypeFanz VIP application, not from a blank project.

## Safe deployment rule
Do not replace the live application directly. Deploy Generation 02 to staging first, run the release checklist, then promote the tested commit/build to production.

## Local setup
1. Install the current Node.js LTS release compatible with Next.js 15.
2. Copy `.env.example` to `.env.local` and fill only your own secrets/credentials.
3. Run `npm install` (use the existing lockfile).
4. Run `npx prisma generate`.
5. Apply the documented development database setup/migrations.
6. Run `npm run dev` and open the local URL printed by Next.js.

## Validation commands
Run these before handoff/deployment:
- `npx tsc --noEmit`
- project lint/static check
- `npm run build`
- milestone-specific automated tests

## Production handoff
Generation 02 will be delivered as a complete source repository/ZIP. It is not intended to be installed by copying isolated ChatGPT snippets. The final deployment guide will be adapted to the actual hosting/repository provider after that environment is identified.

## Never commit
- Stripe secret keys
- NextAuth secret
- SMTP passwords
- production database credentials
- provider API secrets
