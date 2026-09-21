import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'

// GET /api/admin/stats - Get admin dashboard statistics
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all paid orders
    const orders = await prisma.order.findMany({
      where: { status: 'PAID' },
      include: {
        items: true,
      },
    })

    // Calculate statistics
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0)
    const totalTicketsSold = orders.reduce((sum, order) => sum + order.items.length, 0)
    const totalOrders = orders.length

    // Get user count
    const totalUsers = await prisma.user.count()
    const adminUsers = await prisma.user.count({ where: { role: 'ADMIN' } })

    // Get revenue by event
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: { status: 'PAID' },
      },
      select: {
        eventName: true,
        price: true,
      },
    })

    const revenueByEvent: Record<string, { revenue: number; ticketsSold: number }> = {}
    for (const item of orderItems) {
      if (!revenueByEvent[item.eventName]) {
        revenueByEvent[item.eventName] = { revenue: 0, ticketsSold: 0 }
      }
      revenueByEvent[item.eventName].revenue += item.price
      revenueByEvent[item.eventName].ticketsSold += 1
    }

    const eventStats = Object.entries(revenueByEvent).map(([eventName, stats]) => ({
      eventName,
      ...stats,
    }))

    // Get inventory stats
    const seatCounts = await prisma.seat.groupBy({
      by: ['status'],
      _count: { id: true },
    })

    const inventory = {
      available: seatCounts.find((s) => s.status === 'AVAILABLE')?._count.id || 0,
      reserved: seatCounts.find((s) => s.status === 'RESERVED')?._count.id || 0,
      sold: seatCounts.find((s) => s.status === 'SOLD')?._count.id || 0,
    }

    // Get upcoming events count
    const upcomingEventsCount = await prisma.event.count({
      where: {
        date: { gte: new Date() },
        isActive: true,
      },
    })

    return NextResponse.json({
      totalRevenue,
      totalTicketsSold,
      totalOrders,
      totalUsers,
      adminUsers,
      inventory,
      upcomingEventsCount,
      revenueByEvent: eventStats,
    })
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}
