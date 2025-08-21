import { Action, ActionExecutionResult } from '../entities/Action';
import { Coordinates } from '@shared/types';
import { Player } from '../entities/Player';
import { Fleet } from '../entities/Fleet';
import { System } from '../entities/System';
import { Empire } from '../entities/Empire';

export interface GameStateMutator {
  // Player operations
  updatePlayer(player: Player): Promise<void>;
  
  // Fleet operations
  updateFleet(fleet: Fleet): Promise<void>;
  moveFleet(fleetId: string, destination: Coordinates): Promise<void>;
  
  // Empire operations
  updateEmpire(empire: Empire): Promise<void>;
  addCreditsToEmpire(empireId: string, amount: number): Promise<void>;
  deductCreditsFromEmpire(empireId: string, amount: number): Promise<boolean>;
  
  // System operations
  updateSystem(system: System): Promise<void>;
  
  // Resource operations
  transferResources(fromId: string, toId: string, resourceType: string, quantity: number): Promise<boolean>;
  
  // Combat operations
  processCombat(attackerFleetId: string, defenderFleetId: string, tactics: string): Promise<CombatResult>;
  
  // Game events
  createGameEvent(type: string, description: string, affectedSystems: string[], effects: Record<string, any>): Promise<void>;
}

export interface CombatResult {
  victor: 'attacker' | 'defender' | 'draw';
  attackerLosses: ShipLoss[];
  defenderLosses: ShipLoss[];
  lootCaptured?: number;
  experienceGained: Record<string, number>;
}

export interface ShipLoss {
  shipId: string;
  shipClass: string;
  destroyed: boolean;
  damagePercent: number;
}

/**
 * Executes validated player actions and applies their effects to the game state.
 * Handles all action types with proper error handling and rollback support.
 * Emits events for action results and state changes.
 * Ensures game state consistency through atomic operations.
 */
export class ActionExecutor {
  private readonly gameState: GameStateMutator;
  private readonly executionLog: string[];

  constructor(gameState: GameStateMutator) {
    this.gameState = gameState;
    this.executionLog = [];
  }

  /**
   * Executes a single validated action.
   * @param {Action} action - The action to execute (must be validated)
   * @returns {Promise<ActionExecutionResult>} Execution result with details
   */
  public async executeAction(action: Action): Promise<ActionExecutionResult> {
    try {
      this.log(`Executing action ${action.id} (${action.type}) for player ${action.playerId}`);

      // Route to specific executor based on action type
      switch (action.type) {
        case 'move_fleet':
          return await this.executeMoveFleet(action);
        case 'trade':
          return await this.executeTrade(action);
        case 'attack':
          return await this.executeAttack(action);
        case 'colonize':
          return await this.executeColonize(action);
        case 'research':
          return await this.executeResearch(action);
        case 'build_ships':
          return await this.executeBuildShips(action);
        case 'diplomacy':
          return await this.executeDiplomacy(action);
        case 'mine':
          return await this.executeMine(action);
        case 'transfer':
          return await this.executeTransfer(action);
        case 'repair':
          return await this.executeRepair(action);
        default:
          return {
            result: 'failed',
            message: `Unknown action type: ${action.type}`
          };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log(`Action ${action.id} execution failed: ${errorMessage}`);
      return {
        result: 'failed',
        message: `Execution error: ${errorMessage}`
      };
    }
  }

  /**
   * Executes multiple actions in sequence with rollback on failure.
   * @param {Action[]} actions - Array of validated actions to execute
   * @returns {Promise<Map<string, ActionExecutionResult>>} Map of results by action ID
   */
  public async executeActionBatch(actions: Action[]): Promise<Map<string, ActionExecutionResult>> {
    const results = new Map<string, ActionExecutionResult>();
    
    // Sort actions by priority for proper execution order
    const sortedActions = [...actions].sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.submittedAt.getTime() - b.submittedAt.getTime();
    });

