'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
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
} from 'date-fns'
import { CaretLeft, CaretRight, CalendarBlank, MapPin, Ticket } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import defaultLogo from '@/assets/logo.png'

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

interface EventCalendarProps {
  showUpcomingList?: boolean
  maxUpcomingEvents?: number
  simpleMode?: boolean
}

export default function EventCalendar({ showUpcomingList = false, maxUpcomingEvents = 4, simpleMode = false }: EventCalendarProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [minMonth, setMinMonth] = useState<Date | null>(null);
  const [maxMonth, setMaxMonth] = useState<Date | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/events');
        if (res.ok) {
          const text = await res.text();
          try {
            const data = JSON.parse(text);
            setEvents(data);
            const upcoming = data.filter((e: Event) => new Date(e.date) >= new Date(new Date().setHours(0,0,0,0)));
            if (upcoming.length > 0) {
              const months = upcoming.map((e: Event) => new Date(e.date));
              const min = new Date(Math.min(...months.map((d: Date) => d.getTime())));
              const max = new Date(Math.max(...months.map((d: Date) => d.getTime())));
              const minMonth = new Date(min.getFullYear(), min.getMonth(), 1);
              const maxMonth = new Date(max.getFullYear(), max.getMonth(), 1);
              setMinMonth(minMonth);
              setMaxMonth(maxMonth);
              setCurrentMonth((prev) => {
                if (prev < minMonth) return minMonth;
                if (prev > maxMonth) return maxMonth;
                return prev;
              });
            } else {
              setMinMonth(null);
              setMaxMonth(null);
            }
          } catch (e) {
            console.error('Failed to parse events JSON:', e);
          }
        }
      } catch (error) {
        console.error('Failed to fetch events:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const nextMonth = () => {
    if (maxMonth && currentMonth < maxMonth) setCurrentMonth(addMonths(currentMonth, 1));
  };
  const prevMonth = () => {
    if (minMonth && currentMonth > minMonth) setCurrentMonth(subMonths(currentMonth, 1));
  };

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart)
  const endDate = endOfWeek(monthEnd)

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  })

  const monthDays = eachDayOfInterval({
    start: monthStart,
    end: monthEnd,
  })

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const getEventsForDay = (date: Date) => {
    return events.filter((event) => isSameDay(new Date(event.date), date) && new Date(event.date) >= new Date(new Date().setHours(0,0,0,0)))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const upcomingEvents = events
    .filter(event => new Date(event.date) >= new Date(new Date().setHours(0, 0, 0, 0)))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, maxUpcomingEvents)

  if (isLoading && simpleMode) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden shadow-xl">
        <div className="flex items-center justify-between p-3 bg-gray-900 border-b border-gray-700">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
        <div className="p-4 space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {showUpcomingList && upcomingEvents.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {upcomingEvents.map((event) => {
            const totalAvailable = event.suites.reduce((sum, s) => sum + s.availableSeats, 0)
            const minPrice = Math.min(...event.suites.map(s => s.minPrice).filter(p => p > 0))
            return (
              <Link
                key={event.id}
                href={`/event/${event.id}`}
                className="group bg-gray-800/50 border border-gray-700 hover:border-purple-500/50 rounded-xl overflow-hidden transition-all hover:shadow-lg hover:shadow-purple-500/10"
              >
                <div className="aspect-[16/10] relative overflow-hidden">
                  {event.imageUrl ? (
                    <img
                      src={event.imageUrl}
                      alt={event.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-900/50 to-gray-900 flex items-center justify-center">
                      <Image
                        src={defaultLogo}
                        alt="HYPEFANZ.VIP"
                        className="h-12 w-auto opacity-70"
                      />
                    </div>
                  )}
                  <div className="absolute top-2 left-2 bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded">
                    {format(new Date(event.date), 'MMM dd')}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-1 mb-1">
                    {event.name}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-gray-400 mb-2">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{event.venue}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Ticket className="h-3 w-3" />
                      <span>{totalAvailable} seats left</span>
                    </div>
                    {minPrice > 0 && (
                      <span className="text-sm font-bold text-purple-400">
                        From ${minPrice}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Calendar */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden shadow-xl">
        {/* Navigation Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 md:p-6 bg-gray-900 border-b border-gray-700">
          <Button variant="ghost" size="icon" onClick={prevMonth} disabled={!minMonth || currentMonth <= minMonth} className="hover:bg-gray-800 text-white h-8 w-8 md:h-10 md:w-10 disabled:opacity-30">
            <CaretLeft className="h-5 w-5 md:h-6 md:w-6" />
          </Button>
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white uppercase tracking-wider md:tracking-widest">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <Button variant="ghost" size="icon" onClick={nextMonth} disabled={!maxMonth || currentMonth >= maxMonth} className="hover:bg-gray-800 text-white h-8 w-8 md:h-10 md:w-10 disabled:opacity-30">
            <CaretRight className="h-5 w-5 md:h-6 md:w-6" />
          </Button>
        </div>

        {/* Mobile List View - Only show days in current month with upcoming events */}
        <div className="md:hidden">
          <div className="divide-y divide-gray-700/50">
            {monthDays
              .filter(day => getEventsForDay(day).length > 0)
              .map((day) => {
                const dayEvents = getEventsForDay(day);
                const isToday = isSameDay(day, new Date());
                return (
                  <div key={day.toString()} className="bg-gray-900/50">
                    <div className="px-4 py-3 flex items-start gap-4">
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
                      <div className="flex-1 min-w-0">
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
                      </div>
                    </div>
                  </div>
                );
              })}
            {monthDays.filter(day => getEventsForDay(day).length > 0).length === 0 && (
              <div className="text-center py-6 text-gray-400">No upcoming events this month</div>
            )}
          </div>
        </div>

        {/* Desktop Grid View */}
        <div className="hidden md:block">
          <div className="grid grid-cols-7 border-b border-gray-700 bg-gray-900/50">
            {weekDays.map((day) => (
              <div key={day} className="p-3 text-center font-semibold text-gray-400 uppercase text-xs tracking-wider">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 auto-rows-fr bg-gray-700 gap-px">
            {calendarDays.map((day) => {
              const dayEvents = getEventsForDay(day)
              const isCurrentMonth = isSameMonth(day, currentMonth)
              const isToday = isSameDay(day, new Date())

              if (!isCurrentMonth) {
                return <div key={day.toString()} className="min-h-[120px] bg-gray-900/30" />
              }

              return (
                <div
                  key={day.toString()}
                  className={cn(
                    "min-h-[120px] bg-gray-900 p-2 transition-colors hover:bg-gray-800/80 relative group"
                  )}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                        isToday
                          ? "bg-purple-600 text-white"
                          : "text-gray-400 group-hover:text-white"
                      )}
                    >
                      {format(day, 'dd')}
                    </span>
                  </div>

                  <div className="space-y-1">
                    {dayEvents.slice(0, 2).map((event) => (
                      <Link key={event.id} href={`/event/${event.id}`} className="block group/event">
                        <div className="bg-gray-800/50 hover:bg-purple-900/20 border border-gray-700 hover:border-purple-500/50 rounded px-2 py-1 transition-all">
                          <div className="text-[10px] text-purple-400 font-semibold">
                            {format(new Date(event.date), 'h:mm a')}
                          </div>
                          <div className="font-semibold text-xs text-white group-hover/event:text-purple-300 line-clamp-1">
                            {event.name}
                          </div>
                        </div>
                      </Link>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-[10px] text-gray-500 text-center">
                        +{dayEvents.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* View Full Calendar Button */}
      <div className="text-center">
        <Link href="/calendar">
          <Button variant="outline" className="border-purple-500 text-purple-400 hover:bg-purple-500/10">
            <CalendarBlank className="h-4 w-4 mr-2" />
            View Full Calendar
          </Button>
        </Link>
      </div>
    </div>
  )
}