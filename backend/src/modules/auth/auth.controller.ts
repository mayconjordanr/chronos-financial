import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from './auth.service';
import {
  sendMagicLinkSchema,
  verifyMagicLinkSchema,
  refreshTokenSchema,
  updateProfileSchema,
  SendMagicLinkRequest,
  VerifyMagicLinkRequest,
  RefreshTokenRequest,
  UpdateProfileRequest
} from './auth.dto';

export class AuthController {
  constructor(private authService: AuthService) {}

  async sendMagicLink(
    request: FastifyRequest<{ Body: SendMagicLinkRequest }>,
    reply: FastifyReply
  ) {
    try {
      const validation = sendMagicLinkSchema.safeParse(request.body);

      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          message: 'Validation error',
          errors: validation.error.errors
        });
      }

      const { email, tenantId } = validation.data;

      const result = await this.authService.sendMagicLink(email, tenantId);

      if (result.success) {
        return reply.status(200).send(result);
      } else {
        return reply.status(400).send(result);
      }
    } catch (error) {
      console.error('Error in sendMagicLink:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async verifyMagicLink(
    request: FastifyRequest<{ Body: VerifyMagicLinkRequest }>,
    reply: FastifyReply
  ) {
    try {
      const validation = verifyMagicLinkSchema.safeParse(request.body);

      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          message: 'Validation error',
          errors: validation.error.errors
        });
      }

      const { token, tenantId } = validation.data;

      const result = await this.authService.verifyMagicLink(token, tenantId);

      if (result.success) {
        return reply.status(200).send({
          success: true,
          message: result.message,
          user: {
            id: result.user?.id,
            email: result.user?.email,
            firstName: result.user?.firstName,
            lastName: result.user?.lastName,
            tenantId: result.user?.tenantId
          },
          tokens: result.tokens
        });
      } else {
        return reply.status(401).send(result);
      }
    } catch (error) {
      console.error('Error in verifyMagicLink:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async refreshTokens(
    request: FastifyRequest<{ Body: RefreshTokenRequest }>,
    reply: FastifyReply
  ) {
    try {
      const validation = refreshTokenSchema.safeParse(request.body);

      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          message: 'Validation error',
          errors: validation.error.errors
        });
      }

      const { refreshToken, tenantId } = validation.data;

      const result = await this.authService.refreshTokens(refreshToken, tenantId);

      if (result.success) {
        return reply.status(200).send(result);
      } else {
        return reply.status(401).send(result);
      }
    } catch (error) {
      console.error('Error in refreshTokens:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async getCurrentUser(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Extract user info from JWT token (set by auth middleware)
      const userInfo = (request as any).user;

      if (!userInfo) {
        return reply.status(401).send({
          success: false,
          message: 'Unauthorized'
        });
      }

      const user = await this.authService.getCurrentUser(userInfo.userId, userInfo.tenantId);

      if (!user) {
        return reply.status(404).send({
          success: false,
          message: 'User not found'
        });
      }

      return reply.status(200).send({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          tenantId: user.tenantId,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      });
    } catch (error) {
      console.error('Error in getCurrentUser:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async updateProfile(
    request: FastifyRequest<{ Body: UpdateProfileRequest }>,
    reply: FastifyReply
  ) {
    try {
      const validation = updateProfileSchema.safeParse(request.body);

      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          message: 'Validation error',
          errors: validation.error.errors
        });
      }

      const userInfo = (request as any).user;

      if (!userInfo) {
        return reply.status(401).send({
          success: false,
          message: 'Unauthorized'
        });
      }

      const updatedUser = await this.authService.updateUserProfile(
        userInfo.userId,
        userInfo.tenantId,
        validation.data
      );

      if (!updatedUser) {
        return reply.status(404).send({
          success: false,
          message: 'User not found'
        });
      }

      return reply.status(200).send({
        success: true,
        message: 'Profile updated successfully',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          tenantId: updatedUser.tenantId
        }
      });
    } catch (error) {
      console.error('Error in updateProfile:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async logout(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userInfo = (request as any).user;

      if (!userInfo) {
        return reply.status(401).send({
          success: false,
          message: 'Unauthorized'
        });
      }

      await this.authService.logout(userInfo.userId, userInfo.tenantId);

      return reply.status(200).send({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      console.error('Error in logout:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async deleteAccount(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userInfo = (request as any).user;

      if (!userInfo) {
        return reply.status(401).send({
          success: false,
          message: 'Unauthorized'
        });
      }

      const deleted = await this.authService.deleteAccount(userInfo.userId, userInfo.tenantId);

      if (deleted) {
        return reply.status(200).send({
          success: true,
          message: 'Account deleted successfully'
        });
      } else {
        return reply.status(400).send({
          success: false,
          message: 'Failed to delete account'
        });
      }
    } catch (error) {
      console.error('Error in deleteAccount:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}