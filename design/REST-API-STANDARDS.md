# SpaceCommand REST API Design Standards

**Version**: 1.0  
**Date**: 2025-07-18  
**Status**: Active  

## Overview

This document defines the official REST API design standards for SpaceCommand.ca. All new endpoints and modifications to existing endpoints must follow these standards.

## General Principles

### 1. Resource-Oriented Design
- Use nouns, not verbs in URI paths
- Resources should be plural: `/api/fleets`, `/api/planets`
- Nested resources follow hierarchy: `/api/empires/:id/planets`

### 2. HTTP Methods
- **GET**: Retrieve resources (safe, idempotent)
- **POST**: Create new resources or non-idempotent actions
- **PUT**: Replace entire resource (idempotent)
- **PATCH**: Partial resource update (idempotent)
- **DELETE**: Remove resource (idempotent)

### 3. Status Codes
Always use appropriate HTTP status codes:

#### Success Codes
- **200 OK**: Successful GET, PUT, PATCH operations
- **201 Created**: Successful resource creation
- **202 Accepted**: Request accepted for async processing
- **204 No Content**: Successful DELETE or empty response

#### Client Error Codes
- **400 Bad Request**: Malformed request syntax
- **401 Unauthorized**: Authentication required
- **403 Forbidden**: Access denied (authenticated but not authorized)
- **404 Not Found**: Resource not found
- **409 Conflict**: Resource conflict (duplicate, business rule violation)
- **422 Unprocessable Entity**: Validation errors
- **429 Too Many Requests**: Rate limit exceeded

#### Server Error Codes
- **500 Internal Server Error**: Unexpected server error
- **503 Service Unavailable**: Temporary server overload

## Response Format Standards

### Success Response Format
```json
{
  "data": {
    // Resource data or array of resources
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  },
  "meta": {
    "timestamp": "2025-07-18T10:00:00.000Z",
    "version": "1.0",
    "requestId": "req-123abc"
  }
}
```

### Error Response Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "username",
        "code": "INVALID_LENGTH",
        "message": "Username must be 3-30 characters"
      }
    ]
  },
  "meta": {
    "timestamp": "2025-07-18T10:00:00.000Z",
    "requestId": "req-123abc"
  }
}
```

### Single Resource Response
```json
{
  "data": {
    "id": "fleet-123",
    "name": "Alpha Squadron",
    "status": "idle",
    "createdAt": "2025-07-18T09:00:00.000Z",
    "updatedAt": "2025-07-18T10:00:00.000Z"
  },
  "meta": {
    "timestamp": "2025-07-18T10:00:00.000Z",
    "version": "1.0"
  }
}
```

### Collection Response
```json
{
  "data": [
    {
      "id": "fleet-123",
      "name": "Alpha Squadron"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "pages": 3
  },
  "meta": {
    "timestamp": "2025-07-18T10:00:00.000Z",
    "version": "1.0"
  }
}
```

## URI Design Standards

### Resource Naming
- Use plural nouns: `/api/fleets`, `/api/planets`
- Use kebab-case for multi-word resources: `/api/trade-routes`
- Resource IDs should be UUIDs or meaningful identifiers

### URL Structure Patterns
```
GET    /api/fleets                    # List all fleets
POST   /api/fleets                    # Create new fleet
GET    /api/fleets/:id                # Get specific fleet
PUT    /api/fleets/:id                # Replace fleet
PATCH  /api/fleets/:id                # Update fleet
DELETE /api/fleets/:id                # Delete fleet

GET    /api/fleets/:id/ships          # Get fleet ships
POST   /api/fleets/:id/ships          # Add ships to fleet
PATCH  /api/fleets/:id/location       # Update fleet location
POST   /api/fleets/:id/merge          # Merge with another fleet
```

### Query Parameters
Use consistent query parameter names:
- **Pagination**: `page`, `limit`
- **Sorting**: `sort`, `order` (asc/desc)
- **Filtering**: Use resource field names
- **Search**: `q` or `search`

### Examples
```
GET /api/fleets?page=2&limit=50&status=idle&sort=name&order=asc
GET /api/planets?specialization=mining&page=1&limit=20
GET /api/combat/battles?status=completed&timeframe=7d
```

## Field Naming Standards

### Casing
- Use **camelCase** for all JSON fields
- Database fields can use snake_case but convert to camelCase in responses

### Standard Field Names
- **id**: Unique resource identifier
- **createdAt**: Resource creation timestamp (ISO 8601)
- **updatedAt**: Last modification timestamp (ISO 8601)
- **deletedAt**: Soft deletion timestamp (if applicable)

### Timestamp Format
All timestamps must be in ISO 8601 format with UTC timezone:
```json
{
  "createdAt": "2025-07-18T10:00:00.000Z",
  "updatedAt": "2025-07-18T10:30:15.123Z"
}
```

## Pagination Standards

### Request Parameters
- **page**: Page number (default: 1, minimum: 1)
- **limit**: Items per page (default: 20, minimum: 1, maximum: 100)

### Response Format
```json
{
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 150,
    "pages": 8,
    "hasNext": true,
    "hasPrev": true
  }
}
```

### Link Headers (Optional)
```
Link: </api/fleets?page=1&limit=20>; rel="first",
      </api/fleets?page=3&limit=20>; rel="next",
      </api/fleets?page=1&limit=20>; rel="prev",
      </api/fleets?page=8&limit=20>; rel="last"
