-- Add foreign key constraints that couldn't be added earlier due to table creation order

-- Add foreign key for systems.controlled_by -> empires.id
ALTER TABLE systems 
ADD CONSTRAINT fk_systems_controlled_by 
FOREIGN KEY (controlled_by) 
REFERENCES empires(id) 
ON DELETE SET NULL;