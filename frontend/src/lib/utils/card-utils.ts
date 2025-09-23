import { format, parseISO, isAfter, addMonths } from 'date-fns'
import { CardNetwork, CardType } from '../schemas/card'
import { detectCardNetwork, getCardNetworkConfig } from '../data/card-networks'

/**
 * Mask card number showing only last 4 digits
 */
export const maskCardNumber = (last4: string): string => {
  if (!last4 || last4.length !== 4) {
    return '•••• •••• •••• ••••'
  }
  return `•••• •••• •••• ${last4}`
}

/**
 * Format card number with appropriate spacing
 */
export const formatCardNumber = (cardNumber: string): string => {
  const cleaned = cardNumber.replace(/\D/g, '')
  const groups = cleaned.match(/.{1,4}/g) || []
  return groups.join(' ')
}

/**
 * Mask full card number for display (shows first 4 and last 4)
 */
export const maskFullCardNumber = (cardNumber: string): string => {
  const cleaned = cardNumber.replace(/\D/g, '')
  if (cleaned.length < 8) return maskCardNumber(cleaned.slice(-4))

  const first4 = cleaned.slice(0, 4)
  const last4 = cleaned.slice(-4)
  const middle = '•'.repeat(Math.max(0, cleaned.length - 8))

  return formatCardNumber(`${first4}${middle}${last4}`)
}

/**
 * Validate card number using Luhn algorithm
 */
export const validateCardNumberLuhn = (cardNumber: string): boolean => {
  const cleaned = cardNumber.replace(/\D/g, '')

  if (cleaned.length < 13 || cleaned.length > 19) {
    return false
  }

  let sum = 0
  let isEven = false

  // Process digits from right to left
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i])

    if (isEven) {
      digit *= 2
      if (digit > 9) {
        digit -= 9
      }
    }

    sum += digit
    isEven = !isEven
  }

  return sum % 10 === 0
}

/**
 * Detect card network from partial number
 */
export const detectNetworkFromPartial = (partialNumber: string): CardNetwork | null => {
  return detectCardNetwork(partialNumber)
}

/**
 * Format expiry date for display
 */
export const formatExpiryDate = (expiryDate: string): string => {
  try {
    // Assuming expiryDate is in YYYY-MM format
    const [year, month] = expiryDate.split('-')
    return `${month}/${year.slice(-2)}`
  } catch {
    return expiryDate
  }
}

/**
 * Format expiry date from MM/YY or MM/YYYY to YYYY-MM
 */
export const parseExpiryDate = (input: string): string => {
  const cleaned = input.replace(/\D/g, '')

  if (cleaned.length === 4) {
    // MMYY format
    const month = cleaned.slice(0, 2)
    const year = '20' + cleaned.slice(2, 4)
    return `${year}-${month}`
  } else if (cleaned.length === 6) {
    // MMYYYY format
    const month = cleaned.slice(0, 2)
    const year = cleaned.slice(2, 6)
    return `${year}-${month}`
  }

  return input
}

/**
 * Check if expiry date is valid (not expired)
 */
export const isExpiryDateValid = (expiryDate: string): boolean => {
  try {
    const [year, month] = expiryDate.split('-').map(Number)
    const expiry = new Date(year, month - 1) // month - 1 because Date months are 0-indexed
    const now = new Date()
    const currentMonth = new Date(now.getFullYear(), now.getMonth())

    return expiry >= currentMonth
  } catch {
    return false
  }
}

/**
 * Get months until expiry
 */
export const getMonthsUntilExpiry = (expiryDate: string): number => {
  try {
    const [year, month] = expiryDate.split('-').map(Number)
    const expiry = new Date(year, month - 1)
    const now = new Date()

    const diffTime = expiry.getTime() - now.getTime()
    const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30))

    return Math.max(0, diffMonths)
  } catch {
    return 0
  }
}

/**
 * Check if card is expiring soon (within 3 months)
 */
export const isCardExpiringSoon = (expiryDate: string): boolean => {
  return getMonthsUntilExpiry(expiryDate) <= 3
}

/**
 * Format currency amount
 */
export const formatCurrency = (amount: number, currency = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}

/**
 * Generate card display name
 */
export const generateCardDisplayName = (
  network: CardNetwork,
  type: CardType,
  last4: string
): string => {
  const networkConfig = getCardNetworkConfig(network)
  return `${networkConfig.displayName} ${type === 'credit' ? 'Credit' : 'Debit'} •••• ${last4}`
}

/**
 * Get card type color for UI
 */
export const getCardTypeColor = (type: CardType): string => {
  return type === 'credit' ? 'text-blue-600' : 'text-green-600'
}

/**
 * Get card status color
 */
export const getCardStatusColor = (isActive: boolean): string => {
  return isActive ? 'text-green-600' : 'text-gray-500'
}

/**
 * Validate credit limit based on card type
 */
export const validateCreditLimit = (limit: number | undefined, type: CardType): boolean => {
  if (type === 'debit') {
    return limit === undefined || limit === 0
  }

  if (type === 'credit') {
    return limit !== undefined && limit > 0
  }

  return false
}

/**
 * Clean and validate last 4 digits input
 */
export const cleanLast4Digits = (input: string): string => {
  return input.replace(/\D/g, '').slice(-4)
}

/**
 * Format input for last 4 digits (live formatting)
 */
export const formatLast4Input = (input: string): string => {
  const cleaned = cleanLast4Digits(input)
  return cleaned.length <= 4 ? cleaned : cleaned.slice(0, 4)
}

/**
 * Generate a secure card identifier (for URLs, etc.)
 */
export const generateCardIdentifier = (name: string, last4: string): string => {
  const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '-')
  return `${cleanName}-${last4}`
}

/**
 * Sort cards by priority (primary first, then by creation date)
 */
export const sortCardsByPriority = (cards: Array<{
  isPrimary: boolean
  createdAt: string
  [key: string]: any
}>): Array<any> => {
  return [...cards].sort((a, b) => {
    // Primary cards come first
    if (a.isPrimary && !b.isPrimary) return -1
    if (!a.isPrimary && b.isPrimary) return 1

    // Then sort by creation date (newest first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

/**
 * Filter cards by search query
 */
export const filterCardsBySearch = (cards: Array<{
  name: string
  last4digits: string
  network: CardNetwork
  bank: string
  [key: string]: any
}>, query: string): Array<any> => {
  if (!query.trim()) return cards

  const searchTerm = query.toLowerCase().trim()

  return cards.filter(card =>
    card.name.toLowerCase().includes(searchTerm) ||
    card.last4digits.includes(searchTerm) ||
    card.network.toLowerCase().includes(searchTerm) ||
    card.bank.toLowerCase().includes(searchTerm)
  )
}

/**
 * Get card security tips based on type and usage
 */
export const getCardSecurityTips = (type: CardType): string[] => {
  const commonTips = [
    'Never share your card details with anyone',
    'Monitor your transactions regularly',
    'Report suspicious activity immediately',
    'Use secure payment methods online',
  ]

  const creditTips = [
    'Pay your balance in full each month',
    'Keep credit utilization below 30%',
    'Set up automatic payments to avoid late fees',
  ]

  const debitTips = [
    'Monitor your account balance regularly',
    'Use ATMs from trusted locations',
    'Enable account alerts for transactions',
  ]

  return type === 'credit'
    ? [...commonTips, ...creditTips]
    : [...commonTips, ...debitTips]
}