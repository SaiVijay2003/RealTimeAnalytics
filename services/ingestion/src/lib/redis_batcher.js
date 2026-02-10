/**
 * RedisStreamBatcher
 * Buffers XADD commands and flushes them in a single pipeline
 * to reduce network round trips and improve throughput.
 */
class RedisStreamBatcher {
    constructor(redis, streamName, options = {}) {
        this.redis = redis;
        this.streamName = streamName;
        this.batchSize = options.batchSize || 100;
        this.flushInterval = options.flushInterval || 50; // ms
        this.buffer = [];
        this.timer = null;
    }

    async add(id, payload) {
        this.buffer.push({ id, payload });

        if (this.buffer.length >= this.batchSize) {
            this.flush();
        } else if (!this.timer) {
            this.timer = setTimeout(() => this.flush(), this.flushInterval);
        }
    }

    async flush() {
        if (this.buffer.length === 0) return;

        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        const currentBatch = this.buffer;
        this.buffer = [];

        const pipeline = this.redis.pipeline();
        currentBatch.forEach(event => {
            pipeline.xadd(
                this.streamName,
                'MAXLEN', '~', 1000000,
                '*',
                'id', event.id,
                'payload', event.payload
            );
        });

        try {
            await pipeline.exec();
        } catch (err) {
            console.error('Failed to flush Redis pipeline:', err);
            // In a production app, we would handle retries or dead-letter queues here.
        }
    }
}

module.exports = RedisStreamBatcher;
