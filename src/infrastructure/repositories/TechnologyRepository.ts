import { BaseRepository, QueryOptions } from './BaseRepository';
import { TechnologyTier } from '../../shared/types';
import { PoolClient } from 'pg';
import { db } from '../database/connection';

/**
 * Represents a researchable technology in the game.
 */
export interface Technology {
  id: string;
  name: string;
  tier: TechnologyTier;
  researchCost: number;
  prerequisites: string[];
  effects: Record<string, any>;
  description: string;
}

/**
 * Represents an empire's progress on a technology.
 */
export interface EmpireTechnology {
  id: string;
  empireId: string;
  technologyId: string;
  isResearched: boolean;
  researchProgress: number;
  researchedAt?: Date;
}

/**
 * Database row structure for technologies table.
 */
interface TechnologyRow {
  id: string;
  name: string;
  tier: string;
  research_cost: number;
  prerequisites: string[];
  effects: Record<string, any>;
  description: string;
  created_at: Date;
}

/**
 * Database row structure for empire_technologies table.
 */
interface EmpireTechnologyRow {
  id: string;
  empire_id: string;
  technology_id: string;
  is_researched: boolean;
  research_progress: number;
  researched_at: Date | null;
}

/**
 * Repository for managing technology and research persistence.
 * Handles tech tree, prerequisites, and empire research progress.
 */
export class TechnologyRepository extends BaseRepository<Technology> {
  protected readonly tableName = 'technologies';

  /**
   * Converts database row to Technology entity.
   * @param {TechnologyRow} row - Database row
   * @returns {Technology} Hydrated Technology instance
   */
  protected hydrate(row: TechnologyRow): Technology {
    return {
      id: row.id,
      name: row.name,
      tier: row.tier as TechnologyTier,
      researchCost: row.research_cost,
      prerequisites: row.prerequisites || [],
      effects: row.effects || {},
      description: row.description
    };
  }

  /**
   * Converts Technology entity to database columns.
   * @param {Partial<Technology>} entity - Technology entity
   * @returns {any} Database column values
   */
  protected dehydrate(entity: Partial<Technology>): any {
    const data: any = {};

    if (entity.id !== undefined) data.id = entity.id;
    if (entity.name !== undefined) data.name = entity.name;
    if (entity.tier !== undefined) data.tier = entity.tier;
    if (entity.researchCost !== undefined) data.research_cost = entity.researchCost;
    if (entity.prerequisites !== undefined) data.prerequisites = entity.prerequisites;
    if (entity.effects !== undefined) data.effects = JSON.stringify(entity.effects);
    if (entity.description !== undefined) data.description = entity.description;

    return data;
  }

  /**
   * Finds a technology by name.
   * @param {string} name - Technology name
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<Technology | null>} Technology if found
   */
  public async findByName(
    name: string,
    client?: PoolClient
  ): Promise<Technology | null> {
    return this.findOne({ name } as any, client);
  }

  /**
   * Finds all technologies by tier.
   * @param {TechnologyTier} tier - Technology tier
   * @param {QueryOptions} options - Query options
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<Technology[]>} Array of technologies in the tier
   */
  public async findByTier(
    tier: TechnologyTier,
    options: QueryOptions = {},
    client?: PoolClient
  ): Promise<Technology[]> {
    return this.findAll({ tier } as any, options, client);
  }

  /**
   * Gets technologies available for research by an empire.
   * @param {string} empireId - Empire ID
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<Technology[]>} Array of researchable technologies
   */
  public async getAvailableForEmpire(
    empireId: string,
    client?: PoolClient
  ): Promise<Technology[]> {
    const query = `
      SELECT t.* FROM technologies t
      WHERE t.id NOT IN (
        SELECT technology_id FROM empire_technologies
        WHERE empire_id = $1 AND is_researched = true
      )
      AND NOT EXISTS (
        SELECT 1 FROM unnest(t.prerequisites) AS prereq
        WHERE prereq NOT IN (
          SELECT t2.name FROM technologies t2
          JOIN empire_technologies et ON et.technology_id = t2.id
          WHERE et.empire_id = $1 AND et.is_researched = true
        )
      )
      ORDER BY t.tier, t.research_cost
    `;

    const result = client
      ? await client.query<TechnologyRow>(query, [empireId])
      : await db.query<TechnologyRow>(query, [empireId]);

    return result.rows.map(row => this.hydrate(row));
  }

  /**
   * Gets all technologies researched by an empire.
   * @param {string} empireId - Empire ID
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<Technology[]>} Array of researched technologies
   */
  public async getResearchedByEmpire(
    empireId: string,
    client?: PoolClient
  ): Promise<Technology[]> {
    const query = `
      SELECT t.* FROM technologies t
      JOIN empire_technologies et ON et.technology_id = t.id
      WHERE et.empire_id = $1 AND et.is_researched = true
      ORDER BY et.researched_at DESC
    `;

    const result = client
      ? await client.query<TechnologyRow>(query, [empireId])
      : await db.query<TechnologyRow>(query, [empireId]);

    return result.rows.map(row => this.hydrate(row));
  }

