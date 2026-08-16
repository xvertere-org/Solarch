const Database = require('better-sqlite3');
const db = new Database('pb_data/data.db');
const row = db.prepare("SELECT value FROM _settings WHERE key = 'main'").get();
const s = JSON.parse(row.value);
console.log('Full settings:', JSON.stringify(s, null, 2));
db.close();
