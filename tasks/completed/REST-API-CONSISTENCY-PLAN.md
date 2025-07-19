# REST API Consistency and Design Review Plan

**Project**: SpaceCommand.ca  
**Focus**: REST API Consistency and RESTful Principles Implementation  
**Date**: 2025-07-18  

## Overview

This plan addresses inconsistencies in the current REST API implementation and ensures all endpoints follow RESTful principles consistently. After analyzing all existing routes (auth, empire, fleets, combat, diplomacy, territory, game), several areas need standardization.

## Current API Analysis

### Existing Route Structure
```
/api/auth/*           - Authentication endpoints
/api/empire/*         - Empire management  
/api/planets/*        - Planet management (via empire routes)
/api/resources/*      - Resource management (via empire routes)
/api/fleets/*         - Fleet operations
/api/combat/*         - Combat system
/api/diplomacy/*      - Diplomatic relations
/api/sectors/*        - Territory and exploration (via territory routes)
/api/colonize         - Colonization (via territory routes)
/api/trade-routes/*   - Trade management (via territory routes)
/api/game/*           - Game state and turn management
```

## Issues Identified

### 1. Inconsistent Resource Representation
- **Problem**: Some resources returned with mixed casing, inconsistent field names
- **Risk**: Medium - Client integration complexity
- **Complexity**: Low

### 2. HTTP Status Code Inconsistencies  
- **Problem**: Some endpoints use non-standard status codes for similar operations
- **Risk**: Medium - API consumer confusion
- **Complexity**: Low

### 3. Pagination Implementation Varies
- **Problem**: Different pagination parameter names and response formats
- **Risk**: Low - Documentation and client complexity
- **Complexity**: Low

### 4. Error Response Format Inconsistencies
- **Problem**: Error responses have different structures across endpoints
- **Risk**: High - Error handling complexity
- **Complexity**: Medium

### 5. URI Design Inconsistencies
- **Problem**: Some routes don't follow RESTful URI conventions
- **Risk**: Medium - API usability
- **Complexity**: Medium

### 6. HTTP Verb Usage Issues
- **Problem**: Some operations use incorrect HTTP verbs
- **Risk**: Medium - RESTful principle violations
- **Complexity**: Low

## Task List

### Phase 1: API Design Standards Documentation
- [ ] **Define REST API design standards** - Create comprehensive style guide (Medium complexity, Low risk)
- [ ] **Standardize response format schema** - Define consistent JSON response structure (Low complexity, Low risk)
- [ ] **Define error response standards** - Consistent error format and status codes (Medium complexity, Medium risk)
- [ ] **Create pagination standards** - Uniform pagination parameters and response format (Low complexity, Low risk)

### Phase 2: HTTP Status Code Standardization
- [ ] **Audit all endpoint status codes** - Review current usage vs. standards (Low complexity, Low risk)
- [ ] **Fix auth endpoints status codes** - Ensure proper 200/201/204/400/401/403 usage (Low complexity, Low risk)
- [ ] **Fix empire endpoints status codes** - Standardize resource operations (Low complexity, Low risk)
- [ ] **Fix fleet endpoints status codes** - Correct 201 for creation, 204 for deletion (Low complexity, Low risk)
- [ ] **Fix combat endpoints status codes** - Use 202 for async operations (Low complexity, Low risk)
- [ ] **Fix diplomacy endpoints status codes** - Standardize proposal/response codes (Low complexity, Low risk)
- [ ] **Fix territory endpoints status codes** - Correct exploration/colonization codes (Low complexity, Low risk)
- [ ] **Fix game endpoints status codes** - Standardize turn management codes (Low complexity, Low risk)

### Phase 3: URI Design Improvements
- [ ] **Review URI conventions** - Ensure noun-based resource URLs (Medium complexity, Low risk)
- [ ] **Fix non-RESTful URIs** - Convert action-based to resource-based where appropriate (Medium complexity, Medium risk)
- [ ] **Standardize parameter usage** - Use query params vs. path params consistently (Low complexity, Low risk)
- [ ] **Review nested resource patterns** - Ensure proper resource hierarchy (Medium complexity, Low risk)

### Phase 4: HTTP Verb Corrections
- [ ] **Audit HTTP verb usage** - Review GET/POST/PUT/PATCH/DELETE usage (Low complexity, Low risk)
- [ ] **Fix incorrect verb usage** - Ensure idempotent operations use appropriate verbs (Low complexity, Medium risk)
- [ ] **Implement proper PATCH usage** - For partial updates vs. full PUT updates (Medium complexity, Low risk)
- [ ] **Review POST usage** - Ensure only for creation or non-idempotent operations (Low complexity, Low risk)

### Phase 5: Response Format Standardization
- [ ] **Standardize resource representations** - Consistent field naming and casing (Medium complexity, Medium risk)
- [ ] **Implement consistent pagination** - Uniform format across all paginated endpoints (Medium complexity, Low risk)
- [ ] **Standardize error responses** - Consistent error format and field names (Medium complexity, Medium risk)
- [ ] **Add response headers** - Proper ETag, Last-Modified, Location headers (Low complexity, Low risk)
- [ ] **Implement HATEOAS where appropriate** - Add relevant links to responses (High complexity, Low risk)

### Phase 6: Validation and Security Consistency
- [ ] **Standardize input validation** - Consistent validation rules and error messages (Medium complexity, Medium risk)
- [ ] **Review authentication middleware** - Ensure consistent application (Low complexity, High risk)
- [ ] **Standardize authorization patterns** - Consistent resource ownership checks (Medium complexity, High risk)
- [ ] **Review rate limiting application** - Ensure consistent limits across similar operations (Low complexity, Medium risk)

