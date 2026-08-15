const Database = require('better-sqlite3');
const fs = require('fs');

console.log('=== pb_data/logs.db ===');
if (fs.existsSync('pb_data/logs.db')) {
  try {
    const logsDb = new Database('pb_data/logs.db');
    const tables = logsDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('Tables in logs.db:', tables);
    for (const t of tables) {
      const rows = logsDb.prepare(`SELECT * FROM "${t.name}"`).all();
      console.log(`Table [${t.name}] in logs.db: ${rows.length} rows`);
      if (rows.length > 0) {
        console.log(JSON.stringify(rows.slice(0, 10), null, 2));
      }
    }
    logsDb.close();
  } catch (e) {
    console.log('Error reading logs.db:', e.message);
  }
}

console.log('\n=== pb_data/auxiliary.db ===');
if (fs.existsSync('pb_data/auxiliary.db')) {
  try {
    const auxDb = new Database('pb_data/auxiliary.db');
    const tables = auxDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('Tables in auxiliary.db:', tables);
    for (const t of tables) {
      const rows = auxDb.prepare(`SELECT * FROM "${t.name}"`).all();
      console.log(`Table [${t.name}] in auxiliary.db: ${rows.length} rows`);
      if (rows.length > 0) {
        console.log(JSON.stringify(rows.slice(0, 10), null, 2));
      }
    }
    auxDb.close();
  } catch (e) {
    console.log('Error reading auxiliary.db:', e.message);
  }
}
