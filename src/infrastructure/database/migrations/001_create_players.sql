-- Create players table
CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    faction VARCHAR(50) NOT NULL DEFAULT 'independent',
    credits INTEGER NOT NULL DEFAULT 10000,
    reputation INTEGER NOT NULL DEFAULT 0,
    last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    is_banned BOOLEAN DEFAULT false,
    stats JSONB DEFAULT '{"gamesPlayed": 0, "victories": 0, "totalCredits": 10000, "shipsDestroyed": 0, "tradeMissions": 0}'::jsonb
);

-- Create indexes
CREATE INDEX idx_players_username ON players(username);
CREATE INDEX idx_players_email ON players(email);
CREATE INDEX idx_players_faction ON players(faction);
CREATE INDEX idx_players_is_active ON players(is_active);
CREATE INDEX idx_players_created_at ON players(created_at DESC);