import { ledgerPool, pool } from '../db/index.js';
import { encrypt, decrypt } from '../utils/crypto.js';

export async function getUserWallet(userId: string | number, txClient?: any) {
  const targetLedger = txClient || ledgerPool;
  if (!targetLedger || !pool) throw new Error('Database not available');
  
  const userIdNum = typeof userId === 'number' ? userId : parseInt(userId, 10);
  if (isNaN(userIdNum)) {
    throw new Error('Invalid User ID');
  }
  
  const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [userIdNum]);
  if (userCheck.rows.length === 0) {
    throw new Error(`Integrity Error: User ${userIdNum} does not exist in Core DB`);
  }
  
  if (txClient) {
    const existing = await txClient.query('SELECT id, balance, points, referral_activated FROM wallets WHERE user_id = $1 FOR UPDATE', [userIdNum]);
    if (existing.rows.length > 0) return existing.rows[0];
  }

  const result = await targetLedger.query(`
    INSERT INTO wallets (user_id, balance, points) 
    VALUES ($1, 0, 0) 
    ON CONFLICT (user_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
    RETURNING id, balance, points, referral_activated
  `, [userIdNum]);
  
  return result.rows[0];
}

let economyCache: any = null;
let lastCacheUpdate = 0;
const CACHE_TTL = 60 * 1000; // 1 minute

export async function getEconomySettings() {
  if (economyCache && (Date.now() - lastCacheUpdate < CACHE_TTL)) {
    return economyCache;
  }

  let settings: any = {};
  
  const ledgerTarget = ledgerPool || pool;
  const res = await ledgerTarget.query('SELECT * FROM economy_settings LIMIT 1');
  
  if (res.rows.length > 0) {
    settings = res.rows[0];
    settings.crypto_address = decrypt(settings.crypto_address || process.env.DEFAULT_CRYPTO_ADDRESS || 'TPh7eWpY29kZVN6QXV0VGhlbnRpY2F0aW9uTGVkZ2Vy');
    settings.bank_name = decrypt(settings.bank_name || process.env.DEFAULT_BANK_NAME || 'Merchant Discount Bank IL (011)');
    settings.bank_recipient = decrypt(settings.bank_recipient || process.env.DEFAULT_BANK_RECIPIENT || 'Perplexta Tech Platforms LTD.');
    settings.bank_iban = decrypt(settings.bank_iban || process.env.DEFAULT_BANK_IBAN || 'IL42 0110 0000 0000 3484 2192');
    settings.bank_swift = decrypt(settings.bank_swift || process.env.DEFAULT_BANK_SWIFT || 'PPLXIL33XXX');
    settings.paypal_email = decrypt(settings.paypal_email || process.env.DEFAULT_PAYPAL_EMAIL || 'paypal@perplexta.com');
  } else {
    settings = {
      points_per_dollar: 1000,
      min_payout_usd: 10,
      min_deposit_usd: 5,
      referral_bonus_percent: 10,
      welcome_bonus_points: 600,
      referral_bonus_points: 1000,
      conversion_rate: 0.001,
      min_withdrawal_cents: 1000,
      referral_activation_min_deposit: 10,
      crypto_address: decrypt(process.env.DEFAULT_CRYPTO_ADDRESS || 'TPh7eWpY29kZVN6QXV0VGhlbnRpY2F0aW9uTGVkZ2Vy'),
      bank_name: decrypt(process.env.DEFAULT_BANK_NAME || 'Merchant Discount Bank IL (011)'),
      bank_recipient: decrypt(process.env.DEFAULT_BANK_RECIPIENT || 'Perplexta Tech Platforms LTD.'),
      bank_iban: decrypt(process.env.DEFAULT_BANK_IBAN || 'IL42 0110 0000 0000 3484 2192'),
      bank_swift: decrypt(process.env.DEFAULT_BANK_SWIFT || 'PPLXIL33XXX'),
      paypal_email: decrypt(process.env.DEFAULT_PAYPAL_EMAIL || 'paypal@perplexta.com')
    };
  }
  
  economyCache = settings;
  lastCacheUpdate = Date.now();
  return settings;
}

