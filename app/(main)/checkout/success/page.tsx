'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  CheckCircle,
  Ticket,
  CalendarBlank,
  ArrowRight,
  Confetti,
  Envelope,
  Key,
  Info,
} from '@phosphor-icons/react'
import confetti from 'canvas-confetti'

export default function PaymentSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const [orderNumber, setOrderNumber] = useState<string | null>(null)
  const isGuest = searchParams.get('guest') === 'true'

  useEffect(() => {
    // Get payment intent ID from URL if redirected from Stripe
    const paymentIntent = searchParams.get('payment_intent')
    const redirectStatus = searchParams.get('redirect_status')

    if (redirectStatus === 'succeeded' || isGuest) {
      // Trigger confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#9333ea', '#a855f7', '#c084fc', '#e879f9'],
      })

      // You could fetch order details using paymentIntent ID
      if (paymentIntent) {
        setOrderNumber(paymentIntent.slice(-8).toUpperCase())
      }
    } else {
      // Trigger confetti anyway for direct navigation
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#9333ea', '#a855f7', '#c084fc', '#e879f9'],
      })
    }
  }, [searchParams, isGuest])

  return (
    <div className="max-w-2xl mx-auto py-12">
      <Card className="bg-gray-800/50 border-gray-700 overflow-hidden">
        {/* Success Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-8 text-center">
          <div className="w-20 h-20 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-12 h-12 text-white" weight="fill" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Payment Successful!
          </h1>
          <p className="text-purple-100">
            Thank you for your purchase. Your tickets are confirmed!
          </p>
        </div>

        <CardContent className="p-8 space-y-6">
          {/* Order Info */}
          {orderNumber && (
            <div className="bg-gray-700/50 rounded-lg p-4 text-center">
              <p className="text-gray-400 text-sm">Order Reference</p>
              <p className="text-2xl font-mono font-bold text-purple-400">
                HF-{orderNumber}
              </p>
            </div>
          )}

          {/* Important Notice for Guest Users */}
          {(isGuest || !session) && (
            <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-xl p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <Envelope className="w-6 h-6 text-green-400" weight="bold" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-green-400 flex items-center gap-2">
                    <Info className="w-5 h-5" weight="fill" />
                    Important: Check Your Email!
                  </h3>
                  <p className="text-gray-300 mt-2 leading-relaxed">
                    We have created an account for you and sent your <strong className="text-white">login credentials</strong> to your email address.
                  </p>
                  <div className="mt-4 p-4 bg-gray-800/50 rounded-lg space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Key className="w-4 h-4 text-yellow-400" weight="fill" />
                      <span className="text-gray-400">Your email contains:</span>
                    </div>
                    <ul className="text-sm text-gray-300 space-y-1 ml-6">
                      <li>• Your login email address</li>
                      <li>• Your secure password</li>
                      <li>• Order confirmation details</li>
                      <li>• Ticket information</li>
                    </ul>
                  </div>
                  <p className="text-sm text-yellow-400 mt-3 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
                    Use these credentials to log in and view your tickets anytime!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Next Steps */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Confetti className="h-5 w-5 text-purple-400" />
              What&apos;s Next?
            </h2>

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-gray-700/30 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-purple-600/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-400 font-bold">1</span>
                </div>
                <div>
                  <p className="font-medium text-white">
                    Check your email
                  </p>
                  <p className="text-sm text-gray-400">
                    We&apos;ve sent your tickets and order confirmation to your
                    email address.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-700/30 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-purple-600/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-400 font-bold">2</span>
                </div>
                <div>
                  <p className="font-medium text-white">View your tickets</p>
                  <p className="text-sm text-gray-400">
                    Access your tickets anytime from your account.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-700/30 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-purple-600/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-400 font-bold">3</span>
                </div>
                <div>
                  <p className="font-medium text-white">
                    Arrive at the venue
                  </p>
                  <p className="text-sm text-gray-400">
                    Show your ticket QR code at the entrance for quick access.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            {session ? (
              <>
                <Link href="/my-tickets" className="flex-1">
                  <Button className="w-full bg-purple-600 hover:bg-purple-700 gap-2">
                    <Ticket className="h-5 w-5" />
                    View My Tickets
                  </Button>
                </Link>
                <Link href="/calendar" className="flex-1">
                  <Button
                    variant="outline"
                    className="w-full border-gray-600 text-gray-300 hover:bg-gray-700 gap-2"
                  >
                    <CalendarBlank className="h-5 w-5" />
                    Browse More Events
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/" className="flex-1">
                  <Button className="w-full bg-green-600 hover:bg-green-700 gap-2">
                    <Key className="h-5 w-5" />
                    Login to Your Account
                  </Button>
                </Link>
                <Link href="/" className="flex-1">
                  <Button
                    variant="outline"
                    className="w-full border-gray-600 text-gray-300 hover:bg-gray-700 gap-2"
                  >
                    <CalendarBlank className="h-5 w-5" />
                    Browse More Events
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Continue Shopping */}
          <div className="text-center pt-4">
            {session ? (
              <Link
                href="/dashboard"
                className="text-purple-400 hover:text-purple-300 inline-flex items-center gap-1 text-sm"
              >
                Go to Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <p className="text-gray-500 text-sm">
                Didn't receive the email? Check your spam folder or contact support.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
