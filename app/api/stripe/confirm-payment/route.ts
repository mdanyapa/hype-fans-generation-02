import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { stripe, isStripeConfigured } from '@/lib/stripe'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { sendTicketConfirmationEmail } from '@/lib/email'

const confirmPaymentSchema = z.object({
  paymentIntentId: z.string().min(1, 'Payment intent ID is required'),
})

// POST /api/stripe/confirm-payment - Confirm payment and create order (without webhook)
export async function POST(request: Request) {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: 'Payment system is not configured' },
        { status: 503 }
      )
    }

    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { paymentIntentId } = confirmPaymentSchema.parse(body)

    // Retrieve the payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'Payment has not been completed' },
        { status: 400 }
      )
    }

    const metadata = paymentIntent.metadata

    // Verify this payment is for the logged-in user
    if (metadata.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Payment does not belong to this user' },
        { status: 403 }
      )
    }

    // Check if order already exists for this payment
    const existingOrder = await prisma.order.findFirst({
      where: {
        orderNumber: { contains: paymentIntentId.slice(-8) }
      }
    })

    if (existingOrder) {
      return NextResponse.json({
        success: true,
        order: existingOrder,
        message: 'Order already created'
      })
    }

    const reservationIds = JSON.parse(metadata.reservationIds || '[]')
    const donation = parseFloat(metadata.donation || '0')

    // Fetch reservations
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

    if (reservations.length === 0) {
      return NextResponse.json(
        { error: 'No valid reservations found' },
        { status: 400 }
      )
    }

    // Calculate totals
    const subtotal = reservations.reduce((sum, r) => sum + r.seat.sellingPrice, 0)
    const total = subtotal + donation

    // Generate order number
    const orderNumber = `HF-${Date.now()}-${paymentIntentId.slice(-5).toUpperCase()}`

    // Create order in transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: session.user.id,
          subtotal,
          donation,
          total,
          status: 'PAID',
        },
      })

      // Create order items and update seats
      for (const reservation of reservations) {
        await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            seatId: reservation.seatId,
            price: reservation.seat.sellingPrice,
            eventName: reservation.seat.suite.event.name,
            suiteName: reservation.seat.suite.name,
            eventDate: reservation.seat.suite.event.date,
          },
        })

        // Update seat status to SOLD
        await tx.seat.update({
          where: { id: reservation.seatId },
          data: { status: 'SOLD' },
        })
      }

      // Delete reservations
      await tx.reservation.deleteMany({
        where: { id: { in: reservationIds } },
      })

      return newOrder
    })

    // Get user details for email
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, username: true }
    })

    // Send ticket confirmation email to authenticated user
    if (user?.email) {
      const seatDetails = reservations
        .map(r => `${r.seat.suite.event.name} - ${r.seat.suite.name} - Seat ${r.seat.seatNumber}`)
        .join(', ')

      // Send email in background (don't await to not block response)
      sendTicketConfirmationEmail({
        firstName: user.username || user.email.split('@')[0],
        email: user.email,
        eventName: reservations[0]?.seat.suite.event.name || 'Event',
        seatDetails,
        totalAmount: total,
        orderId: order.orderNumber,
      }).catch(err => console.error('Failed to send ticket confirmation email:', err))
    }

    return NextResponse.json({
      success: true,
      order,
      message: 'Order created successfully'
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error('Error confirming payment:', error)
    return NextResponse.json(
      { error: 'Failed to confirm payment' },
      { status: 500 }
    )
  }
}
