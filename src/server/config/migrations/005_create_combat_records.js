/**
 * Migration: Create combat_records table
 * Contains combat history and battle results
 */

const up = async (db) => {
  await db.query(`
    CREATE TABLE combat_records (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      attacker_id UUID REFERENCES players(id),
      defender_id UUID REFERENCES players(id),
      attacker_fleet_id UUID REFERENCES fleets(id),
      defender_fleet_id UUID REFERENCES fleets(id),
      location JSONB NOT NULL,
      type VARCHAR(20) NOT NULL DEFAULT 'fleet',
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      rounds JSONB NOT NULL DEFAULT '[]',
      result JSONB,
      start_time TIMESTAMP NOT NULL,
      end_time TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX idx_combat_attacker ON combat_records(attacker_id);
    CREATE INDEX idx_combat_defender ON combat_records(defender_id);
    CREATE INDEX idx_combat_attacker_fleet ON combat_records(attacker_fleet_id);
    CREATE INDEX idx_combat_defender_fleet ON combat_records(defender_fleet_id);
    CREATE INDEX idx_combat_status ON combat_records(status);
    CREATE INDEX idx_combat_type ON combat_records(type);
    CREATE INDEX idx_combat_location ON combat_records USING GIN(location);
  `);
};

const down = async (db) => {
  await db.query('DROP TABLE IF EXISTS combat_records CASCADE;');
};

module.exports = { up, down };