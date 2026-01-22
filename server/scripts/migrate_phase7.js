const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' }); // Adjust path if needed, assuming running from server/scripts

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    try {
        console.log("Starting Phase 7 Migration...");

        // 1. Update Debates Table
        console.log("Adding 'title' and 'attachment_url' to 'debates'...");
        await pool.query(`
            ALTER TABLE debates 
            ADD COLUMN IF NOT EXISTS title TEXT,
            ADD COLUMN IF NOT EXISTS attachment_url TEXT;
        `);

        // 2. Update Users Table
        console.log("Adding 'photo_url' and 'display_name' to 'users'...");
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS photo_url TEXT,
            ADD COLUMN IF NOT EXISTS display_name TEXT;
        `);

        console.log("Migration Complete!");
    } catch (e) {
        console.error("Migration Failed", e);
    } finally {
        await pool.end();
    }
}

migrate();
