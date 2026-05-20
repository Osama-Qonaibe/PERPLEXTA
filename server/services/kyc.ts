import { pool, ledgerPool } from '../db/index.js';

export async function syncKYCStatus(userId: string | number, kyc_status: string, rejection_reason: string | null = null, txClient?: any) {
  const ledgerTarget = ledgerPool || pool;
  const client = txClient || await pool.connect();
  const shouldCommit = !txClient;
  try {
    const userIdNum = typeof userId === 'number' ? userId : parseInt(userId, 10);
    if (isNaN(userIdNum)) {
      throw new Error('Invalid user ID');
    }

    if (shouldCommit) {
      await client.query('BEGIN');
    }
    
    // 1. Update Core DB
    await client.query(
      'UPDATE users SET kyc_status = $1, kyc_rejection_reason = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [kyc_status, rejection_reason, userIdNum]
    );

    // 2. Sync to Ledger DB
    await ledgerTarget.query(`
      INSERT INTO kyc_requests (user_id, status, rejection_reason, updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id) DO UPDATE SET 
        status = EXCLUDED.status, 
        rejection_reason = EXCLUDED.rejection_reason,
        updated_at = CURRENT_TIMESTAMP
    `, [userIdNum, kyc_status, rejection_reason]);

    if (shouldCommit) {
      await client.query('COMMIT');
    }
    return { success: true };
  } catch (error) {
    if (shouldCommit) {
      await client.query('ROLLBACK');
    }
    throw error;
  } finally {
    if (shouldCommit) {
      client.release();
    }
  }
}
