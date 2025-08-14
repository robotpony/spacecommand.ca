-- Create diplomatic relations table
CREATE TABLE IF NOT EXISTS diplomatic_relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empire_id UUID NOT NULL REFERENCES empires(id) ON DELETE CASCADE,
    target_empire_id UUID NOT NULL REFERENCES empires(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'neutral',
    trust_level INTEGER NOT NULL DEFAULT 0 CHECK (trust_level >= -100 AND trust_level <= 100),
    last_interaction TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(empire_id, target_empire_id)
);

-- Create trade agreements table
CREATE TABLE IF NOT EXISTS trade_agreements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    relation_id UUID NOT NULL REFERENCES diplomatic_relations(id) ON DELETE CASCADE,
    agreement_type VARCHAR(50) NOT NULL,
    terms JSONB DEFAULT '{}',
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_diplomatic_relations_empire_id ON diplomatic_relations(empire_id);
CREATE INDEX idx_diplomatic_relations_target_empire_id ON diplomatic_relations(target_empire_id);
CREATE INDEX idx_diplomatic_relations_status ON diplomatic_relations(status);
CREATE INDEX idx_trade_agreements_relation_id ON trade_agreements(relation_id);
CREATE INDEX idx_trade_agreements_is_active ON trade_agreements(is_active);