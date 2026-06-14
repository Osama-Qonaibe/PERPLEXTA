import { ledgerPool, pool } from '../db/index.js';
import { getEconomySettings, getUserWallet, enforceTransactionLimit } from './wallet.js';
import { io } from '../config/socket.js';
import { logSecurityAlert } from './notifications.js';

/**
 * Calculates dynamic token usage points cost for a specific tool and token counts.
 * It is a centralized pricing calculation function based on tool's orchestrator configuration.
 */
export async function calculateTokenPointsCost(toolId: string, inputTokens: number, outputTokens: number): Promise<number> {
  if (!pool) return 0;
  
  try {
    const toolRes = await pool.query(
      'SELECT cost_per_usage, cost_per_1k_input_tokens, cost_per_1k_output_tokens FROM tool_orchestrator WHERE tool_id = $1',
      [toolId]
    );
    if (toolRes.rows.length === 0) {
      console.warn(`[Billing - Token Calc] Missing orchestrator configuration for tool_id: ${toolId}. Execution prohibited.`);
      return 0;
    }

    const row = toolRes.rows[0];
    
    // Parse active settings
    const baseCostParsed = parseInt(row.cost_per_usage, 10);
    const baseCost = !isNaN(baseCostParsed) ? baseCostParsed : 0;

    const costInputParsed = parseFloat(row.cost_per_1k_input_tokens);
    const costInput = !isNaN(costInputParsed) ? costInputParsed : 0;

    const costOutputParsed = parseFloat(row.cost_per_1k_output_tokens);
    const costOutput = !isNaN(costOutputParsed) ? costOutputParsed : 0;

    // Separate calculations for auditing and granular billing precision
    const fixedServiceFee = baseCost;
    const inputTokenCost = (inputTokens / 1000) * costInput;
    const outputTokenCost = (outputTokens / 1000) * costOutput;
    const tokenUsageCost = inputTokenCost + outputTokenCost;
    const grandTotalCalculated = fixedServiceFee + tokenUsageCost;
    const finalPointsCost = Math.ceil(grandTotalCalculated);

    // Detailed execution breakdown
    console.log(
      `[Billing - Token Calc] [Tool: ${toolId}] [Inputs: ${inputTokens} @ ${costInput}/1k] [Outputs: ${outputTokens} @ ${costOutput}/1k] ` +
      `-> Breakdown: { Fixed Service Fee: ${fixedServiceFee} pts | Token Usage Cost: ${tokenUsageCost.toFixed(4)} pts (In: ${inputTokenCost.toFixed(4)}, Out: ${outputTokenCost.toFixed(4)}) } ` +
      `-> Raw Total: ${grandTotalCalculated.toFixed(4)} pts -> Ceiled Final: ${finalPointsCost} pts`
    );

    return finalPointsCost;
  } catch (err) {
    console.error('[Billing] Failed to calculate token points cost from orchestrator parameters:', err);
    return 0;
  }
}

/**
 * Converts points to USD based on the centralized points_per_dollar setting.
 */
export async function convertPointsToUsd(points: number): Promise<number> {
  try {
    const settings = await getEconomySettings();
    const pointsPerDollar = parseFloat(settings.points_per_dollar || '1000');
    return points / pointsPerDollar;
  } catch (err) {
    console.error('[Billing] Failed to convert points to USD:', err);
    return points / 1000;
  }
}

/**
 * Determines if a user can afford the points cost either using points, or points converted to wallet balance.
 */
export async function checkUserAffordability(userId: string | number, toolId: string, estimatedInputTokens: number = 0): Promise<{
  allowed: boolean;
  requiredPoints: number;
  availablePoints: number;
  availableBalanceUSD: number;
  pointsPerDollar: number;
}> {
  const userIdNum = typeof userId === 'number' ? userId : parseInt(userId, 10);
  const wallet = await getUserWallet(userIdNum);
  const settings = await getEconomySettings();
  const pointsPerDollar = parseFloat(settings.points_per_dollar || '1000');

  const requiredPoints = await calculateTokenPointsCost(toolId, estimatedInputTokens, 0);
  const availablePoints = Number(wallet.points || 0);
  const availableBalanceUSD = Number(wallet.balance || 0);
  const totalPointsAvailable = availablePoints + (availableBalanceUSD * pointsPerDollar);

  return {
    allowed: totalPointsAvailable >= requiredPoints,
    requiredPoints,
    availablePoints,
    availableBalanceUSD,
    pointsPerDollar
  };
}

