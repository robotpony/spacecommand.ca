-- Create systems table (controlled_by will be added later after empires table)
CREATE TABLE IF NOT EXISTS systems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    coordinates JSONB NOT NULL, -- {x, y, z}
    description TEXT,
    danger_level INTEGER NOT NULL DEFAULT 0 CHECK (danger_level >= 0 AND danger_level <= 10),
    is_pvp_enabled BOOLEAN DEFAULT false,
    controlled_by UUID, -- Will add foreign key constraint later
    facilities TEXT[] DEFAULT '{}',
    market_prices JSONB DEFAULT '{}',
    discovered_by UUID[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create system connections table for jump routes
CREATE TABLE IF NOT EXISTS system_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_system_id UUID NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
    to_system_id UUID NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
    distance DECIMAL(10, 2) NOT NULL,
    travel_time INTEGER NOT NULL, -- in seconds
    is_dangerous BOOLEAN DEFAULT false,
    UNIQUE(from_system_id, to_system_id)
);

-- Create indexes
CREATE INDEX idx_systems_name ON systems(name);
CREATE INDEX idx_systems_danger_level ON systems(danger_level);
CREATE INDEX idx_systems_controlled_by ON systems(controlled_by);
CREATE INDEX idx_system_connections_from ON system_connections(from_system_id);
CREATE INDEX idx_system_connections_to ON system_connections(to_system_id);