```

## Error Handling Standards

### Error Codes
Use consistent error codes across the API:

#### Validation Errors
- **VALIDATION_ERROR**: General validation failure
- **INVALID_FORMAT**: Invalid data format
- **REQUIRED_FIELD**: Missing required field
- **INVALID_LENGTH**: Field length validation
- **INVALID_VALUE**: Invalid field value

#### Authentication/Authorization
- **AUTHENTICATION_REQUIRED**: Missing or invalid authentication
- **ACCESS_DENIED**: Insufficient permissions
- **TOKEN_EXPIRED**: Authentication token expired
- **ACCOUNT_LOCKED**: Account temporarily locked

#### Resource Errors
- **RESOURCE_NOT_FOUND**: Requested resource doesn't exist
- **RESOURCE_CONFLICT**: Resource already exists or conflict
- **INSUFFICIENT_RESOURCES**: Not enough game resources
- **OPERATION_NOT_ALLOWED**: Business rule violation

#### Rate Limiting
- **RATE_LIMIT_EXCEEDED**: Too many requests

### Error Response Examples

#### Validation Error
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "ships.fighters",
        "code": "INVALID_VALUE",
        "message": "Fighters count must be between 0 and 1000"
      }
    ]
  }
}
```

#### Authentication Error
```json
{
  "error": {
    "code": "AUTHENTICATION_REQUIRED",
    "message": "Valid authentication token required"
  }
}
```

#### Resource Error
```json
{
  "error": {
    "code": "INSUFFICIENT_RESOURCES",
    "message": "Not enough minerals to build fleet",
    "details": {
      "required": { "minerals": 5000 },
      "available": { "minerals": 2500 }
    }
  }
}
```

## HTTP Headers Standards

### Request Headers
- **Content-Type**: `application/json` for JSON payloads
- **Authorization**: `Bearer <token>` for JWT authentication
- **Accept**: `application/json` (default assumed)
- **User-Agent**: Client identification

### Response Headers
- **Content-Type**: `application/json; charset=utf-8`
- **Cache-Control**: Appropriate caching directives
- **ETag**: Entity tag for conditional requests
- **Last-Modified**: Resource modification time
- **Location**: Resource location for 201 Created responses
- **X-RateLimit-***: Rate limiting information

### Example Response Headers
```
Content-Type: application/json; charset=utf-8
ETag: "abc123"
Last-Modified: Wed, 18 Jul 2025 10:00:00 GMT
Cache-Control: private, max-age=300
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1626606000
```

## Security Standards

### Authentication
- Use JWT tokens in Authorization header
- Token format: `Bearer <jwt-token>`
- Include proper token expiration

### Input Validation
- Validate all input parameters
- Sanitize input to prevent injection attacks
- Use appropriate validation libraries

### Rate Limiting
- Implement rate limiting per endpoint category
- Return rate limit headers
- Use 429 status code when exceeded

### CORS
- Configure CORS appropriately for client domains
- Don't use wildcard (*) in production

## Versioning Strategy

### URL Versioning (Recommended)
```
/api/v1/fleets
/api/v1/planets
```

### Header Versioning (Alternative)
```
Accept: application/vnd.spacecommand.v1+json
```

### Version Lifecycle
- Support previous version for at least 6 months
- Provide migration documentation
- Use deprecation warnings in responses

## Testing Standards

### Response Validation
Every endpoint should validate:
- Correct HTTP status code
- Response format matches schema
- Required fields present
- Correct data types
- Proper error handling

### Performance Requirements
- Response time < 200ms for simple operations
- Response time < 2s for complex operations
- Proper pagination for large datasets

## Documentation Requirements

### OpenAPI/Swagger
- All endpoints must be documented in OpenAPI format
- Include request/response schemas
- Provide example requests and responses
- Document error scenarios

### Endpoint Documentation
Each endpoint should document:
- Purpose and usage
- Request parameters
- Response format
- Possible error codes
- Rate limiting information
- Authentication requirements

## Compliance Checklist

Before deploying any API endpoint, verify:

- [ ] Follows resource-oriented URI design
- [ ] Uses appropriate HTTP methods and status codes
- [ ] Returns consistent response format
- [ ] Implements proper error handling
- [ ] Includes appropriate HTTP headers
- [ ] Follows pagination standards (if applicable)
- [ ] Implements authentication/authorization
- [ ] Has rate limiting configured
- [ ] Is documented in OpenAPI spec
- [ ] Has comprehensive tests
- [ ] Validates all input
- [ ] Handles edge cases properly

## Examples

### Complete Fleet API Example

```http
# Create fleet
POST /api/fleets
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Alpha Squadron",
  "ships": {
    "fighters": 50,
    "destroyers": 10
  },
  "location": "sector-12:planet-3"
}

# Response
HTTP/1.1 201 Created
Content-Type: application/json
Location: /api/fleets/fleet-abc123

{
  "data": {
    "id": "fleet-abc123",
    "name": "Alpha Squadron",
    "location": "sector-12:planet-3",
    "status": "idle",
    "ships": {
      "fighters": 50,
      "destroyers": 10
    },
    "totalShips": 60,
    "combatPower": 750,
    "createdAt": "2025-07-18T10:00:00.000Z",
    "updatedAt": "2025-07-18T10:00:00.000Z"
  },
  "meta": {
    "timestamp": "2025-07-18T10:00:00.000Z",
    "version": "1.0"
  }
}
```

---

This document serves as the authoritative guide for REST API design in SpaceCommand.ca. All developers must follow these standards to ensure consistency and maintainability.