  /**
   * Gets empire's current research project.
   * @param {string} empireId - Empire ID
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<EmpireTechnology | null>} Current research or null
   */
  public async getCurrentResearch(
    empireId: string,
    client?: PoolClient
  ): Promise<EmpireTechnology | null> {
    const query = `
      SELECT * FROM empire_technologies
      WHERE empire_id = $1 
        AND is_researched = false 
        AND research_progress > 0
      ORDER BY research_progress DESC
      LIMIT 1
    `;

    const result = client
      ? await client.query<EmpireTechnologyRow>(query, [empireId])
      : await db.query<EmpireTechnologyRow>(query, [empireId]);

    if (result.rows.length === 0) return null;

    return this.hydrateEmpireTechnology(result.rows[0]);
  }

  /**
   * Converts database row to EmpireTechnology entity.
   * @param {EmpireTechnologyRow} row - Database row
   * @returns {EmpireTechnology} Hydrated EmpireTechnology instance
   */
  private hydrateEmpireTechnology(row: EmpireTechnologyRow): EmpireTechnology {
    return {
      id: row.id,
      empireId: row.empire_id,
      technologyId: row.technology_id,
      isResearched: row.is_researched,
      researchProgress: row.research_progress,
      researchedAt: row.researched_at || undefined
    };
  }

  /**
   * Starts or continues research on a technology.
   * @param {string} empireId - Empire ID
   * @param {string} technologyId - Technology ID
   * @param {number} progress - Research points to add
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<boolean>} True if research updated successfully
   */
  public async addResearchProgress(
    empireId: string,
    technologyId: string,
    progress: number,
    client?: PoolClient
  ): Promise<boolean> {
    const query = `
      INSERT INTO empire_technologies (empire_id, technology_id, research_progress)
      VALUES ($1, $2, $3)
      ON CONFLICT (empire_id, technology_id)
      DO UPDATE SET 
        research_progress = empire_technologies.research_progress + $3
    `;

    const result = client
      ? await client.query(query, [empireId, technologyId, progress])
      : await db.query(query, [empireId, technologyId, progress]);

    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Completes research on a technology.
   * @param {string} empireId - Empire ID
   * @param {string} technologyId - Technology ID
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<boolean>} True if research completed successfully
   */
  public async completeResearch(
    empireId: string,
    technologyId: string,
    client?: PoolClient
  ): Promise<boolean> {
    const query = `
      UPDATE empire_technologies
      SET is_researched = true,
          researched_at = NOW()
      WHERE empire_id = $1 
        AND technology_id = $2
        AND is_researched = false
    `;

    const result = client
      ? await client.query(query, [empireId, technologyId])
      : await db.query(query, [empireId, technologyId]);

    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Checks if an empire has researched a specific technology.
   * @param {string} empireId - Empire ID
   * @param {string} technologyId - Technology ID
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<boolean>} True if technology is researched
   */
  public async hasResearched(
    empireId: string,
    technologyId: string,
    client?: PoolClient
  ): Promise<boolean> {
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM empire_technologies
        WHERE empire_id = $1 
          AND technology_id = $2
          AND is_researched = true
      )
    `;

    const result = client
      ? await client.query(query, [empireId, technologyId])
      : await db.query(query, [empireId, technologyId]);

    return result.rows[0].exists;
  }

  /**
   * Gets research progress for a specific technology.
   * @param {string} empireId - Empire ID
   * @param {string} technologyId - Technology ID
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<number>} Research progress points
   */
  public async getResearchProgress(
    empireId: string,
    technologyId: string,
    client?: PoolClient
  ): Promise<number> {
    const query = `
      SELECT research_progress FROM empire_technologies
      WHERE empire_id = $1 AND technology_id = $2
    `;

    const result = client
      ? await client.query(query, [empireId, technologyId])
      : await db.query(query, [empireId, technologyId]);

    return result.rows[0]?.research_progress || 0;
  }

  /**
   * Gets the technology tree structure.
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<Map<string, Technology[]>>} Tech tree by tier
   */
  public async getTechTree(client?: PoolClient): Promise<Map<string, Technology[]>> {
    const query = `
      SELECT * FROM technologies
      ORDER BY tier, research_cost
    `;

    const result = client
      ? await client.query<TechnologyRow>(query)
      : await db.query<TechnologyRow>(query);

    const techTree = new Map<string, Technology[]>();
    
    for (const row of result.rows) {
      const tech = this.hydrate(row);
      const tierTechs = techTree.get(tech.tier) || [];
      tierTechs.push(tech);
      techTree.set(tech.tier, tierTechs);
    }

    return techTree;
  }

  /**
   * Grants a technology to an empire (for events or cheats).
   * @param {string} empireId - Empire ID
   * @param {string} technologyId - Technology ID
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<boolean>} True if granted successfully
   */
  public async grantTechnology(
    empireId: string,
    technologyId: string,
    client?: PoolClient
  ): Promise<boolean> {
    const query = `
      INSERT INTO empire_technologies (
        empire_id, technology_id, is_researched, 
        research_progress, researched_at
      )
      VALUES ($1, $2, true, 
        (SELECT research_cost FROM technologies WHERE id = $2),
        NOW()
      )
      ON CONFLICT (empire_id, technology_id)
      DO UPDATE SET 
        is_researched = true,
        researched_at = NOW()
    `;

    const result = client
      ? await client.query(query, [empireId, technologyId])
      : await db.query(query, [empireId, technologyId]);

    return (result.rowCount ?? 0) > 0;
  }
}