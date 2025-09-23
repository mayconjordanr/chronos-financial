"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupWebSocketServer = setupWebSocketServer;
const auth_1 = require("./auth");
const rooms_1 = require("./rooms");
const presence_1 = require("./presence");
const events_1 = require("./events");
function setupWebSocketServer(io, authService, realtimeService) {
    const roomManager = new rooms_1.TenantRoomManager();
    const presenceManager = new presence_1.PresenceManager(authService);
    realtimeService.setSocketIO(io);
    io.use(async (socket, next) => {
        try {
            const authenticated = await (0, auth_1.authenticateSocket)(socket, authService);
            if (authenticated) {
                next();
            }
            else {
                next(new Error('Authentication failed'));
            }
        }
        catch (error) {
            console.error('Socket authentication error:', error);
            next(new Error('Authentication failed'));
        }
    });
    const connectionCounts = new Map();
    const RATE_LIMIT = 10;
    const RATE_WINDOW = 60 * 1000;
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
    io.on('connection', async (socket) => {
        const { userId, tenantId, email, role } = socket;
        console.log(`User ${userId} connected to tenant ${tenantId}`);
        try {
            const roomName = roomManager.getTenantRoom(tenantId);
            await socket.join(roomName);
            const userRoom = roomManager.getUserRoom(tenantId, userId);
            await socket.join(userRoom);
            await presenceManager.setUserOnline(tenantId, userId, socket.id, {
                email,
                role,
                connectedAt: new Date()
            });
            socket.to(roomName).emit(events_1.RealtimeEvents.USER_JOINED, {
                userId,
                email,
                role,
                timestamp: new Date()
            });
            const onlineUsers = await presenceManager.getOnlineUsers(tenantId);
            socket.emit(events_1.RealtimeEvents.ONLINE_USERS, onlineUsers);
            socket.on('ping', () => {
                socket.emit('pong', { timestamp: Date.now() });
            });
            socket.on('disconnect', async (reason) => {
                console.log(`User ${userId} disconnected from tenant ${tenantId}. Reason: ${reason}`);
                try {
                    const hasOtherConnections = await presenceManager.removeUserConnection(tenantId, userId, socket.id);
                    if (!hasOtherConnections) {
                        socket.to(roomName).emit(events_1.RealtimeEvents.USER_LEFT, {
                            userId,
                            email,
                            timestamp: new Date()
                        });
                    }
                }
                catch (error) {
                    console.error('Error handling user disconnect:', error);
                }
            });
            socket.on('heartbeat', async () => {
                try {
                    await presenceManager.updateLastSeen(tenantId, userId, socket.id);
                    socket.emit('heartbeat_ack', { timestamp: Date.now() });
                }
                catch (error) {
                    console.error('Error updating heartbeat:', error);
                }
            });
            socket.on('subscribe', (data) => {
                const { entityType, entityId } = data;
                if (entityId) {
                    const entityRoom = roomManager.getEntityRoom(tenantId, entityType, entityId);
                    socket.join(entityRoom);
                }
                else {
                    const typeRoom = roomManager.getEntityTypeRoom(tenantId, entityType);
                    socket.join(typeRoom);
                }
                socket.emit('subscription_confirmed', {
                    entityType,
                    entityId,
                    timestamp: Date.now()
                });
            });
            socket.on('unsubscribe', (data) => {
                const { entityType, entityId } = data;
                if (entityId) {
                    const entityRoom = roomManager.getEntityRoom(tenantId, entityType, entityId);
                    socket.leave(entityRoom);
                }
                else {
                    const typeRoom = roomManager.getEntityTypeRoom(tenantId, entityType);
                    socket.leave(typeRoom);
                }
                socket.emit('unsubscription_confirmed', {
                    entityType,
                    entityId,
                    timestamp: Date.now()
                });
            });
            socket.on('error', (error) => {
                console.error(`Socket error for user ${userId}:`, error);
            });
        }
        catch (error) {
            console.error('Error during socket connection setup:', error);
            socket.disconnect(true);
        }
    });
    setInterval(async () => {
        try {
            await presenceManager.cleanupStaleConnections(5 * 60 * 1000);
        }
        catch (error) {
            console.error('Error during presence cleanup:', error);
        }
    }, 60 * 1000);
    setInterval(async () => {
        try {
            const tenants = await presenceManager.getAllActiveTenants();
            for (const tenantId of tenants) {
                const onlineUsers = await presenceManager.getOnlineUsers(tenantId);
                const roomName = roomManager.getTenantRoom(tenantId);
                io.to(roomName).emit(events_1.RealtimeEvents.ONLINE_USERS_UPDATED, onlineUsers);
            }
        }
        catch (error) {
            console.error('Error during heartbeat broadcast:', error);
        }
    }, 30 * 1000);
    console.log('WebSocket server setup completed');
}
//# sourceMappingURL=server.js.map