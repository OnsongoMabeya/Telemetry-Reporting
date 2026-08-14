-- Migration 019: Add Performance Indexes for Concurrent User Scaling
-- Purpose: Optimize queries for node loading and user assignments under concurrent load

-- Index 1: Speed up DISTINCT NodeName queries
ALTER TABLE node_status_table ADD INDEX idx_node_status_nodename (NodeName);

-- Index 2: Speed up user node assignment lookups
ALTER TABLE user_node_assignments ADD INDEX idx_user_node_assignments_user_id (user_id, node_name);

-- Index 3: Optimize user access queries
ALTER TABLE users ADD INDEX idx_users_access_all_nodes (id, access_all_nodes, role);

-- Index 4: Optimize base station lookups
ALTER TABLE node_status_table ADD INDEX idx_node_status_nodename_basestation (NodeName, NodeBaseStationName);
