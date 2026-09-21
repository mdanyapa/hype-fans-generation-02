'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Plus, Trash } from '@phosphor-icons/react'

export default function CreateSuitePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const eventId = searchParams.get('eventId')
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [events, setEvents] = useState<any[]>([])
  const [selectedEventId, setSelectedEventId] = useState(eventId || '')
  
  // Suite form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [features, setFeatures] = useState<string[]>([''])
  const [suiteCost, setSuiteCost] = useState('')
  const [seatCount, setSeatCount] = useState('')
  const [seatPrice, setSeatPrice] = useState('')
  const [audienceType, setAudienceType] = useState('HOME')

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events')
      if (response.ok) {
        const data = await response.json()
        setEvents(data)
      }
    } catch (error) {
      console.error('Failed to fetch events:', error)
    }
  }

  const addFeature = () => {
    setFeatures([...features, ''])
  }

  const updateFeature = (index: number, value: string) => {
    const newFeatures = [...features]
    newFeatures[index] = value
    setFeatures(newFeatures)
  }

  const removeFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedEventId) {
      toast.error('Please select an event')
      return
    }

    if (!name || !seatCount || !seatPrice) {
      toast.error('Please fill in all required fields')
      return
    }

    const validFeatures = features.filter(f => f.trim() !== '')

    setIsSubmitting(true)

    try {
      // Create suite
      const suiteResponse = await fetch('/api/suites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: selectedEventId,
          name,
          description,
          features: JSON.stringify(validFeatures),
          suiteCost: parseFloat(suiteCost) || 0,
          audienceType,
        }),
      })

      if (!suiteResponse.ok) {
        const error = await suiteResponse.json()
        throw new Error(error.error || 'Failed to create suite')
      }

      const suite = await suiteResponse.json()

      // Create seats
      const seatsResponse = await fetch(`/api/seats/${suite.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seatCount: parseInt(seatCount),
          sellingPrice: parseFloat(seatPrice),
        }),
      })

      if (!seatsResponse.ok) {
        throw new Error('Failed to create seats')
      }

      toast.success('Suite created successfully!')
      router.push('/admin/events')
      router.refresh()
    } catch (error: any) {
      console.error('Error creating suite:', error)
      toast.error(error.message || 'Failed to create suite')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Create New Suite</h1>
        <p className="text-muted-foreground mt-2">
          Add a new suite to an event
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Suite Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Event Selection */}
            <div className="space-y-2">
              <Label htmlFor="event">Event *</Label>
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an event" />
                </SelectTrigger>
                <SelectContent>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name} - {new Date(event.date).toLocaleDateString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Suite Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Suite Name *</Label>
              <Input
                id="name"
                placeholder="e.g., VIP SUITE A"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {/* Audience Type */}
            <div className="space-y-2">
              <Label htmlFor="audienceType">Audience Type *</Label>
              <Select value={audienceType} onValueChange={setAudienceType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HOME">Home</SelectItem>
                  <SelectItem value="VISITOR">Visitor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the suite..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            {/* Features */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Features</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addFeature}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Feature
                </Button>
              </div>
              <div className="space-y-2">
                {features.map((feature, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="e.g., Private Bar"
                      value={feature}
                      onChange={(e) => updateFeature(index, e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeFeature(index)}
                      disabled={features.length === 1}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Suite Cost */}
            <div className="space-y-2">
              <Label htmlFor="suiteCost">Suite Cost (Internal)</Label>
              <Input
                id="suiteCost"
                type="number"
                step="0.01"
                placeholder="Total cost paid for this suite"
                value={suiteCost}
                onChange={(e) => setSuiteCost(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Internal tracking: Total amount paid for this entire suite
              </p>
            </div>

            {/* Seat Count */}
            <div className="space-y-2">
              <Label htmlFor="seatCount">Number of Seats *</Label>
              <Input
                id="seatCount"
                type="number"
                min="1"
                placeholder="e.g., 8"
                value={seatCount}
                onChange={(e) => setSeatCount(e.target.value)}
                required
              />
            </div>

            {/* Seat Price */}
            <div className="space-y-2">
              <Label htmlFor="seatPrice">Price per Seat *</Label>
              <Input
                id="seatPrice"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g., 70.00"
                value={seatPrice}
                onChange={(e) => setSeatPrice(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Selling price to customers (with markup)
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? 'Creating...' : 'Create Suite'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
