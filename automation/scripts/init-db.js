/**
 * Database Initialization Script
 * Creates SQLite database and tables for upload tracking
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../database/uploads.db');

// Ensure database directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // Create uploads table
    db.run(`
        CREATE TABLE IF NOT EXISTS uploads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            jpeg_hash TEXT UNIQUE NOT NULL,
            png_hash TEXT,
            generator_name TEXT NOT NULL,
            parameters TEXT NOT NULL,
            metadata TEXT NOT NULL,
            jpeg_path TEXT,
            png_path TEXT,
            uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            upload_status TEXT DEFAULT 'pending',
            error_message TEXT
        )
    `);

    // Create index on hash for faster lookups
    db.run(`
        CREATE INDEX IF NOT EXISTS idx_jpeg_hash ON uploads(jpeg_hash)
    `);

    // Create daily stats table
    db.run(`
        CREATE TABLE IF NOT EXISTS daily_stats (
            date TEXT PRIMARY KEY,
            upload_count INTEGER DEFAULT 0,
            success_count INTEGER DEFAULT 0,
            error_count INTEGER DEFAULT 0
        )
    `);

    console.log('✅ Database initialized successfully');
    console.log(`📁 Database location: ${dbPath}`);
});

db.close();
