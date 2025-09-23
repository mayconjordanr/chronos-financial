'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import {
  Building2,
  PiggyBank,
  CreditCard,
  TrendingUp,
  Loader2,
  DollarSign
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  accountSchema,
  AccountFormData,
  AccountType,
  accountTypeMetadata,
  commonBanks,
  type Account
} from '@/lib/schemas/account'

interface AccountFormProps {
  mode: 'create' | 'edit'
  initialData?: Partial<Account>
  onSubmit: (data: AccountFormData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
  error?: string
}

const accountTypeIcons = {
  [AccountType.CHECKING]: Building2,
  [AccountType.SAVINGS]: PiggyBank,
  [AccountType.CREDIT]: CreditCard,
  [AccountType.INVESTMENT]: TrendingUp
}

export function AccountForm({
  mode,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  error
}: AccountFormProps) {
  const [customBank, setCustomBank] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid }
  } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: initialData?.name || '',
      type: initialData?.type || AccountType.CHECKING,
      balance: initialData?.balance || 0,
      bank: initialData?.bank || '',
      description: initialData?.description || ''
    },
    mode: 'onChange'
  })

  const selectedType = watch('type')
  const selectedBank = watch('bank')

  const handleAccountTypeSelect = (type: AccountFormData['type']) => {
    setValue('type', type, { shouldValidate: true })
  }

  const handleBankSelect = (bank: string) => {
    if (bank === 'Other') {
      setCustomBank(true)
      setValue('bank', '', { shouldValidate: true })
    } else {
      setCustomBank(false)
      setValue('bank', bank, { shouldValidate: true })
    }
  }

  const formatCurrency = (value: string) => {
    // Remove non-numeric characters except decimal point and minus sign
    const numericValue = value.replace(/[^-0-9.]/g, '')
    return numericValue
  }

  const onFormSubmit = async (data: AccountFormData) => {
    try {
      await onSubmit(data)
    } catch (error) {
      // Error handling is managed by parent component
    }
  }

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Account Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Account Name</Label>
        <Input
          id="name"
          placeholder="e.g., Primary Checking"
          {...register('name')}
          className={errors.name ? 'border-destructive' : ''}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      {/* Account Type Selection */}
      <div className="space-y-3">
        <Label>Account Type</Label>
        <div className="grid grid-cols-2 gap-3">
          {Object.values(AccountType).map((type) => {
            const Icon = accountTypeIcons[type]
            const metadata = accountTypeMetadata[type]
            const isSelected = selectedType === type

            return (
              <motion.div
                key={type}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card
                  className={`cursor-pointer transition-all border-2 ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => handleAccountTypeSelect(type)}
                >
                  <CardContent className="p-4 flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${metadata.color} text-white`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{metadata.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {metadata.description}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
        {errors.type && (
          <p className="text-sm text-destructive">{errors.type.message}</p>
        )}
      </div>

      {/* Balance */}
      <div className="space-y-2">
        <Label htmlFor="balance">
          Current Balance
          {selectedType === AccountType.CREDIT && (
            <span className="text-sm text-muted-foreground ml-1">
              (negative for debt)
            </span>
          )}
        </Label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="balance"
            type="number"
            step="0.01"
            placeholder="0.00"
            className={`pl-10 ${errors.balance ? 'border-destructive' : ''}`}
            {...register('balance', {
              valueAsNumber: true
            })}
          />
        </div>
        {errors.balance && (
          <p className="text-sm text-destructive">{errors.balance.message}</p>
        )}
      </div>

      {/* Bank Selection */}
      <div className="space-y-2">
        <Label htmlFor="bank">Bank / Financial Institution</Label>
        {!customBank ? (
          <Select
            value={selectedBank}
            onValueChange={handleBankSelect}
          >
            <SelectTrigger className={errors.bank ? 'border-destructive' : ''}>
              <SelectValue placeholder="Select a bank" />
            </SelectTrigger>
            <SelectContent>
              {commonBanks.map((bank) => (
                <SelectItem key={bank} value={bank}>
                  {bank}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="space-y-2">
            <Input
              placeholder="Enter bank name"
              {...register('bank')}
              className={errors.bank ? 'border-destructive' : ''}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setCustomBank(false)
                setValue('bank', '', { shouldValidate: true })
              }}
            >
              Choose from list
            </Button>
          </div>
        )}
        {errors.bank && (
          <p className="text-sm text-destructive">{errors.bank.message}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          placeholder="Add any additional notes about this account"
          rows={3}
          {...register('description')}
          className={errors.description ? 'border-destructive' : ''}
        />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description.message}</p>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex space-x-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading || !isValid}
          className="flex-1"
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === 'create' ? 'Create Account' : 'Update Account'}
        </Button>
      </div>
    </form>
  )
}