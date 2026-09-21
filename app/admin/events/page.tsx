'use client'

import { useState, useEffect } from 'react'
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
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  Plus,
  Calendar,
  Pencil,
  Trash,
  Eye,
  Package,
} from '@phosphor-icons/react'

interface Event {
  id: string
  name: string
  date: string
  venue: string
  isActive: boolean
  suites: {
    id: string
    name: string
    availableSeats: number
    totalSeats: number
  }[]
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/events?includeInactive=true')
      if (res.ok) {
        setEvents(await res.json())
      }
    } catch (error) {
      console.error('Failed to fetch events:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
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

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-10 w-48" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 sm:mb-2">Event Management</h1>
          <p className="text-xs sm:text-sm text-gray-400">Create and manage events with VIP suites</p>
        </div>
        <Link href="/admin/events/new">
          <Button className="bg-purple-600 hover:bg-purple-700 gap-1.5 sm:gap-2 h-8 sm:h-9 md:h-10 text-xs sm:text-sm w-full sm:w-auto">
            <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Create Event
          </Button>
        </Link>
      </div>

      {events.length === 0 ? (
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-4 sm:p-6 md:p-8 text-center text-gray-400">
            <Calendar className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
            <p className="text-sm sm:text-base">No events yet</p>
            <p className="text-xs sm:text-sm mt-1 sm:mt-2">Create your first event to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {events.map((event) => {
            const totalSeats = event.suites.reduce((sum, s) => sum + s.totalSeats, 0)
            const availableSeats = event.suites.reduce(
              (sum, s) => sum + s.availableSeats,
              0
            )
            const soldSeats = totalSeats - availableSeats
            const isPast = new Date(event.date) < new Date()

            return (
              <Card
                key={event.id}
                className={`bg-gray-800/50 border-gray-700 ${
                  !event.isActive || isPast ? 'opacity-60' : ''
                }`}
              >
                <CardContent className="p-3 sm:p-4 md:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                        <h3 className="text-base sm:text-lg md:text-xl font-bold truncate">{event.name}</h3>
                        {!event.isActive && (
                          <Badge variant="outline" className="border-red-500 text-red-400 text-[10px] sm:text-xs">
                            Inactive
                          </Badge>
                        )}
                        {isPast && (
                          <Badge variant="outline" className="border-gray-500 text-gray-400 text-[10px] sm:text-xs">
                            Past
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-[10px] sm:text-xs md:text-sm text-gray-400 mb-2 sm:mb-3 md:mb-4">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
                          {format(new Date(event.date), 'MMM d, yyyy')}
                        </span>
                        <span className="truncate max-w-[150px] sm:max-w-none">{event.venue}</span>
                      </div>

                      {/* Suites summary */}
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4">
                        <Badge
                          variant="outline"
                          className="border-purple-500 text-purple-400 text-[10px] sm:text-xs"
                        >
                          <Package className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                          {event.suites.length} suites
                        </Badge>
                        <span className="text-[10px] sm:text-xs md:text-sm text-gray-400">
                          {availableSeats}/{totalSeats} available
                        </span>
                        {soldSeats > 0 && (
                          <Badge className="bg-green-600/20 text-green-400 border-green-600 text-[10px] sm:text-xs">
                            {soldSeats} sold
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 sm:gap-2 flex-wrap sm:flex-nowrap">
                      <Link href={`/event/${event.id}`}>
                        <Button variant="ghost" size="icon" title="View" className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9">
                          <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </Button>
                      </Link>
                      <Link href={`/admin/events/${event.id}/edit`}>
                        <Button variant="ghost" size="icon" title="Edit" className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9">
                          <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-7 sm:h-8 text-[10px] sm:text-xs ${
                          event.isActive
                            ? 'text-yellow-400 hover:text-yellow-300'
                            : 'text-green-400 hover:text-green-300'
                        }`}
                        onClick={() => handleToggleActive(event.id, event.isActive)}
                      >
                        {event.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      {soldSeats === 0 && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-400 hover:text-red-300 h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9"
                              title="Delete"
                              onClick={() => setDeleteId(event.id)}
                            >
                              <Trash className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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
                              <AlertDialogCancel onClick={() => { if (!isDeleting) setDeleteId(null) }} disabled={isDeleting}>
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction asChild>
                                <button
                                  onClick={handleDelete}
                                  disabled={isDeleting}
                                  className={isDeleting ? 'opacity-70 pointer-events-none' : ''}
                                >
                                  {isDeleting ? 'Deleting...' : 'Delete'}
                                </button>
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
