import { z } from 'zod';
export declare const CardTypeSchema: z.ZodEnum<["CREDIT", "DEBIT", "PREPAID"]>;
export declare const CreateCardRequestDTO: z.ZodEffects<z.ZodEffects<z.ZodObject<{
    accountId: z.ZodString;
    cardNumber: z.ZodString;
    cardholderName: z.ZodString;
    expiryMonth: z.ZodNumber;
    expiryYear: z.ZodNumber;
    cvv: z.ZodString;
    cardType: z.ZodEnum<["CREDIT", "DEBIT", "PREPAID"]>;
    brand: z.ZodString;
    issuer: z.ZodOptional<z.ZodString>;
    dailyLimit: z.ZodOptional<z.ZodNumber>;
    monthlyLimit: z.ZodOptional<z.ZodNumber>;
    pin: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strict", z.ZodTypeAny, {
    accountId: string;
    cardholderName: string;
    expiryYear: number;
    cardNumber: string;
    expiryMonth: number;
    cvv: string;
    cardType: "CREDIT" | "DEBIT" | "PREPAID";
    brand: string;
    tags?: string[] | undefined;
    notes?: string | undefined;
    issuer?: string | undefined;
    dailyLimit?: number | undefined;
    monthlyLimit?: number | undefined;
    pin?: string | undefined;
}, {
    accountId: string;
    cardholderName: string;
    expiryYear: number;
    cardNumber: string;
    expiryMonth: number;
    cvv: string;
    cardType: "CREDIT" | "DEBIT" | "PREPAID";
    brand: string;
    tags?: string[] | undefined;
    notes?: string | undefined;
    issuer?: string | undefined;
    dailyLimit?: number | undefined;
    monthlyLimit?: number | undefined;
    pin?: string | undefined;
}>, {
    accountId: string;
    cardholderName: string;
    expiryYear: number;
    cardNumber: string;
    expiryMonth: number;
    cvv: string;
    cardType: "CREDIT" | "DEBIT" | "PREPAID";
    brand: string;
    tags?: string[] | undefined;
    notes?: string | undefined;
    issuer?: string | undefined;
    dailyLimit?: number | undefined;
    monthlyLimit?: number | undefined;
    pin?: string | undefined;
}, {
    accountId: string;
    cardholderName: string;
    expiryYear: number;
    cardNumber: string;
    expiryMonth: number;
    cvv: string;
    cardType: "CREDIT" | "DEBIT" | "PREPAID";
    brand: string;
    tags?: string[] | undefined;
    notes?: string | undefined;
    issuer?: string | undefined;
    dailyLimit?: number | undefined;
    monthlyLimit?: number | undefined;
    pin?: string | undefined;
}>, {
    accountId: string;
    cardholderName: string;
    expiryYear: number;
    cardNumber: string;
    expiryMonth: number;
    cvv: string;
    cardType: "CREDIT" | "DEBIT" | "PREPAID";
    brand: string;
    tags?: string[] | undefined;
    notes?: string | undefined;
    issuer?: string | undefined;
    dailyLimit?: number | undefined;
    monthlyLimit?: number | undefined;
    pin?: string | undefined;
}, {
    accountId: string;
    cardholderName: string;
    expiryYear: number;
    cardNumber: string;
    expiryMonth: number;
    cvv: string;
    cardType: "CREDIT" | "DEBIT" | "PREPAID";
    brand: string;
    tags?: string[] | undefined;
    notes?: string | undefined;
    issuer?: string | undefined;
    dailyLimit?: number | undefined;
    monthlyLimit?: number | undefined;
    pin?: string | undefined;
}>;
export declare const UpdateCardRequestDTO: z.ZodEffects<z.ZodObject<{
    cardholderName: z.ZodOptional<z.ZodString>;
    expiryMonth: z.ZodOptional<z.ZodNumber>;
    expiryYear: z.ZodOptional<z.ZodNumber>;
    dailyLimit: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    monthlyLimit: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strict", z.ZodTypeAny, {
    tags?: string[] | undefined;
    notes?: string | null | undefined;
    cardholderName?: string | undefined;
    expiryYear?: number | undefined;
    expiryMonth?: number | undefined;
    dailyLimit?: number | null | undefined;
    monthlyLimit?: number | null | undefined;
}, {
    tags?: string[] | undefined;
    notes?: string | null | undefined;
    cardholderName?: string | undefined;
    expiryYear?: number | undefined;
    expiryMonth?: number | undefined;
    dailyLimit?: number | null | undefined;
    monthlyLimit?: number | null | undefined;
}>, {
    tags?: string[] | undefined;
    notes?: string | null | undefined;
    cardholderName?: string | undefined;
    expiryYear?: number | undefined;
    expiryMonth?: number | undefined;
    dailyLimit?: number | null | undefined;
    monthlyLimit?: number | null | undefined;
}, {
    tags?: string[] | undefined;
    notes?: string | null | undefined;
    cardholderName?: string | undefined;
    expiryYear?: number | undefined;
    expiryMonth?: number | undefined;
    dailyLimit?: number | null | undefined;
    monthlyLimit?: number | null | undefined;
}>;
export declare const CardFiltersDTO: z.ZodObject<{
    cardType: z.ZodOptional<z.ZodEnum<["CREDIT", "DEBIT", "PREPAID"]>>;
    isActive: z.ZodOptional<z.ZodEffects<z.ZodString, boolean | undefined, string>>;
    isLocked: z.ZodOptional<z.ZodEffects<z.ZodString, boolean | undefined, string>>;
    brand: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodEffects<z.ZodString, string[] | undefined, string>>;
}, "strict", z.ZodTypeAny, {
    isActive?: boolean | undefined;
    search?: string | undefined;
    tags?: string[] | undefined;
    cardType?: "CREDIT" | "DEBIT" | "PREPAID" | undefined;
    brand?: string | undefined;
    isLocked?: boolean | undefined;
}, {
    isActive?: string | undefined;
    search?: string | undefined;
    tags?: string | undefined;
    cardType?: "CREDIT" | "DEBIT" | "PREPAID" | undefined;
    brand?: string | undefined;
    isLocked?: string | undefined;
}>;
export declare const PaginationDTO: z.ZodObject<{
    page: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodString, number, string>, number, string>>;
    limit: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodString, number, string>, number, string>>;
    sortBy: z.ZodOptional<z.ZodEnum<["createdAt", "cardholderName", "expiryYear", "lastUsedAt"]>>;
    sortOrder: z.ZodOptional<z.ZodEnum<["asc", "desc"]>>;
}, "strict", z.ZodTypeAny, {
    page?: number | undefined;
    limit?: number | undefined;
    sortBy?: "createdAt" | "cardholderName" | "expiryYear" | "lastUsedAt" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
}, {
    page?: string | undefined;
    limit?: string | undefined;
    sortBy?: "createdAt" | "cardholderName" | "expiryYear" | "lastUsedAt" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
}>;
export declare const CardParamsDTO: z.ZodObject<{
    cardId: z.ZodString;
}, "strict", z.ZodTypeAny, {
    cardId: string;
}, {
    cardId: string;
}>;
export declare const BulkActivateCardsDTO: z.ZodObject<{
    cardIds: z.ZodArray<z.ZodString, "many">;
}, "strict", z.ZodTypeAny, {
    cardIds: string[];
}, {
    cardIds: string[];
}>;
export declare const ValidateCardTransactionDTO: z.ZodObject<{
    amount: z.ZodNumber;
}, "strict", z.ZodTypeAny, {
    amount: number;
}, {
    amount: number;
}>;
export declare const CardResponseDTO: z.ZodObject<{
    id: z.ZodString;
    accountId: z.ZodString;
    maskedNumber: z.ZodString;
    cardholderName: z.ZodString;
    expiryMonth: z.ZodNumber;
    expiryYear: z.ZodNumber;
    cardType: z.ZodEnum<["CREDIT", "DEBIT", "PREPAID"]>;
    brand: z.ZodString;
    issuer: z.ZodNullable<z.ZodString>;
    isActive: z.ZodBoolean;
    isLocked: z.ZodBoolean;
    dailyLimit: z.ZodNullable<z.ZodNumber>;
    monthlyLimit: z.ZodNullable<z.ZodNumber>;
    activatedAt: z.ZodNullable<z.ZodDate>;
    lastUsedAt: z.ZodNullable<z.ZodDate>;
    notes: z.ZodNullable<z.ZodString>;
    tags: z.ZodArray<z.ZodString, "many">;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
    account: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        type: z.ZodString;
        balance: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        type: string;
        name: string;
        id: string;
        balance?: number | undefined;
    }, {
        type: string;
        name: string;
        id: string;
        balance?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    isActive: boolean;
    tags: string[];
    accountId: string;
    notes: string | null;
    account: {
        type: string;
        name: string;
        id: string;
        balance?: number | undefined;
    };
    cardholderName: string;
    expiryYear: number;
    lastUsedAt: Date | null;
    maskedNumber: string;
    expiryMonth: number;
    cardType: "CREDIT" | "DEBIT" | "PREPAID";
    brand: string;
    issuer: string | null;
    isLocked: boolean;
    dailyLimit: number | null;
    monthlyLimit: number | null;
    activatedAt: Date | null;
}, {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    isActive: boolean;
    tags: string[];
    accountId: string;
    notes: string | null;
    account: {
        type: string;
        name: string;
        id: string;
        balance?: number | undefined;
    };
    cardholderName: string;
    expiryYear: number;
    lastUsedAt: Date | null;
    maskedNumber: string;
    expiryMonth: number;
    cardType: "CREDIT" | "DEBIT" | "PREPAID";
    brand: string;
    issuer: string | null;
    isLocked: boolean;
    dailyLimit: number | null;
    monthlyLimit: number | null;
    activatedAt: Date | null;
}>;
export declare const CardsListResponseDTO: z.ZodObject<{
    success: z.ZodBoolean;
    message: z.ZodString;
    data: z.ZodObject<{
        cards: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            accountId: z.ZodString;
            maskedNumber: z.ZodString;
            cardholderName: z.ZodString;
            expiryMonth: z.ZodNumber;
            expiryYear: z.ZodNumber;
            cardType: z.ZodEnum<["CREDIT", "DEBIT", "PREPAID"]>;
            brand: z.ZodString;
            issuer: z.ZodNullable<z.ZodString>;
            isActive: z.ZodBoolean;
            isLocked: z.ZodBoolean;
            dailyLimit: z.ZodNullable<z.ZodNumber>;
            monthlyLimit: z.ZodNullable<z.ZodNumber>;
            activatedAt: z.ZodNullable<z.ZodDate>;
            lastUsedAt: z.ZodNullable<z.ZodDate>;
            notes: z.ZodNullable<z.ZodString>;
            tags: z.ZodArray<z.ZodString, "many">;
            createdAt: z.ZodDate;
            updatedAt: z.ZodDate;
            account: z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
                type: z.ZodString;
                balance: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                type: string;
                name: string;
                id: string;
                balance?: number | undefined;
            }, {
                type: string;
                name: string;
                id: string;
                balance?: number | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            isActive: boolean;
            tags: string[];
            accountId: string;
            notes: string | null;
            account: {
                type: string;
                name: string;
                id: string;
                balance?: number | undefined;
            };
            cardholderName: string;
            expiryYear: number;
            lastUsedAt: Date | null;
            maskedNumber: string;
            expiryMonth: number;
            cardType: "CREDIT" | "DEBIT" | "PREPAID";
            brand: string;
            issuer: string | null;
            isLocked: boolean;
            dailyLimit: number | null;
            monthlyLimit: number | null;
            activatedAt: Date | null;
        }, {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            isActive: boolean;
            tags: string[];
            accountId: string;
            notes: string | null;
            account: {
                type: string;
                name: string;
                id: string;
                balance?: number | undefined;
            };
            cardholderName: string;
            expiryYear: number;
            lastUsedAt: Date | null;
            maskedNumber: string;
            expiryMonth: number;
            cardType: "CREDIT" | "DEBIT" | "PREPAID";
            brand: string;
            issuer: string | null;
            isLocked: boolean;
            dailyLimit: number | null;
            monthlyLimit: number | null;
            activatedAt: Date | null;
        }>, "many">;
        pagination: z.ZodObject<{
            page: z.ZodNumber;
            limit: z.ZodNumber;
            total: z.ZodNumber;
            totalPages: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        }, {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        }>;
    }, "strip", z.ZodTypeAny, {
        cards: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            isActive: boolean;
            tags: string[];
            accountId: string;
            notes: string | null;
            account: {
                type: string;
                name: string;
                id: string;
                balance?: number | undefined;
            };
            cardholderName: string;
            expiryYear: number;
            lastUsedAt: Date | null;
            maskedNumber: string;
            expiryMonth: number;
            cardType: "CREDIT" | "DEBIT" | "PREPAID";
            brand: string;
            issuer: string | null;
            isLocked: boolean;
            dailyLimit: number | null;
            monthlyLimit: number | null;
            activatedAt: Date | null;
        }[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }, {
        cards: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            isActive: boolean;
            tags: string[];
            accountId: string;
            notes: string | null;
            account: {
                type: string;
                name: string;
                id: string;
                balance?: number | undefined;
            };
            cardholderName: string;
            expiryYear: number;
            lastUsedAt: Date | null;
            maskedNumber: string;
            expiryMonth: number;
            cardType: "CREDIT" | "DEBIT" | "PREPAID";
            brand: string;
            issuer: string | null;
            isLocked: boolean;
            dailyLimit: number | null;
            monthlyLimit: number | null;
            activatedAt: Date | null;
        }[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    message: string;
    data: {
        cards: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            isActive: boolean;
            tags: string[];
            accountId: string;
            notes: string | null;
            account: {
                type: string;
                name: string;
                id: string;
                balance?: number | undefined;
            };
            cardholderName: string;
            expiryYear: number;
            lastUsedAt: Date | null;
            maskedNumber: string;
            expiryMonth: number;
            cardType: "CREDIT" | "DEBIT" | "PREPAID";
            brand: string;
            issuer: string | null;
            isLocked: boolean;
            dailyLimit: number | null;
            monthlyLimit: number | null;
            activatedAt: Date | null;
        }[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    };
}, {
    success: boolean;
    message: string;
    data: {
        cards: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            isActive: boolean;
            tags: string[];
            accountId: string;
            notes: string | null;
            account: {
                type: string;
                name: string;
                id: string;
                balance?: number | undefined;
            };
            cardholderName: string;
            expiryYear: number;
            lastUsedAt: Date | null;
            maskedNumber: string;
            expiryMonth: number;
            cardType: "CREDIT" | "DEBIT" | "PREPAID";
            brand: string;
            issuer: string | null;
            isLocked: boolean;
            dailyLimit: number | null;
            monthlyLimit: number | null;
            activatedAt: Date | null;
        }[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    };
}>;
export declare const CardDetailResponseDTO: z.ZodObject<{
    success: z.ZodBoolean;
    message: z.ZodString;
    data: z.ZodObject<{
        card: z.ZodObject<{
            id: z.ZodString;
            accountId: z.ZodString;
            maskedNumber: z.ZodString;
            cardholderName: z.ZodString;
            expiryMonth: z.ZodNumber;
            expiryYear: z.ZodNumber;
            cardType: z.ZodEnum<["CREDIT", "DEBIT", "PREPAID"]>;
            brand: z.ZodString;
            issuer: z.ZodNullable<z.ZodString>;
            isActive: z.ZodBoolean;
            isLocked: z.ZodBoolean;
            dailyLimit: z.ZodNullable<z.ZodNumber>;
            monthlyLimit: z.ZodNullable<z.ZodNumber>;
            activatedAt: z.ZodNullable<z.ZodDate>;
            lastUsedAt: z.ZodNullable<z.ZodDate>;
            notes: z.ZodNullable<z.ZodString>;
            tags: z.ZodArray<z.ZodString, "many">;
            createdAt: z.ZodDate;
            updatedAt: z.ZodDate;
            account: z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
                type: z.ZodString;
                balance: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                type: string;
                name: string;
                id: string;
                balance?: number | undefined;
            }, {
                type: string;
                name: string;
                id: string;
                balance?: number | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            isActive: boolean;
            tags: string[];
            accountId: string;
            notes: string | null;
            account: {
                type: string;
                name: string;
                id: string;
                balance?: number | undefined;
            };
            cardholderName: string;
            expiryYear: number;
            lastUsedAt: Date | null;
            maskedNumber: string;
            expiryMonth: number;
            cardType: "CREDIT" | "DEBIT" | "PREPAID";
            brand: string;
            issuer: string | null;
            isLocked: boolean;
            dailyLimit: number | null;
            monthlyLimit: number | null;
            activatedAt: Date | null;
        }, {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            isActive: boolean;
            tags: string[];
            accountId: string;
            notes: string | null;
            account: {
                type: string;
                name: string;
                id: string;
                balance?: number | undefined;
            };
            cardholderName: string;
            expiryYear: number;
            lastUsedAt: Date | null;
            maskedNumber: string;
            expiryMonth: number;
            cardType: "CREDIT" | "DEBIT" | "PREPAID";
            brand: string;
            issuer: string | null;
            isLocked: boolean;
            dailyLimit: number | null;
            monthlyLimit: number | null;
            activatedAt: Date | null;
        }>;
    }, "strip", z.ZodTypeAny, {
        card: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            isActive: boolean;
            tags: string[];
            accountId: string;
            notes: string | null;
            account: {
                type: string;
                name: string;
                id: string;
                balance?: number | undefined;
            };
            cardholderName: string;
            expiryYear: number;
            lastUsedAt: Date | null;
            maskedNumber: string;
            expiryMonth: number;
            cardType: "CREDIT" | "DEBIT" | "PREPAID";
            brand: string;
            issuer: string | null;
            isLocked: boolean;
            dailyLimit: number | null;
            monthlyLimit: number | null;
            activatedAt: Date | null;
        };
    }, {
        card: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            isActive: boolean;
            tags: string[];
            accountId: string;
            notes: string | null;
            account: {
                type: string;
                name: string;
                id: string;
                balance?: number | undefined;
            };
            cardholderName: string;
            expiryYear: number;
            lastUsedAt: Date | null;
            maskedNumber: string;
            expiryMonth: number;
            cardType: "CREDIT" | "DEBIT" | "PREPAID";
            brand: string;
            issuer: string | null;
            isLocked: boolean;
            dailyLimit: number | null;
            monthlyLimit: number | null;
            activatedAt: Date | null;
        };
    }>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    message: string;
    data: {
        card: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            isActive: boolean;
            tags: string[];
            accountId: string;
            notes: string | null;
            account: {
                type: string;
                name: string;
                id: string;
                balance?: number | undefined;
            };
            cardholderName: string;
            expiryYear: number;
            lastUsedAt: Date | null;
            maskedNumber: string;
            expiryMonth: number;
            cardType: "CREDIT" | "DEBIT" | "PREPAID";
            brand: string;
            issuer: string | null;
            isLocked: boolean;
            dailyLimit: number | null;
            monthlyLimit: number | null;
            activatedAt: Date | null;
        };
    };
}, {
    success: boolean;
    message: string;
    data: {
        card: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            isActive: boolean;
            tags: string[];
            accountId: string;
            notes: string | null;
            account: {
                type: string;
                name: string;
                id: string;
                balance?: number | undefined;
            };
            cardholderName: string;
            expiryYear: number;
            lastUsedAt: Date | null;
            maskedNumber: string;
            expiryMonth: number;
            cardType: "CREDIT" | "DEBIT" | "PREPAID";
            brand: string;
            issuer: string | null;
            isLocked: boolean;
            dailyLimit: number | null;
            monthlyLimit: number | null;
            activatedAt: Date | null;
        };
    };
}>;
export declare const CardStatisticsResponseDTO: z.ZodObject<{
    success: z.ZodBoolean;
    message: z.ZodString;
    data: z.ZodObject<{
        statistics: z.ZodObject<{
            totalCards: z.ZodNumber;
            activeCards: z.ZodNumber;
            lockedCards: z.ZodNumber;
            cardsByType: z.ZodRecord<z.ZodEnum<["CREDIT", "DEBIT", "PREPAID"]>, z.ZodNumber>;
            cardsByBrand: z.ZodRecord<z.ZodString, z.ZodNumber>;
            totalSpendingLimits: z.ZodObject<{
                daily: z.ZodNumber;
                monthly: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                daily: number;
                monthly: number;
            }, {
                daily: number;
                monthly: number;
            }>;
        }, "strip", z.ZodTypeAny, {
            totalCards: number;
            activeCards: number;
            lockedCards: number;
            cardsByType: Partial<Record<"CREDIT" | "DEBIT" | "PREPAID", number>>;
            cardsByBrand: Record<string, number>;
            totalSpendingLimits: {
                daily: number;
                monthly: number;
            };
        }, {
            totalCards: number;
            activeCards: number;
            lockedCards: number;
            cardsByType: Partial<Record<"CREDIT" | "DEBIT" | "PREPAID", number>>;
            cardsByBrand: Record<string, number>;
            totalSpendingLimits: {
                daily: number;
                monthly: number;
            };
        }>;
    }, "strip", z.ZodTypeAny, {
        statistics: {
            totalCards: number;
            activeCards: number;
            lockedCards: number;
            cardsByType: Partial<Record<"CREDIT" | "DEBIT" | "PREPAID", number>>;
            cardsByBrand: Record<string, number>;
            totalSpendingLimits: {
                daily: number;
                monthly: number;
            };
        };
    }, {
        statistics: {
            totalCards: number;
            activeCards: number;
            lockedCards: number;
            cardsByType: Partial<Record<"CREDIT" | "DEBIT" | "PREPAID", number>>;
            cardsByBrand: Record<string, number>;
            totalSpendingLimits: {
                daily: number;
                monthly: number;
            };
        };
    }>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    message: string;
    data: {
        statistics: {
            totalCards: number;
            activeCards: number;
            lockedCards: number;
            cardsByType: Partial<Record<"CREDIT" | "DEBIT" | "PREPAID", number>>;
            cardsByBrand: Record<string, number>;
            totalSpendingLimits: {
                daily: number;
                monthly: number;
            };
        };
    };
}, {
    success: boolean;
    message: string;
    data: {
        statistics: {
            totalCards: number;
            activeCards: number;
            lockedCards: number;
            cardsByType: Partial<Record<"CREDIT" | "DEBIT" | "PREPAID", number>>;
            cardsByBrand: Record<string, number>;
            totalSpendingLimits: {
                daily: number;
                monthly: number;
            };
        };
    };
}>;
export declare const SecurityValidation: {
    validateCardNumber: (cardNumber: string) => boolean;
    validateExpiryDate: (month: number, year: number) => boolean;
    validateCVV: (cvv: string, cardType: string) => boolean;
};
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
//# sourceMappingURL=cards.dto.d.ts.map