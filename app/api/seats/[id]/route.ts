import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'
import { z } from 'zod'

// GET /api/seats/[id] - Get seat details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const seat = await prisma.seat.findUnique({
      where: { id },
      include: {
        suite: {
          include: {
            event: true,
          },
        },
        reservation: true,
      },
    })

    if (!seat) {
      return NextResponse.json({ error: 'Seat not found' }, { status: 404 })
    }

    return NextResponse.json(seat)
  } catch (error) {
    console.error('Error fetching seat:', error)
    return NextResponse.json(
      { error: 'Failed to fetch seat' },
      { status: 500 }
    )
  }
}

// PATCH /api/seats/[id] - Update seat (admin only)
const updateSeatSchema = z.object({
  sellingPrice: z.number().positive().optional(),
  status: z.enum(['AVAILABLE', 'RESERVED', 'SOLD']).optional(),
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
    const data = updateSeatSchema.parse(body)

    // Don't allow changing status of sold seats
    if (data.status) {
      const currentSeat = await prisma.seat.findUnique({
        where: { id },
      })

      if (currentSeat?.status === 'SOLD' && data.status !== 'SOLD') {
        return NextResponse.json(
          { error: 'Cannot change status of sold seat' },
          { status: 400 }
        )
      }
    }

    const seat = await prisma.seat.update({
      where: { id },
      data,
    })

    return NextResponse.json(seat)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error('Error updating seat:', error)
    return NextResponse.json(
      { error: 'Failed to update seat' },
      { status: 500 }
    )
  }
}
