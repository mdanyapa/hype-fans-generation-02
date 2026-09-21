import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { format } from 'date-fns'

// GET /api/events/[id]/poster - Get poster data for an event
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        suites: {
          include: {
            seats: {
              where: { status: 'AVAILABLE' },
              select: { id: true, sellingPrice: true },
            },
          },
        },
      },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Calculate availability
    const totalSeats = event.suites.reduce(
      (sum, suite) => sum + suite.seats.length,
      0
    )
    const availableSeats = event.suites.reduce(
      (sum, suite) => sum + suite.seats.length,
      0
    )

    // Calculate price range from selling prices
    const allPrices = event.suites.flatMap((suite) =>
      suite.seats.map((seat) => seat.sellingPrice)
    )
    const minPrice = allPrices.length > 0 ? Math.min(...allPrices) : 0
    const maxPrice = allPrices.length > 0 ? Math.max(...allPrices) : 0

    // Format poster data
    const posterData = {
      id: event.id,
      name: event.name,
      date: event.date,
      formattedDate: format(new Date(event.date), 'EEEE, MMMM d, yyyy'),
      formattedTime: format(new Date(event.date), 'h:mm a'),
      venue: event.venue,
      description: event.description,
      imageUrl: event.imageUrl,
      totalSuites: event.suites.length,
      availableSeats,
      priceRange: minPrice === maxPrice 
        ? `$${minPrice}` 
        : `$${minPrice} - $${maxPrice}`,
    }

    return NextResponse.json(posterData)
  } catch (error) {
    console.error('Failed to fetch poster data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch poster data' },
      { status: 500 }
    )
  }
}
