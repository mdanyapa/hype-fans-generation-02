import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'
import { z } from 'zod'

// GET /api/suites/[id] - Get suite with seats
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const suite = await prisma.suite.findUnique({
      where: { id },
      include: {
        event: true,
        seats: {
          orderBy: { seatNumber: 'asc' },
        },
      },
    })

    if (!suite) {
      return NextResponse.json({ error: 'Suite not found' }, { status: 404 })
    }

    return NextResponse.json({
      ...suite,
      features: JSON.parse(suite.features),
      availableSeats: suite.seats.filter((s) => s.status === 'AVAILABLE').length,
    })
  } catch (error) {
    console.error('Error fetching suite:', error)
    return NextResponse.json(
      { error: 'Failed to fetch suite' },
      { status: 500 }
    )
  }
}

// PATCH /api/suites/[id] - Update suite (admin only)
const updateSuiteSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  features: z.array(z.string()).optional(),
  suiteCost: z.number().min(0).optional(), // Total cost we paid for the suite (internal)
  seatPrice: z.number().positive().optional(), // Update price for all AVAILABLE seats
  audienceType: z.enum(['HOME', 'VISITOR']).optional(),
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
    const { seatPrice, ...data } = updateSuiteSchema.parse(body)

    const updateData: Record<string, unknown> = { ...data }
    if (data.features) {
      updateData.features = JSON.stringify(data.features)
    }

    // Update suite and optionally update all available seat prices in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update suite details
      const suite = await tx.suite.update({
        where: { id },
        data: updateData,
      })

      // If seatPrice is provided, update all AVAILABLE seats in this suite
      if (seatPrice !== undefined) {
        await tx.seat.updateMany({
          where: {
            suiteId: id,
            status: 'AVAILABLE',
          },
          data: {
            sellingPrice: seatPrice,
          },
        })
      }

      return suite
    })

    // Fetch updated suite with seats
    const suiteWithSeats = await prisma.suite.findUnique({
      where: { id },
      include: {
        seats: {
          orderBy: { seatNumber: 'asc' },
        },
      },
    })

    return NextResponse.json({
      ...suiteWithSeats,
      features: JSON.parse(suiteWithSeats!.features),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error('Error updating suite:', error)
    return NextResponse.json(
      { error: 'Failed to update suite' },
      { status: 500 }
    )
  }
}

// DELETE /api/suites/[id] - Delete suite (admin only)
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

    // Check if suite has any sold seats
    const soldSeats = await prisma.seat.count({
      where: {
        suiteId: id,
        status: 'SOLD',
      },
    })

    if (soldSeats > 0) {
      return NextResponse.json(
        { error: 'Cannot delete suite with sold seats' },
        { status: 400 }
      )
    }

    await prisma.suite.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting suite:', error)
    return NextResponse.json(
      { error: 'Failed to delete suite' },
      { status: 500 }
    )
  }
}
