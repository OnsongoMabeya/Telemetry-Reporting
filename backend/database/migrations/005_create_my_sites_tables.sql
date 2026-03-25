-- Migration: Create My Sites tables for hierarchical service management
-- This enables clients, services, and granular metric assignment system

-- ============================================================================
-- 1. CLIENTS TABLE
-- ============================================================================
-- Stores client information (e.g., Radio Africa, Standard Group)
CREATE TABLE IF NOT EXISTS clients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE COMMENT 'Client name (e.g., "Radio Africa")',
  description TEXT DEFAULT NULL COMMENT 'Optional description of the client',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT NOT NULL COMMENT 'User ID who created this client',
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Foreign key to users table
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  
  -- Indexes for faster queries
  INDEX idx_name (name),
  INDEX idx_active (is_active),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Stores client information for service management';

-- ============================================================================
-- 2. SERVICES TABLE
-- ============================================================================
-- Stores services (e.g., Kameme FM, EMOO FM)
CREATE TABLE IF NOT EXISTS services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE COMMENT 'Service name (e.g., "Kameme FM")',
  description TEXT DEFAULT NULL COMMENT 'Optional description of the service',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT NOT NULL COMMENT 'User ID who created this service',
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Foreign key to users table
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  
  -- Indexes for faster queries
  INDEX idx_name (name),
  INDEX idx_active (is_active),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Stores services that can be assigned to clients and users';

