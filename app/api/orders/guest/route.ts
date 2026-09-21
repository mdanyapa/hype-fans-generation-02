import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

// POST /api/orders/guest - Create order for guest users (without auth)
const guestOrderSchema = z.object({
  seatIds: z.array(z.string()).min(1, 'At least one seat is required'),
  guestInfo: z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Valid email is required'),
    phone: z.string().min(1, 'Phone number is required'),
  }),
  donation: z.number().min(0).default(0),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { seatIds, guestInfo, donation } = guestOrderSchema.parse(body)

    // Check if all seats are available
    const seats = await prisma.seat.findMany({
      where: { id: { in: seatIds } },
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

    // Check all seats are available
    const unavailableSeats = seats.filter(seat => seat.status !== 'AVAILABLE')
    if (unavailableSeats.length > 0) {
      return NextResponse.json(
        { error: `Some seats are no longer available: ${unavailableSeats.map(s => s.seatNumber).join(', ')}` },
        { status: 400 }
      )
    }

    // Check if event is still active
    const events = [...new Set(seats.map(s => s.suite.event))]
    for (const event of events) {
      if (!event.isActive) {
        return NextResponse.json(
          { error: 'Event is no longer available' },
          { status: 400 }
        )
      }

      if (new Date(event.date) < new Date()) {
        return NextResponse.json(
          { error: 'Event has already passed' },
          { status: 400 }
        )
      }
    }

    // Calculate totals
    const subtotal = seats.reduce((sum, seat) => sum + seat.sellingPrice, 0)
    const total = subtotal + donation

    // Generate order number
    const orderNumber = `HF-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`

    // Find or create guest user based on email
    let guestUser = await prisma.user.findUnique({
      where: { email: guestInfo.email },
    })

    if (!guestUser) {
      // Create a guest user account with empty password (guest account)
      guestUser = await prisma.user.create({
        data: {
          email: guestInfo.email,
          username: `guest_${Date.now()}`,
          passwordHash: '', // Empty password for guest users
          role: 'USER',
        },
      })
    }

    // Create order in a transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create order with guest info
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: guestUser!.id,
          subtotal,
          donation,
          total,
          status: 'PAID', // Mark as paid (payment simulation)
          guestFirstName: guestInfo.firstName,
          guestLastName: guestInfo.lastName,
          guestEmail: guestInfo.email,
          guestPhone: guestInfo.phone,
        },
      })

      // Create order items for each seat
      for (const seat of seats) {
        await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            seatId: seat.id,
            price: seat.sellingPrice,
            eventName: seat.suite.event.name,
            suiteName: seat.suite.name,
            eventDate: seat.suite.event.date,
          },
        })

        // Update seat status to SOLD
        await tx.seat.update({
          where: { id: seat.id },
          data: { status: 'SOLD' },
        })
      }

      return newOrder
    })

    // Fetch the complete order with items
    const completeOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        items: {
          include: {
            seat: {
              include: {
                suite: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      order: completeOrder,
      message: 'Booking completed successfully!'
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error('Error creating guest order:', error)
    return NextResponse.json(
      { error: 'Failed to create order. Please try again.' },
      { status: 500 }
    )
  }
}
