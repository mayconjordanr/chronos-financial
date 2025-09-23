"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPRateLimiter = exports.SocketRateLimiter = void 0;
exports.authenticateSocket = authenticateSocket;
exports.validateTenantAccess = validateTenantAccess;
exports.validateSocketOrigin = validateSocketOrigin;
async function authenticateSocket(socket, authService) {
    try {
        const token = extractToken(socket);
        if (!token) {
            console.error('No authentication token provided');
            return false;
        }
        const decoded = authService.verifyAccessToken(token);
        if (!decoded) {
            console.error('Invalid or expired token');
            return false;
        }
        const user = await authService.getCurrentUser(decoded.userId, decoded.tenantId);
        if (!user) {
            console.error('User not found or inactive');
            return false;
        }
        const authenticatedSocket = socket;
        authenticatedSocket.userId = user.id;
        authenticatedSocket.tenantId = user.tenantId;
        authenticatedSocket.email = user.email;
        authenticatedSocket.role = user.role || 'user';
        console.log(`Socket authenticated for user ${user.id} in tenant ${user.tenantId}`);
        return true;
    }
    catch (error) {
        console.error('Socket authentication error:', error);
        return false;
    }
}
function extractToken(socket) {
    const authHeader = socket.handshake.auth?.token;
    if (authHeader) {
        return authHeader;
    }
    const authorizationHeader = socket.handshake.headers?.authorization;
    if (authorizationHeader && authorizationHeader.startsWith('Bearer ')) {
        return authorizationHeader.substring(7);
    }
    const queryToken = socket.handshake.query?.token;
    if (queryToken && typeof queryToken === 'string') {
        return queryToken;
    }
    return null;
}
class SocketRateLimiter {
    connectionCounts = new Map();
    maxConnections;
    timeWindow;
    connectionCooldown;
    constructor(maxConnections = 5, timeWindow = 60 * 1000, connectionCooldown = 1000) {
        this.maxConnections = maxConnections;
        this.timeWindow = timeWindow;
        this.connectionCooldown = connectionCooldown;
    }
    canConnect(userId, tenantId) {
        const key = `${tenantId}:${userId}`;
        const now = Date.now();
        const userData = this.connectionCounts.get(key) || {
            count: 0,
            resetTime: now + this.timeWindow,
            lastConnection: 0
        };
        if (now > userData.resetTime) {
            userData.count = 0;
            userData.resetTime = now + this.timeWindow;
        }
        if (now - userData.lastConnection < this.connectionCooldown) {
            return false;
        }
        if (userData.count >= this.maxConnections) {
            return false;
        }
        userData.count++;
        userData.lastConnection = now;
        this.connectionCounts.set(key, userData);
        return true;
    }
    cleanup() {
        const now = Date.now();
        for (const [key, userData] of this.connectionCounts.entries()) {
            if (now > userData.resetTime) {
                this.connectionCounts.delete(key);
            }
        }
    }
}
exports.SocketRateLimiter = SocketRateLimiter;
function validateTenantAccess(socket, requiredTenantId) {
    if (socket.tenantId !== requiredTenantId) {
        console.error(`Tenant access violation: User ${socket.userId} in tenant ${socket.tenantId} ` +
            `attempted to access tenant ${requiredTenantId}`);
        return false;
    }
    return true;
}
function validateSocketOrigin(socket) {
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
class IPRateLimiter {
    ipCounts = new Map();
    maxRequests;
    timeWindow;
    blockDuration;
    constructor(maxRequests = 100, timeWindow = 60 * 1000, blockDuration = 15 * 60 * 1000) {
        this.maxRequests = maxRequests;
        this.timeWindow = timeWindow;
        this.blockDuration = blockDuration;
    }
    canConnect(ip) {
        const now = Date.now();
        const ipData = this.ipCounts.get(ip) || {
            count: 0,
            resetTime: now + this.timeWindow,
            blocked: false
        };
        if (ipData.blocked && ipData.blockExpiry && now < ipData.blockExpiry) {
            return false;
        }
        if (ipData.blocked && ipData.blockExpiry && now >= ipData.blockExpiry) {
            ipData.blocked = false;
            ipData.blockExpiry = undefined;
            ipData.count = 0;
            ipData.resetTime = now + this.timeWindow;
        }
        if (now > ipData.resetTime) {
            ipData.count = 0;
            ipData.resetTime = now + this.timeWindow;
        }
        ipData.count++;
        if (ipData.count > this.maxRequests) {
            ipData.blocked = true;
            ipData.blockExpiry = now + this.blockDuration;
            this.ipCounts.set(ip, ipData);
            return false;
        }
        this.ipCounts.set(ip, ipData);
        return true;
    }
    cleanup() {
        const now = Date.now();
        for (const [ip, data] of this.ipCounts.entries()) {
            if (data.blocked && data.blockExpiry && now >= data.blockExpiry) {
                this.ipCounts.delete(ip);
            }
            else if (!data.blocked && now > data.resetTime) {
                this.ipCounts.delete(ip);
            }
        }
    }
}
exports.IPRateLimiter = IPRateLimiter;
//# sourceMappingURL=auth.js.map