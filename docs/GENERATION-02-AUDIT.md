# Generation 02 Initial Code Audit

## Existing foundation confirmed
- Next.js 15 + React 18 + TypeScript
- Tailwind/shadcn UI stack
- NextAuth credential authentication
- Prisma 5 + SQLite
- Stripe client/server packages
- QR code library
- Existing Event → Suite → Seat → Reservation → Order transaction model
- Timed reservation expiration logic
- Existing calendar, checkout, ticket/profile/admin surfaces

## First refactor principle
Do not rewrite the working suite transaction engine first. Introduce the new consumer shell and generalized sports/venue domain alongside it, then migrate transaction flows behind tested interfaces.

## Immediate technical debt discovered
- Root landing page is still a Lakers game-day suite/donation poster rather than the Generation 02 consumer discovery experience.
- Main authenticated navigation is suite-era Events / My Tickets / Profile, not Discover / Community / Rewards / Me.
- Database is suite-centric and lacks Sport/League/Team/Fixture/Venue/WatchListing/Rewards/Community models.
- SQLite datasource is not the intended production database for the scaled marketplace.
