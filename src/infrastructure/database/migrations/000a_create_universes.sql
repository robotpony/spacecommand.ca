-- Create universes table for multi-universe gameplay
CREATE TABLE IF NOT EXISTS universes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    turn_duration_hours INTEGER DEFAULT 2,
    max_players INTEGER DEFAULT 100,
    max_actions_per_turn INTEGER DEFAULT 10,
    starting_credits INTEGER DEFAULT 10000,
    is_active BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    settings JSONB DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX idx_universes_name ON universes(name);
CREATE INDEX idx_universes_is_active ON universes(is_active);
CREATE INDEX idx_universes_is_public ON universes(is_public);
CREATE INDEX idx_universes_created_at ON universes(created_at DESC);