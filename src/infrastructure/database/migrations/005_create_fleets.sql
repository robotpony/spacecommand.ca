-- Create fleets table
CREATE TABLE IF NOT EXISTS fleets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    owner_id UUID NOT NULL REFERENCES empires(id) ON DELETE CASCADE,
    current_system_id UUID NOT NULL REFERENCES systems(id),
    coordinates JSONB NOT NULL, -- {x, y, z}
    is_in_combat BOOLEAN DEFAULT false,
    is_moving BOOLEAN DEFAULT false,
    destination_system_id UUID REFERENCES systems(id),
    arrival_time TIMESTAMP WITH TIME ZONE,
    morale INTEGER NOT NULL DEFAULT 100 CHECK (morale >= 0 AND morale <= 100),
    experience INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ships table
CREATE TABLE IF NOT EXISTS ships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fleet_id UUID NOT NULL REFERENCES fleets(id) ON DELETE CASCADE,
    class VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    health INTEGER NOT NULL,
    max_health INTEGER NOT NULL,
    attack_power INTEGER NOT NULL,
    defense INTEGER NOT NULL,
    speed INTEGER NOT NULL,
    cargo_capacity INTEGER NOT NULL,
    current_cargo INTEGER NOT NULL DEFAULT 0,
    fuel_capacity INTEGER NOT NULL,
    current_fuel INTEGER NOT NULL,
    crew_required INTEGER NOT NULL,
    maintenance_cost INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_fleets_owner_id ON fleets(owner_id);
CREATE INDEX idx_fleets_current_system_id ON fleets(current_system_id);
CREATE INDEX idx_fleets_destination_system_id ON fleets(destination_system_id);
CREATE INDEX idx_fleets_is_in_combat ON fleets(is_in_combat);
CREATE INDEX idx_fleets_is_moving ON fleets(is_moving);
CREATE INDEX idx_ships_fleet_id ON ships(fleet_id);
CREATE INDEX idx_ships_class ON ships(class);