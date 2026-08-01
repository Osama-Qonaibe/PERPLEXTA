import express from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { pool } from '../db/index.js';
import { authenticateToken, authenticateAdmin } from '../middleware/auth.js';
import { deductFromWallet, adjustWalletBalance, refundToWallet, getEconomySettings } from '../services/wallet.js';
import { getStripe } from '../services/payments.js';
import { pingSearchEngines } from '../services/sitemapPinger.js';

const router = express.Router();

function isSafeUrl(urlStr: string): boolean {
  if (!urlStr) return true;
  const urls = urlStr.split(',').map(u => u.trim()).filter(Boolean);
  for (const singleUrl of urls) {
    try {
      if (singleUrl.startsWith('/') || singleUrl.startsWith('uploads/') || !singleUrl.includes('/')) {
        if (singleUrl.includes('..') || singleUrl.includes('\\')) {
          return false;
        }
        continue;
      }
      if (singleUrl.startsWith('mailto:') || singleUrl.startsWith('tel:')) {
        continue;
      }
      if (!singleUrl.startsWith('http://') && !singleUrl.startsWith('https://')) {
        return false;
      }
      const parsed = new URL(singleUrl);
      const hostname = parsed.hostname.toLowerCase();
      const blockedHosts = [
        'localhost', '127.0.0.1', '0.0.0.0', '169.254.169.254',
        '::1', '::', 'metadata.google.internal'
      ];
      if (blockedHosts.includes(hostname)) {
        return false;
      }
      if (
        hostname.startsWith('10.') ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('172.16.') ||
        hostname.startsWith('172.17.') ||
        hostname.startsWith('172.18.') ||
        hostname.startsWith('172.19.') ||
        hostname.startsWith('172.20.') ||
        hostname.startsWith('172.21.') ||
        hostname.startsWith('172.22.') ||
        hostname.startsWith('172.23.') ||
        hostname.startsWith('172.24.') ||
        hostname.startsWith('172.25.') ||
        hostname.startsWith('172.26.') ||
        hostname.startsWith('172.27.') ||
        hostname.startsWith('172.28.') ||
        hostname.startsWith('172.29.') ||
        hostname.startsWith('172.30.') ||
        hostname.startsWith('172.31.')
      ) {
        return false;
      }
    } catch (err) {
      return false;
    }
  }
  return true;
}

function getLicensePriceMultiplier(license: string): number {
  switch (license) {
    case 'extended': return 2.5;
    case 'gpl': return 1.5;
    case 'plr': return 5.0;
    default: return 1.0;
  }
}

router.get('/items', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1];
    let loggedInUserId: number | null = null;

    if (token) {
      token = token.trim();
      if (token.startsWith('"') && token.endsWith('"')) {
        token = token.slice(1, -1);
      }
      try {
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET || '');
        if (decoded && decoded.id) {
          loggedInUserId = Number(decoded.id);
        }
      } catch (e) {
      }
    }

    let queryText = `
      SELECT m.id, m.user_id, m.title_en, m.title_ar, m.description_en, m.description_ar, 
             m.price, m.category_en, m.category_ar, m.image_url, m.status, m.views, 
             m.contact_link, m.preview_url, m.video_url, m.features, m.technologies,
             m.referral_percent, m.highlight_tag, m.license_type, m.created_at, m.updated_at,
             u.name as seller_name, u.avatar as seller_avatar, u.role as seller_role,
             (SELECT COUNT(*)::int FROM marketplace_purchases p WHERE p.item_id = m.id) as sales_count,
             (SELECT COALESCE(ROUND(AVG(r.rating), 1)::float, 0.0) FROM marketplace_reviews r WHERE r.item_id = m.id) as average_rating,
             (SELECT COUNT(*)::int FROM marketplace_reviews r WHERE r.item_id = m.id) as reviews_count
      FROM marketplace_items m
      JOIN users u ON m.user_id = u.id
      WHERE m.status = 'approved'
    `;
    const params: any[] = [];

    if (loggedInUserId) {
      queryText += ` OR m.user_id = $1 `;
      params.push(loggedInUserId);
    }

    queryText += ` ORDER BY m.created_at DESC `;

    const result = await pool.query(queryText, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Failed to fetch items:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

router.get('/admin/items', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.*, u.name as seller_name, u.avatar as seller_avatar, u.role as seller_role
      FROM marketplace_items m
      JOIN users u ON m.user_id = u.id
      ORDER BY m.created_at DESC
    `);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Failed to fetch admin items:', error);
    res.status(500).json({ error: 'Failed to fetch admin items' });
  }
});

router.get('/items/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE marketplace_items SET views = views + 1 WHERE id = $1', [id]);

    const result = await pool.query(`
      SELECT m.id, m.user_id, m.title_en, m.title_ar, m.description_en, m.description_ar, 
             m.price, m.category_en, m.category_ar, m.image_url, m.status, m.views, 
             m.contact_link, m.preview_url, m.video_url, m.features, m.technologies,
             m.referral_percent, m.highlight_tag, m.license_type, m.created_at, m.updated_at,
             u.name as seller_name, u.avatar as seller_avatar, u.role as seller_role,
             (SELECT COUNT(*)::int FROM marketplace_purchases p WHERE p.item_id = m.id) as sales_count,
             (SELECT COALESCE(ROUND(AVG(r.rating), 1)::float, 0.0) FROM marketplace_reviews r WHERE r.item_id = m.id) as average_rating,
             (SELECT COUNT(*)::int FROM marketplace_reviews r WHERE r.item_id = m.id) as reviews_count
      FROM marketplace_items m
      JOIN users u ON m.user_id = u.id
      WHERE m.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Failed to fetch item details:', error);
    res.status(500).json({ error: 'Failed to fetch item details' });
  }
});

