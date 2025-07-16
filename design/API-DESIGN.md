# SpaceCommand RESTful API Design

## Overview

This document outlines the RESTful API design for the SpaceCommand web game. The API provides endpoints for empire management, military operations, diplomacy, and territory expansion, designed to support both a terminal REPL interface and web-based clients.

## API Architecture

### Base URL
- Development: `http://localhost:3000/api`
- Production: `https://spacecommand.ca/api`

### Authentication
- **Method**: Bearer token authentication
- **Header**: `Authorization: Bearer <token>`
- **Session Management**: Redis-based session storage with automatic cleanup
- **Token Expiry**: 7 days with sliding window refresh

### Response Format
Responses use HTTP status codes and headers properly instead of JSON envelopes:

**Success Responses:**
- Return the resource data directly in the response body
- Use appropriate HTTP status codes (200, 201, 204)
- Include relevant headers (Location, ETag, etc.)

**Error Responses:**
- Use appropriate HTTP status codes (400, 401, 403, 404, 409, 500)
- Return error details in response body only when helpful
- Include error context in headers when appropriate

**Example Success Response (200 OK):**
```json
{
  "id": "uuid",
  "name": "Galactic Federation",
  "resources": {
    "minerals": 15000,
    "energy": 12000
  }
}
```

**Example Error Response (400 Bad Request):**
```json
{
  "message": "Invalid specialization type",
  "details": {
    "field": "specialization",
    "allowedValues": ["mining", "energy", "agricultural", "research", "industrial", "fortress", "balanced"]
  }
}
```

## API Endpoints

### Authentication Endpoints

#### POST /api/auth/register
Register a new player account.
- **Body**: `{ "username": "string", "password": "string", "email": "string" }`
- **Success (201 Created)**: Returns player object, token in `Authorization` header
- **Error (409 Conflict)**: Username already exists
- **Error (400 Bad Request)**: Invalid input data

#### POST /api/auth/login
Authenticate existing player.
- **Body**: `{ "username": "string", "password": "string" }`
- **Success (200 OK)**: Returns player object, token in `Authorization` header
- **Error (401 Unauthorized)**: Invalid credentials
- **Error (400 Bad Request)**: Missing username or password

#### POST /api/auth/logout
Invalidate current session.
- **Headers**: `Authorization: Bearer <token>`
- **Success (204 No Content)**: Session terminated, no response body
- **Error (401 Unauthorized)**: Invalid or expired token

#### GET /api/auth/profile
Get current player profile.
- **Headers**: `Authorization: Bearer <token>`
- **Success (200 OK)**: Returns player profile object
- **Error (401 Unauthorized)**: Invalid or expired token

### Empire Management Endpoints

#### GET /api/empire
Get current empire status and overview.
- **Headers**: `Authorization: Bearer <token>`
- **Success (200 OK)**: Returns empire object with resources, production, planets, and fleets
- **Headers**: `ETag` for caching, `Last-Modified` for freshness
- **Error (401 Unauthorized)**: Invalid or expired token
- **Example Response**:
```json
{
  "id": "uuid",
  "name": "Galactic Federation",
  "resources": {
    "minerals": 15000,
    "energy": 12000,
    "food": 8000,
    "research": 2500,
    "population": 450
  },
  "resourceProduction": {
    "minerals": 850,
    "energy": 720,
    "food": 400,
    "research": 180,
    "population": 25
  },
  "planets": 8,
  "fleets": 12,
  "technology": { "level": 3, "points": 2500 }
}
```

#### GET /api/planets
List all controlled planets with details.
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**: `?specialization=mining&page=1&limit=10`
- **Response**: Array of planet objects with specialization, buildings, and production

#### GET /api/planets/:id
Get detailed information about a specific planet.
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Complete planet object with buildings, population, and production details

