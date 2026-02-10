const fastify = require('fastify')({ logger: true });
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');
const { z } = require('zod');
const fs = require('fs');
const path = require('path');

const RedisBatcher = require('./lib/redis_batcher');

// Redis Client
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Initialize Batcher
const batcher = new RedisBatcher(redis, 'events:stream', {
    batchSize: 500,
    flushInterval: 50
});

// Load Lua Script
const rateLimitScript = fs.readFileSync(
    path.join(__dirname, 'scripts', 'rate_limit.lua'),
    'utf8'
);

// Define Rate Limit Constants
const WINDOW_MS = 60000; // 1 minute
const LIMIT_PER_WINDOW = 1000; // 1000 events/user/min

// Event Schema
const EventSchema = z.object({
    user_id: z.string(),
    type: z.string(),
    metadata: z.record(z.any()).optional(),
    timestamp: z.string().datetime().optional().default(() => new Date().toISOString())
});

// Ingestion Route
fastify.post('/ingest', async (request, reply) => {
    try {
        // 1. Validate Payload
        const data = EventSchema.parse(request.body);
        const eventId = uuidv4();
        const now = Date.now();

        // 2. Atomic Rate Limiting (Distributed)
        const isAllowed = await redis.eval(
            rateLimitScript,
            1, // numKeys
            `rate_limit:${data.user_id}`,
            now,
            WINDOW_MS,
            LIMIT_PER_WINDOW,
            eventId
        );

        if (!isAllowed) {
            return reply.code(429).send({ error: 'Rate limit exceeded' });
        }

        // 3. Buffer to Redis Stream via Pipelining
        batcher.add(eventId, JSON.stringify({ ...data, event_id: eventId }));

        return reply.code(202).send({ message: 'Event accepted', event_id: eventId });
    } catch (err) {
        if (err instanceof z.ZodError) {
            return reply.code(400).send({ error: 'Invalid payload', details: err.errors });
        }
        fastify.log.error(err);
        return reply.code(500).send({ error: 'Internal server error' });
    }
});

// Health Check
fastify.get('/health', async () => ({ status: 'ok' }));

// Start Server
const start = async () => {
    try {
        await fastify.listen({ port: 3001, host: '0.0.0.0' });
        console.log(`Ingestion service listening on port 3001`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
