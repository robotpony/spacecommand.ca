/**
 * Migration: Create planets table
 * Contains planet data including position, specialization, and production
 */

const up = async (db) => {
  await db.query(`
    CREATE TABLE planets (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      empire_id UUID REFERENCES empires(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      position JSONB NOT NULL,
      size VARCHAR(20) NOT NULL,
      type VARCHAR(30) NOT NULL,
      specialization VARCHAR(30) NOT NULL DEFAULT 'balanced',
      population INTEGER NOT NULL DEFAULT 0,
      max_population INTEGER NOT NULL DEFAULT 1000,
      buildings JSONB NOT NULL DEFAULT '[]',
      production JSONB NOT NULL DEFAULT '{}',
      defenses JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX idx_planets_empire_id ON planets(empire_id);
    CREATE INDEX idx_planets_position ON planets USING GIN(position);
    CREATE INDEX idx_planets_type ON planets(type);
    CREATE INDEX idx_planets_specialization ON planets(specialization);
  `);
};

const down = async (db) => {
  await db.query('DROP TABLE IF EXISTS planets CASCADE;');
};

module.exports = { up, down };