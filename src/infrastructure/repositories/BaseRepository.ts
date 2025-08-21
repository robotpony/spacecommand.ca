import { PoolClient } from 'pg';
import { db, DatabaseError } from '../database/connection';

/**
 * Generic type for entities with an id field.
 */
export interface Entity {
  id: string;
}

/**
 * Options for query operations.
 */
export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

/**
 * Result wrapper for paginated queries.
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * Abstract base repository providing common CRUD operations.
 * Handles database interactions, entity hydration, and error handling.
 * Subclasses must implement entity-specific logic.
 */
export abstract class BaseRepository<T extends Entity> {
  protected abstract readonly tableName: string;
  
  /**
   * Converts a database row to an entity instance.
   * @param {any} row - Raw database row
   * @returns {T} Hydrated entity instance
   */
  protected abstract hydrate(row: any): T;
  
  /**
   * Converts an entity to database column values.
   * @param {Partial<T>} entity - Entity to dehydrate
   * @returns {any} Object with database column values
   */
  protected abstract dehydrate(entity: Partial<T>): any;
  
  /**
   * Finds an entity by its ID.
   * @param {string} id - Entity ID
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<T | null>} Entity if found, null otherwise
   */
  public async findById(id: string, client?: PoolClient): Promise<T | null> {
    const query = `SELECT * FROM ${this.tableName} WHERE id = $1`;
    const result = client 
      ? await client.query(query, [id])
      : await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.hydrate(result.rows[0]);
  }
  
  /**
   * Finds all entities matching the given conditions.
   * @param {Partial<T>} conditions - Filter conditions
   * @param {QueryOptions} options - Query options for pagination and sorting
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<T[]>} Array of matching entities
   */
  public async findAll(
    conditions: Partial<T> = {},
    options: QueryOptions = {},
    client?: PoolClient
  ): Promise<T[]> {
    const { query, params } = this.buildSelectQuery(conditions, options);
    
    const result = client 
      ? await client.query(query, params)
      : await db.query(query, params);
    
    return result.rows.map(row => this.hydrate(row));
  }
  
  /**
   * Finds entities with pagination information.
   * @param {Partial<T>} conditions - Filter conditions
   * @param {QueryOptions} options - Query options including pagination
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<PaginatedResult<T>>} Paginated result with metadata
   */
  public async findPaginated(
    conditions: Partial<T> = {},
    options: QueryOptions = {},
    client?: PoolClient
  ): Promise<PaginatedResult<T>> {
    const limit = options.limit || 20;
    const offset = options.offset || 0;
    
    // Get total count
    const countQuery = `SELECT COUNT(*) FROM ${this.tableName} ${this.buildWhereClause(conditions).query}`;
    const countParams = this.buildWhereClause(conditions).params;
    const countResult = client 
      ? await client.query(countQuery, countParams)
      : await db.query(countQuery, countParams);
    
    const total = parseInt(countResult.rows[0].count);
    
    // Get paginated data
    const data = await this.findAll(conditions, { ...options, limit, offset }, client);
    
    return {
      data,
      total,
      limit,
      offset,
      hasMore: offset + data.length < total
    };
  }
  
  /**
   * Finds a single entity matching conditions.
   * @param {Partial<T>} conditions - Filter conditions
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<T | null>} First matching entity or null
   */
  public async findOne(
    conditions: Partial<T>,
    client?: PoolClient
  ): Promise<T | null> {
    const results = await this.findAll(conditions, { limit: 1 }, client);
    return results.length > 0 ? results[0] : null;
  }
  
  /**
   * Creates a new entity in the database.
   * @param {Partial<T>} data - Entity data to insert
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<T>} Created entity with generated ID
   * @throws {DatabaseError} On constraint violations or insert failures
   */
  public async create(data: Partial<T>, client?: PoolClient): Promise<T> {
    const dbData = this.dehydrate(data);
    const columns = Object.keys(dbData);
    const values = Object.values(dbData);
    const placeholders = columns.map((_, i) => `$${i + 1}`);
    
    const query = `
      INSERT INTO ${this.tableName} (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `;
    
    try {
      const result = client 
        ? await client.query(query, values)
        : await db.query(query, values);
      
      return this.hydrate(result.rows[0]);
    } catch (error: any) {
      if (error.code === '23505') { // Unique violation
        throw new DatabaseError(
          `Duplicate key violation in ${this.tableName}`,
          error.code,
          error.detail
        );
      }
      throw error;
    }
  }
  
