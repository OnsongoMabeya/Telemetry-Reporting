const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkUserNodes() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'horiserverlive'
  });

  try {
    console.log('\n=== Checking User JOHN ===\n');

    // Check user details
    const [users] = await connection.query(
      'SELECT id, username, role, access_all_nodes, is_active FROM users WHERE username = ?',
      ['JOHN']
    );

    if (users.length === 0) {
      console.log('❌ User JOHN not found in database');
      return;
    }

    const user = users[0];
    console.log('User Details:');
    console.log(`  ID: ${user.id}`);
    console.log(`  Username: ${user.username}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Access All Nodes: ${user.access_all_nodes ? 'YES' : 'NO'}`);
    console.log(`  Is Active: ${user.is_active ? 'YES' : 'NO'}`);

    // Check node assignments
    console.log('\nNode Assignments:');
    const [assignments] = await connection.query(
      `SELECT una.id, una.node_name, una.assigned_at, una.notes,
              u.username as assigned_by_username
       FROM user_node_assignments una
       LEFT JOIN users u ON una.assigned_by = u.id
       WHERE una.user_id = ?`,
      [user.id]
    );

    if (assignments.length === 0) {
      console.log('  ❌ No node assignments found');
    } else {
      assignments.forEach(a => {
        console.log(`  ✅ ${a.node_name}`);
        console.log(`     Assigned by: ${a.assigned_by_username || 'Unknown'}`);
        console.log(`     Assigned at: ${a.assigned_at}`);
        if (a.notes) console.log(`     Notes: ${a.notes}`);
      });
    }

    // Check what nodes they should see
    console.log('\nNodes User Should See:');
    if (user.access_all_nodes || user.role === 'admin') {
      console.log('  ✅ ALL NODES (access_all_nodes = true or role = admin)');
      const [allNodes] = await connection.query(
        'SELECT DISTINCT NodeName FROM node_status_table ORDER BY NodeName LIMIT 10'
      );
      console.log(`  Total available nodes: ${allNodes.length}+`);
      allNodes.forEach(n => console.log(`    - ${n.NodeName}`));
    } else {
      const [assignedNodes] = await connection.query(
        `SELECT DISTINCT nst.NodeName 
         FROM node_status_table nst
         INNER JOIN user_node_assignments una ON nst.NodeName = una.node_name
         WHERE una.user_id = ?
         ORDER BY nst.NodeName`,
        [user.id]
      );
      
      if (assignedNodes.length === 0) {
        console.log('  ❌ NO NODES (user has assignments but none match node_status_table)');
      } else {
        console.log(`  ✅ ${assignedNodes.length} assigned node(s):`);
        assignedNodes.forEach(n => console.log(`    - ${n.NodeName}`));
      }
    }

    // Check for potential issues
    console.log('\n=== Potential Issues ===\n');
    
    if (user.access_all_nodes) {
      console.log('⚠️  ISSUE FOUND: access_all_nodes is set to TRUE');
      console.log('   This means the user can see ALL nodes regardless of assignments.');
      console.log('   Fix: Set access_all_nodes to FALSE for this user.');
    }
    
    if (assignments.length > 0 && !user.access_all_nodes) {
      // Check if assigned nodes exist in node_status_table
      for (const assignment of assignments) {
        const [nodeExists] = await connection.query(
          'SELECT COUNT(*) as count FROM node_status_table WHERE NodeName = ?',
          [assignment.node_name]
        );
        
        if (nodeExists[0].count === 0) {
          console.log(`⚠️  ISSUE: Assigned node "${assignment.node_name}" not found in node_status_table`);
          console.log('   This node won\'t appear in the user\'s node list.');
        }
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkUserNodes().catch(console.error);