router.post('/items', authenticateToken, async (req: any, res) => {
  const { 
    title_en, title_ar, description_en, description_ar, price, 
    category_en, category_ar, image_url, 
    download_url, preview_url, video_url, features, technologies,
    referral_percent, highlight_tag, license_type
  } = req.body;
  
  const contact_link = null; // Zero-trust: direct seller contact links removed to prevent fraud/illegal assets
  const userId = req.user.id;
  const isUserAdmin = req.user.role === 'admin';
  const status = isUserAdmin ? 'approved' : 'pending';

  if (!title_en || !title_ar || !description_en || !description_ar || price === undefined || !category_en || !category_ar) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const numPrice = Number(price);
  if (isNaN(numPrice) || numPrice < 0) {
    return res.status(400).json({ error: 'Price must be a valid positive number' });
  }

  if (image_url && !isSafeUrl(image_url)) return res.status(400).json({ error: 'Insecure or invalid image URL' });
  if (contact_link && !isSafeUrl(contact_link)) return res.status(400).json({ error: 'Insecure or invalid contact link' });
  if (download_url && !isSafeUrl(download_url)) return res.status(400).json({ error: 'Insecure or invalid download URL' });
  if (preview_url && !isSafeUrl(preview_url)) return res.status(400).json({ error: 'Insecure or invalid preview URL' });
  if (video_url && !isSafeUrl(video_url)) return res.status(400).json({ error: 'Insecure or invalid video URL' });

  let parsedReferralPercent = null;
  if (referral_percent !== undefined && referral_percent !== null && referral_percent !== '') {
    const num = Number(referral_percent);
    if (!isNaN(num) && num >= 0 && num <= 100) {
      parsedReferralPercent = num;
    }
  }

  try {
    if (!isUserAdmin) {
      const subRes = await pool.query(`
        SELECT p.limits 
        FROM users u
        LEFT JOIN subscriptions s ON u.id = s.user_id
        LEFT JOIN plans p ON s.plan_id = p.id
        WHERE u.id = $1
      `, [userId]);

      const rawLimits = subRes.rows[0]?.limits;
      const planLimits = typeof rawLimits === 'object' && rawLimits !== null ? rawLimits : (typeof rawLimits === 'string' ? JSON.parse(rawLimits || '{}') : {});
      const maxListings = planLimits['marketplace_listings'];
      let limitVal: number | null = null;
      
      if (typeof maxListings === 'object' && maxListings !== null) {
        const rawVal = maxListings.monthly !== undefined ? maxListings.monthly : maxListings.daily;
        if (rawVal !== 'unlimited' && rawVal !== undefined && rawVal !== null) {
          limitVal = parseInt(rawVal, 10);
        }
      } else if (maxListings !== undefined && maxListings !== null && maxListings !== 'unlimited') {
        limitVal = parseInt(maxListings, 10);
      } else if (maxListings === undefined || maxListings === null) {
        limitVal = 0; // If they have no active plan, list limit is 0
      }

      if (limitVal !== null) {
        const countRes = await pool.query('SELECT COUNT(*) FROM marketplace_items WHERE user_id = $1', [userId]);
        const currentListingCount = parseInt(countRes.rows[0].count, 10);
        
        if (currentListingCount >= limitVal) {
          return res.status(402).json({
            error: 'Marketplace listing quota exceeded',
            message: `Your current subscription plan only allows listing up to ${limitVal} products simultaneously on the marketplace. Please upgrade your subscription plan to publish more assets.`,
            message_ar: `تسمح خطة اشتراكك الحالية بنشر ما يصل إلى ${limitVal} من المنتجات كحد أقصى في السوق في نفس الوقت. يرجى ترقية اشتراكك لتتمكن من نشر المزيد.`
          });
        }
      }
    }

    const result = await pool.query(`
      INSERT INTO marketplace_items (
        user_id, title_en, title_ar, description_en, description_ar, price, category_en, category_ar, 
        image_url, contact_link, status, download_url, preview_url, video_url, features, technologies,
        referral_percent, highlight_tag, license_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *
    `, [
      userId, title_en, title_ar, description_en, description_ar, numPrice, category_en, category_ar, 
      image_url, contact_link, status, download_url, preview_url, video_url, features, technologies,
      parsedReferralPercent, highlight_tag || null, license_type || null
    ]);

    const newItem = result.rows[0];

    setImmediate(async () => {
      try {
        await pingSearchEngines(req);
      } catch (err) {
        console.error('[Marketplace Sitemap Ping] Failed:', err);
      }
    });

    res.status(201).json({ success: true, item: newItem });
  } catch (error: any) {
    console.error('Failed to create item:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

router.patch('/items/:id', authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  const { 
    title_en, title_ar, description_en, description_ar, price, 
    category_en, category_ar, image_url, status,
    download_url, preview_url, video_url, features, technologies,
    referral_percent, highlight_tag, license_type
  } = req.body;
  
  const contact_link = null; // Zero-trust: direct seller contact links removed to prevent fraud/illegal assets
  const userId = req.user.id;
  const isUserAdmin = req.user.role === 'admin';

  try {
    const checkRes = await pool.query('SELECT user_id, status FROM marketplace_items WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const item = checkRes.rows[0];
    if (item.user_id !== userId && !isUserAdmin) {
      return res.status(403).json({ error: 'Forbidden: You do not own this item' });
    }

    const ALLOWED_STATUSES = ['pending', 'approved', 'rejected', 'sold'];
    if (status !== undefined && !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(', ')}` });
    }

    let finalPrice = undefined;
    if (price !== undefined) {
      finalPrice = Number(price);
      if (isNaN(finalPrice) || finalPrice < 0) {
        return res.status(400).json({ error: 'Price must be a valid positive number' });
      }
    }

    if (image_url && !isSafeUrl(image_url)) return res.status(400).json({ error: 'Insecure or invalid image URL' });
    if (contact_link && !isSafeUrl(contact_link)) return res.status(400).json({ error: 'Insecure or invalid contact link' });
    if (download_url && !isSafeUrl(download_url)) return res.status(400).json({ error: 'Insecure or invalid download URL' });
    if (preview_url && !isSafeUrl(preview_url)) return res.status(400).json({ error: 'Insecure or invalid preview URL' });
    if (video_url && !isSafeUrl(video_url)) return res.status(400).json({ error: 'Insecure or invalid video URL' });

    let finalStatus = item.status;
    if (status !== undefined) {
      if (isUserAdmin) {
        finalStatus = status;
      } else {
        if (status === 'sold') {
          finalStatus = 'sold';
        } else if (status === 'approved' && item.status === 'sold') {
          finalStatus = 'approved';
        }
      }
    }

    let parsedReferralPercent = undefined;
    if (referral_percent !== undefined) {
      if (referral_percent === null || referral_percent === '') {
        parsedReferralPercent = null;
      } else {
        const num = Number(referral_percent);
        if (!isNaN(num) && num >= 0 && num <= 100) {
          parsedReferralPercent = num;
        }
      }
    }

    const result = await pool.query(`
      UPDATE marketplace_items
      SET title_en = COALESCE($1, title_en),
          title_ar = COALESCE($2, title_ar),
          description_en = COALESCE($3, description_en),
          description_ar = COALESCE($4, description_ar),
          price = COALESCE($5, price),
          category_en = COALESCE($6, category_en),
          category_ar = COALESCE($7, category_ar),
          image_url = COALESCE($8, image_url),
          contact_link = COALESCE($9, contact_link),
          status = $10,
          download_url = COALESCE($11, download_url),
          preview_url = COALESCE($12, preview_url),
          video_url = COALESCE($13, video_url),
          features = COALESCE($14, features),
          technologies = COALESCE($15, technologies),
          referral_percent = COALESCE($16, referral_percent),
          highlight_tag = CASE WHEN $17 THEN $18 ELSE highlight_tag END,
          license_type = CASE WHEN $19 THEN $20 ELSE license_type END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $21
      RETURNING *
    `, [
      title_en, title_ar, description_en, description_ar, finalPrice !== undefined ? finalPrice : null, 
      category_en, category_ar, image_url, contact_link, finalStatus, 
      download_url, preview_url, video_url, features, technologies,
      parsedReferralPercent !== undefined ? parsedReferralPercent : null,
      highlight_tag !== undefined, highlight_tag || null,
      license_type !== undefined, license_type || null,
      id
    ]);

    res.json({ success: true, item: result.rows[0] });
  } catch (error: any) {
    console.error('Failed to update item:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

router.patch('/admin/items/:id/status', authenticateToken, authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  const ALLOWED_STATUSES = ['pending', 'approved', 'rejected', 'sold'];
  if (!ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(', ')}` });
  }

  try {
    const result = await pool.query(`
      UPDATE marketplace_items
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ success: true, item: result.rows[0] });
  } catch (error: any) {
    console.error('Failed to update status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

router.delete('/items/:id', authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const isUserAdmin = req.user.role === 'admin';

  try {
    const checkRes = await pool.query('SELECT user_id FROM marketplace_items WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const item = checkRes.rows[0];
    if (item.user_id !== userId && !isUserAdmin) {
      return res.status(403).json({ error: 'Forbidden: You do not own this item' });
    }

    await pool.query('DELETE FROM marketplace_items WHERE id = $1', [id]);
    res.json({ success: true, message: 'Item deleted successfully' });
  } catch (error: any) {
    console.error('Failed to delete item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

router.post('/buy', authenticateToken, async (req: any, res) => {
  const { itemId, licenseType, referralCode } = req.body;
  const userId = req.user.id;

  if (!itemId) {
    return res.status(400).json({ error: 'Item ID is required' });
  }

  const lic = licenseType || 'standard';

  try {
    const itemRes = await pool.query('SELECT * FROM marketplace_items WHERE id = $1', [itemId]);
    if (itemRes.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const item = itemRes.rows[0];
    if (item.status !== 'approved') {
      return res.status(400).json({ error: 'This item is currently unavailable for acquisition.' });
    }

    const dupCheck = await pool.query(
      'SELECT id FROM marketplace_purchases WHERE user_id = $1 AND item_id = $2 AND license_type = $3',
      [userId, itemId, lic]
    );
    if (dupCheck.rows.length > 0) {
      return res.status(400).json({ error: 'You already acquired this product/license.' });
    }

    const multiplier = getLicensePriceMultiplier(lic);
    const finalPrice = Math.round(Number(item.price) * multiplier * 100) / 100;

    const transactionDesc = `Acquisition of ${item.title_en} (${lic.toUpperCase()})`;
    await deductFromWallet(userId, finalPrice, 'marketplace_purchase', transactionDesc);

    let referrerId: number | null = null;
    let commissionPaid = 0.00;

    if (referralCode && referralCode.trim()) {
      const referrerRes = await pool.query(
        'SELECT id FROM users WHERE referral_code = $1 AND id != $2', 
        [referralCode.trim(), userId]
      );
      if (referrerRes.rows.length > 0) {
        referrerId = referrerRes.rows[0].id;

        let commPercentage = 20;
        if (item.referral_percent !== null && item.referral_percent !== undefined) {
          commPercentage = Number(item.referral_percent);
        } else {
          try {
            const ecoSettings = await getEconomySettings();
            if (ecoSettings && ecoSettings.referral_bonus_percent) {
              commPercentage = ecoSettings.referral_bonus_percent;
            }
          } catch (e) {
            console.warn('Failed to fetch commission percentage, using 20% fallback:', e);
          }
        }

        commissionPaid = Math.round((finalPrice * (commPercentage / 100)) * 100) / 100;
        
        if (commissionPaid > 0 && referrerId) {
          const referralDesc = `Affiliate commission for referring ${item.title_en}`;
          await adjustWalletBalance(referrerId, commissionPaid, 'credit', referralDesc, 'balance');
        }
      }
    }

    const secureToken = crypto.randomBytes(32).toString('hex');
    const purchaseRes = await pool.query(`
      INSERT INTO marketplace_purchases (
        user_id, item_id, price_paid, license_type, referrer_id, commission_paid, download_token
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [userId, itemId, finalPrice, lic, referrerId, commissionPaid, secureToken]);

    if (item.user_id && Number(item.user_id) !== Number(userId)) {
      const sellerProceeds = Math.max(0, Math.round((finalPrice - commissionPaid) * 100) / 100);
      if (sellerProceeds > 0) {
        const desc = `Sale proceeds of ${item.title_en} (${lic.toUpperCase()})`;
        await refundToWallet(item.user_id, sellerProceeds, 'marketplace_sale', desc);
        await notifySellerOfSale(item, lic, finalPrice, commissionPaid, userId);
      }
    }

    res.json({
      success: true,
      message: 'Product purchase finalized successfully',
      purchase: purchaseRes.rows[0],
      downloadToken: secureToken
    });

  } catch (error: any) {
    console.error('Secure checkout failed:', error);
    res.status(500).json({ error: error.message || 'Secured payment routing failed.' });
  }
});

router.get('/portfolio', authenticateToken, async (req: any, res) => {
  const userId = req.user.id;
  try {
    const result = await pool.query(`
      SELECT p.id as purchase_id, p.price_paid, p.license_type, p.download_token, p.created_at as purchased_at,
             m.id as item_id, m.title_en, m.title_ar, m.description_en, m.description_ar, m.category_en, m.category_ar,
             m.image_url, m.download_url, m.preview_url, m.video_url, m.contact_link,
             u.name as seller_name, u.avatar as seller_avatar
      FROM marketplace_purchases p
      JOIN marketplace_items m ON p.item_id = m.id
      JOIN users u ON m.user_id = u.id
      WHERE p.user_id = $1
      ORDER BY p.created_at DESC
    `, [userId]);

    res.json(result.rows);
  } catch (error: any) {
    console.error('Failed to retrieve product portfolio:', error);
    res.status(500).json({ error: 'Failed to retrieve portfolio.' });
  }
});

router.get('/affiliate/stats', authenticateToken, async (req: any, res) => {
  const userId = req.user.id;
  try {
    const statRes = await pool.query(`
      SELECT COALESCE(SUM(commission_paid), 0) as total_earned,
             COUNT(*) as total_referral_sales
      FROM marketplace_purchases
      WHERE referrer_id = $1
    `, [userId]);

    const referralList = await pool.query(`
      SELECT p.id as purchase_id, p.price_paid, p.license_type, p.commission_paid, p.created_at as sold_at,
             m.title_en, m.title_ar, m.category_en, m.category_ar, m.image_url
      FROM marketplace_purchases p
      JOIN marketplace_items m ON p.item_id = m.id
      WHERE p.referrer_id = $1
      ORDER BY p.created_at DESC
    `, [userId]);

    res.json({
      summary: statRes.rows[0],
      sales: referralList.rows
    });
  } catch (error: any) {
    console.error('Failed to retrieve referral parameters:', error);
    res.status(500).json({ error: 'Failed to retrieve referral statistics.' });
  }
});

async function notifySellerOfSale(item: any, lic: string, finalPrice: number, commissionPaid: number, buyerId: number | string) {
  if (item.user_id && Number(item.user_id) !== Number(buyerId)) {
    const sellerProceeds = Math.max(0, Math.round((finalPrice - commissionPaid) * 100) / 100);
    if (sellerProceeds > 0) {
      try {
        const { createNotification } = await import('../services/notifications.js');
        await createNotification(
          Number(item.user_id),
          'success',
          'Your Product was Sold!',
          'تم بيع منتجك بنجاح!',
          `Congratulations! Your listed asset "${item.title_en}" was purchased by another user. $${sellerProceeds} has been credited to your wallet balance.`,
          `تهانينا! تم شراء منتجك المعروض "${item.title_ar || item.title_en}" من قِبل مستخدم آخر. تم إيداع $${sellerProceeds} في رصيد محفظتك.`
        );
      } catch (nErr) {
        console.warn('Failed to notify seller in notifySellerOfSale:', nErr);
      }

      try {
        const sellerUserRes = await pool.query('SELECT name, email FROM users WHERE id = $1', [item.user_id]);
        if (sellerUserRes.rows.length > 0) {
          const sellerUser = sellerUserRes.rows[0];
          const { sendEmail } = await import('../services/email.js');
          const subject = `🎉 Congratulations! Your Listed Asset Was Sold - Perplexta`;
          const html = `
            <div style="font-family: sans-serif; padding: 20px; color: #111; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px;">
              <h2 style="color: #10B981; border-bottom: 2px solid #10B981; padding-bottom: 10px;">Great News, ${sellerUser.name}!</h2>
              <p>Your listed asset <strong>"${item.title_en}"</strong> has been purchased under the <strong>${lic.toUpperCase()}</strong> license.</p>
              <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Product:</strong> ${item.title_en}</p>
                <p style="margin: 5px 0;"><strong>License Option:</strong> ${lic.toUpperCase()}</p>
                <p style="margin: 5px 0;"><strong>Your Sale Proceeds:</strong> $${sellerProceeds}</p>
              </div>
              <p>The funds of <strong>$${sellerProceeds}</strong> have been credited directly to your secure platform wallet.</p>
              <p>Keep listing premium assets of high compliance on the platform to earn more!</p>
              <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
              <p style="font-size: 11px; color: #9ca3af; text-align: center;">This is an automated transaction notification from Perplexta Secure Server.</p>
            </div>
          `;
          await sendEmail(sellerUser.email, subject, html);
          console.log(`[Email Sent] Successfully notified seller of sale: ${sellerUser.email}`);
        }
      } catch (mailErr) {
        console.error('Failed to send sales email notification to seller:', mailErr);
      }
    }
  }
}

export async function fulfillMarketplacePurchase(
  userId: number | string,
  itemId: number | string,
  licenseType: string,
  referralCode: string | null,
  pricePaid: number
) {
  const lic = licenseType || 'standard';

  const dupCheck = await pool.query(
    'SELECT id FROM marketplace_purchases WHERE user_id = $1 AND item_id = $2 AND license_type = $3',
    [userId, itemId, lic]
  );
  if (dupCheck.rows.length > 0) {
    return dupCheck.rows[0];
  }

  const itemRes = await pool.query('SELECT * FROM marketplace_items WHERE id = $1', [itemId]);
  if (itemRes.rows.length === 0) {
    throw new Error('Item not found');
  }
  const item = itemRes.rows[0];

  let referrerId: number | null = null;
  let commissionPaid = 0.00;

  if (referralCode && referralCode.trim()) {
    const referrerRes = await pool.query(
      'SELECT id FROM users WHERE referral_code = $1 AND id != $2', 
      [referralCode.trim(), userId]
    );
    if (referrerRes.rows.length > 0) {
      referrerId = referrerRes.rows[0].id;

      let commPercentage = 20;
      if (item.referral_percent !== null && item.referral_percent !== undefined) {
        commPercentage = Number(item.referral_percent);
      } else {
        try {
          const ecoSettings = await getEconomySettings();
          if (ecoSettings && ecoSettings.referral_bonus_percent) {
            commPercentage = ecoSettings.referral_bonus_percent;
          }
        } catch (e) {
          console.warn('Failed to fetch commission percentage, using 20% fallback:', e);
        }
      }

      commissionPaid = Math.round((pricePaid * (commPercentage / 100)) * 100) / 100;
      
      if (commissionPaid > 0 && referrerId) {
        const referralDesc = `Affiliate commission for referring ${item.title_en}`;
        await adjustWalletBalance(referrerId, commissionPaid, 'credit', referralDesc, 'balance');
      }
    }
  }

  const secureToken = crypto.randomBytes(32).toString('hex');
  const purchaseRes = await pool.query(`
    INSERT INTO marketplace_purchases (
      user_id, item_id, price_paid, license_type, referrer_id, commission_paid, download_token
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [userId, itemId, pricePaid, lic, referrerId, commissionPaid, secureToken]);

  if (item.user_id && Number(item.user_id) !== Number(userId)) {
    const sellerProceeds = Math.max(0, Math.round((pricePaid - commissionPaid) * 100) / 100);
    if (sellerProceeds > 0) {
      const desc = `Sale proceeds of ${item.title_en} (${lic.toUpperCase()}) (Stripe Checkout)`;
      await refundToWallet(item.user_id, sellerProceeds, 'marketplace_sale', desc);
      await notifySellerOfSale(item, lic, pricePaid, commissionPaid, userId);
    }
  }

  try {
    const { createNotification } = await import('../services/notifications.js');
    await createNotification(
      Number(userId),
      'success',
      'Asset Purchased Successfully',
      'تم شراء المنتج بنجاح',
      `You have successfully unlocked ${item.title_en} (${lic.toUpperCase()}) on our marketplace. You can now access full lifetime download links.`,
      `لقد قمت بإلغاء قفل ${item.title_ar || item.title_en} (${lic.toUpperCase()}) في المتجر الخاص بنا بنجاح. يمكنك القيام بالتحميل الآن.`
    );

    if (referrerId) {
      await createNotification(
        referrerId,
        'info',
        'Affiliate Referral Commission!',
        'عمولة تسويق جديدة!',
        `You have received $${commissionPaid} as an affiliate commission for referring the acquisition of ${item.title_en}.`,
        `لقد استلمت عمولة قدرها $${commissionPaid} كتسويق بالعمولة لقاء إحالة شراء ${item.title_ar || item.title_en}.`
      );
    }
  } catch (notificationErr) {
    console.warn('Notification processing failed during fulfillment:', notificationErr);
  }

  return purchaseRes.rows[0];
}

router.post('/create-stripe-session', authenticateToken, async (req: any, res) => {
  const { itemId, licenseType, referralCode } = req.body;
  const userId = req.user.id;

  if (!itemId) {
    return res.status(400).json({ error: 'Item ID is required' });
  }

  const lic = licenseType || 'standard';

  try {
    const stripe = await getStripe();
    if (!stripe) {
      return res.status(400).json({ error: 'Stripe Payment Gateway is not configured on this platform.' });
    }

    const itemRes = await pool.query('SELECT * FROM marketplace_items WHERE id = $1', [itemId]);
    if (itemRes.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const item = itemRes.rows[0];
    if (item.status !== 'approved') {
      return res.status(400).json({ error: 'This item is currently unavailable for acquisition.' });
    }

    const dupCheck = await pool.query(
      'SELECT id FROM marketplace_purchases WHERE user_id = $1 AND item_id = $2 AND license_type = $3',
      [userId, itemId, lic]
    );
    if (dupCheck.rows.length > 0) {
      return res.status(400).json({ error: 'You already acquired this product/license.' });
    }

    const multiplier = getLicensePriceMultiplier(lic);
    const finalPrice = Math.round(Number(item.price) * multiplier * 100) / 100;

    if (finalPrice < 0.50) {
      return res.status(400).json({ error: 'Minimum payment amount is $0.50 USD. Please use the balance option for lower prices.' });
    }

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${item.title_en} (${lic.toUpperCase()} License)`,
            description: item.description_en || 'Digital Marketplace Asset',
            images: item.image_url ? [item.image_url] : [],
          },
          unit_amount: Math.round(finalPrice * 100), // Stripe takes cents
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${appUrl}/settings?tab=marketplace_purchases&status=stripe_success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/marketplace`,
      metadata: {
        type: 'marketplace_purchase',
        userId: userId.toString(),
        itemId: itemId.toString(),
        licenseType: lic,
        referralCode: referralCode || '',
        pricePaid: finalPrice.toString()
      }
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe marketplace session creation failed:', error);
    res.status(500).json({ error: error.message || 'Payment initiation failed.' });
  }
});

router.post('/cart/buy', authenticateToken, async (req: any, res) => {
  const { items, referralCode } = req.body;
  const userId = req.user.id;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Cart items are required and must be an array.' });
  }

  try {
    const cartDetails: Array<{ item: any, lic: string, finalPrice: number }> = [];
    let totalPrice = 0;

    for (const cartItem of items) {
      const { itemId, licenseType } = cartItem;
      if (!itemId) {
        return res.status(400).json({ error: 'Item ID is required for each cart item.' });
      }
      const lic = licenseType || 'standard';

      const itemRes = await pool.query('SELECT * FROM marketplace_items WHERE id = $1', [itemId]);
      if (itemRes.rows.length === 0) {
        return res.status(404).json({ error: `Marketplace item with ID ${itemId} not found.` });
      }

      const item = itemRes.rows[0];
      if (item.status !== 'approved') {
        return res.status(400).json({ error: `Item "${item.title_en}" is currently unavailable.` });
      }

      const dupCheck = await pool.query(
        'SELECT id FROM marketplace_purchases WHERE user_id = $1 AND item_id = $2 AND license_type = $3',
        [userId, itemId, lic]
      );
      if (dupCheck.rows.length > 0) {
        return res.status(400).json({ error: `You have already acquired "${item.title_en}" under the ${lic.toUpperCase()} license.` });
      }

      const multiplier = getLicensePriceMultiplier(lic);
      const finalPrice = Math.round(Number(item.price) * multiplier * 100) / 100;

      cartDetails.push({ item, lic, finalPrice });
      totalPrice += finalPrice;
    }

    const transactionDesc = `Cart acquisition of ${items.length} item(s)`;
    await deductFromWallet(userId, totalPrice, 'marketplace_purchase', transactionDesc);

    const purchases: any[] = [];
    for (const entry of cartDetails) {
      const { item, lic, finalPrice } = entry;

      let referrerId: number | null = null;
      let commissionPaid = 0.00;

      if (referralCode && referralCode.trim()) {
        const referrerRes = await pool.query(
          'SELECT id FROM users WHERE referral_code = $1 AND id != $2', 
          [referralCode.trim(), userId]
        );
        if (referrerRes.rows.length > 0) {
          referrerId = referrerRes.rows[0].id;

          let commPercentage = 20;
          if (item.referral_percent !== null && item.referral_percent !== undefined) {
            commPercentage = Number(item.referral_percent);
          } else {
            try {
              const ecoSettings = await getEconomySettings();
              if (ecoSettings && ecoSettings.referral_bonus_percent) {
                commPercentage = ecoSettings.referral_bonus_percent;
              }
            } catch (e) {
              console.warn('Failed to fetch commission percent:', e);
            }
          }

          commissionPaid = Math.round((finalPrice * (commPercentage / 100)) * 100) / 100;
          if (commissionPaid > 0 && referrerId) {
            const referralDesc = `Affiliate commission for referring ${item.title_en}`;
            await adjustWalletBalance(referrerId, commissionPaid, 'credit', referralDesc, 'balance');
          }
        }
      }

      const secureToken = crypto.randomBytes(32).toString('hex');
      const purchaseRes = await pool.query(`
        INSERT INTO marketplace_purchases (
          user_id, item_id, price_paid, license_type, referrer_id, commission_paid, download_token
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [userId, item.id, finalPrice, lic, referrerId, commissionPaid, secureToken]);

      purchases.push(purchaseRes.rows[0]);

      if (item.user_id && Number(item.user_id) !== Number(userId)) {
        const sellerProceeds = Math.max(0, Math.round((finalPrice - commissionPaid) * 100) / 100);
        if (sellerProceeds > 0) {
          const desc = `Sale proceeds of ${item.title_en} (${lic.toUpperCase()}) (Cart Purchase)`;
          await refundToWallet(item.user_id, sellerProceeds, 'marketplace_sale', desc);

          try {
            const { createNotification } = await import('../services/notifications.js');
            await createNotification(
              Number(item.user_id),
              'success',
              'Your Product was Sold!',
              'تم بيع منتجك بنجاح!',
              `Congratulations! Your listed asset "${item.title_en}" was purchased by another user. $${sellerProceeds} has been credited to your wallet balance.`,
              `تهانينا! تم شراء منتجك المعروض "${item.title_ar || item.title_en}" من قِبل مستخدم آخر. تم إيداع $${sellerProceeds} في رصيد محفظتك.`
            );
          } catch (nErr) {
            console.warn('Failed to notify seller in cart /buy:', nErr);
          }
        }
      }

      try {
        const { createNotification } = await import('../services/notifications.js');
        await createNotification(
          Number(userId),
          'success',
          'Asset Purchased Successfully',
          'تم شراء المنتج بنجاح',
          `You have successfully unlocked ${item.title_en} (${lic.toUpperCase()}) on our marketplace. You can now access full lifetime download links.`,
          `لقد قمت بإلغاء قفل ${item.title_ar || item.title_en} (${lic.toUpperCase()}) في المتجر الخاص بنا بنجاح. يمكنك القيام بالتحميل الآن.`
        );

        if (referrerId) {
          await createNotification(
            referrerId,
            'info',
            'Affiliate Referral Commission!',
            'عمولة تسويق جديدة!',
            `You have received $${commissionPaid} as an affiliate commission for referring the acquisition of ${item.title_en}.`,
            `لقد استلمت عمولة قدرها $${commissionPaid} كتسويق بالعمولة لقاء إحالة شراء ${item.title_ar || item.title_en}.`
          );
        }
      } catch (nErr) {
        console.warn('Notification failure during cart buy:', nErr);
      }
    }

    res.json({
      success: true,
      message: 'Cart items purchased successfully',
      purchases
    });

  } catch (error: any) {
    console.error('Cart checkout failed:', error);
    res.status(500).json({ error: error.message || 'Cart payment processing failed.' });
  }
});

