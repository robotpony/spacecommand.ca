/**
 * Diplomacy Processor Service for SpaceCommand
 * Handles diplomatic proposals, responses, and relationship management
 */

const BaseModel = require('../models/BaseModel');
const { GameError, ValidationError } = require('../middleware/errorHandler');

class DiplomacyProcessor {
  constructor() {
    this.diplomacyModel = new BaseModel('diplomacy_relations');
    this.empireModel = new BaseModel('empires');
    this.playerModel = new BaseModel('players');
    
    // Proposal types and their requirements
    this.PROPOSAL_TYPES = {
      trade_agreement: {
        duration_days: 7,
        required_trust: 10,
        trust_change_accept: 5,
        trust_change_reject: -2
      },
      non_aggression_pact: {
        duration_days: 14,
        required_trust: 20,
        trust_change_accept: 10,
        trust_change_reject: -5
      },
      alliance: {
        duration_days: 30,
        required_trust: 50,
        trust_change_accept: 20,
        trust_change_reject: -10
      },
      research_sharing: {
        duration_days: 21,
        required_trust: 30,
        trust_change_accept: 15,
        trust_change_reject: -3
      },
      military_cooperation: {
        duration_days: 14,
        required_trust: 40,
        trust_change_accept: 15,
        trust_change_reject: -8
      },
      war_declaration: {
        duration_days: 999, // Permanent until resolved
        required_trust: -100, // Can always declare war
        trust_change_accept: -50,
        trust_change_reject: 0
      }
    };

    // Trust level thresholds and their effects
    this.TRUST_LEVELS = {
      hostile: { min: -100, max: -25, trade_modifier: 0.5, research_sharing: false },
      unfriendly: { min: -25, max: 0, trade_modifier: 0.8, research_sharing: false },
      neutral: { min: 0, max: 25, trade_modifier: 1.0, research_sharing: false },
      friendly: { min: 25, max: 50, trade_modifier: 1.2, research_sharing: true },
      allied: { min: 50, max: 100, trade_modifier: 1.5, research_sharing: true }
    };

    // Trade route configuration
    this.TRADE_ROUTE_TYPES = {
      basic: { cost: 100, capacity: 50, maintenance: 10 },
      advanced: { cost: 250, capacity: 100, maintenance: 20 },
      hyperspace: { cost: 500, capacity: 200, maintenance: 40 }
    };
  }

