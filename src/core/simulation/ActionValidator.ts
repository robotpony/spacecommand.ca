import { Action, ActionValidationResult } from '../entities/Action';
import { Coordinates } from '@shared/types';
import { Player } from '../entities/Player';
import { Fleet } from '../entities/Fleet';
import { System } from '../entities/System';
import { Empire } from '../entities/Empire';

export interface GameStateProvider {
  getPlayer(playerId: string): Promise<Player | null>;
  getFleet(fleetId: string): Promise<Fleet | null>;
  getSystem(systemId: string): Promise<System | null>;
  getEmpire(empireId: string): Promise<Empire | null>;
  getPlayerFleets(playerId: string): Promise<Fleet[]>;
  calculateDistance(from: Coordinates, to: Coordinates): number;
  isSystemAccessible(systemId: string, playerId: string): Promise<boolean>;
}

/**
 * Validates player actions against current game state and rules.
 * Ensures actions are legal, feasible, and don't conflict with game mechanics.
 * Provides detailed error messages for failed validations to help players.
 * Supports async validation for database-dependent rule checking.
 */
export class ActionValidator {
  private readonly gameState: GameStateProvider;

  constructor(gameState: GameStateProvider) {
    this.gameState = gameState;
  }

  /**
   * Validates a single action against game rules and current state.
   * @param {Action} action - Action to validate
   * @returns {Promise<ActionValidationResult>} Validation result with error details
   */
  public async validateAction(action: Action): Promise<ActionValidationResult> {
    try {
      // Check if player exists and is active
      const player = await this.gameState.getPlayer(action.playerId);
      if (!player) {
        return {
          isValid: false,
          errorMessage: 'Player not found',
          errorCode: 'PLAYER_NOT_FOUND'
        };
      }

      if (!player.isActive || player.isBanned) {
        return {
          isValid: false,
          errorMessage: 'Player account is not active',
          errorCode: 'PLAYER_INACTIVE'
        };
      }

      // Validate based on action type
      switch (action.type) {
        case 'move_fleet':
          return await this.validateMoveFleet(action, player);
        case 'trade':
          return await this.validateTrade(action, player);
        case 'attack':
          return await this.validateAttack(action, player);
        case 'colonize':
          return await this.validateColonize(action, player);
        case 'research':
          return await this.validateResearch(action, player);
        case 'build_ships':
          return await this.validateBuildShips(action, player);
        case 'diplomacy':
          return await this.validateDiplomacy(action, player);
        case 'mine':
          return await this.validateMine(action, player);
        case 'transfer':
          return await this.validateTransfer(action, player);
        case 'repair':
          return await this.validateRepair(action, player);
        default:
          return {
            isValid: false,
            errorMessage: `Unknown action type: ${action.type}`,
            errorCode: 'UNKNOWN_ACTION_TYPE'
          };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        isValid: false,
        errorMessage: `Validation error: ${errorMessage}`,
        errorCode: 'VALIDATION_ERROR'
      };
    }
  }

  /**
   * Validates multiple actions for conflicts and dependencies.
   * @param {Action[]} actions - Array of actions to validate together
   * @returns {Promise<Map<string, ActionValidationResult>>} Map of actionId to validation result
   */
  public async validateActionBatch(actions: Action[]): Promise<Map<string, ActionValidationResult>> {
    const results = new Map<string, ActionValidationResult>();

    // First pass: validate each action individually
    for (const action of actions) {
      const result = await this.validateAction(action);
      results.set(action.id, result);
    }

    // Second pass: check for conflicts between actions
    await this.checkActionConflicts(actions, results);

    return results;
  }

