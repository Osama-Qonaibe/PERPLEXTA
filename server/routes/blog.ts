import express from 'express';
import { pool } from '../db/index.js';
import { authenticateToken, authenticateAdmin } from '../middleware/auth.js';
import { io } from '../config/socket.js';

const router = express.Router();

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
             u.name as author_name, 
             u.avatar as author_avatar,
             COALESCE(comment_counts.count, 0) as comment_count,
             COALESCE(ratings.avg_rate, 0.0) as avg_rating,
             COALESCE(ratings.rate_count, 0) as ratings_count
      FROM blog_articles b
      JOIN users u ON b.author_id = u.id
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
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch blog articles', details: error.message });
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
             u.name as author_name, 
             u.avatar as author_avatar, 
             u.role as author_role,
             COALESCE(ratings.avg_rate, 0.0) as avg_rating,
             COALESCE(ratings.rate_count, 0) as ratings_count
      FROM blog_articles b
      JOIN users u ON b.author_id = u.id
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

    const article = articleRes.rows[0];

    const commentsRes = await pool.query(`
      SELECT bc.*, u.name as author_name, u.avatar as author_avatar, u.role as author_role
      FROM blog_comments bc
      JOIN users u ON bc.user_id = u.id
      WHERE bc.article_id = $1
      ORDER BY bc.created_at DESC
    `, [article.id]);

    res.json({
      article,
      comments: commentsRes.rows
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch article details', details: error.message });
  }
});

// 3. Admin: Create blog article
router.post('/articles', authenticateToken, authenticateAdmin, async (req: any, res) => {
  const { title_en, title_ar, content_en, content_ar, image_url, category_en, category_ar, slug } = req.body;
  
  if (!title_en || !title_ar || !content_en || !content_ar || !category_en || !category_ar) {
    return res.status(400).json({ error: 'Titles, contents, and categories are required in English and Arabic' });
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

    // Bulk creation of notifications for ALL active users
    try {
      await pool.query(`
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
      console.error('[Blog Notification Dispatch] Failed to send global notifications:', notifErr);
    }

    res.status(201).json(liveArticle);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create article', details: error.message });
  }
});

// 4. Admin: Update blog article
router.put('/articles/:id', authenticateToken, authenticateAdmin, async (req: any, res) => {
  const { id } = req.params;
  const { title_en, title_ar, content_en, content_ar, image_url, category_en, category_ar, slug } = req.body;

  if (!title_en || !title_ar || !content_en || !content_ar || !category_en || !category_ar) {
    return res.status(400).json({ error: 'All fields are required' });
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
    res.status(500).json({ error: 'Failed to update article', details: error.message });
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
    res.status(500).json({ error: 'Failed to delete article', details: error.message });
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

    const commentWithAuthor = await pool.query(`
      SELECT bc.*, u.name as author_name, u.avatar as author_avatar, u.role as author_role
      FROM blog_comments bc
      JOIN users u ON bc.user_id = u.id
      WHERE bc.id = $1
    `, [commentRes.rows[0].id]);

    res.status(201).json(commentWithAuthor.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to add comment to article', details: error.message });
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
    res.status(500).json({ error: 'Failed to delete comment', details: error.message });
  }
});

// 8. Rate a blog article
router.post('/articles/:id/rate', authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  const { rating } = req.body;

  if (rating === undefined || rating < 1 || rating > 5) {
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
    res.status(500).json({ error: 'Failed to record rating', details: error.message });
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
