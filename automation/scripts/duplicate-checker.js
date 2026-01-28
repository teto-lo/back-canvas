/**
 * Duplicate Checker Module
 * Hash-based duplicate detection for images
 */

const crypto = require('crypto');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class DuplicateChecker {
    constructor(dbPath) {
        this.dbPath = dbPath || path.join(__dirname, '../database/uploads.db');
        this.db = null;
    }

    /**
     * Open database connection
     */
    async connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    /**
     * Close database connection
     */
    async close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) reject(err);
                    else resolve();
                });
            } else {
                resolve();
            }
        });
    }

    /**
     * Calculate MD5 hash of a file
     */
    calculateHash(filePath) {
        const fileBuffer = fs.readFileSync(filePath);
        return crypto.createHash('md5').update(fileBuffer).digest('hex');
    }

    /**
     * Check if image is duplicate
     */
    async isDuplicate(jpegPath) {
        const hash = this.calculateHash(jpegPath);

        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT id, generator_name, uploaded_at FROM uploads WHERE jpeg_hash = ?',
                [hash],
                (err, row) => {
                    if (err) reject(err);
                    else resolve({ isDuplicate: !!row, hash, existing: row });
                }
            );
        });
    }

    /**
     * Save upload record to database
     */
    async saveUploadRecord(data) {
        const {
            jpegPath,
            pngPath,
            generatorName,
            parameters,
            metadata,
            status = 'success'
        } = data;

        const jpegHash = this.calculateHash(jpegPath);
        const pngHash = pngPath ? this.calculateHash(pngPath) : null;

        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT INTO uploads 
                (jpeg_hash, png_hash, generator_name, parameters, metadata, jpeg_path, png_path, upload_status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    jpegHash,
                    pngHash,
                    generatorName,
                    JSON.stringify(parameters),
                    JSON.stringify(metadata),
                    jpegPath,
                    pngPath,
                    status
                ],
                function (err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID, hash: jpegHash });
                }
            );
        });
    }

    /**
     * Update upload status
     */
    async updateStatus(id, status, errorMessage = null) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE uploads SET upload_status = ?, error_message = ? WHERE id = ?',
                [status, errorMessage, id],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    /**
     * Get today's upload count
     */
    async getTodayUploadCount() {
        const today = new Date().toISOString().split('T')[0];

        return new Promise((resolve, reject) => {
            this.db.get(
                `SELECT COUNT(*) as count FROM uploads 
                WHERE DATE(uploaded_at) = ? AND upload_status = 'success'`,
                [today],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row.count);
                }
            );
        });
    }

    /**
     * Get all upload records
     */
    async getAllRecords(limit = 100) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM uploads ORDER BY uploaded_at DESC LIMIT ?',
                [limit],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }
}

module.exports = DuplicateChecker;