  /**
   * Validates fleet movement action.
   */
  private async validateMoveFleet(action: Action, player: Player): Promise<ActionValidationResult> {
    const fleetId = action.getParameter<string>('fleetId', '');
    const destination = action.getParameter<Coordinates>('destination', { x: 0, y: 0, z: 0 });

    if (!fleetId) {
      return { isValid: false, errorMessage: 'Fleet ID is required', errorCode: 'MISSING_FLEET_ID' };
    }

    const fleet = await this.gameState.getFleet(fleetId);
    if (!fleet) {
      return { isValid: false, errorMessage: 'Fleet not found', errorCode: 'FLEET_NOT_FOUND' };
    }

    // Check fleet ownership through empire
    if (fleet.empireId !== player.empireId) {
      return { isValid: false, errorMessage: 'Fleet not owned by player', errorCode: 'FLEET_NOT_OWNED' };
    }

    // Check if fleet is already moving or in combat
    if (fleet.status === 'in_transit' || fleet.status === 'in_combat') {
      return { isValid: false, errorMessage: `Fleet is ${fleet.status}`, errorCode: 'FLEET_BUSY' };
    }

    // Validate destination coordinates
    if (!this.isValidCoordinates(destination)) {
      return { isValid: false, errorMessage: 'Invalid destination coordinates', errorCode: 'INVALID_COORDINATES' };
    }

    // Check movement range (basic fuel/distance validation)
    const distance = this.gameState.calculateDistance(fleet.position, destination);
    if (distance > fleet.maxRange) {
      return { isValid: false, errorMessage: 'Destination out of range', errorCode: 'OUT_OF_RANGE' };
    }

    return { isValid: true };
  }

  /**
   * Validates trading action.
   */
  private async validateTrade(action: Action, player: Player): Promise<ActionValidationResult> {
    const stationId = action.getParameter<string>('stationId', '');
    const resourceType = action.getParameter<string>('resourceType', '');
    const quantity = action.getParameter<number>('quantity', 0);
    const maxPrice = action.getParameter<number>('maxPrice', 0);

    if (!stationId || !resourceType || quantity === 0) {
      return { isValid: false, errorMessage: 'Missing required trade parameters', errorCode: 'MISSING_TRADE_PARAMS' };
    }

    // For buying (positive quantity), check if player has enough credits
    if (quantity > 0) {
      const totalCost = quantity * maxPrice;
      if (!player.canAfford(totalCost)) {
        return { 
          isValid: false, 
          errorMessage: `Insufficient credits. Required: ${totalCost}, Available: ${player.credits}`,
          errorCode: 'INSUFFICIENT_CREDITS' 
        };
      }
    }

    // For selling (negative quantity), check if player has the resources
    // This would require checking player's empire resources
    // TODO: Implement resource ownership checking

    return { isValid: true };
  }

  /**
   * Validates attack action.
   */
  private async validateAttack(action: Action, player: Player): Promise<ActionValidationResult> {
    const attackerFleetId = action.getParameter<string>('attackerFleetId', '');
    const targetFleetId = action.getParameter<string>('targetFleetId', '');

    if (!attackerFleetId || !targetFleetId) {
      return { isValid: false, errorMessage: 'Missing fleet IDs for attack', errorCode: 'MISSING_FLEET_IDS' };
    }

    const attackerFleet = await this.gameState.getFleet(attackerFleetId);
    const targetFleet = await this.gameState.getFleet(targetFleetId);

    if (!attackerFleet || !targetFleet) {
      return { isValid: false, errorMessage: 'One or both fleets not found', errorCode: 'FLEET_NOT_FOUND' };
    }

    // Check attacker ownership
    if (attackerFleet.empireId !== player.empireId) {
      return { isValid: false, errorMessage: 'Attacker fleet not owned by player', errorCode: 'FLEET_NOT_OWNED' };
    }

    // Check if fleets are in the same location
    if (!this.areCoordinatesEqual(attackerFleet.position, targetFleet.position)) {
      return { isValid: false, errorMessage: 'Fleets must be in the same location to attack', errorCode: 'FLEETS_NOT_COLLOCATED' };
    }

    // Check if attacker fleet can attack (has weapons, not damaged, etc.)
    if (attackerFleet.ships.length === 0) {
      return { isValid: false, errorMessage: 'Attacker fleet has no ships', errorCode: 'NO_SHIPS' };
    }

    // Prevent self-attack
    if (attackerFleet.empireId === targetFleet.empireId) {
      return { isValid: false, errorMessage: 'Cannot attack own fleet', errorCode: 'SELF_ATTACK' };
    }

    return { isValid: true };
  }

  /**
   * Validates colonization action.
   */
  private async validateColonize(action: Action, player: Player): Promise<ActionValidationResult> {
    // TODO: Implement colonization validation
    // Check if planet is uninhabited, fleet has colony ship, etc.
    return { isValid: true };
  }

