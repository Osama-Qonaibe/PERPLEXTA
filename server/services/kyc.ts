import { pool, ledgerPool } from '../db/index.js';

export async function syncKYCStatus(userId: string, kyc_status: string, rejection_reason: string | null = null) {
  const client = await pool.connect();
  const ledgerTarget = ledgerPool || pool;
  try {
    await client.query('BEGIN');
    
    // 1. Update Core DB
    await client.query(
      'UPDATE users SET kyc_status = $1, kyc_rejection_reason = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [kyc_status, rejection_reason, userId]
    );

    // 2. Sync to Ledger DB
    await ledgerTarget.query(`
      INSERT INTO kyc_requests (user_id, status, rejection_reason, updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id) DO UPDATE SET 
        status = EXCLUDED.status, 
        rejection_reason = EXCLUDED.rejection_reason,
        updated_at = CURRENT_TIMESTAMP
    `, [userId, kyc_status, rejection_reason]);

    await client.query('COMMIT');
    return { success: true };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
