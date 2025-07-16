/**
 * Migration: Create fleets table
 * Contains fleet data including position, ships, and status
 */

const up = async (db) => {
  await db.query(`
    CREATE TABLE fleets (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      empire_id UUID REFERENCES empires(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      position JSONB NOT NULL,
      destination JSONB,
      status VARCHAR(20) NOT NULL DEFAULT 'idle',
      ships JSONB NOT NULL DEFAULT '[]',
      commander JSONB,
      experience INTEGER NOT NULL DEFAULT 0,
      morale INTEGER NOT NULL DEFAULT 100,
      supplies INTEGER NOT NULL DEFAULT 100,
      speed INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX idx_fleets_empire_id ON fleets(empire_id);
    CREATE INDEX idx_fleets_position ON fleets USING GIN(position);
    CREATE INDEX idx_fleets_status ON fleets(status);
    CREATE INDEX idx_fleets_destination ON fleets USING GIN(destination);
  `);
};

const down = async (db) => {
  await db.query('DROP TABLE IF EXISTS fleets CASCADE;');
};

module.exports = { up, down };