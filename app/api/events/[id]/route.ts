import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'
import { z } from 'zod'

// GET /api/events/[id] - Get single event with suites and seats
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Clean up expired reservations first
    await cleanupExpiredReservations()

    const event = await prisma.event.findUnique({
      where: { id },
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
              orderBy: { seatNumber: 'asc' },
            },
          },
          orderBy: { name: 'asc' },
        },
      },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Transform to include availability and parsed features
    const eventWithAvailability = {
      ...event,
      suites: event.suites.map((suite) => ({
        ...suite,
        features: JSON.parse(suite.features),
        availableSeats: suite.seats.filter((s) => s.status === 'AVAILABLE').length,
        totalSeats: suite.seats.length,
        seats: suite.seats,
      })),
    }

    return NextResponse.json(eventWithAvailability)
  } catch (error) {
    console.error('Error fetching event:', error)
    return NextResponse.json(
      { error: 'Failed to fetch event' },
      { status: 500 }
    )
  }
}

// PATCH /api/events/[id] - Update event (admin only)
const updateEventSchema = z.object({
  name: z.string().min(1).optional(),
  date: z.string().transform((str) => new Date(str)).optional(),
  venue: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  imageUrl: z.string().refine(
    (val) => val.startsWith('/') || val.startsWith('http://') || val.startsWith('https://'),
    'Invalid image URL'
  ).optional(),
  isActive: z.boolean().optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const data = updateEventSchema.parse(body)

    const event = await prisma.event.update({
      where: { id },
      data,
    })

    return NextResponse.json(event)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error('Error updating event:', error)
    return NextResponse.json(
      { error: 'Failed to update event' },
      { status: 500 }
    )
  }
}

// DELETE /api/events/[id] - Delete event (admin only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check if event has any sold seats
    const soldSeats = await prisma.seat.count({
      where: {
        suite: { eventId: id },
        status: 'SOLD',
      },
    })

    if (soldSeats > 0) {
      return NextResponse.json(
        { error: 'Cannot delete event with sold tickets' },
        { status: 400 }
      )
    }

    await prisma.event.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting event:', error)
    return NextResponse.json(
      { error: 'Failed to delete event' },
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
