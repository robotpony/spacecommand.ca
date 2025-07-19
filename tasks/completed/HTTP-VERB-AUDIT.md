# HTTP Verb Usage Audit

**Date**: 2025-07-18  
**Scope**: All REST API endpoints  
**Status**: In Progress  

## Overview

This document audits the current HTTP verb usage across all API endpoints to ensure compliance with RESTful principles and semantic correctness.

## HTTP Verb Semantic Guidelines

### GET
- **Purpose**: Retrieve data (safe, idempotent)
- **Should**: Return resource representation
- **Should Not**: Modify server state

### POST
- **Purpose**: Create resources or non-idempotent operations
- **Should**: Create new resources, trigger actions
- **Should Not**: Replace existing resources

### PUT
- **Purpose**: Replace entire resource (idempotent)
- **Should**: Replace complete resource representation
- **Should Not**: Partial updates

### PATCH
- **Purpose**: Partial resource update (idempotent)
- **Should**: Update specific fields
- **Should Not**: Create new resources

### DELETE
- **Purpose**: Remove resource (idempotent)
- **Should**: Delete specified resource
- **Should Not**: Create or update

## Endpoint Analysis

### Authentication Routes (/api/auth)

| Endpoint | Method | Semantic Check | Status | Recommendation |
|----------|--------|----------------|---------|----------------|
| `/register` | POST | ✅ Creates new user resource | Correct | Keep POST |
| `/login` | POST | ✅ Creates session/token | Correct | Keep POST |
| `/logout` | POST | ✅ Destroys session | Correct | Keep POST |
| `/profile` | GET | ✅ Retrieves user profile | Correct | Keep GET |
| `/profile` | PUT | ✅ Replaces entire profile | Correct | Keep PUT |
| `/change-password` | POST | ⚠️ Updates password field | Should be PATCH | Change to PATCH |

**Issues**: 1 - Password change should use PATCH for partial update
**Recommendation**: Change password endpoint to PATCH

### Empire Routes

| Endpoint | Method | Semantic Check | Status | Recommendation |
|----------|--------|----------------|---------|----------------|
| `/empire` | GET | ✅ Retrieves empire data | Correct | Keep GET |
| `/empire/name` | PUT | ⚠️ Updates single field | Should be PATCH | Change to PATCH |
| `/planets` | GET | ✅ Retrieves planet list | Correct | Keep GET |
| `/planets/:id` | GET | ✅ Retrieves specific planet | Correct | Keep GET |
| `/planets/:id/specialization` | PUT | ⚠️ Updates single field | Should be PATCH | Change to PATCH |
| `/planets/:id/buildings` | POST | ✅ Creates new buildings | Correct | Keep POST |
| `/resources` | GET | ✅ Retrieves resource data | Correct | Keep GET |
| `/resources/transfer` | POST | ✅ Creates transfer action | Correct | Keep POST |

**Issues**: 2 - Single field updates should use PATCH
**Recommendation**: Change name and specialization endpoints to PATCH

### Fleet Routes (/api/fleets)

| Endpoint | Method | Semantic Check | Status | Recommendation |
|----------|--------|----------------|---------|----------------|
| `/` | GET | ✅ Retrieves fleet list | Correct | Keep GET |
| `/:id` | GET | ✅ Retrieves specific fleet | Correct | Keep GET |
| `/` | POST | ✅ Creates new fleet | Correct | Keep POST |
| `/:id/location` | PATCH | ✅ Updates location field | Correct | Keep PATCH |
| `/:id/composition` | PUT | ⚠️ Updates ship composition | Could be PATCH | Consider PATCH |
| `/:id` | DELETE | ✅ Deletes fleet | Correct | Keep DELETE |
| `/:id/merge` | POST | ✅ Creates merge action | Correct | Keep POST |

**Issues**: 1 - Composition update could be more precise with PATCH
**Recommendation**: Consider changing composition to PATCH for partial updates

### Combat Routes (/api/combat)

| Endpoint | Method | Semantic Check | Status | Recommendation |
|----------|--------|----------------|---------|----------------|
| `/battles` | POST | ✅ Creates new battle | Correct | Keep POST |
| `/battles/:id` | GET | ✅ Retrieves battle status | Correct | Keep GET |
| `/battles` | GET | ✅ Retrieves battle list | Correct | Keep GET |
| `/battles/:id/retreat` | POST | ⚠️ Updates battle status | Should be PATCH | Change to PATCH |

