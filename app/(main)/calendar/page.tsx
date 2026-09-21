'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  getDaysInMonth,
} from 'date-fns'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface Event {
  id: string
  name: string
  date: string
  venue: string
  description: string
  imageUrl: string
  isActive: boolean
  suites: {
    id: string
    name: string
    features: string[]
    availableSeats: number
    totalSeats: number
    minPrice: number
    maxPrice: number
  }[]
}

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoading(true)
      try {
        const res = await fetch('/api/events')
        if (res.ok) {
          const text = await res.text()
          try {
            const data = JSON.parse(text)
            setEvents(data)
          } catch (e) {
            console.error('Failed to parse events JSON:', e)
          }
        }
      } catch (error) {
        console.error('Failed to fetch events:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchEvents()
  }, [])

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const jumpToToday = () => setCurrentMonth(new Date())

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart)
  const endDate = endOfWeek(monthEnd)

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  })

  // For mobile list view - only days in current month
  const monthDays = eachDayOfInterval({
    start: monthStart,
    end: monthEnd,
  })

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const getEventsForDay = (date: Date) => {
    return events.filter((event) => isSameDay(new Date(event.date), date))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  // Filter to only days that have events (for mobile list view)
  const daysWithEvents = monthDays.filter(day => getEventsForDay(day).length > 0)

  if (isLoading) {
    return (
      <div className="space-y-4 md:space-y-6">
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden shadow-xl">
          {/* Navigation Header Skeleton */}
          <div className="flex items-center justify-between p-3 sm:p-4 md:p-6 bg-gray-900 border-b border-gray-700">
            <Skeleton className="h-8 w-8 md:h-10 md:w-10 rounded-md" />
            <Skeleton className="h-6 w-32 md:h-8 md:w-48" />
            <Skeleton className="h-8 w-8 md:h-10 md:w-10 rounded-md" />
          </div>

          {/* Mobile List View Skeleton */}
          <div className="md:hidden divide-y divide-gray-700">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-3">
                <Skeleton className="h-8 w-12 rounded mb-2" />
                <Skeleton className="h-14 w-full rounded" />
              </div>
            ))}
          </div>

          {/* Desktop Grid Skeleton */}
          <div className="hidden md:block">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 border-b border-gray-700 bg-gray-900/50">
              {weekDays.map((day) => (
                <div key={day} className="p-4 text-center font-semibold text-gray-400 uppercase text-sm tracking-wider">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid Skeleton */}
            <div className="grid grid-cols-7 auto-rows-fr bg-gray-700 gap-px">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="min-h-[180px] bg-gray-900 p-2">
                  <div className="flex justify-between items-start mb-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-16 w-full rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden shadow-xl">
        {/* Navigation Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 md:p-6 bg-gray-900 border-b border-gray-700">
          <Button variant="ghost" size="icon" onClick={prevMonth} className="hover:bg-gray-800 text-white h-8 w-8 md:h-10 md:w-10">
            <CaretLeft className="h-5 w-5 md:h-6 md:w-6" />
          </Button>
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white uppercase tracking-wider md:tracking-widest">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <Button variant="ghost" size="icon" onClick={nextMonth} className="hover:bg-gray-800 text-white h-8 w-8 md:h-10 md:w-10">
            <CaretRight className="h-5 w-5 md:h-6 md:w-6" />
          </Button>
        </div>

        {/* Mobile List View - Shows all dates */}
        <div className="md:hidden">
          <div className="divide-y divide-gray-700/50">
            {monthDays.map((day) => {
              const dayEvents = getEventsForDay(day)
              const isToday = isSameDay(day, new Date())
              const hasEvents = dayEvents.length > 0

              return (
                <div key={day.toString()} className="bg-gray-900/50">
                  {/* Date Row */}
                  <div className="px-4 py-3 flex items-start gap-4">
                    {/* Date Box */}
                    <div className="flex flex-col items-center min-w-[44px]">
                      <span className={cn(
                        "text-[10px] uppercase font-semibold tracking-wide",
                        isToday ? "text-purple-400" : "text-gray-500"
                      )}>
                        {format(day, 'EEE')}
                      </span>
                      <span className={cn(
                        "text-xl font-bold w-9 h-9 flex items-center justify-center rounded-full",
                        isToday 
                          ? "bg-purple-600 text-white" 
                          : "text-white"
                      )}>
                        {format(day, 'd')}
                      </span>
                    </div>

                    {/* Events or Empty */}
                    <div className="flex-1 min-w-0">
                      {hasEvents ? (
                        <div className="space-y-2">
                          {dayEvents.map((event) => (
                            <Link
                              key={event.id}
                              href={`/event/${event.id}`}
                              className="block bg-gray-800/80 hover:bg-gray-700/80 border border-gray-700 hover:border-purple-500/50 rounded-lg p-3 transition-all"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="font-semibold text-sm text-white leading-snug line-clamp-2">
                                    {event.name}
                                  </div>
                                  {event.venue && (
                                    <div className="text-xs text-gray-400 mt-1 truncate">
                                      {event.venue}
                                    </div>
                                  )}
                                </div>
                                <div className="text-xs text-purple-400 font-medium whitespace-nowrap">
                                  {format(new Date(event.date), 'h:mm a')}
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <div className="h-9 flex items-center">
                          <span className="text-xs text-gray-600">No events</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Desktop Grid View */}
        <div className="hidden md:block">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 border-b border-gray-700 bg-gray-900/50">
            {weekDays.map((day) => (
              <div key={day} className="p-4 text-center font-semibold text-gray-400 uppercase text-sm tracking-wider">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 auto-rows-fr bg-gray-700 gap-px">
            {calendarDays.map((day, dayIdx) => {
              const dayEvents = getEventsForDay(day)
              const isCurrentMonth = isSameMonth(day, currentMonth)
              const isToday = isSameDay(day, new Date())

              if (!isCurrentMonth) {
                return <div key={day.toString()} className="min-h-[180px] bg-gray-900/30" />
              }

              return (
                <div
                  key={day.toString()}
                  className={cn(
                    "min-h-[180px] bg-gray-900 p-2 transition-colors hover:bg-gray-800/80 relative group"
                  )}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium",
                        isToday
                          ? "bg-purple-600 text-white"
                          : "text-gray-400 group-hover:text-white"
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {dayEvents.map((event, index) => (
                      <div key={event.id}>
                        {index > 0 && <div className="h-px bg-gray-700 my-2" />}
                        <Link href={`/event/${event.id}`} className="block group/event">
                          <div className="bg-gray-800/50 hover:bg-purple-900/20 border border-gray-700 hover:border-purple-500/50 rounded p-2 transition-all">
                            <div className="text-xs text-purple-400 font-semibold mb-1">
                              {format(new Date(event.date), 'h:mm a')}
                            </div>
                            <div className="font-bold text-sm text-white group-hover/event:text-purple-300 line-clamp-2 leading-tight">
                              {event.name}
                            </div>
                            <div className="text-xs text-gray-500 mt-1 truncate">
                              {event.venue}
                            </div>
                          </div>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
