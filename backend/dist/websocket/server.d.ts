import { Server as SocketIOServer, Socket } from 'socket.io';
import { AuthService } from '../modules/auth/auth.service';
import { RealtimeService } from '../services/realtime';
export interface AuthenticatedSocket extends Socket {
    userId: string;
    tenantId: string;
    email: string;
    role: string;
}
export declare function setupWebSocketServer(io: SocketIOServer, authService: AuthService, realtimeService: RealtimeService): void;
//# sourceMappingURL=server.d.ts.map