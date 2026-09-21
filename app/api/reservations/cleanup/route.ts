import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// POST /api/reservations/cleanup - Cleanup expired reservations
export async function POST() {
  try {
    const expiredReservations = await prisma.reservation.findMany({
      where: {
        expiresAt: { lt: new Date() },
      },
      select: { id: true, seatId: true },
    })

    if (expiredReservations.length === 0) {
      return NextResponse.json({ released: 0 })
    }

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

    return NextResponse.json({ released: expiredReservations.length })
  } catch (error) {
    console.error('Error cleaning up reservations:', error)
    return NextResponse.json(
      { error: 'Failed to cleanup reservations' },
      { status: 500 }
    )
  }
}
