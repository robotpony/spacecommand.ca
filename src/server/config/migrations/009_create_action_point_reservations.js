/**
 * Migration: Create action_point_reservations table
 * Supports atomic action point checking and consumption to prevent race conditions
 */

const migration = {
  up: async (db) => {
    await db.query(`
      CREATE TABLE action_point_reservations (
        id UUID PRIMARY KEY,
        player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        turn_number INTEGER NOT NULL,
        reserved_points INTEGER NOT NULL CHECK (reserved_points > 0),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL
      )
    `);

    // Add indexes for performance
    await db.query(`
      CREATE INDEX idx_action_point_reservations_player_turn 
      ON action_point_reservations(player_id, turn_number)
    `);

    await db.query(`
      CREATE INDEX idx_action_point_reservations_expires_at 
      ON action_point_reservations(expires_at)
    `);

    // Add reservation_id column to player_actions table to track which reservation was used
    await db.query(`
      ALTER TABLE player_actions 
      ADD COLUMN reservation_id UUID REFERENCES action_point_reservations(id) ON DELETE SET NULL
    `);

    console.log('✅ Created action_point_reservations table and indexes');
  },

  down: async (db) => {
    // Remove reservation_id column from player_actions
    await db.query(`
      ALTER TABLE player_actions 
      DROP COLUMN IF EXISTS reservation_id
    `);

    // Drop the table (indexes will be dropped automatically)
    await db.query(`DROP TABLE IF EXISTS action_point_reservations`);

    console.log('✅ Dropped action_point_reservations table');
  }
};

module.exports = migration;