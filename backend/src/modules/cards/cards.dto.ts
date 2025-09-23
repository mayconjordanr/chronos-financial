import { z } from 'zod';

// Card type enum validation
export const CardTypeSchema = z.enum(['CREDIT', 'DEBIT', 'PREPAID']);

// Common validation patterns
const cardNumberPattern = /^[0-9]{13,19}$/;
const cvvPattern = /^[0-9]{3,4}$/;
const monthPattern = /^(0?[1-9]|1[0-2])$/;
const yearPattern = /^20[2-9][0-9]$/;

// Create card request validation
export const CreateCardRequestDTO = z.object({
  accountId: z.string().cuid('Invalid account ID format'),
  cardNumber: z.string()
    .min(13, 'Card number must be at least 13 digits')
    .max(19, 'Card number cannot exceed 19 digits')
    .regex(cardNumberPattern, 'Card number must contain only digits'),
  cardholderName: z.string()
    .min(2, 'Cardholder name must be at least 2 characters')
    .max(100, 'Cardholder name cannot exceed 100 characters')
    .regex(/^[a-zA-Z\s\.'-]+$/, 'Cardholder name contains invalid characters'),
  expiryMonth: z.number()
    .int('Expiry month must be an integer')
    .min(1, 'Expiry month must be between 1 and 12')
    .max(12, 'Expiry month must be between 1 and 12'),
  expiryYear: z.number()
    .int('Expiry year must be an integer')
    .min(2024, 'Expiry year must be 2024 or later')
    .max(2050, 'Expiry year cannot exceed 2050'),
  cvv: z.string()
    .min(3, 'CVV must be at least 3 digits')
    .max(4, 'CVV cannot exceed 4 digits')
    .regex(cvvPattern, 'CVV must contain only digits'),
  cardType: CardTypeSchema,
  brand: z.string()
    .min(2, 'Brand must be at least 2 characters')
    .max(50, 'Brand cannot exceed 50 characters')
    .regex(/^[A-Z\s]+$/, 'Brand must contain only uppercase letters and spaces'),
  issuer: z.string()
    .min(2, 'Issuer must be at least 2 characters')
    .max(100, 'Issuer cannot exceed 100 characters')
    .optional(),
  dailyLimit: z.number()
    .positive('Daily limit must be positive')
    .max(100000, 'Daily limit cannot exceed $100,000')
    .optional(),
  monthlyLimit: z.number()
    .positive('Monthly limit must be positive')
    .max(1000000, 'Monthly limit cannot exceed $1,000,000')
    .optional(),
  pin: z.string()
    .regex(/^[0-9]{4,6}$/, 'PIN must be 4-6 digits')
    .optional(),
  notes: z.string()
    .max(500, 'Notes cannot exceed 500 characters')
    .optional(),
  tags: z.array(z.string().max(50, 'Tag cannot exceed 50 characters'))
    .max(10, 'Cannot have more than 10 tags')
    .optional()
}).strict().refine(data => {
  // Additional validation: monthly limit should be higher than daily limit
  if (data.dailyLimit && data.monthlyLimit && data.dailyLimit > data.monthlyLimit) {
    return false;
  }
  return true;
}, {
  message: 'Daily limit cannot exceed monthly limit',
  path: ['dailyLimit']
}).refine(data => {
  // Validate card number length based on brand
  const cardNumber = data.cardNumber.replace(/\D/g, '');
  switch (data.brand.toUpperCase()) {
    case 'VISA':
      return cardNumber.length === 16 || cardNumber.length === 19;
    case 'MASTERCARD':
      return cardNumber.length === 16;
    case 'AMERICAN EXPRESS':
    case 'AMEX':
      return cardNumber.length === 15;
    case 'DISCOVER':
      return cardNumber.length === 16;
    default:
      return cardNumber.length >= 13 && cardNumber.length <= 19;
  }
}, {
  message: 'Card number length does not match the brand',
  path: ['cardNumber']
});

// Update card request validation
export const UpdateCardRequestDTO = z.object({
  cardholderName: z.string()
    .min(2, 'Cardholder name must be at least 2 characters')
    .max(100, 'Cardholder name cannot exceed 100 characters')
    .regex(/^[a-zA-Z\s\.'-]+$/, 'Cardholder name contains invalid characters')
    .optional(),
  expiryMonth: z.number()
    .int('Expiry month must be an integer')
    .min(1, 'Expiry month must be between 1 and 12')
    .max(12, 'Expiry month must be between 1 and 12')
    .optional(),
  expiryYear: z.number()
    .int('Expiry year must be an integer')
    .min(2024, 'Expiry year must be 2024 or later')
    .max(2050, 'Expiry year cannot exceed 2050')
    .optional(),
  dailyLimit: z.number()
    .positive('Daily limit must be positive')
    .max(100000, 'Daily limit cannot exceed $100,000')
    .nullable()
    .optional(),
  monthlyLimit: z.number()
    .positive('Monthly limit must be positive')
    .max(1000000, 'Monthly limit cannot exceed $1,000,000')
    .nullable()
    .optional(),
  notes: z.string()
    .max(500, 'Notes cannot exceed 500 characters')
    .nullable()
    .optional(),
  tags: z.array(z.string().max(50, 'Tag cannot exceed 50 characters'))
    .max(10, 'Cannot have more than 10 tags')
    .optional()
}).strict().refine(data => {
  // Additional validation: monthly limit should be higher than daily limit
  if (data.dailyLimit && data.monthlyLimit && data.dailyLimit > data.monthlyLimit) {
    return false;
  }
  return true;
}, {
  message: 'Daily limit cannot exceed monthly limit',
  path: ['dailyLimit']
});

// Card filters for query parameters
export const CardFiltersDTO = z.object({
  cardType: CardTypeSchema.optional(),
  isActive: z.string()
    .transform(val => val === 'true' ? true : val === 'false' ? false : undefined)
    .optional(),
  isLocked: z.string()
    .transform(val => val === 'true' ? true : val === 'false' ? false : undefined)
    .optional(),
  brand: z.string()
    .max(50, 'Brand filter cannot exceed 50 characters')
    .optional(),
  search: z.string()
    .max(100, 'Search query cannot exceed 100 characters')
    .optional(),
  tags: z.string()
    .transform(val => val ? val.split(',').map(tag => tag.trim()) : undefined)
    .optional()
}).strict();

// Pagination for query parameters
export const PaginationDTO = z.object({
  page: z.string()
    .transform(val => parseInt(val, 10))
    .refine(val => !isNaN(val) && val >= 1, 'Page must be a positive integer')
    .optional(),
  limit: z.string()
    .transform(val => parseInt(val, 10))
    .refine(val => !isNaN(val) && val >= 1 && val <= 100, 'Limit must be between 1 and 100')
    .optional(),
  sortBy: z.enum(['createdAt', 'cardholderName', 'expiryYear', 'lastUsedAt'])
    .optional(),
  sortOrder: z.enum(['asc', 'desc'])
    .optional()
}).strict();

// Card ID parameter validation
export const CardParamsDTO = z.object({
  cardId: z.string().cuid('Invalid card ID format')
}).strict();

// Bulk activate cards request
export const BulkActivateCardsDTO = z.object({
  cardIds: z.array(z.string().cuid('Invalid card ID format'))
    .min(1, 'At least one card ID is required')
    .max(50, 'Cannot activate more than 50 cards at once')
}).strict();

// Card transaction validation request
export const ValidateCardTransactionDTO = z.object({
  amount: z.number()
    .positive('Transaction amount must be positive')
    .max(100000, 'Transaction amount cannot exceed $100,000')
}).strict();

// Response DTOs for type safety
export const CardResponseDTO = z.object({
  id: z.string(),
  accountId: z.string(),
  maskedNumber: z.string(),
  cardholderName: z.string(),
  expiryMonth: z.number(),
  expiryYear: z.number(),
  cardType: CardTypeSchema,
  brand: z.string(),
  issuer: z.string().nullable(),
  isActive: z.boolean(),
  isLocked: z.boolean(),
  dailyLimit: z.number().nullable(),
  monthlyLimit: z.number().nullable(),
  activatedAt: z.date().nullable(),
  lastUsedAt: z.date().nullable(),
  notes: z.string().nullable(),
  tags: z.array(z.string()),
  createdAt: z.date(),
  updatedAt: z.date(),
  account: z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    balance: z.number().optional()
  })
});

export const CardsListResponseDTO = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    cards: z.array(CardResponseDTO),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number()
    })
  })
});

