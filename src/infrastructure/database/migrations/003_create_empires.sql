-- Create empires table
CREATE TABLE IF NOT EXISTS empires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    faction VARCHAR(50) NOT NULL,
    home_system_id UUID NOT NULL REFERENCES systems(id),
    credits INTEGER NOT NULL DEFAULT 50000,
    technology_tier VARCHAR(20) NOT NULL DEFAULT 'chemical',
    action_points INTEGER NOT NULL DEFAULT 10,
    max_action_points INTEGER NOT NULL DEFAULT 10,
    turn_number INTEGER NOT NULL DEFAULT 1,
    score INTEGER NOT NULL DEFAULT 0,
    is_alive BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_empires_player_id ON empires(player_id);
CREATE INDEX idx_empires_faction ON empires(faction);
CREATE INDEX idx_empires_home_system_id ON empires(home_system_id);
CREATE INDEX idx_empires_score ON empires(score DESC);
CREATE INDEX idx_empires_is_alive ON empires(is_alive);