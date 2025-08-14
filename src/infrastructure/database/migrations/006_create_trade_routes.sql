-- Create trade routes table
CREATE TABLE IF NOT EXISTS trade_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empire_id UUID NOT NULL REFERENCES empires(id) ON DELETE CASCADE,
    from_planet_id UUID NOT NULL REFERENCES planets(id) ON DELETE CASCADE,
    to_planet_id UUID NOT NULL REFERENCES planets(id) ON DELETE CASCADE,
    goods_type VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL,
    profit_per_turn INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(empire_id, from_planet_id, to_planet_id, goods_type)
);

-- Create indexes
CREATE INDEX idx_trade_routes_empire_id ON trade_routes(empire_id);
CREATE INDEX idx_trade_routes_from_planet ON trade_routes(from_planet_id);
CREATE INDEX idx_trade_routes_to_planet ON trade_routes(to_planet_id);
CREATE INDEX idx_trade_routes_is_active ON trade_routes(is_active);