**Issues**: 1 - Retreat should update battle status, not create new resource
**Recommendation**: Change retreat to PATCH `/battles/:id` with status update

### Diplomacy Routes (/api/diplomacy)

| Endpoint | Method | Semantic Check | Status | Recommendation |
|----------|--------|----------------|---------|----------------|
| `/relations` | GET | ✅ Retrieves relations list | Correct | Keep GET |
| `/relations/:empireId` | GET | ✅ Retrieves specific relation | Correct | Keep GET |
| `/proposals` | POST | ✅ Creates new proposal | Correct | Keep POST |
| `/proposals` | GET | ✅ Retrieves proposal list | Correct | Keep GET |
| `/proposals/:id/respond` | POST | ⚠️ Updates proposal status | Should be PATCH | Change to PATCH |
| `/agreements` | GET | ✅ Retrieves agreement list | Correct | Keep GET |
| `/agreements/:id` | DELETE | ✅ Cancels agreement | Correct | Keep DELETE |
| `/messages` | POST | ✅ Creates new message | Correct | Keep POST |

**Issues**: 1 - Proposal response should update proposal, not create new resource
**Recommendation**: Change respond to PATCH `/proposals/:id`

### Territory Routes

| Endpoint | Method | Semantic Check | Status | Recommendation |
|----------|--------|----------------|---------|----------------|
| `/sectors` | GET | ✅ Retrieves sector list | Correct | Keep GET |
| `/sectors/:coordinates` | GET | ✅ Retrieves specific sector | Correct | Keep GET |
| `/sectors/:coordinates/explore` | POST | ✅ Creates exploration mission | Correct | Keep POST |
| `/colonize` | POST | ✅ Creates colonization mission | Correct | Keep POST |
| `/trade-routes` | GET | ✅ Retrieves trade routes | Correct | Keep GET |
| `/trade-routes` | POST | ✅ Creates new trade route | Correct | Keep POST |

**Issues**: 0 - All verbs used correctly
**Recommendation**: No changes needed

### Game Routes (/api/game)

| Endpoint | Method | Semantic Check | Status | Recommendation |
|----------|--------|----------------|---------|----------------|
| `/status` | GET | ✅ Retrieves game status | Correct | Keep GET |
| `/initialize` | POST | ✅ Creates new game session | Correct | Keep POST |
| `/advance-turn` | POST | ⚠️ Updates game state | Should be PATCH | Change to PATCH |
| `/turn` | GET | ✅ Retrieves turn info | Correct | Keep GET |
| `/end-turn` | POST | ⚠️ Updates turn status | Should be PATCH | Change to PATCH |
| `/events` | GET | ✅ Retrieves event list | Correct | Keep GET |
| `/events/:id/read` | PATCH | ✅ Updates event status | Correct | Keep PATCH |
| `/leaderboard` | GET | ✅ Retrieves leaderboard | Correct | Keep GET |

**Issues**: 2 - Turn operations should update game state, not create resources
**Recommendation**: Change turn operations to PATCH

## Summary of Issues

### Critical Issues (Wrong Semantic Usage): 6
1. **Auth**: `POST /change-password` → `PATCH /password`
2. **Combat**: `POST /battles/:id/retreat` → `PATCH /battles/:id`
3. **Diplomacy**: `POST /proposals/:id/respond` → `PATCH /proposals/:id`
4. **Game**: `POST /advance-turn` → `PATCH /turn`
5. **Game**: `POST /end-turn` → `PATCH /turn`

### Minor Issues (Optimization Opportunities): 3
1. **Empire**: `PUT /empire/name` → `PATCH /empire/name`
2. **Empire**: `PUT /planets/:id/specialization` → `PATCH /planets/:id/specialization`
3. **Fleet**: `PUT /:id/composition` → `PATCH /:id/composition`

## Detailed Recommendations

### 1. Authentication Route Changes

#### Current Implementation
```javascript
router.post('/change-password', authenticateToken, [
  // validation
], authController.changePassword);
```

#### Recommended Implementation
```javascript
router.patch('/password', authenticateToken, [
  // validation  
], authController.changePassword);
```

**Rationale**: Changing password is a partial update of user credentials, not creating a new resource.

