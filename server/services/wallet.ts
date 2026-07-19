import { ledgerPool, pool } from '../db/index.js';
import { encrypt, decrypt } from '../utils/crypto.js';
import { createNotification } from './notifications.js';
import { io } from '../config/socket.js';

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_TX_HISTORY = 20;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Safe decrypt: returns the original value if decryption fails (plain-text env vars). */
function safeDecrypt(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  try { return decrypt(value); } catch { return value; }
}

// ─── Transaction Limit ───────────────────────────────────────────────────────

export async function enforceTransactionLimit(userId: string | number, txClient?: any) {
  const target = txClient || ledgerPool;
  if (!target) return;
  const userIdNum = typeof userId === 'number' ? userId : parseInt(userId, 10);
  if (isNaN(userIdNum)) return;
  try {
    await target.query(`
      DELETE FROM ledger_transactions
      WHERE id NOT IN (
        SELECT id FROM ledger_transactions
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT ${MAX_TX_HISTORY}
      ) AND user_id = $1
    `, [userIdNum]);
  } catch (err) {
    console.warn('[Wallet] enforceTransactionLimit failed:', err);
  }
}

// ─── Wallet ───────────────────────────────────────────────────────────────────

/**
 * Returns the wallet row for a user, creating it if it doesn't exist.
 * NOTE: User existence must be validated at the route/middleware level —
 * not here — to avoid cross-DB queries inside ledger transactions.
 */
