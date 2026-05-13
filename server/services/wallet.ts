import { ledgerPool, pool } from '../db/index.js';
import { encrypt, decrypt } from '../utils/crypto.js';

export async function getUserWallet(userId: string) {
  if (!ledgerPool) throw new Error('Ledger database not available');
  
  // Use ON CONFLICT DO UPDATE to handle race conditions and always return the wallet
  const result = await ledgerPool.query(`
    INSERT INTO wallets (user_id, balance, points) 
    VALUES ($1, 0, 0) 
    ON CONFLICT (user_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
    RETURNING id, balance, points, referral_activated
  `, [userId]);
  
  return result.rows[0];
}

export async function getTransactionHistory(userId: string, type: string) {
  if (!ledgerPool) throw new Error('Ledger database not available');
  let query = 'SELECT * FROM ledger_transactions WHERE user_id = $1';
  const params: any[] = [userId];

  if (type !== 'all') {
    query += ' AND transaction_type = $2';
    params.push(type);
  }

  query += ' ORDER BY created_at DESC LIMIT 100';
  const result = await ledgerPool.query(query, params);
  return result.rows;
}

export async function getPayoutAccount(userId: string) {
  if (!ledgerPool) throw new Error('Ledger database not available');
  const result = await ledgerPool.query('SELECT type, details FROM payout_accounts WHERE user_id = $1', [userId]);
  if (result.rows.length > 0) {
    const account = result.rows[0];
    return {
      type: account.type,
      details: JSON.parse(decrypt(account.details))
    };
  }
  return null;
}

export async function updatePayoutAccount(userId: string, type: string, details: any) {
  if (!ledgerPool) throw new Error('Ledger database not available');
  const encryptedDetails = encrypt(JSON.stringify(details));
  await ledgerPool.query(
    `INSERT INTO payout_accounts (user_id, type, details, updated_at) 
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
     ON CONFLICT (user_id) DO UPDATE SET 
     type = EXCLUDED.type, details = EXCLUDED.details, updated_at = CURRENT_TIMESTAMP`,
    [userId, type, encryptedDetails]
  );
  return { success: true };
}

export async function checkReferralActivation(userId: string) {
  if (!ledgerPool || !pool) return;
  
  const wallet = await getUserWallet(userId);
  if (wallet.referral_activated) return;

  // Get min deposit from settings
  const settings = await pool.query('SELECT referral_activation_min_deposit FROM system_settings LIMIT 1');
  const minDeposit = settings.rows[0]?.referral_activation_min_deposit || 10;

  // Calculate total deposits
  const depositResult = await ledgerPool.query(
    "SELECT SUM(amount) as total FROM ledger_transactions WHERE user_id = $1 AND (transaction_type = 'deposit' OR transaction_type = 'add_funds') AND status = 'success'",
    [userId]
  );
  
  const totalDeposited = parseFloat(depositResult.rows[0].total || '0');

  if (totalDeposited >= parseFloat(minDeposit)) {
    await ledgerPool.query('UPDATE wallets SET referral_activated = true WHERE user_id = $1', [userId]);
  }
}

export async function deductFromWallet(userId: string, amount: number, transactionType: string, description: string) {
  if (!ledgerPool) throw new Error('Ledger database not available');
  const wallet = await getUserWallet(userId);
  
  if (Number(wallet.balance) < amount) {
    throw new Error('Insufficient balance');
  }

  const client = await ledgerPool.connect();
  try {
    await client.query('BEGIN');
    
    const result = await client.query(
      'UPDATE wallets SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING balance',
      [amount, wallet.id]
    );

    await client.query(
      'INSERT INTO ledger_transactions (user_id, wallet_id, amount, transaction_type, description) VALUES ($1, $2, $3, $4, $5)',
      [userId, wallet.id, -amount, transactionType, description]
    );

    await client.query('COMMIT');
    return result.rows[0].balance;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function refundToWallet(userId: string, amount: number, transactionType: string, description: string) {
  if (!ledgerPool) throw new Error('Ledger database not available');
  const wallet = await getUserWallet(userId);

  const client = await ledgerPool.connect();
  try {
    await client.query('BEGIN');
    
    const result = await client.query(
      'UPDATE wallets SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING balance',
      [amount, wallet.id]
    );

    await client.query(
      'INSERT INTO ledger_transactions (user_id, wallet_id, amount, transaction_type, description) VALUES ($1, $2, $3, $4, $5)',
      [userId, wallet.id, amount, transactionType, description]
    );

    await client.query('COMMIT');
    return result.rows[0].balance;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
