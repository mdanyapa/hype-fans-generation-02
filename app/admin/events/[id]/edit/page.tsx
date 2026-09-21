'use client'

import { useState, useRef, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { naturalSort } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { UsersThree, House } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Plus, Trash, Calendar, Package, UploadSimple, X, ArrowLeft } from '@phosphor-icons/react'
import { format } from 'date-fns'
import Link from 'next/link'

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
  suiteCost: number
  seats: Seat[]
  audienceType: 'HOME' | 'VISITOR'
  isNew?: boolean
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

interface NewSuiteInput {
  name: string
  description: string
  features: string[]
  suiteCost: string
  seatCount: string
  seatPrice: string
}

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Event form state
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [venue, setVenue] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [imagePreview, setImagePreview] = useState('')
  const [isActive, setIsActive] = useState(true)

  // Existing suites
  const [suites, setSuites] = useState<Suite[]>([])
  const [suitesToDelete, setSuitesToDelete] = useState<string[]>([])

  // New suites to add
  const [newSuites, setNewSuites] = useState<NewSuiteInput[]>([])

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await fetch(`/api/events/${id}`)
        if (!res.ok) {
          toast.error('Event not found')
          router.push('/admin/events')
          return
        }

        const event: Event = await res.json()

        // Populate form
        setName(event.name)
        const eventDate = new Date(event.date)
        setDate(format(eventDate, 'yyyy-MM-dd'))
        setTime(format(eventDate, 'HH:mm'))
        setVenue(event.venue)
        setDescription(event.description)
        setImageUrl(event.imageUrl)
        setImagePreview(event.imageUrl)
        setIsActive(event.isActive)
        setSuites(event.suites)
      } catch (error) {
        console.error('Failed to fetch event:', error)
        toast.error('Failed to load event')
        router.push('/admin/events')
      } finally {
        setIsLoading(false)
      }
    }

    fetchEvent()
  }, [id, router])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Show preview immediately
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      // Handle 413 error specifically (file too large from server/proxy)
      if (res.status === 413) {
        toast.error('File is too large. Maximum size is 20MB.')
        setImagePreview(imageUrl) // Revert to original
        return
      }

      let data
      try {
        data = await res.json()
      } catch {
        // If response is not JSON (e.g., HTML error page)
        toast.error(`Upload failed: Server error (${res.status})`)
        setImagePreview(imageUrl) // Revert to original
        return
      }

      if (!res.ok) {
        toast.error(data.error || 'Failed to upload image')
        setImagePreview(imageUrl) // Revert to original
        return
      }

      setImageUrl(data.imageUrl)
      toast.success('Image uploaded successfully')
    } catch (error) {
      console.error('Upload error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Network error'
      toast.error(`Failed to upload: ${errorMessage}`)
      setImagePreview(imageUrl) // Revert to original
    } finally {
      setIsUploading(false)
    }
  }

  const removeImage = () => {
    setImageUrl('')
    setImagePreview('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const updateSuite = (suiteId: string, field: keyof Suite, value: unknown) => {
    setSuites(suites.map(s =>
      s.id === suiteId ? { ...s, [field]: value } : s
    ))
  }

  const updateSeatPrice = (suiteId: string, seatId: string, newPrice: number) => {
    setSuites(suites.map(suite =>
      suite.id === suiteId
        ? {
            ...suite,
            seats: suite.seats.map(seat =>
              seat.id === seatId ? { ...seat, sellingPrice: newPrice } : seat
            )
          }
        : suite
    ))
  }

  const updateAllAvailableSeatPrices = (suiteId: string, newPrice: number) => {
    setSuites(suites.map(suite =>
      suite.id === suiteId
        ? {
            ...suite,
            seats: suite.seats.map(seat =>
              seat.status === 'AVAILABLE' ? { ...seat, sellingPrice: newPrice } : seat
            )
          }
        : suite
    ))
  }

  const markSuiteForDeletion = (suiteId: string) => {
    const suite = suites.find(s => s.id === suiteId)
    if (!suite) return

    const soldSeats = suite.seats.filter(s => s.status === 'SOLD').length
    if (soldSeats > 0) {
      toast.error('Cannot delete suite with sold seats')
      return
    }

    if (!confirm('Are you sure you want to delete this suite?')) {
      return
    }

    setSuitesToDelete([...suitesToDelete, suiteId])
    setSuites(suites.filter(s => s.id !== suiteId))
  }

  // New suite functions
  const addNewSuite = () => {
    const letter = String.fromCharCode(65 + suites.length + newSuites.length)
    setNewSuites([
      ...newSuites,
      {
        name: `VIP SUITE ${letter}`,
        description: '',
        features: [],
        suiteCost: '',
        seatCount: '8',
        seatPrice: '',
      },
    ])
  }

  const removeNewSuite = (index: number) => {
    setNewSuites(newSuites.filter((_, i) => i !== index))
  }

  const updateNewSuite = (index: number, field: keyof NewSuiteInput, value: string | string[]) => {
    const updated = [...newSuites]
    updated[index] = { ...updated[index], [field]: value }
    setNewSuites(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name || !date || !time || !venue || !description || !imageUrl) {
      toast.error('Please fill in all event details')
      return
    }

    // Validate new suites
    for (const suite of newSuites) {
      if (!suite.name || !suite.seatCount || !suite.seatPrice) {
        toast.error('Please fill in all suite details for new suites')
        return
      }
    }

    setIsSubmitting(true)

    try {
      // 1. Update event details
      const eventRes = await fetch(`/api/events/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          date: new Date(`${date}T${time}`).toISOString(),
          venue,
          description,
          imageUrl,
          isActive,
        }),
      })

      if (!eventRes.ok) {
        const data = await eventRes.json()
        toast.error(data.error || 'Failed to update event')
        return
      }

      // 2. Delete removed suites
      for (const suiteId of suitesToDelete) {
        await fetch(`/api/suites/${suiteId}`, {
          method: 'DELETE',
        })
      }

      // 3. Update existing suites
      for (const suite of suites) {
        // Update suite details
        await fetch(`/api/suites/${suite.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: suite.name,
            description: suite.description || undefined,
            features: suite.features,
            suiteCost: suite.suiteCost,
            audienceType: suite.audienceType,
          }),
        })

        // Update seat prices for each seat
        for (const seat of suite.seats) {
          await fetch(`/api/seats/${seat.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sellingPrice: seat.sellingPrice,
            }),
          })
        }
      }

      // 4. Create new suites
      for (const suite of newSuites) {
        await fetch('/api/suites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId: id,
            name: suite.name,
            description: suite.description || undefined,
            features: suite.features.filter((f) => f.trim()),
            suiteCost: parseFloat(suite.suiteCost) || 0,
            seatCount: parseInt(suite.seatCount),
            seatPrice: parseFloat(suite.seatPrice),
          }),
        })
      }

      toast.success('Event updated successfully!')
      router.push('/admin/events')
    } catch (error) {
      console.error('Error updating event:', error)
      toast.error('Failed to update event')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/admin/events">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Calendar className="h-8 w-8 text-purple-400" />
            Edit Event
          </h1>
          <p className="text-gray-400">Update event details, suites, and pricing</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Event Details */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <span>Event Details</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Active</span>
                <Switch
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-300">
                  Event Name
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Rock Legends Reunion"
                  className="bg-gray-700 border-gray-600 text-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="venue" className="text-gray-300">
                  Venue
                </Label>
                <Input
                  id="venue"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="e.g., Crypto.com Arena"
                  className="bg-gray-700 border-gray-600 text-white"
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date" className="text-gray-300">
                  Date
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time" className="text-gray-300">
                  Time
                </Label>
                <Input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-gray-300">
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the event..."
                className="bg-gray-700 border-gray-600 text-white min-h-[100px]"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Event Image</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
              />
              {!imagePreview && !imageUrl ? (
                <label
                  htmlFor="image-upload"
                  className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-purple-500 hover:bg-gray-700/50 transition-colors"
                >
                  <UploadSimple className="h-10 w-10 text-gray-400 mb-2" />
                  <span className="text-gray-400">Click to upload image</span>
                  <span className="text-gray-500 text-sm mt-1">JPEG, PNG, WebP, GIF (max 5MB)</span>
                </label>
              ) : (
                <div className="relative">
                  <div className="h-40 rounded-lg overflow-hidden">
                    <img
                      src={imagePreview || imageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                      <div className="text-white">Uploading...</div>
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
                    onClick={removeImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <label
                    htmlFor="image-upload"
                    className="absolute bottom-2 right-2 bg-purple-600 hover:bg-purple-700 text-white text-sm px-3 py-1 rounded cursor-pointer"
                  >
                    Change
                  </label>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Existing Suites */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Package className="h-5 w-5 text-purple-400" />
              VIP Suites
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-purple-600 text-purple-400"
              onClick={addNewSuite}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Suite
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Existing suites */}
            {suites.map((suite) => {
              const soldSeats = suite.seats.filter(s => s.status === 'SOLD').length
              const reservedSeats = suite.seats.filter(s => s.status === 'RESERVED').length
              const availableSeats = suite.seats.filter(s => s.status === 'AVAILABLE').length
              const availableSeatPrice = availableSeats > 0
                ? suite.seats.find(s => s.status === 'AVAILABLE')?.sellingPrice || 0
                : 0

              return (
                <div key={suite.id} className="space-y-4 p-4 bg-gray-700/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{suite.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {suite.seats.length} seats
                      </Badge>
                      {soldSeats > 0 && (
                        <Badge className="bg-green-600/20 text-green-400 border-green-600 text-xs">
                          {soldSeats} sold
                        </Badge>
                      )}
                      {reservedSeats > 0 && (
                        <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-600 text-xs">
                          {reservedSeats} reserved
                        </Badge>
                      )}
                    </div>
                    {soldSeats === 0 && (
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Switch
                            id={`audience-type-${suite.id}`}
                            checked={suite.audienceType === 'VISITOR'}
                            onCheckedChange={(checked) => updateSuite(suite.id, 'audienceType', checked ? 'VISITOR' : 'HOME')}
                            aria-label="Toggle suite audience type"
                          />
                          <span className="flex items-center gap-1 text-xs">
                            {suite.audienceType === 'VISITOR' ? (
                              <>
                                <UsersThree className="h-3 w-3 text-blue-400" /> Visitor
                              </>
                            ) : (
                              <>
                                <House className="h-3 w-3 text-green-400" /> Home
                              </>
                            )}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-red-400 hover:text-red-300"
                          onClick={() => markSuiteForDeletion(suite.id)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-300">Suite Name</Label>
                      <Input
                        value={suite.name}
                        onChange={(e) => updateSuite(suite.id, 'name', e.target.value)}
                        placeholder="e.g., VIP SUITE A"
                        className="bg-gray-600 border-gray-500 text-white"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-300">Description</Label>
                      <Input
                        value={suite.description || ''}
                        onChange={(e) => updateSuite(suite.id, 'description', e.target.value)}
                        placeholder="e.g., Premium suite with best views"
                        className="bg-gray-600 border-gray-500 text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">
                      Features (comma separated)
                    </Label>
                    <Input
                      value={suite.features.join(', ')}
                      onChange={(e) =>
                        updateSuite(
                          suite.id,
                          'features',
                          e.target.value.split(',').map((f) => f.trim())
                        )
                      }
                      placeholder="e.g., Best View, Private Bar, VIP Parking"
                      className="bg-gray-600 border-gray-500 text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-300">Suite Cost ($)</Label>
                      <Input
                        type="number"
                        value={suite.suiteCost}
                        onChange={(e) => updateSuite(suite.id, 'suiteCost', parseFloat(e.target.value) || 0)}
                        placeholder="Total cost we paid"
                        className="bg-gray-600 border-gray-500 text-white"
                        min="0"
                        step="0.01"
                      />
                      <p className="text-xs text-gray-500">Total price you paid for this suite (internal only)</p>
                    </div>
                    {availableSeats > 0 && (
                      <div className="space-y-2">
                        <Label className="text-gray-300">Available Seat Price ($)</Label>
                        <Input
                          type="number"
                          value={availableSeatPrice}
                          onChange={(e) => updateAllAvailableSeatPrices(suite.id, parseFloat(e.target.value) || 0)}
                          placeholder="Price per seat"
                          className="bg-gray-600 border-gray-500 text-white"
                          min="0"
                          step="0.01"
                        />
                        <p className="text-xs text-gray-500">Updates price for all {availableSeats} available seats</p>
                      </div>
                    )}
                  </div>

                  {/* Individual seat prices */}
                  {suite.seats.length > 0 && (
                    <div className="mt-4">
                      <Label className="text-gray-300 mb-2 block">Individual Seat Prices</Label>
                      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                        {[...suite.seats].sort((a, b) => naturalSort(a.seatNumber, b.seatNumber)).map((seat) => (
                          <div
                            key={seat.id}
                            className={`p-2 rounded text-center text-xs ${
                              seat.status === 'SOLD'
                                ? 'bg-red-600/20 text-red-400'
                                : seat.status === 'RESERVED'
                                ? 'bg-yellow-600/20 text-yellow-400'
                                : 'bg-green-600/20 text-green-400'
                            }`}
                          >
                            <div className="font-semibold">{seat.seatNumber}</div>
                            <div>${seat.sellingPrice}</div>
                            {seat.status !== 'AVAILABLE' && (
                              <div className="text-[10px] opacity-70">{seat.status.toLowerCase()}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {suite.suiteCost > 0 && availableSeats > 0 && (
                    <div className="text-sm text-gray-400 bg-gray-800/50 p-3 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span>Potential revenue (if all available sold):</span>
                        <span className="text-white">
                          ${(availableSeatPrice * availableSeats).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span>Suite cost:</span>
                        <span className="text-white">
                          -${suite.suiteCost.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span>Already sold ({soldSeats} seats):</span>
                        <span className="text-white">
                          +${suite.seats.filter(s => s.status === 'SOLD').reduce((sum, s) => sum + s.sellingPrice, 0).toFixed(2)}
                        </span>
                      </div>
                      <Separator className="my-2 bg-gray-600" />
                      <div className="flex justify-between items-center font-semibold">
                        <span>Potential total profit:</span>
                        <span className="text-green-400">
                          ${(
                            (availableSeatPrice * availableSeats) +
                            suite.seats.filter(s => s.status === 'SOLD').reduce((sum, s) => sum + s.sellingPrice, 0) -
                            suite.suiteCost
                          ).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {/* New suites */}
            {newSuites.map((suite, index) => (
              <div key={`new-${index}`} className="space-y-4 p-4 bg-purple-900/20 border border-purple-600/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">New Suite</h4>
                    <Badge className="bg-purple-600/20 text-purple-400 border-purple-600 text-xs">
                      New
                    </Badge>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-red-400 hover:text-red-300"
                    onClick={() => removeNewSuite(index)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300">Suite Name</Label>
                    <Input
                      value={suite.name}
                      onChange={(e) => updateNewSuite(index, 'name', e.target.value)}
                      placeholder="e.g., VIP SUITE A"
                      className="bg-gray-600 border-gray-500 text-white"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">Description</Label>
                    <Input
                      value={suite.description}
                      onChange={(e) => updateNewSuite(index, 'description', e.target.value)}
                      placeholder="e.g., Premium suite with best views"
                      className="bg-gray-600 border-gray-500 text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">
                    Features (comma separated)
                  </Label>
                  <Input
                    value={suite.features.join(', ')}
                    onChange={(e) =>
                      updateNewSuite(
                        index,
                        'features',
                        e.target.value.split(',').map((f) => f.trim())
                      )
                    }
                    placeholder="e.g., Best View, Private Bar, VIP Parking"
                    className="bg-gray-600 border-gray-500 text-white"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300">Suite Cost ($)</Label>
                    <Input
                      type="number"
                      value={suite.suiteCost}
                      onChange={(e) => updateNewSuite(index, 'suiteCost', e.target.value)}
                      placeholder="Total cost we paid"
                      className="bg-gray-600 border-gray-500 text-white"
                      min="0"
                      step="0.01"
                    />
                    <p className="text-xs text-gray-500">Total price you paid for this suite (internal only)</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">Number of Seats</Label>
                    <Input
                      type="number"
                      value={suite.seatCount}
                      onChange={(e) => updateNewSuite(index, 'seatCount', e.target.value)}
                      placeholder="8"
                      className="bg-gray-600 border-gray-500 text-white"
                      min="1"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">Seat Price ($)</Label>
                    <Input
                      type="number"
                      value={suite.seatPrice}
                      onChange={(e) => updateNewSuite(index, 'seatPrice', e.target.value)}
                      placeholder="Price per seat"
                      className="bg-gray-600 border-gray-500 text-white"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                {suite.suiteCost && suite.seatPrice && suite.seatCount && (
                  <div className="text-sm text-gray-400 bg-gray-800/50 p-3 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span>Revenue (if all seats sold):</span>
                      <span className="text-white">
                        ${(parseFloat(suite.seatPrice) * parseInt(suite.seatCount)).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span>Suite cost:</span>
                      <span className="text-white">
                        -${parseFloat(suite.suiteCost).toFixed(2)}
                      </span>
                    </div>
                    <Separator className="my-2 bg-gray-600" />
                    <div className="flex justify-between items-center font-semibold">
                      <span>Potential profit:</span>
                      <span className="text-green-400">
                        ${(
                          parseFloat(suite.seatPrice) * parseInt(suite.seatCount) -
                          parseFloat(suite.suiteCost)
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {suites.length === 0 && newSuites.length === 0 && (
              <p className="text-center text-gray-400 py-8">
                No suites. Click &quot;Add Suite&quot; to create one.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-4">
          <Button
            type="submit"
            className="bg-purple-600 hover:bg-purple-700 flex-1"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-gray-600 text-gray-300"
            onClick={() => router.push('/admin/events')}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
