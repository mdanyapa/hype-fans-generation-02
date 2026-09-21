'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { format, differenceInSeconds } from 'date-fns'
import {
  ArrowLeft,
  CreditCard,
  ShoppingCart,
  Check,
  Warning,
} from '@phosphor-icons/react'

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface CartItem {
  reservationId: string
  seatId: string
  seatNumber: string
  suiteName: string
  eventName: string
  eventDate: string
  price: number
  expiresAt: string
}

// Stripe Payment Form Component
function StripePaymentForm({
  total,
  onSuccess,
  paymentIntentId,
}: {
  total: number
  onSuccess: () => void
  paymentIntentId: string
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsProcessing(true)
    setErrorMessage(null)

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/success`,
        },
        redirect: 'if_required',
      })

      if (error) {
        setErrorMessage(error.message || 'An error occurred')
        toast.error(error.message || 'Payment failed')
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Confirm payment and create order
        try {
          const confirmRes = await fetch('/api/stripe/confirm-payment', {
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
        
        toast.success('Payment successful!')
        onSuccess()
      }
    } catch {
      setErrorMessage('An unexpected error occurred')
      toast.error('Payment failed. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 md:space-y-6">
      <PaymentElement
        options={{
          layout: 'accordion',
        }}
      />

      {errorMessage && (
        <div className="p-2 sm:p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-xs sm:text-sm">
          {errorMessage}
        </div>
      )}

      <Button
        type="submit"
        className="w-full bg-purple-600 hover:bg-purple-700 h-10 sm:h-12 text-sm sm:text-lg gap-1.5 sm:gap-2"
        disabled={!stripe || isProcessing}
      >
        {isProcessing ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-t-2 border-b-2 border-white" />
            Processing...
          </>
        ) : (
          <>
            <Check className="h-4 w-4 sm:h-5 sm:w-5" />
            Pay ${total.toFixed(2)}
          </>
        )}
      </Button>

      <p className="text-[10px] sm:text-xs text-gray-500 text-center">
        Secure payment powered by Stripe
      </p>
    </form>
  )
}

export default function CheckoutPage() {
  const router = useRouter()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [donation, setDonation] = useState(0)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null)
  const [isCreatingIntent, setIsCreatingIntent] = useState(false)

  const subtotal = cartItems.reduce((sum, item) => sum + item.price, 0)
  const total = subtotal + donation

  // Fetch cart items
  useEffect(() => {
    const fetchCart = async () => {
      try {
        const res = await fetch('/api/reservations')
        if (res.ok) {
          const reservations = await res.json()
          const items: CartItem[] = reservations.map((r: {
            id: string
            seatId: string
            expiresAt: string
            seat: {
              seatNumber: string
              sellingPrice: number
              suite: {
                name: string
                event: {
                  name: string
                  date: string
                }
              }
            }
          }) => ({
            reservationId: r.id,
            seatId: r.seatId,
            seatNumber: r.seat.seatNumber,
            suiteName: r.seat.suite.name,
            eventName: r.seat.suite.event.name,
            eventDate: r.seat.suite.event.date,
            price: r.seat.sellingPrice,
            expiresAt: r.expiresAt,
          }))
          setCartItems(items)

          if (items.length === 0) {
            toast.info('Your cart is empty')
            router.push('/calendar')
          }
        }
      } catch (error) {
        console.error('Failed to fetch cart:', error)
        toast.error('Failed to load cart')
      } finally {
        setIsLoading(false)
      }
    }

    fetchCart()
  }, [router])

  // Create payment intent when cart items or donation changes
  const createPaymentIntent = useCallback(async () => {
    if (cartItems.length === 0) return

    setIsCreatingIntent(true)
    try {
      const res = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationIds: cartItems.map((item) => item.reservationId),
          donation,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Failed to initialize payment')
        if (data.error?.includes('expired')) {
          router.push('/calendar')
        }
        return
      }

      setClientSecret(data.clientSecret)
      setPaymentIntentId(data.paymentIntentId)
    } catch (error) {
      console.error('Failed to create payment intent:', error)
      toast.error('Failed to initialize payment')
    } finally {
      setIsCreatingIntent(false)
    }
  }, [cartItems, donation, router])

  useEffect(() => {
    if (cartItems.length > 0) {
      createPaymentIntent()
    }
  }, [createPaymentIntent])

  // Update countdown timer
  useEffect(() => {
    if (cartItems.length === 0) {
      setCountdown(null)
      return
    }

    const updateCountdown = () => {
      const earliestExpiry = Math.min(
        ...cartItems.map((item) => new Date(item.expiresAt).getTime())
      )
      const secondsLeft = differenceInSeconds(earliestExpiry, new Date())
      setCountdown(secondsLeft > 0 ? secondsLeft : 0)

      if (secondsLeft <= 0) {
        toast.error('Your reservations have expired')
        router.push('/calendar')
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [cartItems, router])

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handlePaymentSuccess = () => {
    router.push('/checkout/success')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 md:space-y-8 px-2 sm:px-4">
      {/* Back button */}
      <Link href="/calendar">
        <Button variant="ghost" className="gap-1.5 sm:gap-2 h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3">
          <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
          Back
        </Button>
      </Link>

      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Checkout</h1>
        {countdown !== null && countdown > 0 && (
          <Badge
            variant="outline"
            className={`text-xs sm:text-sm md:text-lg px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 ${
              countdown < 60
                ? 'border-red-500 text-red-400 animate-pulse'
                : 'border-purple-500 text-purple-400'
            }`}
          >
            {countdown < 60 && <Warning className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />}
            {formatCountdown(countdown)}
          </Badge>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
        {/* Order Summary */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="text-white flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base md:text-lg">
              <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400" />
              Order Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3 md:space-y-4 p-3 sm:p-4 md:p-6 pt-0">
            {[...cartItems].sort((a, b) => naturalSort(a.seatNumber, b.seatNumber)).map((item) => (
              <div
                key={item.reservationId}
                className="flex justify-between items-start py-1 sm:py-2 gap-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-xs sm:text-sm md:text-base truncate">{item.eventName}</p>
                  <p className="text-[10px] sm:text-xs md:text-sm text-gray-400 truncate">
                    {item.suiteName} - #{item.seatNumber}
                  </p>
                  <p className="text-[10px] sm:text-xs text-gray-500">
                    {format(new Date(item.eventDate), 'MMM d, yyyy')}
                  </p>
                </div>
                <span className="text-purple-400 font-semibold text-xs sm:text-sm md:text-base flex-shrink-0">
                  ${item.price}
                </span>
              </div>
            ))}

            <Separator className="bg-gray-700" />

            {/* Donation */}
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-gray-300 text-[10px] sm:text-xs md:text-sm">Donation (optional)</Label>
              <div className="flex gap-1 sm:gap-2">
                {[0, 5, 10, 25].map((amount) => (
                  <Button
                    key={amount}
                    type="button"
                    variant={donation === amount ? 'default' : 'outline'}
                    size="sm"
                    className={`h-7 sm:h-8 md:h-9 px-2 sm:px-3 text-[10px] sm:text-xs md:text-sm ${
                      donation === amount
                        ? 'bg-purple-600'
                        : 'border-gray-600 text-gray-300'
                    }`}
                    onClick={() => setDonation(amount)}
                  >
                    ${amount}
                  </Button>
                ))}
              </div>
            </div>

            <Separator className="bg-gray-700" />

            {/* Totals */}
            <div className="space-y-1 sm:space-y-2">
              <div className="flex justify-between text-gray-400 text-[10px] sm:text-xs md:text-sm">
                <span>Subtotal ({cartItems.length})</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {donation > 0 && (
                <div className="flex justify-between text-gray-400 text-[10px] sm:text-xs md:text-sm">
                  <span>Donation</span>
                  <span>${donation.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base sm:text-lg md:text-xl font-bold">
                <span>Total</span>
                <span className="text-purple-400">${total.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Form */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="text-white flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base md:text-lg">
              <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400" />
              Payment
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
            {isCreatingIntent ? (
              <div className="flex items-center justify-center py-8 sm:py-12">
                <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-t-2 border-b-2 border-purple-500"></div>
              </div>
            ) : clientSecret ? (
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
                <StripePaymentForm
                  total={total}
                  onSuccess={handlePaymentSuccess}
                  paymentIntentId={paymentIntentId || ''}
                />
              </Elements>
            ) : (
              <div className="text-center py-8 sm:py-12 text-gray-400">
                <p className="text-xs sm:text-sm">Unable to load payment form</p>
                <Button
                  variant="outline"
                  className="mt-3 sm:mt-4 h-8 sm:h-9 text-xs sm:text-sm"
                  onClick={createPaymentIntent}
                >
                  Retry
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
