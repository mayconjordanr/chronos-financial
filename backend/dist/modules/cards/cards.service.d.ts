import { PrismaClient, Card, CardType, CardTransaction } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
export interface CreateCardData {
    accountId: string;
    cardNumber: string;
    cardholderName: string;
    expiryMonth: number;
    expiryYear: number;
    cvv: string;
    cardType: CardType;
    brand: string;
    issuer?: string;
    dailyLimit?: number;
    monthlyLimit?: number;
    pin?: string;
    notes?: string;
    tags?: string[];
}
export interface UpdateCardData {
    cardholderName?: string;
    expiryMonth?: number;
    expiryYear?: number;
    dailyLimit?: number;
    monthlyLimit?: number;
    notes?: string;
    tags?: string[];
}
export interface CardFilters {
    cardType?: CardType;
    isActive?: boolean;
    isLocked?: boolean;
    brand?: string;
    search?: string;
    tags?: string[];
}
export interface PaginationOptions {
    page?: number;
    limit?: number;
    sortBy?: 'createdAt' | 'cardholderName' | 'expiryYear' | 'lastUsedAt';
    sortOrder?: 'asc' | 'desc';
}
export interface CardResult {
    success: boolean;
    message: string;
    card?: Card & {
        account: {
            id: string;
            name: string;
            type: string;
            balance?: Decimal;
        };
    };
}
export interface CardsResult {
    success: boolean;
    message: string;
    cards?: (Card & {
        account: {
            id: string;
            name: string;
            type: string;
        };
    })[];
    total?: number;
}
export interface CardTransactionResult {
    success: boolean;
    message: string;
    transactions?: CardTransaction[];
}
export interface CardValidationResult {
    success: boolean;
    message: string;
    isValid?: boolean;
}
export interface CardStatistics {
    totalCards: number;
    activeCards: number;
    lockedCards: number;
    cardsByType: Record<CardType, number>;
    cardsByBrand: Record<string, number>;
    totalSpendingLimits: {
        daily: Decimal;
        monthly: Decimal;
    };
}
export interface CardStatisticsResult {
    success: boolean;
    message: string;
    statistics?: CardStatistics;
}
export interface BulkOperationResult {
    success: boolean;
    message: string;
    succeeded: string[];
    failed: string[];
    errors?: Record<string, string>;
}
export declare class CardService {
    private prisma;
    constructor(prisma: PrismaClient);
    private encryptSensitiveData;
    private decryptSensitiveData;
    private maskCardNumber;
    private validateCardNumber;
    private validateCVV;
    private validateExpiryDate;
    createCard(data: CreateCardData, userId: string, tenantId: string): Promise<CardResult>;
    getCards(userId: string, tenantId: string, filters?: CardFilters, pagination?: PaginationOptions): Promise<CardsResult>;
    getCard(cardId: string, userId: string, tenantId: string): Promise<CardResult>;
    updateCard(cardId: string, data: UpdateCardData, userId: string, tenantId: string): Promise<CardResult>;
    deleteCard(cardId: string, userId: string, tenantId: string): Promise<CardResult>;
    activateCard(cardId: string, userId: string, tenantId: string): Promise<CardResult>;
    deactivateCard(cardId: string, userId: string, tenantId: string): Promise<CardResult>;
    validateCardTransaction(cardId: string, amount: number, userId: string, tenantId: string): Promise<CardValidationResult>;
    getCardTransactions(cardId: string, userId: string, tenantId: string): Promise<CardTransactionResult>;
    getCardStatistics(userId: string, tenantId: string): Promise<CardStatisticsResult>;
    bulkActivateCards(cardIds: string[], userId: string, tenantId: string): Promise<BulkOperationResult>;
}
//# sourceMappingURL=cards.service.d.ts.map