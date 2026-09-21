import { NextResponse } from 'next/server'
import { stripe, formatAmountForStripe } from '@/lib/stripe'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const guestPaymentIntentSchema = z.object({
  seatIds: z.array(z.string()).min(1, 'At least one seat is required'),
  guestInfo: z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Valid email is required'),
    phone: z.string().min(1, 'Phone number is required'),
  }),
  donation: z.number().min(0).default(0),
})

// POST /api/stripe/guest-payment-intent - Create a Stripe PaymentIntent for guest users
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { seatIds, guestInfo, donation } = guestPaymentIntentSchema.parse(body)

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

    // Check if events are still active
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

    // Create line items description
    const lineItemsDescription = seats
      .map(s => `${s.suite.event.name} - ${s.suite.name} - Seat ${s.seatNumber}`)
      .join(', ')

    // Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: formatAmountForStripe(total),
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      receipt_email: guestInfo.email,
      metadata: {
        seatIds: JSON.stringify(seatIds),
        guestFirstName: guestInfo.firstName,
        guestLastName: guestInfo.lastName,
        guestEmail: guestInfo.email,
        guestPhone: guestInfo.phone,
        donation: donation.toString(),
        type: 'guest_user',
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
    console.error('Error creating guest payment intent:', error)
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    )
  }
}
