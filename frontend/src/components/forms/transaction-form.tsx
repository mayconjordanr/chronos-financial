'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { Loader2, DollarSign, Calendar, FileText, Tag, CreditCard, ArrowRightLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

import {
  TransactionFormData,
  TransferFormData,
  defaultTransactionValues,
  getTransactionSchema
} from '@/lib/schemas/transaction'
import { Account, Category, Transaction } from '@/types/api'

interface TransactionFormProps {
  mode: 'create' | 'edit'
  transaction?: Transaction
  accounts: Account[]
  categories: Category[]
  onSubmit: (data: TransactionFormData | TransferFormData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
  className?: string
}

export function TransactionForm({
  mode,
  transaction,
  accounts,
  categories,
  onSubmit,
  onCancel,
  isLoading = false,
  className
}: TransactionFormProps) {
  const [transactionType, setTransactionType] = useState<'income' | 'expense' | 'transfer'>(
    transaction?.type || 'expense'
  )

  const schema = getTransactionSchema(transactionType)

  const form = useForm<TransactionFormData | TransferFormData>({
    resolver: zodResolver(schema),
    defaultValues: transaction ? {
      description: transaction.description,
      amount: transaction.amount,
      type: transaction.type,
      account_id: transaction.account_id,
      category_id: transaction.category_id || '',
      date: transaction.date.split('T')[0], // Extract date part
      notes: '',
      ...(transaction.type === 'transfer' && { to_account_id: '' })
    } : {
      ...defaultTransactionValues,
      type: transactionType,
      account_id: '',
      category_id: '',
    }
  })

  const { watch, setValue, reset } = form

  // Watch transaction type changes
  const watchedType = watch('type')

  useEffect(() => {
    if (watchedType !== transactionType) {
      setTransactionType(watchedType)
      // Reset category when switching between income/expense and transfer
      if (watchedType === 'transfer') {
        setValue('category_id', '')
      }
    }
  }, [watchedType, transactionType, setValue])

  // Filter categories based on transaction type
  const filteredCategories = categories.filter(category =>
    transactionType === 'transfer' ? false : category.type === transactionType
  )

  // Filter accounts (exclude current account for transfer destination)
  const getFilteredAccounts = (excludeAccountId?: string) => {
    return accounts.filter(account =>
      account.is_active && account.id !== excludeAccountId
    )
  }

  const handleSubmit = async (data: TransactionFormData | TransferFormData) => {
    try {
      await onSubmit(data)
      if (mode === 'create') {
        reset()
      }
    } catch {
      // Error handling is done in the parent component
    }
  }

  const transactionTypeOptions = [
    { value: 'expense', label: 'Expense', icon: DollarSign, color: 'text-red-500' },
    { value: 'income', label: 'Income', icon: DollarSign, color: 'text-green-500' },
    { value: 'transfer', label: 'Transfer', icon: ArrowRightLeft, color: 'text-blue-500' },
  ]

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Transaction Type Selection */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transaction Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select transaction type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {transactionTypeOptions.map((option) => {
                          const Icon = option.icon
                          return (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center gap-2">
                                <Icon className={`h-4 w-4 ${option.color}`} />
                                {option.label}
                              </div>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </motion.div>

            {/* Description Field */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Description
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={
                          transactionType === 'transfer'
                            ? 'Transfer description...'
                            : `${transactionType === 'income' ? 'Income' : 'Expense'} description...`
                        }
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </motion.div>

            {/* Amount Field */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Amount
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="999999.99"
                          placeholder="0.00"
                          className="pl-7"
                          {...field}
                          onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Source Account */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <FormField
                  control={form.control}
                  name="account_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        {transactionType === 'transfer' ? 'From Account' : 'Account'}
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {getFilteredAccounts().map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              <div className="flex items-center justify-between w-full">
                                <span>{account.name}</span>
                                <span className="text-sm text-muted-foreground ml-2">
                                  ${account.balance.toLocaleString()}
                                </span>
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

              {/* Destination Account (Transfer only) */}
              {transactionType === 'transfer' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <FormField
                    control={form.control}
                    name="to_account_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <ArrowRightLeft className="h-4 w-4" />
                          To Account
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select destination" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {getFilteredAccounts(watch('account_id')).map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                <div className="flex items-center justify-between w-full">
                                  <span>{account.name}</span>
                                  <span className="text-sm text-muted-foreground ml-2">
                                    ${account.balance.toLocaleString()}
                                  </span>
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
              )}

              {/* Category (Income/Expense only) */}
              {transactionType !== 'transfer' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className={transactionType === 'transfer' ? 'col-span-1' : 'md:col-span-1'}
                >
                  <FormField
                    control={form.control}
                    name="category_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Tag className="h-4 w-4" />
                          Category
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {filteredCategories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                <div className="flex items-center gap-2">
                                  <div
                                    className="h-3 w-3 rounded-full"
                                    style={{ backgroundColor: category.color }}
                                  />
                                  {category.name}
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
              )}
            </div>

            {/* Date Field */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Date
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        max={new Date().toISOString().split('T')[0]}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </motion.div>

            {/* Notes Field */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <textarea
                        placeholder="Additional notes..."
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </motion.div>

            <Separator />

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3"
            >
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="min-w-[120px]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {mode === 'create' ? 'Creating...' : 'Updating...'}
                  </>
                ) : (
                  <>
                    {mode === 'create' ? 'Create Transaction' : 'Update Transaction'}
                  </>
                )}
              </Button>
            </motion.div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}