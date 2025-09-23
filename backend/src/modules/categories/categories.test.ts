import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { CategoryService } from './categories.service';
import { v4 as uuidv4 } from 'uuid';

describe('Categories Module', () => {
  let categoryService: CategoryService;
  let prisma: PrismaClient;
  let testTenantId: string;
  let testUserId: string;
  let testParentCategoryId: string;
  let testSubCategoryId: string;
  let testAccount1Id: string;

  beforeEach(async () => {
    prisma = new PrismaClient();
    categoryService = new CategoryService(prisma);

    testTenantId = uuidv4();
    testUserId = uuidv4();
    testParentCategoryId = uuidv4();
    testSubCategoryId = uuidv4();
    testAccount1Id = uuidv4();

    // Create test tenant
    await prisma.tenant.create({
      data: {
        id: testTenantId,
        name: 'Test Tenant',
        slug: `test-${Date.now()}`,
        status: 'ACTIVE'
      }
    });

    // Create test user
    await prisma.user.create({
      data: {
        id: testUserId,
        tenantId: testTenantId,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        password: 'hashedpassword',
        isActive: true
      }
    });

    // Create test account for transaction usage tests
    await prisma.account.create({
      data: {
        id: testAccount1Id,
        tenantId: testTenantId,
        userId: testUserId,
        name: 'Test Account',
        type: 'CHECKING',
        balance: 1000.00
      }
    });
  });

  afterEach(async () => {
    // Clean up test data in correct order due to foreign key constraints
    await prisma.transaction.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.category.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.account.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.user.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.tenant.deleteMany({ where: { id: testTenantId } });
    await prisma.$disconnect();
  });

  describe('CRUD Operations with Tenant Isolation', () => {
    it('should create category with tenant isolation', async () => {
      const categoryData = {
        name: 'Food & Dining',
        description: 'All food and dining expenses',
        color: '#FF5733',
        icon: '🍽️',
        isActive: true
      };

      const result = await categoryService.createCategory(
        categoryData,
        testUserId,
        testTenantId
      );

      expect(result.success).toBe(true);
      expect(result.category).toBeDefined();
      expect(result.category?.tenantId).toBe(testTenantId);
      expect(result.category?.name).toBe('Food & Dining');
      expect(result.category?.color).toBe('#FF5733');
      expect(result.category?.icon).toBe('🍽️');
      expect(result.category?.parentId).toBeNull();
      expect(result.category?.isActive).toBe(true);
    });

    it('should create hierarchical category with parent validation', async () => {
      // First create parent category
      const parentData = {
        name: 'Entertainment',
        description: 'Entertainment expenses',
        color: '#9C27B0',
        icon: '🎬'
      };

      const parentResult = await categoryService.createCategory(
        parentData,
        testUserId,
        testTenantId
      );

      expect(parentResult.success).toBe(true);
      const parentId = parentResult.category?.id;

      // Create child category
      const childData = {
        name: 'Movies',
        description: 'Movie tickets and streaming',
        color: '#E91E63',
        icon: '🎥',
        parentId: parentId
      };

      const childResult = await categoryService.createCategory(
        childData,
        testUserId,
        testTenantId
      );

      expect(childResult.success).toBe(true);
      expect(childResult.category?.parentId).toBe(parentId);
      expect(childResult.category?.name).toBe('Movies');
    });

    it('should not create category with parent from different tenant', async () => {
      const wrongTenantId = uuidv4();

      // Create tenant and parent category in different tenant
      await prisma.tenant.create({
        data: {
          id: wrongTenantId,
          name: 'Wrong Tenant',
          slug: `wrong-${Date.now()}`,
          status: 'ACTIVE'
        }
      });

      const wrongParentId = uuidv4();
      await prisma.category.create({
        data: {
          id: wrongParentId,
          tenantId: wrongTenantId,
          name: 'Wrong Parent'
        }
      });

      const categoryData = {
        name: 'Child Category',
        description: 'Should fail',
        parentId: wrongParentId // Parent from different tenant
      };

      const result = await categoryService.createCategory(
        categoryData,
        testUserId,
        testTenantId
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Parent category not found or access denied');

      // Cleanup
      await prisma.category.deleteMany({ where: { tenantId: wrongTenantId } });
      await prisma.tenant.deleteMany({ where: { id: wrongTenantId } });
    });

    it('should retrieve categories with tenant isolation', async () => {
      // Create test categories
      await prisma.category.createMany({
        data: [
          {
            id: uuidv4(),
            tenantId: testTenantId,
            name: 'Transportation',
            color: '#2196F3',
            icon: '🚗'
          },
          {
            id: uuidv4(),
            tenantId: testTenantId,
            name: 'Groceries',
            color: '#4CAF50',
            icon: '🛒'
          }
        ]
      });

      const result = await categoryService.getCategories(testUserId, testTenantId);

      expect(result.success).toBe(true);
      expect(result.categories).toHaveLength(2);
      expect(result.categories?.every(c => c.tenantId === testTenantId)).toBe(true);
    });

    it('should update category with tenant isolation', async () => {
      // Create test category
      const category = await prisma.category.create({
        data: {
          id: uuidv4(),
          tenantId: testTenantId,
          name: 'Health',
          description: 'Health expenses',
          color: '#FF9800',
          icon: '🏥'
        }
      });

      const updateData = {
        name: 'Health & Medical',
        description: 'Health and medical expenses',
        color: '#F44336',
        icon: '💊'
      };

      const result = await categoryService.updateCategory(
        category.id,
        updateData,
        testUserId,
        testTenantId
      );

      expect(result.success).toBe(true);
      expect(result.category?.name).toBe('Health & Medical');
      expect(result.category?.color).toBe('#F44336');
      expect(result.category?.icon).toBe('💊');
    });

    it('should not update category from different tenant', async () => {
      const wrongTenantId = uuidv4();

      // Create category in different tenant
      await prisma.tenant.create({
        data: {
          id: wrongTenantId,
          name: 'Wrong Tenant',
          slug: `wrong2-${Date.now()}`,
          status: 'ACTIVE'
        }
      });

      const wrongCategory = await prisma.category.create({
        data: {
          id: uuidv4(),
          tenantId: wrongTenantId,
          name: 'Wrong Category'
        }
      });

      const updateData = {
        name: 'Hacked Category'
      };

      const result = await categoryService.updateCategory(
        wrongCategory.id,
        updateData,
        testUserId,
        testTenantId
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Category not found or access denied');

      // Cleanup
      await prisma.category.deleteMany({ where: { tenantId: wrongTenantId } });
      await prisma.tenant.deleteMany({ where: { id: wrongTenantId } });
    });

    it('should delete category with tenant isolation', async () => {
      const category = await prisma.category.create({
        data: {
          id: uuidv4(),
          tenantId: testTenantId,
          name: 'To Delete',
          description: 'Category to be deleted'
        }
      });

      const result = await categoryService.deleteCategory(
        category.id,
        testUserId,
        testTenantId
      );

      expect(result.success).toBe(true);

      // Verify category is deleted
      const deletedCategory = await prisma.category.findFirst({
        where: { id: category.id, tenantId: testTenantId }
      });
      expect(deletedCategory).toBeNull();
    });

    it('should not delete category with child categories', async () => {
      // Create parent category
      const parentCategory = await prisma.category.create({
        data: {
          id: uuidv4(),
          tenantId: testTenantId,
          name: 'Parent Category'
        }
      });

      // Create child category
      await prisma.category.create({
        data: {
          id: uuidv4(),
          tenantId: testTenantId,
          name: 'Child Category',
          parentId: parentCategory.id
        }
      });

      const result = await categoryService.deleteCategory(
        parentCategory.id,
        testUserId,
        testTenantId
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Cannot delete category with child categories');
    });

    it('should not delete category with transactions', async () => {
      // Create category
      const category = await prisma.category.create({
        data: {
          id: uuidv4(),
          tenantId: testTenantId,
          name: 'Category with Transactions'
        }
      });

      // Create transaction using this category
      await prisma.transaction.create({
        data: {
          id: uuidv4(),
          tenantId: testTenantId,
          userId: testUserId,
          accountId: testAccount1Id,
          categoryId: category.id,
          amount: 100.00,
          type: 'EXPENSE',
          description: 'Test transaction'
        }
      });

      const result = await categoryService.deleteCategory(
        category.id,
        testUserId,
        testTenantId
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Cannot delete category that is being used by transactions');
    });
  });

  describe('Hierarchical Categories', () => {
    it('should build category tree with proper hierarchy', async () => {
      // Create parent category
      const parentCategory = await prisma.category.create({
        data: {
          id: testParentCategoryId,
          tenantId: testTenantId,
          name: 'Shopping',
          color: '#FF5722',
          icon: '🛍️'
        }
      });

      // Create child categories
      await prisma.category.createMany({
        data: [
          {
            id: uuidv4(),
            tenantId: testTenantId,
            name: 'Clothing',
            parentId: testParentCategoryId,
            color: '#E91E63',
            icon: '👕'
          },
          {
            id: uuidv4(),
            tenantId: testTenantId,
            name: 'Electronics',
            parentId: testParentCategoryId,
            color: '#3F51B5',
            icon: '📱'
          }
        ]
      });

      const result = await categoryService.getCategoryTree(testUserId, testTenantId);

      expect(result.success).toBe(true);
      expect(result.tree).toBeDefined();

      // Find the shopping category in the tree
      const shoppingCategory = result.tree?.find(cat => cat.name === 'Shopping');
      expect(shoppingCategory).toBeDefined();
      expect(shoppingCategory?.children).toHaveLength(2);
      expect(shoppingCategory?.children?.some(child => child.name === 'Clothing')).toBe(true);
      expect(shoppingCategory?.children?.some(child => child.name === 'Electronics')).toBe(true);
    });

    it('should prevent circular references in category hierarchy', async () => {
      // Create two categories
      const category1 = await prisma.category.create({
        data: {
          id: uuidv4(),
          tenantId: testTenantId,
          name: 'Category A'
        }
      });

      const category2 = await prisma.category.create({
        data: {
          id: uuidv4(),
          tenantId: testTenantId,
          name: 'Category B',
          parentId: category1.id
        }
      });

      // Try to make category1 a child of category2 (circular reference)
      const result = await categoryService.updateCategory(
        category1.id,
        { parentId: category2.id },
        testUserId,
        testTenantId
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Circular reference detected in category hierarchy');
    });

    it('should validate category depth limits', async () => {
      let parentId: string | undefined = undefined;

      // Create a deep hierarchy (more than allowed depth)
      for (let i = 0; i < 6; i++) { // Assuming max depth is 5
        const category = await prisma.category.create({
          data: {
            id: uuidv4(),
            tenantId: testTenantId,
            name: `Level ${i + 1}`,
            parentId: parentId || null
          }
        });
        parentId = category.id;
      }

      // Try to create one more level (should fail)
      const result = await categoryService.createCategory(
        {
          name: 'Too Deep',
          parentId: parentId
        },
        testUserId,
        testTenantId
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Category hierarchy depth limit exceeded');
    });

    it('should get category path from root to specific category', async () => {
      // Create hierarchy: Root > Shopping > Clothing > Shoes
      const shopping = await prisma.category.create({
        data: {
          id: uuidv4(),
          tenantId: testTenantId,
          name: 'Shopping'
        }
      });

      const clothing = await prisma.category.create({
        data: {
          id: uuidv4(),
          tenantId: testTenantId,
          name: 'Clothing',
          parentId: shopping.id
        }
      });

      const shoes = await prisma.category.create({
        data: {
          id: uuidv4(),
          tenantId: testTenantId,
          name: 'Shoes',
          parentId: clothing.id
        }
      });

      const result = await categoryService.getCategoryPath(
        shoes.id,
        testUserId,
        testTenantId
      );

      expect(result.success).toBe(true);
      expect(result.path).toHaveLength(3);
      expect(result.path?.[0].name).toBe('Shopping');
      expect(result.path?.[1].name).toBe('Clothing');
      expect(result.path?.[2].name).toBe('Shoes');
    });
  });

  describe('Category Features', () => {
    it('should search categories by name with tenant isolation', async () => {
      // Create test categories
      await prisma.category.createMany({
        data: [
          {
            id: uuidv4(),
            tenantId: testTenantId,
            name: 'Food & Dining',
            description: 'Food expenses'
          },
          {
            id: uuidv4(),
            tenantId: testTenantId,
            name: 'Fast Food',
            description: 'Quick meals'
          },
          {
            id: uuidv4(),
            tenantId: testTenantId,
            name: 'Transportation',
            description: 'Transport costs'
          }
        ]
      });

      const result = await categoryService.searchCategories(
        'food',
        testUserId,
        testTenantId
      );

      expect(result.success).toBe(true);
      expect(result.categories).toHaveLength(2);
      expect(result.categories?.every(c => c.name.toLowerCase().includes('food'))).toBe(true);
    });

    it('should get category usage statistics', async () => {
      // Create test category
      const category = await prisma.category.create({
        data: {
          id: uuidv4(),
          tenantId: testTenantId,
          name: 'Groceries',
          color: '#4CAF50',
          icon: '🛒'
        }
      });

      // Create transactions using this category
      await prisma.transaction.createMany({
        data: [
          {
            id: uuidv4(),
            tenantId: testTenantId,
            userId: testUserId,
            accountId: testAccount1Id,
            categoryId: category.id,
            amount: 150.50,
            type: 'EXPENSE',
            description: 'Grocery shopping 1',
            date: new Date('2024-01-15')
          },
          {
            id: uuidv4(),
            tenantId: testTenantId,
            userId: testUserId,
            accountId: testAccount1Id,
            categoryId: category.id,
            amount: 89.75,
            type: 'EXPENSE',
            description: 'Grocery shopping 2',
            date: new Date('2024-01-20')
          }
        ]
      });

      const result = await categoryService.getCategoryUsage(
        category.id,
        testUserId,
        testTenantId
      );

      expect(result.success).toBe(true);
      expect(result.usage).toBeDefined();
      expect(result.usage?.transactionCount).toBe(2);
      expect(result.usage?.totalAmount).toBe('240.25'); // 150.50 + 89.75
      expect(result.usage?.averageAmount).toBe('120.13'); // (150.50 + 89.75) / 2
    });

    it('should get category usage with date range filtering', async () => {
      // Create test category
      const category = await prisma.category.create({
        data: {
          id: uuidv4(),
          tenantId: testTenantId,
          name: 'Utilities',
          color: '#607D8B',
          icon: '⚡'
        }
      });

      // Create transactions in different months
      await prisma.transaction.createMany({
        data: [
          {
            id: uuidv4(),
            tenantId: testTenantId,
            userId: testUserId,
            accountId: testAccount1Id,
            categoryId: category.id,
            amount: 125.00,
            type: 'EXPENSE',
            description: 'Electric bill',
            date: new Date('2024-01-15')
          },
          {
            id: uuidv4(),
            tenantId: testTenantId,
            userId: testUserId,
            accountId: testAccount1Id,
            categoryId: category.id,
            amount: 95.50,
            type: 'EXPENSE',
            description: 'Water bill',
            date: new Date('2024-02-15')
          },
          {
            id: uuidv4(),
            tenantId: testTenantId,
            userId: testUserId,
            accountId: testAccount1Id,
            categoryId: category.id,
            amount: 110.25,
            type: 'EXPENSE',
            description: 'Gas bill',
            date: new Date('2024-03-15')
          }
        ]
      });

      // Get usage for February only
      const result = await categoryService.getCategoryUsage(
        category.id,
        testUserId,
        testTenantId,
        {
          startDate: new Date('2024-02-01'),
          endDate: new Date('2024-02-29')
        }
      );

      expect(result.success).toBe(true);
      expect(result.usage?.transactionCount).toBe(1);
      expect(result.usage?.totalAmount).toBe('95.50');
    });

    it('should validate category color format', async () => {
      const categoryData = {
        name: 'Invalid Color',
        color: 'not-a-valid-color' // Invalid color format
      };

      const result = await categoryService.createCategory(
        categoryData,
        testUserId,
        testTenantId
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid color format');
    });

    it('should prevent duplicate category names within tenant', async () => {
      // Create first category
      await prisma.category.create({
        data: {
          id: uuidv4(),
          tenantId: testTenantId,
          name: 'Duplicate Name'
        }
      });

      // Try to create another category with same name
      const result = await categoryService.createCategory(
        {
          name: 'Duplicate Name',
          description: 'Should fail'
        },
        testUserId,
        testTenantId
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Category name already exists');
    });

    it('should allow same category name in different tenants', async () => {
      const otherTenantId = uuidv4();
      const otherUserId = uuidv4();

      // Create another tenant
      await prisma.tenant.create({
        data: {
          id: otherTenantId,
          name: 'Other Tenant',
          slug: `other-${Date.now()}`,
          status: 'ACTIVE'
        }
      });

      await prisma.user.create({
        data: {
          id: otherUserId,
          tenantId: otherTenantId,
          email: 'other@example.com',
          firstName: 'Other',
          lastName: 'User',
          password: 'hashedpassword',
          isActive: true
        }
      });

      // Create category in first tenant
      const result1 = await categoryService.createCategory(
        {
          name: 'Same Name',
          description: 'First tenant'
        },
        testUserId,
        testTenantId
      );

      // Create category with same name in second tenant
      const result2 = await categoryService.createCategory(
        {
          name: 'Same Name',
          description: 'Second tenant'
        },
        otherUserId,
        otherTenantId
      );

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      // Cleanup
      await prisma.category.deleteMany({ where: { tenantId: otherTenantId } });
      await prisma.user.deleteMany({ where: { tenantId: otherTenantId } });
      await prisma.tenant.deleteMany({ where: { id: otherTenantId } });
    });
  });

  describe('Category Budget Integration', () => {
    it('should support category budget creation', async () => {
      // Create category
      const category = await prisma.category.create({
        data: {
          id: uuidv4(),
          tenantId: testTenantId,
          name: 'Dining Out',
          color: '#FF5722',
          icon: '🍽️'
        }
      });

      // Test that category can be used for budgets (integration test)
      const budget = await prisma.budget.create({
        data: {
          id: uuidv4(),
          tenantId: testTenantId,
          userId: testUserId,
          categoryId: category.id,
          name: 'Monthly Dining Budget',
          amount: 500.00,
          period: 'MONTHLY',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31')
        }
      });

      expect(budget.categoryId).toBe(category.id);

      // Cleanup
      await prisma.budget.deleteMany({ where: { tenantId: testTenantId } });
    });
  });
});