router.post('/cart/create-stripe-session', authenticateToken, async (req: any, res) => {
  const { items, referralCode } = req.body;
  const userId = req.user.id;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Cart items are required and must be an array.' });
  }

  try {
    const stripe = await getStripe();
    if (!stripe) {
      return res.status(400).json({ error: 'Stripe Payment Gateway is not configured on this server.' });
    }

    const lineItems: any[] = [];
    const cartDetails: string[] = [];
    let totalCartPrice = 0;

    for (const cartItem of items) {
      const { itemId, licenseType } = cartItem;
      if (!itemId) {
        return res.status(400).json({ error: 'Item ID is required for each cart item.' });
      }
      const lic = licenseType || 'standard';

      const itemRes = await pool.query('SELECT * FROM marketplace_items WHERE id = $1', [itemId]);
      if (itemRes.rows.length === 0) {
        return res.status(404).json({ error: `Marketplace item with ID ${itemId} not found.` });
      }

      const item = itemRes.rows[0];
      if (item.status !== 'approved') {
        return res.status(400).json({ error: `Item "${item.title_en}" is currently unavailable.` });
      }

      const dupCheck = await pool.query(
        'SELECT id FROM marketplace_purchases WHERE user_id = $1 AND item_id = $2 AND license_type = $3',
        [userId, itemId, lic]
      );
      if (dupCheck.rows.length > 0) {
        return res.status(400).json({ error: `You have already acquired "${item.title_en}" under the ${lic.toUpperCase()} license.` });
      }

      const multiplier = getLicensePriceMultiplier(lic);
      const finalPrice = Math.round(Number(item.price) * multiplier * 100) / 100;
      totalCartPrice += finalPrice;

      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${item.title_en} (${lic.toUpperCase()} License)`,
            description: item.description_en || 'Digital Marketplace Asset',
            images: item.image_url ? [item.image_url] : [],
          },
          unit_amount: Math.round(finalPrice * 100),
        },
        quantity: 1,
      });

      cartDetails.push(`${itemId}:${lic}`);
    }

    if (totalCartPrice < 0.50) {
      return res.status(400).json({ error: 'Minimum payment amount is $0.50 USD. Please use the balance option.' });
    }

    const cartItemsStr = cartDetails.join(',');
    const appUrl = process.env.APP_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${appUrl}/settings?tab=marketplace_purchases&status=stripe_success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/marketplace`,
      metadata: {
        type: 'marketplace_cart_purchase',
        userId: userId.toString(),
        cart_items: cartItemsStr,
        referralCode: referralCode || '',
        pricePaid: totalCartPrice.toString()
      }
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe marketplace cart session creation failed:', error);
    res.status(500).json({ error: error.message || 'Payment initiation failed.' });
  }
});

