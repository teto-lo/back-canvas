const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database/uploads.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.all("SELECT id, generator_name, uploaded_at FROM uploads ORDER BY id DESC LIMIT 5", (err, rows) => {
        if (err) {
            console.error(err);
            return;
        }
        console.table(rows);
    });
});

db.close();
