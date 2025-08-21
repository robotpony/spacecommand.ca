import { BaseRepository, QueryOptions } from './BaseRepository';
import { DiplomaticStatus } from '../../shared/types';
import { PoolClient } from 'pg';
import { db } from '../database/connection';

/**
 * Represents diplomatic relations between two empires.
 */
export interface DiplomaticRelation {
  id: string;
  empireId: string;
  targetEmpireId: string;
  status: DiplomaticStatus;
  trustLevel: number;
  lastInteraction: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Represents a trade agreement between empires.
 */
export interface TradeAgreement {
  id: string;
  relationId: string;
  agreementType: string;
  terms: Record<string, any>;
  expiresAt?: Date;
  isActive: boolean;
  createdAt?: Date;
}

/**
 * Database row structure for diplomatic_relations table.
 */
interface DiplomaticRelationRow {
  id: string;
  empire_id: string;
  target_empire_id: string;
  status: string;
  trust_level: number;
  last_interaction: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * Database row structure for trade_agreements table.
 */
interface TradeAgreementRow {
  id: string;
  relation_id: string;
  agreement_type: string;
  terms: Record<string, any>;
  expires_at: Date | null;
  is_active: boolean;
  created_at: Date;
}

/**
 * Repository for managing diplomatic relations and trade agreements.
 * Handles alliance formation, war declarations, and trade negotiations.
 */
export class DiplomacyRepository extends BaseRepository<DiplomaticRelation> {
  protected readonly tableName = 'diplomatic_relations';

