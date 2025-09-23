"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRedisClient = void 0;
const redis_1 = require("redis");
const createRedisClient = () => {
    const client = (0, redis_1.createClient)({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    client.on('error', (err) => {
        console.error('Redis Client Error:', err);
    });
    client.on('connect', () => {
        console.log('Connected to Redis');
    });
    return client;
};
exports.createRedisClient = createRedisClient;
//# sourceMappingURL=redis.js.map