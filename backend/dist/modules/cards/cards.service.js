"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CardService = void 0;
const client_1 = require("@prisma/client");
const library_1 = require("@prisma/client/runtime/library");
const crypto_1 = __importDefault(require("crypto"));
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.CARD_ENCRYPTION_KEY || crypto_1.default.randomBytes(32).toString('hex');
class CardService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    encryptSensitiveData(data) {
        const iv = crypto_1.default.randomBytes(16);
        const cipher = crypto_1.default.createCipher(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY);
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    }
    decryptSensitiveData(encryptedData) {
        try {
            const parts = encryptedData.split(':');
            const iv = Buffer.from(parts.shift(), 'hex');
            const encrypted = parts.join(':');
            const decipher = crypto_1.default.createDecipher(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY);
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        }
        catch (error) {
            throw new Error('Failed to decrypt sensitive data');
        }
    }
    maskCardNumber(cardNumber) {
        const cleaned = cardNumber.replace(/\D/g, '');
        const lastFour = cleaned.slice(-4);
        const masked = '****-****-****-' + lastFour;
        return masked;
    }
    validateCardNumber(cardNumber) {
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
    }
    validateCVV(cvv, cardType) {
        const cleaned = cvv.replace(/\D/g, '');
        if (cardType === client_1.CardType.CREDIT && cleaned.length === 4) {
            return true;
        }
        return cleaned.length === 3;
    }
    validateExpiryDate(month, year) {
        if (month < 1 || month > 12) {
            return false;
        }
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
    }
    async createCard(data, userId, tenantId) {
        try {
            if (!this.validateCardNumber(data.cardNumber)) {
                return {
                    success: false,
                    message: 'Invalid card number format or failed Luhn validation'
                };
            }
            if (!this.validateCVV(data.cvv, data.cardType)) {
                return {
                    success: false,
                    message: 'Invalid CVV format'
                };
            }
            if (!this.validateExpiryDate(data.expiryMonth, data.expiryYear)) {
                return {
                    success: false,
                    message: 'Card has expired or invalid expiry date'
                };
            }
            return await this.prisma.$transaction(async (tx) => {
                const account = await tx.account.findFirst({
                    where: {
                        id: data.accountId,
                        tenantId,
                        userId
                    }
                });
                if (!account) {
                    throw new Error('Account not found or access denied');
                }
                const existingCard = await tx.card.findFirst({
                    where: {
                        tenantId,
                        maskedNumber: this.maskCardNumber(data.cardNumber)
                    }
                });
                if (existingCard) {
                    throw new Error('Card with this number already exists');
                }
                const encryptedCardNumber = this.encryptSensitiveData(data.cardNumber);
                const encryptedCVV = this.encryptSensitiveData(data.cvv);
                const encryptedPIN = data.pin ? this.encryptSensitiveData(data.pin) : null;
                const card = await tx.card.create({
                    data: {
                        tenantId,
                        userId,
                        accountId: data.accountId,
                        cardNumber: encryptedCardNumber,
                        maskedNumber: this.maskCardNumber(data.cardNumber),
                        cardholderName: data.cardholderName,
                        expiryMonth: data.expiryMonth,
                        expiryYear: data.expiryYear,
                        cvv: encryptedCVV,
                        cardType: data.cardType,
                        brand: data.brand.toUpperCase(),
                        issuer: data.issuer,
                        dailyLimit: data.dailyLimit ? new library_1.Decimal(data.dailyLimit) : null,
                        monthlyLimit: data.monthlyLimit ? new library_1.Decimal(data.monthlyLimit) : null,
                        pin: encryptedPIN,
                        notes: data.notes,
                        tags: data.tags || [],
                        isActive: false,
                        activationCode: crypto_1.default.randomBytes(6).toString('hex').toUpperCase()
                    },
                    include: {
                        account: {
                            select: {
                                id: true,
                                name: true,
                                type: true,
                                balance: true
                            }
                        }
                    }
                });
                return {
                    success: true,
                    message: 'Card created successfully',
                    card
                };
            });
        }
        catch (error) {
            console.error('Error creating card:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to create card'
            };
        }
    }
    async getCards(userId, tenantId, filters, pagination) {
        try {
            const page = pagination?.page || 1;
            const limit = pagination?.limit || 50;
            const skip = (page - 1) * limit;
            const sortBy = pagination?.sortBy || 'createdAt';
            const sortOrder = pagination?.sortOrder || 'desc';
            const where = {
                tenantId,
                userId
            };
            if (filters?.cardType) {
                where.cardType = filters.cardType;
            }
            if (filters?.isActive !== undefined) {
                where.isActive = filters.isActive;
            }
            if (filters?.isLocked !== undefined) {
                where.isLocked = filters.isLocked;
            }
            if (filters?.brand) {
                where.brand = filters.brand.toUpperCase();
            }
            if (filters?.search) {
                where.OR = [
                    {
                        cardholderName: {
                            contains: filters.search,
                            mode: 'insensitive'
                        }
                    },
                    {
                        maskedNumber: {
                            contains: filters.search
                        }
                    },
                    {
                        notes: {
                            contains: filters.search,
                            mode: 'insensitive'
                        }
                    }
                ];
            }
            if (filters?.tags && filters.tags.length > 0) {
                where.tags = {
                    hasSome: filters.tags
                };
            }
            const [cards, total] = await Promise.all([
                this.prisma.card.findMany({
                    where,
                    select: {
                        id: true,
                        tenantId: true,
                        userId: true,
                        accountId: true,
                        maskedNumber: true,
                        cardholderName: true,
                        expiryMonth: true,
                        expiryYear: true,
                        cardType: true,
                        brand: true,
                        issuer: true,
                        isActive: true,
                        isLocked: true,
                        dailyLimit: true,
                        monthlyLimit: true,
                        activatedAt: true,
                        lastUsedAt: true,
                        notes: true,
                        tags: true,
                        createdAt: true,
                        updatedAt: true,
                        account: {
                            select: {
                                id: true,
                                name: true,
                                type: true
                            }
                        }
                    },
                    orderBy: {
                        [sortBy]: sortOrder
                    },
                    skip,
                    take: limit
                }),
                this.prisma.card.count({ where })
            ]);
            return {
                success: true,
                message: 'Cards retrieved successfully',
                cards: cards,
                total
            };
        }
        catch (error) {
            console.error('Error getting cards:', error);
            return {
                success: false,
                message: 'Failed to retrieve cards'
            };
        }
    }
    async getCard(cardId, userId, tenantId) {
        try {
            const card = await this.prisma.card.findFirst({
                where: {
                    id: cardId,
                    tenantId,
                    userId
                },
                select: {
                    id: true,
                    tenantId: true,
                    userId: true,
                    accountId: true,
                    maskedNumber: true,
                    cardholderName: true,
                    expiryMonth: true,
                    expiryYear: true,
                    cardType: true,
                    brand: true,
                    issuer: true,
                    isActive: true,
                    isLocked: true,
                    dailyLimit: true,
                    monthlyLimit: true,
                    activatedAt: true,
                    lastUsedAt: true,
                    notes: true,
                    tags: true,
                    createdAt: true,
                    updatedAt: true,
                    account: {
                        select: {
                            id: true,
                            name: true,
                            type: true,
                            balance: true
                        }
                    }
                }
            });
            if (!card) {
                return {
                    success: false,
                    message: 'Card not found or access denied'
                };
            }
            return {
                success: true,
                message: 'Card retrieved successfully',
                card: card
            };
        }
        catch (error) {
            console.error('Error getting card:', error);
            return {
                success: false,
                message: 'Failed to retrieve card'
            };
        }
    }
    async updateCard(cardId, data, userId, tenantId) {
        try {
            return await this.prisma.$transaction(async (tx) => {
                const existingCard = await tx.card.findFirst({
                    where: {
                        id: cardId,
                        tenantId,
                        userId
                    }
                });
                if (!existingCard) {
                    throw new Error('Card not found or access denied');
                }
                if (data.expiryMonth !== undefined || data.expiryYear !== undefined) {
                    const month = data.expiryMonth ?? existingCard.expiryMonth;
                    const year = data.expiryYear ?? existingCard.expiryYear;
                    if (!this.validateExpiryDate(month, year)) {
                        throw new Error('Invalid expiry date');
                    }
                }
                const updatedCard = await tx.card.update({
                    where: { id: cardId },
                    data: {
                        cardholderName: data.cardholderName,
                        expiryMonth: data.expiryMonth,
                        expiryYear: data.expiryYear,
                        dailyLimit: data.dailyLimit ? new library_1.Decimal(data.dailyLimit) : undefined,
                        monthlyLimit: data.monthlyLimit ? new library_1.Decimal(data.monthlyLimit) : undefined,
                        notes: data.notes,
                        tags: data.tags,
                        updatedAt: new Date()
                    },
                    include: {
                        account: {
                            select: {
                                id: true,
                                name: true,
                                type: true,
                                balance: true
                            }
                        }
                    }
                });
                return {
                    success: true,
                    message: 'Card updated successfully',
                    card: {
                        ...updatedCard,
                        cardNumber: undefined,
                        cvv: undefined,
                        pin: undefined,
                        activationCode: undefined
                    }
                };
            });
        }
        catch (error) {
            console.error('Error updating card:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to update card'
            };
        }
    }
    async deleteCard(cardId, userId, tenantId) {
        try {
            return await this.prisma.$transaction(async (tx) => {
                const existingCard = await tx.card.findFirst({
                    where: {
                        id: cardId,
                        tenantId,
                        userId
                    },
                    include: {
                        account: {
                            select: {
                                id: true,
                                name: true,
                                type: true
                            }
                        }
                    }
                });
                if (!existingCard) {
                    throw new Error('Card not found or access denied');
                }
                const lockedCard = await tx.card.update({
                    where: { id: cardId },
                    data: {
                        isLocked: true,
                        isActive: false,
                        updatedAt: new Date()
                    }
                });
                return {
                    success: true,
                    message: 'Card locked successfully',
                    card: {
                        ...lockedCard,
                        account: existingCard.account,
                        cardNumber: undefined,
                        cvv: undefined,
                        pin: undefined,
                        activationCode: undefined
                    }
                };
            });
        }
        catch (error) {
            console.error('Error deleting card:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to delete card'
            };
        }
    }
    async activateCard(cardId, userId, tenantId) {
        try {
            return await this.prisma.$transaction(async (tx) => {
                const existingCard = await tx.card.findFirst({
                    where: {
                        id: cardId,
                        tenantId,
                        userId
                    }
                });
                if (!existingCard) {
                    throw new Error('Card not found or access denied');
                }
                if (existingCard.isActive) {
                    throw new Error('Card is already active');
                }
                if (existingCard.isLocked) {
                    throw new Error('Cannot activate a locked card');
                }
                if (!this.validateExpiryDate(existingCard.expiryMonth, existingCard.expiryYear)) {
                    throw new Error('Cannot activate an expired card');
                }
                const activatedCard = await tx.card.update({
                    where: { id: cardId },
                    data: {
                        isActive: true,
                        activatedAt: new Date(),
                        activationCode: null,
                        updatedAt: new Date()
                    },
                    include: {
                        account: {
                            select: {
                                id: true,
                                name: true,
                                type: true,
                                balance: true
                            }
                        }
                    }
                });
                return {
                    success: true,
                    message: 'Card activated successfully',
                    card: {
                        ...activatedCard,
                        cardNumber: undefined,
                        cvv: undefined,
                        pin: undefined
                    }
                };
            });
        }
        catch (error) {
            console.error('Error activating card:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to activate card'
            };
        }
    }
    async deactivateCard(cardId, userId, tenantId) {
        try {
            return await this.prisma.$transaction(async (tx) => {
                const existingCard = await tx.card.findFirst({
                    where: {
                        id: cardId,
                        tenantId,
                        userId
                    }
                });
                if (!existingCard) {
                    throw new Error('Card not found or access denied');
                }
                const deactivatedCard = await tx.card.update({
                    where: { id: cardId },
                    data: {
                        isActive: false,
                        updatedAt: new Date()
                    },
                    include: {
                        account: {
                            select: {
                                id: true,
                                name: true,
                                type: true,
                                balance: true
                            }
                        }
                    }
                });
                return {
                    success: true,
                    message: 'Card deactivated successfully',
                    card: {
                        ...deactivatedCard,
                        cardNumber: undefined,
                        cvv: undefined,
                        pin: undefined,
                        activationCode: undefined
                    }
                };
            });
        }
        catch (error) {
            console.error('Error deactivating card:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to deactivate card'
            };
        }
    }
    async validateCardTransaction(cardId, amount, userId, tenantId) {
        try {
            const card = await this.prisma.card.findFirst({
                where: {
                    id: cardId,
                    tenantId,
                    userId
                },
                include: {
                    account: true
                }
            });
            if (!card) {
                return {
                    success: false,
                    message: 'Card not found or access denied'
                };
            }
            if (!card.isActive) {
                return {
                    success: false,
                    message: 'Card is not active'
                };
            }
            if (card.isLocked) {
                return {
                    success: false,
                    message: 'Card is locked'
                };
            }
            if (card.dailyLimit && amount > card.dailyLimit.toNumber()) {
                return {
                    success: false,
                    message: 'Transaction amount exceeds daily limit'
                };
            }
            if (card.cardType === client_1.CardType.DEBIT && amount > card.account.balance.toNumber()) {
                return {
                    success: false,
                    message: 'Insufficient funds in linked account'
                };
            }
            return {
                success: true,
                message: 'Transaction validation passed',
                isValid: true
            };
        }
        catch (error) {
            console.error('Error validating card transaction:', error);
            return {
                success: false,
                message: 'Failed to validate transaction'
            };
        }
    }
    async getCardTransactions(cardId, userId, tenantId) {
        try {
            const card = await this.prisma.card.findFirst({
                where: {
                    id: cardId,
                    tenantId,
                    userId
                }
            });
            if (!card) {
                return {
                    success: false,
                    message: 'Card not found or access denied'
                };
            }
            const transactions = await this.prisma.cardTransaction.findMany({
                where: {
                    cardId,
                    tenantId,
                    userId
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });
            return {
                success: true,
                message: 'Card transactions retrieved successfully',
                transactions
            };
        }
        catch (error) {
            console.error('Error getting card transactions:', error);
            return {
                success: false,
                message: 'Failed to retrieve card transactions'
            };
        }
    }
    async getCardStatistics(userId, tenantId) {
        try {
            const cards = await this.prisma.card.findMany({
                where: {
                    tenantId,
                    userId
                }
            });
            const totalCards = cards.length;
            const activeCards = cards.filter(card => card.isActive).length;
            const lockedCards = cards.filter(card => card.isLocked).length;
            const cardsByType = cards.reduce((acc, card) => {
                acc[card.cardType] = (acc[card.cardType] || 0) + 1;
                return acc;
            }, {});
            const cardsByBrand = cards.reduce((acc, card) => {
                acc[card.brand] = (acc[card.brand] || 0) + 1;
                return acc;
            }, {});
            const totalSpendingLimits = cards.reduce((acc, card) => {
                if (card.dailyLimit) {
                    acc.daily = acc.daily.add(card.dailyLimit);
                }
                if (card.monthlyLimit) {
                    acc.monthly = acc.monthly.add(card.monthlyLimit);
                }
                return acc;
            }, { daily: new library_1.Decimal(0), monthly: new library_1.Decimal(0) });
            const statistics = {
                totalCards,
                activeCards,
                lockedCards,
                cardsByType,
                cardsByBrand,
                totalSpendingLimits
            };
            return {
                success: true,
                message: 'Card statistics retrieved successfully',
                statistics
            };
        }
        catch (error) {
            console.error('Error getting card statistics:', error);
            return {
                success: false,
                message: 'Failed to retrieve card statistics'
            };
        }
    }
    async bulkActivateCards(cardIds, userId, tenantId) {
        const succeeded = [];
        const failed = [];
        const errors = {};
        for (const cardId of cardIds) {
            try {
                const result = await this.activateCard(cardId, userId, tenantId);
                if (result.success) {
                    succeeded.push(cardId);
                }
                else {
                    failed.push(cardId);
                    errors[cardId] = result.message;
                }
            }
            catch (error) {
                failed.push(cardId);
                errors[cardId] = error instanceof Error ? error.message : 'Unknown error';
            }
        }
        return {
            success: failed.length === 0,
            message: failed.length === 0
                ? 'All cards activated successfully'
                : `${succeeded.length} cards activated, ${failed.length} failed`,
            succeeded,
            failed,
            errors
        };
    }
}
exports.CardService = CardService;
//# sourceMappingURL=cards.service.js.map