  /**
   * Creates a diplomatic proposal between empires
   * @param {number} proposerEmpireId - Empire making the proposal
   * @param {number} targetEmpireId - Empire receiving the proposal
   * @param {string} proposalType - Type of proposal
   * @param {Object} terms - Proposal terms and conditions
   * @returns {Promise<Object>} Created proposal
   */
  async createProposal(proposerEmpireId, targetEmpireId, proposalType, terms = {}) {
    if (proposerEmpireId === targetEmpireId) {
      throw new ValidationError('Cannot create diplomatic proposal with yourself');
    }

    if (!this.PROPOSAL_TYPES[proposalType]) {
      throw new ValidationError(`Invalid proposal type: ${proposalType}`);
    }

    // Get current diplomatic relation
    const relation = await this._getOrCreateRelation(proposerEmpireId, targetEmpireId);
    
    // Validate proposal requirements
    const proposalConfig = this.PROPOSAL_TYPES[proposalType];
    if (relation.trust_level < proposalConfig.required_trust) {
      throw new ValidationError(
        `Insufficient trust for ${proposalType}. Required: ${proposalConfig.required_trust}, Current: ${relation.trust_level}`
      );
    }

    // Check for existing proposals of same type
    const existingProposal = await this._findActiveProposal(proposerEmpireId, targetEmpireId, proposalType);
    if (existingProposal) {
      throw new ValidationError(`Active ${proposalType} proposal already exists`);
    }

    // Create proposal
    const proposal = {
      proposer_empire_id: proposerEmpireId,
      target_empire_id: targetEmpireId,
      proposal_type: proposalType,
      status: 'pending',
      terms: JSON.stringify(terms),
      expires_at: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)).toISOString(), // 7 days
      created_at: new Date().toISOString()
    };

    return await this.diplomacyModel.create(proposal);
  }

  /**
   * Responds to a diplomatic proposal
   * @param {number} proposalId - Proposal ID
   * @param {number} respondingEmpireId - Empire responding to proposal
   * @param {string} response - 'accept' or 'reject'
   * @param {Object} counterTerms - Optional counter-terms for negotiation
   * @returns {Promise<Object>} Response result and updated relations
   */
  async respondToProposal(proposalId, respondingEmpireId, response, counterTerms = null) {
    return await this.diplomacyModel.transaction(async (client) => {
      const proposal = await this.diplomacyModel.findById(proposalId);
      if (!proposal) {
        throw new ValidationError('Proposal not found');
      }

      if (proposal.target_empire_id !== respondingEmpireId) {
        throw new ValidationError('You can only respond to proposals directed at your empire');
      }

      if (proposal.status !== 'pending') {
        throw new ValidationError('Proposal is no longer pending');
      }

      if (new Date(proposal.expires_at) < new Date()) {
        throw new ValidationError('Proposal has expired');
      }

      const proposalConfig = this.PROPOSAL_TYPES[proposal.proposal_type];
      const relation = await this._getOrCreateRelation(proposal.proposer_empire_id, proposal.target_empire_id);
      
      let updatedProposal;
      let relationChanges = {};

      if (response === 'accept') {
        // Accept proposal
        updatedProposal = await this.diplomacyModel.update(proposalId, {
          status: 'accepted',
          response_at: new Date().toISOString(),
          response_terms: counterTerms ? JSON.stringify(counterTerms) : null
        }, client);

        // Create agreement
        await this._createAgreement(proposal, proposalConfig, client);

        // Update trust
        relationChanges.trust_change = proposalConfig.trust_change_accept;
        
      } else if (response === 'reject') {
        // Reject proposal
        updatedProposal = await this.diplomacyModel.update(proposalId, {
          status: 'rejected',
          response_at: new Date().toISOString(),
          rejection_reason: counterTerms?.reason || 'No reason provided'
        }, client);

        // Update trust
        relationChanges.trust_change = proposalConfig.trust_change_reject;
        
      } else if (response === 'counter' && counterTerms) {
        // Create counter-proposal
        updatedProposal = await this.diplomacyModel.update(proposalId, {
          status: 'countered',
          response_at: new Date().toISOString(),
          response_terms: JSON.stringify(counterTerms)
        }, client);

        // No trust change for counter-proposals
        relationChanges.trust_change = 0;
        
      } else {
        throw new ValidationError('Invalid response type');
      }

      // Update diplomatic relation
      if (relationChanges.trust_change !== 0) {
        await this._updateTrust(relation.id, relationChanges.trust_change, client);
      }

      return {
        proposal: updatedProposal,
        response_type: response,
        trust_change: relationChanges.trust_change,
        agreement_created: response === 'accept'
      };
    });
  }

  /**
   * Establishes a trade route between empires
   * @param {number} empire1Id - First empire ID
   * @param {number} empire2Id - Second empire ID
   * @param {string} routeType - Type of trade route
   * @param {Object} tradeTerms - Trade terms (resources, quantities)
   * @returns {Promise<Object>} Created trade route
   */
  async establishTradeRoute(empire1Id, empire2Id, routeType, tradeTerms) {
    if (!this.TRADE_ROUTE_TYPES[routeType]) {
      throw new ValidationError(`Invalid trade route type: ${routeType}`);
    }

    // Check for active trade agreement
    const hasTradeAgreement = await this._hasActiveAgreement(empire1Id, empire2Id, 'trade_agreement');
    if (!hasTradeAgreement) {
      throw new ValidationError('Active trade agreement required to establish trade route');
    }

    // Validate trade terms
    this._validateTradeTerms(tradeTerms);

    // Check empire resources for route cost
    const routeConfig = this.TRADE_ROUTE_TYPES[routeType];
    const empire1 = await this.empireModel.findById(empire1Id);
    const empire2 = await this.empireModel.findById(empire2Id);

    if (empire1.metal < routeConfig.cost || empire2.metal < routeConfig.cost) {
      throw new ValidationError(`Insufficient metal for trade route. Required: ${routeConfig.cost} each`);
    }

    return await this.diplomacyModel.transaction(async (client) => {
      // Deduct costs
      await this.empireModel.update(empire1Id, {
        metal: empire1.metal - routeConfig.cost
      }, client);
      
      await this.empireModel.update(empire2Id, {
        metal: empire2.metal - routeConfig.cost
      }, client);

      // Create trade route record
      const tradeRoute = await this.diplomacyModel.create({
        proposer_empire_id: empire1Id,
        target_empire_id: empire2Id,
        proposal_type: 'trade_route',
        status: 'active',
        terms: JSON.stringify({
          route_type: routeType,
          capacity: routeConfig.capacity,
          maintenance_cost: routeConfig.maintenance,
          trade_terms: tradeTerms
        }),
        expires_at: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toISOString() // 30 days
      }, client);

      return tradeRoute;
    });
  }

  /**
   * Processes trade route exchanges for all active routes
   * @returns {Promise<Array>} Processed trade route results
   */
  async processTradeRoutes() {
    const activeRoutes = await this.diplomacyModel.find({
      proposal_type: 'trade_route',
      status: 'active'
    });

    const results = [];

    for (const route of activeRoutes) {
      try {
        const result = await this._processIndividualTradeRoute(route);
        results.push(result);
      } catch (error) {
        console.error(`Error processing trade route ${route.id}:`, error);
        results.push({
          route_id: route.id,
          error: error.message,
          processed: false
        });
      }
    }

    return results;
  }

  /**
   * Gets diplomatic status between two empires
   * @param {number} empire1Id - First empire ID
   * @param {number} empire2Id - Second empire ID
   * @returns {Promise<Object>} Diplomatic status
   */
  async getDiplomaticStatus(empire1Id, empire2Id) {
    const relation = await this._getOrCreateRelation(empire1Id, empire2Id);
    const trustLevel = this._getTrustLevel(relation.trust_level);
    
    // Get active agreements
    const activeAgreements = await this.diplomacyModel.find({
      proposer_empire_id: empire1Id,
      target_empire_id: empire2Id,
      status: 'active'
    });

    // Get pending proposals
    const pendingProposals = await this.diplomacyModel.find({
      target_empire_id: empire2Id,
      status: 'pending'
    });

    return {
      empire1_id: empire1Id,
      empire2_id: empire2Id,
      trust_level: relation.trust_level,
      trust_category: trustLevel.category,
      relationship_status: this._getRelationshipStatus(relation, activeAgreements),
      active_agreements: activeAgreements.map(agreement => ({
        type: agreement.proposal_type,
        expires_at: agreement.expires_at,
        terms: JSON.parse(agreement.terms || '{}')
      })),
      pending_proposals: pendingProposals.filter(p => p.proposer_empire_id === empire1Id),
      trade_modifier: trustLevel.data.trade_modifier,
      research_sharing_allowed: trustLevel.data.research_sharing,
      last_updated: relation.updated_at
    };
  }

  /**
   * Gets or creates diplomatic relation between empires
   * @param {number} empire1Id - First empire ID
   * @param {number} empire2Id - Second empire ID
   * @returns {Promise<Object>} Diplomatic relation
   * @private
   */
  async _getOrCreateRelation(empire1Id, empire2Id) {
    // Ensure consistent ordering
    const [empireA, empireB] = empire1Id < empire2Id ? [empire1Id, empire2Id] : [empire2Id, empire1Id];
    
    let relation = await this.diplomacyModel.findOne({
      proposer_empire_id: empireA,
      target_empire_id: empireB,
      proposal_type: 'relation'
    });

    if (!relation) {
      relation = await this.diplomacyModel.create({
        proposer_empire_id: empireA,
        target_empire_id: empireB,
        proposal_type: 'relation',
        status: 'active',
        terms: JSON.stringify({ trust_level: 0 })
      });
    }

    return {
      id: relation.id,
      trust_level: JSON.parse(relation.terms || '{}').trust_level || 0,
      updated_at: relation.updated_at
    };
  }

  /**
   * Finds active proposal of specific type between empires
   * @param {number} proposerEmpireId - Proposer empire ID
   * @param {number} targetEmpireId - Target empire ID
   * @param {string} proposalType - Type of proposal
   * @returns {Promise<Object|null>} Active proposal or null
   * @private
   */
  async _findActiveProposal(proposerEmpireId, targetEmpireId, proposalType) {
    return await this.diplomacyModel.findOne({
      proposer_empire_id: proposerEmpireId,
      target_empire_id: targetEmpireId,
      proposal_type: proposalType,
      status: 'pending'
    });
  }

  /**
   * Creates an agreement from an accepted proposal
   * @param {Object} proposal - Original proposal
   * @param {Object} proposalConfig - Proposal configuration
   * @param {Object} client - Database client
   * @private
   */
  async _createAgreement(proposal, proposalConfig, client) {
    const expirationDate = new Date(Date.now() + (proposalConfig.duration_days * 24 * 60 * 60 * 1000));
    
    await this.diplomacyModel.create({
      proposer_empire_id: proposal.proposer_empire_id,
      target_empire_id: proposal.target_empire_id,
      proposal_type: proposal.proposal_type,
      status: 'active',
      terms: proposal.terms,
      expires_at: expirationDate.toISOString(),
      parent_proposal_id: proposal.id
    }, client);
  }

  /**
   * Updates trust level between empires
   * @param {number} relationId - Relation ID
   * @param {number} trustChange - Trust change amount
   * @param {Object} client - Database client
   * @private
   */
  async _updateTrust(relationId, trustChange, client) {
    const relation = await this.diplomacyModel.findById(relationId);
    const currentTerms = JSON.parse(relation.terms || '{}');
    const newTrustLevel = Math.max(-100, Math.min(100, (currentTerms.trust_level || 0) + trustChange));
    
    currentTerms.trust_level = newTrustLevel;
    
    await this.diplomacyModel.update(relationId, {
      terms: JSON.stringify(currentTerms)
    }, client);
  }

  /**
   * Checks if empires have an active agreement of specific type
   * @param {number} empire1Id - First empire ID
   * @param {number} empire2Id - Second empire ID
   * @param {string} agreementType - Agreement type
   * @returns {Promise<boolean>} Whether agreement exists
   * @private
   */
  async _hasActiveAgreement(empire1Id, empire2Id, agreementType) {
    const agreement = await this.diplomacyModel.findOne({
      proposer_empire_id: empire1Id,
      target_empire_id: empire2Id,
      proposal_type: agreementType,
      status: 'active'
    });

    return !!agreement;
  }

  /**
   * Validates trade terms
   * @param {Object} tradeTerms - Trade terms to validate
   * @private
   */
  _validateTradeTerms(tradeTerms) {
    const validResources = ['metal', 'energy', 'food', 'research'];
    
    if (!tradeTerms.empire1_gives || !tradeTerms.empire2_gives) {
      throw new ValidationError('Trade terms must specify what each empire gives');
    }

    for (const [resource, amount] of Object.entries(tradeTerms.empire1_gives)) {
      if (!validResources.includes(resource) || amount <= 0) {
        throw new ValidationError(`Invalid trade resource or amount: ${resource}=${amount}`);
      }
    }

    for (const [resource, amount] of Object.entries(tradeTerms.empire2_gives)) {
      if (!validResources.includes(resource) || amount <= 0) {
        throw new ValidationError(`Invalid trade resource or amount: ${resource}=${amount}`);
      }
    }
  }

  /**
   * Processes an individual trade route
   * @param {Object} route - Trade route data
   * @returns {Promise<Object>} Processing result
   * @private
   */
  async _processIndividualTradeRoute(route) {
    const terms = JSON.parse(route.terms || '{}');
    const tradeTerms = terms.trade_terms;
    
    return await this.diplomacyModel.transaction(async (client) => {
      const empire1 = await this.empireModel.findById(route.proposer_empire_id);
      const empire2 = await this.empireModel.findById(route.target_empire_id);

      // Check if empires can afford the trade
      const empire1Changes = {};
      const empire2Changes = {};

      // Empire 1 gives, Empire 2 receives
      for (const [resource, amount] of Object.entries(tradeTerms.empire1_gives)) {
        if (empire1[resource] < amount) {
          throw new ValidationError(`Empire 1 insufficient ${resource}`);
        }
        empire1Changes[resource] = (empire1Changes[resource] || 0) - amount;
        empire2Changes[resource] = (empire2Changes[resource] || 0) + amount;
      }

      // Empire 2 gives, Empire 1 receives
      for (const [resource, amount] of Object.entries(tradeTerms.empire2_gives)) {
        if (empire2[resource] < amount) {
          throw new ValidationError(`Empire 2 insufficient ${resource}`);
        }
        empire2Changes[resource] = (empire2Changes[resource] || 0) - amount;
        empire1Changes[resource] = (empire1Changes[resource] || 0) + amount;
      }

      // Deduct maintenance costs
      const maintenanceCost = terms.maintenance_cost || 0;
      empire1Changes.metal = (empire1Changes.metal || 0) - maintenanceCost;
      empire2Changes.metal = (empire2Changes.metal || 0) - maintenanceCost;

      // Apply changes
      const updatedEmpire1 = {};
      const updatedEmpire2 = {};
      
      for (const [resource, change] of Object.entries(empire1Changes)) {
        updatedEmpire1[resource] = empire1[resource] + change;
      }
      
      for (const [resource, change] of Object.entries(empire2Changes)) {
        updatedEmpire2[resource] = empire2[resource] + change;
      }

      await this.empireModel.update(route.proposer_empire_id, updatedEmpire1, client);
      await this.empireModel.update(route.target_empire_id, updatedEmpire2, client);

      return {
        route_id: route.id,
        processed: true,
        empire1_changes: empire1Changes,
        empire2_changes: empire2Changes,
        processed_at: new Date().toISOString()
      };
    });
  }

  /**
   * Gets trust level category and data
   * @param {number} trustLevel - Trust level value
   * @returns {Object} Trust level information
   * @private
   */
  _getTrustLevel(trustLevel) {
    for (const [category, data] of Object.entries(this.TRUST_LEVELS)) {
      if (trustLevel >= data.min && trustLevel <= data.max) {
        return { category, data };
      }
    }
    return { category: 'neutral', data: this.TRUST_LEVELS.neutral };
  }

  /**
   * Gets relationship status based on trust and agreements
   * @param {Object} relation - Diplomatic relation
   * @param {Array} activeAgreements - Active agreements
   * @returns {string} Relationship status
   * @private
   */
  _getRelationshipStatus(relation, activeAgreements) {
    const hasWar = activeAgreements.some(a => a.proposal_type === 'war_declaration');
    const hasAlliance = activeAgreements.some(a => a.proposal_type === 'alliance');
    const hasNAP = activeAgreements.some(a => a.proposal_type === 'non_aggression_pact');
    
    if (hasWar) return 'at_war';
    if (hasAlliance) return 'allied';
    if (hasNAP) return 'non_aggression';
    
    const trustLevel = this._getTrustLevel(relation.trust_level);
    return trustLevel.category;
  }
}

module.exports = DiplomacyProcessor;