#### PUT /api/planets/:id/specialization
Set or change planet specialization.
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ "specialization": "mining" | "energy" | "agricultural" | "research" | "industrial" | "fortress" | "balanced" }`
- **Success (200 OK)**: Returns updated planet object
- **Error (404 Not Found)**: Planet not found or not owned
- **Error (400 Bad Request)**: Invalid specialization type
- **Error (409 Conflict)**: Planet already has that specialization

#### POST /api/planets/:id/buildings
Construct buildings on a planet.
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ "buildingType": "string", "quantity": number }`
- **Success (201 Created)**: Returns construction order, `Location` header with order ID
- **Error (404 Not Found)**: Planet not found or not owned
- **Error (400 Bad Request)**: Invalid building type or quantity
- **Error (402 Payment Required)**: Insufficient resources

#### GET /api/resources
Get detailed resource inventory and production rates.
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Detailed resource breakdown with production, consumption, and net change

### Military & Combat Endpoints

#### GET /api/fleets
List all fleets with current status and locations.
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**: `?location=sector_a&status=active`
- **Response**: Array of fleet objects with composition, location, and status

#### GET /api/fleets/:id
Get detailed information about a specific fleet.
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Complete fleet object with ship composition, combat stats, and command structure

#### PATCH /api/fleets/:id/location
Issue movement orders to a fleet.
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ "destination": "sector_coordinates", "speed": "normal" | "fast" | "stealth" }`
- **Success (202 Accepted)**: Movement order accepted, returns movement status
- **Error (404 Not Found)**: Fleet not found or not owned
- **Error (400 Bad Request)**: Invalid destination or speed
- **Error (409 Conflict)**: Fleet already in transit or in combat

#### POST /api/fleets
Create a new fleet from available ships.
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ "name": "string", "ships": { "fighters": 50, "cruisers": 12, "battleships": 3 }, "location": "sector_coordinates" }`
- **Success (201 Created)**: Returns new fleet object, `Location` header with fleet URL
- **Error (400 Bad Request)**: Invalid fleet composition or location
- **Error (402 Payment Required)**: Insufficient ships available

#### POST /api/combat/battles
Initiate combat against a target.
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ "attackerFleetId": "uuid", "targetType": "fleet" | "planet", "targetId": "uuid", "attackType": "conventional" | "orbital_bombardment" }`
- **Success (201 Created)**: Returns battle initiation, `Location` header with battle URL
- **Error (404 Not Found)**: Fleet or target not found
- **Error (400 Bad Request)**: Invalid attack parameters
- **Error (409 Conflict)**: Fleet already in combat or target protected

#### GET /api/combat/battles/:id
Get combat resolution status and results.
- **Headers**: `Authorization: Bearer <token>`
- **Success (200 OK)**: Returns combat record with battle phases, casualties, and outcome
- **Error (404 Not Found)**: Battle not found or not accessible
- **Error (202 Accepted)**: Battle still in progress, partial results returned

### Diplomacy Endpoints

#### GET /api/diplomacy/relations
Get current diplomatic status with all players.
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Array of diplomatic relationships with status, trust levels, and active agreements

#### POST /api/diplomacy/propose
Send a diplomatic proposal to another player.
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ "targetPlayerId": "uuid", "proposalType": "alliance" | "trade" | "non_aggression" | "research", "terms": {}, "message": "string" }`
- **Response**: Proposal confirmation with tracking ID

#### GET /api/diplomacy/messages
Get diplomatic communications and proposals.
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**: `?status=pending&page=1&limit=20`
- **Response**: Array of diplomatic messages with proposals and responses

#### POST /api/diplomacy/respond
Respond to a diplomatic proposal.
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ "proposalId": "uuid", "response": "accept" | "reject" | "counter", "counterTerms": {}, "message": "string" }`
- **Response**: Response confirmation and updated diplomatic status

#### POST /api/espionage/mission
Launch covert operation against another player.
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ "targetPlayerId": "uuid", "missionType": "intelligence" | "sabotage" | "infiltration", "resources": number }`
- **Response**: Mission confirmation with success probability

### Territory & Expansion Endpoints

#### GET /api/sectors
Get galaxy map data and sector information.
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**: `?region=core&controlled=true`
- **Response**: Array of sectors with control status, resources, and strategic value

