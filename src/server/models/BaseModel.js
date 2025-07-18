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
    this.tableName = this._validateTableName(tableName);
    this.db = database;
  }

  /**
   * Validates table name against allowlist to prevent SQL injection
   * @param {string} tableName - Table name to validate
   * @returns {string} Validated table name
   * @throws {Error} If table name is not in allowlist
   * @private
   */
  _validateTableName(tableName) {
    const allowedTables = [
      'players',
      'empires', 
      'planets',
      'fleets',
      'combat_records',
      'diplomacy_relations',
      'game_sessions',
      'game_state',
      'player_actions',
      'trade_routes',
      'sectors',
      'exploration_missions',
      'diplomatic_proposals',
      'agreements',
      'messages',
      'events',
      'leaderboards'
    ];

    if (!allowedTables.includes(tableName)) {
      throw new Error(`Invalid table name: ${tableName}. Table not in allowlist.`);
    }

    // Additional validation: ensure table name contains only alphanumeric characters and underscores
    if (!/^[a-z_][a-z0-9_]*$/i.test(tableName)) {
      throw new Error(`Invalid table name format: ${tableName}. Must contain only letters, numbers, and underscores.`);
    }

    return tableName;
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
    // Validate all column names to prevent SQL injection
    const validatedColumns = columns.map(col => this._validateColumnName(col));
    const values = Object.values(data);
    const placeholders = validatedColumns.map((_, index) => `$${index + 1}`);
    
    const query = `
      INSERT INTO ${this.tableName} (${validatedColumns.join(', ')})
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
    // Validate all column names to prevent SQL injection
    const validatedColumns = columns.map(col => this._validateColumnName(col));
    const values = Object.values(data);
    const setClause = validatedColumns.map((col, index) => `${col} = $${index + 2}`).join(', ');
    
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
    // Validate all column names to prevent SQL injection
    const validatedColumns = columns.map(col => this._validateColumnName(col));
    const values = Object.values(data);
    const setClause = validatedColumns.map((col, index) => 
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
      // Validate column name to prevent SQL injection
      const sanitizedKey = this._validateColumnName(key);
      const value = conditions[key];
      
      if (value === null) {
        clauses.push(`${sanitizedKey} IS NULL`);
      } else if (Array.isArray(value)) {
        const placeholders = value.map((_, i) => `$${values.length + i + 1}`);
        clauses.push(`${sanitizedKey} IN (${placeholders.join(', ')})`);
        values.push(...value);
      } else if (typeof value === 'object' && value.operator) {
        // Validate operator to prevent SQL injection
        const sanitizedOperator = this._validateOperator(value.operator);
        clauses.push(`${sanitizedKey} ${sanitizedOperator} $${values.length + 1}`);
        values.push(value.value);
      } else {
        clauses.push(`${sanitizedKey} = $${values.length + 1}`);
        values.push(value);
      }
    });
    
    return {
      clause: `WHERE ${clauses.join(' AND ')}`,
      values
    };
  }

  /**
   * Validates column name to prevent SQL injection
   * @param {string} columnName - Column name to validate
   * @returns {string} Validated column name
   * @throws {Error} If column name is invalid
   * @private
   */
  _validateColumnName(columnName) {
    // Allow only alphanumeric characters, underscores, and dots (for table.column)
    if (!/^[a-z_][a-z0-9_.]*$/i.test(columnName)) {
      throw new Error(`Invalid column name: ${columnName}. Must contain only letters, numbers, underscores, and dots.`);
    }

    // Prevent SQL keywords and dangerous patterns
    const dangerousPatterns = [
      /\b(DROP|DELETE|UPDATE|INSERT|CREATE|ALTER|EXEC|UNION|SELECT)\b/i,
      /[';-]/,
      /\/\*|\*\//
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(columnName)) {
        throw new Error(`Invalid column name: ${columnName}. Contains dangerous SQL patterns.`);
      }
    }

    return columnName;
  }

  /**
   * Validates SQL operator to prevent SQL injection
   * @param {string} operator - SQL operator to validate
   * @returns {string} Validated operator
   * @throws {Error} If operator is invalid
   * @private
   */
  _validateOperator(operator) {
    const allowedOperators = [
      '=', '!=', '<>', '<', '>', '<=', '>=',
      'LIKE', 'ILIKE', 'NOT LIKE', 'NOT ILIKE',
      'IS', 'IS NOT', 'IN', 'NOT IN',
      'BETWEEN', 'NOT BETWEEN'
    ];

    if (!allowedOperators.includes(operator.toUpperCase())) {
      throw new Error(`Invalid SQL operator: ${operator}. Not in allowlist.`);
    }

    return operator;
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