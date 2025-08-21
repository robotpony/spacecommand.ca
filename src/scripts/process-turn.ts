#!/usr/bin/env tsx

/**
 * Processes a turn for a specified universe or all active universes.
 * Can be run manually for testing or by cron jobs for production scheduling.
 */

import { createConnection } from '../infrastructure/database/connection';
import { TurnScheduler } from '../core/scheduling/TurnScheduler';
import { TurnProcessor } from '../core/simulation/TurnProcessor';
import { ActionValidator } from '../core/simulation/ActionValidator';
import { ActionExecutor } from '../core/simulation/ActionExecutor';
import { Turn } from '../core/entities/Turn';
import { ActionQueue } from '../core/simulation/ActionQueue';

interface ProcessOptions {
  universeId?: string;
  turnId?: string;
  force?: boolean;
  dryRun?: boolean;
  verbose?: boolean;
}

interface GameStateProvider {
  getPlayer(playerId: string): Promise<any>;
  getFleet(fleetId: string): Promise<any>;
  getSystem(systemId: string): Promise<any>;
  getEmpire(empireId: string): Promise<any>;
  getPlayerFleets(playerId: string): Promise<any[]>;
  calculateDistance(from: any, to: any): number;
  isSystemAccessible(systemId: string, playerId: string): Promise<boolean>;
}

interface GameStateMutator {
  updatePlayer(player: any): Promise<void>;
  updateFleet(fleet: any): Promise<void>;
  moveFleet(fleetId: string, destination: any): Promise<void>;
  updateEmpire(empire: any): Promise<void>;
  addCreditsToEmpire(empireId: string, amount: number): Promise<void>;
  deductCreditsFromEmpire(empireId: string, amount: number): Promise<boolean>;
  updateSystem(system: any): Promise<void>;
  transferResources(fromId: string, toId: string, resourceType: string, quantity: number): Promise<boolean>;
  processCombat(attackerFleetId: string, defenderFleetId: string, tactics: string): Promise<any>;
  createGameEvent(type: string, description: string, affectedSystems: string[], effects: Record<string, any>): Promise<void>;
}

interface TurnEventEmitter {
  emit(event: string, data: any): void;
}

/**
 * Main turn processing function.
 * @param options Processing configuration options
 * @returns Success status and processing results
 */
