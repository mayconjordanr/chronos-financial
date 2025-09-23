import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from './auth.service';
import { SendMagicLinkRequest, VerifyMagicLinkRequest, RefreshTokenRequest, UpdateProfileRequest } from './auth.dto';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    sendMagicLink(request: FastifyRequest<{
        Body: SendMagicLinkRequest;
    }>, reply: FastifyReply): Promise<never>;
    verifyMagicLink(request: FastifyRequest<{
        Body: VerifyMagicLinkRequest;
    }>, reply: FastifyReply): Promise<never>;
    refreshTokens(request: FastifyRequest<{
        Body: RefreshTokenRequest;
    }>, reply: FastifyReply): Promise<never>;
    getCurrentUser(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    updateProfile(request: FastifyRequest<{
        Body: UpdateProfileRequest;
    }>, reply: FastifyReply): Promise<never>;
    logout(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    deleteAccount(request: FastifyRequest, reply: FastifyReply): Promise<never>;
}
//# sourceMappingURL=auth.controller.d.ts.map