#### GET /api/sectors/:coordinates
Get detailed information about a specific sector.
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Sector object with planets, fleets, resources, and control status

#### POST /api/colonize
Initiate colonization of an uncontrolled planet.
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ "planetId": "uuid", "colonistFleetId": "uuid", "specialization": "string" }`
- **Response**: Colonization confirmation and estimated completion time

#### GET /api/trade-routes
Get active trade connections and routes.
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Array of trade routes with partner, resources, and profit margins

#### POST /api/trade-routes
Establish new trade route with another player.
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ "partnerId": "uuid", "offerResources": {}, "requestResources": {}, "duration": "turns" }`
- **Response**: Trade route confirmation and activation status

### Game State Endpoints

#### GET /api/game/status
Get current game turn and phase information.
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Game state with turn number, phase, time remaining, and player actions

#### GET /api/game/turn
Get turn-specific information and available actions.
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Turn summary with completed actions, remaining action points, and upcoming events

#### POST /api/game/end-turn
End current turn and process pending actions.
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Turn completion confirmation and next turn preview

## Error Handling

### HTTP Status Codes
- `200 OK`: Successful GET/PUT request
- `201 Created`: Resource created successfully (POST)
- `202 Accepted`: Request accepted for processing (async operations)
- `204 No Content`: Successful request with no response body (DELETE)
- `400 Bad Request`: Invalid request format or parameters
- `401 Unauthorized`: Authentication required or invalid
- `402 Payment Required`: Insufficient resources for operation
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict (e.g., already exists, invalid state)
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server-side error

### HTTP Headers Usage
- `Authorization`: Bearer token for authentication
- `Location`: URL of newly created resource (201 responses)
- `ETag`: Entity tag for caching and optimistic locking
- `Last-Modified`: Resource modification timestamp
- `Content-Type`: Always `application/json` for API responses
- `X-RateLimit-*`: Rate limiting information
- `X-Game-Turn`: Current game turn number
- `X-Action-Points`: Remaining action points for current turn

## Rate Limiting

### Limits
- **Authentication**: 5 requests per minute per IP
- **General API**: 60 requests per minute per user
- **Combat Actions**: 10 requests per minute per user
- **Diplomacy**: 20 requests per minute per user

### Headers
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Timestamp when limit resets

## Security Considerations

### Data Validation
- All input data validated against schemas
- SQL injection prevention through parameterized queries
- XSS protection through input sanitization
- CSRF tokens for state-changing operations

### Access Control
- Resource-based permissions (players can only access their own data)
- Action validation against game rules
- Session management with automatic cleanup
- Audit logging for all game actions

### Performance Optimization
- Database query optimization with indexes
- Redis caching for frequently accessed data
- Response compression for large payloads
- Connection pooling for database connections

## WebSocket Integration

### Real-time Events
- Fleet movement completion
- Combat resolution
- Diplomatic messages
- Resource production updates
- Turn phase changes

### Event Format
```json
{
  "type": "FLEET_MOVED",
  "data": {
    "fleetId": "uuid",
    "newLocation": "sector_coordinates",
    "arrivalTime": "2025-07-16T10:30:00Z"
  },
  "timestamp": "2025-07-16T10:30:00Z"
}
```

## Testing Strategy

### Unit Tests
- Model validation and business logic
- Authentication and authorization
- Error handling and edge cases

### Integration Tests
- API endpoint functionality
- Database operations
- Session management

### Performance Tests
- Load testing with concurrent users
- Database query performance
- Rate limiting effectiveness

### Security Tests
- Authentication bypass attempts
- SQL injection prevention
- XSS protection validation

## Implementation Priority

### Phase 1: Core API (Current)
1. Authentication endpoints
2. Empire management endpoints
3. Basic resource operations

### Phase 2: Game Mechanics
1. Fleet and combat endpoints
2. Diplomacy system
3. Territory expansion

### Phase 3: Advanced Features
1. WebSocket integration
2. Real-time notifications
3. Advanced game state management

### Phase 4: Optimization
1. Performance improvements
2. Enhanced security
3. Comprehensive testing