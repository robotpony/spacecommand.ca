/**
 * Migration: Create game_sessions table
 * Contains player session tokens and authentication data
 */

const up = async (db) => {
  await db.query(`
    CREATE TABLE game_sessions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      player_id UUID REFERENCES players(id) ON DELETE CASCADE,
      session_token VARCHAR(255) UNIQUE NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX idx_sessions_player_id ON game_sessions(player_id);
    CREATE INDEX idx_sessions_token ON game_sessions(session_token);
    CREATE INDEX idx_sessions_expires ON game_sessions(expires_at);
  `);
};

const down = async (db) => {
  await db.query('DROP TABLE IF EXISTS game_sessions CASCADE;');
};

module.exports = { up, down };