/**
 * Migration: Create diplomacy_relations table
 * Contains diplomatic relationships between empires
 */

const up = async (db) => {
  await db.query(`
    CREATE TABLE diplomacy_relations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      empire_one_id UUID REFERENCES empires(id) ON DELETE CASCADE,
      empire_two_id UUID REFERENCES empires(id) ON DELETE CASCADE,
      relationship_type VARCHAR(20) NOT NULL DEFAULT 'neutral',
      trust_level INTEGER NOT NULL DEFAULT 50,
      agreements JSONB NOT NULL DEFAULT '[]',
      trade_routes JSONB NOT NULL DEFAULT '[]',
      message_history JSONB NOT NULL DEFAULT '[]',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(empire_one_id, empire_two_id)
    );
    
    CREATE INDEX idx_diplomacy_empire_one ON diplomacy_relations(empire_one_id);
    CREATE INDEX idx_diplomacy_empire_two ON diplomacy_relations(empire_two_id);
    CREATE INDEX idx_diplomacy_relationship ON diplomacy_relations(relationship_type);
    CREATE INDEX idx_diplomacy_trust ON diplomacy_relations(trust_level);
  `);
};

const down = async (db) => {
  await db.query('DROP TABLE IF EXISTS diplomacy_relations CASCADE;');
};

module.exports = { up, down };