/**
 * Migration: Create players table
 * Contains player authentication, profile, and settings data
 */

const up = async (db) => {
  await db.query(`
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    
    CREATE TABLE players (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      is_active BOOLEAN DEFAULT true,
      is_online BOOLEAN DEFAULT false,
      last_login TIMESTAMP,
      profile JSONB NOT NULL DEFAULT '{}',
      settings JSONB NOT NULL DEFAULT '{}',
      permissions JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX idx_players_username ON players(username);
    CREATE INDEX idx_players_email ON players(email);
    CREATE INDEX idx_players_active ON players(is_active);
    CREATE INDEX idx_players_online ON players(is_online);
  `);
};

const down = async (db) => {
  await db.query('DROP TABLE IF EXISTS players CASCADE;');
};

module.exports = { up, down };