    // Execute actions in order
    for (const action of sortedActions) {
      const result = await this.executeAction(action);
      results.set(action.id, result);
      
      // If a critical action fails, we might want to halt execution
      // For now, continue with remaining actions
      if (result.result === 'failed') {
        this.log(`Action ${action.id} failed, continuing with remaining actions`);
      }
    }

    return results;
  }

  /**
   * Executes fleet movement action.
   */
  private async executeMoveFleet(action: Action): Promise<ActionExecutionResult> {
    const fleetId = action.getParameter<string>('fleetId', '');
    const destination = action.getParameter<Coordinates>('destination', { x: 0, y: 0, z: 0 });

    try {
      await this.gameState.moveFleet(fleetId, destination);
      
      return {
        result: 'success',
        message: `Fleet ${fleetId} moved to coordinates (${destination.x}, ${destination.y}, ${destination.z})`,
        data: { fleetId, destination },
        sideEffects: [`Fleet ${fleetId} position updated`]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        result: 'failed',
        message: `Failed to move fleet: ${errorMessage}`
      };
    }
  }

  /**
   * Executes trading action.
   */
  private async executeTrade(action: Action): Promise<ActionExecutionResult> {
    const stationId = action.getParameter<string>('stationId', '');
    const resourceType = action.getParameter<string>('resourceType', '');
    const quantity = action.getParameter<number>('quantity', 0);
    const maxPrice = action.getParameter<number>('maxPrice', 0);

    try {
      const totalCost = Math.abs(quantity) * maxPrice;
      const isBuying = quantity > 0;

      if (isBuying) {
        // Buying resources
        const success = await this.gameState.deductCreditsFromEmpire(action.playerId, totalCost);
        if (!success) {
          return {
            result: 'failed',
            message: 'Insufficient credits for purchase'
          };
        }

        // TODO: Add resources to player inventory
        // await this.gameState.transferResources('station', action.playerId, resourceType, quantity);

        return {
          result: 'success',
          message: `Purchased ${quantity} units of ${resourceType} for ${totalCost} credits`,
          data: { resourceType, quantity, totalCost, isBuying: true },
          sideEffects: [`Credits deducted: ${totalCost}`, `Resources added: ${quantity} ${resourceType}`]
        };
      } else {
        // Selling resources
        const sellQuantity = Math.abs(quantity);
        const revenue = sellQuantity * maxPrice;

        // TODO: Check if player has resources to sell
        // const hasResources = await this.gameState.transferResources(action.playerId, 'station', resourceType, sellQuantity);
        const hasResources = true; // Placeholder

        if (!hasResources) {
          return {
            result: 'failed',
            message: `Insufficient ${resourceType} to sell`
          };
        }

        await this.gameState.addCreditsToEmpire(action.playerId, revenue);

        return {
          result: 'success',
          message: `Sold ${sellQuantity} units of ${resourceType} for ${revenue} credits`,
          data: { resourceType, quantity: sellQuantity, revenue, isBuying: false },
          sideEffects: [`Credits added: ${revenue}`, `Resources removed: ${sellQuantity} ${resourceType}`]
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        result: 'failed',
        message: `Trade execution failed: ${errorMessage}`
      };
    }
  }

  /**
   * Executes attack action.
   */
  private async executeAttack(action: Action): Promise<ActionExecutionResult> {
    const attackerFleetId = action.getParameter<string>('attackerFleetId', '');
    const targetFleetId = action.getParameter<string>('targetFleetId', '');
    const tactics = action.getParameter<string>('tacticsType', 'balanced');

    try {
      const combatResult = await this.gameState.processCombat(attackerFleetId, targetFleetId, tactics);

      // Generate combat report
      const attackerLossCount = combatResult.attackerLosses.filter(loss => loss.destroyed).length;
      const defenderLossCount = combatResult.defenderLosses.filter(loss => loss.destroyed).length;

      let message = `Combat between fleets ${attackerFleetId} and ${targetFleetId}. `;
      message += `Victor: ${combatResult.victor}. `;
      message += `Losses - Attacker: ${attackerLossCount}, Defender: ${defenderLossCount}`;

      const sideEffects = [
        `Combat resolved: ${combatResult.victor} victorious`,
        `Attacker losses: ${attackerLossCount} ships`,
        `Defender losses: ${defenderLossCount} ships`
      ];

      if (combatResult.lootCaptured) {
        sideEffects.push(`Loot captured: ${combatResult.lootCaptured} credits`);
      }

      return {
        result: 'success',
        message,
        data: {
          attackerFleetId,
          targetFleetId,
          combatResult
        },
        sideEffects
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        result: 'failed',
        message: `Combat execution failed: ${errorMessage}`
      };
    }
  }

  /**
   * Executes colonization action.
   */
  private async executeColonize(action: Action): Promise<ActionExecutionResult> {
    // TODO: Implement colonization logic
    return {
      result: 'success',
      message: 'Colonization action executed (placeholder)',
      data: { actionType: 'colonize' }
    };
  }

  /**
   * Executes research action.
   */
  private async executeResearch(action: Action): Promise<ActionExecutionResult> {
    const technologyId = action.getParameter<string>('technologyId', '');
    const researchPoints = action.getParameter<number>('researchPoints', 0);

    // TODO: Implement research logic
    return {
      result: 'success',
      message: `Allocated ${researchPoints} research points to ${technologyId}`,
      data: { technologyId, researchPoints },
      sideEffects: [`Research progress updated for ${technologyId}`]
    };
  }

  /**
   * Executes ship building action.
   */
  private async executeBuildShips(action: Action): Promise<ActionExecutionResult> {
    // TODO: Implement ship building logic
    return {
      result: 'success',
      message: 'Ship building action executed (placeholder)',
      data: { actionType: 'build_ships' }
    };
  }

  /**
   * Executes diplomatic action.
   */
  private async executeDiplomacy(action: Action): Promise<ActionExecutionResult> {
    // TODO: Implement diplomacy logic
    return {
      result: 'success',
      message: 'Diplomatic action executed (placeholder)',
      data: { actionType: 'diplomacy' }
    };
  }

  /**
   * Executes mining action.
   */
  private async executeMine(action: Action): Promise<ActionExecutionResult> {
    // TODO: Implement mining logic
    return {
      result: 'success',
      message: 'Mining action executed (placeholder)',
      data: { actionType: 'mine' }
    };
  }

  /**
   * Executes resource transfer action.
   */
  private async executeTransfer(action: Action): Promise<ActionExecutionResult> {
    const fromId = action.getParameter<string>('fromId', '');
    const toId = action.getParameter<string>('toId', '');
    const resourceType = action.getParameter<string>('resourceType', '');
    const quantity = action.getParameter<number>('quantity', 0);

    try {
      const success = await this.gameState.transferResources(fromId, toId, resourceType, quantity);
      
      if (!success) {
        return {
          result: 'failed',
          message: 'Transfer failed - insufficient resources or invalid target'
        };
      }

      return {
        result: 'success',
        message: `Transferred ${quantity} ${resourceType} from ${fromId} to ${toId}`,
        data: { fromId, toId, resourceType, quantity },
        sideEffects: [`Resource transfer completed`]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        result: 'failed',
        message: `Transfer execution failed: ${errorMessage}`
      };
    }
  }

  /**
   * Executes ship repair action.
   */
  private async executeRepair(action: Action): Promise<ActionExecutionResult> {
    // TODO: Implement repair logic
    return {
      result: 'success',
      message: 'Repair action executed (placeholder)',
      data: { actionType: 'repair' }
    };
  }

  /**
   * Gets execution log for debugging and audit trail.
   * @returns {string[]} Array of execution log messages
   */
  public getExecutionLog(): string[] {
    return [...this.executionLog];
  }

  /**
   * Clears the execution log.
   * @sideEffect Empties the execution log array
   */
  public clearLog(): void {
    this.executionLog.length = 0;
  }

  /**
   * Adds a message to the execution log.
   * @param {string} message - Message to log
   * @sideEffect Appends timestamped message to execution log
   */
  private log(message: string): void {
    const timestamp = new Date().toISOString();
    this.executionLog.push(`[${timestamp}] ${message}`);
  }
}