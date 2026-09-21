import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Protect server-side access to the /dashboard routes — only ADMIN may view
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Only guard the dashboard path
  if (pathname.startsWith('/dashboard')) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

    if (!token || token.role !== 'ADMIN') {
      const url = req.nextUrl.clone()
      url.pathname = '/calendar'
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
