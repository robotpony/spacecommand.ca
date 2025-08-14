import { ShipClass, Coordinates } from '@shared/types';

export interface Ship {
  id: string;
  class: ShipClass;
  name: string;
  health: number;
  maxHealth: number;
  attackPower: number;
  defense: number;
  speed: number;
  cargoCapacity: number;
  currentCargo: number;
  fuelCapacity: number;
  currentFuel: number;
  crewRequired: number;
  maintenanceCost: number;
}

export interface FleetComposition {
  couriers: number;
  freighters: number;
  destroyers: number;
  battlecruisers: number;
  dreadnoughts: number;
}

export class Fleet {
  public readonly id: string;
  public name: string;
  public ownerId: string;
  public currentSystemId: string;
  public coordinates: Coordinates;
  public ships: Ship[];
  public isInCombat: boolean;
  public isMoving: boolean;
  public destinationSystemId?: string;
  public arrivalTime?: Date;
  public morale: number;
  public experience: number;

  constructor(
    id: string,
    name: string,
    ownerId: string,
    currentSystemId: string,
    coordinates: Coordinates
  ) {
    this.id = id;
    this.name = name;
    this.ownerId = ownerId;
    this.currentSystemId = currentSystemId;
    this.coordinates = coordinates;
    this.ships = [];
    this.isInCombat = false;
    this.isMoving = false;
    this.morale = 100;
    this.experience = 0;
  }

  public addShip(ship: Ship): void {
    this.ships.push(ship);
  }

  public removeShip(shipId: string): void {
    const index = this.ships.findIndex(s => s.id === shipId);
    if (index === -1) {
      throw new Error(`Ship ${shipId} not found in fleet`);
    }
    this.ships.splice(index, 1);
  }

  public getComposition(): FleetComposition {
    const composition: FleetComposition = {
      couriers: 0,
      freighters: 0,
      destroyers: 0,
      battlecruisers: 0,
      dreadnoughts: 0
    };

    for (const ship of this.ships) {
      switch (ship.class) {
        case 'courier':
          composition.couriers++;
          break;
        case 'freighter':
          composition.freighters++;
          break;
        case 'destroyer':
          composition.destroyers++;
          break;
        case 'battlecruiser':
          composition.battlecruisers++;
          break;
        case 'dreadnought':
          composition.dreadnoughts++;
          break;
      }
    }

    return composition;
  }

  public getTotalAttackPower(): number {
    return this.ships.reduce((total, ship) => {
      const moraleModifier = this.morale / 100;
      const experienceBonus = 1 + (this.experience / 1000);
      return total + (ship.attackPower * moraleModifier * experienceBonus);
    }, 0);
  }

  public getTotalDefense(): number {
    return this.ships.reduce((total, ship) => {
      const moraleModifier = Math.max(0.5, this.morale / 100);
      return total + (ship.defense * moraleModifier);
    }, 0);
  }

  public getTotalCargoCapacity(): number {
    return this.ships.reduce((total, ship) => total + ship.cargoCapacity, 0);
  }

  public getCurrentCargo(): number {
    return this.ships.reduce((total, ship) => total + ship.currentCargo, 0);
  }

  public getAvailableCargoSpace(): number {
    return this.getTotalCargoCapacity() - this.getCurrentCargo();
  }

  public getFleetSpeed(): number {
    if (this.ships.length === 0) return 0;
    return Math.min(...this.ships.map(s => s.speed));
  }

  public getMaintenanceCost(): number {
    return this.ships.reduce((total, ship) => total + ship.maintenanceCost, 0);
  }

  public startMovement(destinationSystemId: string, travelTime: number): void {
    if (this.isInCombat) {
      throw new Error('Cannot move while in combat');
    }
    if (this.isMoving) {
      throw new Error('Fleet is already moving');
    }

    this.isMoving = true;
    this.destinationSystemId = destinationSystemId;
    this.arrivalTime = new Date(Date.now() + travelTime * 1000);
  }

  public completeMovement(): void {
    if (!this.isMoving || !this.destinationSystemId) {
      throw new Error('Fleet is not moving');
    }

    this.currentSystemId = this.destinationSystemId;
    this.isMoving = false;
    this.destinationSystemId = undefined;
    this.arrivalTime = undefined;
  }

  public enterCombat(): void {
    if (this.isMoving) {
      throw new Error('Cannot enter combat while moving');
    }
    this.isInCombat = true;
    this.morale = Math.max(20, this.morale - 10);
  }

  public exitCombat(won: boolean): void {
    this.isInCombat = false;
    if (won) {
      this.morale = Math.min(100, this.morale + 15);
      this.experience += 10;
    } else {
      this.morale = Math.max(0, this.morale - 20);
    }
  }

  public takeDamage(damage: number): number {
    let remainingDamage = damage;
    const destroyedShips: string[] = [];

    for (const ship of this.ships) {
      if (remainingDamage <= 0) break;

      const damageToShip = Math.min(ship.health, remainingDamage);
      ship.health -= damageToShip;
      remainingDamage -= damageToShip;

      if (ship.health <= 0) {
        destroyedShips.push(ship.id);
      }
    }

    for (const shipId of destroyedShips) {
      this.removeShip(shipId);
    }

    this.morale = Math.max(0, this.morale - (destroyedShips.length * 5));
    
    return destroyedShips.length;
  }

  public refuel(amount: number): void {
    const fuelNeeded = this.ships.reduce((total, ship) => {
      return total + (ship.fuelCapacity - ship.currentFuel);
    }, 0);

    const fuelToAdd = Math.min(amount, fuelNeeded);
    let remainingFuel = fuelToAdd;

    for (const ship of this.ships) {
      const shipNeedsFuel = ship.fuelCapacity - ship.currentFuel;
      const fuelForShip = Math.min(shipNeedsFuel, remainingFuel);
      ship.currentFuel += fuelForShip;
      remainingFuel -= fuelForShip;
    }
  }

  public repair(amount: number): void {
    const repairNeeded = this.ships.reduce((total, ship) => {
      return total + (ship.maxHealth - ship.health);
    }, 0);

    const repairAmount = Math.min(amount, repairNeeded);
    let remainingRepair = repairAmount;

    for (const ship of this.ships) {
      const shipNeedsRepair = ship.maxHealth - ship.health;
      const repairForShip = Math.min(shipNeedsRepair, remainingRepair);
      ship.health += repairForShip;
      remainingRepair -= repairForShip;
    }
  }
}