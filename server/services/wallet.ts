import { ledgerPool, pool } from '../db/index.js';
import { encrypt, decrypt } from '../utils/crypto.js';

export async function getUserWallet(userId: string) {
  if (!ledgerPool || !pool) throw new Error('Database not available');
  
  // Referential Integrity: Verify user exists in Core DB first
  const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
  if (userCheck.rows.length === 0) {
    throw new Error(`Integrity Error: User ${userId} does not exist in Core DB`);
  }
  
  const result = await ledgerPool.query(`
    INSERT INTO wallets (user_id, balance, points) 
    VALUES ($1, 0, 0) 
    ON CONFLICT (user_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
    RETURNING id, balance, points, referral_activated
  `, [userId]);
  
  return result.rows[0];
}

async function getEconomySettings() {
  // Prefer Ledger DB for financial constants (Sovereign approach)
  if (ledgerPool) {
    const res = await ledgerPool.query('SELECT points_per_dollar, min_payout_usd, min_deposit_usd, referral_bonus_percent, welcome_bonus_points, referral_bonus_points, conversion_rate, min_withdrawal_cents FROM economy_settings LIMIT 1');
    if (res.rows.length > 0) return res.rows[0];
  }
  
  // Fallback to system_settings in Core DB
  if (pool) {
    const res = await pool.query('SELECT points_per_dollar, min_payout_usd, min_deposit_usd, referral_bonus_percent, welcome_bonus_points, referral_bonus_points, conversion_rate, min_withdrawal_cents FROM system_settings LIMIT 1');
    return res.rows[0] || {};
  }
  
  return {};
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

export async function convertPointsToBalance(userId: string, amountPoints: number) {
  if (!ledgerPool || !pool) throw new Error('Database not available');
  
  const settings = await getEconomySettings();
  const rate = parseFloat(settings.conversion_rate || '0.001'); 
  const usdAmount = amountPoints * rate;

  const client = await ledgerPool.connect();
  try {
    await client.query('BEGIN');
    
    // Lock the wallet row to prevent race conditions
    const walletRes = await client.query(
      'SELECT id, points, balance FROM wallets WHERE user_id = $1 FOR UPDATE',
      [userId]
    );
    
    if (walletRes.rows.length === 0) {
      throw new Error('Wallet not found');
    }

    const wallet = walletRes.rows[0];
    if (Number(wallet.points) < amountPoints) {
      throw new Error('Insufficient points');
    }

    // Combined update to points and balance in a single SQL operation
    await client.query(
      'UPDATE wallets SET points = points - $1, balance = balance + $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [amountPoints, usdAmount, wallet.id]
    );

    await client.query(
      'INSERT INTO ledger_transactions (user_id, wallet_id, amount, transaction_type, description) VALUES ($1, $2, $3, $4, $5)',
      [userId, wallet.id, -amountPoints, 'conversion', `Converted ${amountPoints} points to $${usdAmount.toFixed(2)}`]
    );

    await client.query('COMMIT');
    return { usdAmount };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function requestWithdrawal(userId: string, amountUSD: number, method: string, details: string) {
  if (!ledgerPool || !pool) throw new Error('Database not available');
  
  const settings = await getEconomySettings();
  const minCents = settings.min_withdrawal_cents || 2000;
  if (amountUSD * 100 < minCents) {
    throw new Error(`Minimum withdrawal is $${(minCents / 100).toFixed(2)}`);
  }

  const client = await ledgerPool.connect();
  try {
    await client.query('BEGIN');
    
    // Lock the wallet row to prevent balance inconsistencies
    const walletRes = await client.query(
      'SELECT id, balance FROM wallets WHERE user_id = $1 FOR UPDATE',
      [userId]
    );
    
    if (walletRes.rows.length === 0) {
      throw new Error('Wallet not found');
    }

    const wallet = walletRes.rows[0];
    if (Number(wallet.balance) < amountUSD) {
      throw new Error('Insufficient USD balance');
    }
    
    await client.query(
      'UPDATE wallets SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [amountUSD, wallet.id]
    );

    await client.query(
      'INSERT INTO ledger_transactions (user_id, wallet_id, amount, transaction_type, description, status) VALUES ($1, $2, $3, $4, $5, $6)',
      [userId, wallet.id, -amountUSD, 'withdrawal', `Withdrawal request for $${amountUSD} via ${method} (${details})`, 'pending']
    );

    await client.query('COMMIT');
    return { success: true };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getReferralCount(userId: string) {
  if (!ledgerPool) throw new Error('Ledger database not available');
  // Check referrals table in Ledger DB for 'active' status to ensure financial integrity
  const result = await ledgerPool.query('SELECT count(*) FROM referrals WHERE referrer_id = $1 AND status = \'active\'', [userId]);
  return parseInt(result.rows[0].count);
}

export async function checkReferralActivation(userId: string) {
  if (!ledgerPool || !pool) return;
  
  const wallet = await getUserWallet(userId);
  if (wallet.referral_activated) return;

  const settings = await getEconomySettings();
  const minDeposit = settings.referral_activation_min_deposit || 10;

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

  const client = await ledgerPool.connect();
  try {
    await client.query('BEGIN');
    
    // Lock wallet to prevent race conditions during deduction
    const walletRes = await client.query(
      'SELECT id, balance FROM wallets WHERE user_id = $1 FOR UPDATE',
      [userId]
    );
    
    if (walletRes.rows.length === 0) {
      throw new Error('Wallet not found');
    }
    
    const wallet = walletRes.rows[0];
    if (Number(wallet.balance) < amount) {
      throw new Error('Insufficient balance');
    }
    
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

  const client = await ledgerPool.connect();
  try {
    await client.query('BEGIN');
    
    // Lock wallet to prevent race conditions during refund
    let walletRes = await client.query(
      'SELECT id, balance FROM wallets WHERE user_id = $1 FOR UPDATE',
      [userId]
    );

    let walletId: number;
    if (walletRes.rows.length === 0) {
      // Must ensure user exists and create wallet
      const wallet = await getUserWallet(userId);
      walletId = wallet.id;
      // Re-lock purely for safety in transaction lifecycle
      const reLock = await client.query('SELECT id FROM wallets WHERE id = $1 FOR UPDATE', [walletId]);
      walletId = reLock.rows[0].id;
    } else {
      walletId = walletRes.rows[0].id;
    }
    
    const result = await client.query(
      'UPDATE wallets SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING balance',
      [amount, walletId]
    );

    await client.query(
      'INSERT INTO ledger_transactions (user_id, wallet_id, amount, transaction_type, description) VALUES ($1, $2, $3, $4, $5)',
      [userId, walletId, amount, transactionType, description]
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
