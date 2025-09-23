"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityValidation = exports.CardStatisticsResponseDTO = exports.CardDetailResponseDTO = exports.CardsListResponseDTO = exports.CardResponseDTO = exports.ValidateCardTransactionDTO = exports.BulkActivateCardsDTO = exports.CardParamsDTO = exports.PaginationDTO = exports.CardFiltersDTO = exports.UpdateCardRequestDTO = exports.CreateCardRequestDTO = exports.CardTypeSchema = void 0;
const zod_1 = require("zod");
exports.CardTypeSchema = zod_1.z.enum(['CREDIT', 'DEBIT', 'PREPAID']);
const cardNumberPattern = /^[0-9]{13,19}$/;
const cvvPattern = /^[0-9]{3,4}$/;
const monthPattern = /^(0?[1-9]|1[0-2])$/;
const yearPattern = /^20[2-9][0-9]$/;
exports.CreateCardRequestDTO = zod_1.z.object({
    accountId: zod_1.z.string().cuid('Invalid account ID format'),
    cardNumber: zod_1.z.string()
        .min(13, 'Card number must be at least 13 digits')
        .max(19, 'Card number cannot exceed 19 digits')
        .regex(cardNumberPattern, 'Card number must contain only digits'),
    cardholderName: zod_1.z.string()
        .min(2, 'Cardholder name must be at least 2 characters')
        .max(100, 'Cardholder name cannot exceed 100 characters')
        .regex(/^[a-zA-Z\s\.'-]+$/, 'Cardholder name contains invalid characters'),
    expiryMonth: zod_1.z.number()
        .int('Expiry month must be an integer')
        .min(1, 'Expiry month must be between 1 and 12')
        .max(12, 'Expiry month must be between 1 and 12'),
    expiryYear: zod_1.z.number()
        .int('Expiry year must be an integer')
        .min(2024, 'Expiry year must be 2024 or later')
        .max(2050, 'Expiry year cannot exceed 2050'),
    cvv: zod_1.z.string()
        .min(3, 'CVV must be at least 3 digits')
        .max(4, 'CVV cannot exceed 4 digits')
        .regex(cvvPattern, 'CVV must contain only digits'),
    cardType: exports.CardTypeSchema,
    brand: zod_1.z.string()
        .min(2, 'Brand must be at least 2 characters')
        .max(50, 'Brand cannot exceed 50 characters')
        .regex(/^[A-Z\s]+$/, 'Brand must contain only uppercase letters and spaces'),
    issuer: zod_1.z.string()
        .min(2, 'Issuer must be at least 2 characters')
        .max(100, 'Issuer cannot exceed 100 characters')
        .optional(),
    dailyLimit: zod_1.z.number()
        .positive('Daily limit must be positive')
        .max(100000, 'Daily limit cannot exceed $100,000')
        .optional(),
    monthlyLimit: zod_1.z.number()
        .positive('Monthly limit must be positive')
        .max(1000000, 'Monthly limit cannot exceed $1,000,000')
        .optional(),
    pin: zod_1.z.string()
        .regex(/^[0-9]{4,6}$/, 'PIN must be 4-6 digits')
        .optional(),
    notes: zod_1.z.string()
        .max(500, 'Notes cannot exceed 500 characters')
        .optional(),
    tags: zod_1.z.array(zod_1.z.string().max(50, 'Tag cannot exceed 50 characters'))
        .max(10, 'Cannot have more than 10 tags')
        .optional()
}).strict().refine(data => {
    if (data.dailyLimit && data.monthlyLimit && data.dailyLimit > data.monthlyLimit) {
        return false;
    }
    return true;
}, {
    message: 'Daily limit cannot exceed monthly limit',
    path: ['dailyLimit']
}).refine(data => {
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
exports.UpdateCardRequestDTO = zod_1.z.object({
    cardholderName: zod_1.z.string()
        .min(2, 'Cardholder name must be at least 2 characters')
        .max(100, 'Cardholder name cannot exceed 100 characters')
        .regex(/^[a-zA-Z\s\.'-]+$/, 'Cardholder name contains invalid characters')
        .optional(),
    expiryMonth: zod_1.z.number()
        .int('Expiry month must be an integer')
        .min(1, 'Expiry month must be between 1 and 12')
        .max(12, 'Expiry month must be between 1 and 12')
        .optional(),
    expiryYear: zod_1.z.number()
        .int('Expiry year must be an integer')
        .min(2024, 'Expiry year must be 2024 or later')
        .max(2050, 'Expiry year cannot exceed 2050')
        .optional(),
    dailyLimit: zod_1.z.number()
        .positive('Daily limit must be positive')
        .max(100000, 'Daily limit cannot exceed $100,000')
        .nullable()
        .optional(),
    monthlyLimit: zod_1.z.number()
        .positive('Monthly limit must be positive')
        .max(1000000, 'Monthly limit cannot exceed $1,000,000')
        .nullable()
        .optional(),
    notes: zod_1.z.string()
        .max(500, 'Notes cannot exceed 500 characters')
        .nullable()
        .optional(),
    tags: zod_1.z.array(zod_1.z.string().max(50, 'Tag cannot exceed 50 characters'))
        .max(10, 'Cannot have more than 10 tags')
        .optional()
}).strict().refine(data => {
    if (data.dailyLimit && data.monthlyLimit && data.dailyLimit > data.monthlyLimit) {
        return false;
    }
    return true;
}, {
    message: 'Daily limit cannot exceed monthly limit',
    path: ['dailyLimit']
});
exports.CardFiltersDTO = zod_1.z.object({
    cardType: exports.CardTypeSchema.optional(),
    isActive: zod_1.z.string()
        .transform(val => val === 'true' ? true : val === 'false' ? false : undefined)
        .optional(),
    isLocked: zod_1.z.string()
        .transform(val => val === 'true' ? true : val === 'false' ? false : undefined)
        .optional(),
    brand: zod_1.z.string()
        .max(50, 'Brand filter cannot exceed 50 characters')
        .optional(),
    search: zod_1.z.string()
        .max(100, 'Search query cannot exceed 100 characters')
        .optional(),
    tags: zod_1.z.string()
        .transform(val => val ? val.split(',').map(tag => tag.trim()) : undefined)
        .optional()
}).strict();
exports.PaginationDTO = zod_1.z.object({
    page: zod_1.z.string()
        .transform(val => parseInt(val, 10))
        .refine(val => !isNaN(val) && val >= 1, 'Page must be a positive integer')
        .optional(),
    limit: zod_1.z.string()
        .transform(val => parseInt(val, 10))
        .refine(val => !isNaN(val) && val >= 1 && val <= 100, 'Limit must be between 1 and 100')
        .optional(),
    sortBy: zod_1.z.enum(['createdAt', 'cardholderName', 'expiryYear', 'lastUsedAt'])
        .optional(),
    sortOrder: zod_1.z.enum(['asc', 'desc'])
        .optional()
}).strict();
exports.CardParamsDTO = zod_1.z.object({
    cardId: zod_1.z.string().cuid('Invalid card ID format')
}).strict();
exports.BulkActivateCardsDTO = zod_1.z.object({
    cardIds: zod_1.z.array(zod_1.z.string().cuid('Invalid card ID format'))
        .min(1, 'At least one card ID is required')
        .max(50, 'Cannot activate more than 50 cards at once')
}).strict();
exports.ValidateCardTransactionDTO = zod_1.z.object({
    amount: zod_1.z.number()
        .positive('Transaction amount must be positive')
        .max(100000, 'Transaction amount cannot exceed $100,000')
}).strict();
exports.CardResponseDTO = zod_1.z.object({
    id: zod_1.z.string(),
    accountId: zod_1.z.string(),
    maskedNumber: zod_1.z.string(),
    cardholderName: zod_1.z.string(),
    expiryMonth: zod_1.z.number(),
    expiryYear: zod_1.z.number(),
    cardType: exports.CardTypeSchema,
    brand: zod_1.z.string(),
    issuer: zod_1.z.string().nullable(),
    isActive: zod_1.z.boolean(),
    isLocked: zod_1.z.boolean(),
    dailyLimit: zod_1.z.number().nullable(),
    monthlyLimit: zod_1.z.number().nullable(),
    activatedAt: zod_1.z.date().nullable(),
    lastUsedAt: zod_1.z.date().nullable(),
    notes: zod_1.z.string().nullable(),
    tags: zod_1.z.array(zod_1.z.string()),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
    account: zod_1.z.object({
        id: zod_1.z.string(),
        name: zod_1.z.string(),
        type: zod_1.z.string(),
        balance: zod_1.z.number().optional()
    })
});
exports.CardsListResponseDTO = zod_1.z.object({
    success: zod_1.z.boolean(),
    message: zod_1.z.string(),
    data: zod_1.z.object({
        cards: zod_1.z.array(exports.CardResponseDTO),
        pagination: zod_1.z.object({
            page: zod_1.z.number(),
            limit: zod_1.z.number(),
            total: zod_1.z.number(),
            totalPages: zod_1.z.number()
        })
    })
});
exports.CardDetailResponseDTO = zod_1.z.object({
    success: zod_1.z.boolean(),
    message: zod_1.z.string(),
    data: zod_1.z.object({
        card: exports.CardResponseDTO
    })
});
exports.CardStatisticsResponseDTO = zod_1.z.object({
    success: zod_1.z.boolean(),
    message: zod_1.z.string(),
    data: zod_1.z.object({
        statistics: zod_1.z.object({
            totalCards: zod_1.z.number(),
            activeCards: zod_1.z.number(),
            lockedCards: zod_1.z.number(),
            cardsByType: zod_1.z.record(exports.CardTypeSchema, zod_1.z.number()),
            cardsByBrand: zod_1.z.record(zod_1.z.string(), zod_1.z.number()),
            totalSpendingLimits: zod_1.z.object({
                daily: zod_1.z.number(),
                monthly: zod_1.z.number()
            })
        })
    })
});
exports.SecurityValidation = {
    validateCardNumber: (cardNumber) => {
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
    validateExpiryDate: (month, year) => {
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
    validateCVV: (cvv, cardType) => {
        const cleaned = cvv.replace(/\D/g, '');
        if (cardType === 'CREDIT' && cleaned.length === 4) {
            return true;
        }
        return cleaned.length === 3;
    }
};
//# sourceMappingURL=cards.dto.js.map