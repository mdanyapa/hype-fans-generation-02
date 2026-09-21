'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from '@phosphor-icons/react'
import { toast } from 'sonner'
import navLogo from '@/assets/logo.png'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    } else if (status === 'authenticated' && session?.user.role !== 'ADMIN') {
      toast.error('Access denied. Admins only.')
      router.push('/calendar')
    }
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  if (!session || session.user.role !== 'ADMIN') {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-lg border-b border-gray-800">
        <div className="container mx-auto px-4 py-3 sm:py-4 flex justify-between items-center">
          <Link href="/calendar" className="flex items-center gap-1.5 sm:gap-2">
            <Image 
              src={navLogo} 
              alt="HYPEFANZ.VIP" 
              className="h-6 sm:h-8 md:h-10 w-auto"
              priority
            />
            <span className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-300" style={{ marginLeft: '10px' }}>HYPEFANZ.VIP</span>
          </Link>
          <Link href="/dashboard">
            <Button variant="ghost" className="gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-4">
              <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Back</span>
            </Button>
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
