class Diplomacy {
  constructor(data = {}) {
    this.id = data.id || null;
    this.fromPlayerId = data.fromPlayerId || null;
    this.toPlayerId = data.toPlayerId || null;
    this.relationship = data.relationship || 'neutral';
    this.trustLevel = data.trustLevel || 0;
    this.proposals = data.proposals || [];
    this.agreements = data.agreements || [];
    this.tradeRoutes = data.tradeRoutes || [];
    this.lastInteraction = data.lastInteraction || new Date();
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  static RELATIONSHIP_TYPES = {
    allied: { name: 'Allied', value: 100, color: '#00ff00' },
    friendly: { name: 'Friendly', value: 75, color: '#88ff88' },
    neutral: { name: 'Neutral', value: 50, color: '#ffff00' },
    unfriendly: { name: 'Unfriendly', value: 25, color: '#ff8888' },
    hostile: { name: 'Hostile', value: 0, color: '#ff0000' },
    war: { name: 'At War', value: -50, color: '#800000' }
  };

  static PROPOSAL_TYPES = {
    alliance: {
      name: 'Alliance Proposal',
      description: 'Mutual defense pact and shared intelligence',
      duration: 30,
      benefits: ['shared_vision', 'mutual_defense', 'trade_bonus']
    },
    trade_agreement: {
      name: 'Trade Agreement',
      description: 'Establish trade routes and resource exchange',
      duration: 20,
      benefits: ['trade_routes', 'resource_exchange', 'economic_bonus']
    },
    non_aggression: {
      name: 'Non-Aggression Pact',
      description: 'Promise not to attack each other',
      duration: 15,
      benefits: ['no_attack', 'border_security']
    },
    technology_exchange: {
      name: 'Technology Exchange',
      description: 'Share research and technological advances',
      duration: 10,
      benefits: ['tech_sharing', 'research_bonus']
    },
    peace_treaty: {
      name: 'Peace Treaty',
      description: 'End hostilities and establish peaceful relations',
      duration: 25,
      benefits: ['end_war', 'border_normalization']
    },
    military_cooperation: {
      name: 'Military Cooperation',
      description: 'Joint military operations and fleet coordination',
      duration: 20,
      benefits: ['joint_operations', 'fleet_coordination', 'intel_sharing']
    }
  };

  static AGREEMENT_STATUSES = {
    pending: 'Pending',
    active: 'Active',
    expired: 'Expired',
    violated: 'Violated',
    cancelled: 'Cancelled'
  };

  createProposal(type, terms = {}) {
    const proposalType = Diplomacy.PROPOSAL_TYPES[type];
    if (!proposalType) {
      throw new Error(`Invalid proposal type: ${type}`);
    }

    const proposal = {
      id: this.generateId(),
      type: type,
      terms: terms,
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      response: null,
      responseAt: null
    };

    this.proposals.push(proposal);
    this.lastInteraction = new Date();
    this.updatedAt = new Date();
    
    return proposal;
  }

  respondToProposal(proposalId, response, counterTerms = null) {
    const proposal = this.proposals.find(p => p.id === proposalId);
    if (!proposal) {
      throw new Error('Proposal not found');
    }

    if (proposal.status !== 'pending') {
      throw new Error('Proposal is no longer pending');
    }

    if (new Date() > proposal.expiresAt) {
      proposal.status = 'expired';
      this.updatedAt = new Date();
      throw new Error('Proposal has expired');
    }

    proposal.response = response;
    proposal.responseAt = new Date();
    proposal.counterTerms = counterTerms;

    if (response === 'accept') {
      proposal.status = 'accepted';
      this.createAgreement(proposal);
      this.adjustRelationship(10);
    } else if (response === 'reject') {
      proposal.status = 'rejected';
      this.adjustRelationship(-5);
    } else if (response === 'counter') {
      proposal.status = 'countered';
    }

    this.lastInteraction = new Date();
    this.updatedAt = new Date();
    
    return proposal;
  }

  createAgreement(proposal) {
    const proposalType = Diplomacy.PROPOSAL_TYPES[proposal.type];
    
    const agreement = {
      id: this.generateId(),
      type: proposal.type,
      terms: proposal.terms,
      benefits: proposalType.benefits,
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + proposalType.duration * 24 * 60 * 60 * 1000),
      violations: [],
      createdAt: new Date()
    };

    this.agreements.push(agreement);
    
    if (proposal.type === 'alliance') {
      this.setRelationship('allied');
    } else if (proposal.type === 'peace_treaty') {
      this.setRelationship('neutral');
    }
  }

