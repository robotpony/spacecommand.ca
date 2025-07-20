# Authentication System Design

**Project**: SpaceCommand.ca  
**Focus**: Player Authentication REST API  
**Date**: 2025-07-18  
**Status**: Design Phase - Ready for Review

## Overview

This document outlines the design for enhancing the existing authentication system to provide a complete, secure, and standardized REST API for player signup, sign-in, and session management.

## Current State Analysis

### Existing Infrastructure ✅
- **Authentication Controller** (`auth.js`) - Complete with register, login, logout, profile management
- **JWT Token System** - Secure token generation with 7-day expiry
- **Session Management** - Redis-based with PostgreSQL persistence
- **Password Security** - bcrypt with 12 salt rounds
- **Input Validation** - express-validator with comprehensive rules
- **Database Schema** - Players table with JSONB profile/settings/permissions
- **Middleware Stack** - Token validation, admin/moderator checks

### Current Endpoints
```
POST /api/auth/register     - Player registration ✅
POST /api/auth/login        - Player authentication ✅  
POST /api/auth/logout       - Session invalidation ✅
GET  /api/auth/profile      - Current user profile ✅
PUT  /api/auth/profile      - Update profile/settings ✅
POST /api/auth/change-password - Password update ✅
```

### Identified Gaps
- Inconsistent response format across endpoints
- Missing standardized error handling  
- No rate limiting on auth endpoints
- No token refresh mechanism
- Missing password reset flow
- No email verification system
- No session management endpoints
- Limited security monitoring

## Proposed Enhancements

### 1. Response Format Standardization

**Current**: Mixed response formats  
**Proposed**: Consistent JSON API responses

```json
{
  "success": boolean,
  "data": object | null,
  "message": string,
  "errors": array | null,
  "meta": {
    "timestamp": "ISO-8601",
    "version": "1.0"
  }
}
```

### 2. New REST Endpoints

#### Session Management
```
POST /api/auth/refresh       - Refresh JWT token
GET  /api/auth/sessions      - List active sessions  
DELETE /api/auth/sessions    - Revoke all sessions
DELETE /api/auth/sessions/:id - Revoke specific session
```

#### Password Recovery
```
POST /api/auth/forgot-password  - Initiate password reset
POST /api/auth/reset-password   - Complete password reset
GET  /api/auth/verify-email     - Email verification endpoint
```

#### Account Management
```
POST /api/auth/verify-email     - Send verification email
PUT  /api/auth/email           - Change email address
DELETE /api/auth/account       - Account deactivation
```

### 3. Enhanced Security Measures

#### Rate Limiting Strategy
- **Auth endpoints**: 5 attempts per minute per IP
- **Failed logins**: Progressive delays (1s, 2s, 4s, 8s, lockout)
- **Password reset**: 3 attempts per hour per email
- **Registration**: 10 accounts per day per IP

#### Input Validation Enhancement
```javascript
// Enhanced password requirements
{
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true, 
  requireNumbers: true,
  requireSymbols: true,
  forbidCommonPasswords: true,
  forbidPersonalInfo: true
}

// Username constraints
{
  minLength: 3,
  maxLength: 20,
  allowedChars: /^[a-zA-Z0-9_-]+$/,
  forbidReservedWords: true
}
```

#### Security Headers
```javascript
// Required security headers
{
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY", 
  "X-XSS-Protection": "1; mode=block",
  "Strict-Transport-Security": "max-age=31536000",
  "Content-Security-Policy": "default-src 'self'"
}
```

### 4. Session Management Enhancements

#### Multi-Device Support
```javascript
// Session metadata tracking
{
  sessionId: "uuid",
  deviceInfo: {
    userAgent: "browser info",
    ip: "client IP",
    location: "city, country",
    deviceType: "desktop|mobile|tablet"
  },
  createdAt: "timestamp",
  lastActivity: "timestamp"
}
```

#### Token Refresh Flow
```javascript
// JWT refresh mechanism
{
  accessToken: "short-lived (15 min)",
  refreshToken: "long-lived (7 days)", 
  refreshStrategy: "automatic renewal",
  maxRefreshCount: 100
}
```

### 5. Database Schema Additions

