'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { IconSend } from '@tabler/icons-react'

interface ContactFormData {
  name: string
  email: string
  category: string
  message: string
}

export function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    category: '',
    message: ''
  })

  const categories = [
    { value: 'billing', label: 'Billing' },
    { value: 'error-report', label: 'Error Report' },
    { value: 'customer-service', label: 'Customer Service' },
    { value: 'feedback', label: 'Feedback' }
  ]

  const handleInputChange = (field: keyof ContactFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Basic validation
    if (!formData.name.trim() || !formData.email.trim() || !formData.category || !formData.message.trim()) {
      toast.error('Please fill in all fields')
      return
    }

    if (!formData.email.includes('@')) {
      toast.error('Please enter a valid email address')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const result = await response.json()
        toast.success('Message sent successfully! We\'ll get back to you soon.')
        setFormData({
          name: '',
          email: '',
          category: '',
          message: ''
        })
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to send message. Please try again.')
      }
    } catch (error) {
      console.error('Contact form error:', error)
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Your full name"
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="your.email@example.com"
            disabled={isSubmitting}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Category *</Label>
        <Select
          value={formData.category}
          onValueChange={(value) => handleInputChange('category', value)}
          disabled={isSubmitting}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.value} value={category.value}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Message *</Label>
        <Textarea
          id="message"
          value={formData.message}
          onChange={(e) => handleInputChange('message', e.target.value)}
          placeholder="Please describe your question or issue in detail..."
          rows={6}
          disabled={isSubmitting}
          required
        />
      </div>

      <Button 
        type="submit" 
        disabled={isSubmitting}
        className="w-full md:w-auto"
      >
        {isSubmitting ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            Sending...
          </>
        ) : (
          <>
            <IconSend className="h-4 w-4 mr-2" />
            Send Message
          </>
        )}
      </Button>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm font-semibold text-blue-800 mb-2">Need Instant Support?</p>
        <p className="text-sm text-blue-700">
          Join our Discord Support Server for immediate help:{' '}
          <a 
            href="https://discord.gg/RnXpM6h3BG" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline font-medium"
          >
            https://discord.gg/RnXpM6h3BG
          </a>
        </p>
      </div>
    </form>
  )
}