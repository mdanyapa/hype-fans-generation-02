'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import NextImage from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import defaultLogo from '@/assets/logo.png'
import {
  CurrencyDollar,
  Ticket,
  Users,
  Calendar,
  Package,
  Plus,
  Crown,
  ArrowUp,
  Image,
  Eye,
  Pencil,
  Trash,
} from '@phosphor-icons/react'
import { format } from 'date-fns'

interface Stats {
  totalRevenue: number
  totalTicketsSold: number
  totalOrders: number
  totalUsers: number
  adminUsers: number
  inventory: {
    available: number
    reserved: number
    sold: number
  }
  upcomingEventsCount: number
  revenueByEvent: {
    eventName: string
    revenue: number
    ticketsSold: number
  }[]
}

interface Event {
  id: string
  name: string
  date: string
  venue: string
  imageUrl: string
  isActive: boolean
  suites: {
    availableSeats: number
    totalSeats: number
  }[]
}

interface User {
  id: string
  email: string
  username: string | null
  role: string
  createdAt: string
  _count: {
    orders: number
  }
}

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === 'authenticated' && session?.user.role !== 'ADMIN') {
      toast.error('Access denied. Admins only.')
      router.push('/calendar')
    }
  }, [session, status, router])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, usersRes, eventsRes] = await Promise.all([
          fetch('/api/admin/stats'),
          fetch('/api/users'),
          fetch('/api/events?includeInactive=true'),
        ])

        if (statsRes.ok) {
          setStats(await statsRes.json())
        }
        if (usersRes.ok) {
          setUsers(await usersRes.json())
        }
        if (eventsRes.ok) {
          setEvents(await eventsRes.json())
        }
      } catch (error) {
        console.error('Failed to fetch admin data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (session?.user.role === 'ADMIN') {
      fetchData()
    }
  }, [session])

  const handlePromoteUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'ADMIN' }),
      })

      if (res.ok) {
        toast.success('User promoted to admin')
        // Refresh users
        const usersRes = await fetch('/api/users')
        if (usersRes.ok) {
          setUsers(await usersRes.json())
        }
      } else {
        toast.error('Failed to promote user')
      }
    } catch {
      toast.error('Failed to promote user')
    }
  }

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/events?includeInactive=true')
      if (res.ok) {
        setEvents(await res.json())
      }
    } catch (error) {
      console.error('Failed to fetch events:', error)
    }
  }

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteEvent = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/events/${deleteId}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to delete event')
        setIsDeleting(false)
        return
      }
      toast.success('Event deleted')
      setDeleteId(null)
      fetchEvents()
    } catch {
      toast.error('Failed to delete event')
    }
    setIsDeleting(false)
  }

  const handleToggleActive = async (eventId: string, currentlyActive: boolean) => {
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentlyActive }),
      })

      if (res.ok) {
        toast.success(currentlyActive ? 'Event deactivated' : 'Event activated')
        fetchEvents()
      } else {
        toast.error('Failed to update event')
      }
    } catch {
      toast.error('Failed to update event')
    }
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6 md:space-y-8 px-2 sm:px-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 sm:h-20 md:h-24 lg:h-32" />
          ))}
        </div>
        <Skeleton className="h-24 sm:h-32 md:h-40 lg:h-64" />
        <Skeleton className="h-8 sm:h-10 w-full max-w-xs" />
        <Skeleton className="h-40 sm:h-48 md:h-56 lg:h-64" />
      </div>
    )
  }

  if (!session || session.user.role !== 'ADMIN') {
    return null
  }

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8 px-2 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 flex items-center gap-2">
            <Crown className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-yellow-400" weight="fill" />
            Admin Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">Manage events, users, and view analytics</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Link href="/admin/events" className="flex-1 sm:flex-none">
            <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700 gap-2 text-xs sm:text-sm h-8 sm:h-9 md:h-10 w-full">
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Manage Events</span>
              <span className="sm:hidden">Events</span>
            </Button>
          </Link>
          <Link href="/admin/events/new" className="flex-1 sm:flex-none">
            <Button className="bg-purple-600 hover:bg-purple-700 gap-2 text-xs sm:text-sm h-8 sm:h-9 md:h-10 w-full">
              <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Create Event</span>
              <span className="sm:hidden">Create</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        <StatCard
          title="Total Revenue"
          value={`$${stats?.totalRevenue.toFixed(2) || '0.00'}`}
          icon={CurrencyDollar}
          color="green"
        />
        <StatCard
          title="Tickets Sold"
          value={stats?.totalTicketsSold.toString() || '0'}
          icon={Ticket}
          color="purple"
        />
        <StatCard
          title="Total Orders"
          value={stats?.totalOrders.toString() || '0'}
          icon={Package}
          color="blue"
        />
        <StatCard
          title="Registered Users"
          value={stats?.totalUsers.toString() || '0'}
          icon={Users}
          color="yellow"
        />
      </div>

      {/* Inventory Summary */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <CardTitle className="text-white text-sm sm:text-base md:text-lg">Inventory Overview</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
          <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4 text-center">
            <div className="bg-green-600/10 rounded-lg p-2 sm:p-3 md:p-4">
              <p className="text-lg sm:text-xl md:text-3xl font-bold text-green-400">
                {stats?.inventory.available || 0}
              </p>
              <p className="text-[10px] sm:text-xs md:text-sm text-gray-400">Available</p>
            </div>
            <div className="bg-yellow-600/10 rounded-lg p-2 sm:p-3 md:p-4">
              <p className="text-lg sm:text-xl md:text-3xl font-bold text-yellow-400">
                {stats?.inventory.reserved || 0}
              </p>
              <p className="text-[10px] sm:text-xs md:text-sm text-gray-400">Reserved</p>
            </div>
            <div className="bg-purple-600/10 rounded-lg p-2 sm:p-3 md:p-4">
              <p className="text-lg sm:text-xl md:text-3xl font-bold text-purple-400">
                {stats?.inventory.sold || 0}
              </p>
              <p className="text-[10px] sm:text-xs md:text-sm text-gray-400">Sold</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="events" className="space-y-4">
        {/* Small screen tabs - hidden on md and above */}
        <TabsList className="bg-gray-800 w-full md:hidden">
          <TabsTrigger value="events" className="text-[10px] sm:text-xs flex-1">Events</TabsTrigger>
          <TabsTrigger value="revenue" className="text-[10px] sm:text-xs flex-1">Revenue</TabsTrigger>
          <TabsTrigger value="users" className="text-[10px] sm:text-xs flex-1">Users</TabsTrigger>
        </TabsList>
        
        {/* Large screen tabs - hidden below md */}
        <TabsList className="bg-gray-800 hidden md:flex">
          <TabsTrigger value="events">Events & Posters</TabsTrigger>
          <TabsTrigger value="revenue">Revenue by Event</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
        </TabsList>

        <TabsContent value="events">
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-purple-400" />
                  All Events
                </span>
                <Badge variant="outline" className="border-gray-600">
                  {events.length} events
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="text-center text-gray-400 py-8">
                  No events created yet
                </p>
              ) : (
                <div className="space-y-3">
                  {events.map((event) => {
                    const totalSeats = event.suites?.reduce((sum, s) => sum + s.totalSeats, 0) || 0
                    const availableSeats = event.suites?.reduce((sum, s) => sum + s.availableSeats, 0) || 0
                    const soldSeats = totalSeats - availableSeats

                    return (
                      <div
                        key={event.id}
                        className={`flex items-center justify-between p-3 sm:p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700/70 transition-colors ${!event.isActive ? 'opacity-60' : ''}`}
                      >
                        <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-900/50 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                            {event.imageUrl ? (
                              <img src={event.imageUrl} alt={event.name} className="w-full h-full object-cover" />
                            ) : (
                              <NextImage src={defaultLogo} alt="HYPEFANZ.VIP" className="h-6 w-auto opacity-70" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-white text-sm sm:text-base truncate">{event.name}</p>
                            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-400">
                              <span>{format(new Date(event.date), 'MMM d')}</span>
                              <span>•</span>
                              <span className="truncate">{event.venue}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                          {!event.isActive && (
                            <Badge variant="outline" className="border-red-500 text-red-400 text-xs hidden sm:flex">
                              Inactive
                            </Badge>
                          )}
                          <Link href={`/event/${event.id}/poster`}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 sm:gap-2 border-purple-500 text-purple-400 hover:bg-purple-600/10 h-8 px-2 sm:px-3"
                            >
                              <Image className="h-4 w-4" />
                              <span className="hidden md:inline">Poster</span>
                            </Button>
                          </Link>
                          <Link href={`/event/${event.id}`}>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="View">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/admin/events/${event.id}/edit`}>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Edit">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="ghost"
                            className={`h-8 text-xs ${
                              event.isActive
                                ? 'text-yellow-400 hover:text-yellow-300'
                                : 'text-green-400 hover:text-green-300'
                            }`}
                            onClick={() => handleToggleActive(event.id, event.isActive)}
                          >
                            <span className="hidden sm:inline">{event.isActive ? 'Deactivate' : 'Activate'}</span>
                            <span className="sm:hidden">{event.isActive ? 'Off' : 'On'}</span>
                          </Button>
                          {soldSeats === 0 && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                                  title="Delete"
                                  onClick={() => setDeleteId(event.id)}
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Event?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this event? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel onClick={() => setDeleteId(null)} disabled={isDeleting}>
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction onClick={handleDeleteEvent} disabled={isDeleting}>
                                    {isDeleting ? 'Deleting...' : 'Delete'}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue">
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Revenue by Event</CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.revenueByEvent.length === 0 ? (
                <p className="text-center text-gray-400 py-8">
                  No sales data yet
                </p>
              ) : (
                <div className="space-y-4">
                  {stats?.revenueByEvent.map((event, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 sm:p-4 bg-gray-700/50 rounded-lg"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm sm:text-base truncate">{event.eventName}</p>
                        <p className="text-xs sm:text-sm text-gray-400">
                          {event.ticketsSold} tickets sold
                        </p>
                      </div>
                      <span className="text-lg sm:text-xl font-bold text-green-400 flex-shrink-0">
                        ${event.revenue.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <span>User Management</span>
                <Badge variant="outline" className="border-gray-600">
                  {users.filter((u) => u.role === 'ADMIN').length} admins /{' '}
                  {users.length} total
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 sm:p-4 bg-gray-700/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-600/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs sm:text-sm font-bold text-purple-400">
                          {user.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm sm:text-base truncate">{user.email}</p>
                        <p className="text-xs sm:text-sm text-gray-400">
                          {user._count.orders} orders
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {user.role === 'ADMIN' ? (
                        <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-600">
                          <Crown className="h-3 w-3 mr-1" weight="fill" />
                          Admin
                        </Badge>
                      ) : (
                        <>
                          <Badge className="bg-gray-600/20 text-gray-400 border-gray-600 hidden sm:flex">
                            User
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-yellow-600 text-yellow-400 hover:bg-yellow-600/10 h-8 px-2 sm:px-3"
                            onClick={() => handlePromoteUser(user.id)}
                          >
                            <ArrowUp className="h-4 w-4 sm:mr-1" />
                            <span className="hidden sm:inline">Promote</span>
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string
  value: string
  icon: React.ElementType
  color: 'green' | 'purple' | 'blue' | 'yellow'
}) {
  const colorClasses = {
    green: 'bg-green-600/20 text-green-400',
    purple: 'bg-purple-600/20 text-purple-400',
    blue: 'bg-blue-600/20 text-blue-400',
    yellow: 'bg-yellow-600/20 text-yellow-400',
  }

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardContent className="p-2 sm:p-3 md:p-4 lg:p-6">
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
          <div
            className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 ${colorClasses[color]}`}
          >
            <Icon className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" weight="fill" />
          </div>
          <div className="min-w-0">
            <p className="text-sm sm:text-lg md:text-xl lg:text-2xl font-bold truncate">{value}</p>
            <p className="text-[10px] sm:text-xs md:text-sm text-gray-400 truncate">{title}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
