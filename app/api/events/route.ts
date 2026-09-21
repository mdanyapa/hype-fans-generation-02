import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'
import { z } from 'zod'

// GET /api/events - List all events
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const includeInactive = searchParams.get('includeInactive') === 'true'

    // Clean up expired reservations first
    // await cleanupExpiredReservations()

    const events = await prisma.event.findMany({
      where: {
        ...(date && {
          date: {
            gte: new Date(date),
            lt: new Date(new Date(date).setDate(new Date(date).getDate() + 1)),
          },
        }),
        ...(!includeInactive && { isActive: true }),
      },
      include: {
        suites: {
          include: {
            seats: {
              select: {
                id: true,
                seatNumber: true,
                sellingPrice: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: { date: 'asc' },
    })

    // Transform to include availability counts
    const eventsWithAvailability = events.map((event) => ({
      ...event,
      suites: event.suites.map((suite) => {
        let features = [];
        try {
          features = JSON.parse(suite.features);
        } catch (e) {
          console.error(`Failed to parse features for suite ${suite.id}:`, suite.features);
          features = [];
        }
        return {
          ...suite,
          features,
          availableSeats: suite.seats.filter((s) => s.status === 'AVAILABLE').length,
          totalSeats: suite.seats.length,
          minPrice: suite.seats.length > 0 ? Math.min(...suite.seats.map((s) => s.sellingPrice)) : 0,
          maxPrice: suite.seats.length > 0 ? Math.max(...suite.seats.map((s) => s.sellingPrice)) : 0,
        };
      }),
    }))

    return NextResponse.json(eventsWithAvailability)
  } catch (error) {
    console.error('Error fetching events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    )
  }
}

// POST /api/events - Create event (admin only)
const createEventSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  date: z.string().transform((str) => new Date(str)),
  venue: z.string().min(1, 'Venue is required'),
  description: z.string().min(1, 'Description is required'),
  imageUrl: z.string().min(1, 'Image is required').refine(
    (val) => val.startsWith('/') || val.startsWith('http://') || val.startsWith('https://'),
    'Invalid image URL'
  ),
})

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = createEventSchema.parse(body)

    const event = await prisma.event.create({
      data,
    })

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error('Error creating event:', error)
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    )
  }
}

// Helper function to cleanup expired reservations
async function cleanupExpiredReservations() {
  const expiredReservations = await prisma.reservation.findMany({
    where: {
      expiresAt: { lt: new Date() },
    },
    select: { id: true, seatId: true },
  })

  if (expiredReservations.length > 0) {
    // Delete expired reservations and update seat status
    await prisma.$transaction([
      prisma.reservation.deleteMany({
        where: {
          id: { in: expiredReservations.map((r) => r.id) },
        },
      }),
      prisma.seat.updateMany({
        where: {
          id: { in: expiredReservations.map((r) => r.seatId) },
          status: 'RESERVED',
        },
        data: { status: 'AVAILABLE' },
      }),
    ])
  }
}