  /**
   * Converts database row to DiplomaticRelation entity.
   * @param {DiplomaticRelationRow} row - Database row
   * @returns {DiplomaticRelation} Hydrated DiplomaticRelation instance
   */
  protected hydrate(row: DiplomaticRelationRow): DiplomaticRelation {
    return {
      id: row.id,
      empireId: row.empire_id,
      targetEmpireId: row.target_empire_id,
      status: row.status as DiplomaticStatus,
      trustLevel: row.trust_level,
      lastInteraction: row.last_interaction,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Converts DiplomaticRelation entity to database columns.
   * @param {Partial<DiplomaticRelation>} entity - DiplomaticRelation entity
   * @returns {any} Database column values
   */
  protected dehydrate(entity: Partial<DiplomaticRelation>): any {
    const data: any = {};

    if (entity.id !== undefined) data.id = entity.id;
    if (entity.empireId !== undefined) data.empire_id = entity.empireId;
    if (entity.targetEmpireId !== undefined) data.target_empire_id = entity.targetEmpireId;
    if (entity.status !== undefined) data.status = entity.status;
    if (entity.trustLevel !== undefined) data.trust_level = entity.trustLevel;
    if (entity.lastInteraction !== undefined) data.last_interaction = entity.lastInteraction;

    return data;
  }

  /**
   * Gets or creates a diplomatic relation between two empires.
   * @param {string} empireId - First empire ID
   * @param {string} targetEmpireId - Second empire ID
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<DiplomaticRelation>} Diplomatic relation
   */
  public async getOrCreateRelation(
    empireId: string,
    targetEmpireId: string,
    client?: PoolClient
  ): Promise<DiplomaticRelation> {
    const query = `
      INSERT INTO diplomatic_relations (empire_id, target_empire_id)
      VALUES ($1, $2)
      ON CONFLICT (empire_id, target_empire_id)
      DO UPDATE SET 
        last_interaction = NOW(),
        updated_at = NOW()
      RETURNING *
    `;

    const result = client
      ? await client.query<DiplomaticRelationRow>(query, [empireId, targetEmpireId])
      : await db.query<DiplomaticRelationRow>(query, [empireId, targetEmpireId]);

    return this.hydrate(result.rows[0]);
  }

  /**
   * Gets all diplomatic relations for an empire.
   * @param {string} empireId - Empire ID
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<DiplomaticRelation[]>} Array of diplomatic relations
   */
  public async getEmpireRelations(
    empireId: string,
    client?: PoolClient
  ): Promise<DiplomaticRelation[]> {
    const query = `
      SELECT * FROM diplomatic_relations
      WHERE empire_id = $1 OR target_empire_id = $1
      ORDER BY status, trust_level DESC
    `;

    const result = client
      ? await client.query<DiplomaticRelationRow>(query, [empireId])
      : await db.query<DiplomaticRelationRow>(query, [empireId]);

    return result.rows.map(row => this.hydrate(row));
  }

  /**
   * Gets relations by diplomatic status.
   * @param {string} empireId - Empire ID
   * @param {DiplomaticStatus} status - Diplomatic status
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<DiplomaticRelation[]>} Array of relations with given status
   */
  public async getRelationsByStatus(
    empireId: string,
    status: DiplomaticStatus,
    client?: PoolClient
  ): Promise<DiplomaticRelation[]> {
    const query = `
      SELECT * FROM diplomatic_relations
      WHERE (empire_id = $1 OR target_empire_id = $1)
        AND status = $2
      ORDER BY trust_level DESC
    `;

    const result = client
      ? await client.query<DiplomaticRelationRow>(query, [empireId, status])
      : await db.query<DiplomaticRelationRow>(query, [empireId, status]);

    return result.rows.map(row => this.hydrate(row));
  }

  /**
   * Updates diplomatic status between empires.
   * @param {string} empireId - First empire ID
   * @param {string} targetEmpireId - Second empire ID
   * @param {DiplomaticStatus} status - New status
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<boolean>} True if updated successfully
   */
  public async updateStatus(
    empireId: string,
    targetEmpireId: string,
    status: DiplomaticStatus,
    client?: PoolClient
  ): Promise<boolean> {
    const query = `
      UPDATE diplomatic_relations
      SET status = $3,
          last_interaction = NOW(),
          updated_at = NOW()
      WHERE (empire_id = $1 AND target_empire_id = $2)
         OR (empire_id = $2 AND target_empire_id = $1)
    `;

    const result = client
      ? await client.query(query, [empireId, targetEmpireId, status])
      : await db.query(query, [empireId, targetEmpireId, status]);

    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Updates trust level between empires.
   * @param {string} empireId - First empire ID
   * @param {string} targetEmpireId - Second empire ID
   * @param {number} trustChange - Trust level change (positive or negative)
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<boolean>} True if updated successfully
   */
  public async updateTrust(
    empireId: string,
    targetEmpireId: string,
    trustChange: number,
    client?: PoolClient
  ): Promise<boolean> {
    const query = `
      UPDATE diplomatic_relations
      SET trust_level = LEAST(100, GREATEST(-100, trust_level + $3)),
          last_interaction = NOW(),
          updated_at = NOW()
      WHERE (empire_id = $1 AND target_empire_id = $2)
         OR (empire_id = $2 AND target_empire_id = $1)
    `;

    const result = client
      ? await client.query(query, [empireId, targetEmpireId, trustChange])
      : await db.query(query, [empireId, targetEmpireId, trustChange]);

    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Declares war between two empires.
   * @param {string} empireId - Aggressor empire ID
   * @param {string} targetEmpireId - Target empire ID
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<boolean>} True if war declared successfully
   */
  public async declareWar(
    empireId: string,
    targetEmpireId: string,
    client?: PoolClient
  ): Promise<boolean> {
    return this.updateStatus(empireId, targetEmpireId, 'war', client);
  }

  /**
   * Forms an alliance between two empires.
   * @param {string} empireId - First empire ID
   * @param {string} targetEmpireId - Second empire ID
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<boolean>} True if alliance formed successfully
   */
  public async formAlliance(
    empireId: string,
    targetEmpireId: string,
    client?: PoolClient
  ): Promise<boolean> {
    return this.updateStatus(empireId, targetEmpireId, 'allied', client);
  }

  /**
   * Gets all allies of an empire.
   * @param {string} empireId - Empire ID
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<string[]>} Array of allied empire IDs
   */
  public async getAllies(
    empireId: string,
    client?: PoolClient
  ): Promise<string[]> {
    const query = `
      SELECT 
        CASE 
          WHEN empire_id = $1 THEN target_empire_id
          ELSE empire_id
        END as ally_id
      FROM diplomatic_relations
      WHERE (empire_id = $1 OR target_empire_id = $1)
        AND status = 'allied'
    `;

    const result = client
      ? await client.query(query, [empireId])
      : await db.query(query, [empireId]);

    return result.rows.map(row => row.ally_id);
  }

  /**
   * Gets all enemies of an empire.
   * @param {string} empireId - Empire ID
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<string[]>} Array of enemy empire IDs
   */
  public async getEnemies(
    empireId: string,
    client?: PoolClient
  ): Promise<string[]> {
    const query = `
      SELECT 
        CASE 
          WHEN empire_id = $1 THEN target_empire_id
          ELSE empire_id
        END as enemy_id
      FROM diplomatic_relations
      WHERE (empire_id = $1 OR target_empire_id = $1)
        AND status IN ('war', 'hostile')
    `;

    const result = client
      ? await client.query(query, [empireId])
      : await db.query(query, [empireId]);

    return result.rows.map(row => row.enemy_id);
  }

  /**
   * Creates a trade agreement between empires.
   * @param {TradeAgreement} agreement - Trade agreement to create
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<TradeAgreement>} Created trade agreement
   */
  public async createTradeAgreement(
    agreement: Omit<TradeAgreement, 'id' | 'createdAt'>,
    client?: PoolClient
  ): Promise<TradeAgreement> {
    const query = `
      INSERT INTO trade_agreements (
        relation_id, agreement_type, terms,
        expires_at, is_active
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const params = [
      agreement.relationId,
      agreement.agreementType,
      JSON.stringify(agreement.terms),
      agreement.expiresAt,
      agreement.isActive
    ];

    const result = client
      ? await client.query<TradeAgreementRow>(query, params)
      : await db.query<TradeAgreementRow>(query, params);

    return this.hydrateTradeAgreement(result.rows[0]);
  }

  /**
   * Converts database row to TradeAgreement entity.
   * @param {TradeAgreementRow} row - Database row
   * @returns {TradeAgreement} Hydrated TradeAgreement instance
   */
  private hydrateTradeAgreement(row: TradeAgreementRow): TradeAgreement {
    return {
      id: row.id,
      relationId: row.relation_id,
      agreementType: row.agreement_type,
      terms: row.terms,
      expiresAt: row.expires_at || undefined,
      isActive: row.is_active,
      createdAt: row.created_at
    };
  }

  /**
   * Gets active trade agreements for a diplomatic relation.
   * @param {string} relationId - Diplomatic relation ID
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<TradeAgreement[]>} Array of active trade agreements
   */
  public async getActiveAgreements(
    relationId: string,
    client?: PoolClient
  ): Promise<TradeAgreement[]> {
    const query = `
      SELECT * FROM trade_agreements
      WHERE relation_id = $1 
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY created_at DESC
    `;

    const result = client
      ? await client.query<TradeAgreementRow>(query, [relationId])
      : await db.query<TradeAgreementRow>(query, [relationId]);

    return result.rows.map(row => this.hydrateTradeAgreement(row));
  }

  /**
   * Cancels a trade agreement.
   * @param {string} agreementId - Trade agreement ID
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<boolean>} True if cancelled successfully
   */
  public async cancelAgreement(
    agreementId: string,
    client?: PoolClient
  ): Promise<boolean> {
    const query = `
      UPDATE trade_agreements
      SET is_active = false
      WHERE id = $1
    `;

    const result = client
      ? await client.query(query, [agreementId])
      : await db.query(query, [agreementId]);

    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Checks if two empires are at war.
   * @param {string} empireId - First empire ID
   * @param {string} targetEmpireId - Second empire ID
   * @param {PoolClient} client - Optional transaction client
   * @returns {Promise<boolean>} True if at war
   */
  public async areAtWar(
    empireId: string,
    targetEmpireId: string,
    client?: PoolClient
  ): Promise<boolean> {
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM diplomatic_relations
        WHERE ((empire_id = $1 AND target_empire_id = $2)
           OR (empire_id = $2 AND target_empire_id = $1))
          AND status = 'war'
      )
    `;

    const result = client
      ? await client.query(query, [empireId, targetEmpireId])
      : await db.query(query, [empireId, targetEmpireId]);

    return result.rows[0].exists;
  }
}