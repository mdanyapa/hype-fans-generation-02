# Hype Fans — Generation 02 Master Scope

Status vocabulary: NOT STARTED · BUILT · TESTED · PASSED

## Product North Star
**Games Bring Us Together.**

**Find Your Game. Find Your Fans. Reserve Your Place.**

Primary consumer job: open Hype Fans and reach a confirmed place to watch a desired game with the desired crowd as quickly as possible.

## Release Gate
A requirement is not DONE because code exists. It is DONE only when implementation, automated checks where appropriate, and the defined acceptance flow pass.

## Milestone 1 — Consumer Spine
| ID | Requirement | Status |
|---|---|---|
| DISC-01 | Mobile-first Discover home with prominent team/game/sport/event search | NOT STARTED |
| DISC-02 | Quick search usable without mandatory profile creation | NOT STARTED |
| DISC-03 | Personalized recommendations when profile exists | NOT STARTED |
| GAME-01 | Game/fixture result with date, local time, teams and fan-interest count | NOT STARTED |
| GAME-02 | List/Map result modes for watch locations | NOT STARTED |
| VENUE-01 | Venue card: distance, game confirmation, sound state, fan count, Hype inventory | NOT STARTED |
| VENUE-02 | Venue detail: media, amenities, crowd description, game details and inventory | NOT STARTED |
| BOOK-01 | Select party size / inventory | NOT STARTED |
| BOOK-02 | Reuse/refactor timed reservation hold engine | NOT STARTED |
| BOOK-03 | Prevent oversell/double reservation | NOT STARTED |
| PAY-01 | Checkout with explicit Hype fee + venue credit breakdown | NOT STARTED |
| CHECK-01 | Reservation confirmation with unique QR | NOT STARTED |
| CHECK-02 | Single-use check-in state transition and duplicate-scan protection | NOT STARTED |
| NAV-01 | Consumer nav: Discover · Community · Rewards · Me | NOT STARTED |

## Milestone 2 — Identity & Fan Network
| ID | Requirement | Status |
|---|---|---|
| PROF-01 | Optional onboarding: favorite teams, sports, languages, radius, watch vibe | NOT STARTED |
| PROF-02 | User profile and team-specific fan identity | NOT STARTED |
| COMM-01 | Team communities | NOT STARTED |
| COMM-02 | I'M IN attendance-intent action per game | NOT STARTED |
| COMM-03 | Aggregate fan demand by game/geography | NOT STARTED |
| COMM-04 | Community feed | NOT STARTED |
| COMM-05 | Game rooms | NOT STARTED |
| COMM-06 | Attendee/check-in gated room states | NOT STARTED |
| COMM-07 | Fan posts, comments, reactions and follows | NOT STARTED |
| DEMAND-01 | Request this game / venue demand signal | NOT STARTED |
| DEMAND-02 | Venue demand dashboard and release-more-inventory action | NOT STARTED |

## Milestone 3 — Fan Status, Credits & Rewards
| ID | Requirement | Status |
|---|---|---|
| LEVEL-01 | Rookie Fan: 0–999 lifetime Hype Points | NOT STARTED |
| LEVEL-02 | Hype Fan: 1,000–9,999 | NOT STARTED |
| LEVEL-03 | All-Star Fan: 10,000–24,999 | NOT STARTED |
| LEVEL-04 | GOAT Fan: 25,000+ | NOT STARTED |
| POINT-01 | Append-only Hype Point ledger | NOT STARTED |
| POINT-02 | Idempotent awards; no duplicate points for same qualifying action | NOT STARTED |
| CREDIT-01 | Separate spendable Hype Credit ledger | NOT STARTED |
| CREDIT-02 | Redemption transaction with atomic balance protection | NOT STARTED |
| REWARD-01 | Rewards marketplace | NOT STARTED |
| REWARD-02 | Venue credits / merchandise / tickets / premium experiences | NOT STARTED |
| REWARD-03 | Player/team experience reward class | NOT STARTED |
| REWARD-04 | Fan Spotlight redemption/application inventory | NOT STARTED |
| BADGE-01 | Team, geographic, attendance and experience badges | NOT STARTED |
| LEAD-01 | Team/community leaderboards | NOT STARTED |

## Milestone 4 — Sponsors & Venue Impact
| ID | Requirement | Status |
|---|---|---|
| SPON-01 | Sponsor campaign entity, dates, budget, creative and targeting | NOT STARTED |
| SPON-02 | Sponsored Hype Point multipliers | NOT STARTED |
| SPON-03 | Sponsored challenges | NOT STARTED |
| SPON-04 | Sponsored fan rewards / experiences | NOT STARTED |
| SPON-05 | Sponsored Fan Spotlight | NOT STARTED |
| SPON-06 | Sponsor reporting: views, joins, verified check-ins, completions, redemptions | NOT STARTED |
| IMPACT-01 | Venue Hype Impact ledger separate from fan points/credits | NOT STARTED |
| IMPACT-02 | Impact from verified venue-funded fan rewards/tickets/experiences | NOT STARTED |
| IMPACT-03 | Venue Fan Champion status/profile presentation | NOT STARTED |

