const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const db = new Database('pb_data/data.db');

console.log('==============================================');
console.log('1. SQLITE MASTER TABLES');
console.log('==============================================');
const tables = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='table'").all();
for (const t of tables) {
  console.log(`Table: ${t.name}`);
}

console.log('\n==============================================');
console.log('2. COLLECTIONS (_collections)');
console.log('==============================================');
const collections = db.prepare("SELECT * FROM _collections").all();
for (const c of collections) {
  const data = JSON.parse(c.data || '{}');
  console.log(`ID: ${c.id}, Name: ${c.name}, Type: ${c.type}, System: ${c.system}, Fields: ${data.fields?.map(f => f.name).join(', ')}`);
}

console.log('\n==============================================');
console.log('3. RECORD TABLES & ROW COUNTS');
console.log('==============================================');
for (const c of collections) {
  const tableName = c.name; // In Solarch, let's see how record tables are named
  // Check if table exists by name or by _r_...
  const directTable = tables.find(t => t.name === c.name);
  const internalTable = tables.find(t => t.name === `_r_${c.id}`);
  
  if (directTable) {
    const rows = db.prepare(`SELECT * FROM "${c.name}"`).all();
    console.log(`\nCollection Table [${c.name}]: ${rows.length} rows`);
    console.log(JSON.stringify(rows, null, 2));
  } else if (internalTable) {
    const rows = db.prepare(`SELECT * FROM "${internalTable.name}"`).all();
    console.log(`\nCollection Internal Table [${internalTable.name}] for [${c.name}]: ${rows.length} rows`);
    console.log(JSON.stringify(rows, null, 2));
  } else {
    console.log(`\nCollection [${c.name}] (ID: ${c.id}) has no matching record table found`);
  }
}

// Check non-system tables not in collections
const nonCollectionTables = tables.filter(t => 
  !t.name.startsWith('_') && !collections.some(c => c.name === t.name)
);
console.log('\nNon-collection tables (custom):', nonCollectionTables.map(t => t.name));
for (const t of nonCollectionTables) {
  const rows = db.prepare(`SELECT * FROM "${t.name}"`).all();
  console.log(`Table [${t.name}]: ${rows.length} rows`);
  console.log(JSON.stringify(rows, null, 2));
}

// Check other _r_ tables in sqlite_master
const rTables = tables.filter(t => t.name.startsWith('_r_'));
for (const t of rTables) {
  const rows = db.prepare(`SELECT * FROM "${t.name}"`).all();
  console.log(`Internal table [${t.name}]: ${rows.length} rows`);
  console.log(JSON.stringify(rows, null, 2));
}

console.log('\n==============================================');
console.log('4. SUPERUSERS (_superusers)');
console.log('==============================================');
const superusers = db.prepare("SELECT id, username, created, updated FROM _superusers").all();
console.log(JSON.stringify(superusers, null, 2));

console.log('\n==============================================');
console.log('5. LOGS (_logs)');
console.log('==============================================');
const logCount = db.prepare("SELECT count(*) as count FROM _logs").get();
console.log('Total log count:', logCount.count);
const allLogs = db.prepare("SELECT id, level, message, data, created FROM _logs ORDER BY created DESC").all();
console.log('Log items:');
for (const l of allLogs) {
  console.log(`[${l.created}] [${l.level}] ${l.message} | data: ${l.data || ''}`);
}

console.log('\n==============================================');
console.log('6. BACKUP FILES IN pb_data/backups OR BACKUP DIR');
console.log('==============================================');
const backupDir = path.join(__dirname, '..', 'pb_data', 'backups');
if (fs.existsSync(backupDir)) {
  const backupFiles = fs.readdirSync(backupDir);
  console.log('Backup files in pb_data/backups:', backupFiles);
  for (const bf of backupFiles) {
    const stat = fs.statSync(path.join(backupDir, bf));
    console.log(`  - ${bf} (${stat.size} bytes, modified: ${stat.mtime.toISOString()})`);
  }
} else {
  console.log('pb_data/backups directory does not exist');
}

// Check root or other places for backup zips
const rootFiles = fs.readdirSync(path.join(__dirname, '..'));
const rootZips = rootFiles.filter(f => f.endsWith('.zip') || f.startsWith('backup_'));
console.log('Root backup zips:', rootZips);

// Check pb_data storage/files
const storageDir = path.join(__dirname, '..', 'pb_data', 'storage');
if (fs.existsSync(storageDir)) {
  console.log('pb_data/storage exists, files:', fs.readdirSync(storageDir));
}

db.close();
