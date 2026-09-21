'use client';


import { useState, useEffect, use, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { naturalSort } from '@/lib/utils'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  ArrowLeft,
  CalendarBlank,
  MapPin,
  Check,
  ShoppingCart,
  User,
  Envelope,
  Phone,
  CreditCard,
} from '@phosphor-icons/react'
import { QRCodeSVG } from 'qrcode.react'
import localFont from 'next/font/local'
import posterLogo from '@/assets/poster-logo.png'
import dynamic from 'next/dynamic';
const EventDualVideo = dynamic(() => import('@/components/EventDualVideo'), { ssr: false });
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// Initialize Radiate Sans Extra Bold font
const radiateSans = localFont({ 
  src: [
    {
      path: '../../../../public/fonts/fonnts.com-radiatesans-extrabold.otf',
      weight: '800',
      style: 'normal',
    }
  ],
  variable: '--font-radiate-sans',
  display: 'swap',
  preload: true,
})

interface Seat {
  id: string
  seatNumber: string
  sellingPrice: number
  status: 'AVAILABLE' | 'RESERVED' | 'SOLD'
}

interface Suite {
  id: string
  name: string
  description: string | null
  features: string[]
  availableSeats: number
  totalSeats: number
  seats: Seat[]
  audienceType?: string // Added for audience type badge
}

interface Event {
  id: string
  name: string
  date: string
  venue: string
  description: string
  imageUrl: string
  isActive: boolean
  suites: Suite[]
}

