'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { naturalSort } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  Lightning,
  ShoppingCart,
  User,
  CalendarBlank,
  Ticket,
  SignOut,
  Trash,
  Crown,
  List,
} from '@phosphor-icons/react'
import { format, differenceInSeconds } from 'date-fns'
import navLogo from '@/assets/logo.png'

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

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [hasShownExpiryToast, setHasShownExpiryToast] = useState(false)

  // Public routes that don't require authentication
  const publicRoutes = ['/calendar', '/event/', '/checkout']
  const isPublicRoute = publicRoutes.some(route => pathname?.startsWith(route))

  // Redirect if not authenticated (except for public routes)
  useEffect(() => {
    if (status === 'unauthenticated' && !isPublicRoute) {
      router.push('/')
    }
  }, [status, router, isPublicRoute])

  // Fetch reservations (cart items) - only when user is logged in
  const fetchCart = async () => {
    // Skip fetching if no session
    if (!session) return
    
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
        // Reset expiry toast flag when cart is refreshed with valid items
        if (items.length > 0) {
          const earliestExpiry = Math.min(
            ...items.map((item: CartItem) => new Date(item.expiresAt).getTime())
          )
          if (earliestExpiry > Date.now()) {
            setHasShownExpiryToast(false)
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch cart:', error)
    }
  }

  useEffect(() => {
    if (session) {
      fetchCart()
      // Refresh cart every 5 seconds for faster updates
      const interval = setInterval(fetchCart, 5000)
      
      // Listen for custom cart refresh event (triggered after reservation)
      const handleCartRefresh = () => {
        console.log('Cart refresh event received')
        fetchCart()
      }
      window.addEventListener('cart-refresh', handleCartRefresh)
      
      return () => {
        clearInterval(interval)
        window.removeEventListener('cart-refresh', handleCartRefresh)
      }
    }
  }, [session])

  // Update countdown timer
  useEffect(() => {
    if (cartItems.length === 0) {
      setCountdown(null)
      setHasShownExpiryToast(false)
      return
    }

    const updateCountdown = () => {
      const earliestExpiry = Math.min(
        ...cartItems.map((item) => new Date(item.expiresAt).getTime())
      )
      const secondsLeft = differenceInSeconds(earliestExpiry, new Date())
      setCountdown(secondsLeft > 0 ? secondsLeft : 0)

      if (secondsLeft <= 0 && !hasShownExpiryToast) {
        setHasShownExpiryToast(true)
        toast.warning('Some reservations have expired')
        fetchCart()
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [cartItems, hasShownExpiryToast])

  const removeFromCart = async (reservationId: string) => {
    try {
      const res = await fetch(`/api/reservations/${reservationId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        toast.success('Removed from cart')
        fetchCart()
      } else {
        toast.error('Failed to remove item')
      }
    } catch {
      toast.error('Failed to remove item')
    }
  }

  const cartTotal = cartItems.reduce((sum, item) => sum + item.price, 0)

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  // Allow public routes to render without session
  if (!session && isPublicRoute) {
    return (
      <div className="min-h-screen bg-background">
        {children}
      </div>
    )
  }

  if (!session) {
    return null
  }

  const isAdmin = session.user.role === 'ADMIN'

  const navItems = [
    { href: '/calendar', label: 'Events', icon: CalendarBlank },
    { href: '/my-tickets', label: 'My Tickets', icon: Ticket },
    { href: '/profile', label: 'Profile', icon: User },
  ]

  const adminItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Crown },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white print:bg-white print:min-h-0">
      {/* Header - Hidden when printing */}
      <header className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-lg border-b border-gray-800 print:hidden">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            {/* Mobile Menu Toggle - Before Logo */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden h-8 w-8">
                  <List className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="bg-gray-900 border-gray-800 text-white w-[280px] flex flex-col">
                <SheetHeader>
                  <SheetTitle className="text-white flex items-center gap-2">
                    <img src={navLogo.src} alt="HYPEFANZ.VIP" className="h-8 w-auto object-contain" />
                    <span className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-300" style={{ marginLeft: '10px' }}>HYPEFANZ.VIP</span>
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-2 mt-6 flex-1">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                        pathname === item.href
                          ? 'bg-purple-600/20 text-purple-400'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                  ))}
                  {isAdmin &&
                    adminItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                          pathname === item.href
                            ? 'bg-yellow-600/20 text-yellow-400'
                            : 'text-yellow-400 hover:bg-gray-800 hover:text-yellow-300'
                        }`}
                      >
                        <item.icon className="h-5 w-5" weight="fill" />
                        {item.label}
                      </Link>
                    ))}
                </nav>
                
                {/* Bottom Section - User Info & Sign Out */}
                <div className="border-t border-gray-700 pt-4 pb-2 mt-auto">
                  <div className="bg-gray-800/50 rounded-lg p-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-600/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-purple-400">
                          {session?.user?.email?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-400">Signed in as</p>
                        <p className="text-sm text-white font-medium truncate">
                          {session?.user?.email}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    className="w-full justify-center gap-2 py-3 text-red-400 hover:bg-red-600/10 hover:text-red-300 border border-red-500/20 rounded-lg"
                    onClick={() => {
                      setIsMobileMenuOpen(false)
                      signOut({ callbackUrl: '/' })
                    }}
                  >
                    <SignOut className="h-5 w-5" />
                    Sign Out
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            {/* Logo */}
            <Link href="/calendar" className="flex items-center">
              <img src={navLogo.src} alt="HYPEFANZ.VIP" className="h-7 sm:h-8 md:h-10 w-auto object-contain" />
              <span className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-300" style={{ marginLeft: '10px' }}>HYPEFANZ.VIP</span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? 'text-purple-400'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
            {isAdmin &&
              adminItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? 'text-purple-400'
                      : 'text-yellow-400 hover:text-yellow-300'
                  }`}
                >
                  <item.icon className="h-4 w-4" weight="fill" />
                  {item.label}
                </Link>
              ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Cart */}
            <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <ShoppingCart className="h-5 w-5" />
                  {cartItems.length > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-purple-600">
                      {cartItems.length}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="bg-gray-900 border-gray-800 text-white w-[85vw] sm:w-full sm:max-w-md p-0">
                <div className="p-4 sm:p-6 border-b border-gray-800">
                  <SheetHeader>
                    <SheetTitle className="text-white flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5 text-purple-400" />
                        <span className="text-base sm:text-lg font-bold">Your Cart</span>
                      </div>
                      {countdown !== null && countdown > 0 && (
                        <Badge
                          variant="outline"
                          className={`text-[10px] sm:text-xs px-2 py-1 ${
                            countdown < 60 ? 'border-red-500 text-red-400 animate-pulse' : 'border-purple-500 text-purple-400'
                          }`}
                        >
                          ⏱️ {formatCountdown(countdown)}
                        </Badge>
                      )}
                    </SheetTitle>
                  </SheetHeader>
                  {cartItems.length > 0 && (
                    <p className="text-xs text-gray-400 mt-2">{cartItems.length} item{cartItems.length > 1 ? 's' : ''} in your cart</p>
                  )}
                </div>
                
                <ScrollArea className="h-[calc(100vh-280px)] sm:h-[calc(100vh-300px)]">
                  <div className="p-4 sm:p-6">
                    {cartItems.length === 0 ? (
                      <div className="text-center py-12 sm:py-16">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                          <ShoppingCart className="h-8 w-8 sm:h-10 sm:w-10 text-gray-600" />
                        </div>
                        <p className="text-sm sm:text-base text-gray-400 font-medium">Your cart is empty</p>
                        <p className="text-xs sm:text-sm text-gray-500 mt-1">Add some VIP seats to get started</p>
                      </div>
                    ) : (
                      <div className="space-y-3 sm:space-y-4">
                        {[...cartItems].sort((a, b) => naturalSort(a.seatNumber, b.seatNumber)).map((item) => (
                          <div
                            key={item.reservationId}
                            className="bg-gray-800/70 rounded-xl p-3 sm:p-4 border border-gray-700/50 hover:border-purple-500/30 transition-colors"
                          >
                            <div className="flex justify-between items-start gap-3">
                              <div className="min-w-0 flex-1">
                                <h4 className="font-semibold text-sm sm:text-base text-white truncate">{item.eventName}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-[10px] sm:text-xs border-purple-500/30 text-purple-400 px-2">
                                    {item.suiteName}
                                  </Badge>
                                  <span className="text-[10px] sm:text-xs text-gray-400">Seat #{item.seatNumber}</span>
                                </div>
                                <p className="text-[10px] sm:text-xs text-gray-500 mt-1.5">
                                  📅 {format(new Date(item.eventDate), 'MMM d, yyyy • h:mm a')}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-gray-400 hover:text-red-400 hover:bg-red-400/10 h-7 w-7 sm:h-8 sm:w-8 rounded-full"
                                  onClick={() => removeFromCart(item.reservationId)}
                                >
                                  <Trash className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                </Button>
                                <span className="text-purple-400 font-bold text-sm sm:text-base">
                                  ${item.price}
                                </span>
                              </div>
                            </div>
                        </div>
                      ))}
                    </div>
                  )}
                  </div>
                </ScrollArea>
                
                {cartItems.length > 0 && (
                  <div className="p-4 sm:p-6 border-t border-gray-800 bg-gray-900/95 backdrop-blur-sm">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <span className="text-xs sm:text-sm text-gray-400">Total Amount</span>
                        <p className="text-xl sm:text-2xl font-bold text-white">
                          ${cartTotal.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-gray-500">{cartItems.length} seat{cartItems.length > 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    <Button
                      className="w-full bg-purple-600 hover:bg-purple-700 h-11 sm:h-12 text-sm sm:text-base font-semibold rounded-xl shadow-lg shadow-purple-600/20"
                      onClick={() => {
                        setIsCartOpen(false)
                        router.push('/checkout')
                      }}
                    >
                      Proceed to Checkout
                    </Button>
                    <p className="text-[10px] sm:text-xs text-gray-500 text-center mt-3">
                      🔒 Secure checkout powered by Stripe
                    </p>
                  </div>
                )}
              </SheetContent>
            </Sheet>

            {/* User menu - hidden on mobile, shown in mobile menu */}
            <div className="hidden md:flex items-center gap-2">
              <span className="text-sm text-gray-400 hidden sm:block">
                {session.user.email}
              </span>
              {isAdmin && (
                <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-600 text-[10px] sm:text-xs">
                  ADMIN
                </Badge>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => signOut({ callbackUrl: '/' })}
              >
                <SignOut className="h-5 w-5" />
              </Button>
            </div>
            {/* Mobile: Show admin badge only */}
            {isAdmin && (
              <Badge className="md:hidden bg-yellow-600/20 text-yellow-400 border-yellow-600 text-[10px]">
                ADMIN
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
