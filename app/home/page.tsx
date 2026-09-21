
'use client'

import { useRef, useState, useEffect } from 'react'
import { Suspense } from 'react'
import { Play, Pause } from '@phosphor-icons/react'

// Custom video player with glassy play/pause button
function VideoWithCustomControl({ src, borderColor, shadowColor }: { src: string, borderColor: string, shadowColor: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [showButton, setShowButton] = useState(true)
  const hideTimeout = useRef<NodeJS.Timeout | null>(null)

  const handleToggle = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play()
      setPlaying(true)
      // Hide button after short delay
      hideTimeout.current = setTimeout(() => setShowButton(false), 600)
    } else {
      video.pause()
      setPlaying(false)
      setShowButton(true)
    }
  }

  // Sync state if user clicks video directly
  const handlePlay = () => {
    setPlaying(true)
    hideTimeout.current = setTimeout(() => setShowButton(false), 600)
  }
  const handlePause = () => {
    setPlaying(false)
    setShowButton(true)
  }

  // Show button on mouse move/enter, hide after delay if playing
  const handleMouseMove = () => {
    setShowButton(true)
    if (playing) {
      if (hideTimeout.current) clearTimeout(hideTimeout.current)
      hideTimeout.current = setTimeout(() => setShowButton(false), 1200)
    }
  }

  // Clean up timeout on unmount
  useEffect(() => {
    return () => { if (hideTimeout.current) clearTimeout(hideTimeout.current) }
  }, [])

  return (
    <div
      className={`relative w-full sm:w-[420px] max-w-lg rounded-2xl overflow-hidden shadow-xl border bg-black/70 backdrop-blur-md border-${borderColor}`}
      style={{ boxShadow: `0 0 40px 0 ${shadowColor}` }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseMove}
      onMouseLeave={() => playing && setShowButton(false)}
    >
      <video
        ref={videoRef}
        src={src}
        loop
        muted
        playsInline
        className="w-full h-[260px] sm:h-[340px] object-cover bg-black select-none"
        onPlay={handlePlay}
        onPause={handlePause}
        style={{ cursor: 'pointer' }}
        tabIndex={-1}
      />
      <button
        onClick={handleToggle}
        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 bg-white/10 hover:bg-white/20 border border-white/30 backdrop-blur-lg rounded-full p-4 shadow-lg transition-all duration-300 flex items-center justify-center ${showButton ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{
          boxShadow: '0 4px 32px 0 rgba(0,0,0,0.18)',
          borderWidth: 1.5,
        }}
        aria-label={playing ? 'Pause video' : 'Play video'}
      >
        {playing ? (
          <Pause className="h-8 w-8 text-white drop-shadow" weight="fill" />
        ) : (
          <Play className="h-8 w-8 text-white drop-shadow" weight="fill" />
        )}
      </button>
    </div>
  )
}

import { signIn, useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Lightning, Ticket, Crown, Users, Star } from '@phosphor-icons/react'
import navLogo from '@/assets/logo.png'
import EventCalendar from '@/components/EventCalendar'

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-gray-900 to-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    }>
      <HomePageContent />
    </Suspense>
  )
}

function HomePageContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Form state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [registerEmail, setRegisterEmail] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('')

  // Check for auth query parameter to auto-open dialogs
  useEffect(() => {
    const auth = searchParams.get('auth')
    if (auth === 'login') {
      setIsLoginOpen(true)
    } else if (auth === 'register') {
      setIsRegisterOpen(true)
    }
  }, [searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        email: loginEmail,
        password: loginPassword,
        redirect: false,
      })

      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success('Welcome back!')
        setIsLoginOpen(false)
        router.push('/calendar')
      }
    } catch {
      toast.error('An error occurred during login')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    if (registerPassword !== registerConfirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (registerPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: registerEmail,
          password: registerPassword,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Registration failed')
        return
      }

      toast.success('Account created! Please sign in.')
      setIsRegisterOpen(false)
      setIsLoginOpen(true)
      setLoginEmail(registerEmail)
    } catch {
      toast.error('An error occurred during registration')
    } finally {
      setIsLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-gray-900 to-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-black text-white">
      
      {/* Header */}
      <header className="container mx-auto px-4 py-4 sm:py-6 flex justify-between items-center">
        <div className="flex items-center">
          <img src={navLogo.src} alt="HYPEFANZ.VIP" className="h-7 sm:h-8 md:h-10 w-auto object-contain" />
          <span className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-300" style={{ marginLeft: '10px' }}>HYPEFANZ.VIP</span>
        </div>
        <div className="flex gap-2 sm:gap-4">
          <Dialog open={isLoginOpen} onOpenChange={setIsLoginOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" className="text-white hover:text-purple-400 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-4">
                Sign In
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-800">
              <DialogHeader>
                <DialogTitle className="text-white">Welcome Back</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Sign in to access your VIP tickets
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-white">
                    Email
                  </Label>
                  <Input
                    id="login-email"
                    type="text"
                    placeholder="email@example.com or username"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-white">
                    Password
                  </Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700 text-xs sm:text-sm h-8 sm:h-9 px-3 sm:px-4">
                Get Started
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-800">
              <DialogHeader>
                <DialogTitle className="text-white">Create Account</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Join HYPEFANZ.VIP for exclusive access
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-email" className="text-white">
                    Email
                  </Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="email@example.com"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    required
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password" className="text-white">
                    Password
                  </Label>
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="At least 6 characters"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    required
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-confirm" className="text-white">
                    Confirm Password
                  </Label>
                  <Input
                    id="register-confirm"
                    type="password"
                    placeholder="Confirm your password"
                    value={registerConfirmPassword}
                    onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                    required
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  disabled={isLoading}
                >
                  {isLoading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-10 sm:py-16 md:py-20">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold mb-4 sm:mb-6">
            <span className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
              HYPEFANZ.VIP Experience
            </span>
            <br />
            at Crypto.com Arena
          </h1>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-300 mb-6 sm:mb-8 max-w-2xl mx-auto px-2">
            Get exclusive access to premium VIP suites for concerts, sports, and entertainment events.
            Experience events like never before with HYPEFANZ.VIP.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 sm:px-0">
            <Button
              size="lg"
              className="bg-purple-600 hover:bg-purple-700 text-sm sm:text-base md:text-lg px-6 sm:px-8 h-10 sm:h-11 md:h-12 w-full sm:w-auto"
              onClick={() => setIsRegisterOpen(true)}
            >
              Get Started
            </Button>
            <Link href="/calendar" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="border-purple-500 text-purple-400 hover:bg-purple-500/10 text-sm sm:text-base md:text-lg px-6 sm:px-8 h-10 sm:h-11 md:h-12 w-full"
              >
                Browse Events
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8 mt-12 sm:mt-16 md:mt-24">
          <div className="bg-gray-800/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 border border-gray-700">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-600/20 rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4">
              <Crown className="h-5 w-5 sm:h-6 sm:w-6 text-purple-400" weight="fill" />
            </div>
            <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-1.5 sm:mb-2">VIP Suites</h3>
            <p className="text-xs sm:text-sm md:text-base text-gray-400">
              Enjoy events from luxurious private suites with premium amenities, dedicated servers, and the best views in the house.
            </p>
          </div>
          <div className="bg-gray-800/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 border border-gray-700">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-600/20 rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4">
              <Ticket className="h-5 w-5 sm:h-6 sm:w-6 text-purple-400" weight="fill" />
            </div>
            <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-1.5 sm:mb-2">Easy Booking</h3>
            <p className="text-xs sm:text-sm md:text-base text-gray-400">
              Select your seats, reserve them instantly, and complete your Donation in minutes. Your tickets are secured and ready.
            </p>
          </div>
          <div className="bg-gray-800/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 border border-gray-700">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-600/20 rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 text-purple-400" weight="fill" />
            </div>
            <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-1.5 sm:mb-2">Group Experience</h3>
            <p className="text-xs sm:text-sm md:text-base text-gray-400">
              Perfect for corporate events, birthdays, or special occasions. Book multiple seats in our VIP suites for your group.
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-12 sm:mt-16 md:mt-24 text-center">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-6 sm:mb-8 md:mb-12">How It Works</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
            {[
              { step: '1', title: 'Browse Events', desc: 'Explore upcoming concerts, games, and shows' },
              { step: '2', title: 'Select Seats', desc: 'Choose your preferred VIP suite seats' },
              { step: '3', title: 'Reserve', desc: 'Lock in your seats for 10 minutes' },
              { step: '4', title: 'Checkout', desc: 'Complete Donations and receive tickets' },
            ].map((item) => (
              <div key={item.step} className="relative">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-600 rounded-full flex items-center justify-center text-base sm:text-xl font-bold mx-auto mb-2 sm:mb-4">
                  {item.step}
                </div>
                <h3 className="text-sm sm:text-base font-semibold mb-1 sm:mb-2">{item.title}</h3>
                <p className="text-xs sm:text-sm text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Themed Dual Video Section */}
        <div className="mt-16 sm:mt-20 md:mt-28">
          <div className="w-full flex flex-col items-center mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 text-center">
              <span className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">VIP Suite Experience</span> <br className="hidden sm:block" />
              <span className="text-lg sm:text-xl font-medium text-gray-300">See the HYPEFANZ.VIP vibe in action</span>
            </h2>
            <div className="flex flex-col sm:flex-row gap-6 w-full justify-center">
              <VideoWithCustomControl src="/videos/first.mp4" borderColor="purple-700" shadowColor="rgba(128,0,255,0.22)" />
              <VideoWithCustomControl src="/videos/second.mp4" borderColor="pink-500" shadowColor="rgba(255,0,128,0.22)" />
            </div>
          </div>
          {/* Upcoming Events Section */}
          <div className="text-center mb-8 sm:mb-10 md:mb-12">
            <div className="flex items-center justify-center gap-2 mb-3 sm:mb-4">
              <Star className="h-5 w-5 sm:h-6 sm:w-6 text-purple-400" weight="fill" />
              <span className="text-purple-400 font-semibold text-sm sm:text-base uppercase tracking-wider">Don&apos;t Miss Out</span>
              <Star className="h-5 w-5 sm:h-6 sm:w-6 text-purple-400" weight="fill" />
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">
              Upcoming{' '}
              <span className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                VIP Experiences
              </span>
            </h2>
            <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto">
              Secure your exclusive suite access to the hottest events at Crypto.com Arena.
              Limited availability &mdash; book your VIP seats today!
            </p>
          </div>
          <EventCalendar showUpcomingList={true} maxUpcomingEvents={4} />
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-6 sm:py-8 mt-12 sm:mt-16 md:mt-20 border-t border-gray-800">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Lightning className="h-5 w-5 sm:h-6 sm:w-6 text-purple-400" weight="fill" />
            <span className="text-sm sm:text-base font-semibold">HYPEFANZ.VIP</span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500">
            &copy; {new Date().getFullYear()} HYPEFANZ.VIP. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