router.get('/verify-checkout-session', authenticateToken, async (req: any, res) => {
  const { session_id } = req.query;
  if (!session_id) {
    return res.status(400).json({ error: 'Session ID is required.' });
  }

  try {
    const stripe = await getStripe();
    if (!stripe) {
      return res.status(400).json({ error: 'Payment gateway configuration is missing.' });
    }

    const session = await stripe.checkout.sessions.retrieve(session_id.toString());
    if (!session || session.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Session is unpaid or invalid.' });
    }

    const { type, userId, itemId, licenseType, referralCode, pricePaid, cart_items } = session.metadata || {};
    
    if (userId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ error: 'Forbidden: Session belongs to a different user' });
    }

    if (type === 'marketplace_cart_purchase' && cart_items) {
      const itemsList = cart_items.split(',');
      const purchases = [];

      for (const rawItem of itemsList) {
        const [currItemId, currLic] = rawItem.split(':');
        
        const itemRes = await pool.query('SELECT price FROM marketplace_items WHERE id = $1', [currItemId]);
        let priceToPass = 0;
        if (itemRes.rows.length > 0) {
          const multiplier = getLicensePriceMultiplier(currLic);
          priceToPass = Math.round(Number(itemRes.rows[0].price) * multiplier * 100) / 100;
        }

        const purchase = await fulfillMarketplacePurchase(
          userId,
          currItemId,
          currLic || 'standard',
          referralCode || null,
          priceToPass
        );
        purchases.push(purchase);
      }

      return res.json({ success: true, purchases });
    } else if (type === 'marketplace_purchase' && itemId) {
      const price = Number(pricePaid || 0);

      const purchase = await fulfillMarketplacePurchase(
        userId,
        itemId,
        licenseType || 'standard',
        referralCode || null,
        price
      );

      return res.json({ success: true, purchase });
    } else {
      return res.status(400).json({ error: 'Invalid session metadata.' });
    }
  } catch (error: any) {
    console.error('Stripe check verification failed:', error);
    res.status(500).json({ error: error.message || 'Payment verification failed.' });
  }
});


