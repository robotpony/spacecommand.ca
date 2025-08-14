export type Faction = 'terran_federation' | 'orion_syndicate' | 'centauri_republic' | 'independent';

export type TechnologyTier = 'chemical' | 'nuclear' | 'antimatter' | 'exotic';

export type ResourceType = 
  | 'ore'
  | 'crystals'
  | 'energy'
  | 'electronics'
  | 'weapons'
  | 'food'
  | 'luxury_goods'
  | 'fuel';

export type ShipClass = 'courier' | 'freighter' | 'destroyer' | 'battlecruiser' | 'dreadnought';

export type PlanetSpecialization = 
  | 'mining'
  | 'agricultural'
  | 'industrial'
  | 'research'
  | 'military'
  | 'commercial'
  | 'balanced';

export type DiplomaticStatus = 
  | 'war'
  | 'hostile'
  | 'neutral'
  | 'friendly'
  | 'allied';

export type TradeGood = {
  type: ResourceType;
  quantity: number;
  basePrice: number;
};

export type Coordinates = {
  x: number;
  y: number;
  z: number;
};

export type GameEvent = {
  id: string;
  type: 'market_fluctuation' | 'pirate_raid' | 'solar_flare' | 'diplomatic_summit' | 'alien_artifact';
  timestamp: Date;
  affectedSystems: string[];
  description: string;
  effects: Record<string, any>;
};