### Phase 7: Content Negotiation and Caching
- [ ] **Implement proper content-type handling** - Consistent JSON content type usage (Low complexity, Low risk)
- [ ] **Add caching headers** - ETag and cache-control for appropriate resources (Medium complexity, Low risk)
- [ ] **Implement conditional requests** - If-None-Match, If-Modified-Since support (Medium complexity, Low risk)
- [ ] **Review compression usage** - Ensure consistent gzip/deflate support (Low complexity, Low risk)

### Phase 8: Testing and Documentation
- [ ] **Create API compliance tests** - Test suite for RESTful compliance (High complexity, Low risk)
- [ ] **Update API documentation** - Reflect all standardization changes (Medium complexity, Low risk)
- [ ] **Create REST API style guide** - Document standards for future development (Low complexity, Low risk)
- [ ] **Performance test standardized endpoints** - Ensure changes don't impact performance (Medium complexity, Medium risk)

## Specific Issues to Address

### Authentication Routes (/api/auth)
- **Status Codes**: ✅ Generally correct (200 for login, 201 for registration)
- **Response Format**: ⚠️ Needs standardization for error messages
- **URI Design**: ✅ Good resource-based design

### Empire/Planet/Resource Routes
- **Status Codes**: ⚠️ Some operations missing proper 201/204 responses
- **Pagination**: ⚠️ Inconsistent query parameter names
- **Response Format**: ⚠️ Mixed camelCase/snake_case in responses

### Fleet Routes (/api/fleets)
- **HTTP Verbs**: ✅ Good use of PATCH for partial updates
- **Status Codes**: ⚠️ PATCH location should return 200, not 202 unless async
- **Response Format**: ✅ Generally consistent

### Combat Routes (/api/combat)
- **URI Design**: ⚠️ Consider `/api/combat/battles/:id/participants` for battle details
- **Status Codes**: ✅ Good use of 202 for async operations
- **Response Format**: ⚠️ Battle status responses need standardization

### Diplomacy Routes (/api/diplomacy)
- **URI Design**: ✅ Good nested resource design
- **Status Codes**: ✅ Appropriate for CRUD operations
- **Response Format**: ⚠️ Proposal/response format needs consistency

### Territory Routes
- **URI Design**: ⚠️ `/api/colonize` should be POST `/api/planets/:id/colonize`
- **Status Codes**: ✅ Good use of 202 for long-running operations
- **Pagination**: ⚠️ Sector listing needs consistent pagination

### Game Routes (/api/game)
- **Response Format**: ⚠️ Game state representation needs standardization
- **Status Codes**: ✅ Appropriate for game operations
- **Caching**: ❌ Missing ETag/Last-Modified headers for game state

## Implementation Standards

### Response Format Standard
```json
{
  "data": {},
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  },
  "meta": {
    "timestamp": "2025-07-18T10:00:00Z",
    "version": "1.0.0"
  }
}
```

### Error Format Standard
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "username",
        "message": "Username must be 3-30 characters"
      }
    ]
  },
  "meta": {
    "timestamp": "2025-07-18T10:00:00Z",
    "requestId": "req-123"
  }
}
```

### Pagination Standard
- Query Parameters: `page`, `limit`, `sort`, `order`
- Response includes: `page`, `limit`, `total`, `pages`
- Default: `page=1`, `limit=20`
- Maximum: `limit=100`

### HTTP Status Code Standards
- **200**: Successful GET, PUT, PATCH operations
- **201**: Successful resource creation (POST)
- **202**: Accepted for async operations
- **204**: Successful DELETE or no content response
- **400**: Client error (validation, malformed request)
- **401**: Authentication required
- **403**: Authorization denied (authenticated but not permitted)
- **404**: Resource not found
- **409**: Conflict (duplicate resource, business rule violation)
- **422**: Unprocessable entity (validation error)
- **429**: Rate limit exceeded
- **500**: Internal server error

## Success Criteria

- [ ] All endpoints return consistent response formats
- [ ] HTTP status codes follow RESTful conventions
- [ ] URI design follows resource-based patterns
- [ ] Pagination is implemented consistently
- [ ] Error responses have uniform structure
- [ ] Authentication and authorization are consistent
- [ ] All endpoints support proper HTTP headers
- [ ] API documentation reflects all standards
- [ ] Compliance tests pass for all endpoints

## Risk Assessment

**High Risk Items:**
- Authentication/authorization changes
- Breaking changes to existing client integrations
- Database query performance impacts

**Medium Risk Items:**
- Response format changes
- URI structure modifications
- HTTP status code changes

**Low Risk Items:**
- Header additions
- Documentation updates
- Internal code organization

## Implementation Approach

1. **Backward Compatibility**: Implement changes in a way that maintains compatibility
2. **Versioning Strategy**: Consider API versioning for breaking changes
3. **Gradual Rollout**: Implement standards incrementally by endpoint group
4. **Client Communication**: Document all changes and migration paths
5. **Testing**: Comprehensive testing before and after changes

## Questions for Review

1. **API Versioning**: Should we implement versioning (e.g., /api/v1/) for breaking changes?
2. **Backward Compatibility**: How long should we maintain compatibility with old response formats?
3. **Performance Impact**: Are there any standardization changes that might impact performance?
4. **Client Dependencies**: Which clients depend on current response formats and need migration?

---

This plan ensures the SpaceCommand.ca API follows RESTful principles consistently while maintaining functionality and performance.