"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CardController = void 0;
const cards_dto_1 = require("./cards.dto");
class CardController {
    cardService;
    constructor(cardService) {
        this.cardService = cardService;
    }
    async createCard(request, reply) {
        try {
            if (!request.user) {
                return reply.code(401).send({
                    success: false,
                    message: 'Authentication required'
                });
            }
            const validation = cards_dto_1.CreateCardRequestDTO.safeParse(request.body);
            if (!validation.success) {
                return reply.code(400).send({
                    success: false,
                    message: 'Invalid request data',
                    errors: validation.error.errors
                });
            }
            const data = validation.data;
            const { id: userId, tenantId } = request.user;
            console.log(`Card creation attempt by user ${userId} in tenant ${tenantId}`);
            const result = await this.cardService.createCard({
                accountId: data.accountId,
                cardNumber: data.cardNumber,
                cardholderName: data.cardholderName,
                expiryMonth: data.expiryMonth,
                expiryYear: data.expiryYear,
                cvv: data.cvv,
                cardType: data.cardType,
                brand: data.brand,
                issuer: data.issuer,
                dailyLimit: data.dailyLimit,
                monthlyLimit: data.monthlyLimit,
                pin: data.pin,
                notes: data.notes,
                tags: data.tags
            }, userId, tenantId);
            if (!result.success) {
                return reply.code(400).send(result);
            }
            return reply.code(201).send({
                success: true,
                message: result.message,
                data: {
                    card: {
                        id: result.card.id,
                        accountId: result.card.accountId,
                        maskedNumber: result.card.maskedNumber,
                        cardholderName: result.card.cardholderName,
                        expiryMonth: result.card.expiryMonth,
                        expiryYear: result.card.expiryYear,
                        cardType: result.card.cardType,
                        brand: result.card.brand,
                        issuer: result.card.issuer,
                        isActive: result.card.isActive,
                        isLocked: result.card.isLocked,
                        dailyLimit: result.card.dailyLimit,
                        monthlyLimit: result.card.monthlyLimit,
                        notes: result.card.notes,
                        tags: result.card.tags,
                        createdAt: result.card.createdAt,
                        account: result.card.account
                    }
                }
            });
        }
        catch (error) {
            console.error('Error in createCard controller:', error);
            return reply.code(500).send({
                success: false,
                message: 'Internal server error'
            });
        }
    }
    async getCards(request, reply) {
        try {
            if (!request.user) {
                return reply.code(401).send({
                    success: false,
                    message: 'Authentication required'
                });
            }
            const filtersValidation = cards_dto_1.CardFiltersDTO.safeParse(request.query);
            if (!filtersValidation.success) {
                return reply.code(400).send({
                    success: false,
                    message: 'Invalid filter parameters',
                    errors: filtersValidation.error.errors
                });
            }
            const paginationValidation = cards_dto_1.PaginationDTO.safeParse(request.query);
            if (!paginationValidation.success) {
                return reply.code(400).send({
                    success: false,
                    message: 'Invalid pagination parameters',
                    errors: paginationValidation.error.errors
                });
            }
            const filters = filtersValidation.data;
            const pagination = paginationValidation.data;
            const { id: userId, tenantId } = request.user;
            const result = await this.cardService.getCards(userId, tenantId, filters, pagination);
            if (!result.success) {
                return reply.code(500).send(result);
            }
            return reply.send({
                success: true,
                message: result.message,
                data: {
                    cards: result.cards?.map(card => ({
                        id: card.id,
                        accountId: card.accountId,
                        maskedNumber: card.maskedNumber,
                        cardholderName: card.cardholderName,
                        expiryMonth: card.expiryMonth,
                        expiryYear: card.expiryYear,
                        cardType: card.cardType,
                        brand: card.brand,
                        issuer: card.issuer,
                        isActive: card.isActive,
                        isLocked: card.isLocked,
                        dailyLimit: card.dailyLimit,
                        monthlyLimit: card.monthlyLimit,
                        activatedAt: card.activatedAt,
                        lastUsedAt: card.lastUsedAt,
                        notes: card.notes,
                        tags: card.tags,
                        createdAt: card.createdAt,
                        updatedAt: card.updatedAt,
                        account: card.account
                    })),
                    pagination: {
                        page: pagination.page || 1,
                        limit: pagination.limit || 50,
                        total: result.total || 0,
                        totalPages: Math.ceil((result.total || 0) / (pagination.limit || 50))
                    }
                }
            });
        }
        catch (error) {
            console.error('Error in getCards controller:', error);
            return reply.code(500).send({
                success: false,
                message: 'Internal server error'
            });
        }
    }
    async getCard(request, reply) {
        try {
            if (!request.user) {
                return reply.code(401).send({
                    success: false,
                    message: 'Authentication required'
                });
            }
            const paramsValidation = cards_dto_1.CardParamsDTO.safeParse(request.params);
            if (!paramsValidation.success) {
                return reply.code(400).send({
                    success: false,
                    message: 'Invalid card ID',
                    errors: paramsValidation.error.errors
                });
            }
            const { cardId } = paramsValidation.data;
            const { id: userId, tenantId } = request.user;
            const result = await this.cardService.getCard(cardId, userId, tenantId);
            if (!result.success) {
                return reply.code(404).send(result);
            }
            return reply.send({
                success: true,
                message: result.message,
                data: {
                    card: {
                        id: result.card.id,
                        accountId: result.card.accountId,
                        maskedNumber: result.card.maskedNumber,
                        cardholderName: result.card.cardholderName,
                        expiryMonth: result.card.expiryMonth,
                        expiryYear: result.card.expiryYear,
                        cardType: result.card.cardType,
                        brand: result.card.brand,
                        issuer: result.card.issuer,
                        isActive: result.card.isActive,
                        isLocked: result.card.isLocked,
                        dailyLimit: result.card.dailyLimit,
                        monthlyLimit: result.card.monthlyLimit,
                        activatedAt: result.card.activatedAt,
                        lastUsedAt: result.card.lastUsedAt,
                        notes: result.card.notes,
                        tags: result.card.tags,
                        createdAt: result.card.createdAt,
                        updatedAt: result.card.updatedAt,
                        account: result.card.account
                    }
                }
            });
        }
        catch (error) {
            console.error('Error in getCard controller:', error);
            return reply.code(500).send({
                success: false,
                message: 'Internal server error'
            });
        }
    }
    async updateCard(request, reply) {
        try {
            if (!request.user) {
                return reply.code(401).send({
                    success: false,
                    message: 'Authentication required'
                });
            }
            const paramsValidation = cards_dto_1.CardParamsDTO.safeParse(request.params);
            if (!paramsValidation.success) {
                return reply.code(400).send({
                    success: false,
                    message: 'Invalid card ID',
                    errors: paramsValidation.error.errors
                });
            }
            const bodyValidation = cards_dto_1.UpdateCardRequestDTO.safeParse(request.body);
            if (!bodyValidation.success) {
                return reply.code(400).send({
                    success: false,
                    message: 'Invalid request data',
                    errors: bodyValidation.error.errors
                });
            }
            const { cardId } = paramsValidation.data;
            const data = bodyValidation.data;
            const { id: userId, tenantId } = request.user;
            console.log(`Card update attempt for ${cardId} by user ${userId} in tenant ${tenantId}`);
            const result = await this.cardService.updateCard(cardId, data, userId, tenantId);
            if (!result.success) {
                return reply.code(404).send(result);
            }
            return reply.send({
                success: true,
                message: result.message,
                data: {
                    card: {
                        id: result.card.id,
                        accountId: result.card.accountId,
                        maskedNumber: result.card.maskedNumber,
                        cardholderName: result.card.cardholderName,
                        expiryMonth: result.card.expiryMonth,
                        expiryYear: result.card.expiryYear,
                        cardType: result.card.cardType,
                        brand: result.card.brand,
                        issuer: result.card.issuer,
                        isActive: result.card.isActive,
                        isLocked: result.card.isLocked,
                        dailyLimit: result.card.dailyLimit,
                        monthlyLimit: result.card.monthlyLimit,
                        activatedAt: result.card.activatedAt,
                        lastUsedAt: result.card.lastUsedAt,
                        notes: result.card.notes,
                        tags: result.card.tags,
                        createdAt: result.card.createdAt,
                        updatedAt: result.card.updatedAt,
                        account: result.card.account
                    }
                }
            });
        }
        catch (error) {
            console.error('Error in updateCard controller:', error);
            return reply.code(500).send({
                success: false,
                message: 'Internal server error'
            });
        }
    }
    async deleteCard(request, reply) {
        try {
            if (!request.user) {
                return reply.code(401).send({
                    success: false,
                    message: 'Authentication required'
                });
            }
            const paramsValidation = cards_dto_1.CardParamsDTO.safeParse(request.params);
            if (!paramsValidation.success) {
                return reply.code(400).send({
                    success: false,
                    message: 'Invalid card ID',
                    errors: paramsValidation.error.errors
                });
            }
            const { cardId } = paramsValidation.data;
            const { id: userId, tenantId } = request.user;
            console.log(`Card deletion attempt for ${cardId} by user ${userId} in tenant ${tenantId}`);
            const result = await this.cardService.deleteCard(cardId, userId, tenantId);
            if (!result.success) {
                return reply.code(404).send(result);
            }
            return reply.send({
                success: true,
                message: result.message
            });
        }
        catch (error) {
            console.error('Error in deleteCard controller:', error);
            return reply.code(500).send({
                success: false,
                message: 'Internal server error'
            });
        }
    }
    async activateCard(request, reply) {
        try {
            if (!request.user) {
                return reply.code(401).send({
                    success: false,
                    message: 'Authentication required'
                });
            }
            const paramsValidation = cards_dto_1.CardParamsDTO.safeParse(request.params);
            if (!paramsValidation.success) {
                return reply.code(400).send({
                    success: false,
                    message: 'Invalid card ID',
                    errors: paramsValidation.error.errors
                });
            }
            const { cardId } = paramsValidation.data;
            const { id: userId, tenantId } = request.user;
            console.log(`Card activation attempt for ${cardId} by user ${userId} in tenant ${tenantId}`);
            const result = await this.cardService.activateCard(cardId, userId, tenantId);
            if (!result.success) {
                return reply.code(400).send(result);
            }
            return reply.send({
                success: true,
                message: result.message,
                data: {
                    card: {
                        id: result.card.id,
                        isActive: result.card.isActive,
                        activatedAt: result.card.activatedAt
                    }
                }
            });
        }
        catch (error) {
            console.error('Error in activateCard controller:', error);
            return reply.code(500).send({
                success: false,
                message: 'Internal server error'
            });
        }
    }
    async deactivateCard(request, reply) {
        try {
            if (!request.user) {
                return reply.code(401).send({
                    success: false,
                    message: 'Authentication required'
                });
            }
            const paramsValidation = cards_dto_1.CardParamsDTO.safeParse(request.params);
            if (!paramsValidation.success) {
                return reply.code(400).send({
                    success: false,
                    message: 'Invalid card ID',
                    errors: paramsValidation.error.errors
                });
            }
            const { cardId } = paramsValidation.data;
            const { id: userId, tenantId } = request.user;
            console.log(`Card deactivation attempt for ${cardId} by user ${userId} in tenant ${tenantId}`);
            const result = await this.cardService.deactivateCard(cardId, userId, tenantId);
            if (!result.success) {
                return reply.code(400).send(result);
            }
            return reply.send({
                success: true,
                message: result.message,
                data: {
                    card: {
                        id: result.card.id,
                        isActive: result.card.isActive
                    }
                }
            });
        }
        catch (error) {
            console.error('Error in deactivateCard controller:', error);
            return reply.code(500).send({
                success: false,
                message: 'Internal server error'
            });
        }
    }
    async getCardTransactions(request, reply) {
        try {
            if (!request.user) {
                return reply.code(401).send({
                    success: false,
                    message: 'Authentication required'
                });
            }
            const paramsValidation = cards_dto_1.CardParamsDTO.safeParse(request.params);
            if (!paramsValidation.success) {
                return reply.code(400).send({
                    success: false,
                    message: 'Invalid card ID',
                    errors: paramsValidation.error.errors
                });
            }
            const { cardId } = paramsValidation.data;
            const { id: userId, tenantId } = request.user;
            const result = await this.cardService.getCardTransactions(cardId, userId, tenantId);
            if (!result.success) {
                return reply.code(404).send(result);
            }
            return reply.send({
                success: true,
                message: result.message,
                data: {
                    transactions: result.transactions
                }
            });
        }
        catch (error) {
            console.error('Error in getCardTransactions controller:', error);
            return reply.code(500).send({
                success: false,
                message: 'Internal server error'
            });
        }
    }
    async getCardStatistics(request, reply) {
        try {
            if (!request.user) {
                return reply.code(401).send({
                    success: false,
                    message: 'Authentication required'
                });
            }
            const { id: userId, tenantId } = request.user;
            const result = await this.cardService.getCardStatistics(userId, tenantId);
            if (!result.success) {
                return reply.code(500).send(result);
            }
            return reply.send({
                success: true,
                message: result.message,
                data: {
                    statistics: result.statistics
                }
            });
        }
        catch (error) {
            console.error('Error in getCardStatistics controller:', error);
            return reply.code(500).send({
                success: false,
                message: 'Internal server error'
            });
        }
    }
    async bulkActivateCards(request, reply) {
        try {
            if (!request.user) {
                return reply.code(401).send({
                    success: false,
                    message: 'Authentication required'
                });
            }
            const validation = cards_dto_1.BulkActivateCardsDTO.safeParse(request.body);
            if (!validation.success) {
                return reply.code(400).send({
                    success: false,
                    message: 'Invalid request data',
                    errors: validation.error.errors
                });
            }
            const { cardIds } = validation.data;
            const { id: userId, tenantId } = request.user;
            console.log(`Bulk card activation attempt for ${cardIds.length} cards by user ${userId} in tenant ${tenantId}`);
            const result = await this.cardService.bulkActivateCards(cardIds, userId, tenantId);
            const statusCode = result.success ? 200 : 207;
            return reply.code(statusCode).send({
                success: result.success,
                message: result.message,
                data: {
                    succeeded: result.succeeded,
                    failed: result.failed,
                    errors: result.errors
                }
            });
        }
        catch (error) {
            console.error('Error in bulkActivateCards controller:', error);
            return reply.code(500).send({
                success: false,
                message: 'Internal server error'
            });
        }
    }
    async validateCardTransaction(request, reply) {
        try {
            if (!request.user) {
                return reply.code(401).send({
                    success: false,
                    message: 'Authentication required'
                });
            }
            const paramsValidation = cards_dto_1.CardParamsDTO.safeParse(request.params);
            if (!paramsValidation.success) {
                return reply.code(400).send({
                    success: false,
                    message: 'Invalid card ID',
                    errors: paramsValidation.error.errors
                });
            }
            const body = request.body;
            if (!body.amount || body.amount <= 0) {
                return reply.code(400).send({
                    success: false,
                    message: 'Invalid transaction amount'
                });
            }
            const { cardId } = paramsValidation.data;
            const { amount } = body;
            const { id: userId, tenantId } = request.user;
            const result = await this.cardService.validateCardTransaction(cardId, amount, userId, tenantId);
            if (!result.success) {
                return reply.code(400).send(result);
            }
            return reply.send({
                success: true,
                message: result.message,
                data: {
                    isValid: result.isValid
                }
            });
        }
        catch (error) {
            console.error('Error in validateCardTransaction controller:', error);
            return reply.code(500).send({
                success: false,
                message: 'Internal server error'
            });
        }
    }
}
exports.CardController = CardController;
//# sourceMappingURL=cards.controller.js.map