import { FastifyRequest, FastifyReply } from 'fastify';
import { CategoryService } from './categories.service';
export declare class CategoryController {
    private categoryService;
    constructor(categoryService: CategoryService);
    createCategory(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    getCategories(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    getCategory(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    updateCategory(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    deleteCategory(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    getCategoryTree(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    getCategoryPath(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    searchCategories(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    getCategoryUsage(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    bulkCategoryOperations(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    private extractAuthInfo;
    healthCheck(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    getCategoriesStats(request: FastifyRequest, reply: FastifyReply): Promise<void>;
}
//# sourceMappingURL=categories.controller.d.ts.map