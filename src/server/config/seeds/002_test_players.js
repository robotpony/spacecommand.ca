/**
 * Seed: Create test players for development
 * Creates sample players with different configurations for testing
 */

const Player = require('../../models/Player');

const seed = async (db) => {
  console.log('Creating test players...');
  
  const testPlayers = [
    {
      username: 'commander_nova',
      email: 'nova@spacecommand.ca',
      password: 'test123',
      empire_name: 'Nova Empire',
      profile: {
        displayName: 'Commander Nova',
        bio: 'Veteran space commander',
        gamesPlayed: 15,
        gamesWon: 8,
        totalScore: 15000,
        achievements: ['first_victory', 'fleet_commander', 'diplomat']
      }
    },
    {
      username: 'captain_steel',
      email: 'steel@spacecommand.ca',
      password: 'test123',
      empire_name: 'Steel Coalition',
      profile: {
        displayName: 'Captain Steel',
        bio: 'Industrial powerhouse leader',
        gamesPlayed: 22,
        gamesWon: 12,
        totalScore: 22000,
        achievements: ['industrialist', 'builder', 'defender']
      }
    },
    {
      username: 'admiral_void',
      email: 'void@spacecommand.ca',
      password: 'test123',
      empire_name: 'Void Syndicate',
      profile: {
        displayName: 'Admiral Void',
        bio: 'Master of stealth and espionage',
        gamesPlayed: 18,
        gamesWon: 14,
        totalScore: 28000,
        achievements: ['spy_master', 'shadow_fleet', 'infiltrator']
      }
    }
  ];

  for (const playerData of testPlayers) {
    // Create player
    const playerResult = await db.query(`
      INSERT INTO players (username, email, password_hash, is_active, profile, settings, permissions)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      playerData.username,
      playerData.email,
      Player.hashPassword(playerData.password),
      true,
      JSON.stringify(playerData.profile),
      JSON.stringify({
        notifications: true,
        soundEnabled: true,
        theme: 'dark',
        language: 'en',
        autoSave: true,
        turnNotifications: true
      }),
      JSON.stringify({
        canCreateGames: true,
        canJoinGames: true,
        canChat: true,
        isModerator: false,
        isAdmin: false
      })
    ]);

    const player = playerResult.rows[0];
    console.log(`✓ Test player created: ${player.username} (${player.id})`);

    // Create empire for player
    const empireResult = await db.query(`
      INSERT INTO empires (player_id, name, resources, resource_production, technology, diplomacy)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      player.id,
      playerData.empire_name,
      JSON.stringify({
        minerals: 1000,
        energy: 1000,
        food: 1000,
        research: 50,
        population: 100
      }),
      JSON.stringify({
        minerals: 50,
        energy: 50,
        food: 50,
        research: 10,
        population: 5
      }),
      JSON.stringify({
        weapons: 1,
        shields: 1,
        engines: 1,
        construction: 1
      }),
      JSON.stringify({})
    ]);

    const empire = empireResult.rows[0];
    console.log(`✓ Test empire created: ${empire.name} (${empire.id})`);

    // Create home planet
    const planetResult = await db.query(`
      INSERT INTO planets (empire_id, name, position, size, type, specialization, population, max_population, buildings, production, defenses)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      empire.id,
      `${playerData.empire_name} Prime`,
      JSON.stringify({
        x: Math.floor(Math.random() * 200) - 100,
        y: Math.floor(Math.random() * 200) - 100,
        z: Math.floor(Math.random() * 200) - 100
      }),
      'medium',
      'terrestrial',
      'balanced',
      800,
      1500,
      JSON.stringify([
        {
          id: 'building_1',
          type: 'command_center',
          level: 1,
          production: { minerals: 25, energy: 25, research: 10 }
        }
      ]),
      JSON.stringify({
        minerals: 75,
        energy: 75,
        food: 60,
        research: 25,
        population: 8
      }),
      JSON.stringify({
        shields: 50,
        armor: 50,
        weapons: 50
      })
    ]);

    const planet = planetResult.rows[0];
    console.log(`✓ Test planet created: ${planet.name} (${planet.id})`);

    // Create initial fleet
    const fleetResult = await db.query(`
      INSERT INTO fleets (empire_id, name, position, status, ships, experience, morale, supplies, speed)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      empire.id,
      `${playerData.empire_name} Fleet`,
      JSON.stringify({
        x: Math.floor(Math.random() * 200) - 100,
        y: Math.floor(Math.random() * 200) - 100,
        z: Math.floor(Math.random() * 200) - 100
      }),
      'idle',
      JSON.stringify([
        {
          type: 'fighter',
          quantity: 5,
          damage: 0,
          experience: 0
        },
        {
          type: 'destroyer',
          quantity: 2,
          damage: 0,
          experience: 0
        }
      ]),
      25,
      90,
      100,
      2
    ]);

    const fleet = fleetResult.rows[0];
    console.log(`✓ Test fleet created: ${fleet.name} (${fleet.id})`);
  }

  console.log('✓ Test players seed completed successfully');
};

module.exports = { seed };