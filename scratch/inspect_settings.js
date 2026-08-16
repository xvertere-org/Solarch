const Database = require('better-sqlite3');
const db = new Database('pb_data/data.db');
const row = db.prepare("SELECT * FROM _settings WHERE key = 'main'").get();
const settings = JSON.parse(row.value);
console.log(JSON.stringify(settings, null, 2));
db.close();
