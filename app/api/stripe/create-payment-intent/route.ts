import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { stripe, formatAmountForStripe, isStripeConfigured } from '@/lib/stripe'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const createPaymentIntentSchema = z.object({
  reservationIds: z.array(z.string()).min(1, 'At least one reservation is required'),
  donation: z.number().min(0).default(0),
})

// POST /api/stripe/create-payment-intent - Create a Stripe PaymentIntent for logged-in users
export async function POST(request: Request) {
  try {
    // Check if Stripe is configured
    if (!isStripeConfigured()) {
      console.error('Stripe is not configured. Please set STRIPE_SECRET_KEY in .env')
      return NextResponse.json(
        { error: 'Payment system is not configured. Please contact support.' },
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
    const { reservationIds, donation } = createPaymentIntentSchema.parse(body)

    // Fetch reservations with seat and event details
    const reservations = await prisma.reservation.findMany({
      where: {
        id: { in: reservationIds },
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
    })

    if (reservations.length !== reservationIds.length) {
      return NextResponse.json(
        { error: 'One or more reservations are invalid or expired' },
        { status: 400 }
      )
    }

    // Calculate totals
    const subtotal = reservations.reduce((sum, r) => sum + r.seat.sellingPrice, 0)
    const total = subtotal + donation

    // Create line items description for Stripe
    const lineItemsDescription = reservations
      .map(r => `${r.seat.suite.event.name} - ${r.seat.suite.name} - Seat ${r.seat.seatNumber}`)
      .join(', ')

    // Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: formatAmountForStripe(total),
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        userId: session.user.id,
        reservationIds: JSON.stringify(reservationIds),
        donation: donation.toString(),
        type: 'logged_in_user',
      },
      description: `HYPEFANZ.VIP Tickets: ${lineItemsDescription}`,
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: total,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error('Error creating payment intent:', error)
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    )
  }
}
