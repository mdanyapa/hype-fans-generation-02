'use client'

import { useState, useEffect } from 'react'
import { naturalSort } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { format } from 'date-fns'
import {
  Ticket,
  CalendarBlank,
  MapPin,
  Receipt,
  Crown,
} from '@phosphor-icons/react'

interface OrderItem {
  id: string
  seatId: string
  price: number
  eventName: string
  suiteName: string
  eventDate: string
  seat: {
    seatNumber: string
    suite: {
      name: string
    }
  }
}

interface Order {
  id: string
  orderNumber: string
  subtotal: number
  donation: number
  total: number
  status: string
  createdAt: string
  items: OrderItem[]
}

export default function MyTicketsPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch('/api/orders')
        if (res.ok) {
          const data = await res.json()
          setOrders(data)
        }
      } catch (error) {
        console.error('Failed to fetch orders:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrders()
  }, [])

  // Separate upcoming and past orders
  const now = new Date()
  const upcomingOrders = orders.filter((order) =>
    order.items.some((item) => new Date(item.eventDate) >= now)
  )
  const pastOrders = orders.filter(
    (order) => !order.items.some((item) => new Date(item.eventDate) >= now)
  )

  // Calculate stats
  const totalTickets = orders.reduce((sum, order) => sum + order.items.length, 0)
  const upcomingTickets = upcomingOrders.reduce(
    (sum, order) => sum + order.items.length,
    0
  )

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6 md:space-y-8 px-1 sm:px-0">
        <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 sm:h-20 md:h-24" />
          ))}
        </div>
        <Skeleton className="h-40 sm:h-52 md:h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8 px-1 sm:px-0">
      <div>
        <h1 className="text-lg sm:text-2xl md:text-3xl font-bold mb-1">My Tickets</h1>
        <p className="text-xs sm:text-sm text-gray-400">View and manage your VIP suite tickets</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-2 sm:p-4 md:p-6 flex items-center gap-2 sm:gap-3 md:gap-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-purple-600/20 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
              <Ticket className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-purple-400" weight="fill" />
            </div>
            <div className="min-w-0">
              <p className="text-sm sm:text-lg md:text-2xl font-bold">{totalTickets}</p>
              <p className="text-[10px] sm:text-xs md:text-sm text-gray-400 truncate">Total Tickets</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-2 sm:p-4 md:p-6 flex items-center gap-2 sm:gap-3 md:gap-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-green-600/20 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
              <CalendarBlank className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-green-400" weight="fill" />
            </div>
            <div className="min-w-0">
              <p className="text-sm sm:text-lg md:text-2xl font-bold">{upcomingTickets}</p>
              <p className="text-[10px] sm:text-xs md:text-sm text-gray-400 truncate">Upcoming</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-2 sm:p-4 md:p-6 flex items-center gap-2 sm:gap-3 md:gap-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-yellow-600/20 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
              <Receipt className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-yellow-400" weight="fill" />
            </div>
            <div className="min-w-0">
              <p className="text-sm sm:text-lg md:text-2xl font-bold">{orders.length}</p>
              <p className="text-[10px] sm:text-xs md:text-sm text-gray-400 truncate">Orders</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders */}
      <Tabs defaultValue="upcoming" className="space-y-3 sm:space-y-4">
        {/* Small screen tabs */}
        <TabsList className="bg-gray-800 w-full md:hidden">
          <TabsTrigger value="upcoming" className="text-[10px] sm:text-xs flex-1">
            Upcoming ({upcomingOrders.length})
          </TabsTrigger>
          <TabsTrigger value="past" className="text-[10px] sm:text-xs flex-1">
            Past ({pastOrders.length})
          </TabsTrigger>
          <TabsTrigger value="all" className="text-[10px] sm:text-xs flex-1">
            All ({orders.length})
          </TabsTrigger>
        </TabsList>
        
        {/* Large screen tabs */}
        <TabsList className="bg-gray-800 hidden md:flex">
          <TabsTrigger value="upcoming">
            Upcoming ({upcomingOrders.length})
          </TabsTrigger>
          <TabsTrigger value="past">Past ({pastOrders.length})</TabsTrigger>
          <TabsTrigger value="all">All ({orders.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-3 sm:space-y-4">
          {upcomingOrders.length === 0 ? (
            <EmptyState message="No upcoming events" />
          ) : (
            upcomingOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-3 sm:space-y-4">
          {pastOrders.length === 0 ? (
            <EmptyState message="No past events" />
          ) : (
            pastOrders.map((order) => (
              <OrderCard key={order.id} order={order} isPast />
            ))
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-3 sm:space-y-4">
          {orders.length === 0 ? (
            <EmptyState message="No orders yet" />
          ) : (
            orders.map((order) => <OrderCard key={order.id} order={order} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function OrderCard({ order, isPast }: { order: Order; isPast?: boolean }) {
  return (
    <Card
      className={`bg-gray-800/50 border-gray-700 ${
        isPast ? 'opacity-75' : ''
      }`}
    >
      <CardHeader className="p-3 sm:p-4 md:p-6 pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-white text-xs sm:text-sm md:text-lg flex items-center gap-1 sm:gap-2 min-w-0">
            <Receipt className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 text-purple-400 flex-shrink-0" />
            <span className="truncate">Order {order.orderNumber}</span>
          </CardTitle>
          <Badge
            className={`text-[10px] sm:text-xs flex-shrink-0 ${
              order.status === 'PAID'
                ? 'bg-green-600/20 text-green-400 border-green-600'
                : order.status === 'CANCELLED'
                ? 'bg-red-600/20 text-red-400 border-red-600'
                : 'bg-yellow-600/20 text-yellow-400 border-yellow-600'
            }`}
          >
            {order.status}
          </Badge>
        </div>
        <p className="text-[10px] sm:text-xs md:text-sm text-gray-400">
          {format(new Date(order.createdAt), 'MMM d, yyyy')}
        </p>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 md:p-6 pt-0 space-y-3 sm:space-y-4">
        {/* Group items by event */}
        {Object.values(
          order.items.reduce((acc, item) => {
            const key = item.eventName
            if (!acc[key]) {
              acc[key] = {
                eventName: item.eventName,
                eventDate: item.eventDate,
                items: [],
              }
            }
            acc[key].items.push(item)
            return acc
          }, {} as Record<string, { eventName: string; eventDate: string; items: OrderItem[] }>)
        ).map((group) => (
          <div
            key={group.eventName}
            className="bg-gray-700/50 rounded-lg p-2 sm:p-3 md:p-4"
          >
            <div className="flex items-start justify-between gap-2 mb-2 sm:mb-3">
              <div className="min-w-0 flex-1">
                <h4 className="font-semibold text-xs sm:text-sm md:text-base flex items-center gap-1 sm:gap-2">
                  <Crown className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-400 flex-shrink-0" weight="fill" />
                  <span className="truncate">{group.eventName}</span>
                </h4>
                <div className="flex flex-wrap items-center gap-1 sm:gap-2 md:gap-3 text-[10px] sm:text-xs md:text-sm text-gray-400 mt-0.5 sm:mt-1">
                  <span className="flex items-center gap-0.5 sm:gap-1">
                    <CalendarBlank className="h-3 w-3 sm:h-4 sm:w-4" />
                    {format(new Date(group.eventDate), 'MMM d')}
                  </span>
                  <span className="hidden sm:flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span className="truncate">Crypto.com Arena</span>
                  </span>
                </div>
              </div>
              <Badge variant="outline" className="border-purple-500 text-purple-400 text-[10px] sm:text-xs flex-shrink-0">
                {group.items.length} <span className="hidden sm:inline">ticket{group.items.length > 1 ? 's' : ''}</span>
              </Badge>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1 sm:gap-2">
              {[...group.items].sort((a, b) => naturalSort(a.seat.seatNumber, b.seat.seatNumber)).map((item) => (
                <div
                  key={item.id}
                  className="bg-gray-800 rounded-lg p-1.5 sm:p-2 md:p-3 text-center"
                >
                  <p className="text-[8px] sm:text-[10px] md:text-xs text-gray-400 truncate">{item.suiteName}</p>
                  <p className="font-semibold text-purple-400 text-[10px] sm:text-xs md:text-sm">
                    #{item.seat.seatNumber}
                  </p>
                  <p className="text-[8px] sm:text-[10px] md:text-xs text-gray-500">${item.price}</p>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Order total */}
        <div className="flex justify-between items-center pt-2 border-t border-gray-700">
          <span className="text-[10px] sm:text-xs md:text-sm text-gray-400">Order Total</span>
          <span className="text-sm sm:text-lg md:text-xl font-bold text-purple-400">
            ${order.total.toFixed(2)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardContent className="p-4 sm:p-6 md:p-8 text-center text-gray-400">
        <Ticket className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 mx-auto mb-2 sm:mb-3 md:mb-4 opacity-50" />
        <p className="text-xs sm:text-sm md:text-base">{message}</p>
        <p className="text-[10px] sm:text-xs md:text-sm mt-1 sm:mt-2">
          Browse events and get your VIP experience!
        </p>
      </CardContent>
    </Card>
  )
}
