const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://admin:password@localhost:5433/analytics'
});

const initDb = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS events (
      id UUID PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      event_type VARCHAR(100) NOT NULL,
      payload JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
    CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
  `;
  await pool.query(query);
  console.log('Database initialized');
};

module.exports = {
  pool,
  initDb
};
