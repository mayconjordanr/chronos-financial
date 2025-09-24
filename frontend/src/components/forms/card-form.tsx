'use client'

import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarIcon, CreditCard, Building2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Separator } from '@/components/ui/separator'

import { cardSchemaWithConditionals, CardFormData, CardType, CardNetwork } from '@/lib/schemas/card'
import { getSupportedNetworks } from '@/lib/data/card-networks'
import { formatLast4Input, parseExpiryDate, formatExpiryDate } from '@/lib/utils/card-utils'
import { CardComponent } from '@/components/cards/card-component'

interface CardFormProps {
  initialData?: Partial<CardFormData>
  mode?: 'create' | 'edit'
  onSubmit: (data: CardFormData) => Promise<void>
  isLoading?: boolean
  className?: string
}

export function CardForm({
  initialData,
  mode = 'create',
  onSubmit,
  isLoading = false,
  className,
}: CardFormProps) {
  const [showPreview, setShowPreview] = useState(true)
  const supportedNetworks = getSupportedNetworks()

  const form = useForm<CardFormData>({
    resolver: zodResolver(cardSchemaWithConditionals) as any,
    defaultValues: {
      name: '',
      last4digits: '',
      type: 'debit',
      network: 'visa',
      expiryDate: '',
      bank: '',
      creditLimit: undefined,
      isPrimary: false,
      ...initialData,
    },
  })

  const { watch, setValue, control, handleSubmit, formState: { errors } } = form
  const watchedValues = watch()

  // Handle card type change to reset credit limit
  useEffect(() => {
    if (watchedValues.type === 'debit') {
      setValue('creditLimit', undefined)
    }
  }, [watchedValues.type, setValue])

  // Create preview card data
  const previewCard = {
    id: 'preview',
    name: watchedValues.name || 'Card Name',
    last4digits: watchedValues.last4digits || '0000',
    type: watchedValues.type,
    network: watchedValues.network,
    expiryDate: watchedValues.expiryDate || '2025-12',
    bank: watchedValues.bank || 'Bank Name',
    creditLimit: watchedValues.creditLimit,
    isPrimary: watchedValues.isPrimary,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isActive: true,
  }

  const handleFormSubmit = async (data: CardFormData) => {
    try {
      await onSubmit(data)
    } catch (error) {
      console.error('Failed to submit card form:', error)
    }
  }

  const formVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  }

  return (
    <div className={className}>
      {/* Preview Toggle */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">
          {mode === 'create' ? 'Add New Card' : 'Edit Card'}
        </h2>
        <div className="flex items-center gap-2">
          <Label htmlFor="preview-toggle" className="text-sm">
            Preview
          </Label>
          <Switch
            id="preview-toggle"
            checked={showPreview}
            onCheckedChange={setShowPreview}
          />
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Form */}
        <motion.div
          variants={formVariants}
          initial="hidden"
          animate="visible"
        >
          <Form {...form}>
            <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
              {/* Card Name */}
              <motion.div variants={itemVariants}>
                <FormField
                  control={control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Card Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Primary Debit Card"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        A friendly name to identify this card
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>

              {/* Last 4 Digits */}
              <motion.div variants={itemVariants}>
                <FormField
                  control={control}
                  name="last4digits"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last 4 Digits</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="1234"
                          maxLength={4}
                          {...field}
                          onChange={(e) => {
                            const formatted = formatLast4Input(e.target.value)
                            field.onChange(formatted)
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Only the last 4 digits of your card number
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>

              {/* Card Type */}
              <motion.div variants={itemVariants}>
                <FormField
                  control={control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Card Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select card type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="debit">
                            <div className="flex items-center gap-2">
                              <CreditCard className="w-4 h-4" />
                              Debit Card
                            </div>
                          </SelectItem>
                          <SelectItem value="credit">
                            <div className="flex items-center gap-2">
                              <CreditCard className="w-4 h-4" />
                              Credit Card
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>

              {/* Card Network */}
              <motion.div variants={itemVariants}>
                <FormField
                  control={control}
                  name="network"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Card Network</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select card network" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {supportedNetworks.map((network) => (
                            <SelectItem key={network.name} value={network.name}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-4 h-4 rounded"
                                  style={{ backgroundColor: network.colors.primary }}
                                />
                                {network.displayName}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>

              {/* Expiry Date */}
              <motion.div variants={itemVariants}>
                <FormField
                  control={control}
                  name="expiryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiry Date</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="MM/YY or YYYY-MM"
                          {...field}
                          onChange={(e) => {
                            let value = e.target.value
                            // Auto-format MM/YY input
                            if (value.includes('/')) {
                              value = parseExpiryDate(value)
                            }
                            field.onChange(value)
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Enter as MM/YY or YYYY-MM format
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>

              {/* Bank */}
              <motion.div variants={itemVariants}>
                <FormField
                  control={control}
                  name="bank"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="e.g., Chase Bank"
                            className="pl-10"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        The financial institution that issued this card
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>

              {/* Credit Limit (conditional) */}
              <AnimatePresence>
                {watchedValues.type === 'credit' && (
                  <motion.div
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                  >
                    <FormField
                      control={control}
                      name="creditLimit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Credit Limit</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-3 text-muted-foreground">$</span>
                              <Input
                                type="number"
                                placeholder="10000"
                                className="pl-8"
                                {...field}
                                onChange={(e) => {
                                  const value = e.target.value ? parseFloat(e.target.value) : undefined
                                  field.onChange(value)
                                }}
                                value={field.value || ''}
                              />
                            </div>
                          </FormControl>
                          <FormDescription>
                            The maximum credit limit for this card
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <Separator />

              {/* Primary Card Toggle */}
              <motion.div variants={itemVariants}>
                <FormField
                  control={control}
                  name="isPrimary"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Primary Card</FormLabel>
                        <FormDescription>
                          Set this as your primary card for quick access
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </motion.div>

              {/* Submit Button */}
              <motion.div variants={itemVariants}>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving...' : mode === 'create' ? 'Add Card' : 'Update Card'}
                </Button>
              </motion.div>
            </form>
          </Form>
        </motion.div>

        {/* Preview */}
        <AnimatePresence>
          {showPreview && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="lg:sticky lg:top-8"
            >
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Preview</h3>
                <div className="flex justify-center">
                  <CardComponent
                    card={previewCard}
                    size="medium"
                    interactive={false}
                  />
                </div>
                <div className="text-sm text-muted-foreground text-center">
                  This is how your card will appear in the dashboard
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}