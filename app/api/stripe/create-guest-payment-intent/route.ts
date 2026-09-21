import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { stripe, isStripeConfigured } from '@/lib/stripe'
import { z } from 'zod'

// POST /api/stripe/create-guest-payment-intent - Create payment intent for guest users
const guestPaymentSchema = z.object({
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
    // Check if Stripe is configured
    if (!isStripeConfigured()) {
      console.error('Stripe is not configured. Please set STRIPE_SECRET_KEY in .env')
      return NextResponse.json(
        { error: 'Payment system is not configured. Please contact support.' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { seatIds, guestInfo, donation } = guestPaymentSchema.parse(body)

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

    // Create or get Stripe customer
    let stripeCustomerId: string | undefined

    // Check if guest user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: guestInfo.email },
    })

    if (existingUser) {
      // Try to find existing Stripe customer
      const customers = await stripe.customers.list({
        email: guestInfo.email,
        limit: 1,
      })
      
      if (customers.data.length > 0) {
        stripeCustomerId = customers.data[0].id
      }
    }

    if (!stripeCustomerId) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: guestInfo.email,
        name: `${guestInfo.firstName} ${guestInfo.lastName}`,
        phone: guestInfo.phone,
        metadata: {
          guest: 'true',
        },
      })
      stripeCustomerId = customer.id
    }

    // Create line items description
    const itemDescriptions = seats.map(seat => 
      `${seat.suite.event.name} - ${seat.suite.name} Seat ${seat.seatNumber}`
    ).join(', ')

    // Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100), // Convert to cents
      currency: 'usd',
      customer: stripeCustomerId,
      metadata: {
        type: 'guest_booking',
        seatIds: seatIds.join(','),
        guestFirstName: guestInfo.firstName,
        guestLastName: guestInfo.lastName,
        guestEmail: guestInfo.email,
        guestPhone: guestInfo.phone,
        donation: donation.toString(),
        eventNames: [...new Set(seats.map(s => s.suite.event.name))].join(', '),
      },
      description: `HYPEFANZ.VIP - ${itemDescriptions}`,
      receipt_email: guestInfo.email,
      automatic_payment_methods: {
        enabled: true,
      },
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      total,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error('Error creating guest payment intent:', error)
    return NextResponse.json(
      { error: 'Failed to initialize payment' },
      { status: 500 }
    )
  }
}
