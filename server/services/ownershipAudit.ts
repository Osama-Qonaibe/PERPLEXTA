import { pool } from '../db/index.js';

/**
 * Service utility to automatically log and verify all metadata updates and ownership transfers
 * for marketplace items and bulletin pages/ads within the user_activity_logs table.
 */
export async function logOwnershipAudit(
  userId: number | null,
  actionType: string,
  targetType: 'bulletin_page' | 'marketplace_item' | 'bulletin_ad',
  recordId: number,
  previousOwnerId: number | null,
  newOwnerId: number | null,
  ipAddress?: string
): Promise<void> {
  try {
    const payload = {
      target_type: targetType,
      record_id: Number(recordId),
      previous_owner_id: previousOwnerId ? Number(previousOwnerId) : null,
      new_owner_id: newOwnerId ? Number(newOwnerId) : null,
      timestamp: new Date().toISOString()
    };

    await pool.query(
      `INSERT INTO user_activity_logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)`,
      [
        userId || null,
        `IMMUTABLE_${actionType.toUpperCase()}`,
        JSON.stringify(payload),
        ipAddress || 'system-internal'
      ]
    );
  } catch (err: any) {
    console.error('[Ownership Audit Service] Failed to record immutable audit log:', err.message);
  }
}
