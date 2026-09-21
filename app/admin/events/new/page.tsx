'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Plus, Trash, Calendar, Package, UploadSimple, X } from '@phosphor-icons/react'
// (dropdown restored, switch and icons import removed)

interface SuiteInput {
  id: string
  label: string // e.g. Suite 1, Suite 2, ...
  name: string
  description: string
  features: string[]
  suiteCost: string // Total cost we paid for the entire suite
  seatCount: string
  seatPrice: string
  audienceType: string // 'HOME' | 'VISITOR'
}

export default function CreateEventPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Event form state
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [venue, setVenue] = useState('Crypto.com Arena')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [imagePreview, setImagePreview] = useState('')

  // Suites
  const [suites, setSuites] = useState<SuiteInput[]>([
    {
      id: `${Date.now()}-${Math.random()}`,
      label: 'Suite 1',
      name: 'VIP SUITE A',
      description: 'Premium suite with the best views',
      features: ['Best View', 'Private Bar', 'Dedicated Server'],
      suiteCost: '300', // Total cost we paid for this suite
      seatCount: '8',
      seatPrice: '70',
      audienceType: 'HOME',
    },
  ])

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
        setImagePreview('')
        return
      }

      let data
      try {
        data = await res.json()
      } catch {
        // If response is not JSON (e.g., HTML error page)
        toast.error(`Upload failed: Server error (${res.status})`)
        setImagePreview('')
        return
      }

      if (!res.ok) {
        toast.error(data.error || 'Failed to upload image')
        setImagePreview('')
        return
      }

      setImageUrl(data.imageUrl)
      toast.success('Image uploaded successfully')
    } catch (error) {
      console.error('Upload error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Network error'
      toast.error(`Failed to upload: ${errorMessage}`)
      setImagePreview('')
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

  // Track the next suite letter and next suite number for stable names/labels
  const [nextSuiteLetter, setNextSuiteLetter] = useState(2) // A is used
  const [nextSuiteNumber, setNextSuiteNumber] = useState(2) // 1 is used
  const addSuite = () => {
    const letter = String.fromCharCode(64 + nextSuiteLetter) // 65 = 'A', 66 = 'B', ...
    setSuites([
      ...suites,
      {
        id: `${Date.now()}-${Math.random()}`,
        label: `Suite ${nextSuiteNumber}`,
        name: `VIP SUITE ${letter}`,
        description: '',
        features: [],
        suiteCost: '',
        seatCount: '8',
        seatPrice: '',
        audienceType: 'HOME',
      },
    ])
    setNextSuiteLetter(nextSuiteLetter + 1)
    setNextSuiteNumber(nextSuiteNumber + 1)
  }

  const removeSuite = (index: number) => {
    setSuites(suites.filter((_, i) => i !== index))
    // Do not decrement nextSuiteLetter, so new suites always get a new letter
  }

  const updateSuite = (index: number, field: keyof SuiteInput, value: string | string[]) => {
    const updated = [...suites]
    updated[index] = { ...updated[index], [field]: value }
    setSuites(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name || !date || !time || !venue || !description || !imageUrl) {
      toast.error('Please fill in all event details')
      return
    }

    if (suites.length === 0) {
      toast.error('Please add at least one suite')
      return
    }

    for (const suite of suites) {
      if (!suite.name || !suite.seatCount || !suite.seatPrice) {
        toast.error('Please fill in all suite details')
        return
      }
    }

    setIsSubmitting(true)

    try {
      // Create event
      const eventRes = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          date: new Date(`${date}T${time}`).toISOString(),
          venue,
          description,
          imageUrl,
        }),
      })

      const eventData = await eventRes.json()

      if (!eventRes.ok) {
        toast.error(eventData.error || 'Failed to create event')
        return
      }

      // Create suites
      for (const suite of suites) {
        const suiteRes = await fetch('/api/suites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId: eventData.id,
            name: suite.name,
            description: suite.description || undefined,
            features: suite.features.filter((f) => f.trim()),
            suiteCost: parseFloat(suite.suiteCost) || 0, // Total cost we paid for the suite
            seatCount: parseInt(suite.seatCount),
            seatPrice: parseFloat(suite.seatPrice),
            audienceType: suite.audienceType,
          }),
        })

        if (!suiteRes.ok) {
          const suiteError = await suiteRes.json()
          toast.error(`Failed to create suite: ${suiteError.error}`)
          // Continue anyway, event is already created
        }
      }

      toast.success('Event created successfully!')
      router.push('/admin/events')
    } catch (error) {
      console.error('Error creating event:', error)
      toast.error('Failed to create event')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Calendar className="h-8 w-8 text-purple-400" />
          Create Event
        </h1>
        <p className="text-gray-400">Add a new event with VIP suites and seats</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Event Details */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Event Details</CardTitle>
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
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Suites */}
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
              onClick={addSuite}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Suite
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {suites.map((suite, index) => (
              <div key={suite.id} className="space-y-4 p-4 bg-gray-700/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">{suite.label}</h4>
                  {suites.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-red-400 hover:text-red-300"
                      onClick={() => removeSuite(index)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300">Suite Name</Label>
                    <Input
                      value={suite.name}
                      onChange={(e) => updateSuite(index, 'name', e.target.value)}
                      placeholder="e.g., VIP SUITE A"
                      className="bg-gray-600 border-gray-500 text-white"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">Description</Label>
                    <Input
                      value={suite.description}
                      onChange={(e) => updateSuite(index, 'description', e.target.value)}
                      placeholder="e.g., Premium suite with best views"
                      className="bg-gray-600 border-gray-500 text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <Label className="text-gray-300">Features (comma separated)</Label>
                  <Input
                    value={suite.features.join(', ')}
                    onChange={(e) =>
                      updateSuite(
                        index,
                        'features',
                        e.target.value.split(',').map((f) => f.trim())
                      )
                    }
                    placeholder="e.g., Best View, Private Bar, VIP Parking"
                    className="bg-gray-600 border-gray-500 text-white"
                  />
                </div>

                <div className="space-y-2 mt-4">
                  <Label className="text-gray-300">Audience Type</Label>
                  <select
                    value={suite.audienceType}
                    onChange={(e) => updateSuite(index, 'audienceType', e.target.value)}
                    className="bg-gray-600 border-gray-500 text-white rounded-md px-3 py-2 w-full"
                    required
                  >
                    <option value="HOME">Home</option>
                    <option value="VISITOR">Visitor</option>
                  </select>
                </div>


                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300">Suite Cost ($)</Label>
                    <Input
                      type="number"
                      value={suite.suiteCost}
                      onChange={(e) => updateSuite(index, 'suiteCost', e.target.value)}
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
                      onChange={(e) => updateSuite(index, 'seatCount', e.target.value)}
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
                      onChange={(e) => updateSuite(index, 'seatPrice', e.target.value)}
                      placeholder="Price per seat to customer"
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
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-4">
          <Button
            type="submit"
            className="bg-purple-600 hover:bg-purple-700 flex-1"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating Event...' : 'Create Event'}
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