export async function updateEconomySettings(settings: any) {
  const { 
    points_per_dollar, min_payout_usd, min_deposit_usd, referral_bonus_percent,
    welcome_bonus_points, referral_bonus_points, min_withdrawal_cents, conversion_rate,
    referral_activation_min_deposit,
    crypto_address, bank_name, bank_recipient, bank_iban, bank_swift, paypal_email
  } = settings;
  
  const ledgerTarget = ledgerPool || pool;
  await ledgerTarget.query(`
    UPDATE economy_settings SET 
      points_per_dollar = $1, min_payout_usd = $2, min_deposit_usd = $3, 
      referral_bonus_percent = $4, welcome_bonus_points = $5, 
      referral_bonus_points = $6, min_withdrawal_cents = $7, 
      conversion_rate = $8, referral_activation_min_deposit = $9,
      crypto_address = $10, bank_name = $11, bank_recipient = $12,
      bank_iban = $13, bank_swift = $14, paypal_email = $15,
      updated_at = CURRENT_TIMESTAMP
  `, [
    points_per_dollar, min_payout_usd, min_deposit_usd, referral_bonus_percent,
    welcome_bonus_points, referral_bonus_points, min_withdrawal_cents, conversion_rate,
    referral_activation_min_deposit,
    encrypt(crypto_address || process.env.DEFAULT_CRYPTO_ADDRESS || 'TPh7eWpY29kZVN6QXV0VGhlbnRpY2F0aW9uTGVkZ2Vy'),
    encrypt(bank_name || process.env.DEFAULT_BANK_NAME || 'Merchant Discount Bank IL (011)'),
    encrypt(bank_recipient || process.env.DEFAULT_BANK_RECIPIENT || 'Perplexta Tech Platforms LTD.'),
    encrypt(bank_iban || process.env.DEFAULT_BANK_IBAN || 'IL42 0110 0000 0000 3484 2192'),
    encrypt(bank_swift || process.env.DEFAULT_BANK_SWIFT || 'PPLXIL33XXX'),
    encrypt(paypal_email || process.env.DEFAULT_PAYPAL_EMAIL || 'paypal@perplexta.com')
  ]);
  
  clearEconomyCache();
  return { success: true };
}

export function clearEconomyCache() {
  economyCache = null;
  lastCacheUpdate = 0;
}

export async function getTransactionHistory(userId: string, type: string, limit: number = 100, offset: number = 0) {
  if (!ledgerPool) throw new Error('Ledger database not available');
  
  const cappedLimit = Math.min(Math.max(1, limit), 100);

  let baseQuery = 'FROM ledger_transactions WHERE user_id = $1 AND (is_hidden IS NOT TRUE)';
  const params: any[] = [userId];

  if (type !== 'all') {
    baseQuery += ' AND transaction_type = $2';
    params.push(type);
  }

  const countRes = await ledgerPool.query(`SELECT COUNT(*) as total ${baseQuery}`, params);
  const total = parseInt(countRes.rows[0].total || '0');

  const limitIdx = params.length + 1;
  const offsetIdx = params.length + 2;
  const dataQuery = `SELECT * ${baseQuery} ORDER BY created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`;
  
  const finalParams = [...params, cappedLimit, offset];
  const result = await ledgerPool.query(dataQuery, finalParams);
  
  return {
    transactions: result.rows,
    total,
    hasMore: offset + result.rows.length < total,
    limit: cappedLimit,
    offset
  };
}

