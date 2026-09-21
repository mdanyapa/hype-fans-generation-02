# HypeFanz VIP

A premium VIP event ticketing platform built by **Silquetech** that connects fans with exclusive concert and entertainment experiences through a dynamic marketplace.

## Overview

HypeFanz VIP acquires entire VIP suites from Crypto.com Arena and breaks them down into individual seats for sale. This allows customers to experience VIP suite amenities without purchasing an entire suite.

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: SQLite with Prisma ORM
- **Authentication**: NextAuth.js with credentials provider

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Initialize the database
npx prisma generate
npx prisma db push

# Seed the database with sample data
npm run db:seed

# Start the development server
npm run dev
```

### Default Admin Account

After seeding, you can log in with:
- Email: `admin@hypefanz.vip`
- Password: `admin`

## Features

### Customer Portal
- Browse upcoming events
- View event details and VIP suite options
- Select and reserve seats (10-minute hold)
- Checkout and purchase tickets
- View purchased tickets and order history
- Manage profile and change password

### Admin Portal
- Dashboard with sales analytics
- Create and manage events
- Configure VIP suites and seat pricing
- User management and role promotion
- Inventory overview

## Project Structure

```
├── app/
│   ├── api/              # API routes
│   ├── (main)/           # Authenticated user pages
│   └── (admin)/          # Admin-only pages
├── components/
│   └── ui/               # shadcn/ui components
├── lib/                  # Utilities and helpers
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── seed.ts           # Database seeding
└── types/                # TypeScript type definitions
```

## Database Models

- **User**: Customer and admin accounts
- **Event**: Concert and entertainment events
- **Suite**: VIP suite configurations per event
- **Seat**: Individual seats within suites
- **Reservation**: Temporary seat holds during checkout
- **Order**: Completed purchases
- **OrderItem**: Individual tickets within orders

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/[...nextauth]` - NextAuth.js endpoints

### Events
- `GET /api/events` - List events
- `POST /api/events` - Create event (admin)
- `GET /api/events/[id]` - Get event details
- `PATCH /api/events/[id]` - Update event (admin)
- `DELETE /api/events/[id]` - Delete event (admin)

### Suites & Seats
- `POST /api/suites` - Create suite (admin)
- `PATCH /api/seats/[id]` - Update seat

### Reservations
- `POST /api/reservations` - Create reservation
- `DELETE /api/reservations/[id]` - Cancel reservation
- `POST /api/reservations/cleanup` - Clean expired reservations

### Orders
- `GET /api/orders` - List user orders
- `POST /api/orders` - Create order from reservations

### Admin
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/users` - List users (admin)
- `PATCH /api/users/[id]` - Update user role (admin)

## Environment Variables

```env
DATABASE_URL="file:./prisma/hypefanz.db"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

## License

Proprietary - Silquetech

---

Built with care by **Silquetech**
