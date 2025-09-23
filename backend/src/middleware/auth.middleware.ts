import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../modules/auth/auth.service';

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        success: false,
        message: 'Authorization header missing or invalid'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const authService = (request.server as any).authService as AuthService;

    const decoded = authService.verifyAccessToken(token);

    if (!decoded) {
      return reply.status(401).send({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    // Verify user still exists and is active
    const user = await authService.getCurrentUser(decoded.userId, decoded.tenantId);

    if (!user) {
      return reply.status(401).send({
        success: false,
        message: 'User not found or inactive'
      });
    }

    // Add user info to request object for use in controllers
    (request as any).user = {
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      email: decoded.email,
      role: decoded.role
    };

    // Continue to next handler
  } catch (error) {
    console.error('Auth middleware error:', error);
    return reply.status(401).send({
      success: false,
      message: 'Authentication failed'
    });
  }
}