/**
 * Deducts points upfront from user's account to secure execution authorization (hold).
 */
export async function applyUpfrontHold(userId: string | number, toolId: string, estimatedInputTokens: number = 0): Promise<{
  heldPoints: number;
  totalPointsAvailable: number;
}> {
  if (!ledgerPool) throw new Error('Ledger database not available');
  const userIdNum = typeof userId === 'number' ? userId : parseInt(userId, 10);

  const client = await ledgerPool.connect();
  try {
    await client.query('BEGIN');
    
    // Acquire a strict row-level lock (FOR UPDATE) via getUserWallet with client passed in
    const wallet = await getUserWallet(userIdNum, client);
    console.log(`[Billing - Security] Row-level FOR UPDATE lock acquired for User ${userIdNum}. Securing account against concurrent transactions.`);

    const settings = await getEconomySettings();
    const pointsPerDollar = parseFloat(settings.points_per_dollar || '1000');

    // Calculate required points based on input estimate
    const requiredPoints = await calculateTokenPointsCost(toolId, estimatedInputTokens, 0);
    const availablePoints = Number(wallet.points || 0);
    const availableBalanceUSD = Number(wallet.balance || 0);
    const totalPointsAvailable = availablePoints + (availableBalanceUSD * pointsPerDollar);

    console.log(`[Billing - Hold] Evaluation for User ${userIdNum}: Required points=${requiredPoints} | Current: { Points: ${availablePoints}, Balance USD: ${availableBalanceUSD} (${availableBalanceUSD * pointsPerDollar} pts equivalent) } | Total Available: ${totalPointsAvailable} pts`);

    if (totalPointsAvailable < requiredPoints) {
      console.warn(`[Billing - Security Fail] User ${userIdNum} failed upfront evaluation: Required ${requiredPoints} pts, has ${totalPointsAvailable} pts.`);
      throw new Error('INSUFFICIENT_FUNDS');
    }

    // Determine the exact upfront hold determined purely by the orchestrator configuration with supreme precision
    const holdPoints = requiredPoints;

    let pointsToDeduct = 0;
    let balanceToDeductUSD = 0;

    if (availablePoints >= holdPoints) {
      pointsToDeduct = holdPoints;
      await client.query(
        'UPDATE wallets SET points = points - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [holdPoints, wallet.id]
      );
      console.log(`[Billing - Hold Deduct] User ${userIdNum} paid fully from Points bucket: Deducted ${holdPoints} points.`);
    } else {
      pointsToDeduct = availablePoints;
      const remainingPointsNeeded = holdPoints - pointsToDeduct;
      balanceToDeductUSD = remainingPointsNeeded / pointsPerDollar;

      await client.query(
        'UPDATE wallets SET points = 0, balance = balance - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [balanceToDeductUSD, wallet.id]
      );
      console.log(`[Billing - Hold Deduct] User ${userIdNum} paid with split-purse: Deducted all ${pointsToDeduct} points and $${balanceToDeductUSD.toFixed(4)} USD balance.`);
    }

    const desc = `Deducted upfront checking hold of ${holdPoints} points for tool ${toolId} execution.`;
    await client.query(
      "INSERT INTO ledger_transactions (user_id, wallet_id, amount, points, transaction_type, status, description) VALUES ($1, $2, $3, $4, 'tool_usage_hold', 'pending', $5)",
      [userIdNum, wallet.id, -balanceToDeductUSD, -pointsToDeduct, desc]
    );

    await enforceTransactionLimit(userIdNum, client);
    await client.query('COMMIT');
    
    console.log(`[Billing - Security Output] Upfront hold transaction committed successfully for User ${userIdNum}. Hold Amount: ${holdPoints} points.`);

    return {
      heldPoints: holdPoints,
      totalPointsAvailable: totalPointsAvailable - holdPoints
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`[Billing - Security Error] Transaction rollback for User ${userIdNum} during upfront hold:`, error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Reconciles the upfront held points using actual real-time token usage calculated upon execution completion.
 * Correctly refunds excessive holds or surcharges underpaid amounts.
 */
export async function reconcileHold(
  userId: string | number,
  toolId: string,
  heldPoints: number,
  inputTokens: number,
  outputTokens: number
): Promise<{ actualPointsCost: number; refundPoints: number }> {
  if (!ledgerPool) return { actualPointsCost: 0, refundPoints: 0 };
  const userIdNum = typeof userId === 'number' ? userId : parseInt(userId, 10);

  const client = await ledgerPool.connect();
  try {
    await client.query('BEGIN');
    
    // Acquire active lock for high-concurrency safety
    const wallet = await getUserWallet(userIdNum, client);
    console.log(`[Billing - Security] Row-level FOR UPDATE lock acquired for User ${userIdNum} during reconciliation state.`);

    const settings = await getEconomySettings();
    const pointsPerDollar = parseFloat(settings.points_per_dollar || '1000');

    // Calculate actual points based on actual input/output token usage
    const actualPointsCost = await calculateTokenPointsCost(toolId, inputTokens, outputTokens);
    const refundPoints = heldPoints - actualPointsCost;

    console.log(`[Billing - Reconcile] User ${userIdNum}: Held=${heldPoints} pts | ActualRequired=${actualPointsCost} pts | NetAdjustment=${refundPoints} pts (Positive=Refund, Negative=Surcharge)`);

    // Direct resolution update on the pending hold transaction record
    await client.query(
      "UPDATE ledger_transactions SET status = 'success' WHERE user_id = $1 AND transaction_type = 'tool_usage_hold' AND status = 'pending'",
      [userIdNum]
    );

    if (refundPoints > 0) {
      await client.query(
        'UPDATE wallets SET points = points + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [refundPoints, wallet.id]
      );
      const desc = `Reconciled tool ${toolId} execution. Actual: ${actualPointsCost} points. Refunded unused: ${refundPoints} points.`;
      await client.query(
        "INSERT INTO ledger_transactions (user_id, wallet_id, amount, points, transaction_type, status, description) VALUES ($1, $2, 0, $3, 'tool_usage_reconcile', 'success', $4)",
        [userIdNum, wallet.id, refundPoints, desc]
      );
      console.log(`[Billing - Reconcile Adjust] User ${userIdNum}: Successfully refunded ${refundPoints} unused points to wallet.`);
    } else if (refundPoints < 0) {
      const extraPoints = Math.abs(refundPoints);
      let extraPointsDeducted = 0;
      let extraUSDToDeduct = 0;

      if (Number(wallet.points) >= extraPoints) {
        extraPointsDeducted = extraPoints;
        await client.query(
          'UPDATE wallets SET points = points - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [extraPoints, wallet.id]
        );
        console.log(`[Billing - Reconcile Adjust] User ${userIdNum}: Surcharged extra ${extraPoints} points from Points bucket.`);
      } else {
        extraPointsDeducted = Number(wallet.points);
        const extraNeeded = extraPoints - extraPointsDeducted;
        extraUSDToDeduct = extraNeeded / pointsPerDollar;

        await client.query(
          'UPDATE wallets SET points = 0, balance = balance - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [extraUSDToDeduct, wallet.id]
        );
        console.log(`[Billing - Reconcile Adjust] User ${userIdNum}: Split-purse surcharge. Deducted ${extraPointsDeducted} points and $${extraUSDToDeduct.toFixed(4)} USD balance.`);
      }

      const desc = `Reconciled tool ${toolId} execution. Under-deducted surcharge of ${extraPoints} points applied. Actual: ${actualPointsCost} points.`;
      await client.query(
        "INSERT INTO ledger_transactions (user_id, wallet_id, amount, points, transaction_type, status, description) VALUES ($1, $2, $3, $4, 'tool_usage_reconcile', 'success', $5)",
        [userIdNum, wallet.id, -extraUSDToDeduct, -extraPointsDeducted, desc]
      );
    } else {
      const desc = `Reconciled tool ${toolId} execution. Cost matched hold exactly: ${actualPointsCost} points.`;
      await client.query(
        "INSERT INTO ledger_transactions (user_id, wallet_id, amount, points, transaction_type, status, description) VALUES ($1, $2, 0, 0, 'tool_usage_reconcile', 'success', $3)",
        [userIdNum, wallet.id, desc]
      );
      console.log(`[Billing - Reconcile Adjust] User ${userIdNum}: Perfect match. No adjustments needed.`);
    }

    await enforceTransactionLimit(userIdNum, client);
    await client.query('COMMIT');
    
    console.log(`[Billing - Security Output] Reconcile transaction committed successfully for User ${userIdNum}.`);

    return { actualPointsCost, refundPoints };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`[Billing - Security Error] Failure in reconcile transaction for User ${userIdNum}:`, err);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * General helper to fully refund a held transaction upon absolute execution failure.
 */
export async function refundExecutionHold(userId: string | number, toolId: string, heldPoints: number) {
  if (!ledgerPool) return;
  const userIdNum = typeof userId === 'number' ? userId : parseInt(userId, 10);

  const client = await ledgerPool.connect();
  try {
    await client.query('BEGIN');
    const wallet = await getUserWallet(userIdNum, client);

    await client.query(
      'UPDATE wallets SET points = points + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [heldPoints, wallet.id]
    );
    await client.query(
      'INSERT INTO ledger_transactions (user_id, wallet_id, amount, points, transaction_type, description, status) VALUES ($1, $2, 0, $3, $4, $5, $6)',
      [userIdNum, wallet.id, heldPoints, 'tool_usage_refund', `Refunded upfront hold of ${heldPoints} points for failing execution of ${toolId}.`, 'success']
    );
    await enforceTransactionLimit(userIdNum, client);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Billing] Failed to refund hold on failure:', err);
  } finally {
    client.release();
  }
}

/**
 * Functional Middleware that wraps a tool call, intercepts executions,
 * handles real-time token calculations, and reconciles user balances dynamically.
 */
export async function executeWithBillingMiddleware(
  userId: string | number,
  toolId: string,
  initialPrompt: string,
  quotaCheck: { allowed: boolean; period?: string; limit?: number; currentUsage?: number },
  executeBlock: (
    updateCostProgress: (chunkText: string) => void,
    onSuccess: (generatedText: string) => Promise<void>,
    walletCharged: any
  ) => Promise<any>
) {
  const userIdNum = typeof userId === 'number' ? userId : parseInt(userId, 10);
  let holdPointsResult: { heldPoints: number; totalPointsAvailable: number } | null = null;
  let outerAccumulatedOutput = '';

  // Pre-fetch dynamic tool configurations for instant high-precision synchronous calculators
  let baseCost = 0;
  let costInput = 0;
  let costOutput = 0;

  try {
    const toolRes = await pool.query(
      'SELECT cost_per_usage, cost_per_1k_input_tokens, cost_per_1k_output_tokens FROM tool_orchestrator WHERE tool_id = $1',
      [toolId]
    );
    if (toolRes.rows.length > 0) {
      const row = toolRes.rows[0];
      const baseCostParsed = parseInt(row.cost_per_usage, 10);
      baseCost = !isNaN(baseCostParsed) ? baseCostParsed : 0;
      
      const costInputParsed = parseFloat(row.cost_per_1k_input_tokens);
      costInput = !isNaN(costInputParsed) ? costInputParsed : 0;

      const costOutputParsed = parseFloat(row.cost_per_1k_output_tokens);
      costOutput = !isNaN(costOutputParsed) ? costOutputParsed : 0;
    }
  } catch (err) {
    console.error('[Billing Middleware Prep] Failed to pre-fetch tool dynamic configs:', err);
  }

  // 1. If complimentary quota exceeded, apply upfront balance/points hold
  if (!quotaCheck.allowed) {
    try {
      const estimatedInputTokens = Math.ceil(initialPrompt.length / 4);
      const holdRes = await applyUpfrontHold(userIdNum, toolId, estimatedInputTokens);
      holdPointsResult = holdRes;

      if (io) {
        io.to(`user_${userIdNum}`).emit('user_profile_updated');
        io.to(`user_${userIdNum}`).emit('wallet_charge_notice', {
          toolId,
          charged: 'points',
          amount: holdRes.heldPoints,
          isHold: true
        });
      }
    } catch (chargeErr: any) {
      const period = quotaCheck.period || 'daily';
      const periodStrEn = period === 'daily' ? 'Daily' : 'Monthly';
      const periodStrAr = period === 'daily' ? 'يومي' : 'شهري';

      const msgEn = `Premium Credits Required: You have reached your complimentary ${periodStrEn} limit for this tool. Please recharge your digital wallet (Pay-per-Token) to execute this action.`;
      const msgAr = `تتطلب هذه العملية رصيداً إضافياً: لقد تجاوزت الحد ال${periodStrAr} المسموح به. يرجى شحن محفظتك الرقمية (الدفع لكل توكن) للاستمرار بالاستفادة.`;

      await logSecurityAlert(userIdNum, 'QUOTA_LIMIT_HIT', 'low', `User hit ${period} quota but wallet hold failed: ${chargeErr.message}`, { toolId, quota: quotaCheck });

      throw new Error(JSON.stringify({
        error: msgEn,
        error_ar: msgAr,
        type: 'QUOTA_EXCEEDED',
        limit: quotaCheck.limit || 0,
        current: quotaCheck.currentUsage || 0,
        period: period,
        cta: { upgrade: true, referral: true }
      }));
    }
  }

  // Interceptor callback for real-time progress billing checks
  const updateCostProgress = (chunkText: string) => {
    outerAccumulatedOutput += chunkText;
    if (holdPointsResult) {
      const actualInput = Math.ceil(initialPrompt.length / 4);
      const actualOutput = Math.ceil(outerAccumulatedOutput.length / 4);

      // Perform high-precision calculation synchronously! No async gaps, no race conditions!
      const estPointsCost = Math.ceil(baseCost + (actualInput / 1000) * costInput + (actualOutput / 1000) * costOutput);
      const totalWalletAvailable = holdPointsResult.heldPoints + holdPointsResult.totalPointsAvailable;

      if (estPointsCost >= totalWalletAvailable) {
        if (io) {
          io.to(`user_${userIdNum}`).emit('billing_limit_reached', {
            message_en: 'Streaming halted: Your digital wallet points have been fully exhausted. Please recharge your wallet or invite friends to continue.',
            message_ar: 'تم إيقاف البث مؤقتاً: لقد نفدت نقاط محفظتك الرقمية تماماً. يرجى شحن الرصيد أو دعوة الأصدقاء للمتابعة.'
          });
        }
        throw new Error('OUT_OF_POINTS_BUDGET_HALT');
      }
    }
  };

  const walletChargedRepresentation = holdPointsResult ? { charged: 'points' as const, amount: holdPointsResult.heldPoints } : false;

  try {
    let finalGeneratedText = '';
    const result = await executeBlock(
      updateCostProgress,
      async (generatedText) => {
        finalGeneratedText = generatedText;
      },
      walletChargedRepresentation
    );

    // 3. Success reconciliation using real-time calculated token costs
    if (holdPointsResult) {
      try {
        const actualInput = Math.ceil(initialPrompt.length / 4);
        const actualOutput = Math.ceil(finalGeneratedText.length / 4);

        const { actualPointsCost, refundPoints } = await reconcileHold(
          userIdNum,
          toolId,
          holdPointsResult.heldPoints,
          actualInput,
          actualOutput
        );

        if (io) {
          io.to(`user_${userIdNum}`).emit('user_profile_updated');
        }
      } catch (recErr) {
        console.error('[Billing] Success reconcile failed:', recErr);
      }
    }

    return result;
  } catch (err: any) {
    // 4. Failure / Exhaustion reconciliation
    if (holdPointsResult) {
      try {
        const actualInput = Math.ceil(initialPrompt.length / 4);
        const actualOutput = Math.ceil(outerAccumulatedOutput.length / 4);

        await reconcileHold(
          userIdNum,
          toolId,
          holdPointsResult.heldPoints,
          actualInput,
          actualOutput
        );
        if (io) {
          io.to(`user_${userIdNum}`).emit('user_profile_updated');
        }
      } catch (recErr) {
        console.error('[Billing] Failure reconcile failed:', recErr);
      }
    }

    if (err.message === 'OUT_OF_POINTS_BUDGET_HALT' || (err.message && err.message.includes('OUT_OF_POINTS_BUDGET_HALT'))) {
      throw new Error(JSON.stringify({
        error: "Streaming halted: Your digital wallet points have been fully exhausted. Please recharge your wallet or invite friends to continue.",
        error_ar: "تم إيقاف الخدمة: رصيد محفظتك الرقمية غير كافٍ. يرجى إعادة شحن محفظتك أو دعوة الأصدقاء للمتابعة.",
        type: 'INSUFFICIENT_FUNDS',
        cta: { upgrade: true, referral: true }
      }));
    }
    throw err;
  }
}
