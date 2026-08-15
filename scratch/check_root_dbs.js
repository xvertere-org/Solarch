const Database = require('better-sqlite3');
const fs = require('fs');

console.log('=== solarch_data.db ===');
if (fs.existsSync('solarch_data.db')) {
  try {
    const db = new Database('solarch_data.db');
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('Tables in solarch_data.db:', tables);
    for (const t of tables) {
      const rows = db.prepare(`SELECT * FROM "${t.name}"`).all();
      console.log(`Table [${t.name}]: ${rows.length} rows`);
    }
    db.close();
  } catch (e) {
    console.log('Error reading solarch_data.db:', e.message);
  }
}

console.log('\n=== uploads/ ===');
if (fs.existsSync('uploads')) {
  console.log('Files in uploads/:', fs.readdirSync('uploads'));
}