router.post('/items/:id/reviews', authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { rating, comment } = req.body;

  const rNum = Number(rating);
  if (isNaN(rNum) || rNum < 1 || rNum > 5 || !Number.isInteger(rNum)) {
    return res.status(400).json({ error: 'Rating must be an integer between 1 and 5.' });
  }

  try {
    const itemCheck = await pool.query('SELECT id FROM marketplace_items WHERE id = $1', [id]);
    if (itemCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Marketplace item not found.' });
    }

    const query = `
      INSERT INTO marketplace_reviews (user_id, item_id, rating, comment, updated_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, item_id) 
      DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    const result = await pool.query(query, [userId, id, rNum, comment || '']);
    res.json({ success: true, review: result.rows[0] });
  } catch (error: any) {
    console.error('Failed to submit marketplace review:', error);
    res.status(500).json({ error: 'Failed to submit review.' });
  }
});

router.get('/items/:id/reviews', async (req, res) => {
  const { id } = req.params;
  try {
    const reviewsRes = await pool.query(`
      SELECT r.*, u.name as reviewer_name, u.avatar as reviewer_avatar,
             EXISTS(SELECT 1 FROM marketplace_purchases p WHERE p.user_id = r.user_id AND p.item_id = r.item_id) as is_verified_buyer
      FROM marketplace_reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.item_id = $1
      ORDER BY r.created_at DESC
    `, [id]);

    const statsRes = await pool.query(`
      SELECT COUNT(*)::int as total_reviews,
             COALESCE(ROUND(AVG(rating), 1)::float, 0.0) as average_rating
      FROM marketplace_reviews
      WHERE item_id = $1
    `, [id]);

    res.json({
      reviews: reviewsRes.rows,
      stats: statsRes.rows[0] || { total_reviews: 0, average_rating: 0.0 }
    });
  } catch (error: any) {
    console.error('Failed to retrieve reviews:', error);
    res.status(500).json({ error: 'Failed to retrieve reviews.' });
  }
});


router.get('/seller/:sellerId', async (req, res) => {
  const { sellerId } = req.params;
  try {
    const sellerRes = await pool.query('SELECT id, name, avatar, role, created_at FROM users WHERE id = $1', [sellerId]);
    if (sellerRes.rows.length === 0) {
      return res.status(404).json({ error: 'Seller profile not found.' });
    }

    const itemsRes = await pool.query(`
      SELECT m.*, u.name as seller_name, u.avatar as seller_avatar,
             (SELECT COUNT(*)::int FROM marketplace_purchases p WHERE p.item_id = m.id) as sales_count,
             (SELECT COALESCE(ROUND(AVG(r.rating), 1)::float, 0.0) FROM marketplace_reviews r WHERE r.item_id = m.id) as average_rating,
             (SELECT COUNT(*)::int FROM marketplace_reviews r WHERE r.item_id = m.id) as reviews_count
      FROM marketplace_items m
      JOIN users u ON m.user_id = u.id
      WHERE m.user_id = $1 AND m.status = 'approved'
      ORDER BY m.created_at DESC
    `, [sellerId]);

    const ratingRes = await pool.query(`
      SELECT COALESCE(ROUND(AVG(r.rating), 1)::float, 0.0) as avg_rating,
             COUNT(r.id)::int as total_reviews
      FROM marketplace_reviews r
      JOIN marketplace_items m ON r.item_id = m.id
      WHERE m.user_id = $1
    `, [sellerId]);

    res.json({
      seller: sellerRes.rows[0],
      items: itemsRes.rows,
      stats: ratingRes.rows[0]
    });
  } catch (error: any) {
    console.error('Failed to fetch seller profile:', error);
    res.status(500).json({ error: 'Failed to fetch seller profile.' });
  }
});

router.get('/seller-dashboard/stats', authenticateToken, async (req: any, res) => {
  const sellerId = req.user.id;
  try {
    const salesStatRes = await pool.query(`
      SELECT COUNT(*)::int as total_sales_count,
             COALESCE(SUM(price_paid * 0.8), 0.0)::float as total_estimated_revenue
      FROM marketplace_purchases p
      JOIN marketplace_items m ON p.item_id = m.id
      WHERE m.user_id = $1
    `, [sellerId]);

    const salesRes = await pool.query(`
      SELECT p.id as purchase_id, p.price_paid, p.license_type, p.created_at as sold_at,
             m.title_en, m.title_ar, m.price as base_price,
             u.name as buyer_name, u.avatar as buyer_avatar
      FROM marketplace_purchases p
      JOIN marketplace_items m ON p.item_id = m.id
      JOIN users u ON p.user_id = u.id
      WHERE m.user_id = $1
      ORDER BY p.created_at DESC
    `, [sellerId]);

    res.json({
      summary: salesStatRes.rows[0],
      sales: salesRes.rows
    });
  } catch (error: any) {
    console.error('Failed to retrieve seller sales dashboard:', error);
    res.status(500).json({ error: 'Failed to retrieve sales history.' });
  }
});


async function seedDefaultItems() {
  try {
    const adminRes = await pool.query("SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1");
    let authorId = adminRes.rows.length > 0 ? adminRes.rows[0].id : null;
    if (!authorId) {
      const userRes = await pool.query("SELECT id FROM users ORDER BY id ASC LIMIT 1");
      if (userRes.rows.length > 0) {
        authorId = userRes.rows[0].id;
      }
    }
    if (!authorId) return;

    const defaults = [
      {
        title_en: 'Apex SaaS Multi-Tenant ERP Suite',
        title_ar: 'منظومة Apex لإدارة الموارد والمؤسسات SaaS',
        description_en: 'A complete modular hyper-optimized enterprise SaaS ERP with automated billing, analytics dashboard, dynamic routing, and role-based access control.',
        description_ar: 'نظام تخطيط موارد المؤسسات السحابي والأكثر مرونة وكفاءة، يدمج حسابات الفوترة والتحليلات البيانية والتحكم المتقدم بالصلاحيات للمنشآت الكبرى.',
        price: 899.00,
        category_en: 'SaaS Systems',
        category_ar: 'أنظمة SaaS',
        image_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1080&h=1080&fit=crop',
        highlight_tag: 'featured'
      },
      {
        title_en: 'Sovereign Mobile Crypto Wallet App',
        title_ar: 'تطبيق محفظة العملات الرقمية السيادي للجوال',
        description_en: 'Highly secure cross-platform React Native crypto wallet supporting biometric auth, real-time price feeds, gas optimization, and wallet connect.',
        description_ar: 'محفظة عملات مشفرة فائقة الأمان مبنية لتعمل على نظامي آندرويد وآي أو إس مع واجهات تفاعلية مذهلة، ومكاملة البصمة ومؤشرات الأسعار الفورية.',
        price: 450.00,
        category_en: 'Mobile Apps',
        category_ar: 'تطبيقات الجوال',
        image_url: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=1080&h=1080&fit=crop',
        highlight_tag: 'trending'
      },
      {
        title_en: 'Quantum Scalper High-Frequency Trading Bot',
        title_ar: 'بوت التداول الكمي المتقدم عالي التردد Quantum Scalper',
        description_en: 'Ultra-low latency sub-second algorithmic execution bot with machine learning analytics and auto risk mitigation profiles.',
        description_ar: 'بوت تداول آلي فائق السرعة وخوارزمية معززة بالذكاء الاصطناعي لتحليل نقاط السيولة والتحكم بالخسائر وإدارة الصفقات اللحظية بدقة متناهية.',
        price: 699.00,
        category_en: 'Trading Bots',
        category_ar: 'بوتات التداول',
        image_url: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=1080&h=1080&fit=crop',
        highlight_tag: 'exclusive'
      },
      {
        title_en: 'Perplexta Premium SaaS Landing Page Kit',
        title_ar: 'حزمة الصفحات التعريفية الراقية والحديثة لـ Perplexta',
        description_en: 'A high-converting premium modern components landing library styled strictly in tailwind v4 dark/light modes with pristine scroll animations.',
        description_ar: 'مجموعة قوالب وواجهات برمجية لصفحات الهبوط المخصصة لعرض مشاريع التقنية والـ SaaS مع مكاملة كاملة للأقسام والخطوط والتحريكات الفاخرة.',
        price: 120.00,
        category_en: 'Templates & Sites',
        category_ar: 'قوالب ومواقع',
        image_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1080&h=1080&fit=crop',
        highlight_tag: 'new'
      },
      {
        title_en: 'Hyper-Intelligence LLM Router Plugin',
        title_ar: 'إضافة التوجيه الذكي الآمن Hyper-Intelligence لنماذج اللغة',
        description_en: 'An smart router routing middleware for routing LLM prompts with semantic caching to optimize processing speeds and API cost thresholds.',
        description_ar: 'إضافة وسيطة ذكية لتوجيه الاستعلامات إلى نماذج الذكاء الاصطناعي المختلفة مع التخزين الدلالي المؤقت لتوفير ميزانية استهلاك الـ API.',
        price: 180.00,
        category_en: 'System Plugins',
        category_ar: 'إضافات الأنظمة',
        image_url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1080&h=1080&fit=crop',
        highlight_tag: 'new'
      },
      {
        title_en: 'Sovereign Startup-In-A-Box Tech Suite',
        title_ar: 'مجموعة Sovereign Startup-In-A-Box لتأسيس المشاريع التقنية',
        description_en: 'An all-inclusive launchpack template containing pre-built OAuth, Stripe billing, transactional emails, database mapping, and CI/CD configs.',
        description_ar: 'مجموعة البداية الأكثر شمولية لإطلاق شركة ناشئة تقنية، مجهزة بكافة متطلبات الترخيص والدفع وأنظمة التسجيل وخوادم قواعد البيانات بقالب واحد.',
        price: 349.00,
        category_en: 'Startup-in-a-Box',
        category_ar: 'Startup-in-a-Box',
        image_url: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1080&h=1080&fit=crop',
        highlight_tag: 'featured'
      },
      {
        title_en: 'Perplexta Enterprise Figma Design System v3',
        title_ar: 'نظام تصميم Figma التقني الاحترافي والكامل Perplexta v3',
        description_en: 'Enterprise-grade comprehensive web component system in Figma featuring autolayout, dark mode compliance and fully tokenized classes variables.',
        description_ar: 'مكتبة ونظام تصميم الواجهات الكبرى في فيغما، يضم كافة النماذج والعناصر وبملاءمة كاملة لنظام الأنماط المعتم والمفاتيح التفاعلية.',
        price: 89.00,
        category_en: 'Figma Files',
        category_ar: 'ملفات Figma',
        image_url: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=1080&h=1080&fit=crop',
        highlight_tag: 'new'
      },
      {
        title_en: 'Trend-Pulse Quantitative Pine Indicator Suite',
        title_ar: 'مؤشر Momentum ومستويات الزخم Quantitative Pine Suite',
        description_en: 'TradingView PineScript v5 suite for trend-pulse quantification, institutional order-block detection, and multi-timeframe divergence patterns.',
        description_ar: 'مجموعة استراتيجيات وبوتات تداول حية مبرمجة بلغة PineScript v5 ومخصصة لتتبع السيولة ومستويات التدفق المالي للمؤسسات.',
        price: 150.00,
        category_en: 'Trading Bots',
        category_ar: 'بوتات التداول',
        image_url: 'https://images.unsplash.com/photo-1642390091310-70f1a55b7abc?w=1080&h=1080&fit=crop',
        highlight_tag: 'trending'
      }
    ];

    for (const item of defaults) {
      const check = await pool.query('SELECT id FROM marketplace_items WHERE title_en = $1', [item.title_en]);
      if (check.rows.length === 0) {
        await pool.query(`
          INSERT INTO marketplace_items (
            user_id, title_en, title_ar, description_en, description_ar, price, category_en, category_ar,
            image_url, contact_link, status, referral_percent, highlight_tag, license_type, download_url, features, technologies
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        `, [
          authorId, item.title_en, item.title_ar, item.description_en, item.description_ar, item.price,
          item.category_en, item.category_ar, item.image_url, 'https://t.me/perplexta_support', 'approved',
          20.00, item.highlight_tag, 'standard', 'https://perplexta.io/delivery/mock_source.zip',
          'Premium modular architecture,Fully responsive UI layout,Complete lifetime source code access',
          'React, TypeScript, Tailwind CSS, Express, PostgreSQL'
        ]);
        console.log(`[Marketplace Seed] Dynamically registered default asset: ${item.title_en}`);
      }
    }
  } catch (error) {
    console.error('[Marketplace Seed] Seeding default assets failed:', error);
  }
}

setTimeout(seedDefaultItems, 1500);

export default router;
