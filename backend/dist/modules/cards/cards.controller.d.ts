import { FastifyRequest, FastifyReply } from 'fastify';
import { CardService } from './cards.service';
export interface AuthenticatedRequest extends FastifyRequest {
    user?: {
        id: string;
        tenantId: string;
        role: string;
    };
}
export declare class CardController {
    private cardService;
    constructor(cardService: CardService);
    createCard(request: AuthenticatedRequest, reply: FastifyReply): Promise<never>;
    getCards(request: AuthenticatedRequest, reply: FastifyReply): Promise<never>;
    getCard(request: AuthenticatedRequest, reply: FastifyReply): Promise<never>;
    updateCard(request: AuthenticatedRequest, reply: FastifyReply): Promise<never>;
    deleteCard(request: AuthenticatedRequest, reply: FastifyReply): Promise<never>;
    activateCard(request: AuthenticatedRequest, reply: FastifyReply): Promise<never>;
    deactivateCard(request: AuthenticatedRequest, reply: FastifyReply): Promise<never>;
    getCardTransactions(request: AuthenticatedRequest, reply: FastifyReply): Promise<never>;
    getCardStatistics(request: AuthenticatedRequest, reply: FastifyReply): Promise<never>;
    bulkActivateCards(request: AuthenticatedRequest, reply: FastifyReply): Promise<never>;
    validateCardTransaction(request: AuthenticatedRequest, reply: FastifyReply): Promise<never>;
}
//# sourceMappingURL=cards.controller.d.ts.map