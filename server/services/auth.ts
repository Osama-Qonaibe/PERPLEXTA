import { pool } from '../db/index.js';

/**
 * Service utility to verify if a user owns or has management rights over a bulletin page.
 */
export async function verifyRecordOwnership(userId: number, recordType: 'bulletin_page', recordId: number): Promise<boolean> {
  if (!userId || !recordId) return false;

  try {
    if (recordType === 'bulletin_page') {
      const res = await pool.query(
        'SELECT id FROM bulletin_pages WHERE id = $1 AND (owner_id = $2 OR user_id = $2)',
        [recordId, userId]
      );
      return (res.rowCount ?? 0) > 0;
    }
  } catch (err: any) {
    console.error(`[Auth Service] Error verifying ${recordType} ownership:`, err.message);
  }
  return false;
}

/**
 * Express middleware factory to protect update/delete routes ensuring the authenticated user is the owner.
 */
export function requireRecordOwnership(recordType: 'bulletin_page', idParamKey = 'id') {
  return async (req: any, res: any, next: any) => {
    const userId = req.user?.id;
    const recordId = parseInt(req.params[idParamKey], 10);

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (isNaN(recordId)) {
      return res.status(400).json({ error: 'Invalid record ID' });
    }

    // Admins can bypass ownership checks
    if (req.user?.role === 'admin') {
      return next();
    }

    const isOwner = await verifyRecordOwnership(userId, recordType, recordId);
    if (!isOwner) {
      return res.status(403).json({ error: 'Access denied: You do not own this record' });
    }

    next();
  };
}