  violateAgreement(agreementId, violationType, description) {
    const agreement = this.agreements.find(a => a.id === agreementId);
    if (!agreement) {
      throw new Error('Agreement not found');
    }

    const violation = {
      id: this.generateId(),
      type: violationType,
      description: description,
      timestamp: new Date(),
      severity: this.calculateViolationSeverity(violationType)
    };

    agreement.violations.push(violation);
    
    if (violation.severity >= 3) {
      agreement.status = 'violated';
      this.adjustRelationship(-20);
    } else {
      this.adjustRelationship(-10);
    }

    this.lastInteraction = new Date();
    this.updatedAt = new Date();
  }

  calculateViolationSeverity(violationType) {
    const severityMap = {
      'trade_disruption': 1,
      'border_incursion': 2,
      'tech_theft': 2,
      'military_aggression': 3,
      'territory_invasion': 4,
      'betrayal': 5
    };
    
    return severityMap[violationType] || 1;
  }

  setRelationship(relationship) {
    if (!Diplomacy.RELATIONSHIP_TYPES[relationship]) {
      throw new Error(`Invalid relationship type: ${relationship}`);
    }

    this.relationship = relationship;
    this.trustLevel = Diplomacy.RELATIONSHIP_TYPES[relationship].value;
    this.lastInteraction = new Date();
    this.updatedAt = new Date();
  }

  adjustRelationship(change) {
    this.trustLevel = Math.max(-100, Math.min(100, this.trustLevel + change));
    
    if (this.trustLevel >= 90) {
      this.relationship = 'allied';
    } else if (this.trustLevel >= 60) {
      this.relationship = 'friendly';
    } else if (this.trustLevel >= 30) {
      this.relationship = 'neutral';
    } else if (this.trustLevel >= 0) {
      this.relationship = 'unfriendly';
    } else if (this.trustLevel >= -30) {
      this.relationship = 'hostile';
    } else {
      this.relationship = 'war';
    }

    this.lastInteraction = new Date();
    this.updatedAt = new Date();
  }

  establishTradeRoute(terms) {
    const tradeRoute = {
      id: this.generateId(),
      terms: terms,
      status: 'active',
      volume: 0,
      profit: 0,
      createdAt: new Date(),
      lastTransaction: null
    };

    this.tradeRoutes.push(tradeRoute);
    this.adjustRelationship(5);
    this.updatedAt = new Date();
    
    return tradeRoute;
  }

  updateTradeRoute(routeId, volume, profit) {
    const route = this.tradeRoutes.find(r => r.id === routeId);
    if (route) {
      route.volume += volume;
      route.profit += profit;
      route.lastTransaction = new Date();
      this.updatedAt = new Date();
    }
  }

  closeTradeRoute(routeId) {
    const routeIndex = this.tradeRoutes.findIndex(r => r.id === routeId);
    if (routeIndex !== -1) {
      this.tradeRoutes.splice(routeIndex, 1);
      this.adjustRelationship(-3);
      this.updatedAt = new Date();
    }
  }

  getActiveAgreements() {
    return this.agreements.filter(a => {
      if (a.status !== 'active') return false;
      if (new Date() > a.endDate) {
        a.status = 'expired';
        return false;
      }
      return true;
    });
  }

  hasAgreement(type) {
    return this.getActiveAgreements().some(a => a.type === type);
  }

  canAttack() {
    return !this.hasAgreement('non_aggression') && 
           !this.hasAgreement('alliance') && 
           !this.hasAgreement('peace_treaty');
  }

  canTrade() {
    return this.hasAgreement('trade_agreement') || 
           this.hasAgreement('alliance') || 
           this.relationship === 'friendly' || 
           this.relationship === 'neutral';
  }

  canShareIntelligence() {
    return this.hasAgreement('alliance') || 
           this.hasAgreement('military_cooperation');
  }

  getRelationshipStatus() {
    return {
      type: this.relationship,
      name: Diplomacy.RELATIONSHIP_TYPES[this.relationship].name,
      trustLevel: this.trustLevel,
      color: Diplomacy.RELATIONSHIP_TYPES[this.relationship].color
    };
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  toJSON() {
    return {
      id: this.id,
      fromPlayerId: this.fromPlayerId,
      toPlayerId: this.toPlayerId,
      relationship: this.relationship,
      trustLevel: this.trustLevel,
      proposals: this.proposals,
      agreements: this.agreements,
      tradeRoutes: this.tradeRoutes,
      lastInteraction: this.lastInteraction,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = Diplomacy;