export const CardDetailResponseDTO = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    card: CardResponseDTO
  })
});

export const CardStatisticsResponseDTO = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    statistics: z.object({
      totalCards: z.number(),
      activeCards: z.number(),
      lockedCards: z.number(),
      cardsByType: z.record(CardTypeSchema, z.number()),
      cardsByBrand: z.record(z.string(), z.number()),
      totalSpendingLimits: z.object({
        daily: z.number(),
        monthly: z.number()
      })
    })
  })
});

// Security validation patterns
export const SecurityValidation = {
  // Luhn algorithm validation function
  validateCardNumber: (cardNumber: string): boolean => {
    const cleaned = cardNumber.replace(/\D/g, '');

    if (cleaned.length < 13 || cleaned.length > 19) {
      return false;
    }

    let sum = 0;
    let isEven = false;

    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned[i]);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  },

  // Validate expiry date
  validateExpiryDate: (month: number, year: number): boolean => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    if (year < currentYear) {
      return false;
    }

    if (year === currentYear && month < currentMonth) {
      return false;
    }

    return true;
  },

  // Validate CVV based on card type
  validateCVV: (cvv: string, cardType: string): boolean => {
    const cleaned = cvv.replace(/\D/g, '');

    // American Express typically uses 4 digits, others use 3
    if (cardType === 'CREDIT' && cleaned.length === 4) {
      return true;
    }

    return cleaned.length === 3;
  }
};

// Export type definitions
export type CreateCardRequest = z.infer<typeof CreateCardRequestDTO>;
export type UpdateCardRequest = z.infer<typeof UpdateCardRequestDTO>;
export type CardFilters = z.infer<typeof CardFiltersDTO>;
export type PaginationParams = z.infer<typeof PaginationDTO>;
export type CardParams = z.infer<typeof CardParamsDTO>;
export type BulkActivateCardsRequest = z.infer<typeof BulkActivateCardsDTO>;
export type ValidateCardTransactionRequest = z.infer<typeof ValidateCardTransactionDTO>;
export type CardResponse = z.infer<typeof CardResponseDTO>;
export type CardsListResponse = z.infer<typeof CardsListResponseDTO>;
export type CardDetailResponse = z.infer<typeof CardDetailResponseDTO>;
export type CardStatisticsResponse = z.infer<typeof CardStatisticsResponseDTO>;