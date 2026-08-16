const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

console.log('=== SOLARCH SAFE DATA CLEANUP EXECUTION ===\n');

// 1. Clean Confirmed Mock Records in Database
const db = new Database('pb_data/data.db');

console.log('[1] Checking mock records in _r_msm6r51b1b3d8471 (test_phase4)...');
const targetRecord = db.prepare("SELECT * FROM _r_msm6r51b1b3d8471 WHERE id = 'rec123456789012'").get();
if (targetRecord) {
  console.log('  Found confirmed mock record:', JSON.stringify(targetRecord));
  const deleteResult = db.prepare("DELETE FROM _r_msm6r51b1b3d8471 WHERE id = 'rec123456789012'").run();
  console.log(`  ✅ Removed mock record rec123456789012 (${deleteResult.changes} row deleted).`);
} else {
  console.log('  No mock record rec123456789012 found (already clean).');
}

db.close();

// 2. Clean Confirmed Mock Backup Archives in pb_data/backups/
console.log('\n[2] Checking mock backup ZIP files in pb_data/backups/...');
const backupDir = path.join(__dirname, '..', 'pb_data', 'backups');
if (fs.existsSync(backupDir)) {
  const files = fs.readdirSync(backupDir);
  const mockBackups = files.filter(f => f.startsWith('backup_') && f.endsWith('.zip'));
  console.log(`  Found ${mockBackups.length} mock backup ZIP file(s) generated during UI testing:`);
  
  for (const file of mockBackups) {
    const filePath = path.join(backupDir, file);
    fs.unlinkSync(filePath);
    console.log(`  ✅ Deleted mock backup file: ${file}`);
  }
} else {
  console.log('  pb_data/backups/ does not exist.');
}

console.log('\n=== CLEANUP COMPLETED ===');