async function processTurn(options: ProcessOptions = {}) {
  console.log('⚡ SpaceCommand Turn Processor');
  console.log('==============================\n');

  const { universeId, turnId, force = false, dryRun = false, verbose = false } = options;

  try {
    // Step 1: Database connection
    console.log('📡 Connecting to database...');
    const db = await createConnection();
    
    if (!db) {
      throw new Error('Failed to establish database connection');
    }
    
    console.log('✅ Database connection established\n');

    // Step 2: Create game state providers
    const gameStateProvider = createGameStateProvider(db);
    const gameStateMutator = createGameStateMutator(db, dryRun);
    const eventEmitter = createEventEmitter(verbose);

    // Step 3: Initialize turn processor
    console.log('🔧 Initializing turn processor...');
    const turnProcessor = new TurnProcessor(
      gameStateProvider,
      gameStateMutator,
      eventEmitter
    );

    const scheduler = new TurnScheduler(turnProcessor);
    console.log('✅ Turn processor ready\n');

    // Step 4: Process turns based on options
    if (turnId) {
      // Process specific turn
      console.log(`🎯 Processing specific turn: ${turnId}`);
      await processSpecificTurn(turnProcessor, db, turnId, dryRun);
    } else if (universeId) {
      // Process universe turns
      console.log(`🌌 Processing turns for universe: ${universeId}`);
      await processUniverseTurns(scheduler, universeId, force, dryRun);
    } else {
      // Process all active universes
      console.log('🌍 Processing turns for all active universes');
      await processAllUniverses(scheduler, db, force, dryRun);
    }

    console.log('\n🎮 Turn processing completed successfully!');
    await db.end();
    return { success: true };

  } catch (error) {
    console.error('\n❌ Turn processing failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Processes a specific turn by ID.
 */
async function processSpecificTurn(
  turnProcessor: TurnProcessor,
  db: any,
  turnId: string,
  dryRun: boolean
): Promise<void> {
  if (dryRun) {
    console.log(`[DRY RUN] Would process turn ${turnId}`);
    return;
  }

  // Load turn from database
  const turnResult = await db.query(
    'SELECT * FROM turns WHERE id = $1',
    [turnId]
  );

  if (turnResult.rows.length === 0) {
    throw new Error(`Turn ${turnId} not found`);
  }

  const turnData = turnResult.rows[0];
  
  // Reconstruct turn object
  const turn = new Turn(
    turnData.id,
    turnData.universe_id,
    turnData.turn_number
  );

  // Load actions for this turn
  const actionQueue = new ActionQueue(turnId);
  // TODO: Load actions from database and add to queue

  // Process the turn
  const result = await turnProcessor.processTurn(turn, actionQueue);
  
  if (result.success) {
    console.log(`✅ Turn ${turnId} processed: ${result.actionsProcessed} actions`);
  } else {
    console.log(`❌ Turn ${turnId} failed: ${result.errorMessages.join(', ')}`);
  }
}

/**
 * Processes turns for a specific universe.
 */
async function processUniverseTurns(
  scheduler: TurnScheduler,
  universeId: string,
  force: boolean,
  dryRun: boolean
): Promise<void> {
  if (dryRun) {
    console.log(`[DRY RUN] Would process turns for universe ${universeId}`);
    return;
  }

  // Register universe with scheduler
  scheduler.registerUniverse(universeId);

  const activeTurn = scheduler.getActiveTurn(universeId);
  
  if (activeTurn) {
    if (activeTurn.isExpired() || force) {
      console.log(`Processing expired turn ${activeTurn.id}...`);
      const result = await scheduler.processTurn(activeTurn.id);
      
      if (result.success) {
        console.log(`✅ Turn processed: ${result.actionsProcessed} actions`);
      } else {
        console.log(`❌ Turn failed: ${result.errorMessages.join(', ')}`);
      }
    } else {
      const remaining = Math.round(activeTurn.getRemainingTime() / 1000 / 60);
      console.log(`⏰ Active turn ${activeTurn.id} has ${remaining} minutes remaining`);
    }
  } else {
    console.log('📅 Creating new turn for universe...');
    const newTurn = await scheduler.createTurn(universeId);
    console.log(`✅ Created turn ${newTurn.id}`);
  }
}

/**
 * Processes turns for all active universes.
 */
async function processAllUniverses(
  scheduler: TurnScheduler,
  db: any,
  force: boolean,
  dryRun: boolean
): Promise<void> {
  if (dryRun) {
    console.log('[DRY RUN] Would process turns for all active universes');
    return;
  }

  // Get all active universes
  const universesResult = await db.query(
    "SELECT id FROM universes WHERE status = 'active'"
  );

  if (universesResult.rows.length === 0) {
    console.log('ℹ️  No active universes found');
    return;
  }

  console.log(`📊 Found ${universesResult.rows.length} active universes`);

  for (const universe of universesResult.rows) {
    try {
      console.log(`\n🌌 Processing universe ${universe.id}...`);
      await processUniverseTurns(scheduler, universe.id, force, dryRun);
    } catch (error) {
      console.error(`❌ Failed to process universe ${universe.id}:`, error);
    }
  }
}

/**
 * Creates a game state provider for database access.
 */
function createGameStateProvider(db: any): GameStateProvider {
  return {
    async getPlayer(playerId: string) {
      const result = await db.query('SELECT * FROM players WHERE id = $1', [playerId]);
      return result.rows[0] || null;
    },

    async getFleet(fleetId: string) {
      const result = await db.query('SELECT * FROM fleets WHERE id = $1', [fleetId]);
      return result.rows[0] || null;
    },

    async getSystem(systemId: string) {
      const result = await db.query('SELECT * FROM systems WHERE id = $1', [systemId]);
      return result.rows[0] || null;
    },

    async getEmpire(empireId: string) {
      const result = await db.query('SELECT * FROM empires WHERE id = $1', [empireId]);
      return result.rows[0] || null;
    },

    async getPlayerFleets(playerId: string) {
      const result = await db.query('SELECT * FROM fleets WHERE player_id = $1', [playerId]);
      return result.rows;
    },

    calculateDistance(from: any, to: any): number {
      const dx = from.x - to.x;
      const dy = from.y - to.y;
      const dz = (from.z || 0) - (to.z || 0);
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    },

    async isSystemAccessible(systemId: string, playerId: string): Promise<boolean> {
      // TODO: Implement access control logic
      return true;
    }
  };
}

/**
 * Creates a game state mutator for database updates.
 */
function createGameStateMutator(db: any, dryRun: boolean): GameStateMutator {
  return {
    async updatePlayer(player: any) {
      if (dryRun) {
        console.log(`[DRY RUN] Would update player ${player.id}`);
        return;
      }
      await db.query(
        'UPDATE players SET credits = $2, reputation = $3, last_active = $4 WHERE id = $1',
        [player.id, player.credits, player.reputation, new Date()]
      );
    },

    async updateFleet(fleet: any) {
      if (dryRun) {
        console.log(`[DRY RUN] Would update fleet ${fleet.id}`);
        return;
      }
      await db.query(
        'UPDATE fleets SET current_system_id = $2, status = $3, ships = $4, cargo = $5 WHERE id = $1',
        [fleet.id, fleet.current_system_id, fleet.status, JSON.stringify(fleet.ships), JSON.stringify(fleet.cargo)]
      );
    },

    async moveFleet(fleetId: string, destination: any) {
      if (dryRun) {
        console.log(`[DRY RUN] Would move fleet ${fleetId} to ${JSON.stringify(destination)}`);
        return;
      }
      // TODO: Implement fleet movement logic
    },

    async updateEmpire(empire: any) {
      if (dryRun) {
        console.log(`[DRY RUN] Would update empire ${empire.id}`);
        return;
      }
      // TODO: Implement empire updates
    },

    async addCreditsToEmpire(empireId: string, amount: number) {
      if (dryRun) {
        console.log(`[DRY RUN] Would add ${amount} credits to empire ${empireId}`);
        return;
      }
      // TODO: Implement credit addition
    },

    async deductCreditsFromEmpire(empireId: string, amount: number): Promise<boolean> {
      if (dryRun) {
        console.log(`[DRY RUN] Would deduct ${amount} credits from empire ${empireId}`);
        return true;
      }
      // TODO: Implement credit deduction
      return true;
    },

    async updateSystem(system: any) {
      if (dryRun) {
        console.log(`[DRY RUN] Would update system ${system.id}`);
        return;
      }
      // TODO: Implement system updates
    },

    async transferResources(fromId: string, toId: string, resourceType: string, quantity: number): Promise<boolean> {
      if (dryRun) {
        console.log(`[DRY RUN] Would transfer ${quantity} ${resourceType} from ${fromId} to ${toId}`);
        return true;
      }
      // TODO: Implement resource transfers
      return true;
    },

    async processCombat(attackerFleetId: string, defenderFleetId: string, tactics: string) {
      if (dryRun) {
        console.log(`[DRY RUN] Would process combat between ${attackerFleetId} and ${defenderFleetId}`);
        return { victor: 'attacker', attackerLosses: [], defenderLosses: [] };
      }
      // TODO: Implement combat processing
      return { victor: 'attacker', attackerLosses: [], defenderLosses: [] };
    },

    async createGameEvent(type: string, description: string, affectedSystems: string[], effects: Record<string, any>) {
      if (dryRun) {
        console.log(`[DRY RUN] Would create ${type} event: ${description}`);
        return;
      }
      await db.query(
        'INSERT INTO game_events (type, description, affected_systems, effects, created_at) VALUES ($1, $2, $3, $4, $5)',
        [type, description, JSON.stringify(affectedSystems), JSON.stringify(effects), new Date()]
      );
    }
  };
}

/**
 * Creates an event emitter for turn processing events.
 */
function createEventEmitter(verbose: boolean): TurnEventEmitter {
  return {
    emit(event: string, data: any) {
      if (verbose) {
        console.log(`📡 Event: ${event}`, data);
      }
    }
  };
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: ProcessOptions = {
  universeId: args.find(arg => arg.startsWith('--universe='))?.split('=')[1],
  turnId: args.find(arg => arg.startsWith('--turn='))?.split('=')[1],
  force: args.includes('--force') || args.includes('-f'),
  dryRun: args.includes('--dry-run') || args.includes('-n'),
  verbose: args.includes('--verbose') || args.includes('-v')
};

// Display help if requested
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
SpaceCommand Turn Processor

Usage: npm run turn:process [options]

Options:
  --universe=ID     Process turns for specific universe
  --turn=ID         Process specific turn by ID
  --force, -f       Force process active turns
  --dry-run, -n     Show what would be done without making changes
  --verbose, -v     Show detailed processing information
  --help, -h        Show this help message

Examples:
  npm run turn:process                          # Process all universes
  npm run turn:process --universe=abc-123      # Process specific universe
  npm run turn:process --turn=turn-456         # Process specific turn
  npm run turn:process --force --verbose       # Force process with details
  npm run turn:process --dry-run               # Preview without changes
`);
  process.exit(0);
}

// Run turn processing
processTurn(options).then(result => {
  process.exit(result.success ? 0 : 1);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});