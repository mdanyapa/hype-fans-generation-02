'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { ArrowLeft, Share, Printer } from '@phosphor-icons/react'
import { QRCodeSVG } from 'qrcode.react'
import localFont from 'next/font/local'
import posterLogo from '@/assets/poster-loog.png'

// Initialize Radiate Sans Extra Bold font from public folder
const radiateSans = localFont({ 
  src: [
    {
      path: '../../../../../public/fonts/fonnts.com-radiatesans-extrabold.otf',
      weight: '800',
      style: 'normal',
    }
  ],
  variable: '--font-radiate-sans',
  display: 'swap',
  preload: true,
})

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
  const [eventUrl, setEventUrl] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setEventUrl(`${window.location.origin}/event/${id}`)
    }
  }, [id])

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
          title: poster?.name || 'Event Poster',
          text: `Check out this VIP event: ${poster?.name}`,
          url: eventUrl,
        })
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      // Fallback to clipboard API with error handling
      try {
        await navigator.clipboard.writeText(eventUrl)
        toast.success('Link copied to clipboard!')
      } catch (error) {
        // Clipboard API not available (e.g., non-HTTPS), use fallback
        const textArea = document.createElement('textarea')
        textArea.value = eventUrl
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        document.body.appendChild(textArea)
        textArea.select()
        try {
          document.execCommand('copy')
          toast.success('Link copied to clipboard!')
        } catch (e) {
          toast.error('Failed to copy link')
        }
        document.body.removeChild(textArea)
      }
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Skeleton className="w-full max-w-md aspect-[3/4] rounded-xl" />
      </div>
    )
  }

  if (!poster) {
    return null
  }

  return (
    <div className={`min-h-screen print:min-h-0 print:bg-white ${radiateSans.className}`}>
      {/* Header - Hidden when printing */}
      <div className="print:hidden sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-12 sm:h-16 items-center justify-between px-2 sm:px-4">
          <Link href="/calendar">
            <Button variant="ghost" size="sm" className="gap-1 sm:gap-2 text-muted-foreground hover:text-foreground h-8 sm:h-9 px-2 sm:px-3">
              <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
          </Link>
          <span className="font-semibold text-xs sm:text-sm md:text-base">Event Poster</span>
          <div className="flex gap-1 sm:gap-2">
            <Button variant="ghost" size="icon" onClick={handleShare} className="h-8 w-8 sm:h-9 sm:w-9">
              <Share className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handlePrint} className="h-8 w-8 sm:h-9 sm:w-9">
              <Printer className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 flex flex-col items-center print:p-0 print:bg-white">
        {/* Poster Container */}
        <div className="w-full max-w-[280px] xs:max-w-[320px] sm:max-w-md print:max-w-full">
          <div 
            id="poster"
            className="relative overflow-hidden shadow-2xl print:shadow-none flex flex-col rounded-xl"
            style={{
              background: 'radial-gradient(circle at top right, #E9D5FF 0%, #C084FC 15%, #A855F7 25%, #6B21A8 45%, #4B0082 65%, #3B0764 80%, #2D0B54 100%)',
              aspectRatio: '3/4.5',
            }}
          >
            {/* Noise Texture Overlay */}
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none mix-blend-overlay" 
                 style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} 
            />

            {/* 1. Top Section: Logo Image */}
            <div className="h-[45%] sm:h-[50%] w-full flex items-center justify-center p-0 pt-2 sm:pt-4 z-10">
               {/* Placeholder Image as requested */}
               <img 
                 src={posterLogo.src} 
                 alt="HYPE FANZ" 
                 className="w-[75%] sm:w-[85%] h-full object-contain"
                 onError={(e) => {
                   // Fallback if image is missing
                   e.currentTarget.style.display = 'none';
                   e.currentTarget.parentElement!.innerHTML = `
                     <div class="flex flex-col items-center justify-center text-center space-y-2">
                       <div class="text-4xl font-black text-[#FFC72C] drop-shadow-lg">HYPE FANZ</div>
                       <div class="text-xs text-white/50">Logo Placeholder<br/>/assets/logo.png</div>
                     </div>
                   `
                 }}
               />
            </div>

            {/* 2-4. Remaining 55% Content: Title, QR Code, Text */}
            <div className="h-[55%] sm:h-[50%] flex flex-col justify-between pb-3 sm:pb-6 z-10">
              {/* Title */}
              <div className="text-center px-2 sm:px-4">
                <h1 
                  className="text-xl xs:text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-wide leading-tight"
                  style={{
                    fontFamily: 'var(--font-radiate-sans), sans-serif',
                    letterSpacing: '0.05em',
                    background: 'linear-gradient(180deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    color: 'transparent',
                    filter: 'drop-shadow(0px 3px 0px rgba(0,0,0,0.4)) drop-shadow(0px 5px 0px rgba(0,0,0,0.3)) drop-shadow(0px 6px 10px rgba(0,0,0,0.6))',
                  }}
                >
                  {poster.name}
                </h1>
              </div>

              {/* QR Code */}
              <div className="flex items-center justify-center py-1 sm:py-2">
                <div className="bg-white p-1 sm:p-1.5 rounded-sm shadow-[0_8px_16px_rgba(0,0,0,0.5)]">
                  <QRCodeSVG 
                    value={eventUrl || `https://hypefanz.vip/event/${id}`}
                    size={70}
                    level="H"
                    includeMargin={false}
                    className="w-[70px] h-[70px] xs:w-[70px] xs:h-[70px] sm:w-[80px] sm:h-[80px] md:w-[90px] md:h-[90px]"
                  />
                </div>
              </div>

              {/* Bottom Text */}
              <div className="text-center space-y-0.5 sm:space-y-1 px-2 sm:px-4">
                <p 
                  className="text-xs xs:text-sm sm:text-base md:text-lg font-bold uppercase tracking-wider"
                  style={{
                    fontFamily: 'var(--font-radiate-sans), sans-serif',
                    background: 'linear-gradient(180deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    color: 'transparent',
                    filter: 'drop-shadow(0px 3px 0px rgba(0,0,0,0.4)) drop-shadow(0px 4px 0px rgba(0,0,0,0.3)) drop-shadow(0px 5px 8px rgba(0,0,0,0.6))',
                  }}
                >
                  {poster.venue}
                </p>
                <p 
                  className="text-[8px] xs:text-[10px] sm:text-xs md:text-sm font-bold uppercase tracking-wider"
                  style={{
                    fontFamily: 'var(--font-radiate-sans), sans-serif',
                    background: 'linear-gradient(180deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    color: 'transparent',
                    filter: 'drop-shadow(0px 2px 0px rgba(0,0,0,0.4)) drop-shadow(0px 3px 0px rgba(0,0,0,0.3)) drop-shadow(0px 4px 6px rgba(0,0,0,0.6))',
                  }}
                >
                  DONATE TO ENTER SUITE
                </p>
                
                {/* Contact Info */}
                <div className="pt-1 sm:pt-2">
                  <p 
                    className="text-[10px] xs:text-xs sm:text-sm md:text-base font-bold uppercase tracking-wider"
                    style={{
                      fontFamily: 'var(--font-radiate-sans), sans-serif',
                      background: 'linear-gradient(180deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)',
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      color: 'transparent',
                      filter: 'drop-shadow(0px 2px 0px rgba(0,0,0,0.3))',
                    }}
                  >
                    877 258 3111
                  </p>
                  <p 
                    className="text-[10px] xs:text-xs sm:text-sm md:text-base font-bold uppercase tracking-wider"
                    style={{
                      fontFamily: 'var(--font-radiate-sans), sans-serif',
                      background: 'linear-gradient(180deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)',
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      color: 'transparent',
                      filter: 'drop-shadow(0px 2px 0px rgba(0,0,0,0.3))',
                    }}
                  >
                    help<span style={{ fontFamily: 'Arial, sans-serif' }}>@</span>hypefanz.vip
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Actions - Hidden when printing */}
        <div className="print:hidden flex flex-wrap justify-center gap-2 sm:gap-4 mt-4 sm:mt-8">
          <Button variant="outline" className="gap-1 sm:gap-2 h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-4" onClick={handleShare}>
            <Share className="h-3 w-3 sm:h-4 sm:w-4" />
            Share
          </Button>
          <Button variant="outline" className="gap-1 sm:gap-2 h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-4" onClick={handlePrint}>
            <Printer className="h-3 w-3 sm:h-4 sm:w-4" />
            Print
          </Button>
          <Link href={`/event/${poster.id}`}>
            <Button className="gap-1 sm:gap-2 h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-4">
              Book Tickets
            </Button>
          </Link>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          /* Force color printing */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          /* Reset body styles */
          html, body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Hide elements with print:hidden class */
          .print\\:hidden {
            display: none !important;
          }

          /* Make poster container full width and centered */
          #poster {
            width: 100% !important;
            max-width: 500px !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            page-break-inside: avoid !important;
          }

          /* Page setup */
          @page {
            size: auto;
            margin: 0.5in;
          }
        }
      `}</style>
    </div>
  )
}
