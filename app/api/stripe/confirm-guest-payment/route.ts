import { NextResponse } from 'next/server'
import { stripe, isStripeConfigured } from '@/lib/stripe'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { generateStrongPassword, sendWelcomeEmail, sendTicketConfirmationEmail } from '@/lib/email'

const confirmGuestPaymentSchema = z.object({
  paymentIntentId: z.string().min(1, 'Payment intent ID is required'),
})

// POST /api/stripe/confirm-guest-payment - Confirm guest payment and create order (without webhook)
export async function POST(request: Request) {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: 'Payment system is not configured' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { paymentIntentId } = confirmGuestPaymentSchema.parse(body)

    // Retrieve the payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'Payment has not been completed' },
        { status: 400 }
      )
    }

    const metadata = paymentIntent.metadata

    // Verify this is a guest booking
    if (metadata.type !== 'guest_booking') {
      return NextResponse.json(
        { error: 'Invalid payment type' },
        { status: 400 }
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
      return NextResponse.json(
        { error: 'No valid seats found' },
        { status: 400 }
      )
    }

    // Calculate totals
    const subtotal = seats.reduce((sum, seat) => sum + seat.sellingPrice, 0)
    const total = subtotal + donation

    // Generate order number
    const orderNumber = `HF-${Date.now()}-${paymentIntentId.slice(-5).toUpperCase()}`

    // Find or create guest user
    let guestUser = await prisma.user.findUnique({
      where: { email: guestInfo.email },
    })

    let generatedPassword: string | null = null
    let isNewUser = false

    if (!guestUser) {
      // Generate strong password for new guest user
      generatedPassword = generateStrongPassword(14)
      const hashedPassword = await bcrypt.hash(generatedPassword, 12)

      guestUser = await prisma.user.create({
        data: {
          email: guestInfo.email!,
          username: `${guestInfo.firstName?.toLowerCase()}_${Date.now()}`,
          passwordHash: hashedPassword,
          role: 'USER',
        },
      })
      isNewUser = true
    }

    // Create order in transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create order with guest info
      const newOrder = await tx.order.create({
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

    // Send welcome email with credentials to new users
    if (isNewUser && generatedPassword) {
      const eventNames = [...new Set(seats.map(s => s.suite.event.name))].join(', ')
      const seatDetails = seats.map(s => `${s.suite.name} - Seat ${s.seatNumber}`).join(', ')

      console.log('Sending welcome email to new user:', guestInfo.email)
      
      // Send email asynchronously (don't wait for it)
      sendWelcomeEmail({
        firstName: guestInfo.firstName!,
        lastName: guestInfo.lastName!,
        email: guestInfo.email!,
        password: generatedPassword,
        eventName: eventNames,
        seatDetails,
        totalAmount: total,
        orderId: orderNumber,
      }).then(success => {
        if (success) {
          console.log('Welcome email sent successfully to:', guestInfo.email)
        } else {
          console.error('Welcome email failed for:', guestInfo.email)
        }
      }).catch(err => console.error('Failed to send welcome email:', err))
    } else if (!isNewUser) {
      // Existing user - send ticket confirmation email (without password)
      const eventNames = [...new Set(seats.map(s => s.suite.event.name))].join(', ')
      const seatDetails = seats.map(s => `${s.suite.name} - Seat ${s.seatNumber}`).join(', ')

      console.log('Sending ticket confirmation email to existing user:', guestInfo.email)
      
      sendTicketConfirmationEmail({
        firstName: guestInfo.firstName!,
        email: guestInfo.email!,
        eventName: eventNames,
        seatDetails,
        totalAmount: total,
        orderId: orderNumber,
      }).then(success => {
        if (success) {
          console.log('Ticket confirmation email sent successfully to:', guestInfo.email)
        } else {
          console.error('Ticket confirmation email failed for:', guestInfo.email)
        }
      }).catch(err => console.error('Failed to send ticket confirmation email:', err))
    }

    return NextResponse.json({
      success: true,
      order,
      message: isNewUser 
        ? 'Order created successfully. Check your email for login credentials!' 
        : 'Order created successfully'
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error('Error confirming guest payment:', error)
    return NextResponse.json(
      { error: 'Failed to confirm payment' },
      { status: 500 }
    )
  }
}