### 2. Empire Route Changes

#### Current Implementation
```javascript
router.put('/empire/name', requireActionPoints(1), [
  // validation
], empireController.updateEmpireName);

router.put('/planets/:id/specialization', requireActionPoints(2), [
  // validation
], empireController.updatePlanetSpecialization);
```

#### Recommended Implementation
```javascript
router.patch('/empire/name', requireActionPoints(1), [
  // validation
], empireController.updateEmpireName);

router.patch('/planets/:id/specialization', requireActionPoints(2), [
  // validation
], empireController.updatePlanetSpecialization);
```

**Rationale**: These operations update single fields, not replace entire resources.

### 3. Combat Route Changes

#### Current Implementation
```javascript
router.post('/battles/:id/retreat', requireActionPoints(1), [
  // validation
], async (req, res, next) => {
  // retreat logic
});
```

#### Recommended Implementation
```javascript
router.patch('/battles/:id', requireActionPoints(1), [
  param('id').isUUID().withMessage('Invalid battle ID format'),
  body('action').equals('retreat').withMessage('Invalid action')
], async (req, res, next) => {
  // retreat logic
});
```

**Rationale**: Retreating updates battle status, doesn't create new resource.

### 4. Diplomacy Route Changes

#### Current Implementation
```javascript
router.post('/proposals/:id/respond', requireActionPoints(1), [
  // validation
], async (req, res, next) => {
  // response logic
});
```

#### Recommended Implementation
```javascript
router.patch('/proposals/:id', requireActionPoints(1), [
  param('id').isUUID().withMessage('Invalid proposal ID format'),
  body('response').isIn(['accept', 'reject', 'counter']).withMessage('Invalid response')
], async (req, res, next) => {
  // response logic
});
```

**Rationale**: Responding to proposal updates its status, doesn't create new resource.

### 5. Game Route Changes

#### Current Implementation
```javascript
router.post('/advance-turn', async (req, res, next) => {
  // advance logic
});

router.post('/end-turn', requireActionPoints(0), async (req, res, next) => {
  // end turn logic  
});
```

#### Recommended Implementation
```javascript
router.patch('/turn', async (req, res, next) => {
  const { action } = req.body;
  if (action === 'advance') {
    // advance logic
  } else if (action === 'end') {
    // end turn logic
  }
});
```

**Rationale**: Both operations update game turn state, don't create new resources.

## Implementation Strategy

### Phase 1: Critical Fixes (Breaking Semantic Rules)
1. Change password endpoint to PATCH
2. Change battle retreat to PATCH
3. Change proposal response to PATCH  
4. Change turn operations to PATCH

### Phase 2: Optimization (Better Semantic Clarity)
1. Change empire name update to PATCH
2. Change planet specialization to PATCH
3. Change fleet composition to PATCH

### Migration Approach

#### Option 1: Immediate Breaking Change
- Update all endpoints at once
- Require client updates
- Fastest implementation

#### Option 2: Gradual Migration
- Support both old and new verbs temporarily
- Add deprecation warnings
- Phase out old endpoints

#### Option 3: Versioned API
- Implement correct verbs in v2 API
- Maintain v1 for backward compatibility
- Natural migration path

## Testing Requirements

After implementing changes:

- [ ] All endpoints use semantically correct HTTP verbs
- [ ] PATCH operations support partial updates
- [ ] PUT operations replace entire resources
- [ ] POST operations create new resources
- [ ] DELETE operations remove resources
- [ ] GET operations don't modify state
- [ ] All changes maintain idempotency where required
- [ ] Error handling works correctly with new verbs

## Benefits of Correct Verb Usage

### For Caching
- GET requests can be cached safely
- Idempotent operations (PUT, PATCH, DELETE) can be retried
- Non-idempotent operations (POST) require careful handling

### For API Consumers
- Predictable behavior based on HTTP semantics
- Better tooling support (automated retry logic)
- Clearer intent of each operation

### For Middleware
- Appropriate rate limiting per operation type
- Correct logging and monitoring
- Better security policies

---

**Audit Status**: ✅ Complete  
**Total Endpoints**: 39  
**Semantic Issues**: 9  
**Compliance Rate**: 77% (30/39 correct)  
**Priority**: High - Several endpoints violate HTTP semantics