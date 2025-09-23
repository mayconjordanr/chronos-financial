import { describe, beforeAll, beforeEach, afterAll, it, expect, vi } from 'vitest';
import { PrismaClient, Card, CardType, Tenant, User, Account } from '@prisma/client';
import { TestDataFactory } from '../../../../tests/utils/test-utilities';
import { CardService } from './cards.service';
import { faker } from '@faker-js/faker';
import crypto from 'crypto';

describe('Cards Module - TDD Implementation', () => {
  let prisma: PrismaClient;
  let cardService: CardService;
  let testFactory: TestDataFactory;
  let testData: {
    tenant: Tenant;
    users: { admin: User; regular: User };
    accounts: { checking: Account; savings: Account };
  };

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
    cardService = new CardService(prisma);
    testFactory = new TestDataFactory(prisma);
  });

  beforeEach(async () => {
    // Clean up any existing data
    await prisma.cardTransaction.deleteMany();
    await prisma.card.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.budget.deleteMany();
    await prisma.account.deleteMany();
    await prisma.category.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
    await prisma.tenant.deleteMany();

    // Create fresh test data for each test
    testData = await testFactory.createTenantSetup();
  });

  afterAll(async () => {
    // Clean up
    await prisma.cardTransaction.deleteMany();
    await prisma.card.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.budget.deleteMany();
    await prisma.account.deleteMany();
    await prisma.category.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
    await prisma.tenant.deleteMany();
    await prisma.$disconnect();
  });

  describe('CRUD Operations with Tenant Isolation', () => {
    describe('Card Creation', () => {
      it('should create a new card with proper tenant isolation', async () => {
        const cardData = {
          accountId: testData.accounts.checking.id,
          cardNumber: '4532123456789012',
          cardholderName: 'John Doe',
          expiryMonth: 12,
          expiryYear: 2028,
          cvv: '123',
          cardType: CardType.CREDIT,
          brand: 'VISA',
          dailyLimit: 1000.00,
          monthlyLimit: 10000.00
        };

        const result = await cardService.createCard(
          cardData,
          testData.users.regular.id,
          testData.tenant.id
        );

        expect(result.success).toBe(true);
        expect(result.card).toBeDefined();
        expect(result.card!.tenantId).toBe(testData.tenant.id);
        expect(result.card!.userId).toBe(testData.users.regular.id);
        expect(result.card!.accountId).toBe(testData.accounts.checking.id);
        expect(result.card!.cardType).toBe(CardType.CREDIT);
        expect(result.card!.brand).toBe('VISA');
        expect(result.card!.isActive).toBe(false); // Cards start inactive
        expect(result.card!.maskedNumber).toMatch(/\*{4}-\*{4}-\*{4}-9012/);
        expect(result.card!.cardNumber).not.toBe(cardData.cardNumber); // Should be encrypted
      });

      it('should fail when account does not belong to user', async () => {
        const otherTenantData = await testFactory.createTenantSetup();

        const cardData = {
          accountId: otherTenantData.accounts.checking.id, // Wrong tenant account
          cardNumber: '4532123456789012',
          cardholderName: 'John Doe',
          expiryMonth: 12,
          expiryYear: 2028,
          cvv: '123',
          cardType: CardType.CREDIT,
          brand: 'VISA'
        };

        const result = await cardService.createCard(
          cardData,
          testData.users.regular.id,
          testData.tenant.id
        );

        expect(result.success).toBe(false);
        expect(result.message).toContain('Account not found or access denied');
      });

      it('should validate card number format', async () => {
        const cardData = {
          accountId: testData.accounts.checking.id,
          cardNumber: 'invalid-card-number',
          cardholderName: 'John Doe',
          expiryMonth: 12,
          expiryYear: 2028,
          cvv: '123',
          cardType: CardType.CREDIT,
          brand: 'VISA'
        };

        const result = await cardService.createCard(
          cardData,
          testData.users.regular.id,
          testData.tenant.id
        );

        expect(result.success).toBe(false);
        expect(result.message).toContain('Invalid card number format');
      });

      it('should validate expiry date', async () => {
        const cardData = {
          accountId: testData.accounts.checking.id,
          cardNumber: '4532123456789012',
          cardholderName: 'John Doe',
          expiryMonth: 12,
          expiryYear: 2020, // Past year
          cvv: '123',
          cardType: CardType.CREDIT,
          brand: 'VISA'
        };

        const result = await cardService.createCard(
          cardData,
          testData.users.regular.id,
          testData.tenant.id
        );

        expect(result.success).toBe(false);
        expect(result.message).toContain('Card has expired');
      });
    });

    describe('Card Retrieval', () => {
      let createdCard: Card;

      beforeEach(async () => {
        const cardData = {
          accountId: testData.accounts.checking.id,
          cardNumber: '4532123456789012',
          cardholderName: 'John Doe',
          expiryMonth: 12,
          expiryYear: 2028,
          cvv: '123',
          cardType: CardType.CREDIT,
          brand: 'VISA'
        };

        const result = await cardService.createCard(
          cardData,
          testData.users.regular.id,
          testData.tenant.id
        );
        createdCard = result.card!;
      });

      it('should retrieve cards by tenant and user', async () => {
        const result = await cardService.getCards(
          testData.users.regular.id,
          testData.tenant.id
        );

        expect(result.success).toBe(true);
        expect(result.cards).toHaveLength(1);
        expect(result.cards![0].tenantId).toBe(testData.tenant.id);
        expect(result.cards![0].userId).toBe(testData.users.regular.id);
        expect(result.cards![0].cardNumber).toBeUndefined(); // Sensitive data should be excluded
      });

      it('should retrieve single card with proper validation', async () => {
        const result = await cardService.getCard(
          createdCard.id,
          testData.users.regular.id,
          testData.tenant.id
        );

        expect(result.success).toBe(true);
        expect(result.card).toBeDefined();
        expect(result.card!.id).toBe(createdCard.id);
        expect(result.card!.tenantId).toBe(testData.tenant.id);
        expect(result.card!.account).toBeDefined();
      });

      it('should filter cards by type', async () => {
        // Create a debit card
        const debitCardData = {
          accountId: testData.accounts.savings.id,
          cardNumber: '4532987654321098',
          cardholderName: 'John Doe',
          expiryMonth: 6,
          expiryYear: 2029,
          cvv: '456',
          cardType: CardType.DEBIT,
          brand: 'VISA'
        };

        await cardService.createCard(
          debitCardData,
          testData.users.regular.id,
          testData.tenant.id
        );

        const result = await cardService.getCards(
          testData.users.regular.id,
          testData.tenant.id,
          { cardType: CardType.DEBIT }
        );

        expect(result.success).toBe(true);
        expect(result.cards).toHaveLength(1);
        expect(result.cards![0].cardType).toBe(CardType.DEBIT);
      });

      it('should filter cards by status', async () => {
        const result = await cardService.getCards(
          testData.users.regular.id,
          testData.tenant.id,
          { isActive: false }
        );

        expect(result.success).toBe(true);
        expect(result.cards).toHaveLength(1);
        expect(result.cards![0].isActive).toBe(false);
      });
    });

    describe('Card Updates', () => {
      let createdCard: Card;

      beforeEach(async () => {
        const cardData = {
          accountId: testData.accounts.checking.id,
          cardNumber: '4532123456789012',
          cardholderName: 'John Doe',
          expiryMonth: 12,
          expiryYear: 2028,
          cvv: '123',
          cardType: CardType.CREDIT,
          brand: 'VISA'
        };

        const result = await cardService.createCard(
          cardData,
          testData.users.regular.id,
          testData.tenant.id
        );
        createdCard = result.card!;
      });

      it('should update card limits with proper validation', async () => {
        const updateData = {
          dailyLimit: 2000.00,
          monthlyLimit: 20000.00,
          notes: 'Updated limits'
        };

        const result = await cardService.updateCard(
          createdCard.id,
          updateData,
          testData.users.regular.id,
          testData.tenant.id
        );

        expect(result.success).toBe(true);
        expect(result.card!.dailyLimit?.toString()).toBe('2000');
        expect(result.card!.monthlyLimit?.toString()).toBe('20000');
        expect(result.card!.notes).toBe('Updated limits');
      });

      it('should prevent updates to cards from different tenant', async () => {
        const otherTenantData = await testFactory.createTenantSetup();

        const updateData = {
          dailyLimit: 5000.00
        };

        const result = await cardService.updateCard(
          createdCard.id,
          updateData,
          otherTenantData.users.regular.id,
          otherTenantData.tenant.id
        );

        expect(result.success).toBe(false);
        expect(result.message).toContain('Card not found or access denied');
      });
    });

    describe('Card Deletion', () => {
      let createdCard: Card;

      beforeEach(async () => {
        const cardData = {
          accountId: testData.accounts.checking.id,
          cardNumber: '4532123456789012',
          cardholderName: 'John Doe',
          expiryMonth: 12,
          expiryYear: 2028,
          cvv: '123',
          cardType: CardType.CREDIT,
          brand: 'VISA'
        };

        const result = await cardService.createCard(
          cardData,
          testData.users.regular.id,
          testData.tenant.id
        );
        createdCard = result.card!;
      });

      it('should soft delete card (deactivate)', async () => {
        const result = await cardService.deleteCard(
          createdCard.id,
          testData.users.regular.id,
          testData.tenant.id
        );

        expect(result.success).toBe(true);

        // Card should still exist but be inactive/locked
        const retrieveResult = await cardService.getCard(
          createdCard.id,
          testData.users.regular.id,
          testData.tenant.id
        );

        expect(retrieveResult.success).toBe(true);
        expect(retrieveResult.card!.isLocked).toBe(true);
      });

      it('should prevent deletion from different tenant', async () => {
        const otherTenantData = await testFactory.createTenantSetup();

        const result = await cardService.deleteCard(
          createdCard.id,
          otherTenantData.users.regular.id,
          otherTenantData.tenant.id
        );

        expect(result.success).toBe(false);
        expect(result.message).toContain('Card not found or access denied');
      });
    });
  });

  describe('Card Security Features', () => {
    let createdCard: Card;

    beforeEach(async () => {
      const cardData = {
        accountId: testData.accounts.checking.id,
        cardNumber: '4532123456789012',
        cardholderName: 'John Doe',
        expiryMonth: 12,
        expiryYear: 2028,
        cvv: '123',
        cardType: CardType.CREDIT,
        brand: 'VISA'
      };

      const result = await cardService.createCard(
        cardData,
        testData.users.regular.id,
        testData.tenant.id
      );
      createdCard = result.card!;
    });

    describe('Card Number Masking', () => {
      it('should mask card numbers properly', async () => {
        const result = await cardService.getCard(
          createdCard.id,
          testData.users.regular.id,
          testData.tenant.id
        );

        expect(result.success).toBe(true);
        expect(result.card!.maskedNumber).toMatch(/\*{4}-\*{4}-\*{4}-\d{4}/);
        expect(result.card!.maskedNumber).not.toContain('4532123456');
      });

      it('should never expose full card number in responses', async () => {
        const result = await cardService.getCards(
          testData.users.regular.id,
          testData.tenant.id
        );

        expect(result.success).toBe(true);
        result.cards!.forEach(card => {
          expect(card.cardNumber).toBeUndefined();
          expect(card.cvv).toBeUndefined();
          expect(card.pin).toBeUndefined();
        });
      });
    });

    describe('Card Activation/Deactivation', () => {
      it('should activate card with proper validation', async () => {
        expect(createdCard.isActive).toBe(false);

        const result = await cardService.activateCard(
          createdCard.id,
          testData.users.regular.id,
          testData.tenant.id
        );

        expect(result.success).toBe(true);
        expect(result.card!.isActive).toBe(true);
        expect(result.card!.activatedAt).toBeDefined();
      });

      it('should deactivate card with proper validation', async () => {
        // First activate the card
        await cardService.activateCard(
          createdCard.id,
          testData.users.regular.id,
          testData.tenant.id
        );

        const result = await cardService.deactivateCard(
          createdCard.id,
          testData.users.regular.id,
          testData.tenant.id
        );

        expect(result.success).toBe(true);
        expect(result.card!.isActive).toBe(false);
      });

      it('should prevent activation by wrong tenant', async () => {
        const otherTenantData = await testFactory.createTenantSetup();

        const result = await cardService.activateCard(
          createdCard.id,
          otherTenantData.users.regular.id,
          otherTenantData.tenant.id
        );

        expect(result.success).toBe(false);
        expect(result.message).toContain('Card not found or access denied');
      });
    });

    describe('Security Validations', () => {
      it('should validate card number using Luhn algorithm', async () => {
        const invalidCardData = {
          accountId: testData.accounts.checking.id,
          cardNumber: '4532123456789013', // Invalid Luhn checksum
          cardholderName: 'John Doe',
          expiryMonth: 12,
          expiryYear: 2028,
          cvv: '123',
          cardType: CardType.CREDIT,
          brand: 'VISA'
        };

        const result = await cardService.createCard(
          invalidCardData,
          testData.users.regular.id,
          testData.tenant.id
        );

        expect(result.success).toBe(false);
        expect(result.message).toContain('Invalid card number');
      });

      it('should validate CVV format', async () => {
        const invalidCvvData = {
          accountId: testData.accounts.checking.id,
          cardNumber: '4532123456789012',
          cardholderName: 'John Doe',
          expiryMonth: 12,
          expiryYear: 2028,
          cvv: '12', // Too short
          cardType: CardType.CREDIT,
          brand: 'VISA'
        };

        const result = await cardService.createCard(
          invalidCvvData,
          testData.users.regular.id,
          testData.tenant.id
        );

        expect(result.success).toBe(false);
        expect(result.message).toContain('Invalid CVV');
      });
    });
  });

  describe('Card-Account Integration', () => {
    let createdCard: Card;

    beforeEach(async () => {
      const cardData = {
        accountId: testData.accounts.checking.id,
        cardNumber: '4532123456789012',
        cardholderName: 'John Doe',
        expiryMonth: 12,
        expiryYear: 2028,
        cvv: '123',
        cardType: CardType.CREDIT,
        brand: 'VISA'
      };

      const result = await cardService.createCard(
        cardData,
        testData.users.regular.id,
        testData.tenant.id
      );
      createdCard = result.card!;
    });

    it('should validate account ownership during card creation', async () => {
      const otherUserAccount = await testFactory.createAccount({
        tenantId: testData.tenant.id,
        userId: testData.users.admin.id,
        type: 'SAVINGS'
      });

      const cardData = {
        accountId: otherUserAccount.id, // Different user's account
        cardNumber: '4532987654321098',
        cardholderName: 'Jane Doe',
        expiryMonth: 6,
        expiryYear: 2029,
        cvv: '456',
        cardType: CardType.DEBIT,
        brand: 'VISA'
      };

      const result = await cardService.createCard(
        cardData,
        testData.users.regular.id, // Different user
        testData.tenant.id
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Account not found or access denied');
    });

    it('should include account information in card details', async () => {
      const result = await cardService.getCard(
        createdCard.id,
        testData.users.regular.id,
        testData.tenant.id
      );

      expect(result.success).toBe(true);
      expect(result.card!.account).toBeDefined();
      expect(result.card!.account.id).toBe(testData.accounts.checking.id);
      expect(result.card!.account.name).toBe(testData.accounts.checking.name);
      expect(result.card!.account.type).toBe(testData.accounts.checking.type);
    });

    it('should validate card spending limits against account balance', async () => {
      // This test will be expanded when we implement transaction tracking
      const result = await cardService.validateCardTransaction(
        createdCard.id,
        5000.00, // Amount higher than account balance
        testData.users.regular.id,
        testData.tenant.id
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Insufficient funds');
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle bulk card operations efficiently', async () => {
      const cardPromises = Array.from({ length: 10 }, (_, index) => {
        return cardService.createCard(
          {
            accountId: testData.accounts.checking.id,
            cardNumber: `453212345678${String(index).padStart(4, '0')}`,
            cardholderName: `User ${index}`,
            expiryMonth: 12,
            expiryYear: 2028,
            cvv: '123',
            cardType: CardType.CREDIT,
            brand: 'VISA'
          },
          testData.users.regular.id,
          testData.tenant.id
        );
      });

      const results = await Promise.all(cardPromises);

      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      const cardsResult = await cardService.getCards(
        testData.users.regular.id,
        testData.tenant.id
      );

      expect(cardsResult.cards).toHaveLength(10);
    });

    it('should handle pagination correctly', async () => {
      // Create multiple cards
      for (let i = 0; i < 15; i++) {
        await cardService.createCard(
          {
            accountId: testData.accounts.checking.id,
            cardNumber: `453212345678${String(i).padStart(4, '0')}`,
            cardholderName: `User ${i}`,
            expiryMonth: 12,
            expiryYear: 2028,
            cvv: '123',
            cardType: CardType.CREDIT,
            brand: 'VISA'
          },
          testData.users.regular.id,
          testData.tenant.id
        );
      }

      const firstPage = await cardService.getCards(
        testData.users.regular.id,
        testData.tenant.id,
        {},
        { page: 1, limit: 10 }
      );

      const secondPage = await cardService.getCards(
        testData.users.regular.id,
        testData.tenant.id,
        {},
        { page: 2, limit: 10 }
      );

      expect(firstPage.cards).toHaveLength(10);
      expect(secondPage.cards).toHaveLength(5);
      expect(firstPage.total).toBe(15);
      expect(secondPage.total).toBe(15);
    });
  });
});