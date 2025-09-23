import { Server as SocketIOServer, Socket } from 'socket.io';
import { AuthService } from '../modules/auth/auth.service';
import { RealtimeService } from '../services/realtime';
import { authenticateSocket } from './auth';
import { TenantRoomManager } from './rooms';
import { PresenceManager } from './presence';
import { RealtimeEvents } from './events';

export interface AuthenticatedSocket extends Socket {
  userId: string;
  tenantId: string;
  email: string;
  role: string;
}

export function setupWebSocketServer(
  io: SocketIOServer,
  authService: AuthService,
  realtimeService: RealtimeService
) {
  const roomManager = new TenantRoomManager();
  const presenceManager = new PresenceManager(authService);

  // Set up real-time service with Socket.IO instance
  realtimeService.setSocketIO(io);

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const authenticated = await authenticateSocket(socket, authService);
      if (authenticated) {
        next();
      } else {
        next(new Error('Authentication failed'));
      }
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  // Rate limiting middleware
  const connectionCounts = new Map<string, { count: number; resetTime: number }>();
  const RATE_LIMIT = 10; // connections per minute
  const RATE_WINDOW = 60 * 1000; // 1 minute

  io.use((socket, next) => {
    const clientIP = socket.handshake.address;
    const now = Date.now();

    const clientData = connectionCounts.get(clientIP) || { count: 0, resetTime: now + RATE_WINDOW };

    if (now > clientData.resetTime) {
      clientData.count = 0;
      clientData.resetTime = now + RATE_WINDOW;
    }

    if (clientData.count >= RATE_LIMIT) {
      return next(new Error('Rate limit exceeded'));
    }

    clientData.count++;
    connectionCounts.set(clientIP, clientData);
    next();
  });

  io.on('connection', async (socket: AuthenticatedSocket) => {
    const { userId, tenantId, email, role } = socket;

    console.log(`User ${userId} connected to tenant ${tenantId}`);

    try {
      // Join tenant-specific room
      const roomName = roomManager.getTenantRoom(tenantId);
      await socket.join(roomName);

      // Join user-specific room for direct messages
      const userRoom = roomManager.getUserRoom(tenantId, userId);
      await socket.join(userRoom);

      // Register user presence
      await presenceManager.setUserOnline(tenantId, userId, socket.id, {
        email,
        role,
        connectedAt: new Date()
      });

      // Broadcast user joined event to tenant members
      socket.to(roomName).emit(RealtimeEvents.USER_JOINED, {
        userId,
        email,
        role,
        timestamp: new Date()
      });

      // Send current online users to the connected user
      const onlineUsers = await presenceManager.getOnlineUsers(tenantId);
      socket.emit(RealtimeEvents.ONLINE_USERS, onlineUsers);

      // Handle ping/pong for connection health
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: Date.now() });
      });

      // Handle client disconnect
      socket.on('disconnect', async (reason) => {
        console.log(`User ${userId} disconnected from tenant ${tenantId}. Reason: ${reason}`);

        try {
          // Check if user has other active connections
          const hasOtherConnections = await presenceManager.removeUserConnection(tenantId, userId, socket.id);

          if (!hasOtherConnections) {
            // User is completely offline, broadcast to tenant members
            socket.to(roomName).emit(RealtimeEvents.USER_LEFT, {
              userId,
              email,
              timestamp: new Date()
            });
          }
        } catch (error) {
          console.error('Error handling user disconnect:', error);
        }
      });

      // Handle manual heartbeat
      socket.on('heartbeat', async () => {
        try {
          await presenceManager.updateLastSeen(tenantId, userId, socket.id);
          socket.emit('heartbeat_ack', { timestamp: Date.now() });
        } catch (error) {
          console.error('Error updating heartbeat:', error);
        }
      });

      // Handle subscription to specific entity types
      socket.on('subscribe', (data: { entityType: string; entityId?: string }) => {
        const { entityType, entityId } = data;

        if (entityId) {
          // Subscribe to specific entity updates
          const entityRoom = roomManager.getEntityRoom(tenantId, entityType, entityId);
          socket.join(entityRoom);
        } else {
          // Subscribe to all entities of this type
          const typeRoom = roomManager.getEntityTypeRoom(tenantId, entityType);
          socket.join(typeRoom);
        }

        socket.emit('subscription_confirmed', {
          entityType,
          entityId,
          timestamp: Date.now()
        });
      });

      // Handle unsubscription
      socket.on('unsubscribe', (data: { entityType: string; entityId?: string }) => {
        const { entityType, entityId } = data;

        if (entityId) {
          const entityRoom = roomManager.getEntityRoom(tenantId, entityType, entityId);
          socket.leave(entityRoom);
        } else {
          const typeRoom = roomManager.getEntityTypeRoom(tenantId, entityType);
          socket.leave(typeRoom);
        }

        socket.emit('unsubscription_confirmed', {
          entityType,
          entityId,
          timestamp: Date.now()
        });
      });

      // Handle errors
      socket.on('error', (error) => {
        console.error(`Socket error for user ${userId}:`, error);
      });

    } catch (error) {
      console.error('Error during socket connection setup:', error);
      socket.disconnect(true);
    }
  });

  // Set up periodic cleanup of stale connections
  setInterval(async () => {
    try {
      await presenceManager.cleanupStaleConnections(5 * 60 * 1000); // 5 minutes
    } catch (error) {
      console.error('Error during presence cleanup:', error);
    }
  }, 60 * 1000); // Run every minute

  // Set up periodic heartbeat check
  setInterval(async () => {
    try {
      const tenants = await presenceManager.getAllActiveTenants();

      for (const tenantId of tenants) {
        const onlineUsers = await presenceManager.getOnlineUsers(tenantId);
        const roomName = roomManager.getTenantRoom(tenantId);

        // Broadcast updated online users list
        io.to(roomName).emit(RealtimeEvents.ONLINE_USERS_UPDATED, onlineUsers);
      }
    } catch (error) {
      console.error('Error during heartbeat broadcast:', error);
    }
  }, 30 * 1000); // Every 30 seconds

  console.log('WebSocket server setup completed');
}