  /**
   * Updates an existing entity.
   * @param {string} id - Entity ID to update
   * @param {Partial<T>} data - Fields to update
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<T | null>} Updated entity or null if not found
   */
  public async update(
    id: string,
    data: Partial<T>,
    client?: PoolClient
  ): Promise<T | null> {
    const dbData = this.dehydrate(data);
    delete dbData.id; // Don't update the ID
    
    if (Object.keys(dbData).length === 0) {
      return this.findById(id, client);
    }
    
    const columns = Object.keys(dbData);
    const values = Object.values(dbData);
    const setClause = columns.map((col, i) => `${col} = $${i + 2}`).join(', ');
    
    const query = `
      UPDATE ${this.tableName}
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const result = client 
      ? await client.query(query, [id, ...values])
      : await db.query(query, [id, ...values]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.hydrate(result.rows[0]);
  }
  
  /**
   * Deletes an entity by ID.
   * @param {string} id - Entity ID to delete
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<boolean>} True if entity was deleted
   */
  public async delete(id: string, client?: PoolClient): Promise<boolean> {
    const query = `DELETE FROM ${this.tableName} WHERE id = $1`;
    
    const result = client 
      ? await client.query(query, [id])
      : await db.query(query, [id]);
    
    return (result.rowCount ?? 0) > 0;
  }
  
  /**
   * Checks if an entity exists with given conditions.
   * @param {Partial<T>} conditions - Filter conditions
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<boolean>} True if at least one entity exists
   */
  public async exists(
    conditions: Partial<T>,
    client?: PoolClient
  ): Promise<boolean> {
    const { query, params } = this.buildWhereClause(conditions);
    const existsQuery = `SELECT EXISTS(SELECT 1 FROM ${this.tableName} ${query})`;
    
    const result = client 
      ? await client.query(existsQuery, params)
      : await db.query(existsQuery, params);
    
    return result.rows[0].exists;
  }
  
  /**
   * Counts entities matching conditions.
   * @param {Partial<T>} conditions - Filter conditions
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<number>} Count of matching entities
   */
  public async count(
    conditions: Partial<T> = {},
    client?: PoolClient
  ): Promise<number> {
    const { query, params } = this.buildWhereClause(conditions);
    const countQuery = `SELECT COUNT(*) FROM ${this.tableName} ${query}`;
    
    const result = client 
      ? await client.query(countQuery, params)
      : await db.query(countQuery, params);
    
    return parseInt(result.rows[0].count);
  }
  
  /**
   * Builds a WHERE clause from conditions.
   * @param {Partial<T>} conditions - Filter conditions
   * @returns {{ query: string, params: any[] }} WHERE clause and parameters
   */
  protected buildWhereClause(conditions: Partial<T>): { query: string; params: any[] } {
    const dbConditions = this.dehydrate(conditions);
    const keys = Object.keys(dbConditions);
    
    if (keys.length === 0) {
      return { query: '', params: [] };
    }
    
    const clauses = keys.map((key, i) => `${key} = $${i + 1}`);
    const params = keys.map(key => dbConditions[key]);
    
    return {
      query: `WHERE ${clauses.join(' AND ')}`,
      params
    };
  }
  
  /**
   * Builds a complete SELECT query with conditions and options.
   * @param {Partial<T>} conditions - Filter conditions
   * @param {QueryOptions} options - Query options
   * @returns {{ query: string, params: any[] }} Complete query and parameters
   */
  protected buildSelectQuery(
    conditions: Partial<T>,
    options: QueryOptions
  ): { query: string; params: any[] } {
    const { query: whereClause, params } = this.buildWhereClause(conditions);
    
    let query = `SELECT * FROM ${this.tableName} ${whereClause}`;
    
    if (options.orderBy) {
      const direction = options.orderDirection || 'ASC';
      query += ` ORDER BY ${options.orderBy} ${direction}`;
    }
    
    if (options.limit) {
      query += ` LIMIT ${options.limit}`;
    }
    
    if (options.offset) {
      query += ` OFFSET ${options.offset}`;
    }
    
    return { query, params };
  }
  
  /**
   * Executes a raw SQL query.
   * Use with caution - prefer type-safe methods when possible.
   * @param {string} query - SQL query
   * @param {any[]} params - Query parameters
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<T[]>} Array of hydrated entities
   */
  public async raw(
    query: string,
    params: any[] = [],
    client?: PoolClient
  ): Promise<T[]> {
    const result = client 
      ? await client.query(query, params)
      : await db.query(query, params);
    
    return result.rows.map(row => this.hydrate(row));
  }
}