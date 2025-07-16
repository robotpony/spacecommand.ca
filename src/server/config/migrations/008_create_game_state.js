/**
 * Migration: Create game_state table
 * Contains global game state including turn management
 */

const up = async (db) => {
  await db.query(`
    CREATE TABLE game_state (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      turn_number INTEGER NOT NULL DEFAULT 1,
      turn_phase VARCHAR(20) NOT NULL DEFAULT 'production',
      next_turn_at TIMESTAMP NOT NULL,
      active_players INTEGER NOT NULL DEFAULT 0,
      game_settings JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX idx_game_state_turn ON game_state(turn_number);
    CREATE INDEX idx_game_state_phase ON game_state(turn_phase);
    CREATE INDEX idx_game_state_next_turn ON game_state(next_turn_at);
    
    -- Insert initial game state
    INSERT INTO game_state (turn_number, turn_phase, next_turn_at, active_players, game_settings)
    VALUES (1, 'production', CURRENT_TIMESTAMP + INTERVAL '24 hours', 0, '{}');
  `);
};

const down = async (db) => {
  await db.query('DROP TABLE IF EXISTS game_state CASCADE;');
};

module.exports = { up, down };