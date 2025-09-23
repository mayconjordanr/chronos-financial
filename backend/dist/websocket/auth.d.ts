import { Socket } from 'socket.io';
import { AuthService } from '../modules/auth/auth.service';
import { AuthenticatedSocket } from './server';
export declare function authenticateSocket(socket: Socket, authService: AuthService): Promise<boolean>;
export declare class SocketRateLimiter {
    private connectionCounts;
    private readonly maxConnections;
    private readonly timeWindow;
    private readonly connectionCooldown;
    constructor(maxConnections?: number, timeWindow?: number, connectionCooldown?: number);
    canConnect(userId: string, tenantId: string): boolean;
    cleanup(): void;
}
export declare function validateTenantAccess(socket: AuthenticatedSocket, requiredTenantId: string): boolean;
export declare function validateSocketOrigin(socket: Socket): boolean;
export declare class IPRateLimiter {
    private ipCounts;
    private readonly maxRequests;
    private readonly timeWindow;
    private readonly blockDuration;
    constructor(maxRequests?: number, timeWindow?: number, blockDuration?: number);
    canConnect(ip: string): boolean;
    cleanup(): void;
}
//# sourceMappingURL=auth.d.ts.map