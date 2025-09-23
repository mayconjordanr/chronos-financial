"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = cardRoutes;
const cards_service_1 = require("./cards.service");
const cards_controller_1 = require("./cards.controller");
const cardSchemas = {
    cardResponse: {
        type: 'object',
        properties: {
            id: { type: 'string', format: 'cuid' },
            accountId: { type: 'string', format: 'cuid' },
            maskedNumber: { type: 'string', example: '****-****-****-1234' },
            cardholderName: { type: 'string', example: 'John Doe' },
            expiryMonth: { type: 'integer', minimum: 1, maximum: 12 },
            expiryYear: { type: 'integer', minimum: 2024, maximum: 2050 },
            cardType: { type: 'string', enum: ['CREDIT', 'DEBIT', 'PREPAID'] },
            brand: { type: 'string', example: 'VISA' },
            issuer: { type: 'string', nullable: true },
            isActive: { type: 'boolean' },
            isLocked: { type: 'boolean' },
            dailyLimit: { type: 'number', nullable: true },
            monthlyLimit: { type: 'number', nullable: true },
            activatedAt: { type: 'string', format: 'date-time', nullable: true },
            lastUsedAt: { type: 'string', format: 'date-time', nullable: true },
            notes: { type: 'string', nullable: true },
            tags: { type: 'array', items: { type: 'string' } },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            account: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    type: { type: 'string' },
                    balance: { type: 'number', nullable: true }
                }
            }
        }
    },
    createCardRequest: {
        type: 'object',
        required: [
            'accountId', 'cardNumber', 'cardholderName',
            'expiryMonth', 'expiryYear', 'cvv', 'cardType', 'brand'
        ],
        properties: {
            accountId: { type: 'string', format: 'cuid' },
            cardNumber: { type: 'string', pattern: '^[0-9]{13,19}$' },
            cardholderName: { type: 'string', minLength: 2, maxLength: 100 },
            expiryMonth: { type: 'integer', minimum: 1, maximum: 12 },
            expiryYear: { type: 'integer', minimum: 2024, maximum: 2050 },
            cvv: { type: 'string', pattern: '^[0-9]{3,4}$' },
            cardType: { type: 'string', enum: ['CREDIT', 'DEBIT', 'PREPAID'] },
            brand: { type: 'string', pattern: '^[A-Z\\s]+$' },
            issuer: { type: 'string', minLength: 2, maxLength: 100 },
            dailyLimit: { type: 'number', minimum: 0.01, maximum: 100000 },
            monthlyLimit: { type: 'number', minimum: 0.01, maximum: 1000000 },
            pin: { type: 'string', pattern: '^[0-9]{4,6}$' },
            notes: { type: 'string', maxLength: 500 },
            tags: { type: 'array', items: { type: 'string', maxLength: 50 }, maxItems: 10 }
        },
        additionalProperties: false
    },
    updateCardRequest: {
        type: 'object',
        properties: {
            cardholderName: { type: 'string', minLength: 2, maxLength: 100 },
            expiryMonth: { type: 'integer', minimum: 1, maximum: 12 },
            expiryYear: { type: 'integer', minimum: 2024, maximum: 2050 },
            dailyLimit: { type: ['number', 'null'], minimum: 0.01, maximum: 100000 },
            monthlyLimit: { type: ['number', 'null'], minimum: 0.01, maximum: 1000000 },
            notes: { type: ['string', 'null'], maxLength: 500 },
            tags: { type: 'array', items: { type: 'string', maxLength: 50 }, maxItems: 10 }
        },
        additionalProperties: false
    },
    successResponse: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { type: 'object' }
        }
    },
    errorResponse: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            errors: { type: 'array', items: { type: 'object' } }
        }
    }
};
async function cardRoutes(fastify, options) {
    const { prisma } = options;
    const cardService = new cards_service_1.CardService(prisma);
    const cardController = new cards_controller_1.CardController(cardService);
    fastify.addHook('preHandler', async (request, reply) => {
        if (!request.user) {
            return reply.code(401).send({
                success: false,
                message: 'Authentication required'
            });
        }
    });
    fastify.post('/cards', {
        schema: {
            description: 'Create a new credit/debit card',
            tags: ['Cards'],
            security: [{ bearerAuth: [] }],
            body: cardSchemas.createCardRequest,
            response: {
                201: {
                    ...cardSchemas.successResponse,
                    properties: {
                        ...cardSchemas.successResponse.properties,
                        data: {
                            type: 'object',
                            properties: {
                                card: cardSchemas.cardResponse
                            }
                        }
                    }
                },
                400: cardSchemas.errorResponse,
                401: cardSchemas.errorResponse,
                500: cardSchemas.errorResponse
            }
        }
    }, cardController.createCard.bind(cardController));
    fastify.get('/cards', {
        schema: {
            description: 'Get user cards with filtering and pagination',
            tags: ['Cards'],
            security: [{ bearerAuth: [] }],
            querystring: {
                type: 'object',
                properties: {
                    cardType: { type: 'string', enum: ['CREDIT', 'DEBIT', 'PREPAID'] },
                    isActive: { type: 'string', enum: ['true', 'false'] },
                    isLocked: { type: 'string', enum: ['true', 'false'] },
                    brand: { type: 'string', maxLength: 50 },
                    search: { type: 'string', maxLength: 100 },
                    tags: { type: 'string', description: 'Comma-separated list of tags' },
                    page: { type: 'string', pattern: '^[1-9]\\d*$' },
                    limit: { type: 'string', pattern: '^[1-9]\\d*$' },
                    sortBy: { type: 'string', enum: ['createdAt', 'cardholderName', 'expiryYear', 'lastUsedAt'] },
                    sortOrder: { type: 'string', enum: ['asc', 'desc'] }
                },
                additionalProperties: false
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        data: {
                            type: 'object',
                            properties: {
                                cards: {
                                    type: 'array',
                                    items: cardSchemas.cardResponse
                                },
                                pagination: {
                                    type: 'object',
                                    properties: {
                                        page: { type: 'integer' },
                                        limit: { type: 'integer' },
                                        total: { type: 'integer' },
                                        totalPages: { type: 'integer' }
                                    }
                                }
                            }
                        }
                    }
                },
                400: cardSchemas.errorResponse,
                401: cardSchemas.errorResponse,
                500: cardSchemas.errorResponse
            }
        }
    }, cardController.getCards.bind(cardController));
    fastify.get('/cards/:cardId', {
        schema: {
            description: 'Get a specific card by ID',
            tags: ['Cards'],
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: {
                    cardId: { type: 'string', format: 'cuid' }
                },
                required: ['cardId'],
                additionalProperties: false
            },
            response: {
                200: {
                    ...cardSchemas.successResponse,
                    properties: {
                        ...cardSchemas.successResponse.properties,
                        data: {
                            type: 'object',
                            properties: {
                                card: cardSchemas.cardResponse
                            }
                        }
                    }
                },
                400: cardSchemas.errorResponse,
                401: cardSchemas.errorResponse,
                404: cardSchemas.errorResponse,
                500: cardSchemas.errorResponse
            }
        }
    }, cardController.getCard.bind(cardController));
    fastify.patch('/cards/:cardId', {
        schema: {
            description: 'Update card information',
            tags: ['Cards'],
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: {
                    cardId: { type: 'string', format: 'cuid' }
                },
                required: ['cardId'],
                additionalProperties: false
            },
            body: cardSchemas.updateCardRequest,
            response: {
                200: {
                    ...cardSchemas.successResponse,
                    properties: {
                        ...cardSchemas.successResponse.properties,
                        data: {
                            type: 'object',
                            properties: {
                                card: cardSchemas.cardResponse
                            }
                        }
                    }
                },
                400: cardSchemas.errorResponse,
                401: cardSchemas.errorResponse,
                404: cardSchemas.errorResponse,
                500: cardSchemas.errorResponse
            }
        }
    }, cardController.updateCard.bind(cardController));
    fastify.delete('/cards/:cardId', {
        schema: {
            description: 'Delete/lock a card (soft delete)',
            tags: ['Cards'],
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: {
                    cardId: { type: 'string', format: 'cuid' }
                },
                required: ['cardId'],
                additionalProperties: false
            },
            response: {
                200: cardSchemas.successResponse,
                400: cardSchemas.errorResponse,
                401: cardSchemas.errorResponse,
                404: cardSchemas.errorResponse,
                500: cardSchemas.errorResponse
            }
        }
    }, cardController.deleteCard.bind(cardController));
    fastify.post('/cards/:cardId/activate', {
        schema: {
            description: 'Activate a card',
            tags: ['Cards'],
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: {
                    cardId: { type: 'string', format: 'cuid' }
                },
                required: ['cardId'],
                additionalProperties: false
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        data: {
                            type: 'object',
                            properties: {
                                card: {
                                    type: 'object',
                                    properties: {
                                        id: { type: 'string' },
                                        isActive: { type: 'boolean' },
                                        activatedAt: { type: 'string', format: 'date-time', nullable: true }
                                    }
                                }
                            }
                        }
                    }
                },
                400: cardSchemas.errorResponse,
                401: cardSchemas.errorResponse,
                404: cardSchemas.errorResponse,
                500: cardSchemas.errorResponse
            }
        }
    }, cardController.activateCard.bind(cardController));
    fastify.post('/cards/:cardId/deactivate', {
        schema: {
            description: 'Deactivate a card',
            tags: ['Cards'],
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: {
                    cardId: { type: 'string', format: 'cuid' }
                },
                required: ['cardId'],
                additionalProperties: false
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        data: {
                            type: 'object',
                            properties: {
                                card: {
                                    type: 'object',
                                    properties: {
                                        id: { type: 'string' },
                                        isActive: { type: 'boolean' }
                                    }
                                }
                            }
                        }
                    }
                },
                400: cardSchemas.errorResponse,
                401: cardSchemas.errorResponse,
                404: cardSchemas.errorResponse,
                500: cardSchemas.errorResponse
            }
        }
    }, cardController.deactivateCard.bind(cardController));
    fastify.get('/cards/:cardId/transactions', {
        schema: {
            description: 'Get transactions for a specific card',
            tags: ['Cards'],
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: {
                    cardId: { type: 'string', format: 'cuid' }
                },
                required: ['cardId'],
                additionalProperties: false
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        data: {
                            type: 'object',
                            properties: {
                                transactions: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            id: { type: 'string' },
                                            tenantId: { type: 'string' },
                                            userId: { type: 'string' },
                                            cardId: { type: 'string' },
                                            transactionId: { type: 'string' },
                                            merchantName: { type: 'string', nullable: true },
                                            merchantCategory: { type: 'string', nullable: true },
                                            authorizationCode: { type: 'string', nullable: true },
                                            processorResponse: { type: 'string', nullable: true },
                                            merchantLocation: { type: 'object', nullable: true },
                                            isOnlineTransaction: { type: 'boolean' },
                                            riskScore: { type: 'number', nullable: true },
                                            createdAt: { type: 'string', format: 'date-time' },
                                            updatedAt: { type: 'string', format: 'date-time' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                400: cardSchemas.errorResponse,
                401: cardSchemas.errorResponse,
                404: cardSchemas.errorResponse,
                500: cardSchemas.errorResponse
            }
        }
    }, cardController.getCardTransactions.bind(cardController));
    fastify.get('/cards/statistics', {
        schema: {
            description: 'Get user card statistics',
            tags: ['Cards'],
            security: [{ bearerAuth: [] }],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        data: {
                            type: 'object',
                            properties: {
                                statistics: {
                                    type: 'object',
                                    properties: {
                                        totalCards: { type: 'integer' },
                                        activeCards: { type: 'integer' },
                                        lockedCards: { type: 'integer' },
                                        cardsByType: {
                                            type: 'object',
                                            additionalProperties: { type: 'integer' }
                                        },
                                        cardsByBrand: {
                                            type: 'object',
                                            additionalProperties: { type: 'integer' }
                                        },
                                        totalSpendingLimits: {
                                            type: 'object',
                                            properties: {
                                                daily: { type: 'number' },
                                                monthly: { type: 'number' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                401: cardSchemas.errorResponse,
                500: cardSchemas.errorResponse
            }
        }
    }, cardController.getCardStatistics.bind(cardController));
    fastify.post('/cards/bulk/activate', {
        schema: {
            description: 'Activate multiple cards at once',
            tags: ['Cards'],
            security: [{ bearerAuth: [] }],
            body: {
                type: 'object',
                properties: {
                    cardIds: {
                        type: 'array',
                        items: { type: 'string', format: 'cuid' },
                        minItems: 1,
                        maxItems: 50
                    }
                },
                required: ['cardIds'],
                additionalProperties: false
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        data: {
                            type: 'object',
                            properties: {
                                succeeded: { type: 'array', items: { type: 'string' } },
                                failed: { type: 'array', items: { type: 'string' } },
                                errors: {
                                    type: 'object',
                                    additionalProperties: { type: 'string' }
                                }
                            }
                        }
                    }
                },
                207: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        data: {
                            type: 'object',
                            properties: {
                                succeeded: { type: 'array', items: { type: 'string' } },
                                failed: { type: 'array', items: { type: 'string' } },
                                errors: {
                                    type: 'object',
                                    additionalProperties: { type: 'string' }
                                }
                            }
                        }
                    }
                },
                400: cardSchemas.errorResponse,
                401: cardSchemas.errorResponse,
                500: cardSchemas.errorResponse
            }
        }
    }, cardController.bulkActivateCards.bind(cardController));
    fastify.post('/cards/:cardId/validate-transaction', {
        schema: {
            description: 'Validate if a card transaction can be processed',
            tags: ['Cards'],
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: {
                    cardId: { type: 'string', format: 'cuid' }
                },
                required: ['cardId'],
                additionalProperties: false
            },
            body: {
                type: 'object',
                properties: {
                    amount: { type: 'number', minimum: 0.01, maximum: 100000 }
                },
                required: ['amount'],
                additionalProperties: false
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        data: {
                            type: 'object',
                            properties: {
                                isValid: { type: 'boolean' }
                            }
                        }
                    }
                },
                400: cardSchemas.errorResponse,
                401: cardSchemas.errorResponse,
                404: cardSchemas.errorResponse,
                500: cardSchemas.errorResponse
            }
        }
    }, cardController.validateCardTransaction.bind(cardController));
    fastify.addHook('onSend', async (request, reply) => {
        reply.header('X-Content-Type-Options', 'nosniff');
        reply.header('X-Frame-Options', 'DENY');
        reply.header('X-XSS-Protection', '1; mode=block');
        reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        const sensitiveOperations = ['POST', 'PATCH', 'DELETE'];
        if (sensitiveOperations.includes(request.method)) {
            const user = request.user;
            if (user) {
                console.log(`AUDIT: ${request.method} ${request.url} by user ${user.id} in tenant ${user.tenantId} at ${new Date().toISOString()}`);
            }
        }
    });
}
//# sourceMappingURL=cards.routes.js.map