import './firebase-admin.js';
import { getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { pool } from './db/index.js';

export async function notifyUser(userId: number, title: string, body: string, data?: any) {
    if (!getApps().length) {
        console.log('[PUSH] Firebase Admin not initialized, skipping push.');
        return;
    }
    
    try {
        const result = await pool.query(
            'SELECT token FROM push_tokens WHERE user_id = $1 AND is_active = true',
            [userId]
        );
        
        const tokens = result.rows.map((row: any) => row.token);
        if (tokens.length === 0) return;

        const message = {
            notification: {
                title,
                body
            },
            data: data || {},
            tokens: tokens
        };

        const response = await getMessaging().sendEachForMulticast(message);
        console.log(`[PUSH] Sent to ${tokens.length} devices, success: ${response.successCount}, failure: ${response.failureCount}`);
        
        // Clean up invalid tokens
        if (response.failureCount > 0) {
            const failedTokens: string[] = [];
            response.responses.forEach((resp: any, idx: number) => {
                if (!resp.success) {
                    failedTokens.push(tokens[idx]);
                }
            });
            if (failedTokens.length > 0) {
                await pool.query(
                    'UPDATE push_tokens SET is_active = false WHERE token = ANY($1)',
                    [failedTokens]
                );
            }
        }
    } catch (error) {
        console.error('[PUSH] Failed to send notification:', error);
    }
}

export async function notifyNewMessage(userId: number, senderName: string, content: string, conversationId: string) {
    await notifyUser(
        userId,
        `رسالة جديدة من ${senderName}`,
        content.substring(0, 50) + (content.length > 50 ? '...' : ''),
        { type: 'new_message', conversationId: String(conversationId) }
    );
}

export async function notifyNewFollower(userId: number, followerName: string) {
    await notifyUser(
        userId,
        'متابع جديد',
        `بدأ ${followerName} بمتابعتك.`,
        { type: 'new_follower' }
    );
}

export async function notifyAdBoosted(userId: number, adTitle: string) {
    await notifyUser(
        userId,
        'انتهاء تمويل الإعلان',
        `لقد انتهى تمويل إعلانك "${adTitle}".`,
        { type: 'ad_boosted' }
    );
}
