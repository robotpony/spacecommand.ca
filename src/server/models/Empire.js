/**
 * Empire model representing a player's galactic empire
 * Manages resources, production, planets, fleets, and technology
 */
const BaseModel = require('./BaseModel');

class Empire extends BaseModel {
  /**
   * Creates a new Empire instance
   * @param {Object} data - Empire initialization data from database
   */
  constructor(data = {}) {
    super('empires');
    
    // Map database columns to model properties
    this.id = data.id || null;
    this.playerId = data.player_id || data.playerId || null;
    this.name = data.name || '';
    this.resources = this._parseJSON(data.resources) || {
      minerals: 1000,
      energy: 1000,
      food: 1000,
      research: 0,
      population: 100
    };
    this.resourceProduction = this._parseJSON(data.resource_production) || {
      minerals: 50,
      energy: 50,
      food: 50,
      research: 10,
      population: 5
    };
    this.technology = this._parseJSON(data.technology) || {};
    this.diplomacy = this._parseJSON(data.diplomacy) || {};
    this.createdAt = data.created_at || data.createdAt || new Date();
    this.updatedAt = data.updated_at || data.updatedAt || new Date();
  }

  /**
   * Parse JSON data safely
   * @param {string|Object} data - JSON string or object
   * @returns {Object} Parsed object or original if already object
   * @private
   */
  _parseJSON(data) {
    if (!data) return null;
    if (typeof data === 'object') return data;
    try {
      return JSON.parse(data);
    } catch (error) {
      console.warn('Failed to parse JSON data:', data);
      return null;
    }
  }

  /**
   * Create a new empire in the database
   * @param {Object} empireData - Empire data
   * @returns {Promise<Empire>} Created empire instance
   * @static
   */
  static async createEmpire(empireData) {
    const model = new Empire();
    const dbData = {
      player_id: empireData.playerId,
      name: empireData.name,
      resources: JSON.stringify(empireData.resources || {
        minerals: 1000,
        energy: 1000,
        food: 1000,
        research: 0,
        population: 100
      }),
      resource_production: JSON.stringify(empireData.resourceProduction || {
        minerals: 50,
        energy: 50,
        food: 50,
        research: 10,
        population: 5
      }),
      technology: JSON.stringify(empireData.technology || {}),
      diplomacy: JSON.stringify(empireData.diplomacy || {})
    };
    
    const result = await model.create(dbData);
    return new Empire(result);
  }

  /**
   * Find empire by player ID
   * @param {string} playerId - Player ID
   * @returns {Promise<Empire|null>} Empire instance or null
   * @static
   */
  static async findByPlayerId(playerId) {
    const model = new Empire();
    const result = await model.findOne({ player_id: playerId });
    return result ? new Empire(result) : null;
  }

  /**
   * Find empire by ID
   * @param {string} id - Empire ID
   * @returns {Promise<Empire|null>} Empire instance or null
   * @static
   */
  static async findById(id) {
    const model = new Empire();
    const result = await model.findById(id);
    return result ? new Empire(result) : null;
  }

  /**
   * Save empire changes to database
   * @returns {Promise<Empire>} Updated empire instance
   */
  async save() {
    const updateData = {
      name: this.name,
      resources: JSON.stringify(this.resources),
      resource_production: JSON.stringify(this.resourceProduction),
      technology: JSON.stringify(this.technology),
      diplomacy: JSON.stringify(this.diplomacy)
    };

    if (this.id) {
      const result = await this.update(this.id, updateData);
      if (result) {
        Object.assign(this, new Empire(result));
      }
      return this;
    } else {
      throw new Error('Cannot save empire without ID. Use createEmpire() for new empires.');
    }
  }

  /**
   * Processes resource production for one turn
   * Adds production values to current resources and saves to database
   * @returns {Promise<Empire>} Updated empire instance
   */
  async processResourceProduction() {
    for (const resource in this.resourceProduction) {
      this.resources[resource] += this.resourceProduction[resource];
    }
    this.updatedAt = new Date();
    return await this.save();
  }

  /**
   * Attempts to spend resources on a purchase
   * @param {Object} cost - Resource costs {minerals: number, energy: number, etc.}
   * @returns {Promise<boolean>} True if resources were successfully spent
   */
  async spendResources(cost) {
    for (const resource in cost) {
      if (this.resources[resource] < cost[resource]) {
        return false;
      }
    }
    
    for (const resource in cost) {
      this.resources[resource] -= cost[resource];
    }
    this.updatedAt = new Date();
    await this.save();
    return true;
  }

  /**
   * Checks if empire can afford a given cost
   * @param {Object} cost - Resource costs to check
   * @returns {boolean} True if empire can afford the cost
   */
  canAfford(cost) {
    for (const resource in cost) {
      if (this.resources[resource] < cost[resource]) {
        return false;
      }
    }
    return true;
  }

  /**
   * Calculates total resource production including planet bonuses
   * @returns {Promise<Object>} Total production rates for all resources
   */
  async getTotalProduction() {
    const totalProduction = { ...this.resourceProduction };
    
    // Get planets from database (planets are in separate table now)
    const Planet = require('./Planet');
    const planets = await Planet.findByEmpireId(this.id);
    
    planets.forEach(planet => {
      const planetProduction = planet.getProduction();
      for (const resource in planetProduction) {
        totalProduction[resource] = (totalProduction[resource] || 0) + planetProduction[resource];
      }
    });
    
    return totalProduction;
  }

  /**
   * Get all planets belonging to this empire
   * @returns {Promise<Array>} Array of Planet instances
   */
  async getPlanets() {
    const Planet = require('./Planet');
    return await Planet.findByEmpireId(this.id);
  }

  /**
   * Get all fleets belonging to this empire
   * @returns {Promise<Array>} Array of Fleet instances
   */
  async getFleets() {
    const Fleet = require('./Fleet');
    return await Fleet.findByEmpireId(this.id);
  }

  /**
   * Converts empire to JSON representation
   * @returns {Object} JSON representation of empire
   */
  toJSON() {
    return {
      id: this.id,
      playerId: this.playerId,
      name: this.name,
      resources: this.resources,
      resourceProduction: this.resourceProduction,
      technology: this.technology,
      diplomacy: this.diplomacy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Converts empire to JSON representation with related data
   * @returns {Promise<Object>} JSON representation with planets and fleets
   */
  async toJSONWithRelations() {
    const [planets, fleets] = await Promise.all([
      this.getPlanets(),
      this.getFleets()
    ]);

    return {
      ...this.toJSON(),
      planets: planets.map(p => p.toJSON()),
      fleets: fleets.map(f => f.toJSON())
    };
  }
}

module.exports = Empire;