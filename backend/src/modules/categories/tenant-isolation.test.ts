import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { CategoryService } from './categories.service';
import { v4 as uuidv4 } from 'uuid';

describe('Category Tenant Isolation', () => {
  let categoryService: CategoryService;
  let prisma: PrismaClient;

  // Tenant A data
  let tenantAId: string;
  let userAId: string;
  let categoryAId: string;
  let accountAId: string;

  // Tenant B data
  let tenantBId: string;
  let userBId: string;
  let categoryBId: string;
  let accountBId: string;

  beforeEach(async () => {
    prisma = new PrismaClient();
    categoryService = new CategoryService(prisma);

    // Generate IDs
    tenantAId = uuidv4();
    userAId = uuidv4();
    categoryAId = uuidv4();
    accountAId = uuidv4();

    tenantBId = uuidv4();
    userBId = uuidv4();
    categoryBId = uuidv4();
    accountBId = uuidv4();

    // Create Tenant A
    await prisma.tenant.create({
      data: {
        id: tenantAId,
        name: 'Tenant A',
        slug: `tenant-a-${Date.now()}`,
        status: 'ACTIVE'
      }
    });

    await prisma.user.create({
      data: {
        id: userAId,
        tenantId: tenantAId,
        email: 'usera@example.com',
        firstName: 'User',
        lastName: 'A',
        password: 'hashedpassword',
        isActive: true
      }
    });

    await prisma.account.create({
      data: {
        id: accountAId,
        tenantId: tenantAId,
        userId: userAId,
        name: 'Account A',
        type: 'CHECKING',
        balance: 1000.00
      }
    });

    // Create Tenant B
    await prisma.tenant.create({
      data: {
        id: tenantBId,
        name: 'Tenant B',
        slug: `tenant-b-${Date.now()}`,
        status: 'ACTIVE'
      }
    });

    await prisma.user.create({
      data: {
        id: userBId,
        tenantId: tenantBId,
        email: 'userb@example.com',
        firstName: 'User',
        lastName: 'B',
        password: 'hashedpassword',
        isActive: true
      }
    });

    await prisma.account.create({
      data: {
        id: accountBId,
        tenantId: tenantBId,
        userId: userBId,
        name: 'Account B',
        type: 'CHECKING',
        balance: 1000.00
      }
    });

    // Create test categories in each tenant
    await prisma.category.create({
      data: {
        id: categoryAId,
        tenantId: tenantAId,
        name: 'Category A',
        description: 'Tenant A category',
        color: '#FF5733',
        icon: '🎯'
      }
    });

    await prisma.category.create({
      data: {
        id: categoryBId,
        tenantId: tenantBId,
        name: 'Category B',
        description: 'Tenant B category',
        color: '#33FF57',
        icon: '🎪'
      }
    });
  });

  afterEach(async () => {
    // Clean up in correct order
    await prisma.transaction.deleteMany({ where: { OR: [{ tenantId: tenantAId }, { tenantId: tenantBId }] } });
    await prisma.category.deleteMany({ where: { OR: [{ tenantId: tenantAId }, { tenantId: tenantBId }] } });
    await prisma.account.deleteMany({ where: { OR: [{ tenantId: tenantAId }, { tenantId: tenantBId }] } });
    await prisma.user.deleteMany({ where: { OR: [{ tenantId: tenantAId }, { tenantId: tenantBId }] } });
    await prisma.tenant.deleteMany({ where: { OR: [{ id: tenantAId }, { id: tenantBId }] } });
    await prisma.$disconnect();
  });

  describe('Cross-Tenant Category Access Prevention', () => {
    it('should not allow tenant A user to access tenant B categories', async () => {
      // Tenant A user tries to access Tenant B category
      const result = await categoryService.getCategory(
        categoryBId,
        userAId,
        tenantAId
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Category not found or access denied');
    });

    it('should not allow tenant B user to access tenant A categories', async () => {
      // Tenant B user tries to access Tenant A category
      const result = await categoryService.getCategory(
        categoryAId,
        userBId,
        tenantBId
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Category not found or access denied');
    });

    it('should not allow tenant A user to update tenant B categories', async () => {
      const updateData = {
        name: 'Hacked Category',
        color: '#000000'
      };

      const result = await categoryService.updateCategory(
        categoryBId,
        updateData,
        userAId,
        tenantAId
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Category not found or access denied');

      // Verify category B was not modified
      const originalCategory = await prisma.category.findFirst({
        where: { id: categoryBId, tenantId: tenantBId }
      });
      expect(originalCategory?.name).toBe('Category B');
      expect(originalCategory?.color).toBe('#33FF57');
    });

    it('should not allow tenant B user to delete tenant A categories', async () => {
      const result = await categoryService.deleteCategory(
        categoryAId,
        userBId,
        tenantBId
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Category not found or access denied');

      // Verify category A still exists
      const categoryExists = await prisma.category.findFirst({
        where: { id: categoryAId, tenantId: tenantAId }
      });
      expect(categoryExists).toBeTruthy();
    });

    it('should only return categories from correct tenant', async () => {
      // Tenant A should only see their categories
      const resultA = await categoryService.getCategories(userAId, tenantAId);
      expect(resultA.success).toBe(true);
      expect(resultA.categories).toHaveLength(1);
      expect(resultA.categories?.[0].tenantId).toBe(tenantAId);
      expect(resultA.categories?.[0].name).toBe('Category A');

      // Tenant B should only see their categories
      const resultB = await categoryService.getCategories(userBId, tenantBId);
      expect(resultB.success).toBe(true);
      expect(resultB.categories).toHaveLength(1);
      expect(resultB.categories?.[0].tenantId).toBe(tenantBId);
      expect(resultB.categories?.[0].name).toBe('Category B');
    });
  });

  describe('Category Hierarchy Across Tenants', () => {
    it('should not allow parent category from different tenant', async () => {
      // Try to create category in Tenant A with parent from Tenant B
      const categoryData = {
        name: 'Child in A with Parent in B',
        parentId: categoryBId // Parent from Tenant B
      };

      const result = await categoryService.createCategory(
        categoryData,
        userAId,
        tenantAId
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Parent category not found or access denied');
    });

    it('should not allow updating category to have parent from different tenant', async () => {
      const updateData = {
        parentId: categoryBId // Parent from Tenant B
      };

      const result = await categoryService.updateCategory(
        categoryAId,
        updateData,
        userAId,
        tenantAId
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Parent category not found or access denied');
    });

    it('should build separate category trees for each tenant', async () => {
      // Create child categories in each tenant
      const childAId = uuidv4();
      const childBId = uuidv4();

      await prisma.category.create({
        data: {
          id: childAId,
          tenantId: tenantAId,
          name: 'Child A',
          parentId: categoryAId
        }
      });

      await prisma.category.create({
        data: {
          id: childBId,
          tenantId: tenantBId,
          name: 'Child B',
          parentId: categoryBId
        }
      });

      // Get category trees for each tenant
      const treeA = await categoryService.getCategoryTree(userAId, tenantAId);
      const treeB = await categoryService.getCategoryTree(userBId, tenantBId);

      expect(treeA.success).toBe(true);
      expect(treeB.success).toBe(true);

      // Tenant A tree should only contain Tenant A categories
      const parentA = treeA.tree?.find(cat => cat.name === 'Category A');
      expect(parentA).toBeDefined();
      expect(parentA?.children).toHaveLength(1);
      expect(parentA?.children?.[0].name).toBe('Child A');

      // Tenant B tree should only contain Tenant B categories
      const parentB = treeB.tree?.find(cat => cat.name === 'Category B');
      expect(parentB).toBeDefined();
      expect(parentB?.children).toHaveLength(1);
      expect(parentB?.children?.[0].name).toBe('Child B');

      // Trees should not contain categories from other tenants
      expect(treeA.tree?.some(cat => cat.tenantId === tenantBId)).toBe(false);
      expect(treeB.tree?.some(cat => cat.tenantId === tenantAId)).toBe(false);
    });
  });

  describe('Category Usage in Different Tenant Contexts', () => {
    it('should not show usage statistics across tenants', async () => {
      // Create transactions in both tenants using their respective categories
      await prisma.transaction.create({
        data: {
          id: uuidv4(),
          tenantId: tenantAId,
          userId: userAId,
          accountId: accountAId,
          categoryId: categoryAId,
          amount: 100.00,
          type: 'EXPENSE',
          description: 'Transaction A'
        }
      });

      await prisma.transaction.create({
        data: {
          id: uuidv4(),
          tenantId: tenantBId,
          userId: userBId,
          accountId: accountBId,
          categoryId: categoryBId,
          amount: 200.00,
          type: 'EXPENSE',
          description: 'Transaction B'
        }
      });

      // Tenant A should only see their own category usage
      const usageA = await categoryService.getCategoryUsage(
        categoryAId,
        userAId,
        tenantAId
      );

      expect(usageA.success).toBe(true);
      expect(usageA.usage?.transactionCount).toBe(1);
      expect(usageA.usage?.totalAmount).toBe('100.00');

      // Tenant B should only see their own category usage
      const usageB = await categoryService.getCategoryUsage(
        categoryBId,
        userBId,
        tenantBId
      );

      expect(usageB.success).toBe(true);
      expect(usageB.usage?.transactionCount).toBe(1);
      expect(usageB.usage?.totalAmount).toBe('200.00');

      // Tenant A should not be able to see Tenant B category usage
      const crossTenantUsage = await categoryService.getCategoryUsage(
        categoryBId,
        userAId,
        tenantAId
      );

      expect(crossTenantUsage.success).toBe(false);
      expect(crossTenantUsage.message).toBe('Category not found or access denied');
    });

    it('should enforce tenant isolation in search results', async () => {
      // Create categories with similar names in both tenants
      await prisma.category.create({
        data: {
          id: uuidv4(),
          tenantId: tenantAId,
          name: 'Food & Dining',
          description: 'Tenant A food category'
        }
      });

      await prisma.category.create({
        data: {
          id: uuidv4(),
          tenantId: tenantBId,
          name: 'Food & Beverages',
          description: 'Tenant B food category'
        }
      });

      // Search for "food" in Tenant A
      const searchA = await categoryService.searchCategories(
        'food',
        userAId,
        tenantAId
      );

      expect(searchA.success).toBe(true);
      expect(searchA.categories).toHaveLength(1);
      expect(searchA.categories?.[0].name).toBe('Food & Dining');
      expect(searchA.categories?.[0].tenantId).toBe(tenantAId);

      // Search for "food" in Tenant B
      const searchB = await categoryService.searchCategories(
        'food',
        userBId,
        tenantBId
      );

      expect(searchB.success).toBe(true);
      expect(searchB.categories).toHaveLength(1);
      expect(searchB.categories?.[0].name).toBe('Food & Beverages');
      expect(searchB.categories?.[0].tenantId).toBe(tenantBId);
    });

    it('should prevent category path traversal across tenants', async () => {
      // Create nested categories in Tenant A
      const parentA = await prisma.category.create({
        data: {
          id: uuidv4(),
          tenantId: tenantAId,
          name: 'Parent A'
        }
      });

      const childA = await prisma.category.create({
        data: {
          id: uuidv4(),
          tenantId: tenantAId,
          name: 'Child A',
          parentId: parentA.id
        }
      });

      // Tenant B user should not be able to get path for Tenant A category
      const result = await categoryService.getCategoryPath(
        childA.id,
        userBId,
        tenantBId
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Category not found or access denied');
    });
  });

  describe('Data Leakage Prevention', () => {
    it('should not leak category count information across tenants', async () => {
      // Create multiple categories in Tenant B
      await prisma.category.createMany({
        data: [
          {
            id: uuidv4(),
            tenantId: tenantBId,
            name: 'Additional Category 1'
          },
          {
            id: uuidv4(),
            tenantId: tenantBId,
            name: 'Additional Category 2'
          },
          {
            id: uuidv4(),
            tenantId: tenantBId,
            name: 'Additional Category 3'
          }
        ]
      });

      // Tenant A should still only see their own categories
      const resultA = await categoryService.getCategories(userAId, tenantAId);
      expect(resultA.success).toBe(true);
      expect(resultA.categories).toHaveLength(1); // Only original Category A
      expect(resultA.total).toBe(1);
    });

    it('should not expose category existence through error messages', async () => {
      const nonExistentId = uuidv4();

      // Try to access non-existent category
      const result1 = await categoryService.getCategory(
        nonExistentId,
        userAId,
        tenantAId
      );

      // Try to access existing category from different tenant
      const result2 = await categoryService.getCategory(
        categoryBId,
        userAId,
        tenantAId
      );

      // Both should return the same error message to prevent information leakage
      expect(result1.success).toBe(false);
      expect(result2.success).toBe(false);
      expect(result1.message).toBe(result2.message);
      expect(result1.message).toBe('Category not found or access denied');
    });

    it('should prevent timing attacks through consistent response times', async () => {
      const startTime1 = Date.now();

      // Access non-existent category
      await categoryService.getCategory(
        uuidv4(),
        userAId,
        tenantAId
      );

      const time1 = Date.now() - startTime1;

      const startTime2 = Date.now();

      // Access existing category from different tenant
      await categoryService.getCategory(
        categoryBId,
        userAId,
        tenantAId
      );

      const time2 = Date.now() - startTime2;

      // Response times should be similar (within reasonable margin)
      // This is a basic check - in practice, you'd want more sophisticated timing analysis
      const timeDifference = Math.abs(time1 - time2);
      expect(timeDifference).toBeLessThan(100); // 100ms threshold
    });
  });

  describe('Security Edge Cases', () => {
    it('should handle SQL injection attempts in tenant validation', async () => {
      // Attempt SQL injection through tenantId parameter
      const maliciousTenantId = "'; DROP TABLE categories; --";

      const result = await categoryService.getCategories(
        userAId,
        maliciousTenantId
      );

      expect(result.success).toBe(true);
      expect(result.categories).toHaveLength(0); // No categories found for invalid tenant

      // Verify categories table still exists and contains data
      const categoriesStillExist = await prisma.category.findMany({
        where: { tenantId: tenantAId }
      });
      expect(categoriesStillExist).toHaveLength(1);
    });

    it('should handle malformed UUIDs in tenant validation', async () => {
      const malformedTenantId = "not-a-valid-uuid";

      const result = await categoryService.getCategories(
        userAId,
        malformedTenantId
      );

      expect(result.success).toBe(true);
      expect(result.categories).toHaveLength(0);
    });

    it('should validate parent category belongs to same tenant during updates', async () => {
      // Create additional category in Tenant A
      const anotherCategoryA = await prisma.category.create({
        data: {
          id: uuidv4(),
          tenantId: tenantAId,
          name: 'Another Category A'
        }
      });

      // Valid update: Set parent to category from same tenant
      const validResult = await categoryService.updateCategory(
        anotherCategoryA.id,
        { parentId: categoryAId },
        userAId,
        tenantAId
      );

      expect(validResult.success).toBe(true);

      // Invalid update: Try to set parent to category from different tenant
      const invalidResult = await categoryService.updateCategory(
        anotherCategoryA.id,
        { parentId: categoryBId },
        userAId,
        tenantAId
      );

      expect(invalidResult.success).toBe(false);
      expect(invalidResult.message).toBe('Parent category not found or access denied');
    });
  });
});