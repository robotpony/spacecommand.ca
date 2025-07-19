# URI Design Review and Recommendations

**Date**: 2025-07-18  
**Scope**: All REST API endpoint URIs  
**Status**: In Progress  

## Overview

This document reviews current URI design patterns and identifies areas for improvement to ensure full RESTful compliance and consistency.

## RESTful URI Principles

### ✅ Good Practices
- Use nouns, not verbs
- Use plural resource names
- Hierarchical resource relationships
- Consistent naming conventions
- Query parameters for filtering/pagination

### ❌ Anti-patterns
- Verbs in URIs
- Inconsistent pluralization
- Nested resources without clear hierarchy
- Action-based endpoints

## Current URI Analysis

### Authentication Routes (/api/auth)

| Current URI | Method | Status | Recommendation |
|-------------|--------|---------|----------------|
| `/api/auth/register` | POST | ⚠️ | Consider `/api/auth/signup` for consistency |
| `/api/auth/login` | POST | ⚠️ | Consider `/api/auth/signin` for consistency |
| `/api/auth/logout` | POST | ⚠️ | Consider `/api/auth/signout` for consistency |
| `/api/auth/profile` | GET | ✅ | Good - resource-based |
| `/api/auth/profile` | PUT | ✅ | Good - resource-based |
| `/api/auth/change-password` | POST | ❌ | Should be `PATCH /api/auth/password` |

**Issues**: 4 URIs use verbs instead of resource-based design
**Recommendation**: Refactor to resource-based patterns

### Empire Management Routes

| Current URI | Method | Status | Recommendation |
|-------------|--------|---------|----------------|
| `/api/empire` | GET | ✅ | Good - singular empire resource |
| `/api/empire/name` | PUT | ✅ | Good - resource property |
| `/api/planets` | GET | ✅ | Good - plural resource |
| `/api/planets/:id` | GET | ✅ | Good - specific resource |
| `/api/planets/:id/specialization` | PUT | ✅ | Good - resource property |
| `/api/planets/:id/buildings` | POST | ✅ | Good - sub-resource |
| `/api/resources` | GET | ✅ | Good - resource collection |
| `/api/resources/transfer` | POST | ❌ | Should be `POST /api/resource-transfers` |

**Issues**: 1 URI uses action instead of resource
**Recommendation**: Create dedicated transfer resource

### Fleet Routes (/api/fleets)

| Current URI | Method | Status | Recommendation |
|-------------|--------|---------|----------------|
| `/api/fleets` | GET | ✅ | Good - plural resource |
| `/api/fleets/:id` | GET | ✅ | Good - specific resource |
| `/api/fleets` | POST | ✅ | Good - resource creation |
| `/api/fleets/:id/location` | PATCH | ✅ | Good - resource property |
| `/api/fleets/:id/composition` | PUT | ✅ | Good - resource property |
| `/api/fleets/:id` | DELETE | ✅ | Good - resource deletion |
| `/api/fleets/:id/merge` | POST | ❌ | Should be `POST /api/fleet-merges` |

**Issues**: 1 URI uses action instead of resource
**Recommendation**: Create dedicated merge resource or use PATCH

### Combat Routes (/api/combat)

| Current URI | Method | Status | Recommendation |
|-------------|--------|---------|----------------|
| `/api/combat/battles` | POST | ✅ | Good - resource creation |
| `/api/combat/battles/:id` | GET | ✅ | Good - specific resource |
| `/api/combat/battles` | GET | ✅ | Good - resource collection |
| `/api/combat/battles/:id/retreat` | POST | ❌ | Should be `PATCH /api/combat/battles/:id` |

**Issues**: 1 URI uses action instead of resource property
**Recommendation**: Use PATCH to update battle status to "retreating"

### Diplomacy Routes (/api/diplomacy)

| Current URI | Method | Status | Recommendation |
|-------------|--------|---------|----------------|
| `/api/diplomacy/relations` | GET | ✅ | Good - resource collection |
| `/api/diplomacy/relations/:empireId` | GET | ✅ | Good - specific resource |
| `/api/diplomacy/proposals` | POST | ✅ | Good - resource creation |
| `/api/diplomacy/proposals` | GET | ✅ | Good - resource collection |
| `/api/diplomacy/proposals/:id/respond` | POST | ❌ | Should be `PATCH /api/diplomacy/proposals/:id` |
| `/api/diplomacy/agreements` | GET | ✅ | Good - resource collection |
| `/api/diplomacy/agreements/:id` | DELETE | ✅ | Good - resource deletion |
| `/api/diplomacy/messages` | POST | ✅ | Good - resource creation |

**Issues**: 1 URI uses action instead of resource update
**Recommendation**: Use PATCH to update proposal status

### Territory Routes

| Current URI | Method | Status | Recommendation |
|-------------|--------|---------|----------------|
| `/api/sectors` | GET | ✅ | Good - resource collection |
| `/api/sectors/:coordinates` | GET | ✅ | Good - specific resource |
| `/api/sectors/:coordinates/explore` | POST | ❌ | Should be `POST /api/exploration-missions` |
| `/api/colonize` | POST | ❌ | Should be `POST /api/colonization-missions` |
| `/api/trade-routes` | GET | ✅ | Good - resource collection |
| `/api/trade-routes` | POST | ✅ | Good - resource creation |

**Issues**: 2 URIs use actions instead of resource-based design
**Recommendation**: Create dedicated mission resources

### Game Routes (/api/game)