## Milestone 5 — Venue Marketplace
| ID | Requirement | Status |
|---|---|---|
| DATA-01 | Sport / League / Season / Team / Fixture model | NOT STARTED |
| DATA-02 | Venue/location/geography model | NOT STARTED |
| LIST-01 | Fixture-to-venue Watch Listing | NOT STARTED |
| INV-01 | Venue Hype inventory pools | NOT STARTED |
| VENUE-10 | Venue dashboard | NOT STARTED |
| VENUE-11 | Allocate/release inventory and configure packages | NOT STARTED |
| VENUE-12 | Confirm screen/sound/game showing status | NOT STARTED |
| VENUE-13 | Check-ins, no-shows, settlement and reporting | NOT STARTED |
| PAY-10 | Marketplace payout architecture | NOT STARTED |
| LEDGER-01 | Auditable payment/credit/payout ledger | NOT STARTED |

## Milestone 6 — Suites
| ID | Requirement | Status |
|---|---|---|
| SUITE-01 | Preserve existing suite inventory/seat engine | NOT STARTED |
| SUITE-02 | Join a Suite | NOT STARTED |
| SUITE-03 | Split a Suite | NOT STARTED |
| SUITE-04 | Fill My Suite | NOT STARTED |
| SUITE-05 | Entire Suite | NOT STARTED |
| GROUPPAY-01 | Group organizer + individual payment links | NOT STARTED |

## Milestone 7 — Hype Hosts
| ID | Requirement | Status |
|---|---|---|
| HOST-01 | Approved private/rented-space host profile | NOT STARTED |
| HOST-02 | Identity/verification workflow | NOT STARTED |
| HOST-03 | Private address protection until qualifying reservation | NOT STARTED |
| HOST-04 | Host ratings and settlement | NOT STARTED |
| HOST-05 | Host/guest screening integration hook | NOT STARTED |

## Milestone 8 — Global & Play/Post Bridge
| ID | Requirement | Status |
|---|---|---|
| GLOBAL-01 | Multi-timezone fixture presentation | NOT STARTED |
| GLOBAL-02 | Multi-currency architecture | NOT STARTED |
| GLOBAL-03 | Localization/i18n | NOT STARTED |
| GLOBAL-04 | Destination/event hubs | NOT STARTED |
| PNP-01 | Portable Hype social identity / achievements interface for future Play & Post | NOT STARTED |

## Data/Infrastructure
- Preserve current working reservation/order/suite code where it is safer than rewriting.
- Refactor suite-specific concepts behind generalized marketplace interfaces incrementally.
- SQLite remains development-only during initial refactor; production target is PostgreSQL, with geospatial capability planned for nearby/radius discovery.
- Secrets never committed. `.env.example` documents required configuration.
- Monetary state must use auditable ledger semantics; points/credits must be idempotent.

## UX Rules
1. Search is the primary consumer action.
2. Progressive disclosure: do not show every platform capability on the Discover screen.
3. Consumer UI is mobile-first, visually streamlined and social-feed familiar.
4. Community/rewards/profile complexity lives in their dedicated surfaces.
5. Sponsorship should normally add value (reward, multiplier, experience), not overwhelm discovery with display ads.
6. Profile creation improves personalization but does not block basic discovery.

## Test Gate
Before a milestone can be marked PASSED:
- TypeScript/build succeeds.
- Lint/static checks succeed or all exceptions are documented.
- Database migrations are reproducible.
- Core happy path is manually verified.
- Relevant failure/edge cases are tested.
- Payment/inventory/credits paths include duplicate/idempotency tests.
- No regression of preserved suite functionality without an explicit approved replacement.

## M1B Booking Architecture Correction — 2026-09-21
- **BOOK-01 — PASSED (code review):** Default game discovery routes fans to commercial watch venues.
- **BOOK-02 — BUILT:** `Watch at a Venue` and `Suites & VIP` are separate experience branches.
- **BOOK-03 — BUILT:** Venue inventory uses Hype Seat, Table Spot, Bar Seat, and Hype Zone concepts; arena maps are excluded.
- **BOOK-04 — BUILT:** Arena/suite inventory is accessible only from the explicit `Suites & VIP` branch.
- **BOOK-05 — NEXT:** Connect venue inventory and suite inventory to persistent Prisma models and reservation APIs.
