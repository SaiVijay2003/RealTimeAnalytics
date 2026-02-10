const Redis = require('ioredis');
const { pool, initDb } = require('./db');
const fastify = require('fastify')({ logger: false });
const cors = require('fastify-cors');
const { Server } = require('socket.io');

// Register CORS for HTTP routes
fastify.register(cors, {
    origin: "*"
});

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const CONSUMER_GROUP = 'analytics-workers';
const CONSUMER_NAME = `worker-${process.pid}`;
const STREAM_NAME = 'events:stream';

// --- WebSocket & API Setup ---
const io = new Server(fastify.server, {
    cors: { origin: "*" }
});

let stats = {
    totalEvents: 0,
    activeUsers: new Set(),
    throughput: 0,
    rateLimited: 0
};

// Simple throughput tracker
let eventCountLastInterval = 0;
setInterval(() => {
    stats.throughput = eventCountLastInterval / 1; // events per second
    eventCountLastInterval = 0;

    // Broadcast stats pulse
    io.emit('stats:update', {
        current: {
            ...stats,
            activeUsers: stats.activeUsers.size
        },
        point: { time: new Date().toLocaleTimeString(), value: stats.throughput }
    });
}, 1000);

fastify.get('/api/stats', async () => {
    const recent = await pool.query('SELECT * FROM events ORDER BY created_at DESC LIMIT 10');
    return {
        current: { ...stats, activeUsers: stats.activeUsers.size },
        history: [],
        recent: recent.rows
    };
});

// --- Worker Logic ---
async function setupStream() {
    try {
        await redis.xgroup('CREATE', STREAM_NAME, CONSUMER_GROUP, '0', 'MKSTREAM');
    } catch (err) {
        if (!err.message.includes('BUSYGROUP')) throw err;
    }
}

async function processBatch() {
    const result = await redis.xreadgroup(
        'GROUP', CONSUMER_GROUP, CONSUMER_NAME,
        'COUNT', 100,
        'BLOCK', 1000,
        'STREAMS', STREAM_NAME, '>'
    );

    if (!result) return;

    const [stream, entries] = result[0];
    if (entries.length === 0) return;

    const events = entries.map(([redisId, fields]) => {
        const eventData = {};
        for (let i = 0; i < fields.length; i += 2) {
            eventData[fields[i]] = fields[i + 1];
        }
        const payload = JSON.parse(eventData.payload);

        // Update live stats
        stats.totalEvents++;
        stats.activeUsers.add(payload.user_id);
        eventCountLastInterval++;

        // Emit real-time signal
        io.emit('event:new', payload);

        return { redisId, ...payload };
    });

    await bulkInsert(events);

    const redisIds = events.map(e => e.redisId);
    await redis.xack(STREAM_NAME, CONSUMER_GROUP, ...redisIds);
}

async function bulkInsert(events) {
    if (events.length === 0) return;
    const values = [];
    const placeholders = [];

    events.forEach((event, idx) => {
        const offset = idx * 4;
        placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`);
        values.push(
            event.event_id,
            event.user_id,
            event.type,
            JSON.stringify(event.metadata || {})
        );
    });

    const query = `
        INSERT INTO events (id, user_id, event_type, payload)
        VALUES ${placeholders.join(', ')}
        ON CONFLICT (id) DO NOTHING;
    `;

    try {
        await pool.query(query, values);
    } catch (err) {
        console.error('Persistence Error:', err);
    }
}

async function start() {
    await initDb();
    await setupStream();

    // Initialize stats from DB
    const countRes = await pool.query('SELECT count(*) FROM events');
    stats.totalEvents = parseInt(countRes.rows[0].count);

    // Start API Server
    await fastify.listen({ port: 3002, host: '0.0.0.0' });
    console.log(`Worker & Dashboard API started on port 3002`);

    while (true) {
        try {
            await processBatch();
        } catch (err) {
            console.error('Worker loop error:', err);
            await new Promise(r => setTimeout(r, 1000));
        }
    }
}

start();
