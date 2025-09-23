import { PrismaClient, Card, CardType, CardTransaction, Account } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import crypto from 'crypto';

// Encryption configuration
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.CARD_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

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

export class CardService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Encrypt sensitive data
   */
  private encryptSensitiveData(data: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt sensitive data
   */
  private decryptSensitiveData(encryptedData: string): string {
    try {
      const parts = encryptedData.split(':');
      const iv = Buffer.from(parts.shift()!, 'hex');
      const encrypted = parts.join(':');
      const decipher = crypto.createDecipher(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      throw new Error('Failed to decrypt sensitive data');
    }
  }

  /**
   * Mask card number for display
   */
  private maskCardNumber(cardNumber: string): string {
    const cleaned = cardNumber.replace(/\D/g, '');
    const lastFour = cleaned.slice(-4);
    const masked = '****-****-****-' + lastFour;
    return masked;
  }

  /**
   * Validate card number using Luhn algorithm
   */
  private validateCardNumber(cardNumber: string): boolean {
    const cleaned = cardNumber.replace(/\D/g, '');

    if (cleaned.length < 13 || cleaned.length > 19) {
      return false;
    }

    // Luhn algorithm
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

  /**
   * Validate CVV format
   */
  private validateCVV(cvv: string, cardType?: CardType): boolean {
    const cleaned = cvv.replace(/\D/g, '');

    // American Express typically uses 4 digits, others use 3
    if (cardType === CardType.CREDIT && cleaned.length === 4) {
      return true;
    }

    return cleaned.length === 3;
  }

  /**
   * Validate card expiry date
   */
  private validateExpiryDate(month: number, year: number): boolean {
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

  /**
   * Create a new card
   */
  async createCard(
    data: CreateCardData,
    userId: string,
    tenantId: string
  ): Promise<CardResult> {
    try {
      // Validate card number format
      if (!this.validateCardNumber(data.cardNumber)) {
        return {
          success: false,
          message: 'Invalid card number format or failed Luhn validation'
        };
      }

      // Validate CVV
      if (!this.validateCVV(data.cvv, data.cardType)) {
        return {
          success: false,
          message: 'Invalid CVV format'
        };
      }

      // Validate expiry date
      if (!this.validateExpiryDate(data.expiryMonth, data.expiryYear)) {
        return {
          success: false,
          message: 'Card has expired or invalid expiry date'
        };
      }

      return await this.prisma.$transaction(async (tx) => {
        // CRITICAL: Validate account belongs to user and tenant
        const account = await tx.account.findFirst({
          where: {
            id: data.accountId,
            tenantId, // CRITICAL: Tenant isolation
            userId
          }
        });

        if (!account) {
          throw new Error('Account not found or access denied');
        }

        // Check for duplicate card number (encrypted comparison would be needed in production)
        const existingCard = await tx.card.findFirst({
          where: {
            tenantId,
            maskedNumber: this.maskCardNumber(data.cardNumber)
          }
        });

        if (existingCard) {
          throw new Error('Card with this number already exists');
        }

        // Encrypt sensitive data
        const encryptedCardNumber = this.encryptSensitiveData(data.cardNumber);
        const encryptedCVV = this.encryptSensitiveData(data.cvv);
        const encryptedPIN = data.pin ? this.encryptSensitiveData(data.pin) : null;

        // Create the card
        const card = await tx.card.create({
          data: {
            tenantId, // CRITICAL: Always include tenant ID
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
            dailyLimit: data.dailyLimit ? new Decimal(data.dailyLimit) : null,
            monthlyLimit: data.monthlyLimit ? new Decimal(data.monthlyLimit) : null,
            pin: encryptedPIN,
            notes: data.notes,
            tags: data.tags || [],
            isActive: false, // Cards start inactive
            activationCode: crypto.randomBytes(6).toString('hex').toUpperCase()
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
    } catch (error) {
      console.error('Error creating card:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create card'
      };
    }
  }

  /**
   * Get cards with filtering and pagination
   */
  async getCards(
    userId: string,
    tenantId: string,
    filters?: CardFilters,
    pagination?: PaginationOptions
  ): Promise<CardsResult> {
    try {
      const page = pagination?.page || 1;
      const limit = pagination?.limit || 50;
      const skip = (page - 1) * limit;
      const sortBy = pagination?.sortBy || 'createdAt';
      const sortOrder = pagination?.sortOrder || 'desc';

      // Build where clause with tenant isolation
      const where: any = {
        tenantId, // CRITICAL: Tenant isolation
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

      // Get cards with relations (excluding sensitive data)
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
            // CRITICAL: Exclude sensitive data (cardNumber, cvv, pin, activationCode)
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
        cards: cards as any,
        total
      };
    } catch (error) {
      console.error('Error getting cards:', error);
      return {
        success: false,
        message: 'Failed to retrieve cards'
      };
    }
  }

  /**
   * Get a single card by ID
   */
  async getCard(
    cardId: string,
    userId: string,
    tenantId: string
  ): Promise<CardResult> {
    try {
      // CRITICAL: Always include tenantId in query
      const card = await this.prisma.card.findFirst({
        where: {
          id: cardId,
          tenantId, // CRITICAL: Tenant isolation
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
          // CRITICAL: Exclude sensitive data
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
        card: card as any
      };
    } catch (error) {
      console.error('Error getting card:', error);
      return {
        success: false,
        message: 'Failed to retrieve card'
      };
    }
  }

  /**
   * Update card information
   */
  async updateCard(
    cardId: string,
    data: UpdateCardData,
    userId: string,
    tenantId: string
  ): Promise<CardResult> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // CRITICAL: Validate card exists and belongs to tenant
        const existingCard = await tx.card.findFirst({
          where: {
            id: cardId,
            tenantId, // CRITICAL: Tenant isolation
            userId
          }
        });

        if (!existingCard) {
          throw new Error('Card not found or access denied');
        }

        // Validate expiry date if being updated
        if (data.expiryMonth !== undefined || data.expiryYear !== undefined) {
          const month = data.expiryMonth ?? existingCard.expiryMonth;
          const year = data.expiryYear ?? existingCard.expiryYear;

          if (!this.validateExpiryDate(month, year)) {
            throw new Error('Invalid expiry date');
          }
        }

        // Update the card
        const updatedCard = await tx.card.update({
          where: { id: cardId },
          data: {
            cardholderName: data.cardholderName,
            expiryMonth: data.expiryMonth,
            expiryYear: data.expiryYear,
            dailyLimit: data.dailyLimit ? new Decimal(data.dailyLimit) : undefined,
            monthlyLimit: data.monthlyLimit ? new Decimal(data.monthlyLimit) : undefined,
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
            cardNumber: undefined, // Remove sensitive data
            cvv: undefined,
            pin: undefined,
            activationCode: undefined
          } as any
        };
      });
    } catch (error) {
      console.error('Error updating card:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update card'
      };
    }
  }

  /**
   * Soft delete card (lock it)
   */
  async deleteCard(
    cardId: string,
    userId: string,
    tenantId: string
  ): Promise<CardResult> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // CRITICAL: Validate card exists and belongs to tenant
        const existingCard = await tx.card.findFirst({
          where: {
            id: cardId,
            tenantId, // CRITICAL: Tenant isolation
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

        // Check for pending transactions (if implemented)
        // const pendingTransactions = await tx.cardTransaction.count({
        //   where: { cardId, /* status: 'PENDING' */ }
        // });

        // Soft delete: Lock the card instead of deleting
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
          } as any
        };
      });
    } catch (error) {
      console.error('Error deleting card:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete card'
      };
    }
  }

  /**
   * Activate card
   */
  async activateCard(
    cardId: string,
    userId: string,
    tenantId: string
  ): Promise<CardResult> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // CRITICAL: Validate card exists and belongs to tenant
        const existingCard = await tx.card.findFirst({
          where: {
            id: cardId,
            tenantId, // CRITICAL: Tenant isolation
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

        // Check if card has expired
        if (!this.validateExpiryDate(existingCard.expiryMonth, existingCard.expiryYear)) {
          throw new Error('Cannot activate an expired card');
        }

        const activatedCard = await tx.card.update({
          where: { id: cardId },
          data: {
            isActive: true,
            activatedAt: new Date(),
            activationCode: null, // Clear activation code
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
          } as any
        };
      });
    } catch (error) {
      console.error('Error activating card:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to activate card'
      };
    }
  }

  /**
   * Deactivate card
   */
  async deactivateCard(
    cardId: string,
    userId: string,
    tenantId: string
  ): Promise<CardResult> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // CRITICAL: Validate card exists and belongs to tenant
        const existingCard = await tx.card.findFirst({
          where: {
            id: cardId,
            tenantId, // CRITICAL: Tenant isolation
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
          } as any
        };
      });
    } catch (error) {
      console.error('Error deactivating card:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to deactivate card'
      };
    }
  }

  /**
   * Validate card transaction
   */
  async validateCardTransaction(
    cardId: string,
    amount: number,
    userId: string,
    tenantId: string
  ): Promise<CardValidationResult> {
    try {
      // CRITICAL: Validate card exists and belongs to tenant
      const card = await this.prisma.card.findFirst({
        where: {
          id: cardId,
          tenantId, // CRITICAL: Tenant isolation
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

      // Check daily limit
      if (card.dailyLimit && amount > card.dailyLimit.toNumber()) {
        return {
          success: false,
          message: 'Transaction amount exceeds daily limit'
        };
      }

      // Check account balance for debit cards
      if (card.cardType === CardType.DEBIT && amount > card.account.balance.toNumber()) {
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
    } catch (error) {
      console.error('Error validating card transaction:', error);
      return {
        success: false,
        message: 'Failed to validate transaction'
      };
    }
  }

  /**
   * Get card transactions (placeholder - to be implemented with transaction tracking)
   */
  async getCardTransactions(
    cardId: string,
    userId: string,
    tenantId: string
  ): Promise<CardTransactionResult> {
    try {
      // CRITICAL: Validate card exists and belongs to tenant
      const card = await this.prisma.card.findFirst({
        where: {
          id: cardId,
          tenantId, // CRITICAL: Tenant isolation
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
          tenantId, // CRITICAL: Tenant isolation
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
    } catch (error) {
      console.error('Error getting card transactions:', error);
      return {
        success: false,
        message: 'Failed to retrieve card transactions'
      };
    }
  }

  /**
   * Get card statistics
   */
  async getCardStatistics(
    userId: string,
    tenantId: string
  ): Promise<CardStatisticsResult> {
    try {
      const cards = await this.prisma.card.findMany({
        where: {
          tenantId, // CRITICAL: Tenant isolation
          userId
        }
      });

      const totalCards = cards.length;
      const activeCards = cards.filter(card => card.isActive).length;
      const lockedCards = cards.filter(card => card.isLocked).length;

      const cardsByType = cards.reduce((acc, card) => {
        acc[card.cardType] = (acc[card.cardType] || 0) + 1;
        return acc;
      }, {} as Record<CardType, number>);

      const cardsByBrand = cards.reduce((acc, card) => {
        acc[card.brand] = (acc[card.brand] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const totalSpendingLimits = cards.reduce(
        (acc, card) => {
          if (card.dailyLimit) {
            acc.daily = acc.daily.add(card.dailyLimit);
          }
          if (card.monthlyLimit) {
            acc.monthly = acc.monthly.add(card.monthlyLimit);
          }
          return acc;
        },
        { daily: new Decimal(0), monthly: new Decimal(0) }
      );

      const statistics: CardStatistics = {
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
    } catch (error) {
      console.error('Error getting card statistics:', error);
      return {
        success: false,
        message: 'Failed to retrieve card statistics'
      };
    }
  }

  /**
   * Bulk activate cards
   */
  async bulkActivateCards(
    cardIds: string[],
    userId: string,
    tenantId: string
  ): Promise<BulkOperationResult> {
    const succeeded: string[] = [];
    const failed: string[] = [];
    const errors: Record<string, string> = {};

    for (const cardId of cardIds) {
      try {
        const result = await this.activateCard(cardId, userId, tenantId);
        if (result.success) {
          succeeded.push(cardId);
        } else {
          failed.push(cardId);
          errors[cardId] = result.message;
        }
      } catch (error) {
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