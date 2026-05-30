import express from 'express';
import { pool as corePool, getExternalPool } from '../db/index.js';
import { authenticateToken, authenticateAdmin } from '../middleware/auth.js';
import { io } from '../config/socket.js';

const router = express.Router();

const pool = {
  query: (text: string, params?: any[]) => getExternalPool().query(text, params),
  connect: () => getExternalPool().connect()
};

async function hydrateAuthors(items: any[], userIdKey = 'user_id') {
  if (!items || items.length === 0) return items;
  const userIds = Array.from(new Set(items.map(item => item[userIdKey]).filter(Boolean)));
  if (userIds.length === 0) return items;
  
  try {
    const userResult = await corePool.query(
      'SELECT id, name, avatar, role FROM users WHERE id = ANY($1)',
      [userIds]
    );
    const userMap = new Map();
    userResult.rows.forEach((u: any) => {
      userMap.set(u.id, u);
    });
    
    items.forEach(item => {
      const u = userMap.get(item[userIdKey]);
      item.author_name = u ? u.name : 'Unknown User';
      item.author_avatar = u ? u.avatar : null;
      item.author_role = u ? u.role : 'user';
    });
  } catch (err) {
    console.warn('[Blog Schema Hydration] Failed to hydrate user details:', err);
    items.forEach(item => {
      item.author_name = 'Unknown User';
      item.author_avatar = null;
      item.author_role = 'user';
    });
  }
  return items;
}

// Helper to validate URLs (protects from SSRF / Phishing)
function isSafeUrl(urlStr: string): boolean {
  if (!urlStr) return true;
  try {
    if (urlStr.startsWith('/')) {
      return !urlStr.includes('..') && !urlStr.includes('\\');
    }
    if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) {
      return false;
    }
    const parsed = new URL(urlStr);
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
    return true;
  } catch (err) {
    return false;
  }
}

// Helper to slugify
function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars (except -)
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start
    .replace(/-+$/, '');            // Trim - from end
}

// 1. Get all articles
router.get('/articles', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT b.*, 
             COALESCE(comment_counts.count, 0) as comment_count,
             COALESCE(ratings.avg_rate, 0.0) as avg_rating,
             COALESCE(ratings.rate_count, 0) as ratings_count
      FROM blog_articles b
      LEFT JOIN (
        SELECT article_id, COUNT(*) as count 
        FROM blog_comments 
        GROUP BY article_id
      ) comment_counts ON b.id = comment_counts.article_id
      LEFT JOIN (
        SELECT article_id, ROUND(AVG(rating), 1)::float as avg_rate, COUNT(*) as rate_count
        FROM blog_ratings
        GROUP BY article_id
      ) ratings ON b.id = ratings.article_id
      ORDER BY b.created_at DESC
    `);
    await hydrateAuthors(result.rows, 'author_id');
    res.json(result.rows);
  } catch (error: any) {
    console.error('Failed to fetch blog articles:', error);
    res.status(500).json({ error: 'Failed to fetch blog articles' });
  }
});

// 2. Get specific article by slug
router.get('/articles/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    // Increment view count
    await pool.query('UPDATE blog_articles SET views = views + 1 WHERE slug = $1', [slug]);

    const articleRes = await pool.query(`
      SELECT b.*, 
             COALESCE(ratings.avg_rate, 0.0) as avg_rating,
             COALESCE(ratings.rate_count, 0) as ratings_count
      FROM blog_articles b
      LEFT JOIN (
        SELECT article_id, ROUND(AVG(rating), 1)::float as avg_rate, COUNT(*) as rate_count
        FROM blog_ratings
        GROUP BY article_id
      ) ratings ON b.id = ratings.article_id
      WHERE b.slug = $1
    `, [slug]);

    if (articleRes.rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }
    await hydrateAuthors(articleRes.rows, 'author_id');
    const article = articleRes.rows[0];

    const commentsRes = await pool.query(`
      SELECT bc.*
      FROM blog_comments bc
      WHERE bc.article_id = $1
      ORDER BY bc.created_at DESC
    `, [article.id]);
    await hydrateAuthors(commentsRes.rows, 'user_id');

    res.json({
      article,
      comments: commentsRes.rows
    });
  } catch (error: any) {
    console.error('Failed to fetch article details:', error);
    res.status(500).json({ error: 'Failed to fetch article details' });
  }
});

// 3. Admin: Create blog article
router.post('/articles', authenticateToken, authenticateAdmin, async (req: any, res) => {
  const { title_en, title_ar, content_en, content_ar, image_url, category_en, category_ar, slug } = req.body;
  
  if (!title_en || !title_ar || !content_en || !content_ar || !category_en || !category_ar) {
    return res.status(400).json({ error: 'Titles, contents, and categories are required in English and Arabic' });
  }

  // SSRF Protection: Validate image_url
  if (image_url && !isSafeUrl(image_url)) {
    return res.status(400).json({ error: 'Insecure or invalid image URL' });
  }

  // Generate or use provided slug
  const finalSlug = slug ? slugify(slug) : slugify(title_en) + '-' + Date.now();

  try {
    const result = await pool.query(`
      INSERT INTO blog_articles (author_id, slug, title_en, title_ar, content_en, content_ar, image_url, category_en, category_ar)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [req.user.id, finalSlug, title_en, title_ar, content_en, content_ar, image_url, category_en, category_ar]);

    const liveArticle = result.rows[0];

    // Bulk creation of notifications for ALL active users (run asynchronously in background to unblock response)
    setImmediate(async () => {
      try {
        await corePool.query(`
          INSERT INTO notifications (user_id, type, title_en, title_ar, message_en, message_ar, metadata)
          SELECT id, 'blog_notification', $1, $2, $3, $4, $5
          FROM users
          WHERE status = 'active'
        `, [
          'New Article Published',
          'تم نشر مقالة جديدة',
          `Read our newest post: "${title_en}"`,
          `اقرأ مقالنا الجديد: "${title_ar}"`,
          JSON.stringify({ slug: finalSlug, article_id: liveArticle.id })
        ]);

        // Emit global WebSocket event to trigger live toast
        if (io) {
          io.emit('new_blog_article', {
            id: liveArticle.id,
            slug: finalSlug,
            title_en,
            title_ar
          });
        }
      } catch (notifErr) {
        console.error('[Blog Notification Dispatch] Failed to send global notifications in background:', notifErr);
      }
    });

    res.status(201).json(liveArticle);
  } catch (error: any) {
    console.error('Failed to create article:', error);
    res.status(500).json({ error: 'Failed to create article' });
  }
});

