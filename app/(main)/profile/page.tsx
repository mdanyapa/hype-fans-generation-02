'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { User, Lock, Crown, Envelope } from '@phosphor-icons/react'

export default function ProfilePage() {
  const { data: session, update } = useSession()
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch(`/api/users/${session?.user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Failed to change password')
        return
      }

      toast.success('Password changed successfully')
      setIsChangingPassword(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch {
      toast.error('Failed to change password')
    } finally {
      setIsLoading(false)
    }
  }

  if (!session) {
    return null
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">My Profile</h1>
        <p className="text-gray-400">Manage your account settings</p>
      </div>

      {/* Profile Info */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <User className="h-5 w-5 text-purple-400" weight="fill" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-purple-600/20 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-purple-400">
                {session.user.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="text-xl font-semibold">
                {session.user.name || session.user.email}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                {session.user.role === 'ADMIN' ? (
                  <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-600">
                    <Crown className="h-3 w-3 mr-1" weight="fill" />
                    Administrator
                  </Badge>
                ) : (
                  <Badge className="bg-purple-600/20 text-purple-400 border-purple-600">
                    Member
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <Separator className="bg-gray-700" />

          {/* Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Envelope className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-400">Email</p>
                <p className="font-medium">{session.user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-400">User ID</p>
                <p className="font-medium text-sm text-gray-300">
                  {session.user.id}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Lock className="h-5 w-5 text-purple-400" weight="fill" />
            Security
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!isChangingPassword ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Password</p>
                <p className="text-sm text-gray-400">
                  Change your account password
                </p>
              </div>
              <Button
                variant="outline"
                className="border-gray-600 text-gray-300"
                onClick={() => setIsChangingPassword(true)}
              >
                Change Password
              </Button>
            </div>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current" className="text-gray-300">
                  Current Password
                </Label>
                <Input
                  id="current"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="bg-gray-700 border-gray-600 text-white"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new" className="text-gray-300">
                  New Password
                </Label>
                <Input
                  id="new"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="bg-gray-700 border-gray-600 text-white"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm" className="text-gray-300">
                  Confirm New Password
                </Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="bg-gray-700 border-gray-600 text-white"
                  required
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-700"
                  disabled={isLoading}
                >
                  {isLoading ? 'Changing...' : 'Update Password'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-gray-600 text-gray-300"
                  onClick={() => {
                    setIsChangingPassword(false)
                    setCurrentPassword('')
                    setNewPassword('')
                    setConfirmPassword('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
