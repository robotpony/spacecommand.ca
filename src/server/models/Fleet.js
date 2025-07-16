class Fleet {
  constructor(data = {}) {
    this.id = data.id || null;
    this.empireId = data.empireId || null;
    this.name = data.name || '';
    this.position = data.position || { x: 0, y: 0, z: 0 };
    this.destination = data.destination || null;
    this.status = data.status || 'idle';
    this.ships = data.ships || [];
    this.commander = data.commander || null;
    this.experience = data.experience || 0;
    this.morale = data.morale || 100;
    this.supplies = data.supplies || 100;
    this.speed = data.speed || 1;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  static SHIP_TYPES = {
    fighter: {
      name: 'Fighter',
      cost: { minerals: 50, energy: 30 },
      stats: { attack: 10, defense: 5, speed: 3, cargo: 1 },
      role: 'interceptor'
    },
    corvette: {
      name: 'Corvette',
      cost: { minerals: 100, energy: 60 },
      stats: { attack: 20, defense: 15, speed: 2, cargo: 5 },
      role: 'escort'
    },
    destroyer: {
      name: 'Destroyer',
      cost: { minerals: 200, energy: 120 },
      stats: { attack: 40, defense: 30, speed: 2, cargo: 10 },
      role: 'anti-ship'
    },
    cruiser: {
      name: 'Cruiser',
      cost: { minerals: 400, energy: 250 },
      stats: { attack: 60, defense: 50, speed: 1, cargo: 20 },
      role: 'heavy-combat'
    },
    battleship: {
      name: 'Battleship',
      cost: { minerals: 800, energy: 500 },
      stats: { attack: 120, defense: 100, speed: 1, cargo: 30 },
      role: 'capital'
    },
    carrier: {
      name: 'Carrier',
      cost: { minerals: 600, energy: 400 },
      stats: { attack: 30, defense: 60, speed: 1, cargo: 50 },
      role: 'support',
      fighterCapacity: 20
    },
    transport: {
      name: 'Transport',
      cost: { minerals: 150, energy: 80 },
      stats: { attack: 5, defense: 10, speed: 2, cargo: 100 },
      role: 'logistics'
    }
  };

  static FLEET_STATUSES = {
    idle: 'Idle',
    moving: 'Moving',
    attacking: 'Attacking',
    defending: 'Defending',
    patrolling: 'Patrolling',
    retreating: 'Retreating',
    docked: 'Docked'
  };

  addShip(shipType, quantity = 1) {
    const existingShip = this.ships.find(s => s.type === shipType);
    
    if (existingShip) {
      existingShip.quantity += quantity;
    } else {
      this.ships.push({
        type: shipType,
        quantity: quantity,
        damage: 0,
        experience: 0
      });
    }
    
    this.updateFleetStats();
    this.updatedAt = new Date();
  }

  removeShip(shipType, quantity = 1) {
    const shipIndex = this.ships.findIndex(s => s.type === shipType);
    
    if (shipIndex !== -1) {
      this.ships[shipIndex].quantity -= quantity;
      
      if (this.ships[shipIndex].quantity <= 0) {
        this.ships.splice(shipIndex, 1);
      }
    }
    
    this.updateFleetStats();
    this.updatedAt = new Date();
  }

  updateFleetStats() {
    let totalSpeed = 0;
    let shipCount = 0;
    
    this.ships.forEach(ship => {
      const shipType = Fleet.SHIP_TYPES[ship.type];
      if (shipType) {
        totalSpeed += shipType.stats.speed * ship.quantity;
        shipCount += ship.quantity;
      }
    });
    
    this.speed = shipCount > 0 ? Math.floor(totalSpeed / shipCount) : 1;
  }

  getTotalAttack() {
    return this.ships.reduce((total, ship) => {
      const shipType = Fleet.SHIP_TYPES[ship.type];
      if (shipType) {
        const effectiveQuantity = ship.quantity * (1 - ship.damage / 100);
        return total + (shipType.stats.attack * effectiveQuantity);
      }
      return total;
    }, 0);
  }

  getTotalDefense() {
    return this.ships.reduce((total, ship) => {
      const shipType = Fleet.SHIP_TYPES[ship.type];
      if (shipType) {
        const effectiveQuantity = ship.quantity * (1 - ship.damage / 100);
        return total + (shipType.stats.defense * effectiveQuantity);
      }
      return total;
    }, 0);
  }

  getTotalCargo() {
    return this.ships.reduce((total, ship) => {
      const shipType = Fleet.SHIP_TYPES[ship.type];
      if (shipType) {
        return total + (shipType.stats.cargo * ship.quantity);
      }
      return total;
    }, 0);
  }

  getFleetSize() {
    return this.ships.reduce((total, ship) => total + ship.quantity, 0);
  }

  moveTo(destination) {
    this.destination = destination;
    this.status = 'moving';
    this.updatedAt = new Date();
  }

  attack(target) {
    this.status = 'attacking';
    this.updatedAt = new Date();
  }

  retreat() {
    this.status = 'retreating';
    this.updatedAt = new Date();
  }

  resupply() {
    this.supplies = 100;
    this.morale = Math.min(this.morale + 10, 100);
    this.updatedAt = new Date();
  }

  takeDamage(damage) {
    if (this.ships.length === 0) return;
    
    const totalShips = this.getFleetSize();
    const damagePerShip = damage / totalShips;
    
    this.ships.forEach(ship => {
      ship.damage = Math.min(ship.damage + damagePerShip, 100);
    });
    
    this.ships = this.ships.filter(ship => ship.damage < 100);
    this.updateFleetStats();
    this.updatedAt = new Date();
  }

  gainExperience(amount) {
    this.experience += amount;
    this.ships.forEach(ship => {
      ship.experience += amount;
    });
    this.updatedAt = new Date();
  }

  split(shipTypes) {
    const newFleet = new Fleet({
      empireId: this.empireId,
      name: `${this.name} Squadron`,
      position: { ...this.position },
      commander: null,
      experience: this.experience,
      morale: this.morale,
      supplies: this.supplies
    });
    
    shipTypes.forEach(({ type, quantity }) => {
      const shipIndex = this.ships.findIndex(s => s.type === type);
      if (shipIndex !== -1 && this.ships[shipIndex].quantity >= quantity) {
        newFleet.addShip(type, quantity);
        this.removeShip(type, quantity);
      }
    });
    
    return newFleet;
  }

  merge(otherFleet) {
    if (otherFleet.empireId !== this.empireId) {
      throw new Error('Cannot merge fleets from different empires');
    }
    
    otherFleet.ships.forEach(ship => {
      this.addShip(ship.type, ship.quantity);
    });
    
    this.experience = Math.floor((this.experience + otherFleet.experience) / 2);
    this.morale = Math.floor((this.morale + otherFleet.morale) / 2);
    this.supplies = Math.floor((this.supplies + otherFleet.supplies) / 2);
    
    this.updateFleetStats();
    this.updatedAt = new Date();
  }

  toJSON() {
    return {
      id: this.id,
      empireId: this.empireId,
      name: this.name,
      position: this.position,
      destination: this.destination,
      status: this.status,
      ships: this.ships,
      commander: this.commander,
      experience: this.experience,
      morale: this.morale,
      supplies: this.supplies,
      speed: this.speed,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = Fleet;