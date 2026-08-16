const db = require('better-sqlite3')('pb_data/data.db');
const cols = db.prepare("SELECT id, name FROM _collections").all();
console.log("Collections:", cols);

const testCol = cols.find(c => c.name === 'test_phase4');
if (testCol) {
    const tableName = `_r_${testCol.id}`;
    const schema = db.prepare(`PRAGMA table_info(${tableName})`).all();
    console.log(`Schema for ${tableName}:`, schema);
    
    // Insert a dummy record
    try {
        db.prepare(`INSERT INTO ${tableName} (id, created, updated) VALUES ('rec123456789012', datetime('now'), datetime('now'))`).run();
        console.log("Inserted test record!");
    } catch (err) {
        console.error("Error inserting record:", err.message);
    }
}
