import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/db'
import Stripe from 'stripe'

// Disable body parsing, we need raw body for webhook signature verification
export const config = {
  api: {
    bodyParser: false,
  },
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const metadata = paymentIntent.metadata
  const type = metadata.type

  if (type === 'logged_in_user') {
    // Handle logged-in user payment
    const userId = metadata.userId
    const reservationIds = JSON.parse(metadata.reservationIds || '[]')
    const donation = parseFloat(metadata.donation || '0')

    // Fetch reservations
    const reservations = await prisma.reservation.findMany({
      where: {
        id: { in: reservationIds },
        userId: userId,
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
      console.error('No valid reservations found for payment:', paymentIntent.id)
      return
    }

    // Calculate totals
    const subtotal = reservations.reduce((sum, r) => sum + r.seat.sellingPrice, 0)
    const total = subtotal + donation

    // Generate order number
    const orderNumber = `HF-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`

    // Create order in transaction
    await prisma.$transaction(async (tx) => {
      // Create order
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId,
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
            orderId: order.id,
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

      return order
    })

    console.log('Order created successfully for payment:', paymentIntent.id)
  } else if (type === 'guest_booking') {
    // Handle guest user payment
    const seatIds = metadata.seatIds?.split(',') || []
    const guestInfo = {
      firstName: metadata.guestFirstName,
      lastName: metadata.guestLastName,
      email: metadata.guestEmail,
      phone: metadata.guestPhone,
    }
    const donation = parseFloat(metadata.donation || '0')

    // Fetch seats
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

    if (seats.length === 0) {
      console.error('No valid seats found for guest payment:', paymentIntent.id)
      return
    }

    // Calculate totals
    const subtotal = seats.reduce((sum, seat) => sum + seat.sellingPrice, 0)
    const total = subtotal + donation

    // Generate order number
    const orderNumber = `HF-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`

    // Find or create guest user
    let guestUser = await prisma.user.findUnique({
      where: { email: guestInfo.email },
    })

    if (!guestUser) {
      guestUser = await prisma.user.create({
        data: {
          email: guestInfo.email!,
          username: `guest_${Date.now()}`,
          passwordHash: '',
          role: 'USER',
        },
      })
    }

    // Create order in transaction
    await prisma.$transaction(async (tx) => {
      // Create order with guest info
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId: guestUser!.id,
          subtotal,
          donation,
          total,
          status: 'PAID',
          guestFirstName: guestInfo.firstName,
          guestLastName: guestInfo.lastName,
          guestEmail: guestInfo.email,
          guestPhone: guestInfo.phone,
        },
      })

      // Create order items and update seats
      for (const seat of seats) {
        await tx.orderItem.create({
          data: {
            orderId: order.id,
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

      return order
    })

    console.log('Guest order created successfully for payment:', paymentIntent.id)
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment failed:', paymentIntent.id, paymentIntent.last_payment_error?.message)
  // You could send notification emails here
}

export async function POST(request: Request) {
  try {
    const body = await request.text()
    const headersList = await headers()
    const signature = headersList.get('stripe-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      )
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET is not set')
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      )
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent)
        break

      case 'payment_intent.processing':
        console.log('Payment processing:', (event.data.object as Stripe.PaymentIntent).id)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
