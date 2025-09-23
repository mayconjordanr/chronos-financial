import { describe, beforeAll, beforeEach, afterAll, it, expect } from 'vitest';
import { PrismaClient, Card, CardType, Tenant, User, Account } from '@prisma/client';
import { TestDataFactory, SecurityTestUtils } from '../../../../tests/utils/test-utilities';
import { CardService } from './cards.service';
import { faker } from '@faker-js/faker';

describe('Card Tenant Isolation Security Tests', () => {
  let prisma: PrismaClient;
  let cardService: CardService;
  let testFactory: TestDataFactory;

  // Multiple tenant data structures
  let tenant1Data: {
    tenant: Tenant;
    users: { admin: User; regular: User };
    accounts: { checking: Account; savings: Account };
  };

  let tenant2Data: {
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
    // Clean up existing data
    await prisma.cardTransaction.deleteMany();
    await prisma.card.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.budget.deleteMany();
    await prisma.account.deleteMany();
    await prisma.category.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
    await prisma.tenant.deleteMany();

    // Create two separate tenant setups
    tenant1Data = await testFactory.createTenantSetup({
      name: 'Tenant One',
      slug: 'tenant-one'
    });

    tenant2Data = await testFactory.createTenantSetup({
      name: 'Tenant Two',
      slug: 'tenant-two'
    });
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

  describe('Cross-Tenant Card Access Prevention', () => {
    let tenant1Card: Card;
    let tenant2Card: Card;

    beforeEach(async () => {
      // Create cards in both tenants
      const tenant1Result = await cardService.createCard(
        {
          accountId: tenant1Data.accounts.checking.id,
          cardNumber: '4532123456789012',
          cardholderName: 'Tenant One User',
          expiryMonth: 12,
          expiryYear: 2028,
          cvv: '123',
          cardType: CardType.CREDIT,
          brand: 'VISA'
        },
        tenant1Data.users.regular.id,
        tenant1Data.tenant.id
      );

      const tenant2Result = await cardService.createCard(
        {
          accountId: tenant2Data.accounts.checking.id,
          cardNumber: '4532987654321098',
          cardholderName: 'Tenant Two User',
          expiryMonth: 6,
          expiryYear: 2029,
          cvv: '456',
          cardType: CardType.DEBIT,
          brand: 'MASTERCARD'
        },
        tenant2Data.users.regular.id,
        tenant2Data.tenant.id
      );

      tenant1Card = tenant1Result.card!;
      tenant2Card = tenant2Result.card!;
    });

    it('should prevent tenant1 from accessing tenant2 cards', async () => {
      const result = await cardService.getCard(
        tenant2Card.id,
        tenant1Data.users.regular.id,
        tenant1Data.tenant.id
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Card not found or access denied');
    });

    it('should prevent tenant2 from accessing tenant1 cards', async () => {
      const result = await cardService.getCard(
        tenant1Card.id,
        tenant2Data.users.regular.id,
        tenant2Data.tenant.id
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Card not found or access denied');
    });

    it('should prevent tenant1 from updating tenant2 cards', async () => {
      const result = await cardService.updateCard(
        tenant2Card.id,
        { dailyLimit: 5000.00 },
        tenant1Data.users.regular.id,
        tenant1Data.tenant.id
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Card not found or access denied');
    });

    it('should prevent tenant1 from activating tenant2 cards', async () => {
      const result = await cardService.activateCard(
        tenant2Card.id,
        tenant1Data.users.regular.id,
        tenant1Data.tenant.id
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Card not found or access denied');
    });

    it('should prevent tenant1 from deleting tenant2 cards', async () => {
      const result = await cardService.deleteCard(
        tenant2Card.id,
        tenant1Data.users.regular.id,
        tenant1Data.tenant.id
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Card not found or access denied');
    });

    it('should return only tenant-specific cards in list operations', async () => {
      const tenant1Result = await cardService.getCards(
        tenant1Data.users.regular.id,
        tenant1Data.tenant.id
      );

      const tenant2Result = await cardService.getCards(
        tenant2Data.users.regular.id,
        tenant2Data.tenant.id
      );

      expect(tenant1Result.success).toBe(true);
      expect(tenant2Result.success).toBe(true);

      expect(tenant1Result.cards).toHaveLength(1);
      expect(tenant2Result.cards).toHaveLength(1);

      expect(tenant1Result.cards![0].id).toBe(tenant1Card.id);
      expect(tenant2Result.cards![0].id).toBe(tenant2Card.id);

      expect(tenant1Result.cards![0].tenantId).toBe(tenant1Data.tenant.id);
      expect(tenant2Result.cards![0].tenantId).toBe(tenant2Data.tenant.id);
    });
  });

  describe('Card-Account Relationship Validation Across Tenants', () => {
    it('should prevent creating cards linked to accounts from different tenants', async () => {
      // Try to create a card in tenant1 but link it to tenant2's account
      const result = await cardService.createCard(
        {
          accountId: tenant2Data.accounts.checking.id, // Wrong tenant's account
          cardNumber: '4532111122223333',
          cardholderName: 'Cross Tenant Attack',
          expiryMonth: 12,
          expiryYear: 2028,
          cvv: '123',
          cardType: CardType.CREDIT,
          brand: 'VISA'
        },
        tenant1Data.users.regular.id, // Tenant1 user
        tenant1Data.tenant.id // Tenant1 context
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Account not found or access denied');
    });

    it('should prevent user from creating cards on accounts they dont own within same tenant', async () => {
      // Try to have regular user create card on admin user's account
      const adminAccount = await testFactory.createAccount({
        tenantId: tenant1Data.tenant.id,
        userId: tenant1Data.users.admin.id, // Admin's account
        type: 'SAVINGS'
      });

      const result = await cardService.createCard(
        {
          accountId: adminAccount.id,
          cardNumber: '4532444455556666',
          cardholderName: 'Wrong Owner',
          expiryMonth: 12,
          expiryYear: 2028,
          cvv: '123',
          cardType: CardType.DEBIT,
          brand: 'VISA'
        },
        tenant1Data.users.regular.id, // Regular user trying to use admin's account
        tenant1Data.tenant.id
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Account not found or access denied');
    });

    it('should validate card transactions against proper account ownership', async () => {
      // Create a card in tenant1
      const cardResult = await cardService.createCard(
        {
          accountId: tenant1Data.accounts.checking.id,
          cardNumber: '4532123456789012',
          cardholderName: 'Valid User',
          expiryMonth: 12,
          expiryYear: 2028,
          cvv: '123',
          cardType: CardType.CREDIT,
          brand: 'VISA'
        },
        tenant1Data.users.regular.id,
        tenant1Data.tenant.id
      );

      const card = cardResult.card!;

      // Activate the card first
      await cardService.activateCard(
        card.id,
        tenant1Data.users.regular.id,
        tenant1Data.tenant.id
      );

      // Try to validate transaction from different tenant context
      const validationResult = await cardService.validateCardTransaction(
        card.id,
        100.00,
        tenant2Data.users.regular.id, // Wrong tenant user
        tenant2Data.tenant.id // Wrong tenant
      );

      expect(validationResult.success).toBe(false);
      expect(validationResult.message).toContain('Card not found or access denied');
    });
  });

  describe('Card Transaction Isolation', () => {
    let tenant1Card: Card;
    let tenant2Card: Card;

    beforeEach(async () => {
      // Create and activate cards in both tenants
      const tenant1Result = await cardService.createCard(
        {
          accountId: tenant1Data.accounts.checking.id,
          cardNumber: '4532123456789012',
          cardholderName: 'Tenant One User',
          expiryMonth: 12,
          expiryYear: 2028,
          cvv: '123',
          cardType: CardType.CREDIT,
          brand: 'VISA'
        },
        tenant1Data.users.regular.id,
        tenant1Data.tenant.id
      );

      const tenant2Result = await cardService.createCard(
        {
          accountId: tenant2Data.accounts.checking.id,
          cardNumber: '4532987654321098',
          cardholderName: 'Tenant Two User',
          expiryMonth: 6,
          expiryYear: 2029,
          cvv: '456',
          cardType: CardType.DEBIT,
          brand: 'MASTERCARD'
        },
        tenant2Data.users.regular.id,
        tenant2Data.tenant.id
      );

      tenant1Card = tenant1Result.card!;
      tenant2Card = tenant2Result.card!;

      // Activate both cards
      await cardService.activateCard(
        tenant1Card.id,
        tenant1Data.users.regular.id,
        tenant1Data.tenant.id
      );

      await cardService.activateCard(
        tenant2Card.id,
        tenant2Data.users.regular.id,
        tenant2Data.tenant.id
      );
    });

    it('should isolate card transaction history by tenant', async () => {
      // This test assumes card transaction tracking is implemented
      const tenant1History = await cardService.getCardTransactions(
        tenant1Card.id,
        tenant1Data.users.regular.id,
        tenant1Data.tenant.id
      );

      const tenant2History = await cardService.getCardTransactions(
        tenant2Card.id,
        tenant2Data.users.regular.id,
        tenant2Data.tenant.id
      );

      expect(tenant1History.success).toBe(true);
      expect(tenant2History.success).toBe(true);

      // Try to access tenant2 card transactions from tenant1 context
      const crossTenantAttempt = await cardService.getCardTransactions(
        tenant2Card.id,
        tenant1Data.users.regular.id,
        tenant1Data.tenant.id
      );

      expect(crossTenantAttempt.success).toBe(false);
      expect(crossTenantAttempt.message).toContain('Card not found or access denied');
    });

    it('should prevent cross-tenant card transaction validation', async () => {
      // Try to validate transaction for tenant2 card using tenant1 context
      const result = await cardService.validateCardTransaction(
        tenant2Card.id,
        100.00,
        tenant1Data.users.regular.id,
        tenant1Data.tenant.id
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Card not found or access denied');
    });
  });

  describe('Card Management Across Tenant Boundaries', () => {
    it('should prevent bulk operations across tenants', async () => {
      // Create cards in both tenants
      const tenant1Result = await cardService.createCard(
        {
          accountId: tenant1Data.accounts.checking.id,
          cardNumber: '4532123456789012',
          cardholderName: 'User 1',
          expiryMonth: 12,
          expiryYear: 2028,
          cvv: '123',
          cardType: CardType.CREDIT,
          brand: 'VISA'
        },
        tenant1Data.users.regular.id,
        tenant1Data.tenant.id
      );

      const tenant2Result = await cardService.createCard(
        {
          accountId: tenant2Data.accounts.checking.id,
          cardNumber: '4532987654321098',
          cardholderName: 'User 2',
          expiryMonth: 6,
          expiryYear: 2029,
          cvv: '456',
          cardType: CardType.DEBIT,
          brand: 'MASTERCARD'
        },
        tenant2Data.users.regular.id,
        tenant2Data.tenant.id
      );

      // Try to perform bulk activation from tenant1 context with mixed card IDs
      const bulkResult = await cardService.bulkActivateCards(
        [tenant1Result.card!.id, tenant2Result.card!.id], // Mixed tenant cards
        tenant1Data.users.regular.id,
        tenant1Data.tenant.id
      );

      expect(bulkResult.success).toBe(false);
      expect(bulkResult.failed).toContain(tenant2Result.card!.id);
      expect(bulkResult.message).toContain('Some cards could not be activated');
    });

    it('should maintain proper tenant context in card statistics', async () => {
      // Create multiple cards in each tenant
      await Promise.all([
        cardService.createCard(
          {
            accountId: tenant1Data.accounts.checking.id,
            cardNumber: '4532111111111111',
            cardholderName: 'T1 User 1',
            expiryMonth: 12,
            expiryYear: 2028,
            cvv: '123',
            cardType: CardType.CREDIT,
            brand: 'VISA'
          },
          tenant1Data.users.regular.id,
          tenant1Data.tenant.id
        ),
        cardService.createCard(
          {
            accountId: tenant1Data.accounts.savings.id,
            cardNumber: '4532222222222222',
            cardholderName: 'T1 User 2',
            expiryMonth: 12,
            expiryYear: 2028,
            cvv: '123',
            cardType: CardType.DEBIT,
            brand: 'VISA'
          },
          tenant1Data.users.regular.id,
          tenant1Data.tenant.id
        ),
        cardService.createCard(
          {
            accountId: tenant2Data.accounts.checking.id,
            cardNumber: '4532333333333333',
            cardholderName: 'T2 User 1',
            expiryMonth: 12,
            expiryYear: 2028,
            cvv: '123',
            cardType: CardType.CREDIT,
            brand: 'MASTERCARD'
          },
          tenant2Data.users.regular.id,
          tenant2Data.tenant.id
        )
      ]);

      const tenant1Stats = await cardService.getCardStatistics(
        tenant1Data.users.regular.id,
        tenant1Data.tenant.id
      );

      const tenant2Stats = await cardService.getCardStatistics(
        tenant2Data.users.regular.id,
        tenant2Data.tenant.id
      );

      expect(tenant1Stats.success).toBe(true);
      expect(tenant2Stats.success).toBe(true);

      expect(tenant1Stats.statistics!.totalCards).toBe(2);
      expect(tenant2Stats.statistics!.totalCards).toBe(1);

      expect(tenant1Stats.statistics!.cardsByType.CREDIT).toBe(1);
      expect(tenant1Stats.statistics!.cardsByType.DEBIT).toBe(1);
      expect(tenant2Stats.statistics!.cardsByType.CREDIT).toBe(1);
    });
  });

  describe('Security Attack Simulation', () => {
    it('should prevent SQL injection attacks in card queries', async () => {
      const maliciousPayloads = SecurityTestUtils.generateSqlInjectionPayloads();

      for (const payload of maliciousPayloads) {
        // Try to inject malicious SQL through card search
        const result = await cardService.getCards(
          tenant1Data.users.regular.id,
          tenant1Data.tenant.id,
          { search: payload }
        );

        // Should not fail catastrophically and should not return unauthorized data
        expect(result.success).toBe(true);
        if (result.cards) {
          result.cards.forEach(card => {
            expect(card.tenantId).toBe(tenant1Data.tenant.id);
          });
        }
      }
    });

    it('should prevent parameter tampering in card operations', async () => {
      const card = await cardService.createCard(
        {
          accountId: tenant1Data.accounts.checking.id,
          cardNumber: '4532123456789012',
          cardholderName: 'Test User',
          expiryMonth: 12,
          expiryYear: 2028,
          cvv: '123',
          cardType: CardType.CREDIT,
          brand: 'VISA'
        },
        tenant1Data.users.regular.id,
        tenant1Data.tenant.id
      );

      // Try to tamper with tenant ID in various ways
      const tamperingAttempts = [
        { userId: tenant1Data.users.regular.id, tenantId: tenant2Data.tenant.id },
        { userId: tenant2Data.users.regular.id, tenantId: tenant1Data.tenant.id },
        { userId: 'invalid-user-id', tenantId: tenant1Data.tenant.id },
        { userId: tenant1Data.users.regular.id, tenantId: 'invalid-tenant-id' }
      ];

      for (const attempt of tamperingAttempts) {
        const result = await cardService.getCard(
          card.card!.id,
          attempt.userId,
          attempt.tenantId
        );

        expect(result.success).toBe(false);
        expect(result.message).toContain('not found or access denied');
      }
    });
  });

  describe('Database-Level Isolation Tests', () => {
    it('should enforce tenant isolation at database query level', async () => {
      // Create cards in both tenants
      await Promise.all([
        cardService.createCard(
          {
            accountId: tenant1Data.accounts.checking.id,
            cardNumber: '4532123456789012',
            cardholderName: 'T1 User',
            expiryMonth: 12,
            expiryYear: 2028,
            cvv: '123',
            cardType: CardType.CREDIT,
            brand: 'VISA'
          },
          tenant1Data.users.regular.id,
          tenant1Data.tenant.id
        ),
        cardService.createCard(
          {
            accountId: tenant2Data.accounts.checking.id,
            cardNumber: '4532987654321098',
            cardholderName: 'T2 User',
            expiryMonth: 6,
            expiryYear: 2029,
            cvv: '456',
            cardType: CardType.DEBIT,
            brand: 'MASTERCARD'
          },
          tenant2Data.users.regular.id,
          tenant2Data.tenant.id
        )
      ]);

      // Use SecurityTestUtils to test tenant isolation at database level
      const isolationTest = await SecurityTestUtils.testTenantIsolation(
        prisma,
        tenant1Data.tenant.id,
        tenant2Data.tenant.id,
        async (tenantId) => {
          const cards = await prisma.card.findMany({
            where: { tenantId }
          });
          return cards.length;
        }
      );

      expect(isolationTest.isIsolated).toBe(true);
      expect(isolationTest.tenant1Result).toBe(1);
      expect(isolationTest.tenant2Result).toBe(1);
    });

    it('should prevent unauthorized data leakage through relations', async () => {
      // Create cards with relationships
      const tenant1Card = await cardService.createCard(
        {
          accountId: tenant1Data.accounts.checking.id,
          cardNumber: '4532123456789012',
          cardholderName: 'T1 User',
          expiryMonth: 12,
          expiryYear: 2028,
          cvv: '123',
          cardType: CardType.CREDIT,
          brand: 'VISA'
        },
        tenant1Data.users.regular.id,
        tenant1Data.tenant.id
      );

      // Direct database query with wrong tenant context should return empty
      const unauthorizedQuery = await prisma.card.findMany({
        where: {
          tenantId: tenant2Data.tenant.id // Wrong tenant
        },
        include: {
          account: true,
          user: true,
          tenant: true
        }
      });

      expect(unauthorizedQuery).toHaveLength(0);

      // Correct tenant query should return data
      const authorizedQuery = await prisma.card.findMany({
        where: {
          tenantId: tenant1Data.tenant.id // Correct tenant
        },
        include: {
          account: true,
          user: true
        }
      });

      expect(authorizedQuery).toHaveLength(1);
      expect(authorizedQuery[0].tenantId).toBe(tenant1Data.tenant.id);
      expect(authorizedQuery[0].account.tenantId).toBe(tenant1Data.tenant.id);
      expect(authorizedQuery[0].user.tenantId).toBe(tenant1Data.tenant.id);
    });
  });
});