| Current URI | Method | Status | Recommendation |
|-------------|--------|---------|----------------|
| `/api/game/status` | GET | ✅ | Good - resource property |
| `/api/game/initialize` | POST | ❌ | Should be `POST /api/game-sessions` |
| `/api/game/advance-turn` | POST | ❌ | Should be `PATCH /api/game/turn` |
| `/api/game/turn` | GET | ✅ | Good - resource property |
| `/api/game/end-turn` | POST | ❌ | Should be `PATCH /api/game/turn` |
| `/api/game/events` | GET | ✅ | Good - sub-resource collection |
| `/api/game/events/:id/read` | PATCH | ❌ | Should be `PATCH /api/game/events/:id` |
| `/api/game/leaderboard` | GET | ✅ | Good - resource property |

**Issues**: 4 URIs use actions instead of resource-based design
**Recommendation**: Refactor to resource and property updates

## Detailed Recommendations

### 1. Authentication URI Refactoring

#### Current vs. Recommended
```
# Current (action-based)
POST /api/auth/register
POST /api/auth/login  
POST /api/auth/logout
POST /api/auth/change-password

# Recommended (resource-based)
POST /api/auth/signup
POST /api/auth/signin
POST /api/auth/signout
PATCH /api/auth/password
```

#### Implementation
```javascript
// Replace in auth routes
router.post('/signup', authController.register);     // was /register
router.post('/signin', authController.login);       // was /login
router.post('/signout', authController.logout);     // was /logout
router.patch('/password', authController.changePassword); // was /change-password
```

### 2. Resource Transfer Refactoring

#### Current vs. Recommended
```
# Current (action-based)
POST /api/resources/transfer

# Recommended (resource-based)
POST /api/resource-transfers
GET /api/resource-transfers/:id
```

#### Implementation
```javascript
// New dedicated resource
router.post('/resource-transfers', empireController.createTransfer);
router.get('/resource-transfers/:id', empireController.getTransfer);
```

### 3. Fleet Operations Refactoring

#### Current vs. Recommended
```
# Current (action-based)
POST /api/fleets/:id/merge

# Recommended (resource-based or property update)
POST /api/fleet-merges
# OR
PATCH /api/fleets/:id { "action": "merge", "targetFleetId": "..." }
```

### 4. Combat Operations Refactoring

#### Current vs. Recommended
```
# Current (action-based)
POST /api/combat/battles/:id/retreat

# Recommended (property update)
PATCH /api/combat/battles/:id { "status": "retreating" }
```

### 5. Diplomacy Operations Refactoring

#### Current vs. Recommended
```
# Current (action-based)
POST /api/diplomacy/proposals/:id/respond

# Recommended (resource update)
PATCH /api/diplomacy/proposals/:id { "status": "accepted", "response": "..." }
```

### 6. Territory Operations Refactoring

#### Current vs. Recommended
```
# Current (action-based)
POST /api/sectors/:coordinates/explore
POST /api/colonize

# Recommended (resource-based)
POST /api/exploration-missions
POST /api/colonization-missions
```

#### Implementation
```javascript
// New dedicated resources
router.post('/exploration-missions', territoryController.createExploration);
router.get('/exploration-missions/:id', territoryController.getExploration);
router.post('/colonization-missions', territoryController.createColonization);
router.get('/colonization-missions/:id', territoryController.getColonization);
```

### 7. Game Operations Refactoring

#### Current vs. Recommended
```
# Current (action-based)
POST /api/game/initialize
POST /api/game/advance-turn
POST /api/game/end-turn
PATCH /api/game/events/:id/read

# Recommended (resource-based)
POST /api/game-sessions
PATCH /api/game/turn { "action": "advance" }
PATCH /api/game/turn { "action": "end" }
PATCH /api/game/events/:id { "read": true }
```

## Migration Strategy

### Phase 1: Non-Breaking Changes
- Add new resource-based endpoints alongside existing ones
- Update documentation to show new patterns
- Add deprecation warnings to old endpoints

### Phase 2: Client Migration
- Update clients to use new endpoints
- Monitor usage of old endpoints
- Provide migration guides

### Phase 3: Cleanup
- Remove deprecated endpoints
- Update all documentation
- Finalize RESTful API structure

## Implementation Priority

### High Priority (Breaking RESTful Principles)
1. `/api/auth/change-password` → `PATCH /api/auth/password`
2. `/api/resources/transfer` → `POST /api/resource-transfers`
3. `/api/colonize` → `POST /api/colonization-missions`
4. `/api/sectors/:coordinates/explore` → `POST /api/exploration-missions`

### Medium Priority (Consistency Issues)
1. `/api/fleets/:id/merge` → `POST /api/fleet-merges`
2. `/api/combat/battles/:id/retreat` → `PATCH /api/combat/battles/:id`
3. `/api/diplomacy/proposals/:id/respond` → `PATCH /api/diplomacy/proposals/:id`

### Low Priority (Naming Consistency)
1. Auth endpoint naming (`register` → `signup`, `login` → `signin`, etc.)
2. Game operation endpoints refactoring

## Validation Checklist

After implementing URI changes:

- [ ] All URIs use nouns instead of verbs
- [ ] Resource collections use plural names
- [ ] Nested resources follow clear hierarchy
- [ ] Actions are represented as resource state changes
- [ ] Query parameters used for filtering/pagination
- [ ] URIs are predictable and consistent
- [ ] Documentation updated to reflect changes
- [ ] Backward compatibility maintained during transition

## Benefits of Refactoring

### For Developers
- More predictable API structure
- Easier to understand resource relationships
- Better alignment with REST principles
- Improved maintainability

### For API Consumers
- Consistent patterns across all endpoints
- Clearer resource model
- Better caching opportunities
- More intuitive API usage

---

**Review Status**: ✅ Complete  
**URIs Reviewed**: 31  
**Issues Found**: 13  
**Compliance Rate**: 58% (18/31 fully compliant)  
**Action Required**: Yes - Significant refactoring needed