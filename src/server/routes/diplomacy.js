/**
 * Diplomacy routes for inter-player relations, proposals, and messaging
 */
const express = require('express');
const { body, query, param, validationResult } = require('express-validator');

const Empire = require('../models/Empire');
const Diplomacy = require('../models/Diplomacy');
const { ValidationError, NotFoundError, ConflictError } = require('../middleware/errorHandler');
const { requireActionPoints, consumeActionPoints } = require('../middleware/gameState');

const router = express.Router();

/**
 * GET /api/diplomacy/relations
 * Get current diplomatic status with all players
 */
router.get('/relations', [
  query('status')
    .optional()
    .isIn(['neutral', 'friendly', 'hostile', 'allied', 'at_war'])
    .withMessage('Invalid status filter'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Invalid query parameters', { 
        fields: errors.array().map(err => ({ 
          field: err.path, 
          message: err.msg 
        }))
      });
    }

    const userEmpire = await Empire.findByPlayerId(req.user.id);
    if (!userEmpire) {
      throw new NotFoundError('Empire not found');
    }

    const { status, page = 1, limit = 50 } = req.query;
    
    // Get all diplomatic relations for this empire
    const relations = await Diplomacy.findByEmpireId(userEmpire.id, {
      status,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    // Transform relations for response
    const relationsData = relations.map(relation => {
      const isInitiator = relation.empireId === userEmpire.id;
      const otherEmpireId = isInitiator ? relation.targetEmpireId : relation.empireId;
      
      return {
        empireId: otherEmpireId,
        empireName: relation.getOtherEmpireName(userEmpire.id),
        status: relation.status,
        trustLevel: relation.trustLevel,
        tradeVolume: relation.tradeVolume,
        activeAgreements: relation.getActiveAgreements(),
        lastInteraction: relation.lastInteraction,
        relationshipHistory: relation.getRecentHistory(30), // Last 30 days
        canDeclareWar: relation.canDeclareWar(),
        canProposeAlliance: relation.canProposeAlliance(),
        createdAt: relation.createdAt,
        updatedAt: relation.updatedAt
      };
    });

    res.status(200).json({
      relations: relationsData,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: relations.length
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/diplomacy/relations/:empireId
 * Get detailed diplomatic status with a specific empire
 */
router.get('/relations/:empireId', [
  param('empireId').isUUID().withMessage('Invalid empire ID format')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Invalid parameters', { 
        fields: errors.array().map(err => ({ 
          field: err.path, 
          message: err.msg 
        }))
      });
    }

    const userEmpire = await Empire.findByPlayerId(req.user.id);
    if (!userEmpire) {
      throw new NotFoundError('Empire not found');
    }

    const targetEmpire = await Empire.findById(req.params.empireId);
    if (!targetEmpire) {
      throw new NotFoundError('Target empire not found');
    }

    const relation = await Diplomacy.findBetweenEmpires(userEmpire.id, targetEmpire.id);
    if (!relation) {
      throw new NotFoundError('Diplomatic relation not found');
    }

    res.status(200).json({
      empireId: targetEmpire.id,
      empireName: targetEmpire.name,
      status: relation.status,
      trustLevel: relation.trustLevel,
      tradeVolume: relation.tradeVolume,
      activeAgreements: relation.agreements,
      tradeRoutes: relation.tradeRoutes,
      espionageLevel: relation.espionageLevel,
      relationshipHistory: relation.history,
      pendingProposals: relation.getPendingProposals(),
      availableActions: relation.getAvailableActions(userEmpire.id),
      lastInteraction: relation.lastInteraction,
      createdAt: relation.createdAt,
      updatedAt: relation.updatedAt
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/diplomacy/proposals
 * Send a diplomatic proposal to another player
 */
router.post('/proposals', requireActionPoints(1), [
  body('targetEmpireId').isUUID().withMessage('Invalid target empire ID'),
  body('proposalType')
    .isIn(['alliance', 'non_aggression_pact', 'trade_agreement', 'research_pact', 'military_access', 'peace_treaty', 'declare_war'])
    .withMessage('Invalid proposal type'),
  body('terms').optional().isObject().withMessage('Terms must be an object'),
  body('message')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Message must be 1000 characters or less'),
  body('duration')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Duration must be 1-365 days')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Invalid input data', { 
        fields: errors.array().map(err => ({ 
          field: err.path, 
          message: err.msg 
        }))
      });
    }

    const { targetEmpireId, proposalType, terms = {}, message = '', duration = 30 } = req.body;
    
    const userEmpire = await Empire.findByPlayerId(req.user.id);
    if (!userEmpire) {
      throw new NotFoundError('Empire not found');
    }

    const targetEmpire = await Empire.findById(targetEmpireId);
    if (!targetEmpire) {
      throw new NotFoundError('Target empire not found');
    }

    // Prevent self-proposals
    if (userEmpire.id === targetEmpire.id) {
      throw new ConflictError('Cannot send diplomatic proposals to yourself');
    }

    // Get or create diplomatic relation
    let relation = await Diplomacy.findBetweenEmpires(userEmpire.id, targetEmpire.id);
    if (!relation) {
      relation = await Diplomacy.createRelation(userEmpire.id, targetEmpire.id);
    }

    // Validate proposal based on current relationship
    const validationResult = relation.validateProposal(proposalType, terms, userEmpire.id);
    if (!validationResult.valid) {
      throw new ConflictError(validationResult.reason, validationResult.details);
    }

    // Create proposal
    const proposal = relation.createProposal({
      initiatorEmpireId: userEmpire.id,
      proposalType,
      terms,
      message,
      duration
    });

    await relation.save();
    await consumeActionPoints(req, 'diplomatic_proposal');

    // Send notification to target empire (would integrate with notification system)
    await sendDiplomaticNotification(targetEmpire.playerId, {
      type: 'diplomatic_proposal',
      from: userEmpire.name,
      proposalType,
      proposalId: proposal.id
    });

    res.set('Location', `/api/diplomacy/proposals/${proposal.id}`);
    res.status(201).json({
      proposalId: proposal.id,
      proposalType: proposal.proposalType,
      targetEmpire: {
        id: targetEmpire.id,
        name: targetEmpire.name
      },
      terms: proposal.terms,
      message: proposal.message,
      duration: proposal.duration,
      status: proposal.status,
      createdAt: proposal.createdAt
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/diplomacy/proposals
 * Get diplomatic proposals (sent and received)
 */
router.get('/proposals', [
  query('type')
    .optional()
    .isIn(['sent', 'received', 'all'])
    .withMessage('Invalid type filter'),
  query('status')
    .optional()
    .isIn(['pending', 'accepted', 'rejected', 'expired'])
    .withMessage('Invalid status filter'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1-50')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Invalid query parameters', { 
        fields: errors.array().map(err => ({ 
          field: err.path, 
          message: err.msg 
        }))
      });
    }

    const userEmpire = await Empire.findByPlayerId(req.user.id);
    if (!userEmpire) {
      throw new NotFoundError('Empire not found');
    }

    const { type = 'all', status, page = 1, limit = 20 } = req.query;
    
    // Get proposals based on filters
    const proposals = await Diplomacy.findProposalsByEmpire(userEmpire.id, {
      type,
      status,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    // Transform proposals for response
    const proposalData = proposals.map(proposal => ({
      id: proposal.id,
      proposalType: proposal.proposalType,
      initiatorEmpire: proposal.getInitiatorEmpire(),
      targetEmpire: proposal.getTargetEmpire(),
      isSender: proposal.initiatorEmpireId === userEmpire.id,
      terms: proposal.terms,
      message: proposal.message,
      duration: proposal.duration,
      status: proposal.status,
      expiresAt: proposal.expiresAt,
      createdAt: proposal.createdAt,
      respondedAt: proposal.respondedAt
    }));

    res.status(200).json({
      proposals: proposalData,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: proposals.length
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/diplomacy/proposals/:id/respond
 * Respond to a diplomatic proposal
 */
router.post('/proposals/:id/respond', requireActionPoints(1), [
  param('id').isUUID().withMessage('Invalid proposal ID format'),
  body('response')
    .isIn(['accept', 'reject', 'counter'])
    .withMessage('Response must be accept, reject, or counter'),
  body('counterTerms').optional().isObject().withMessage('Counter terms must be an object'),
  body('message')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Message must be 1000 characters or less')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Invalid input data', { 
        fields: errors.array().map(err => ({ 
          field: err.path, 
          message: err.msg 
        }))
      });
    }

    const { response, counterTerms = {}, message = '' } = req.body;
    
    const userEmpire = await Empire.findByPlayerId(req.user.id);
    if (!userEmpire) {
      throw new NotFoundError('Empire not found');
    }

    const proposal = await Diplomacy.findProposalById(req.params.id);
    if (!proposal) {
      throw new NotFoundError('Proposal not found');
    }

    // Check if user can respond to this proposal
    if (proposal.targetEmpireId !== userEmpire.id) {
      throw new NotFoundError('Proposal not found or not addressable');
    }

    if (proposal.status !== 'pending') {
      throw new ConflictError('Can only respond to pending proposals');
    }

    if (proposal.isExpired()) {
      throw new ConflictError('Proposal has expired');
    }

    // Process response
    let responseResult;
    
    if (response === 'accept') {
      responseResult = await proposal.accept(message);
    } else if (response === 'reject') {
      responseResult = await proposal.reject(message);
    } else if (response === 'counter') {
      responseResult = await proposal.counter(counterTerms, message);
    }

    await proposal.save();
    await consumeActionPoints(req, 'diplomatic_response');

    // Send notification to initiator
    await sendDiplomaticNotification(proposal.getInitiatorEmpire().playerId, {
      type: 'diplomatic_response',
      from: userEmpire.name,
      response,
      proposalType: proposal.proposalType,
      proposalId: proposal.id
    });

    res.status(200).json({
      proposalId: proposal.id,
      response,
      newStatus: proposal.status,
      agreementId: responseResult.agreementId || null,
      counterProposalId: responseResult.counterProposalId || null,
      effectiveDate: responseResult.effectiveDate || null,
      respondedAt: proposal.respondedAt
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/diplomacy/agreements
 * Get active diplomatic agreements
 */
router.get('/agreements', [
  query('type')
    .optional()
    .isIn(['alliance', 'non_aggression_pact', 'trade_agreement', 'research_pact', 'military_access'])
    .withMessage('Invalid agreement type filter'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1-50')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Invalid query parameters', { 
        fields: errors.array().map(err => ({ 
          field: err.path, 
          message: err.msg 
        }))
      });
    }

    const userEmpire = await Empire.findByPlayerId(req.user.id);
    if (!userEmpire) {
      throw new NotFoundError('Empire not found');
    }

    const { type, page = 1, limit = 20 } = req.query;
    
    // Get active agreements
    const agreements = await Diplomacy.findActiveAgreements(userEmpire.id, {
      type,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    // Transform agreements for response
    const agreementData = agreements.map(agreement => ({
      id: agreement.id,
      type: agreement.type,
      partnerEmpire: agreement.getPartnerEmpire(userEmpire.id),
      terms: agreement.terms,
      effectiveDate: agreement.effectiveDate,
      expirationDate: agreement.expirationDate,
      autoRenew: agreement.autoRenew,
      performance: agreement.getPerformanceMetrics(),
      canCancel: agreement.canCancel(userEmpire.id),
      createdAt: agreement.createdAt
    }));

    res.status(200).json({
      agreements: agreementData,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: agreements.length
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/diplomacy/agreements/:id
 * Cancel a diplomatic agreement
 */
router.delete('/agreements/:id', requireActionPoints(2), [
  param('id').isUUID().withMessage('Invalid agreement ID format')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Invalid parameters', { 
        fields: errors.array().map(err => ({ 
          field: err.path, 
          message: err.msg 
        }))
      });
    }

    const userEmpire = await Empire.findByPlayerId(req.user.id);
    if (!userEmpire) {
      throw new NotFoundError('Empire not found');
    }

    const agreement = await Diplomacy.findAgreementById(req.params.id);
    if (!agreement) {
      throw new NotFoundError('Agreement not found');
    }

    // Check if user can cancel this agreement
    if (!agreement.involvesEmpire(userEmpire.id)) {
      throw new NotFoundError('Agreement not found or not accessible');
    }

    if (!agreement.canCancel(userEmpire.id)) {
      throw new ConflictError('Agreement cannot be cancelled at this time', {
        reason: agreement.getCancellationRestriction(userEmpire.id)
      });
    }

    // Cancel agreement
    const cancellationResult = await agreement.cancel(userEmpire.id);
    await agreement.save();

    await consumeActionPoints(req, 'cancel_agreement');

    // Notify partner empire
    const partnerEmpire = agreement.getPartnerEmpire(userEmpire.id);
    await sendDiplomaticNotification(partnerEmpire.playerId, {
      type: 'agreement_cancelled',
      from: userEmpire.name,
      agreementType: agreement.type,
      agreementId: agreement.id
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/diplomacy/messages
 * Send a diplomatic message to another empire
 */
router.post('/messages', requireActionPoints(1), [
  body('targetEmpireId').isUUID().withMessage('Invalid target empire ID'),
  body('subject')
    .isLength({ min: 1, max: 100 })
    .withMessage('Subject must be 1-100 characters'),
  body('message')
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message must be 1-2000 characters'),
  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Invalid priority level')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Invalid input data', { 
        fields: errors.array().map(err => ({ 
          field: err.path, 
          message: err.msg 
        }))
      });
    }

    const { targetEmpireId, subject, message, priority = 'normal' } = req.body;
    
    const userEmpire = await Empire.findByPlayerId(req.user.id);
    if (!userEmpire) {
      throw new NotFoundError('Empire not found');
    }

    const targetEmpire = await Empire.findById(targetEmpireId);
    if (!targetEmpire) {
      throw new NotFoundError('Target empire not found');
    }

    if (userEmpire.id === targetEmpire.id) {
      throw new ConflictError('Cannot send messages to yourself');
    }

    // Get or create diplomatic relation
    let relation = await Diplomacy.findBetweenEmpires(userEmpire.id, targetEmpire.id);
    if (!relation) {
      relation = await Diplomacy.createRelation(userEmpire.id, targetEmpire.id);
    }

    // Create message
    const diplomaticMessage = relation.sendMessage({
      from: userEmpire.id,
      to: targetEmpire.id,
      subject,
      message,
      priority
    });

    await relation.save();
    await consumeActionPoints(req, 'send_diplomatic_message');

    // Send notification
    await sendDiplomaticNotification(targetEmpire.playerId, {
      type: 'diplomatic_message',
      from: userEmpire.name,
      subject,
      messageId: diplomaticMessage.id,
      priority
    });

    res.set('Location', `/api/diplomacy/messages/${diplomaticMessage.id}`);
    res.status(201).json({
      messageId: diplomaticMessage.id,
      targetEmpire: {
        id: targetEmpire.id,
        name: targetEmpire.name
      },
      subject,
      priority,
      sentAt: diplomaticMessage.sentAt
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Helper function to send diplomatic notifications
 */
async function sendDiplomaticNotification(playerId, notification) {
  // This would integrate with a real-time notification system
  // For now, this is a placeholder
  console.log(`Diplomatic notification for player ${playerId}:`, notification);
}

module.exports = router;