'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  ArrowLeft,
  CalendarBlank,
  MapPin,
  Clock,
  Ticket,
  Crown,
  Share,
  Download,
} from '@phosphor-icons/react'

interface PosterData {
  id: string
  name: string
  date: string
  formattedDate: string
  formattedTime: string
  venue: string
  description: string
  imageUrl: string
  totalSuites: number
  availableSeats: number
  priceRange: string
}

export default function EventPosterPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [poster, setPoster] = useState<PosterData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchPoster = async () => {
      try {
        const res = await fetch(`/api/events/${id}/poster`)
        if (res.ok) {
          setPoster(await res.json())
        } else if (res.status === 404) {
          toast.error('Event not found')
          router.push('/calendar')
        }
      } catch (error) {
        console.error('Failed to fetch poster:', error)
        toast.error('Failed to load poster')
      } finally {
        setIsLoading(false)
      }
    }

    fetchPoster()
  }, [id, router])

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: poster?.name,
          text: `Check out this VIP event: ${poster?.name}`,
          url: window.location.href,
        })
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href)
      toast.success('Link copied to clipboard!')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-4">
          <Skeleton className="aspect-[3/4] w-full rounded-3xl" />
        </div>
      </div>
    )
  }

  if (!poster) {
    return null
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/calendar">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
          </Link>
          <span className="font-semibold">Event Poster</span>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={handleShare}>
              <Share className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 flex flex-col items-center">
        {/* Poster Card */}
        <div className="w-full max-w-lg">
          <div 
            className="relative overflow-hidden rounded-3xl border border-border shadow-2xl"
            style={{
              background: 'linear-gradient(180deg, hsl(var(--card)) 0%, hsl(var(--background)) 100%)',
            }}
          >
            {/* Event Image */}
            {poster.imageUrl && (
              <div className="relative aspect-video w-full overflow-hidden">
                <img
                  src={poster.imageUrl}
                  alt={poster.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
              </div>
            )}

            {/* Content */}
            <div className="relative p-8 space-y-6">
              {/* VIP Badge */}
              <div className="flex justify-center">
                <Badge className="bg-primary/20 text-primary border-primary/30 px-4 py-1.5 text-sm uppercase tracking-wider">
                  <Crown className="h-4 w-4 mr-2" weight="fill" />
                  VIP Access
                </Badge>
              </div>

              {/* Event Name */}
              <h1 className="text-3xl md:text-4xl font-black text-center text-foreground tracking-tight">
                {poster.name}
              </h1>

              {/* Date & Time */}
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <CalendarBlank className="h-5 w-5 text-primary" />
                  {poster.formattedDate}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {poster.formattedTime}
                </div>
              </div>

              {/* Venue */}
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <MapPin className="h-5 w-5 text-primary" />
                <span className="font-medium">{poster.venue}</span>
              </div>

              {/* Divider */}
              <div className="border-t border-border" />

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-muted/50 rounded-xl p-4">
                  <p className="text-2xl font-bold text-primary">{poster.totalSuites}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">VIP Suites</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-4">
                  <p className="text-2xl font-bold text-primary">{poster.priceRange}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Starting From</p>
                </div>
              </div>

              {/* Seats Available */}
              {poster.availableSeats > 0 && (
                <div className="flex items-center justify-center gap-2 text-sm">
                  <Ticket className="h-4 w-4 text-green-500" />
                  <span className="text-green-500 font-medium">
                    {poster.availableSeats} seats available
                  </span>
                </div>
              )}

              {/* CTA Button */}
              <Link href={`/event/${poster.id}`} className="block">
                <Button className="w-full h-14 text-lg font-bold rounded-xl">
                  Book Now
                </Button>
              </Link>

              {/* Footer */}
              <p className="text-center text-xs text-muted-foreground">
                HYPEFANZ.VIP • Premium VIP Experience
              </p>
            </div>
          </div>
        </div>

        {/* Actions below poster */}
        <div className="flex gap-4 mt-8">
          <Button variant="outline" className="gap-2" onClick={handleShare}>
            <Share className="h-4 w-4" />
            Share Poster
          </Button>
          <Link href={`/event/${poster.id}`}>
            <Button className="gap-2">
              <Ticket className="h-4 w-4" />
              Book Tickets
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
