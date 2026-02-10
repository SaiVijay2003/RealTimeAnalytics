const { z } = require('zod');

const EventSchema = z.object({
    event_id: z.string().uuid().optional(),
    user_id: z.string().min(1),
    type: z.string().min(1),
    metadata: z.record(z.any()).default({}),
    timestamp: z.string().datetime().optional().default(() => new Date().toISOString())
});

module.exports = {
    EventSchema
};
