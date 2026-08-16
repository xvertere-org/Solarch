const Database = require('better-sqlite3');
const db = new Database('pb_data/data.db');
const row = db.prepare("SELECT value FROM _settings WHERE key = 'main'").get();
const s = JSON.parse(row.value);
s.ai = {
  enabled: true,
  provider: 'custom',
  apiKey: 'test-mock-key',
  model: 'gpt-4o-mini',
  baseURL: 'http://127.0.0.1:11435',
  maxTokens: 2048,
  temperature: 0.2
};
db.prepare("UPDATE _settings SET value = ?, updated = ? WHERE key = 'main'").run(
  JSON.stringify(s),
  new Date().toISOString()
);
db.close();
console.log('DB updated successfully. AI config:', JSON.stringify(s.ai, null, 2));
