/**
 * Seed: Create admin user and test data
 * Creates initial admin user and sample empire for testing
 */

const Player = require('../../models/Player');
const Empire = require('../../models/Empire');
const Planet = require('../../models/Planet');

const seed = async (db) => {
  console.log('Creating admin user...');
  
  // Create admin user
  const adminData = {
    username: 'admin',
    email: 'admin@spacecommand.ca',
    password_hash: Player.hashPassword('admin123'),
    is_active: true,
    is_online: false,
    profile: {
      displayName: 'Administrator',
      bio: 'System Administrator',
      gamesPlayed: 0,
      gamesWon: 0,
      totalScore: 0,
      achievements: ['first_login']
    },
    settings: {
      notifications: true,
      soundEnabled: true,
      theme: 'dark',
      language: 'en',
      autoSave: true,
      turnNotifications: true
    },
    permissions: {
      canCreateGames: true,
      canJoinGames: true,
      canChat: true,
      isModerator: true,
      isAdmin: true
    }
  };

  const adminResult = await db.query(`
    INSERT INTO players (username, email, password_hash, is_active, is_online, profile, settings, permissions)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `, [
    adminData.username,
    adminData.email,
    adminData.password_hash,
    adminData.is_active,
    adminData.is_online,
    JSON.stringify(adminData.profile),
    JSON.stringify(adminData.settings),
    JSON.stringify(adminData.permissions)
  ]);

  const adminUser = adminResult.rows[0];
  console.log(`✓ Admin user created: ${adminUser.username} (${adminUser.id})`);

  // Create admin empire
  const empireData = {
    player_id: adminUser.id,
    name: 'Terran Federation',
    resources: {
      minerals: 2000,
      energy: 2000,
      food: 2000,
      research: 100,
      population: 200
    },
    resource_production: {
      minerals: 100,
      energy: 100,
      food: 100,
      research: 20,
      population: 10
    },
    technology: {
      weapons: 1,
      shields: 1,
      engines: 1,
      construction: 1
    },
    diplomacy: {}
  };

  const empireResult = await db.query(`
    INSERT INTO empires (player_id, name, resources, resource_production, technology, diplomacy)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [
    empireData.player_id,
    empireData.name,
    JSON.stringify(empireData.resources),
    JSON.stringify(empireData.resource_production),
    JSON.stringify(empireData.technology),
    JSON.stringify(empireData.diplomacy)
  ]);

  const adminEmpire = empireResult.rows[0];
  console.log(`✓ Admin empire created: ${adminEmpire.name} (${adminEmpire.id})`);

  // Create home planet
  const planetData = {
    empire_id: adminEmpire.id,
    name: 'Terra Prime',
    position: { x: 0, y: 0, z: 0 },
    size: 'large',
    type: 'terrestrial',
    specialization: 'balanced',
    population: 1000,
    max_population: 2000,
    buildings: [
      {
        id: 'building_1',
        type: 'command_center',
        level: 1,
        production: { minerals: 50, energy: 50, research: 25 }
      },
      {
        id: 'building_2',
        type: 'mining_facility',
        level: 2,
        production: { minerals: 100 }
      },
      {
        id: 'building_3',
        type: 'power_plant',
        level: 2,
        production: { energy: 100 }
      }
    ],
    production: {
      minerals: 150,
      energy: 150,
      food: 100,
      research: 50,
      population: 10
    },
    defenses: {
      shields: 100,
      armor: 100,
      weapons: 100
    }
  };

  const planetResult = await db.query(`
    INSERT INTO planets (empire_id, name, position, size, type, specialization, population, max_population, buildings, production, defenses)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `, [
    planetData.empire_id,
    planetData.name,
    JSON.stringify(planetData.position),
    planetData.size,
    planetData.type,
    planetData.specialization,
    planetData.population,
    planetData.max_population,
    JSON.stringify(planetData.buildings),
    JSON.stringify(planetData.production),
    JSON.stringify(planetData.defenses)
  ]);

  const homePlanet = planetResult.rows[0];
  console.log(`✓ Home planet created: ${homePlanet.name} (${homePlanet.id})`);

  // Create initial fleet
  const fleetData = {
    empire_id: adminEmpire.id,
    name: 'Alpha Squadron',
    position: { x: 0, y: 0, z: 0 },
    destination: null,
    status: 'idle',
    ships: [
      {
        type: 'fighter',
        quantity: 10,
        damage: 0,
        experience: 0
      },
      {
        type: 'destroyer',
        quantity: 3,
        damage: 0,
        experience: 0
      },
      {
        type: 'cruiser',
        quantity: 1,
        damage: 0,
        experience: 0
      }
    ],
    commander: {
      name: 'Admiral Nova',
      rank: 'Admiral',
      experience: 100,
      skills: ['tactics', 'leadership']
    },
    experience: 50,
    morale: 100,
    supplies: 100,
    speed: 2
  };

  const fleetResult = await db.query(`
    INSERT INTO fleets (empire_id, name, position, destination, status, ships, commander, experience, morale, supplies, speed)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `, [
    fleetData.empire_id,
    fleetData.name,
    JSON.stringify(fleetData.position),
    fleetData.destination,
    fleetData.status,
    JSON.stringify(fleetData.ships),
    JSON.stringify(fleetData.commander),
    fleetData.experience,
    fleetData.morale,
    fleetData.supplies,
    fleetData.speed
  ]);

  const initialFleet = fleetResult.rows[0];
  console.log(`✓ Initial fleet created: ${initialFleet.name} (${initialFleet.id})`);

  console.log('✓ Admin user seed completed successfully');
};

module.exports = { seed };