// 4. Admin: Update blog article
router.put('/articles/:id', authenticateToken, authenticateAdmin, async (req: any, res) => {
  const { id } = req.params;
  const { title_en, title_ar, content_en, content_ar, image_url, category_en, category_ar, slug } = req.body;

  if (!title_en || !title_ar || !content_en || !content_ar || !category_en || !category_ar) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // SSRF Protection: Validate image_url
  if (image_url && !isSafeUrl(image_url)) {
    return res.status(400).json({ error: 'Insecure or invalid image URL' });
  }

  const finalSlug = slug ? slugify(slug) : slugify(title_en) + '-' + id;

  try {
    const result = await pool.query(`
      UPDATE blog_articles 
      SET title_en = $1, title_ar = $2, content_en = $3, content_ar = $4,
          image_url = $5, category_en = $6, category_ar = $7, slug = $8, updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *
    `, [title_en, title_ar, content_en, content_ar, image_url, category_en, category_ar, finalSlug, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Failed to update article:', error);
    res.status(500).json({ error: 'Failed to update article' });
  }
});

// 5. Admin: Delete blog article
router.delete('/articles/:id', authenticateToken, authenticateAdmin, async (req: any, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM blog_articles WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }
    res.json({ success: true, message: 'Article deleted successfully' });
  } catch (error: any) {
    console.error('Failed to delete article:', error);
    res.status(500).json({ error: 'Failed to delete article' });
  }
});

// 6. User: Add comment onto a blog article
router.post('/articles/:id/comments', authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Comment content is required' });
  }

  try {
    const commentRes = await pool.query(`
      INSERT INTO blog_comments (article_id, user_id, content)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [id, req.user.id, content]);

    const rawComment = commentRes.rows[0];
    await hydrateAuthors([rawComment], 'user_id');

    res.status(201).json(rawComment);
  } catch (error: any) {
    console.error('Failed to add comment to article:', error);
    res.status(500).json({ error: 'Failed to add comment to article' });
  }
});

// 7. Delete blog comment (owner or administrator)
router.delete('/comments/:id', authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  try {
    const commentRes = await pool.query('SELECT user_id FROM blog_comments WHERE id = $1', [id]);
    if (commentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const isOwner = commentRes.rows[0].user_id === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized to delete this comment' });
    }

    await pool.query('DELETE FROM blog_comments WHERE id = $1', [id]);
    res.json({ success: true, message: 'Comment deleted successfully' });
  } catch (error: any) {
    console.error('Failed to delete comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// 8. Rate a blog article
router.post('/articles/:id/rate', authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  const { rating } = req.body;

  if (rating === undefined || rating < 1 || rating > 5 || !Number.isInteger(Number(rating))) {
    return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
  }

  try {
    // Upsert rating
    await pool.query(`
      INSERT INTO blog_ratings (article_id, user_id, rating)
      VALUES ($1, $2, $3)
      ON CONFLICT (article_id, user_id)
      DO UPDATE SET rating = EXCLUDED.rating
    `, [id, req.user.id, rating]);

    // Calculate new average and count
    const statsRes = await pool.query(`
      SELECT COALESCE(ROUND(AVG(rating), 1)::float, 0.0) as avg_rating, COUNT(*)::int as ratings_count
      FROM blog_ratings
      WHERE article_id = $1
    `, [id]);

    res.json({
      success: true,
      user_rating: rating,
      ...statsRes.rows[0]
    });
  } catch (error: any) {
    console.error('Failed to record rating:', error);
    res.status(500).json({ error: 'Failed to record rating' });
  }
});

// 9. Get logged in user's rating for an article
router.get('/articles/:id/user-rating', authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT rating FROM blog_ratings WHERE article_id = $1 AND user_id = $2', [id, req.user.id]);
    if (result.rows.length > 0) {
      return res.json({ rating: result.rows[0].rating });
    }
    res.json({ rating: 0 });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch user rating' });
  }
});

export default router;
