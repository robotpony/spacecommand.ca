-- Create technologies table
CREATE TABLE IF NOT EXISTS technologies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    tier VARCHAR(20) NOT NULL,
    research_cost INTEGER NOT NULL,
    prerequisites TEXT[] DEFAULT '{}',
    effects JSONB DEFAULT '{}',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create empire technologies junction table
CREATE TABLE IF NOT EXISTS empire_technologies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empire_id UUID NOT NULL REFERENCES empires(id) ON DELETE CASCADE,
    technology_id UUID NOT NULL REFERENCES technologies(id) ON DELETE CASCADE,
    is_researched BOOLEAN DEFAULT false,
    research_progress INTEGER NOT NULL DEFAULT 0,
    researched_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(empire_id, technology_id)
);

-- Create indexes
CREATE INDEX idx_technologies_tier ON technologies(tier);
CREATE INDEX idx_empire_technologies_empire_id ON empire_technologies(empire_id);
CREATE INDEX idx_empire_technologies_technology_id ON empire_technologies(technology_id);
CREATE INDEX idx_empire_technologies_is_researched ON empire_technologies(is_researched);