-- Create planets table
CREATE TABLE IF NOT EXISTS planets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    system_id UUID NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES empires(id) ON DELETE SET NULL,
    coordinates JSONB NOT NULL, -- {x, y, z}
    specialization VARCHAR(20) NOT NULL DEFAULT 'balanced',
    population BIGINT NOT NULL DEFAULT 0,
    max_population BIGINT NOT NULL DEFAULT 1000000,
    resources JSONB NOT NULL DEFAULT '{"ore": 0, "crystals": 0, "energy": 0, "food": 0}'::jsonb,
    production_rates JSONB NOT NULL DEFAULT '{"ore": 10, "crystals": 5, "energy": 15, "food": 20}'::jsonb,
    defense_rating INTEGER NOT NULL DEFAULT 0,
    development_level INTEGER NOT NULL DEFAULT 0,
    is_colonized BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(system_id, name)
);

-- Create buildings table
CREATE TABLE IF NOT EXISTS buildings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    planet_id UUID NOT NULL REFERENCES planets(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL,
    level INTEGER NOT NULL DEFAULT 1,
    is_operational BOOLEAN DEFAULT true,
    maintenance_cost INTEGER NOT NULL DEFAULT 100,
    production_bonus DECIMAL(5, 2) NOT NULL DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_planets_system_id ON planets(system_id);
CREATE INDEX idx_planets_owner_id ON planets(owner_id);
CREATE INDEX idx_planets_specialization ON planets(specialization);
CREATE INDEX idx_planets_is_colonized ON planets(is_colonized);
CREATE INDEX idx_buildings_planet_id ON buildings(planet_id);
CREATE INDEX idx_buildings_type ON buildings(type);