export async function convertPointsToBalance(userId: string, amountPoints: number) {
  if (!ledgerPool || !pool) throw new Error('Database not available');
  
  if (isNaN(amountPoints) || amountPoints <= 0) {
    throw new Error('Points amount must be a positive integer greater than zero.');
  }

  const settings = await getEconomySettings();
  const rate = parseFloat(settings.conversion_rate || '0.001'); 
  const usdAmount = amountPoints * rate;

  const client = await ledgerPool.connect();
  try {
    await client.query('BEGIN');
    
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
  
  const cleanedMethod = method ? method.trim().toLowerCase() : '';
  const allowedMethods = ['paypal', 'bank', 'crypto'];
  if (!allowedMethods.includes(cleanedMethod)) {
    throw new Error('Invalid withdrawal method. Allowed methods: PayPal, Bank, Crypto.');
  }

  if (isNaN(amountUSD) || amountUSD <= 0) {
    throw new Error('Withdrawal amount must be greater than zero.');
  }

  const sanitizedDetails = details 
    ? details.toString().replace(/<[^>]*>/g, '').substring(0, 500).trim()
    : '';

  const settings = await getEconomySettings();
  const minCents = settings.min_withdrawal_cents || 2000;
  if (amountUSD * 100 < minCents) {
    throw new Error(`Minimum withdrawal is $${(minCents / 100).toFixed(2)}`);
  }

  const client = await ledgerPool.connect();
  try {
    await client.query('BEGIN');
    
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

    const witRes = await client.query(
      'INSERT INTO withdrawal_requests (user_id, amount_cents, method, details, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [userId, Math.round(amountUSD * 100), cleanedMethod, sanitizedDetails, 'pending']
    );
    const withdrawalId = witRes.rows[0].id;

    await client.query(
      'INSERT INTO ledger_transactions (user_id, wallet_id, amount, transaction_type, status, reference_id, description) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [userId, wallet.id, -amountUSD, 'withdrawal', 'pending', withdrawalId.toString(), `Withdrawal request for $${amountUSD} via ${cleanedMethod} (${sanitizedDetails})`]
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

export async function getReferralCount(userId: string | number) {
  if (!ledgerPool) throw new Error('Ledger database not available');
  const userIdNum = typeof userId === 'number' ? userId : parseInt(userId, 10);
  if (isNaN(userIdNum)) throw new Error('Invalid User ID');

  const result = await ledgerPool.query('SELECT count(*) FROM referrals WHERE referrer_id = $1 AND status = \'active\'', [userIdNum]);
  return parseInt(result.rows[0].count);
}

export async function checkReferralActivation(userId: string | number) {
  if (!ledgerPool || !pool) return;
  
  const userIdNum = typeof userId === 'number' ? userId : parseInt(userId, 10);
  if (isNaN(userIdNum)) return;

  const wallet = await getUserWallet(userIdNum);
  if (wallet.referral_activated) return;

  const settings = await getEconomySettings();
  const minDeposit = settings.referral_activation_min_deposit || 10;

  const depositResult = await ledgerPool.query(
    "SELECT SUM(amount) as total FROM ledger_transactions WHERE user_id = $1 AND (transaction_type = 'deposit' OR transaction_type = 'add_funds') AND status = 'success'",
    [userIdNum]
  );
  
  const totalDeposited = parseFloat(depositResult.rows[0].total || '0');

  if (totalDeposited >= parseFloat(minDeposit)) {
    await ledgerPool.query('UPDATE wallets SET referral_activated = true WHERE user_id = $1', [userIdNum]);
  }
}

export async function deductFromWallet(userId: string | number, amount: number, transactionType: string, description: string) {
  if (!ledgerPool) throw new Error('Ledger database not available');

  const userIdNum = typeof userId === 'number' ? userId : parseInt(userId, 10);
  if (isNaN(userIdNum)) throw new Error('Invalid User ID');

  const client = await ledgerPool.connect();
  try {
    await client.query('BEGIN');
    
    const walletRes = await client.query(
      'SELECT id, balance FROM wallets WHERE user_id = $1 FOR UPDATE',
      [userIdNum]
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
      [userIdNum, wallet.id, -amount, transactionType, description]
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

export async function refundToWallet(userId: string | number, amount: number, transactionType: string, description: string) {
  if (!ledgerPool) throw new Error('Ledger database not available');

  const userIdNum = typeof userId === 'number' ? userId : parseInt(userId, 10);
  if (isNaN(userIdNum)) throw new Error('Invalid User ID');

  const client = await ledgerPool.connect();
  try {
    await client.query('BEGIN');
    
    const wallet = await getUserWallet(userIdNum, client);
    const walletId = wallet.id;
    
    const result = await client.query(
      'UPDATE wallets SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING balance',
      [amount, walletId]
    );

    await client.query(
      'INSERT INTO ledger_transactions (user_id, wallet_id, amount, transaction_type, description) VALUES ($1, $2, $3, $4, $5)',
      [userIdNum, walletId, amount, transactionType, description]
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

export async function adjustWalletBalance(userId: string | number, amount: number, type: 'credit' | 'debit' | 'add' | 'deduct', reason: string, target: 'balance' | 'points' = 'balance') {
  if (!ledgerPool) throw new Error('Ledger database not available');

  if (isNaN(amount) || amount <= 0) {
    throw new Error('Adjustment amount must be a positive number greater than zero.');
  }

  const userIdNum = typeof userId === 'number' ? userId : parseInt(userId, 10);
  if (isNaN(userIdNum)) {
    throw new Error('Invalid User ID');
  }

  if (target !== 'points' && target !== 'balance') {
    throw new Error('Invalid target column specification');
  }

  const client = await ledgerPool.connect();
  try {
    await client.query('BEGIN');
    const wallet = await getUserWallet(userIdNum, client);
    const isCredit = type === 'credit' || type === 'add';
    const finalAmount = isCredit ? Math.abs(amount) : -Math.abs(amount);

    const column = target === 'points' ? 'points' : 'balance';
    const result = await client.query(
      `UPDATE wallets SET ${column} = ${column} + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING balance, points`,
      [finalAmount, wallet.id]
    );

    await client.query(
      'INSERT INTO ledger_transactions (user_id, wallet_id, amount, transaction_type, description, status) VALUES ($1, $2, $3, $4, $5, $6)',
      [userIdNum, wallet.id, finalAmount, 'admin_adjustment', `[${target.toUpperCase()}] ${reason}`, 'success']
    );

    await client.query('COMMIT');
    return { 
      newBalance: result.rows[0].balance,
      newPoints: result.rows[0].points
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function depositToWallet(userId: string | number, amount: number, method: string, description: string) {
  if (!ledgerPool) throw new Error('Ledger database not available');

  const userIdNum = typeof userId === 'number' ? userId : parseInt(userId, 10);
  if (isNaN(userIdNum)) {
    throw new Error('Invalid User ID');
  }

  if (amount <= 0) {
    throw new Error('Deposit amount must be greater than zero');
  }

  const client = await ledgerPool.connect();
  try {
    await client.query('BEGIN');
    const wallet = await getUserWallet(userIdNum, client);
    
    const result = await client.query(
      `UPDATE wallets SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING balance, points`,
      [amount, wallet.id]
    );

    await client.query(
      `INSERT INTO ledger_transactions (user_id, wallet_id, amount, transaction_type, description, status) 
       VALUES ($1, $2, $3, 'deposit', $4, 'success')`,
      [userIdNum, wallet.id, amount, `Deposited via ${method}: ${description}`]
    );

    await client.query('COMMIT');

    try {
      await checkReferralActivation(userIdNum);
    } catch (refErr) {
      console.warn('[Wallet] Referral activation check warning during deposit:', refErr);
    }

    return {
      success: true,
      newBalance: result.rows[0].balance,
      newPoints: result.rows[0].points
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function deductUsageFromWallet(userId: string | number, toolId: string) {
  if (!ledgerPool) throw new Error('Ledger database not available');

  const userIdNum = typeof userId === 'number' ? userId : parseInt(userId, 10);
  if (isNaN(userIdNum)) throw new Error('Invalid User ID');

  const client = await ledgerPool.connect();
  try {
    await client.query('BEGIN');
    const wallet = await getUserWallet(userIdNum, client);
    const settings = await getEconomySettings();
    const rate = parseFloat(settings.conversion_rate || '0.001');

    const pointsCost = 10;
    const usdCost = pointsCost * rate;

    if (wallet.points >= pointsCost) {
      await client.query(
        'UPDATE wallets SET points = points - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [pointsCost, wallet.id]
      );
      await client.query(
        'INSERT INTO ledger_transactions (user_id, wallet_id, amount, points, transaction_type, description, status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [userIdNum, wallet.id, 0, -pointsCost, 'tool_usage_points', `Exceeded ${toolId} quota. Charged ${pointsCost} tool points.`, 'success']
      );
      await client.query('COMMIT');
      return { charged: 'points', amount: pointsCost };
    } else if (Number(wallet.balance) >= usdCost) {
      await client.query(
        'UPDATE wallets SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [usdCost, wallet.id]
      );
      await client.query(
        'INSERT INTO ledger_transactions (user_id, wallet_id, amount, points, transaction_type, description, status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [userIdNum, wallet.id, -usdCost, 0, 'tool_usage_balance', `Exceeded ${toolId} quota. Charged ₪${usdCost.toFixed(2)} from wallet cache balance.`, 'success']
      );
      await client.query('COMMIT');
      return { charged: 'balance', amount: usdCost };
    } else {
      throw new Error('Insufficient balance and points');
    }
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}


