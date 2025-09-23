import { CardNetwork } from '../schemas/card'

export interface CardNetworkConfig {
  name: string
  displayName: string
  colors: {
    primary: string
    secondary: string
    gradient: string
  }
  patterns: string[]
  validation: {
    startsWith: string[]
    lengths: number[]
  }
  logo?: string
  textColor: string
}

export const cardNetworks: Record<CardNetwork, CardNetworkConfig> = {
  visa: {
    name: 'visa',
    displayName: 'Visa',
    colors: {
      primary: '#1a1f71',
      secondary: '#0066cc',
      gradient: 'linear-gradient(135deg, #1a1f71 0%, #0066cc 100%)',
    },
    patterns: ['4'],
    validation: {
      startsWith: ['4'],
      lengths: [13, 16, 19],
    },
    textColor: '#ffffff',
  },
  mastercard: {
    name: 'mastercard',
    displayName: 'Mastercard',
    colors: {
      primary: '#eb001b',
      secondary: '#f79e1b',
      gradient: 'linear-gradient(135deg, #eb001b 0%, #f79e1b 100%)',
    },
    patterns: ['5', '2'],
    validation: {
      startsWith: ['5', '2221', '2222', '2223', '2224', '2225', '2226', '2227', '2228', '2229'],
      lengths: [16],
    },
    textColor: '#ffffff',
  },
  amex: {
    name: 'amex',
    displayName: 'American Express',
    colors: {
      primary: '#006fcf',
      secondary: '#00d4aa',
      gradient: 'linear-gradient(135deg, #006fcf 0%, #00d4aa 100%)',
    },
    patterns: ['34', '37'],
    validation: {
      startsWith: ['34', '37'],
      lengths: [15],
    },
    textColor: '#ffffff',
  },
  discover: {
    name: 'discover',
    displayName: 'Discover',
    colors: {
      primary: '#ff6000',
      secondary: '#ffaa00',
      gradient: 'linear-gradient(135deg, #ff6000 0%, #ffaa00 100%)',
    },
    patterns: ['6'],
    validation: {
      startsWith: ['6011', '622', '64', '65'],
      lengths: [16, 19],
    },
    textColor: '#ffffff',
  },
}

// Utility function to detect card network from card number
export const detectCardNetwork = (cardNumber: string): CardNetwork | null => {
  const cleanNumber = cardNumber.replace(/\D/g, '')

  // Check each network's validation patterns
  for (const [network, config] of Object.entries(cardNetworks)) {
    const { startsWith } = config.validation

    for (const pattern of startsWith) {
      if (cleanNumber.startsWith(pattern)) {
        return network as CardNetwork
      }
    }
  }

  return null
}

// Utility function to detect network from last 4 digits (simplified for demo)
export const detectNetworkFromLast4 = (last4: string): CardNetwork => {
  // This is a simplified detection - in real world, you'd need more context
  // For demo purposes, we'll use some simple heuristics
  const firstDigit = last4[0]

  switch (firstDigit) {
    case '4':
      return 'visa'
    case '5':
      return 'mastercard'
    case '3':
      return 'amex'
    case '6':
      return 'discover'
    default:
      return 'visa' // default fallback
  }
}

// Get card network configuration
export const getCardNetworkConfig = (network: CardNetwork): CardNetworkConfig => {
  return cardNetworks[network]
}

// Get all supported networks for forms/selectors
export const getSupportedNetworks = (): CardNetworkConfig[] => {
  return Object.values(cardNetworks)
}

// Validate card number against network rules
export const validateCardNumberForNetwork = (
  cardNumber: string,
  network: CardNetwork
): boolean => {
  const cleanNumber = cardNumber.replace(/\D/g, '')
  const config = cardNetworks[network]

  // Check if starts with correct pattern
  const startsWithPattern = config.validation.startsWith.some(pattern =>
    cleanNumber.startsWith(pattern)
  )

  // Check if length is valid
  const hasValidLength = config.validation.lengths.includes(cleanNumber.length)

  return startsWithPattern && hasValidLength
}

// Format card number with appropriate spacing for network
export const formatCardNumberForNetwork = (
  cardNumber: string,
  network: CardNetwork
): string => {
  const cleanNumber = cardNumber.replace(/\D/g, '')

  switch (network) {
    case 'amex':
      // American Express: 4-6-5 format
      return cleanNumber.replace(/(\d{4})(\d{6})(\d{5})/, '$1 $2 $3')
    case 'visa':
    case 'mastercard':
    case 'discover':
    default:
      // Standard: 4-4-4-4 format
      return cleanNumber.replace(/(\d{4})/g, '$1 ').trim()
  }
}

// Get brand logo URL or emoji representation
export const getNetworkLogo = (network: CardNetwork): string => {
  const logoMap: Record<CardNetwork, string> = {
    visa: '💳', // In real app, you'd use actual logo URLs
    mastercard: '💳',
    amex: '💳',
    discover: '💳',
  }

  return logoMap[network]
}

// CSS classes for card backgrounds
export const getNetworkBackgroundClasses = (network: CardNetwork): string => {
  const classMap: Record<CardNetwork, string> = {
    visa: 'bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500',
    mastercard: 'bg-gradient-to-br from-red-600 via-orange-500 to-yellow-500',
    amex: 'bg-gradient-to-br from-blue-600 via-teal-500 to-green-500',
    discover: 'bg-gradient-to-br from-orange-600 via-orange-500 to-yellow-500',
  }

  return classMap[network]
}