#### Password Reset Tokens
```sql
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Email Verification
```sql
CREATE TABLE email_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  verified_at TIMESTAMP NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Auth Audit Log
```sql
CREATE TABLE auth_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  event_type VARCHAR(50) NOT NULL, -- login, logout, register, etc.
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  failure_reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Implementation Plan

### Phase 1: Foundation (Low Risk)
- Standardize response formats
- Add comprehensive input validation
- Implement security headers
- Add audit logging

### Phase 2: Core Features (Medium Risk)  
- Token refresh mechanism
- Enhanced session management
- Rate limiting implementation
- Account lockout protection

### Phase 3: Advanced Features (High Risk)
- Password reset flow with email
- Email verification system
- Multi-device session tracking
- Two-factor authentication prep

### Phase 4: Security & Monitoring (Medium Risk)
- Security event monitoring
- Failed attempt tracking
- Suspicious activity detection
- Performance optimization

## Risk Assessment

### High Risk Items
- **Email integration**: Requires SMTP configuration and error handling
- **Token refresh security**: Must prevent replay attacks and token theft
- **Rate limiting accuracy**: Redis-based counters with race condition handling
- **Password reset security**: Time-based tokens with secure generation

### Medium Risk Items
- **Session management scaling**: Redis performance with many concurrent users
- **Input validation edge cases**: Unicode, injection attempts, malformed data
- **Database migration safety**: Schema changes in production environment
- **Cross-device synchronization**: Session state consistency

### Low Risk Items
- **Response format changes**: Backward-compatible additions
- **Security headers**: Standard HTTP security practices
- **Audit logging**: Write-only operations with minimal impact
- **Documentation updates**: Non-functional improvements

## Security Considerations

### Authentication Security
- JWT signing with RS256 (asymmetric keys)
- Secure session token generation (crypto.randomBytes)
- Password hashing with bcrypt (12+ rounds)
- Constant-time comparison for tokens

### Input Security  
- SQL injection prevention (parameterized queries)
- XSS prevention (input sanitization)
- CSRF protection (SameSite cookies + tokens)
- JSON payload size limits

### Infrastructure Security
- HTTPS enforcement (HSTS headers)
- Rate limiting (Redis-based counters)
- IP-based monitoring and blocking
- Session hijacking prevention

## Performance Considerations

### Database Optimization
- Indexed queries for auth operations
- Connection pooling for high concurrency
- Read replicas for session validation
- Query result caching where appropriate

### Redis Optimization
- Efficient key expiration strategies
- Memory usage monitoring
- Connection pooling and reuse
- Cluster mode for scaling

### API Performance
- Response time targets: < 200ms
- Concurrent user support: 1000+
- Request rate handling: 100 req/sec per endpoint
- Memory usage stability over time

## Testing Strategy

### Unit Tests
- All controller methods (100% coverage)
- Validation middleware functions
- Crypto and token utilities
- Error handling scenarios

### Integration Tests
- Complete auth flows (signup → login → logout)
- Session management operations
- Rate limiting behavior
- Database transaction integrity

### Security Tests
- SQL injection attempts
- XSS payload testing
- JWT token manipulation
- Session fixation attacks
- Brute force simulation

### Load Tests
- Concurrent login stress testing
- Session validation performance
- Database connection limits
- Redis memory usage patterns

## API Documentation

### OpenAPI Specification
Complete Swagger/OpenAPI 3.0 documentation with:
- Request/response schemas
- Authentication requirements
- Error code definitions
- Example requests/responses
- Rate limiting information

### Error Codes
Standardized error codes for all auth operations:
- `AUTH_001`: Invalid credentials
- `AUTH_002`: Account locked
- `AUTH_003`: Token expired
- `AUTH_004`: Rate limit exceeded
- `AUTH_005`: Email not verified

## Backwards Compatibility

### Existing Client Support
- Current endpoints remain functional
- Response format enhanced (not breaking)
- New headers added (non-breaking)
- JWT token format unchanged

### Migration Strategy
- Gradual rollout with feature flags
- A/B testing for response formats
- Monitoring for client compatibility
- Rollback plan for each enhancement

## Success Metrics

### Functional Metrics
- [ ] All auth flows working correctly
- [ ] Session management reliable
- [ ] Password security enforced
- [ ] Rate limiting effective

### Performance Metrics
- [ ] < 200ms average response time
- [ ] 99.9% uptime for auth services
- [ ] Support for 1000+ concurrent users
- [ ] Zero security incidents

### Security Metrics
- [ ] No successful brute force attacks
- [ ] All injection attempts blocked
- [ ] Session hijacking prevented
- [ ] Audit trail complete

## Conclusion

The existing authentication infrastructure is solid and well-implemented. The proposed enhancements focus on:

1. **Standardization** - Consistent APIs and error handling
2. **Security** - Enhanced protection and monitoring
3. **Scalability** - Support for growth and multiple devices
4. **User Experience** - Better error messages and recovery flows

The implementation can proceed incrementally with minimal risk to existing functionality while significantly improving the overall authentication system.

**Recommendation**: Proceed with Phase 1 implementation after stakeholder review and approval.