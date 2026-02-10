-- KEYS[1]: rate_limit:user_id
-- ARGV[1]: current_timestamp (ms)
-- ARGV[2]: window_size (ms, e.g., 60000 for 1 min)
-- ARGV[3]: limit (e.g., 100)
-- ARGV[4]: unique_id (to avoid duplicate members in ZSET if timestamps match)

local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local clear_before = now - window

-- Remove old events
redis.call('ZREMRANGEBYSCORE', key, 0, clear_before)

-- Count remaining events
local current_count = redis.call('ZCARD', key)

if current_count < limit then
    -- Add the current event
    redis.call('ZADD', key, now, ARGV[4])
    -- Set TTL to slightly longer than window to clean up idle keys
    redis.call('PEXPIRE', key, window + 1000)
    return 1 -- Allowed
else
    return 0 -- Blocked
end
