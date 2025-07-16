# Database Design Document

## Overview

This document outlines the database layer design for the SpaceCommand game, supporting the existing data models and providing a foundation for scalable multi-player gameplay.

## Database Technology Stack

### Primary Database: PostgreSQL
- **Rationale**: ACID compliance, complex queries, JSON support, mature ecosystem
- **Use Cases**: Player data, game state, transactions, complex relationships
- **Features**: Full-text search, spatial data support, robust indexing

### Caching Layer: Redis
- **Rationale**: High-performance in-memory storage, pub/sub capabilities
- **Use Cases**: Session management, real-time updates, temporary game state
- **Features**: Key expiration, atomic operations, clustering support

## Database Schema Design

### Core Tables

#### 1. Players Table
```sql
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_online BOOLEAN DEFAULT false,
    last_login TIMESTAMP,
    profile JSONB NOT NULL DEFAULT '{}',
    settings JSONB NOT NULL DEFAULT '{}',
    permissions JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. Empires Table
```sql
CREATE TABLE empires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    resources JSONB NOT NULL DEFAULT '{}',
    resource_production JSONB NOT NULL DEFAULT '{}',
    technology JSONB NOT NULL DEFAULT '{}',
    diplomacy JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. Planets Table
```sql
CREATE TABLE planets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empire_id UUID REFERENCES empires(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    position JSONB NOT NULL, -- {x, y, z}
    size VARCHAR(20) NOT NULL,
    type VARCHAR(30) NOT NULL,
    specialization VARCHAR(30) NOT NULL DEFAULT 'balanced',
    population INTEGER NOT NULL DEFAULT 0,
    max_population INTEGER NOT NULL DEFAULT 1000,
    buildings JSONB NOT NULL DEFAULT '[]',
    production JSONB NOT NULL DEFAULT '{}',
    defenses JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 4. Fleets Table
```sql
CREATE TABLE fleets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empire_id UUID REFERENCES empires(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    position JSONB NOT NULL, -- {x, y, z}
    destination JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'idle',
    ships JSONB NOT NULL DEFAULT '[]',
    commander JSONB,
    experience INTEGER NOT NULL DEFAULT 0,
    morale INTEGER NOT NULL DEFAULT 100,
    supplies INTEGER NOT NULL DEFAULT 100,
    speed INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 5. Combat Records Table
```sql
CREATE TABLE combat_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attacker_id UUID REFERENCES players(id),
    defender_id UUID REFERENCES players(id),
    attacker_fleet_id UUID REFERENCES fleets(id),
    defender_fleet_id UUID REFERENCES fleets(id),
    location JSONB NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'fleet',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    rounds JSONB NOT NULL DEFAULT '[]',
    result JSONB,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 6. Diplomacy Relations Table
```sql
CREATE TABLE diplomacy_relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empire_one_id UUID REFERENCES empires(id) ON DELETE CASCADE,
    empire_two_id UUID REFERENCES empires(id) ON DELETE CASCADE,
    relationship_type VARCHAR(20) NOT NULL DEFAULT 'neutral',
    trust_level INTEGER NOT NULL DEFAULT 50,
    agreements JSONB NOT NULL DEFAULT '[]',
    trade_routes JSONB NOT NULL DEFAULT '[]',
    message_history JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(empire_one_id, empire_two_id)
);
```

#### 7. Game Sessions Table
```sql
CREATE TABLE game_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 8. Game State Table
```sql
CREATE TABLE game_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    turn_number INTEGER NOT NULL DEFAULT 1,
    turn_phase VARCHAR(20) NOT NULL DEFAULT 'production',
    next_turn_at TIMESTAMP NOT NULL,
    active_players INTEGER NOT NULL DEFAULT 0,
    game_settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Indexes for Performance

```sql
-- Player lookup indexes
CREATE INDEX idx_players_username ON players(username);
CREATE INDEX idx_players_email ON players(email);
CREATE INDEX idx_players_active ON players(is_active);

-- Empire relationships
CREATE INDEX idx_empires_player_id ON empires(player_id);
CREATE INDEX idx_planets_empire_id ON planets(empire_id);
CREATE INDEX idx_fleets_empire_id ON fleets(empire_id);

-- Spatial indexes for position queries
CREATE INDEX idx_planets_position ON planets USING GIN(position);
CREATE INDEX idx_fleets_position ON fleets USING GIN(position);

-- Combat and diplomacy indexes
CREATE INDEX idx_combat_attacker ON combat_records(attacker_id);
CREATE INDEX idx_combat_defender ON combat_records(defender_id);
CREATE INDEX idx_diplomacy_empires ON diplomacy_relations(empire_one_id, empire_two_id);

-- Session management
CREATE INDEX idx_sessions_token ON game_sessions(session_token);
CREATE INDEX idx_sessions_expires ON game_sessions(expires_at);
```

## Base Model Architecture

### Abstract Base Model Class
```javascript
class BaseModel {
    constructor(tableName) {
        this.tableName = tableName;
        this.db = require('../config/database');
    }

    async create(data) {
        // INSERT with RETURNING
    }

    async findById(id) {
        // SELECT by primary key
    }

    async update(id, data) {
        // UPDATE with validation
    }

    async delete(id) {
        // Soft delete with is_active flag
    }

    async findAll(conditions = {}) {
        // SELECT with WHERE conditions
    }

    static withTransaction(callback) {
        // Transaction wrapper
    }
}
```

### Model-Specific Extensions
Each model (Player, Empire, Planet, Fleet, Combat, Diplomacy) will extend BaseModel with:
- Custom validation methods
- Specialized query methods
- Business logic integration
- Relationship helpers

## Redis Caching Strategy

### Session Management
```javascript
// Key: session:{token}
// Value: {playerId, expiresAt, lastActivity}
// TTL: 24 hours