export async function getUserWallet(userId: string | number, txClient?: any) {
  const target = txClient || ledgerPool;
  if (!target) throw new Error('Ledger database not available');

  const userIdNum = typeof userId === 'number' ? userId : parseInt(userId, 10);
  if (isNaN(userIdNum)) throw new Error('Invalid User ID');

  // When inside a transaction, use FOR UPDATE to prevent concurrent modifications
  if (txClient) {
    const existing = await txClient.query(
      'SELECT id, balance, points, referral_activated FROM wallets WHERE user_id = $1 FOR UPDATE',
      [userIdNum]
    );
    if (existing.rows.length > 0) {
      const wallet = existing.rows[0];
      // One-time auto-healing check: if points = 0 AND balance = 0, check if we should award the welcome bonus
      if (Number(wallet.points || 0) === 0 && Number(wallet.balance || 0) === 0) {
        const transCheck = await txClient.query('SELECT count(*) FROM ledger_transactions WHERE user_id = $1', [userIdNum]);
        if (parseInt(transCheck.rows[0].count, 10) === 0) {
          let welcomeBonusPoints = 600;
          try {
            const settings = await getEconomySettings();
            if (settings && settings.welcome_bonus_points !== undefined) {
              welcomeBonusPoints = parseInt(settings.welcome_bonus_points, 10) || 0;
            }
          } catch (err) {
            console.warn('[Wallet] Failed to resolve welcome bonus for healing:', err);
          }
          if (welcomeBonusPoints > 0) {
            await txClient.query('UPDATE wallets SET points = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [welcomeBonusPoints, wallet.id]);
            await txClient.query(
              `INSERT INTO ledger_transactions (user_id, wallet_id, amount, points, transaction_type, status, description) 
               VALUES ($1, $2, 0, $3, 'welcome_bonus', 'success', $4)`,
              [userIdNum, wallet.id, welcomeBonusPoints, 'مكافأة التسجيل الترحيبية المصححة / Healed welcome registration bonus']
            );
            wallet.points = welcomeBonusPoints;
            console.log(`[Wallet] Auto-healed welcome bonus of ${welcomeBonusPoints} points for User ${userIdNum}`);
          }
        }
      }
      return wallet;
    }
  }

  let welcomeBonusPoints = 600;
  try {
    const settings = await getEconomySettings();
    if (settings && settings.welcome_bonus_points !== undefined) {
      welcomeBonusPoints = parseInt(settings.welcome_bonus_points, 10) || 0;
    }
  } catch (err) {
    console.warn('[Wallet] Failed to resolve welcome bonus for default wallet:', err);
  }

  const result = await target.query(`
    INSERT INTO wallets (user_id, balance, points)
    VALUES ($1, 0, $2)
    ON CONFLICT (user_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
    RETURNING id, balance, points, referral_activated
  `, [userIdNum, welcomeBonusPoints]);

  const wallet = result.rows[0];

  // If the wallet was already in the database (e.g. conflict was resolved but points was zero), auto-heal
  if (wallet && Number(wallet.points || 0) === 0 && Number(wallet.balance || 0) === 0) {
    const transCheck = await target.query('SELECT count(*) FROM ledger_transactions WHERE user_id = $1', [userIdNum]);
    if (parseInt(transCheck.rows[0].count, 10) === 0 && welcomeBonusPoints > 0) {
      await target.query('UPDATE wallets SET points = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [welcomeBonusPoints, wallet.id]);
      await target.query(
        `INSERT INTO ledger_transactions (user_id, wallet_id, amount, points, transaction_type, status, description) 
         VALUES ($1, $2, 0, $3, 'welcome_bonus', 'success', $4)`,
        [userIdNum, wallet.id, welcomeBonusPoints, 'مكافأة التسجيل الترحيبية المصححة / Healed welcome registration bonus']
      );
      wallet.points = welcomeBonusPoints;
      console.log(`[Wallet] Auto-healed welcome bonus of ${welcomeBonusPoints} points in non-tx for User ${userIdNum}`);
    }
  }

  return wallet;
}

import { getCachedEconomySettings, invalidateEconomySettingsCache } from '../db/queries.js';

// ─── Economy Settings ─────────────────────────────────────────────────────────

export async function getEconomySettings() {
  return getCachedEconomySettings();
}

export async function updateEconomySettings(settings: any) {
  const {
    points_per_dollar, min_payout_usd, min_deposit_usd, referral_bonus_percent,
    welcome_bonus_points, referral_bonus_points, min_withdrawal_cents, conversion_rate,
    referral_activation_min_deposit,
    crypto_address, bank_name, bank_recipient, bank_iban, bank_swift, paypal_email,
  } = settings;

  const target = ledgerPool || pool;
  const countCheck = await target.query('SELECT count(*) FROM economy_settings');
  const hasRows = parseInt(countCheck.rows[0].count, 10) > 0;

  if (hasRows) {
    await target.query(`
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
      encrypt(crypto_address || process.env.DEFAULT_CRYPTO_ADDRESS || 'YOUR_DEFAULT_CRYPTO_ADDRESS'),
      encrypt(bank_name      || process.env.DEFAULT_BANK_NAME      || 'Your Default Bank'),
      encrypt(bank_recipient || process.env.DEFAULT_BANK_RECIPIENT || 'Your Default Business Platforms LTD.'),
      encrypt(bank_iban      || process.env.DEFAULT_BANK_IBAN      || 'IL00000000000000000000'),
      encrypt(bank_swift     || process.env.DEFAULT_BANK_SWIFT     || 'TESTIL33XXX'),
      encrypt(paypal_email   || process.env.DEFAULT_PAYPAL_EMAIL   || 'paypal-sandbox@yourdomain.com'),
    ]);
  } else {
    await target.query(`
      INSERT INTO economy_settings (
        points_per_dollar, min_payout_usd, min_deposit_usd, referral_bonus_percent,
        welcome_bonus_points, referral_bonus_points, min_withdrawal_cents, conversion_rate,
        referral_activation_min_deposit, crypto_address, bank_name, bank_recipient, bank_iban, bank_swift, paypal_email
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    `, [
      points_per_dollar, min_payout_usd, min_deposit_usd, referral_bonus_percent,
      welcome_bonus_points, referral_bonus_points, min_withdrawal_cents, conversion_rate,
      referral_activation_min_deposit,
      encrypt(crypto_address || process.env.DEFAULT_CRYPTO_ADDRESS || 'YOUR_DEFAULT_CRYPTO_ADDRESS'),
      encrypt(bank_name      || process.env.DEFAULT_BANK_NAME      || 'Your Default Bank'),
      encrypt(bank_recipient || process.env.DEFAULT_BANK_RECIPIENT || 'Your Default Business Platforms LTD.'),
      encrypt(bank_iban      || process.env.DEFAULT_BANK_IBAN      || 'IL00000000000000000000'),
      encrypt(bank_swift     || process.env.DEFAULT_BANK_SWIFT     || 'TESTIL33XXX'),
      encrypt(paypal_email   || process.env.DEFAULT_PAYPAL_EMAIL   || 'paypal-sandbox@yourdomain.com'),
    ]);
  }

  clearEconomyCache();
  return { success: true };
}

export function clearEconomyCache() {
  invalidateEconomySettingsCache();
}

// ─── Transaction History ──────────────────────────────────────────────────────

export async function getTransactionHistory(userId: string, type: string, limit = MAX_TX_HISTORY, offset = 0) {
  if (!ledgerPool) throw new Error('Ledger database not available');

  const cappedLimit = Math.min(Math.max(1, limit), MAX_TX_HISTORY);

  let baseQuery = 'FROM ledger_transactions WHERE user_id = $1 AND (is_hidden IS NOT TRUE)';
  const params: any[] = [userId];

  if (type !== 'all') {
    baseQuery += ' AND transaction_type = $2';
    params.push(type);
  }

  const countRes = await ledgerPool.query(`SELECT COUNT(*) as total ${baseQuery}`, params);
  const total    = Math.min(MAX_TX_HISTORY, parseInt(countRes.rows[0].total || '0'));

  if (offset >= MAX_TX_HISTORY) return { transactions: [], total, hasMore: false, limit: cappedLimit, offset };

  const limitIdx  = params.length + 1;
  const offsetIdx = params.length + 2;
  const finalLimit = Math.min(cappedLimit, MAX_TX_HISTORY - offset);
  const result = await ledgerPool.query(
    `SELECT * ${baseQuery} ORDER BY created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    [...params, finalLimit, offset]
  );

  return { transactions: result.rows, total, hasMore: offset + result.rows.length < total, limit: cappedLimit, offset };
}

// ─── Points ↔ Balance Conversion ─────────────────────────────────────────────

export async function convertPointsToBalance(userId: string, amountPoints: number) {
  if (!ledgerPool) throw new Error('Ledger database not available');
  if (isNaN(amountPoints) || amountPoints <= 0) throw new Error('Points amount must be a positive integer greater than zero.');

  const settings  = await getEconomySettings();
  const rate      = parseFloat(settings.conversion_rate || '0.001');
  const usdAmount = amountPoints * rate;

  const client = await ledgerPool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'SELECT id, points FROM wallets WHERE user_id = $1 FOR UPDATE', [userId]
    );
    if (!rows.length)                       throw new Error('Wallet not found');
    if (Number(rows[0].points) < amountPoints) throw new Error('Insufficient points');

    await client.query(
      'UPDATE wallets SET points = points - $1, balance = balance + $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [amountPoints, usdAmount, rows[0].id]
    );
    // Fix: record points deduction in `points` column, USD gain in `amount`
    await client.query(
      `INSERT INTO ledger_transactions (user_id, wallet_id, amount, points, transaction_type, description)
       VALUES ($1, $2, $3, $4, 'conversion', $5)`,
      [userId, rows[0].id, usdAmount, -amountPoints, `Converted ${amountPoints} pts → $${usdAmount.toFixed(2)}`]
    );
    await enforceTransactionLimit(userId, client);
    await client.query('COMMIT');
    return { usdAmount };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ─── Withdrawal ───────────────────────────────────────────────────────────────

export async function requestWithdrawal(userId: string, amountUSD: number, method: string, details: string) {
  if (!ledgerPool) throw new Error('Ledger database not available');

  const cleanedMethod   = method?.trim().toLowerCase() ?? '';
  const allowedMethods  = ['paypal', 'bank', 'crypto'];
  if (!allowedMethods.includes(cleanedMethod)) throw new Error('Invalid withdrawal method. Allowed: PayPal, Bank, Crypto.');
  if (isNaN(amountUSD) || amountUSD <= 0)      throw new Error('Withdrawal amount must be greater than zero.');

  const sanitizedDetails = details?.toString().replace(/<[^>]*>/g, '').substring(0, 500).trim() ?? '';

  const settings = await getEconomySettings();
  const minCents = settings.min_withdrawal_cents || 2000;
  if (amountUSD * 100 < minCents) throw new Error(`Minimum withdrawal is $${(minCents / 100).toFixed(2)}`);

  const client = await ledgerPool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'SELECT id, balance FROM wallets WHERE user_id = $1 FOR UPDATE', [userId]
    );
    if (!rows.length)                        throw new Error('Wallet not found');
    if (Number(rows[0].balance) < amountUSD) throw new Error('Insufficient USD balance');

    await client.query(
      'UPDATE wallets SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [amountUSD, rows[0].id]
    );
    const witRes = await client.query(
      'INSERT INTO withdrawal_requests (user_id, amount_cents, method, details, status) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [userId, Math.round(amountUSD * 100), cleanedMethod, sanitizedDetails, 'pending']
    );
    await client.query(
      `INSERT INTO ledger_transactions (user_id, wallet_id, amount, transaction_type, status, reference_id, description)
       VALUES ($1,$2,$3,'withdrawal','pending',$4,$5)`,
      [userId, rows[0].id, -amountUSD, witRes.rows[0].id.toString(),
       `Withdrawal $${amountUSD} via ${cleanedMethod} (${sanitizedDetails})`]
    );
    await enforceTransactionLimit(userId, client);
    await client.query('COMMIT');
    return { success: true };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ─── Referral ─────────────────────────────────────────────────────────────────

export async function getReferralCount(userId: string | number) {
  if (!ledgerPool) throw new Error('Ledger database not available');
  const userIdNum = typeof userId === 'number' ? userId : parseInt(userId, 10);
  if (isNaN(userIdNum)) throw new Error('Invalid User ID');
  const result = await ledgerPool.query(
    "SELECT count(*) FROM referrals WHERE referrer_id = $1 AND status = 'active'", [userIdNum]
  );
  return parseInt(result.rows[0].count);
}

export async function checkReferralActivation(userId: string | number) {
  if (!ledgerPool) return;
  const userIdNum = typeof userId === 'number' ? userId : parseInt(userId, 10);
  if (isNaN(userIdNum)) return;

  const wallet = await getUserWallet(userIdNum);
  if (wallet.referral_activated) return;

  const settings   = await getEconomySettings();
  const minDeposit = settings.referral_activation_min_deposit || 10;

  const depositResult = await ledgerPool.query(
    "SELECT SUM(amount) as total FROM ledger_transactions WHERE user_id = $1 AND transaction_type IN ('deposit','add_funds') AND status = 'success'",
    [userIdNum]
  );
  if (parseFloat(depositResult.rows[0].total || '0') >= parseFloat(minDeposit)) {
    await ledgerPool.query('UPDATE wallets SET referral_activated = true WHERE user_id = $1', [userIdNum]);

    // Find pending referrals for this referred user
    const pendingRefs = await ledgerPool.query(
      "SELECT id, referrer_id, bonus_points FROM referrals WHERE referred_id = $1 AND status = 'pending'",
      [userIdNum]
    );

    for (const ref of pendingRefs.rows) {
      const { id: refId, referrer_id: referrerId, bonus_points: refBonusPoints } = ref;

      // Update referral record to active
      await ledgerPool.query(
        "UPDATE referrals SET status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [refId]
      );

      // Get or create referrer wallet and credit points
      const referrerWallet = await getUserWallet(referrerId);
      await ledgerPool.query(
        "UPDATE wallets SET points = points + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [refBonusPoints, referrerWallet.id]
      );

      // Record transaction in ledger representing programmatic credit
      await ledgerPool.query(
        `INSERT INTO ledger_transactions (user_id, wallet_id, amount, points, transaction_type, status, description) 
         VALUES ($1, $2, 0, $3, 'referral_bonus', 'success', $4)`,
        [referrerId, referrerWallet.id, refBonusPoints, `مكافأة إحالة صديق فعال / Active friend referral reward`]
      );

      // Send real-time notification to the referrer
      try {
        await createNotification(
          referrerId,
          'gift',
          'Referral Bonus Activated! 🎁',
          'تم تفعيل مكافأة الإحالة! 🎁',
          `Your invited friend has met the system activation threshold. You have been awarded ${refBonusPoints} points!`,
          `لقد استوفى صديقك المدعو شروط التفعيل المعتمدة في النظام. تم منحك ${refBonusPoints} نقطة مكافأة!`
        );
      } catch (notifErr) {
        console.error('Failed to create referral bonus notification:', notifErr);
      }

      // Sync and broadcast points update for the referrer
      io?.to(`user_${referrerId}`).emit("balance_update", {
        points: Number(referrerWallet.points) + Number(refBonusPoints),
        balance: Number(referrerWallet.balance)
      });
    }

    // Sync and broadcast points update for the active referred user
    io?.to(`user_${userIdNum}`).emit("balance_update", {
      points: Number(wallet.points),
      balance: Number(wallet.balance)
    });
  }
}

// ─── Admin / Direct Wallet Operations ────────────────────────────────────────

export async function deductFromWallet(userId: string | number, amount: number, transactionType: string, description: string) {
  if (!ledgerPool) throw new Error('Ledger database not available');
  const userIdNum = typeof userId === 'number' ? userId : parseInt(userId, 10);
  if (isNaN(userIdNum)) throw new Error('Invalid User ID');

  const client = await ledgerPool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'SELECT id, balance FROM wallets WHERE user_id = $1 FOR UPDATE', [userIdNum]
    );
    if (!rows.length)                       throw new Error('Wallet not found');
    if (Number(rows[0].balance) < amount)   throw new Error('Insufficient balance');

    const result = await client.query(
      'UPDATE wallets SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING balance',
      [amount, rows[0].id]
    );
    await client.query(
      'INSERT INTO ledger_transactions (user_id, wallet_id, amount, transaction_type, description) VALUES ($1,$2,$3,$4,$5)',
      [userIdNum, rows[0].id, -amount, transactionType, description]
    );
    await enforceTransactionLimit(userIdNum, client);
    await client.query('COMMIT');
    return result.rows[0].balance;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
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
    const result = await client.query(
      'UPDATE wallets SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING balance',
      [amount, wallet.id]
    );
    await client.query(
      'INSERT INTO ledger_transactions (user_id, wallet_id, amount, transaction_type, description) VALUES ($1,$2,$3,$4,$5)',
      [userIdNum, wallet.id, amount, transactionType, description]
    );
    await enforceTransactionLimit(userIdNum, client);
    await client.query('COMMIT');
    return result.rows[0].balance;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function adjustWalletBalance(
  userId: string | number, amount: number,
  type: 'credit' | 'debit' | 'add' | 'deduct',
  reason: string,
  target: 'balance' | 'points' = 'balance'
) {
  if (!ledgerPool) throw new Error('Ledger database not available');
  if (isNaN(amount) || amount <= 0) throw new Error('Adjustment amount must be a positive number greater than zero.');

  const userIdNum = typeof userId === 'number' ? userId : parseInt(userId, 10);
  if (isNaN(userIdNum)) throw new Error('Invalid User ID');

  // Fix: explicit whitelist — no string interpolation in SQL
  if (target !== 'points' && target !== 'balance') throw new Error('Invalid target column specification');

  const client = await ledgerPool.connect();
  try {
    await client.query('BEGIN');
    const wallet     = await getUserWallet(userIdNum, client);
    const isCredit   = type === 'credit' || type === 'add';
    const finalAmount = isCredit ? Math.abs(amount) : -Math.abs(amount);

    let result;
    if (target === 'points') {
      result = await client.query(
        'UPDATE wallets SET points = points + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING balance, points',
        [finalAmount, wallet.id]
      );
    } else {
      result = await client.query(
        'UPDATE wallets SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING balance, points',
        [finalAmount, wallet.id]
      );
    }

    if (target === 'points') {
      await client.query(
        'INSERT INTO ledger_transactions (user_id, wallet_id, amount, points, transaction_type, description, status) VALUES ($1,$2,0,$3,$4,$5,$6)',
        [userIdNum, wallet.id, finalAmount, 'admin_adjustment', `[${target.toUpperCase()}] ${reason}`, 'success']
      );
    } else {
      await client.query(
        'INSERT INTO ledger_transactions (user_id, wallet_id, amount, points, transaction_type, description, status) VALUES ($1,$2,$3,0,$4,$5,$6)',
        [userIdNum, wallet.id, finalAmount, 'admin_adjustment', `[${target.toUpperCase()}] ${reason}`, 'success']
      );
    }
    await enforceTransactionLimit(userIdNum, client);
    await client.query('COMMIT');
    return { newBalance: result.rows[0].balance, newPoints: result.rows[0].points };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function depositToWallet(userId: string | number, amount: number, method: string, description: string) {
  if (!ledgerPool) throw new Error('Ledger database not available');
  const userIdNum = typeof userId === 'number' ? userId : parseInt(userId, 10);
  if (isNaN(userIdNum)) throw new Error('Invalid User ID');
  if (amount <= 0) throw new Error('Deposit amount must be greater than zero');

  const client = await ledgerPool.connect();
  try {
    await client.query('BEGIN');
    const wallet = await getUserWallet(userIdNum, client);
    const result = await client.query(
      'UPDATE wallets SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING balance, points',
      [amount, wallet.id]
    );
    await client.query(
      `INSERT INTO ledger_transactions (user_id, wallet_id, amount, transaction_type, description, status)
       VALUES ($1,$2,$3,'deposit',$4,'success')`,
      [userIdNum, wallet.id, amount, `Deposited via ${method}: ${description}`]
    );
    await enforceTransactionLimit(userIdNum, client);
    await client.query('COMMIT');

    try { await checkReferralActivation(userIdNum); }
    catch (refErr) { console.warn('[Wallet] Referral activation check failed:', refErr); }

    return { success: true, newBalance: result.rows[0].balance, newPoints: result.rows[0].points };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
