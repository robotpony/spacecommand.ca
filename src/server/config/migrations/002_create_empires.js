/**
 * Migration: Create empires table
 * Contains empire data including resources, production, and technology
 */

const up = async (db) => {
  await db.query(`
    CREATE TABLE empires (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      player_id UUID REFERENCES players(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      resources JSONB NOT NULL DEFAULT '{}',
      resource_production JSONB NOT NULL DEFAULT '{}',
      technology JSONB NOT NULL DEFAULT '{}',
      diplomacy JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX idx_empires_player_id ON empires(player_id);
    CREATE INDEX idx_empires_name ON empires(name);
  `);
};

const down = async (db) => {
  await db.query('DROP TABLE IF EXISTS empires CASCADE;');
};

module.exports = { up, down };