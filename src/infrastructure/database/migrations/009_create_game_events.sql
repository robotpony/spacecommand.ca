-- Create game events table
CREATE TABLE IF NOT EXISTS game_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL,
    affected_systems UUID[] DEFAULT '{}',
    description TEXT NOT NULL,
    effects JSONB DEFAULT '{}',
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create player actions log table for audit and replay
CREATE TABLE IF NOT EXISTS action_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    empire_id UUID REFERENCES empires(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    action_data JSONB DEFAULT '{}',
    action_points_used INTEGER DEFAULT 0,
    turn_number INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create game sessions table
CREATE TABLE IF NOT EXISTS game_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_game_events_type ON game_events(type);
CREATE INDEX idx_game_events_is_active ON game_events(is_active);
CREATE INDEX idx_game_events_expires_at ON game_events(expires_at);
CREATE INDEX idx_action_log_player_id ON action_log(player_id);
CREATE INDEX idx_action_log_empire_id ON action_log(empire_id);
CREATE INDEX idx_action_log_turn_number ON action_log(turn_number);
CREATE INDEX idx_action_log_created_at ON action_log(created_at DESC);
CREATE INDEX idx_game_sessions_player_id ON game_sessions(player_id);
CREATE INDEX idx_game_sessions_token ON game_sessions(token);
CREATE INDEX idx_game_sessions_expires_at ON game_sessions(expires_at);