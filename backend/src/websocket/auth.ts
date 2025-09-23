import { Socket } from 'socket.io';
import { AuthService } from '../modules/auth/auth.service';
import { AuthenticatedSocket } from './server';

export async function authenticateSocket(
  socket: Socket,
  authService: AuthService
): Promise<boolean> {
  try {
    // Extract token from handshake auth or query parameters
    const token = extractToken(socket);

    if (!token) {
      console.error('No authentication token provided');
      return false;
    }

    // Verify JWT token
    const decoded = authService.verifyAccessToken(token);

    if (!decoded) {
      console.error('Invalid or expired token');
      return false;
    }

    // Verify user still exists and is active
    const user = await authService.getCurrentUser(decoded.userId, decoded.tenantId);

    if (!user) {
      console.error('User not found or inactive');
      return false;
    }

    // Add user information to socket instance
    const authenticatedSocket = socket as AuthenticatedSocket;
    authenticatedSocket.userId = user.id;
    authenticatedSocket.tenantId = user.tenantId;
    authenticatedSocket.email = user.email;
    authenticatedSocket.role = user.role || 'user';

    console.log(`Socket authenticated for user ${user.id} in tenant ${user.tenantId}`);
    return true;

  } catch (error) {
    console.error('Socket authentication error:', error);
    return false;
  }
}

function extractToken(socket: Socket): string | null {
  // Try to get token from handshake auth
  const authHeader = socket.handshake.auth?.token;
  if (authHeader) {
    return authHeader;
  }

  // Try to get token from authorization header
  const authorizationHeader = socket.handshake.headers?.authorization;
  if (authorizationHeader && authorizationHeader.startsWith('Bearer ')) {
    return authorizationHeader.substring(7);
  }

  // Try to get token from query parameters
  const queryToken = socket.handshake.query?.token;
  if (queryToken && typeof queryToken === 'string') {
    return queryToken;
  }

  return null;
}

// Rate limiting for WebSocket connections per user
export class SocketRateLimiter {
  private connectionCounts = new Map<string, {
    count: number;
    resetTime: number;
    lastConnection: number;
  }>();

  private readonly maxConnections: number;
  private readonly timeWindow: number;
  private readonly connectionCooldown: number;

  constructor(
    maxConnections: number = 5,
    timeWindow: number = 60 * 1000, // 1 minute
    connectionCooldown: number = 1000 // 1 second between connections
  ) {
    this.maxConnections = maxConnections;
    this.timeWindow = timeWindow;
    this.connectionCooldown = connectionCooldown;
  }

  canConnect(userId: string, tenantId: string): boolean {
    const key = `${tenantId}:${userId}`;
    const now = Date.now();

    const userData = this.connectionCounts.get(key) || {
      count: 0,
      resetTime: now + this.timeWindow,
      lastConnection: 0
    };

    // Reset count if time window has passed
    if (now > userData.resetTime) {
      userData.count = 0;
      userData.resetTime = now + this.timeWindow;
    }

    // Check cooldown period
    if (now - userData.lastConnection < this.connectionCooldown) {
      return false;
    }

    // Check max connections
    if (userData.count >= this.maxConnections) {
      return false;
    }

    userData.count++;
    userData.lastConnection = now;
    this.connectionCounts.set(key, userData);

    return true;
  }

  cleanup(): void {
    const now = Date.now();

    for (const [key, userData] of this.connectionCounts.entries()) {
      if (now > userData.resetTime) {
        this.connectionCounts.delete(key);
      }
    }
  }
}

// Middleware for tenant validation
export function validateTenantAccess(
  socket: AuthenticatedSocket,
  requiredTenantId: string
): boolean {
  if (socket.tenantId !== requiredTenantId) {
    console.error(
      `Tenant access violation: User ${socket.userId} in tenant ${socket.tenantId} ` +
      `attempted to access tenant ${requiredTenantId}`
    );
    return false;
  }
  return true;
}

// Security headers and validation
export function validateSocketOrigin(socket: Socket): boolean {
  const origin = socket.handshake.headers.origin;
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'https://chronos-financial.com'
  ];

  if (!origin || !allowedOrigins.includes(origin)) {
    console.error(`Invalid origin: ${origin}`);
    return false;
  }

  return true;
}

// IP-based rate limiting
export class IPRateLimiter {
  private ipCounts = new Map<string, {
    count: number;
    resetTime: number;
    blocked: boolean;
    blockExpiry?: number;
  }>();

  private readonly maxRequests: number;
  private readonly timeWindow: number;
  private readonly blockDuration: number;

  constructor(
    maxRequests: number = 100,
    timeWindow: number = 60 * 1000, // 1 minute
    blockDuration: number = 15 * 60 * 1000 // 15 minutes
  ) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
    this.blockDuration = blockDuration;
  }

  canConnect(ip: string): boolean {
    const now = Date.now();
    const ipData = this.ipCounts.get(ip) || {
      count: 0,
      resetTime: now + this.timeWindow,
      blocked: false
    };

    // Check if IP is currently blocked
    if (ipData.blocked && ipData.blockExpiry && now < ipData.blockExpiry) {
      return false;
    }

    // Reset block status if block has expired
    if (ipData.blocked && ipData.blockExpiry && now >= ipData.blockExpiry) {
      ipData.blocked = false;
      ipData.blockExpiry = undefined;
      ipData.count = 0;
      ipData.resetTime = now + this.timeWindow;
    }

    // Reset count if time window has passed
    if (now > ipData.resetTime) {
      ipData.count = 0;
      ipData.resetTime = now + this.timeWindow;
    }

    ipData.count++;

    // Block IP if rate limit exceeded
    if (ipData.count > this.maxRequests) {
      ipData.blocked = true;
      ipData.blockExpiry = now + this.blockDuration;
      this.ipCounts.set(ip, ipData);
      return false;
    }

    this.ipCounts.set(ip, ipData);
    return true;
  }

  cleanup(): void {
    const now = Date.now();

    for (const [ip, data] of this.ipCounts.entries()) {
      if (data.blocked && data.blockExpiry && now >= data.blockExpiry) {
        this.ipCounts.delete(ip);
      } else if (!data.blocked && now > data.resetTime) {
        this.ipCounts.delete(ip);
      }
    }
  }
}