-- ============================================================================
-- 3. CLIENT_SERVICES TABLE (Many-to-Many)
-- ============================================================================
-- Links clients to services (a service can belong to multiple clients)
CREATE TABLE IF NOT EXISTS client_services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  service_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INT NOT NULL COMMENT 'User ID who created this assignment',
  
  -- Foreign keys
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  
  -- Ensure unique client-service combination
  UNIQUE KEY unique_client_service (client_id, service_id),
  
  -- Indexes for faster queries
  INDEX idx_client_id (client_id),
  INDEX idx_service_id (service_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Many-to-many relationship between clients and services';

-- ============================================================================
-- 4. SERVICE_METRIC_ASSIGNMENTS TABLE
-- ============================================================================
-- Assigns individual metric mappings to services with custom display names
-- This is the granular assignment level where each metric can have a custom name
CREATE TABLE IF NOT EXISTS service_metric_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  service_id INT NOT NULL,
  metric_mapping_id INT NOT NULL COMMENT 'References metric_mappings.id',
  display_name VARCHAR(255) NOT NULL COMMENT 'Custom display name (e.g., "Nakuru Site")',
  display_order INT DEFAULT 0 COMMENT 'Order in which metrics appear for this service',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT NOT NULL COMMENT 'User ID who created this assignment',
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Foreign keys
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  FOREIGN KEY (metric_mapping_id) REFERENCES metric_mappings(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  
  -- Ensure unique service-metric combination
  UNIQUE KEY unique_service_metric (service_id, metric_mapping_id),
  
  -- Indexes for faster queries
  INDEX idx_service_id (service_id),
  INDEX idx_metric_mapping_id (metric_mapping_id),
  INDEX idx_active (is_active),
  INDEX idx_display_order (service_id, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Assigns metric mappings to services with custom display names';

-- ============================================================================
-- 5. USER_SERVICE_ASSIGNMENTS TABLE
-- ============================================================================
-- Assigns specific services to specific users
-- Users can only see services they are assigned to
CREATE TABLE IF NOT EXISTS user_service_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  service_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INT NOT NULL COMMENT 'User ID who created this assignment',
  
  -- Foreign keys
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  
  -- Ensure unique user-service combination
  UNIQUE KEY unique_user_service (user_id, service_id),
  
  -- Indexes for faster queries
  INDEX idx_user_id (user_id),
  INDEX idx_service_id (service_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Assigns services to users for access control';

-- ============================================================================
-- VIEWS FOR EASIER QUERYING
-- ============================================================================

-- View: Active clients with creator info
CREATE OR REPLACE VIEW v_active_clients AS
SELECT 
  c.id,
  c.name,
  c.description,
  c.created_at,
  c.updated_at,
  u.username as created_by_username,
  u.first_name as created_by_first_name,
  u.last_name as created_by_last_name,
  (SELECT COUNT(*) FROM client_services cs WHERE cs.client_id = c.id) as service_count
FROM clients c
INNER JOIN users u ON c.created_by = u.id
WHERE c.is_active = TRUE
ORDER BY c.name;

-- View: Active services with creator info
CREATE OR REPLACE VIEW v_active_services AS
SELECT 
  s.id,
  s.name,
  s.description,
  s.created_at,
  s.updated_at,
  u.username as created_by_username,
  u.first_name as created_by_first_name,
  u.last_name as created_by_last_name,
  (SELECT COUNT(*) FROM service_metric_assignments sma WHERE sma.service_id = s.id AND sma.is_active = TRUE) as metric_count,
  (SELECT COUNT(*) FROM user_service_assignments usa WHERE usa.service_id = s.id) as user_count
FROM services s
INNER JOIN users u ON s.created_by = u.id
WHERE s.is_active = TRUE
ORDER BY s.name;

-- View: Service metric assignments with full details
CREATE OR REPLACE VIEW v_service_metric_assignments AS
SELECT 
  sma.id,
  sma.service_id,
  s.name as service_name,
  sma.metric_mapping_id,
  mm.node_name,
  mm.base_station_name,
  mm.metric_name,
  mm.column_name,
  mm.unit,
  sma.display_name,
  sma.display_order,
  sma.created_at,
  sma.updated_at,
  u.username as created_by_username
FROM service_metric_assignments sma
INNER JOIN services s ON sma.service_id = s.id
INNER JOIN metric_mappings mm ON sma.metric_mapping_id = mm.id
INNER JOIN users u ON sma.created_by = u.id
WHERE sma.is_active = TRUE AND s.is_active = TRUE AND mm.is_active = TRUE
ORDER BY sma.service_id, sma.display_order;

-- View: User services with full details
CREATE OR REPLACE VIEW v_user_services AS
SELECT 
  usa.id,
  usa.user_id,
  u.username,
  u.first_name,
  u.last_name,
  usa.service_id,
  s.name as service_name,
  s.description as service_description,
  (SELECT COUNT(*) FROM service_metric_assignments sma 
   WHERE sma.service_id = s.id AND sma.is_active = TRUE) as metric_count
FROM user_service_assignments usa
INNER JOIN users u ON usa.user_id = u.id
INNER JOIN services s ON usa.service_id = s.id
WHERE s.is_active = TRUE
ORDER BY u.username, s.name;

-- ============================================================================
-- SAMPLE DATA FOR TESTING
-- ============================================================================

-- Insert sample clients
INSERT INTO clients (name, description, created_by)
SELECT 
  'Radio Africa Group',
  'Leading media company in East Africa',
  (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE role = 'admin')
  AND NOT EXISTS (SELECT 1 FROM clients WHERE name = 'Radio Africa Group');

INSERT INTO clients (name, description, created_by)
SELECT 
  'Standard Group',
  'Multimedia company with radio, TV, and print',
  (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE role = 'admin')
  AND NOT EXISTS (SELECT 1 FROM clients WHERE name = 'Standard Group');

-- Insert sample services
INSERT INTO services (name, description, created_by)
SELECT 
  'Kameme FM',
  'Kikuyu language radio station',
  (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE role = 'admin')
  AND NOT EXISTS (SELECT 1 FROM services WHERE name = 'Kameme FM');

INSERT INTO services (name, description, created_by)
SELECT 
  'EMOO FM',
  'Meru language radio station',
  (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE role = 'admin')
  AND NOT EXISTS (SELECT 1 FROM services WHERE name = 'EMOO FM');

INSERT INTO services (name, description, created_by)
SELECT 
  'Spice FM',
  'Urban contemporary radio station',
  (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE role = 'admin')
  AND NOT EXISTS (SELECT 1 FROM services WHERE name = 'Spice FM');

-- Link services to clients (Radio Africa Group owns Kameme FM and EMOO FM)
INSERT INTO client_services (client_id, service_id, created_by)
SELECT 
  (SELECT id FROM clients WHERE name = 'Radio Africa Group' LIMIT 1),
  (SELECT id FROM services WHERE name = 'Kameme FM' LIMIT 1),
  (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM clients WHERE name = 'Radio Africa Group')
  AND EXISTS (SELECT 1 FROM services WHERE name = 'Kameme FM')
  AND NOT EXISTS (
    SELECT 1 FROM client_services 
    WHERE client_id = (SELECT id FROM clients WHERE name = 'Radio Africa Group' LIMIT 1)
      AND service_id = (SELECT id FROM services WHERE name = 'Kameme FM' LIMIT 1)
  );

INSERT INTO client_services (client_id, service_id, created_by)
SELECT 
  (SELECT id FROM clients WHERE name = 'Radio Africa Group' LIMIT 1),
  (SELECT id FROM services WHERE name = 'EMOO FM' LIMIT 1),
  (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM clients WHERE name = 'Radio Africa Group')
  AND EXISTS (SELECT 1 FROM services WHERE name = 'EMOO FM')
  AND NOT EXISTS (
    SELECT 1 FROM client_services 
    WHERE client_id = (SELECT id FROM clients WHERE name = 'Radio Africa Group' LIMIT 1)
      AND service_id = (SELECT id FROM services WHERE name = 'EMOO FM' LIMIT 1)
  );

-- Link Spice FM to Standard Group
INSERT INTO client_services (client_id, service_id, created_by)
SELECT 
  (SELECT id FROM clients WHERE name = 'Standard Group' LIMIT 1),
  (SELECT id FROM services WHERE name = 'Spice FM' LIMIT 1),
  (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM clients WHERE name = 'Standard Group')
  AND EXISTS (SELECT 1 FROM services WHERE name = 'Spice FM')
  AND NOT EXISTS (
    SELECT 1 FROM client_services 
    WHERE client_id = (SELECT id FROM clients WHERE name = 'Standard Group' LIMIT 1)
      AND service_id = (SELECT id FROM services WHERE name = 'Spice FM' LIMIT 1)
  );

-- Note: Service metric assignments and user service assignments will be done via the UI
-- as they require existing metric_mappings data and specific user assignments

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
