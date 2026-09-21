import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'
import { z } from 'zod'

// POST /api/suites - Create suite with seats (admin only)
const createSuiteSchema = z.object({
  eventId: z.string().min(1, 'Event ID is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  features: z.array(z.string()),
  suiteCost: z.number().min(0, 'Suite cost must be 0 or greater'), // Total cost we paid for the suite (internal)
  seatCount: z.number().int().positive('Seat count must be positive'),
  seatPrice: z.number().positive('Seat price must be positive'),
  audienceType: z.enum(['HOME', 'VISITOR']).default('HOME'),
})

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { eventId, name, description, features, suiteCost, seatCount, seatPrice, audienceType } =
      createSuiteSchema.parse(body)

    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check if suite name already exists for this event
    const existingSuite = await prisma.suite.findUnique({
      where: {
        eventId_name: { eventId, name },
      },
    })

    if (existingSuite) {
      return NextResponse.json(
        { error: 'Suite with this name already exists for this event' },
        { status: 400 }
      )
    }

    // Create suite with seats in a transaction
    const suite = await prisma.$transaction(async (tx) => {
      const newSuite = await tx.suite.create({
        data: {
          eventId,
          name,
          description: description || null,
          features: JSON.stringify(features),
          suiteCost,
          audienceType,
        },
      })

      // Create seats
      const suitePrefix = name.split(' ').pop() || 'S' // Get "A" from "VIP SUITE A"
      const seats = []
      for (let i = 1; i <= seatCount; i++) {
        seats.push({
          suiteId: newSuite.id,
          seatNumber: `${suitePrefix}${i}`,
          sellingPrice: seatPrice,
          status: 'AVAILABLE',
        })
      }

      await tx.seat.createMany({ data: seats })

      return newSuite
    })

    // Fetch the created suite with seats
    const suiteWithSeats = await prisma.suite.findUnique({
      where: { id: suite.id },
      include: {
        seats: true,
      },
    })

    return NextResponse.json(
      {
        ...suiteWithSeats,
        features: JSON.parse(suiteWithSeats!.features),
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error('Error creating suite:', error)
    return NextResponse.json(
      { error: 'Failed to create suite' },
      { status: 500 }
    )
  }
}
