import { ledgerPool } from '../db/index.js';

export async function getUserWallet(userId: string) {
  if (!ledgerPool) throw new Error('Ledger database not available');
  const result = await ledgerPool.query('SELECT id, balance, points FROM wallets WHERE user_id = $1', [userId]);
  if (result.rows.length === 0) {
    const newWallet = await ledgerPool.query('INSERT INTO wallets (user_id, balance, points) VALUES ($1, 0, 0) RETURNING id, balance, points', [userId]);
    return newWallet.rows[0];
  }
  return result.rows[0];
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