// Guest Stripe Payment Form Component
function GuestStripePaymentForm({
  total,
  onSuccess,
  onError,
  paymentIntentId,
}: {
  total: number
  onSuccess: () => void
  onError: (error: string) => void
  paymentIntentId: string
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsProcessing(true)

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/success`,
        },
        redirect: 'if_required',
      })

      if (error) {
        onError(error.message || 'Payment failed')
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Confirm payment and create order
        try {
          const confirmRes = await fetch('/api/stripe/confirm-guest-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
          })
          
          if (!confirmRes.ok) {
            console.error('Failed to confirm order, but payment succeeded')
          }
        } catch (confirmError) {
          console.error('Error confirming order:', confirmError)
        }
        
        onSuccess()
      }
    } catch {
      onError('An unexpected error occurred')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleButtonClick = () => {
    // Create a synthetic form event
    handleSubmit({ preventDefault: () => {} } as React.FormEvent)
  }

  return (
    <div className="space-y-4">
      <PaymentElement
        options={{
          layout: 'accordion',
        }}
      />

      <Button
        type="button"
        onClick={handleButtonClick}
        className="w-full h-14 text-lg font-bold"
        disabled={!stripe || isProcessing}
      >
        {isProcessing ? (
          <span className="flex items-center gap-2">
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Processing Payment...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Pay ${total.toFixed(2)}
          </span>
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Secure payment powered by Stripe
      </p>
    </div>
  )
}

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { data: session, status } = useSession()
  const [event, setEvent] = useState<Event | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedSeats, setSelectedSeats] = useState<Set<string>>(new Set())
  const [isReserving, setIsReserving] = useState(false)
  const [eventUrl, setEventUrl] = useState('')
  
  // Booking form state - support multiple seat selection
  const [bookingForm, setBookingForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    donation: 0,
  })
  const [guestSelectedSeats, setGuestSelectedSeats] = useState<Set<string>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null)
  const [isCreatingIntent, setIsCreatingIntent] = useState(false)
  const [showPaymentForm, setShowPaymentForm] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setEventUrl(`${window.location.origin}/event/${id}`)
    }
  }, [id])

  useEffect(() => {
    const fetchEvent = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/events/${id}`)
        if (res.ok) {
          const data = await res.json()
          setEvent(data)
        } else if (res.status === 404) {
          toast.error('Event not found')
          router.push('/calendar')
        }
      } catch (error) {
        console.error('Failed to fetch event:', error)
        toast.error('Failed to load event')
      } finally {
        setIsLoading(false)
      }
    }

    fetchEvent()
  }, [id, router])

  const toggleSeat = (seatId: string) => {
    const newSelected = new Set(selectedSeats)
    if (newSelected.has(seatId)) {
      newSelected.delete(seatId)
    } else {
      newSelected.add(seatId)
    }
    setSelectedSeats(newSelected)
  }

  const handleReserve = async () => {
    if (selectedSeats.size === 0) {
      toast.error('Please select at least one seat')
      return
    }

    setIsReserving(true)
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seatIds: Array.from(selectedSeats),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Failed to reserve seats')
        // Refresh event data to get updated availability
        const eventRes = await fetch(`/api/events/${id}`)
        if (eventRes.ok) {
          setEvent(await eventRes.json())
        }
        setSelectedSeats(new Set())
        return
      }

      toast.success('Seats reserved! Redirecting to checkout...')
      setSelectedSeats(new Set())
      
      // Refresh event data immediately to show reserved status
      const eventRes = await fetch(`/api/events/${id}`)
      if (eventRes.ok) {
        setEvent(await eventRes.json())
      }
      
      // Trigger cart refresh in layout
      window.dispatchEvent(new Event('cart-refresh'))
      
      // Small delay to let cart update, then redirect
      setTimeout(() => {
        router.push('/checkout')
      }, 500)
    } catch {
      toast.error('Failed to reserve seats')
    } finally {
      setIsReserving(false)
    }
  }

  const getSelectedTotal = () => {
    if (!event) return 0
    let total = 0
    for (const suite of event.suites) {
      for (const seat of suite.seats) {
        if (selectedSeats.has(seat.id)) {
          total += seat.sellingPrice
        }
      }
    }
    return total
  }

  // Toggle guest seat selection (multiple seats support)
  const toggleGuestSeat = (seatId: string) => {
    const newSelected = new Set(guestSelectedSeats)
    if (newSelected.has(seatId)) {
      newSelected.delete(seatId)
    } else {
      newSelected.add(seatId)
    }
    setGuestSelectedSeats(newSelected)
    // Reset payment form when seats change
    setShowPaymentForm(false)
    setClientSecret(null)
  }

  // Calculate total for guest selected seats
  const getGuestSelectedTotal = () => {
    if (!event) return 0
    let total = 0
    for (const suite of event.suites) {
      for (const seat of suite.seats) {
        if (guestSelectedSeats.has(seat.id)) {
          total += seat.sellingPrice
        }
      }
    }
    return total
  }

  // Create Stripe payment intent for guest
  const createGuestPaymentIntent = useCallback(async () => {
    console.log('createGuestPaymentIntent called')
    console.log('guestSelectedSeats:', Array.from(guestSelectedSeats))
    console.log('bookingForm:', bookingForm)
    
    if (guestSelectedSeats.size === 0) {
      console.log('No seats selected')
      toast.error('Please select at least one seat')
      return
    }
    if (!bookingForm.firstName || !bookingForm.lastName || !bookingForm.email || !bookingForm.phone) {
      console.log('Form not filled')
      toast.error('Please fill in all your information first')
      return
    }

    setIsCreatingIntent(true)
    try {
      console.log('Making API call to create-guest-payment-intent')
      const res = await fetch('/api/stripe/create-guest-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seatIds: Array.from(guestSelectedSeats),
          guestInfo: {
            firstName: bookingForm.firstName,
            lastName: bookingForm.lastName,
            email: bookingForm.email,
            phone: bookingForm.phone,
          },
          donation: bookingForm.donation || 0,
        }),
      })

      const data = await res.json()
      console.log('API response:', res.status, data)

      if (!res.ok) {
        toast.error(data.error || 'Failed to initialize payment')
        return
      }

      console.log('Setting clientSecret and showing payment form')
      setClientSecret(data.clientSecret)
      setPaymentIntentId(data.paymentIntentId)
      setShowPaymentForm(true)
    } catch (error) {
      console.error('Error creating payment intent:', error)
      toast.error('Failed to initialize payment')
    } finally {
      setIsCreatingIntent(false)
    }
  }, [guestSelectedSeats, bookingForm])

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('handleBookingSubmit called')
    console.log('guestSelectedSeats size:', guestSelectedSeats.size)
    console.log('bookingForm:', bookingForm)
    
    if (guestSelectedSeats.size === 0) {
      toast.error('Please select at least one seat')
      return
    }

    if (!bookingForm.firstName || !bookingForm.lastName || !bookingForm.email || !bookingForm.phone) {
      toast.error('Please fill in all your information')
      return
    }

    // Create payment intent and show Stripe form
    console.log('Calling createGuestPaymentIntent...')
    await createGuestPaymentIntent()
  }

  const handlePaymentSuccess = async () => {
    toast.success('Payment successful! Check your email for confirmation.')
    
    // Redirect to success page with guest flag FIRST
    router.push('/checkout/success?guest=true')
  }

  const handlePaymentError = (error: string) => {
    toast.error(error || 'Payment failed. Please try again.')
  }

  // Guest user loading state - check this FIRST before authenticated loading
  if (!session && status !== 'loading' && isLoading) {
    return (
      <div className="bg-background">
        {/* Guest Poster Skeleton - Exactly 100vh */}
        <div className="w-full h-screen">
          <div 
            className="relative overflow-hidden flex flex-col w-full h-full"
            style={{
              background: 'radial-gradient(circle at top right, #E9D5FF 0%, #C084FC 15%, #A855F7 25%, #6B21A8 45%, #4B0082 65%, #3B0764 80%, #2D0B54 100%)',
            }}
          >
            <div className="flex flex-col items-center justify-center h-full px-2 sm:px-4 z-10 py-4 sm:py-6">
              {/* Logo Skeleton */}
              <div className="mb-3 sm:mb-4 md:mb-6">
                <Skeleton className="w-40 sm:w-56 md:w-72 lg:w-80 h-20 sm:h-28 md:h-32 lg:h-36 rounded-xl bg-white/20" />
              </div>
              
              {/* Event Info Skeleton */}
              <div className="flex flex-col items-center space-y-1.5 sm:space-y-2 md:space-y-3">
                <Skeleton className="h-7 sm:h-10 md:h-12 lg:h-14 w-48 sm:w-64 md:w-72 lg:w-80 bg-white/20" />
                <Skeleton className="h-5 sm:h-8 md:h-10 w-36 sm:w-48 md:w-56 lg:w-64 bg-white/20" />
                <Skeleton className="h-4 sm:h-5 md:h-6 w-32 sm:w-40 md:w-48 bg-white/20" />
                <Skeleton className="h-3 sm:h-4 md:h-5 w-20 sm:w-24 md:w-32 bg-white/20" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Guest Form Skeleton */}
        <div className="px-2 sm:px-4 py-4 sm:py-8 md:py-12 max-w-4xl mx-auto">
          <div className="border-2 rounded-lg sm:rounded-xl p-3 sm:p-5 md:p-8 space-y-3 sm:space-y-4 md:space-y-6">
            <div className="text-center space-y-1 sm:space-y-2">
              <Skeleton className="h-6 sm:h-8 md:h-10 w-48 sm:w-56 md:w-64 mx-auto" />
              <Skeleton className="h-4 sm:h-5 w-56 sm:w-72 md:w-80 mx-auto" />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
              <Skeleton className="h-10 sm:h-12 w-full" />
              <Skeleton className="h-10 sm:h-12 w-full" />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
              <Skeleton className="h-10 sm:h-12 w-full" />
              <Skeleton className="h-10 sm:h-12 w-full" />
            </div>
            <div className="space-y-2 sm:space-y-3 md:space-y-4">
              <Skeleton className="h-5 sm:h-6 md:h-8 w-32 sm:w-40 md:w-48" />
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 sm:gap-2 md:gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-lg sm:rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Authenticated user loading state
  if (isLoading) {
    return (
      <div className="min-h-screen pb-20 sm:pb-32 md:pb-40">
        {/* Sticky Header Skeleton */}
        <div className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="container mx-auto flex h-12 sm:h-14 md:h-16 items-center justify-between px-2 sm:px-4">
            <Skeleton className="h-7 sm:h-8 md:h-9 w-20 sm:w-28 md:w-32" />
            <Skeleton className="h-4 sm:h-5 w-32 sm:w-40 md:w-48 hidden sm:block" />
            <div className="w-16 sm:w-20 md:w-24" />
          </div>
        </div>

        <div className="px-2 sm:px-4 py-4 sm:py-8 md:py-12 max-w-5xl mx-auto">
          {/* Hero Section Skeleton */}
          <div className="mb-6 sm:mb-10 md:mb-16 text-center space-y-3 sm:space-y-4 md:space-y-6">
            <Skeleton className="h-5 sm:h-6 md:h-8 w-24 sm:w-28 md:w-32 mx-auto rounded-full" />
            <Skeleton className="h-8 sm:h-12 md:h-16 w-full sm:w-3/4 mx-auto" />
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3 md:gap-4">
              <Skeleton className="h-8 sm:h-9 md:h-10 w-40 sm:w-48 md:w-56 rounded-full" />
              <Skeleton className="h-8 sm:h-9 md:h-10 w-28 sm:w-36 md:w-40 rounded-full" />
            </div>
            <Skeleton className="h-12 sm:h-16 md:h-20 w-full sm:w-2/3 mx-auto" />
          </div>

          {/* Suites Section Skeleton */}
          <div className="space-y-4 sm:space-y-8 md:space-y-12">
            <div className="flex items-center justify-between border-b border-border pb-2 sm:pb-3 md:pb-4">
              <Skeleton className="h-5 sm:h-6 md:h-8 w-32 sm:w-40 md:w-48" />
              <Skeleton className="h-4 sm:h-5 w-32 sm:w-48 md:w-64 hidden sm:block" />
            </div>
            
            <div className="grid gap-3 sm:gap-5 md:gap-8">
              {[1, 2].map((i) => (
                <div key={i} className="rounded-xl sm:rounded-2xl md:rounded-3xl border border-border bg-card p-3 sm:p-5 md:p-8">
                  <div className="grid lg:grid-cols-12 gap-3 sm:gap-5 md:gap-8">
                    <div className="lg:col-span-5 space-y-2 sm:space-y-4 md:space-y-6">
                      <Skeleton className="h-6 sm:h-8 md:h-10 w-3/4" />
                      <Skeleton className="h-10 sm:h-12 md:h-16 w-full" />
                      <div className="flex gap-1.5 sm:gap-2">
                        <Skeleton className="h-5 sm:h-6 w-16 sm:w-20 rounded-full" />
                        <Skeleton className="h-5 sm:h-6 w-20 sm:w-24 rounded-full" />
                      </div>
                      <Skeleton className="h-8 sm:h-10 md:h-12 w-24 sm:w-28 md:w-32" />
                    </div>
                    <div className="lg:col-span-7 bg-muted/30 rounded-lg sm:rounded-xl md:rounded-2xl p-2 sm:p-4 md:p-6">
                      <Skeleton className="h-4 sm:h-5 w-20 sm:w-24 mb-3 sm:mb-4 md:mb-6" />
                      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5 sm:gap-2 md:gap-3">
                        {Array.from({ length: 16 }).map((_, j) => (
                          <Skeleton key={j} className="aspect-square rounded-lg sm:rounded-xl" />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!event) {
    return null
  }

  // Guest Booking View - Full width poster + booking form
  if (!session && status !== 'loading') {
    return (
      <div className="bg-background">
        
          {/* Booking form remains below videos */}
        {/* Full Width Vertical Poster - Auto height */}
        <div className="w-full">
          <div 
            className="relative overflow-hidden flex flex-col w-full"
            style={{
              background: 'radial-gradient(circle at top right, #E9D5FF 0%, #C084FC 15%, #A855F7 25%, #6B21A8 45%, #4B0082 65%, #3B0764 80%, #2D0B54 100%)',
            }}
          >
            {/* Noise Texture */}
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none mix-blend-overlay" 
                 style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} 
            />

            <div className="flex flex-col items-center justify-center flex-1 px-3 sm:px-4 md:px-8 z-10 py-4 sm:py-6">
              {/* Logo Section - More Responsive */}
              <div className="mb-2 sm:mb-4 md:mb-6 lg:mb-8">
                <img 
                  src={posterLogo.src} 
                  alt="HYPE FANZ" 
                  className="w-32 xs:w-40 sm:w-52 md:w-64 lg:w-80 h-auto object-contain"
                />
              </div>

              {/* Event Info Section - Center */}
              <div className="flex flex-col items-center justify-center text-center space-y-1 sm:space-y-2 md:space-y-3">
                <h1 
                  className={`${radiateSans.className} text-lg xs:text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-black uppercase tracking-wide leading-tight px-2`}
                  style={{
                    letterSpacing: '0.05em',
                    background: 'linear-gradient(180deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    color: 'transparent',
                    filter: 'drop-shadow(0px 3px 0px rgba(0,0,0,0.4)) drop-shadow(0px 5px 0px rgba(0,0,0,0.3)) drop-shadow(0px 7px 10px rgba(0,0,0,0.6))',
                  }}
                >
                  {event.name}
                </h1>

                <p 
                  className={`${radiateSans.className} text-sm xs:text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-bold uppercase tracking-wider`}
                  style={{
                    background: 'linear-gradient(180deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    color: 'transparent',
                    filter: 'drop-shadow(0px 3px 0px rgba(0,0,0,0.4)) drop-shadow(0px 5px 0px rgba(0,0,0,0.3)) drop-shadow(0px 7px 10px rgba(0,0,0,0.6))',
                  }}
                >
                  VIP {event.venue}
                </p>

                {/* QR Code */}
                <div className="pt-3 sm:pt-4 md:pt-5">
                  <div className="bg-white p-2 sm:p-3 rounded-lg sm:rounded-xl shadow-lg">
                    <QRCodeSVG
                      value={eventUrl || `${typeof window !== 'undefined' ? window.location.origin : ''}/event/${id}`}
                      size={120}
                      level="M"
                      className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36"
                    />
                  </div>
                </div>

                {/* Contact Info */}
                <div className="pt-2 sm:pt-4 md:pt-5 lg:pt-6 space-y-0.5 sm:space-y-1">
                  <a
                    href="tel:+18772583111"
                    className={`${radiateSans.className} block text-sm sm:text-base md:text-lg lg:text-xl font-bold uppercase tracking-wider transition-all duration-300 hover:animate-pulse hover:scale-110`}
                    style={{
                      background: 'linear-gradient(180deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)',
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      color: 'transparent',
                      filter: 'drop-shadow(0px 2px 0px rgba(0,0,0,0.3)) drop-shadow(0px 3px 6px rgba(0,0,0,0.5))',
                    }}
                  >
                    877 258 3111
                  </a>
                  <a
                    href="mailto:help@hypefanz.vip"
                    className={`${radiateSans.className} block text-sm sm:text-base md:text-lg lg:text-xl font-bold uppercase tracking-wider transition-all duration-300 hover:animate-pulse hover:scale-110`}
                    style={{
                      background: 'linear-gradient(180deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)',
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      color: 'transparent',
                      filter: 'drop-shadow(0px 2px 0px rgba(0,0,0,0.3)) drop-shadow(0px 3px 6px rgba(0,0,0,0.5))',
                    }}
                  >
                    {'help'}
                    <span style={{ fontFamily: 'Arial, sans-serif', fontWeight: 'bold', color: 'inherit', WebkitTextFillColor: 'inherit', background: 'none', WebkitBackgroundClip: 'initial', backgroundClip: 'initial' }}>@</span>
                    {'hypefanz.vip'}
                  </a>
                </div>

                {/* Auth Options - Matching landing page style */}
                <div className="pt-2 sm:pt-4 md:pt-5 lg:pt-6 flex flex-row gap-2 sm:gap-4 md:gap-5 justify-center items-center">
                  <Link 
                    href="/home?auth=login"
                    className="transition-all duration-300 hover:opacity-70 animate-pulse-text"
                  >
                    <span 
                      className={`${radiateSans.className} text-base sm:text-lg md:text-xl lg:text-2xl xl:text-4xl font-black uppercase tracking-wide`}
                      style={{
                        letterSpacing: '0.05em',
                        background: 'linear-gradient(180deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)',
                        WebkitBackgroundClip: 'text',
                        backgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        color: 'transparent',
                        filter: 'drop-shadow(0px 3px 0px rgba(0,0,0,0.4)) drop-shadow(0px 5px 0px rgba(0,0,0,0.3)) drop-shadow(0px 7px 10px rgba(0,0,0,0.6))',
                      }}
                    >
                      SIGN IN
                    </span>
                  </Link>

                  <span 
                    className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl animate-pulse-text"
                    style={{
                      fontFamily: 'Arial, sans-serif',
                      fontWeight: 'bold',
                      letterSpacing: '0.05em',
                      background: 'linear-gradient(180deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)',
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      color: 'transparent',
                      filter: 'none',
                    }}
                  >/</span>
                  
                  <Link 
                    href="/home?auth=register"
                    className="transition-all duration-300 hover:opacity-70 animate-pulse-text"
                  >
                    <span 
                      className={`${radiateSans.className} text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-black uppercase tracking-wide`}
                      style={{
                        letterSpacing: '0.05em',
                        background: 'linear-gradient(180deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)',
                        WebkitBackgroundClip: 'text',
                        backgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        color: 'transparent',
                        filter: 'drop-shadow(0px 3px 0px rgba(0,0,0,0.4)) drop-shadow(0px 5px 0px rgba(0,0,0,0.3)) drop-shadow(0px 7px 10px rgba(0,0,0,0.6))',
                      }}
                    >
                      REGISTER
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Dual Video Section for Guest */}
        <div className="max-w-4xl mx-auto px-2 sm:px-4 pt-6">
          <EventDualVideo />
        </div>
        {/* Booking Form Section */}
        <div className="px-2 sm:px-4 py-4 sm:py-8 md:py-12 max-w-4xl mx-auto">
          <Card className="border sm:border-2">
            <CardHeader className="text-center p-3 sm:p-4 md:p-6">
              <CardTitle className="text-lg sm:text-2xl md:text-3xl font-bold">Book Your VIP Experience</CardTitle>
              <CardDescription className="text-xs sm:text-sm md:text-base">
                Fill in your details to reserve your exclusive suite access
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6">
              <form onSubmit={handleBookingSubmit} className="space-y-3 sm:space-y-4 md:space-y-6">
                {/* Personal Information */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="firstName" className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs md:text-sm">
                      <User className="h-3 w-3 sm:h-4 sm:w-4" />
                      First Name *
                    </Label>
                    <Input
                      id="firstName"
                      required
                      value={bookingForm.firstName}
                      onChange={(e) => setBookingForm({...bookingForm, firstName: e.target.value})}
                      placeholder="John"
                      className="h-8 sm:h-9 md:h-10 text-xs sm:text-sm"
                    />
                  </div>
                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="lastName" className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs md:text-sm">
                      <User className="h-3 w-3 sm:h-4 sm:w-4" />
                      Last Name *
                    </Label>
                    <Input
                      id="lastName"
                      required
                      value={bookingForm.lastName}
                      onChange={(e) => setBookingForm({...bookingForm, lastName: e.target.value})}
                      placeholder="Doe"
                      className="h-8 sm:h-9 md:h-10 text-xs sm:text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs md:text-sm">
                      <Envelope className="h-3 w-3 sm:h-4 sm:w-4" />
                      Email *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={bookingForm.email}
                      onChange={(e) => setBookingForm({...bookingForm, email: e.target.value})}
                      placeholder="john@example.com"
                      className="h-8 sm:h-9 md:h-10 text-xs sm:text-sm"
                    />
                  </div>
                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs md:text-sm">
                      <Phone className="h-3 w-3 sm:h-4 sm:w-4" />
                      Phone *
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      required
                      value={bookingForm.phone}
                      onChange={(e) => setBookingForm({...bookingForm, phone: e.target.value})}
                      placeholder="+1 (555) 000-0000"
                      className="h-8 sm:h-9 md:h-10 text-xs sm:text-sm"
                    />
                  </div>
                </div>

                {/* Suites Section - Like logged-in user view */}
                <div className="space-y-2 sm:space-y-4 md:space-y-6">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs sm:text-sm md:text-lg font-semibold">
                      Select VIP Suites & Seats
                    </Label>
                    {guestSelectedSeats.size > 0 && (
                      <Badge variant="secondary" className="text-[10px] sm:text-xs md:text-sm">
                        {guestSelectedSeats.size} seat{guestSelectedSeats.size > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Legend */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4 text-[10px] sm:text-xs md:text-sm bg-muted/30 p-2 sm:p-3 rounded-lg">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <div className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 rounded bg-background border sm:border-2 border-border"></div>
                      <span className="text-muted-foreground">Available</span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <div className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 rounded bg-primary border sm:border-2 border-primary"></div>
                      <span className="text-muted-foreground">Selected</span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <div className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 rounded bg-yellow-500/30 border sm:border-2 border-yellow-500"></div>
                      <span className="text-muted-foreground">Reserved</span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <div className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 rounded bg-muted border sm:border-2 border-transparent"></div>
                      <span className="text-muted-foreground">Sold</span>
                    </div>
                  </div>
                  
                  {/* Suites with seats */}
                  <div className="space-y-3 sm:space-y-4 md:space-y-6">
                    {event.suites.map((suite) => {
                      const availableSeats = suite.seats.filter(s => s.status === 'AVAILABLE')
                      const minPrice = Math.min(...suite.seats.map(s => s.sellingPrice))
                      const selectedInSuite = suite.seats.filter(s => guestSelectedSeats.has(s.id)).length
                      
                      return (
                        <div key={suite.id} className="rounded-lg sm:rounded-xl md:rounded-2xl border border-border bg-card overflow-hidden">
                          {/* Suite Header */}
                          <div className="p-2 sm:p-3 md:p-4 bg-muted/30 border-b border-border">
                            <div className="flex items-start justify-between gap-2 sm:gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-wrap">
                                  <h3 className="text-sm sm:text-base md:text-xl font-bold truncate">{suite.name}</h3>
                                  {suite.audienceType && (
                                    <span className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded text-[8px] sm:text-[10px] md:text-xs font-medium bg-secondary text-secondary-foreground border border-border">
                                      {suite.audienceType === 'HOME' ? 'Home' : 'Visitor'}
                                    </span>
                                  )}
                                  {selectedInSuite > 0 && (
                                    <Badge className="bg-primary text-primary-foreground text-[10px] sm:text-xs">
                                      {selectedInSuite} selected
                                    </Badge>
                                  )}
                                </div>
                                {suite.description && (
                                  <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mt-0.5 sm:mt-1 line-clamp-2">{suite.description}</p>
                                )}
                                {suite.features.length > 0 && (
                                  <div className="flex flex-wrap gap-1 sm:gap-1.5 md:gap-2 mt-1 sm:mt-2">
                                    {suite.features.slice(0, 3).map((feature, i) => (
                                      <span key={i} className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded text-[8px] sm:text-[10px] md:text-xs font-medium bg-secondary text-secondary-foreground">
                                        <Check className="h-2 w-2 sm:h-2.5 sm:w-2.5 md:h-3 md:w-3 text-primary" />
                                        {feature}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div className="text-sm sm:text-base md:text-xl font-bold text-primary">${minPrice}</div>
                                <div className="text-[10px] sm:text-xs text-muted-foreground">{availableSeats.length} avail</div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Seats Grid */}
                          <div className="p-2 sm:p-3 md:p-4">
                            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1 sm:gap-1.5 md:gap-2">
                              {[...suite.seats].sort((a, b) => naturalSort(a.seatNumber, b.seatNumber)).map((seat) => {
                                const isSelected = guestSelectedSeats.has(seat.id)
                                const isAvailable = seat.status === 'AVAILABLE'
                                const isReserved = seat.status === 'RESERVED'
                                const isSold = seat.status === 'SOLD'
                                
                                return (
                                  <button
                                    key={seat.id}
                                    type="button"
                                    onClick={() => isAvailable && toggleGuestSeat(seat.id)}
                                    disabled={!isAvailable}
                                    className={`
                                      relative aspect-square rounded sm:rounded-lg text-[10px] sm:text-xs font-bold transition-all duration-200 flex flex-col items-center justify-center
                                      ${
                                        isSelected
                                          ? 'bg-primary text-primary-foreground shadow-lg scale-105 ring-1 sm:ring-2 ring-primary/50'
                                          : isReserved
                                            ? 'bg-yellow-500/20 text-yellow-600 border border-yellow-500 cursor-not-allowed'
                                            : isSold
                                              ? 'bg-muted text-muted-foreground/30 cursor-not-allowed'
                                              : 'bg-background text-foreground border border-border hover:border-primary/50 hover:scale-105'
                                      }
                                    `}
                                  >
                                    <div className="text-[10px] sm:text-xs font-bold">{seat.seatNumber}</div>
                                    <div className={`text-[8px] sm:text-[9px] ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                                      ${seat.sellingPrice}
                                    </div>
                                    {isSelected && (
                                      <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 bg-green-500 text-white rounded-full p-0.5">
                                        <Check className="h-1.5 w-1.5 sm:h-2 sm:w-2" weight="bold" />
                                      </div>
                                    )}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Payment Section - Shows when seats are selected */}
                {guestSelectedSeats.size > 0 && (
                  <div className="space-y-2 sm:space-y-3 md:space-y-4">
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 md:mb-4">
                      <div className="bg-primary p-1.5 sm:p-2 rounded-md sm:rounded-lg">
                        <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 text-primary-foreground" weight="bold" />
                      </div>
                      <h3 className="text-sm sm:text-base md:text-lg font-bold">Payment Details</h3>
                    </div>
                    
                    <div className="bg-muted/30 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 border border-border space-y-2 sm:space-y-3 md:space-y-4">
                      {/* Order Summary */}
                      <div className="pb-2 sm:pb-3 md:pb-4 border-b border-border space-y-1 sm:space-y-2">
                        <p className="font-medium text-[10px] sm:text-xs md:text-sm text-muted-foreground">Selected Seats:</p>
                        {event.suites.map(suite => {
                          const selectedSeatsInSuite = suite.seats.filter(s => guestSelectedSeats.has(s.id))
                          if (selectedSeatsInSuite.length === 0) return null
                          return (
                            <div key={suite.id} className="flex items-center justify-between py-0.5 sm:py-1">
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-xs sm:text-sm truncate">{suite.name}</p>
                                <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground truncate">
                                  {selectedSeatsInSuite.map(s => s.seatNumber).join(', ')}
                                </p>
                              </div>
                              <p className="font-bold text-primary text-xs sm:text-sm md:text-base ml-2">
                                ${selectedSeatsInSuite.reduce((sum, s) => sum + s.sellingPrice, 0)}
                              </p>
                            </div>
                          )
                        })}
                        <div className="flex items-center justify-between pt-1 sm:pt-2 border-t border-border">
                          <span className="font-medium text-xs sm:text-sm">Subtotal ({guestSelectedSeats.size} seats)</span>
                          <span className="text-sm sm:text-lg md:text-xl font-bold text-primary">${getGuestSelectedTotal()}</span>
                        </div>
                      </div>
                      
                      {/* Donation Option */}
                      <div className="pt-2 sm:pt-3 md:pt-4 border-t border-border">
                        <Label className="text-[10px] sm:text-xs md:text-sm font-medium text-muted-foreground mb-1.5 sm:mb-2 md:mb-3 block">Add a Donation (Optional)</Label>
                        <div className="flex gap-1 sm:gap-1.5 md:gap-2">
                          {[0, 5, 10, 25].map((amount) => (
                            <Button
                              key={amount}
                              type="button"
                              variant={(bookingForm.donation || 0) === amount ? 'default' : 'outline'}
                              size="sm"
                              className="h-7 sm:h-8 md:h-9 px-2 sm:px-3 text-[10px] sm:text-xs md:text-sm"
                              onClick={() => {
                                setBookingForm({...bookingForm, donation: amount})
                                // Reset payment form when donation changes
                                setShowPaymentForm(false)
                                setClientSecret(null)
                              }}
                            >
                              ${amount}
                            </Button>
                          ))}
                        </div>
                      </div>
                      
                      {/* Total */}
                      <div className="pt-2 sm:pt-3 md:pt-4 border-t border-border">
                        <div className="flex items-center justify-between text-sm sm:text-base md:text-lg font-bold">
                          <span>Total</span>
                          <span className="text-base sm:text-xl md:text-2xl text-primary">
                            ${getGuestSelectedTotal() + (bookingForm.donation || 0)}
                          </span>
                        </div>
                      </div>

                      {/* Stripe Payment Form */}
                      {showPaymentForm && clientSecret ? (
                        <div className="pt-2 sm:pt-3 md:pt-4 border-t border-border">
                          <Elements
                            stripe={stripePromise}
                            options={{
                              clientSecret,
                              appearance: {
                                theme: 'night',
                                variables: {
                                  colorPrimary: '#9333ea',
                                  colorBackground: '#1f2937',
                                  colorText: '#ffffff',
                                  colorDanger: '#ef4444',
                                  fontFamily: 'system-ui, sans-serif',
                                  borderRadius: '8px',
                                },
                              },
                            }}
                          >
                            <GuestStripePaymentForm
                              total={getGuestSelectedTotal() + (bookingForm.donation || 0)}
                              onSuccess={handlePaymentSuccess}
                              onError={handlePaymentError}
                              paymentIntentId={paymentIntentId || ''}
                            />
                          </Elements>
                        </div>
                      ) : (
                        <div className="pt-2 sm:pt-3 md:pt-4">
                          <Button
                            type="submit"
                            size="lg"
                            className="w-full text-xs sm:text-sm md:text-lg h-10 sm:h-12 md:h-14 font-bold"
                            disabled={isCreatingIntent || guestSelectedSeats.size === 0 || !bookingForm.firstName || !bookingForm.lastName || !bookingForm.email || !bookingForm.phone}
                          >
                            {isCreatingIntent ? (
                              <span className="flex items-center gap-1.5 sm:gap-2">
                                <div className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                Initializing...
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 sm:gap-2">
                                <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                                Continue to Payment
                              </span>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-center gap-2 sm:gap-3 md:gap-4 text-[10px] sm:text-xs text-muted-foreground">
                  <span className="flex items-center gap-0.5 sm:gap-1">
                    <Check className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                    Secure Payment
                  </span>
                  <span className="flex items-center gap-0.5 sm:gap-1">
                    <Check className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                    Instant Confirmation
                  </span>
                </div>

                <p className="text-center text-[10px] sm:text-xs md:text-sm text-muted-foreground">
                  Already have an account?{' '}
                  <Link href="/home?auth=login" className="text-primary hover:underline font-medium">
                    Sign in to book faster
                  </Link>
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Logged-in user view (existing code)
  return (
    <div className="min-h-screen pb-20 sm:pb-32 md:pb-40">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 w-full border-b border-border">
        <div className="max-w-5xl mx-auto flex h-12 sm:h-14 md:h-16 items-center justify-between px-2 sm:px-4">
          <Link href="/calendar">
            <Button variant="ghost" size="sm" className="gap-1 sm:gap-2 text-muted-foreground hover:text-foreground h-7 sm:h-8 md:h-9 px-2 sm:px-3 text-xs sm:text-sm">
              <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
          </Link>
          <div className="font-semibold text-foreground text-xs sm:text-sm md:text-base opacity-0 transition-opacity duration-300 sm:opacity-100 truncate max-w-[150px] sm:max-w-none">
            {event.name}
          </div>
          <div className="w-12 sm:w-16 md:w-24" /> {/* Spacer for balance */}
        </div>
      </div>

      <div className="px-2 sm:px-4 py-4 sm:py-8 md:py-12 max-w-5xl mx-auto">
        {/* Hero Section */}
        <div className="mb-6 sm:mb-10 md:mb-16 text-center space-y-3 sm:space-y-5 md:space-y-8 relative">
          
          <div className="relative space-y-2 sm:space-y-4 md:space-y-6">
            <Badge variant="outline" className="border-primary/30 text-primary px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 text-[10px] sm:text-xs md:text-sm uppercase tracking-wider bg-primary/5">
              VIP Access Only
            </Badge>
            
            <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-7xl font-black tracking-tight text-foreground drop-shadow-sm px-2">
              {event.name}
            </h1>

            <div className="flex flex-wrap justify-center gap-2 sm:gap-3 md:gap-x-8 md:gap-y-4 text-xs sm:text-sm md:text-lg text-muted-foreground">
              <div className="flex items-center gap-1.5 sm:gap-2 md:gap-2.5 bg-card px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-full border border-border shadow-sm">
                <CalendarBlank className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 text-primary" />
                <span className="font-medium text-foreground">{format(new Date(event.date), 'MMM d, yyyy')}</span>
                <span className="text-muted-foreground/50 hidden sm:inline">|</span>
                <span className="hidden sm:inline">{format(new Date(event.date), 'h:mm a')}</span>
              </div>
              
              <div className="flex items-center gap-1.5 sm:gap-2 md:gap-2.5 bg-card px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-full border border-border shadow-sm">
                <MapPin className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 text-primary" />
                <span className="font-medium text-foreground truncate max-w-[100px] sm:max-w-none">{event.venue}</span>
              </div>
            </div>

            <p className="max-w-2xl mx-auto text-xs sm:text-sm md:text-lg text-muted-foreground leading-relaxed px-2">
              {event.description}
            </p>
            {/* Dual Video Section for Authenticated User */}
            <div className="max-w-4xl mx-auto pt-6">
              <EventDualVideo />
            </div>
          </div>
        </div>

        {/* Suites List */}
        <div className="space-y-4 sm:space-y-8 md:space-y-12">
          <div className="flex items-center justify-between border-b border-border pb-2 sm:pb-3 md:pb-4">
            <h2 className="text-sm sm:text-lg md:text-2xl font-bold text-foreground">Available Suites</h2>
            <div className="hidden sm:flex gap-3 sm:gap-4 md:gap-6 text-[10px] sm:text-xs md:text-sm font-medium">
              <div className="flex items-center gap-1 sm:gap-2">
                <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-muted-foreground/30" />
                <span className="text-muted-foreground">Available</span>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                <span className="text-foreground">Selected</span>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-muted border border-border" />
                <span className="text-muted-foreground/50">Sold</span>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:gap-5 md:gap-8">
            {event.suites.map((suite) => (
              <SuiteCard
                key={suite.id}
                suite={suite}
                selectedSeats={selectedSeats}
                onToggleSeat={toggleSeat}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Floating Action Bar */}
      <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl transition-all duration-500 z-50 ${selectedSeats.size > 0 ? 'translate-y-0 opacity-100' : 'translate-y-32 opacity-0'}`}>
        <div className="bg-card/90 backdrop-blur-xl border border-border p-2 sm:p-3 md:p-4 rounded-xl sm:rounded-2xl shadow-2xl ring-1 ring-border flex items-center justify-between gap-2 sm:gap-4 md:gap-6">
          <div className="flex items-center gap-2 sm:gap-3 md:gap-5 pl-1 sm:pl-2">
            <div className="bg-primary p-1.5 sm:p-2 md:p-3 rounded-lg sm:rounded-xl shadow-lg shadow-primary/20">
              <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-primary-foreground" />
            </div>
            <div>
              <p className="text-[8px] sm:text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wider">Total</p>
              <div className="flex items-baseline gap-1 sm:gap-2">
                <span className="text-base sm:text-xl md:text-2xl font-bold text-foreground tracking-tight">
                  ${getSelectedTotal().toLocaleString()}
                </span>
                <span className="text-[10px] sm:text-xs md:text-sm text-muted-foreground font-medium">
                  ({selectedSeats.size})
                </span>
              </div>
            </div>
          </div>
          
          <Button
            size="lg"
            className="px-3 sm:px-5 md:px-8 h-9 sm:h-11 md:h-14 text-xs sm:text-sm md:text-base font-bold rounded-lg sm:rounded-xl shadow-xl transition-all hover:scale-[1.02]"
            onClick={handleReserve}
            disabled={isReserving}
          >
            {isReserving ? (
              <span className="flex items-center gap-1 sm:gap-2">
                <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span className="hidden sm:inline">Processing...</span>
              </span>
            ) : (
              'Checkout'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

function SuiteCard({
  suite,
  selectedSeats,
  onToggleSeat,
}: {
  suite: Suite
  selectedSeats: Set<string>
  onToggleSeat: (seatId: string) => void
}) {
  const availableSeats = suite.seats.filter((s) => s.status === 'AVAILABLE')
  const minPrice = Math.min(...suite.seats.map((s) => s.sellingPrice))
  
  return (
    <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl md:rounded-3xl border border-border bg-card transition-all duration-300 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5">
      <div className="grid lg:grid-cols-12 gap-3 sm:gap-5 md:gap-8 p-2 sm:p-4 md:p-8">
        {/* Left: Info */}
        <div className="lg:col-span-5 space-y-2 sm:space-y-4 flex flex-col justify-center">
          {suite.audienceType && (
            <span className="inline-flex items-center gap-0.5 sm:gap-1 md:gap-1.5 px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 rounded-full text-[8px] sm:text-[10px] md:text-xs font-medium bg-secondary text-secondary-foreground border border-border w-fit">
              {suite.audienceType === 'HOME' ? 'Home' : 'Visitor'}
            </span>
          )}
          <div>
            <h3 className="text-base sm:text-xl md:text-3xl font-bold text-foreground mb-1 sm:mb-2">{suite.name}</h3>
            <p className="text-[10px] sm:text-xs md:text-base text-muted-foreground leading-relaxed line-clamp-2 sm:line-clamp-none">{suite.description}</p>
          </div>
          
          {/* Audience Type Badge styled like feature badges */}
          {/* {suite.audienceType && (
            <span className="inline-flex items-center gap-0.5 sm:gap-1 md:gap-1.5 px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 rounded-full text-[8px] sm:text-[10px] md:text-xs font-medium bg-secondary text-secondary-foreground border border-border w-fit">
              {suite.audienceType === 'HOME' ? 'Home Audience' : 'Visitor Audience'}
            </span>
          )} */}

          <div className="flex flex-wrap gap-1 sm:gap-1.5 md:gap-2">
            {suite.features.slice(0, 3).map((feature, i) => (
              <span key={i} className="inline-flex items-center gap-0.5 sm:gap-1 md:gap-1.5 px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 rounded-full text-[8px] sm:text-[10px] md:text-xs font-medium bg-secondary text-secondary-foreground border border-border">
                <Check className="h-2 w-2 sm:h-2.5 sm:w-2.5 md:h-3 md:w-3 text-primary" />
                {feature}
              </span>
            ))}
          </div>

          <div className="pt-2 sm:pt-3 md:pt-4 border-t border-border">
            <div className="flex items-baseline gap-1 sm:gap-2">
              <span className="text-lg sm:text-2xl md:text-3xl font-bold text-primary">${minPrice}</span>
              <span className="text-[10px] sm:text-xs md:text-base text-muted-foreground font-medium">/ seat</span>
            </div>
            <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mt-0.5 sm:mt-1">
              {availableSeats.length} seats available
            </p>
          </div>
        </div>

        {/* Right: Seat Map */}
        <div className="lg:col-span-7 bg-muted/30 rounded-lg sm:rounded-xl md:rounded-2xl p-2 sm:p-4 md:p-6 border border-border">
          <div className="mb-2 sm:mb-3 md:mb-4 flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4 text-[10px] sm:text-xs">
            <span className="text-[10px] sm:text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-wider">Select Seats</span>
            <div className="h-px flex-1 bg-border mx-1 sm:mx-2 hidden sm:block" />
            <div className="flex items-center gap-0.5 sm:gap-1">
              <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-background border border-border"></div>
              <span className="text-muted-foreground">Avail</span>
            </div>
            <div className="flex items-center gap-0.5 sm:gap-1">
              <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-primary"></div>
              <span className="text-muted-foreground">Selected</span>
            </div>
            <div className="hidden sm:flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-yellow-500/30 border border-yellow-500"></div>
              <span className="text-muted-foreground">Reserved</span>
            </div>
            <div className="flex items-center gap-0.5 sm:gap-1">
              <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-muted"></div>
              <span className="text-muted-foreground">Sold</span>
            </div>
          </div>
          
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1 sm:gap-2 md:gap-3">
            {[...suite.seats].sort((a, b) => naturalSort(a.seatNumber, b.seatNumber)).map((seat) => {
              const isSelected = selectedSeats.has(seat.id)
              const isAvailable = seat.status === 'AVAILABLE'
              const isReserved = seat.status === 'RESERVED'
              const isSold = seat.status === 'SOLD'

              return (
                <button
                  key={seat.id}
                  onClick={() => isAvailable && onToggleSeat(seat.id)}
                  disabled={!isAvailable}
                  className={`
                    relative group/seat aspect-square rounded sm:rounded-lg md:rounded-xl text-[10px] sm:text-xs font-bold transition-all duration-300 flex items-center justify-center
                    ${
                      isSelected
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-110 z-10 ring-1 sm:ring-2 ring-primary/50'
                        : isReserved
                        ? 'bg-yellow-500/20 text-yellow-600 border sm:border-2 border-yellow-500 cursor-not-allowed'
                        : isSold
                        ? 'bg-muted text-muted-foreground/30 cursor-not-allowed border border-transparent'
                        : 'bg-background text-muted-foreground hover:bg-primary/10 hover:text-primary hover:scale-105 border border-border hover:border-primary/30'
                    }
                  `}
                >
                  {seat.seatNumber.replace(suite.name.split(' ').pop() || '', '')}
                  {isAvailable && !isSelected && (
                    <div className="absolute inset-0 rounded sm:rounded-lg md:rounded-xl ring-1 ring-inset ring-transparent group-hover/seat:ring-primary/20 transition-all" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
