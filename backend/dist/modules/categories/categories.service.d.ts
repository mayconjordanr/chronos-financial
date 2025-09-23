import { PrismaClient } from '@prisma/client';
import { CreateCategoryDto, UpdateCategoryDto, GetCategoriesDto, SearchCategoriesDto, CategoryUsageFiltersDto, CategoryTreeOptionsDto, CategoryResult, CategoriesResult, CategoryTreeResult, CategoryPathResult, CategoryUsageResult } from './categories.dto';
export declare class CategoryService {
    private prisma;
    constructor(prisma: PrismaClient);
    createCategory(data: CreateCategoryDto, userId: string, tenantId: string): Promise<CategoryResult>;
    getCategories(userId: string, tenantId: string, options?: GetCategoriesDto): Promise<CategoriesResult>;
    getCategory(categoryId: string, userId: string, tenantId: string): Promise<CategoryResult>;
    updateCategory(categoryId: string, data: UpdateCategoryDto, userId: string, tenantId: string): Promise<CategoryResult>;
    deleteCategory(categoryId: string, userId: string, tenantId: string): Promise<CategoryResult>;
    getCategoryTree(userId: string, tenantId: string, options?: CategoryTreeOptionsDto): Promise<CategoryTreeResult>;
    getCategoryPath(categoryId: string, userId: string, tenantId: string): Promise<CategoryPathResult>;
    searchCategories(query: string, userId: string, tenantId: string, options?: SearchCategoriesDto): Promise<CategoriesResult>;
    getCategoryUsage(categoryId: string, userId: string, tenantId: string, filters?: CategoryUsageFiltersDto): Promise<CategoryUsageResult>;
    private calculateCategoryDepth;
    private wouldCreateCircularReference;
    private buildCategoryTree;
    private calculateCategoryUsage;
    private isValidColor;
}
//# sourceMappingURL=categories.service.d.ts.map