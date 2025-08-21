-- Create players table (game characters, linked to users)
-- Note: username and email columns kept for backward compatibility during migration
-- They will be removed after data migration to users table
CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    universe_id UUID NOT NULL,
    username VARCHAR(50) NOT NULL, -- Will be migrated to users table
    email VARCHAR(255), -- Will be migrated to users table
    password_hash VARCHAR(255), -- Will be migrated to users table
    faction VARCHAR(50) NOT NULL DEFAULT 'independent',
    empire_id UUID,
    credits INTEGER NOT NULL DEFAULT 10000,
    reputation INTEGER NOT NULL DEFAULT 0,
    last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    is_banned BOOLEAN DEFAULT false,
    stats JSONB DEFAULT '{"gamesPlayed": 0, "victories": 0, "totalCredits": 10000, "shipsDestroyed": 0, "tradeMissions": 0}'::jsonb,
    UNIQUE(universe_id, username)
);

-- Create indexes
CREATE INDEX idx_players_user_id ON players(user_id);
CREATE INDEX idx_players_universe_id ON players(universe_id);
CREATE INDEX idx_players_username ON players(username);
CREATE INDEX idx_players_email ON players(email);
CREATE INDEX idx_players_faction ON players(faction);
CREATE INDEX idx_players_empire_id ON players(empire_id);
CREATE INDEX idx_players_is_active ON players(is_active);
CREATE INDEX idx_players_created_at ON players(created_at DESC);