"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
async function authMiddleware(request, reply) {
    try {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return reply.status(401).send({
                success: false,
                message: 'Authorization header missing or invalid'
            });
        }
        const token = authHeader.substring(7);
        const authService = request.server.authService;
        const decoded = authService.verifyAccessToken(token);
        if (!decoded) {
            return reply.status(401).send({
                success: false,
                message: 'Invalid or expired token'
            });
        }
        const user = await authService.getCurrentUser(decoded.userId, decoded.tenantId);
        if (!user) {
            return reply.status(401).send({
                success: false,
                message: 'User not found or inactive'
            });
        }
        request.user = {
            userId: decoded.userId,
            tenantId: decoded.tenantId,
            email: decoded.email,
            role: decoded.role
        };
    }
    catch (error) {
        console.error('Auth middleware error:', error);
        return reply.status(401).send({
            success: false,
            message: 'Authentication failed'
        });
    }
}
//# sourceMappingURL=auth.middleware.js.map