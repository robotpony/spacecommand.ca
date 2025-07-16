/**
 * Base model class providing common database operations
 * All data models extend this class for consistent CRUD functionality
 */

const database = require('../config/database');

class BaseModel {
  /**
   * Creates a new BaseModel instance
   * @param {string} tableName - Database table name
   */
  constructor(tableName) {
    this.tableName = tableName;
    this.db = database;
  }

  /**
   * Create a new record in the database
   * @param {Object} data - Record data to insert
   * @param {Object} client - Optional transaction client
   * @returns {Promise<Object>} Created record
   */
  async create(data, client = null) {
    const dbClient = client || this.db;
    
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map((_, index) => `$${index + 1}`);
    
    const query = `
      INSERT INTO ${this.tableName} (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `;
    
    const result = await dbClient.query(query, values);
    return result.rows[0];
  }

  /**
   * Find a record by ID
   * @param {string} id - Record ID
   * @returns {Promise<Object|null>} Found record or null
   */
  async findById(id) {
    const query = `SELECT * FROM ${this.tableName} WHERE id = $1`;
    const result = await this.db.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Find records by conditions
   * @param {Object} conditions - WHERE conditions
   * @param {Object} options - Query options (limit, offset, orderBy)
   * @returns {Promise<Array>} Found records
   */
  async find(conditions = {}, options = {}) {
    const whereClause = this._buildWhereClause(conditions);
    const orderClause = this._buildOrderClause(options.orderBy);
    const limitClause = this._buildLimitClause(options.limit, options.offset);
    
    const query = `
      SELECT * FROM ${this.tableName}
      ${whereClause.clause}
      ${orderClause}
      ${limitClause}
    `;
    
    const result = await this.db.query(query, whereClause.values);
    return result.rows;
  }

  /**
   * Find a single record by conditions
   * @param {Object} conditions - WHERE conditions
   * @returns {Promise<Object|null>} Found record or null
   */
  async findOne(conditions = {}) {
    const records = await this.find(conditions, { limit: 1 });
    return records[0] || null;
  }

  /**
   * Update a record by ID
   * @param {string} id - Record ID
   * @param {Object} data - Data to update
   * @param {Object} client - Optional transaction client
   * @returns {Promise<Object|null>} Updated record or null
   */
  async update(id, data, client = null) {
    const dbClient = client || this.db;
    
    const columns = Object.keys(data);
    const values = Object.values(data);
    const setClause = columns.map((col, index) => `${col} = $${index + 2}`).join(', ');
    
    const query = `
      UPDATE ${this.tableName}
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await dbClient.query(query, [id, ...values]);
    return result.rows[0] || null;
  }

  /**
   * Update records by conditions
   * @param {Object} conditions - WHERE conditions
   * @param {Object} data - Data to update
   * @param {Object} client - Optional transaction client
   * @returns {Promise<Array>} Updated records
   */
  async updateWhere(conditions, data, client = null) {
    const dbClient = client || this.db;
    
    const whereClause = this._buildWhereClause(conditions);
    const columns = Object.keys(data);
    const values = Object.values(data);
    const setClause = columns.map((col, index) => 
      `${col} = $${index + whereClause.values.length + 1}`
    ).join(', ');
    
    const query = `
      UPDATE ${this.tableName}
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      ${whereClause.clause}
      RETURNING *
    `;
    
    const result = await dbClient.query(query, [...whereClause.values, ...values]);
    return result.rows;
  }

  /**
   * Delete a record by ID
   * @param {string} id - Record ID
   * @param {Object} client - Optional transaction client
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  async delete(id, client = null) {
    const dbClient = client || this.db;
    
    const query = `DELETE FROM ${this.tableName} WHERE id = $1`;
    const result = await dbClient.query(query, [id]);
    return result.rowCount > 0;
  }

  /**
   * Soft delete a record by ID (set is_active = false)
   * @param {string} id - Record ID
   * @param {Object} client - Optional transaction client
   * @returns {Promise<Object|null>} Updated record or null
   */
  async softDelete(id, client = null) {
    return await this.update(id, { is_active: false }, client);
  }

  /**
   * Count records matching conditions
   * @param {Object} conditions - WHERE conditions
   * @returns {Promise<number>} Record count
   */
  async count(conditions = {}) {
    const whereClause = this._buildWhereClause(conditions);
    
    const query = `
      SELECT COUNT(*) as count FROM ${this.tableName}
      ${whereClause.clause}
    `;
    
    const result = await this.db.query(query, whereClause.values);
    return parseInt(result.rows[0].count);
  }

  /**
   * Check if record exists
   * @param {Object} conditions - WHERE conditions
   * @returns {Promise<boolean>} True if exists, false otherwise
   */
  async exists(conditions = {}) {
    const count = await this.count(conditions);
    return count > 0;
  }

  /**
   * Execute a raw SQL query
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Object>} Query result
   */
  async raw(query, params = []) {
    return await this.db.query(query, params);
  }

  /**
   * Execute within a transaction
   * @param {Function} callback - Transaction callback
   * @returns {Promise<any>} Transaction result
   */
  async transaction(callback) {
    return await this.db.transaction(callback);
  }

  /**
   * Build WHERE clause from conditions object
   * @param {Object} conditions - Conditions object
   * @returns {Object} {clause, values}
   * @private
   */
  _buildWhereClause(conditions) {
    const keys = Object.keys(conditions);
    
    if (keys.length === 0) {
      return { clause: '', values: [] };
    }
    
    const clauses = [];
    const values = [];
    
    keys.forEach((key, index) => {
      const value = conditions[key];
      
      if (value === null) {
        clauses.push(`${key} IS NULL`);
      } else if (Array.isArray(value)) {
        const placeholders = value.map((_, i) => `$${values.length + i + 1}`);
        clauses.push(`${key} IN (${placeholders.join(', ')})`);
        values.push(...value);
      } else if (typeof value === 'object' && value.operator) {
        clauses.push(`${key} ${value.operator} $${values.length + 1}`);
        values.push(value.value);
      } else {
        clauses.push(`${key} = $${values.length + 1}`);
        values.push(value);
      }
    });
    
    return {
      clause: `WHERE ${clauses.join(' AND ')}`,
      values
    };
  }

  /**
   * Build ORDER BY clause
   * @param {string|Array} orderBy - Order specification
   * @returns {string} ORDER BY clause
   * @private
   */
  _buildOrderClause(orderBy) {
    if (!orderBy) return '';
    
    if (typeof orderBy === 'string') {
      return `ORDER BY ${orderBy}`;
    }
    
    if (Array.isArray(orderBy)) {
      return `ORDER BY ${orderBy.join(', ')}`;
    }
    
    return '';
  }

  /**
   * Build LIMIT and OFFSET clause
   * @param {number} limit - Limit value
   * @param {number} offset - Offset value
   * @returns {string} LIMIT/OFFSET clause
   * @private
   */
  _buildLimitClause(limit, offset) {
    let clause = '';
    
    if (limit) {
      clause += `LIMIT ${limit}`;
    }
    
    if (offset) {
      clause += ` OFFSET ${offset}`;
    }
    
    return clause;
  }
}

module.exports = BaseModel;