const sessionKey = `session:${token}`;
await redis.setex(sessionKey, 86400, JSON.stringify(sessionData));
```

### Real-time Game State
```javascript
// Key: gamestate:turn:{turnNumber}
// Value: {phase, deadline, activeEvents}
// TTL: 25 hours

const gameStateKey = `gamestate:turn:${turnNumber}`;
await redis.setex(gameStateKey, 90000, JSON.stringify(turnData));
```

### Player Online Status
```javascript
// Key: online:{playerId}
// Value: {lastSeen, currentLocation}
// TTL: 5 minutes (auto-refresh)

const onlineKey = `online:${playerId}`;
await redis.setex(onlineKey, 300, JSON.stringify(statusData));
```

## Data Access Layer

### Repository Pattern
```javascript
class PlayerRepository extends BaseModel {
    constructor() {
        super('players');
    }

    async findByUsername(username) {
        return this.findOne({ username });
    }

    async createWithEmpire(playerData, empireData) {
        return this.withTransaction(async (trx) => {
            const player = await this.create(playerData, trx);
            const empire = await empireRepo.create({
                ...empireData,
                player_id: player.id
            }, trx);
            return { player, empire };
        });
    }
}
```

### Connection Management
```javascript
// config/database.js
const { Pool } = require('pg');
const Redis = require('redis');

const dbPool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

const redisClient = Redis.createClient({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    retry_strategy: (options) => {
        return Math.min(options.attempt * 100, 3000);
    }
});
```

## Migration System

### Database Migrations
```javascript
// migrations/001_create_players.js
exports.up = async (knex) => {
    await knex.schema.createTable('players', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.string('username', 50).notNullable().unique();
        table.string('email', 255).notNullable().unique();
        table.string('password_hash').notNullable();
        table.boolean('is_active').defaultTo(true);
        table.boolean('is_online').defaultTo(false);
        table.timestamp('last_login');
        table.jsonb('profile').notNullable().defaultTo('{}');
        table.jsonb('settings').notNullable().defaultTo('{}');
        table.jsonb('permissions').notNullable().defaultTo('{}');
        table.timestamps(true, true);
    });
};

exports.down = async (knex) => {
    await knex.schema.dropTable('players');
};
```

### Seed Data
```javascript
// seeds/001_admin_user.js
exports.seed = async (knex) => {
    await knex('players').insert({
        username: 'admin',
        email: 'admin@spacecommand.ca',
        password_hash: '$2b$10$...',
        permissions: {
            isAdmin: true,
            isModerator: true,
            canCreateGames: true,
            canJoinGames: true,
            canChat: true
        }
    });
};
```

## Security Considerations

### Data Protection
- All passwords hashed with bcrypt (salt rounds: 12)
- Session tokens are cryptographically secure random strings
- Sensitive data (emails, permissions) excluded from public APIs
- SQL injection protection through parameterized queries

### Access Control
- Role-based permissions system
- API endpoint authorization middleware
- Rate limiting on authentication endpoints
- Session timeout and cleanup

### Data Validation
```javascript
const Joi = require('joi');

const playerSchema = Joi.object({
    username: Joi.string().alphanum().min(3).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required()
});
```

## Performance Optimization

### Query Optimization
- Appropriate indexes on frequently queried columns
- Connection pooling for database connections
- Prepared statements for repeated queries
- EXPLAIN ANALYZE for query performance monitoring

### Caching Strategy
- Redis for session management and real-time data
- Application-level caching for static reference data
- Cache invalidation on data updates

### Monitoring
- Query performance logging
- Connection pool metrics
- Redis memory usage monitoring
- Automated alerts for performance degradation

## Testing Strategy

### Unit Tests
```javascript
describe('PlayerRepository', () => {
    beforeEach(async () => {
        await setupTestDatabase();
    });

    test('should create player with valid data', async () => {
        const playerData = {
            username: 'testuser',
            email: 'test@example.com',
            password: 'password123'
        };
        
        const player = await playerRepo.create(playerData);
        expect(player.username).toBe('testuser');
        expect(player.password_hash).toBeDefined();
    });
});
```

### Integration Tests
- Database connection testing
- Redis connectivity testing
- Migration rollback testing
- Transaction handling testing

## Deployment Considerations

### Database Setup
- PostgreSQL 14+ with required extensions
- Redis 6+ with persistence configuration
- Backup and recovery procedures
- Connection pooling configuration

### Environment Configuration
```javascript
// config/environment.js
module.exports = {
    development: {
        database: {
            host: 'localhost',
            port: 5432,
            database: 'spacecommand_dev'
        },
        redis: {
            host: 'localhost',
            port: 6379
        }
    },
    production: {
        database: {
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            database: process.env.DB_NAME,
            ssl: { rejectUnauthorized: false }
        },
        redis: {
            host: process.env.REDIS_HOST,
            port: process.env.REDIS_PORT,
            password: process.env.REDIS_PASSWORD
        }
    }
};
```

## Next Steps

1. **Database Configuration**: Set up PostgreSQL and Redis connections
2. **Migration System**: Implement database migration framework
3. **Base Model Implementation**: Create abstract base model class
4. **Repository Pattern**: Implement repository classes for each model
5. **Session Management**: Integrate Redis-based session handling
6. **Testing Framework**: Set up unit and integration tests
7. **Performance Monitoring**: Add query performance tracking

This design provides a solid foundation for the SpaceCommand game database layer, supporting the existing data models while enabling scalable multi-player functionality.