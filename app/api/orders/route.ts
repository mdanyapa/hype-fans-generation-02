import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'
import { z } from 'zod'

// GET /api/orders - Get user's orders (or all for admin)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const all = searchParams.get('all') === 'true'

    // Admins can see all orders, regular users only see their own
    const where = session.user.role === 'ADMIN' && all ? {} : { userId: session.user.id }

    const orders = await prisma.order.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
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
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(orders)
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}

// POST /api/orders - Create order from reservations
const createOrderSchema = z.object({
  reservationIds: z.array(z.string()).min(1, 'At least one reservation is required'),
  donation: z.number().min(0).default(0),
})

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { reservationIds, donation } = createOrderSchema.parse(body)

    // Fetch reservations with seat details
    const reservations = await prisma.reservation.findMany({
      where: {
        id: { in: reservationIds },
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

    if (reservations.length !== reservationIds.length) {
      return NextResponse.json(
        { error: 'One or more reservations not found or do not belong to you' },
        { status: 400 }
      )
    }

    // Check if any reservations have expired
    const expiredReservations = reservations.filter(
      (r) => new Date(r.expiresAt) < new Date()
    )

    if (expiredReservations.length > 0) {
      // Clean up expired reservations
      await prisma.$transaction([
        prisma.reservation.deleteMany({
          where: { id: { in: expiredReservations.map((r) => r.id) } },
        }),
        prisma.seat.updateMany({
          where: { id: { in: expiredReservations.map((r) => r.seatId) } },
          data: { status: 'AVAILABLE' },
        }),
      ])

      return NextResponse.json(
        { error: 'Some reservations have expired. Please try again.' },
        { status: 400 }
      )
    }

    // Calculate totals
    const subtotal = reservations.reduce((sum, r) => sum + r.seat.sellingPrice, 0)
    const total = subtotal + donation

    // Generate order number
    const orderNumber = `HF-${Date.now()}`

    // Create order in a transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: session.user.id,
          subtotal,
          donation,
          total,
          status: 'PAID', // For now, mark as paid immediately (payment processing to be added later)
        },
      })

      // Create order items
      const orderItems = reservations.map((r) => ({
        orderId: newOrder.id,
        seatId: r.seatId,
        price: r.seat.sellingPrice,
        eventName: r.seat.suite.event.name,
        suiteName: r.seat.suite.name,
        eventDate: r.seat.suite.event.date,
      }))

      await tx.orderItem.createMany({ data: orderItems })

      // Update seat statuses to SOLD
      await tx.seat.updateMany({
        where: { id: { in: reservations.map((r) => r.seatId) } },
        data: { status: 'SOLD' },
      })

      // Delete reservations
      await tx.reservation.deleteMany({
        where: { id: { in: reservationIds } },
      })

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

    return NextResponse.json(completeOrder, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error('Error creating order:', error)
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    )
  }
}
