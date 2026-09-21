import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const RESERVATION_DURATION_MINUTES = 10 // 10 minutes hold time

// GET /api/reservations - Get user's active reservations
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // First cleanup expired reservations
    await cleanupExpiredReservations()

    const reservations = await prisma.reservation.findMany({
      where: {
        userId: session.user.id,
        expiresAt: { gt: new Date() },
      },
      include: {
        seat: {
          include: {
            suite: {
              include: {
                event: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Transform to include suite features
    const transformedReservations = reservations.map((r) => ({
      ...r,
      seat: {
        ...r.seat,
        suite: {
          ...r.seat.suite,
          features: JSON.parse(r.seat.suite.features),
        },
      },
    }))

    return NextResponse.json(transformedReservations)
  } catch (error) {
    console.error('Error fetching reservations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reservations' },
      { status: 500 }
    )
  }
}

// POST /api/reservations - Reserve seat(s)
const createReservationSchema = z.object({
  seatIds: z.array(z.string()).min(1, 'At least one seat is required'),
})

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { seatIds } = createReservationSchema.parse(body)

    // First cleanup expired reservations
    await cleanupExpiredReservations()

    // Check if all seats are available
    const seats = await prisma.seat.findMany({
      where: {
        id: { in: seatIds },
      },
      include: {
        suite: {
          include: {
            event: true,
          },
        },
      },
    })

    if (seats.length !== seatIds.length) {
      return NextResponse.json(
        { error: 'One or more seats not found' },
        { status: 404 }
      )
    }

    const unavailableSeats = seats.filter((s) => s.status !== 'AVAILABLE')
    if (unavailableSeats.length > 0) {
      return NextResponse.json(
        {
          error: 'One or more seats are not available',
          unavailableSeats: unavailableSeats.map((s) => ({
            id: s.id,
            seatNumber: s.seatNumber,
            status: s.status,
          })),
        },
        { status: 400 }
      )
    }

    // Check if event is still active and in the future
    const events = [...new Set(seats.map((s) => s.suite.event))]
    for (const event of events) {
      if (!event.isActive) {
        return NextResponse.json(
          { error: `Event "${event.name}" is no longer available` },
          { status: 400 }
        )
      }
      if (new Date(event.date) < new Date()) {
        return NextResponse.json(
          { error: `Event "${event.name}" has already passed` },
          { status: 400 }
        )
      }
    }

    // Create reservations in a transaction
    const expiresAt = new Date(Date.now() + RESERVATION_DURATION_MINUTES * 60 * 1000)

    const reservations = await prisma.$transaction(async (tx) => {
      // Update seat statuses
      await tx.seat.updateMany({
        where: { id: { in: seatIds } },
        data: { status: 'RESERVED' },
      })

      // Create reservation records
      const reservationData = seatIds.map((seatId) => ({
        seatId,
        userId: session.user.id,
        expiresAt,
      }))

      await tx.reservation.createMany({ data: reservationData })

      // Fetch created reservations with seat details
      return tx.reservation.findMany({
        where: {
          seatId: { in: seatIds },
          userId: session.user.id,
        },
        include: {
          seat: {
            include: {
              suite: {
                include: {
                  event: true,
                },
              },
            },
          },
        },
      })
    })

    // Transform to include suite features
    const transformedReservations = reservations.map((r) => ({
      ...r,
      seat: {
        ...r.seat,
        suite: {
          ...r.seat.suite,
          features: JSON.parse(r.seat.suite.features),
        },
      },
    }))

    return NextResponse.json(transformedReservations, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error('Error creating reservation:', error)
    return NextResponse.json(
      { error: 'Failed to create reservation' },
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
