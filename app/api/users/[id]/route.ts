import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

// GET /api/users/[id] - Get user details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Users can only view their own profile, admins can view any
    if (id !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            orders: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}

// PATCH /api/users/[id] - Update user (change password, promote to admin)
const updateUserSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).optional(),
  role: z.enum(['USER', 'ADMIN']).optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { currentPassword, newPassword, role } = updateUserSchema.parse(body)

    // Check authorization
    const isSelf = id === session.user.id
    const isAdmin = session.user.role === 'ADMIN'

    if (!isSelf && !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can change roles
    if (role && !isAdmin) {
      return NextResponse.json({ error: 'Only admins can change roles' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}

    // Handle password change
    if (newPassword) {
      // Self-change requires current password verification
      if (isSelf && !isAdmin) {
        if (!currentPassword) {
          return NextResponse.json(
            { error: 'Current password is required' },
            { status: 400 }
          )
        }
        const isValid = await bcrypt.compare(currentPassword, user.passwordHash)
        if (!isValid) {
          return NextResponse.json(
            { error: 'Current password is incorrect' },
            { status: 400 }
          )
        }
      }
      updateData.passwordHash = await bcrypt.hash(newPassword, 12)
    }

    // Handle role change
    if (role) {
      updateData.role = role
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No updates provided' },
        { status: 400 }
      )
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        createdAt: true,
      },
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}