  /**
   * Validates research action.
   */
  private async validateResearch(action: Action, player: Player): Promise<ActionValidationResult> {
    const technologyId = action.getParameter<string>('technologyId', '');
    const researchPoints = action.getParameter<number>('researchPoints', 0);

    if (!technologyId || researchPoints <= 0) {
      return { isValid: false, errorMessage: 'Invalid research parameters', errorCode: 'INVALID_RESEARCH_PARAMS' };
    }

    // TODO: Check if technology is researchable, player has prerequisites, etc.
    return { isValid: true };
  }

  /**
   * Validates ship building action.
   */
  private async validateBuildShips(action: Action, player: Player): Promise<ActionValidationResult> {
    // TODO: Implement ship building validation
    // Check if player has shipyard, resources, etc.
    return { isValid: true };
  }

  /**
   * Validates diplomatic action.
   */
  private async validateDiplomacy(action: Action, player: Player): Promise<ActionValidationResult> {
    // TODO: Implement diplomacy validation
    return { isValid: true };
  }

  /**
   * Validates mining action.
   */
  private async validateMine(action: Action, player: Player): Promise<ActionValidationResult> {
    // TODO: Implement mining validation
    return { isValid: true };
  }

  /**
   * Validates resource transfer action.
   */
  private async validateTransfer(action: Action, player: Player): Promise<ActionValidationResult> {
    // TODO: Implement transfer validation
    return { isValid: true };
  }

  /**
   * Validates ship repair action.
   */
  private async validateRepair(action: Action, player: Player): Promise<ActionValidationResult> {
    // TODO: Implement repair validation
    return { isValid: true };
  }

  /**
   * Checks for conflicts between multiple actions.
   */
  private async checkActionConflicts(
    actions: Action[], 
    results: Map<string, ActionValidationResult>
  ): Promise<void> {
    // Group actions by player and type for conflict detection
    const playerActions = new Map<string, Action[]>();
    
    for (const action of actions) {
      if (!results.get(action.id)?.isValid) continue; // Skip invalid actions
      
      if (!playerActions.has(action.playerId)) {
        playerActions.set(action.playerId, []);
      }
      playerActions.get(action.playerId)!.push(action);
    }

    // Check for conflicts within each player's actions
    for (const [playerId, playerActionList] of playerActions) {
      await this.checkPlayerActionConflicts(playerId, playerActionList, results);
    }
  }

  /**
   * Checks for conflicts within a single player's actions.
   */
  private async checkPlayerActionConflicts(
    playerId: string,
    actions: Action[],
    results: Map<string, ActionValidationResult>
  ): Promise<void> {
    // Check for fleet double-booking (same fleet used in multiple actions)
    const fleetUsage = new Map<string, Action[]>();
    
    for (const action of actions) {
      let fleetId: string | null = null;
      
      switch (action.type) {
        case 'move_fleet':
        case 'attack':
          fleetId = action.getParameter<string>('attackerFleetId', '') || 
                   action.getParameter<string>('fleetId', '');
          break;
      }
      
      if (fleetId) {
        if (!fleetUsage.has(fleetId)) {
          fleetUsage.set(fleetId, []);
        }
        fleetUsage.get(fleetId)!.push(action);
      }
    }

    // Mark conflicting actions as invalid
    for (const [fleetId, fleetActions] of fleetUsage) {
      if (fleetActions.length > 1) {
        // Keep the first action (by submission time), mark others as conflicts
        fleetActions.sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime());
        
        for (let i = 1; i < fleetActions.length; i++) {
          results.set(fleetActions[i].id, {
            isValid: false,
            errorMessage: `Fleet ${fleetId} is already assigned to another action this turn`,
            errorCode: 'FLEET_CONFLICT'
          });
        }
      }
    }
  }

  /**
   * Validates coordinate values.
   */
  private isValidCoordinates(coords: Coordinates): boolean {
    return coords && 
           typeof coords.x === 'number' && 
           typeof coords.y === 'number' && 
           typeof coords.z === 'number' &&
           !isNaN(coords.x) && !isNaN(coords.y) && !isNaN(coords.z);
  }

  /**
   * Checks if two coordinate sets are equal.
   */
  private areCoordinatesEqual(coords1: Coordinates, coords2: Coordinates): boolean {
    return coords1.x === coords2.x && 
           coords1.y === coords2.y && 
           coords1.z === coords2.z;
  }
}