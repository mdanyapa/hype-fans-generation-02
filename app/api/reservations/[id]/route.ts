import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'

// DELETE /api/reservations/[id] - Release reservation
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Find the reservation
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: { seat: true },
    })

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    // Check if the user owns this reservation (or is admin)
    if (reservation.userId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete reservation and update seat status in a transaction
    await prisma.$transaction([
      prisma.reservation.delete({
        where: { id },
      }),
      prisma.seat.update({
        where: { id: reservation.seatId },
        data: { status: 'AVAILABLE' },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting reservation:', error)
    return NextResponse.json(
      { error: 'Failed to delete reservation' },
      { status: 500 }
    )
  }
}
