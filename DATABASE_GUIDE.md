# HypeFanz VIP - Database Guide

## Overview

HypeFanz VIP uses **SQLite** with **Prisma ORM** for data persistence. This provides a lightweight, file-based database that's easy to set up and maintain.

## Database Setup

### Initial Setup

```bash
# Generate Prisma client
npx prisma generate

# Create/update database schema
npx prisma db push

# Seed with sample data
npm run db:seed
```

### Database File Location

The SQLite database is stored at `prisma/hypefanz.db`. This file is gitignored to prevent committing sensitive data.

## Schema Overview

### User

Stores customer and admin accounts.

```prisma
model User {
  id           String        @id @default(cuid())
  email        String        @unique
  username     String?
  passwordHash String
  role         Role          @default(USER)
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  orders       Order[]
  reservations Reservation[]
}

enum Role {
  USER
  ADMIN
}
```

### Event

Stores concert and entertainment events.

```prisma
model Event {
  id          String   @id @default(cuid())
  name        String
  date        DateTime
  venue       String
  description String?
  imageUrl    String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  suites      Suite[]
}
```

### Suite

VIP suite configurations per event.

```prisma
model Suite {
  id          String  @id @default(cuid())
  name        String
  description String?
  features    String? // JSON array of features
  basePrice   Float   @default(0) // Cost basis
  eventId     String
  event       Event   @relation(fields: [eventId], references: [id], onDelete: Cascade)
  seats       Seat[]
}
```

### Seat

Individual seats within suites.

```prisma
model Seat {
  id           String       @id @default(cuid())
  seatNumber   String
  sellingPrice Float
  status       SeatStatus   @default(AVAILABLE)
  suiteId      String
  suite        Suite        @relation(fields: [suiteId], references: [id], onDelete: Cascade)
  reservation  Reservation?
  orderItem    OrderItem?
}

enum SeatStatus {
  AVAILABLE
  RESERVED
  SOLD
}
```

### Reservation

Temporary seat holds during checkout (10-minute expiry).

```prisma
model Reservation {
  id        String   @id @default(cuid())
  seatId    String   @unique
  seat      Seat     @relation(fields: [seatId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())
}
```

### Order

Completed ticket purchases.

```prisma
model Order {
  id          String      @id @default(cuid())
  orderNumber String      @unique
  userId      String
  user        User        @relation(fields: [userId], references: [id])
  subtotal    Float
  donation    Float       @default(0)
  total       Float
  status      OrderStatus @default(COMPLETED)
  createdAt   DateTime    @default(now())
  items       OrderItem[]
}

enum OrderStatus {
  PENDING
  COMPLETED
  CANCELLED
}
```

### OrderItem

Individual tickets within an order.

```prisma
model OrderItem {
  id        String   @id @default(cuid())
  orderId   String
  order     Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  seatId    String   @unique
  seat      Seat     @relation(fields: [seatId], references: [id])
  price     Float
  eventName String
  suiteName String
  eventDate DateTime
}
```

## Common Operations

### Prisma Client Usage

```typescript
import { prisma } from '@/lib/db'

// Get all events with suites
const events = await prisma.event.findMany({
  include: { suites: { include: { seats: true } } }
})

// Create a reservation
const reservation = await prisma.reservation.create({
  data: {
    seatId: 'seat-id',
    userId: 'user-id',
    expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
  }
})

// Update seat status
await prisma.seat.update({
  where: { id: 'seat-id' },
  data: { status: 'RESERVED' }
})
```

### Clean Up Expired Reservations

```typescript
// Delete expired reservations and release seats
const expired = await prisma.reservation.findMany({
  where: { expiresAt: { lt: new Date() } }
})

for (const res of expired) {
  await prisma.$transaction([
    prisma.seat.update({
      where: { id: res.seatId },
      data: { status: 'AVAILABLE' }
    }),
    prisma.reservation.delete({
      where: { id: res.id }
    })
  ])
}
```

## Database Management

### View Database

```bash
# Open Prisma Studio (GUI)
npx prisma studio
```

### Reset Database

```bash
# Reset and re-seed
npx prisma db push --force-reset
npm run db:seed
```

### Migration (for production)

```bash
# Create migration
npx prisma migrate dev --name description

# Apply migration
npx prisma migrate deploy
```

## Seeded Data

The seed script (`prisma/seed.ts`) creates:

1. **Admin user**: `admin@hypefanz.vip` / `admin`
2. **Sample events**: 5 upcoming events at Crypto.com Arena
3. **VIP suites**: 2-3 suites per event with varying prices
4. **Seats**: 6-12 seats per suite

## Troubleshooting

### Database Locked

If you see "database is locked" errors:
1. Close Prisma Studio if open
2. Stop the dev server
3. Restart your application

### Schema Out of Sync

```bash
npx prisma db push
npx prisma generate
```

### Reset Everything

```bash
rm prisma/hypefanz.db
npx prisma db push
npm run db:seed
```

---

**Documentation by Silquetech**
