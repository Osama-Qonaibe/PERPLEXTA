import pkg from 'pg';
const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
    try {
        await pool.query("ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS file_data BYTEA;");
        await pool.query("ALTER TABLE user_files ADD COLUMN IF NOT EXISTS file_data BYTEA;");
        console.log("Columns added to db");
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
run();
