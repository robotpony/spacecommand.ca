/**
 * Player faction affiliation determining starting bonuses and diplomatic modifiers.
 * Terran Federation: Balanced diplomacy and trade
 * Orion Syndicate: Combat and piracy bonuses
 * Centauri Republic: Research and technology focus
 * Independent: No faction bonuses or penalties
 */
export type Faction = 'terran_federation' | 'orion_syndicate' | 'centauri_republic' | 'independent';

/**
 * Technological advancement level affecting ship capabilities and research options.
 * Progression: chemical → nuclear → antimatter → exotic
 * Higher tiers unlock advanced ships, weapons, and production methods.
 */
export type TechnologyTier = 'chemical' | 'nuclear' | 'antimatter' | 'exotic';

/**
 * Tradeable resources in the game economy.
 * Basic resources: ore, crystals, energy, food
 * Manufactured goods: electronics, weapons
 * Special commodities: luxury_goods, fuel
 */
export type ResourceType = 
  | 'ore'
  | 'crystals'
  | 'energy'
  | 'electronics'
  | 'weapons'
  | 'food'
  | 'luxury_goods'
  | 'fuel';

/**
 * Ship classifications determining role and capabilities.
 * Courier: Fast scout/messenger ships
 * Freighter: High cargo capacity traders
 * Destroyer: Light combat vessels
 * Battlecruiser: Heavy combat ships
 * Dreadnought: Capital ships with maximum firepower
 */
export type ShipClass = 'courier' | 'freighter' | 'destroyer' | 'battlecruiser' | 'dreadnought';

/**
 * Planet economic focus affecting production and population.
 * Each specialization provides unique production bonuses and penalties.
 */
export type PlanetSpecialization = 
  | 'mining'
  | 'agricultural'
  | 'industrial'
  | 'research'
  | 'military'
  | 'commercial'
  | 'balanced';

/**
 * Diplomatic relationship states between empires.
 * Affects trade permissions, military access, and alliance mechanics.
 */
export type DiplomaticStatus = 
  | 'war'
  | 'hostile'
  | 'neutral'
  | 'friendly'
  | 'allied';

/**
 * Represents a tradeable commodity with market value.
 */
export type TradeGood = {
  type: ResourceType;
  quantity: number;
  basePrice: number;
};

/**
 * 3D position in galactic space for systems, planets, and fleets.
 */
export type Coordinates = {
  x: number;
  y: number;
  z: number;
};

/**
 * Random events that affect game state during turn processing.
 * Events can impact markets, fleets, diplomacy, or provide opportunities.
 */
export type GameEvent = {
  id: string;
  type: 'market_fluctuation' | 'pirate_raid' | 'solar_flare' | 'diplomatic_summit' | 'alien_artifact';
  timestamp: Date;
  affectedSystems: string[];
  description: string;
  effects: Record<string, any>;
};

/**
 * Turn processing phases in chronological order.
 * Each phase has specific responsibilities and timing constraints.
 */
export type TurnPhase = 
  | 'collecting'      // Accepting player actions during turn window
  | 'validating'      // Checking action validity against game state
  | 'processing'      // Executing actions in priority order
  | 'resolving'       // Calculating results and updating state
  | 'distributing'    // Sending results to players
  | 'completed';      // Turn fully processed

/**
 * Player action types that can be submitted during turn collection.
 * Actions are processed in priority order during turn execution.
 */
export type ActionType =
  | 'move_fleet'      // Fleet movement between systems
  | 'trade'           // Buy/sell resources at stations
  | 'attack'          // Initiate combat with another fleet
  | 'colonize'        // Establish colony on uninhabited planet
  | 'research'        // Advance technology tree
  | 'build_ships'     // Construct new ships at shipyards
  | 'diplomacy'       // Send diplomatic messages/proposals
  | 'mine'            // Extract resources from planets
  | 'transfer'        // Transfer resources between fleets/colonies
  | 'repair';         // Repair damaged ships

/**
 * Result status for processed actions.
 * Determines if action was executed successfully or failed.
 */
export type ActionResult = 
  | 'success'         // Action completed successfully
  | 'failed'          // Action failed validation or execution
  | 'partial'         // Action partially completed
  | 'queued'          // Action queued for next turn
  | 'cancelled';      // Action cancelled by player or system

/**
 * Turn status indicating current processing state.
 * Used for tracking turn lifecycle and player information.
 */
export type TurnStatus = 
  | 'scheduled'       // Turn scheduled but not started
  | 'active'          // Turn accepting player actions
  | 'processing'      // Turn being processed by system
  | 'completed'       // Turn completed and results distributed
  | 'failed'          // Turn processing failed, requires intervention
  | 'cancelled';      // Turn cancelled (emergency stop)