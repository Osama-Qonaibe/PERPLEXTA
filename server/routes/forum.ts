import express from 'express';
import { pool as corePool, getExternalPool } from '../db/index.js';
import { authenticateToken, authenticateAdmin } from '../middleware/auth.js';
import { forumLimiter } from '../middleware/rateLimit.js';

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

    // Fetch user avg ratings (forum reputation calculated dynamically across all safe approved posts)
    const ratingResult = await pool.query(`
      SELECT fp.user_id, 
             COALESCE(AVG(pr.rating), 0)::numeric(3, 1) as user_avg_rating,
             COALESCE(COUNT(pr.id), 0)::int as user_rating_count,
             COALESCE(COUNT(DISTINCT fp.id), 0)::int as user_post_count
      FROM forum_posts fp
      LEFT JOIN forum_post_ratings pr ON fp.id = pr.post_id
      WHERE fp.user_id = ANY($1) AND fp.status = 'approved'
      GROUP BY fp.user_id
    `, [userIds]);

    // Fetch active premium plan subscriptions
    const subResult = await corePool.query(`
      SELECT s.user_id, p.name_en as plan_name_en, p.name_ar as plan_name_ar, p.color as plan_color, p.badge as plan_badge
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.user_id = ANY($1) AND s.status = 'active'
    `, [userIds]);
    
    const userMap = new Map();
    userResult.rows.forEach((u: any) => {
      userMap.set(u.id, {
        ...u,
        user_avg_rating: 0,
        user_rating_count: 0,
        user_post_count: 0,
        subscription: null
      });
    });

    ratingResult.rows.forEach((r: any) => {
      const u = userMap.get(r.user_id);
      if (u) {
        u.user_avg_rating = parseFloat(r.user_avg_rating) || 0;
        u.user_rating_count = r.user_rating_count;
        u.user_post_count = r.user_post_count;
      }
    });

    subResult.rows.forEach((s: any) => {
      const u = userMap.get(s.user_id);
      if (u) {
        u.subscription = {
          name_en: s.plan_name_en,
          name_ar: s.plan_name_ar,
          color: s.plan_color,
          badge: s.plan_badge
        };
      }
    });
    
    items.forEach(item => {
      const u = userMap.get(item[userIdKey]);
      item.author_name = u ? u.name : 'Unknown User';
      item.author_avatar = u ? u.avatar : null;
      item.author_role = u ? u.role : 'user';
      item.author_avg_rating = u ? u.user_avg_rating : 0;
      item.author_rating_count = u ? u.user_rating_count : 0;
      item.author_post_count = u ? u.user_post_count : 0;
      item.author_subscription = u ? u.subscription : null;
    });
  } catch (err) {
    console.warn('[Forum Schema Hydration] Failed to hydrate user details:', err);
    items.forEach(item => {
      item.author_name = 'Unknown User';
      item.author_avatar = null;
      item.author_role = 'user';
      item.author_avg_rating = 0;
      item.author_rating_count = 0;
      item.author_post_count = 0;
      item.author_subscription = null;
    });
  }
  return items;
}

// 1. Get all categories
router.get('/categories', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 100);
    const offset = (page - 1) * limit;

    const result = await pool.query(`
      SELECT c.*, 
             COALESCE(COUNT(DISTINCT CASE WHEN p.status = 'approved' THEN p.id ELSE NULL END), 0) as post_count,
             COALESCE(COUNT(DISTINCT tc.id), 0) as comment_count
      FROM forum_categories c
      LEFT JOIN forum_posts p ON c.id = p.category_id
      LEFT JOIN forum_comments tc ON p.id = tc.post_id
      GROUP BY c.id
      ORDER BY c.id ASC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Failed to fetch categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// 2. Get posts by category
router.get('/categories/:categoryId/posts', async (req, res) => {
  const { categoryId } = req.params;
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 100);
    const offset = (page - 1) * limit;

    const result = await pool.query(`
      SELECT p.*, 
             COALESCE(COUNT(DISTINCT fc.id), 0)::int as comment_count,
             COALESCE(AVG(r.rating), 0)::numeric(3,1) as avg_rating,
             COALESCE(COUNT(DISTINCT r.id), 0)::int as rating_count
      FROM forum_posts p
      LEFT JOIN forum_comments fc ON p.id = fc.post_id
      LEFT JOIN forum_post_ratings r ON p.id = r.post_id
      WHERE p.category_id = $3 AND p.status = 'approved'
      GROUP BY p.id
      ORDER BY p.is_pinned DESC, p.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset, categoryId]);
    await hydrateAuthors(result.rows);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Failed to fetch category posts:', error);
    res.status(500).json({ error: 'Failed to fetch category posts' });
  }
});

// 2.5 Get all posts across all categories
router.get('/posts', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 100);
    const offset = (page - 1) * limit;

    const result = await pool.query(`
      SELECT p.*, 
             COALESCE(COUNT(DISTINCT fc.id), 0)::int as comment_count,
             COALESCE(AVG(r.rating), 0)::numeric(3,1) as avg_rating,
             COALESCE(COUNT(DISTINCT r.id), 0)::int as rating_count
      FROM forum_posts p
      LEFT JOIN forum_comments fc ON p.id = fc.post_id
      LEFT JOIN forum_post_ratings r ON p.id = r.post_id
      WHERE p.status = 'approved'
      GROUP BY p.id
      ORDER BY p.is_pinned DESC, p.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    await hydrateAuthors(result.rows);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Failed to fetch all posts:', error);
    res.status(500).json({ error: 'Failed to fetch all posts' });
  }
});

// 3. Create a post
router.post('/posts', authenticateToken, forumLimiter, async (req: any, res) => {
  const { category_id, title, content, image_url } = req.body;
  if (!category_id || !title || !content) {
    return res.status(400).json({ error: 'Category ID, title and content are required' });
  }

  // Content security check: Prevent DoS or DB bloat from extreme inputs
  if (typeof title !== 'string' || title.trim().length < 5 || title.length > 200) {
    return res.status(400).json({ error: 'Post title must be between 5 and 200 characters' });
  }
  if (typeof content !== 'string' || content.trim().length < 10 || content.length > 30000) {
    return res.status(400).json({ error: 'Post content must be between 10 and 30000 characters' });
  }

  try {
    // Check key requirements on category
    const catCheck = await pool.query('SELECT max_posts_per_day, require_approval FROM forum_categories WHERE id = $1', [category_id]);
    if (catCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Selected category does not exist' });
    }
    const { max_posts_per_day, require_approval } = catCheck.rows[0];

    // Verify limit constraint if user is not admin
    if (req.user.role !== 'admin' && max_posts_per_day && max_posts_per_day > 0) {
      const countRes = await pool.query(
        "SELECT COUNT(*)::int as today_count FROM forum_posts WHERE category_id = $1 AND created_at >= CURRENT_DATE",
        [category_id]
      );
      const todayCount = countRes.rows[0]?.today_count || 0;
      if (todayCount >= max_posts_per_day) {
        return res.status(400).json({ 
          error: req.user.language === 'ar' 
            ? `عذراً، تم تجاوز الحد الأقصى للنشر في هذا القسم اليوم وهو (${max_posts_per_day}) منشورات لضمان جودة المحتوى.`
            : `Sorry, the maximum daily limit of (${max_posts_per_day}) posts has been reached for this category.`
        });
      }
    }

    const postStatus = require_approval ? 'pending' : 'approved';

    const result = await pool.query(`
      INSERT INTO forum_posts (category_id, user_id, title, content, image_url, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [category_id, req.user.id, title, content, image_url || null, postStatus]);

    const resultWithCount = { ...result.rows[0], comment_count: 0, avg_rating: 0, rating_count: 0 };
    await hydrateAuthors([resultWithCount]);

    res.status(201).json(resultWithCount);
  } catch (error: any) {
    console.error('Failed to create post:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// 4. Get post detailed (with comments)
router.get('/posts/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Increment view count
    await pool.query('UPDATE forum_posts SET views = views + 1 WHERE id = $1', [id]);

    const postRes = await pool.query(`
      SELECT p.*, c.name_en as category_name_en, c.name_ar as category_name_ar,
             COALESCE(AVG(r.rating), 0)::numeric(3,1) as avg_rating,
             COALESCE(COUNT(DISTINCT r.id), 0)::int as rating_count
      FROM forum_posts p
      JOIN forum_categories c ON p.category_id = c.id
      LEFT JOIN forum_post_ratings r ON p.id = r.post_id
      WHERE p.id = $1
      GROUP BY p.id, c.name_en, c.name_ar
    `, [id]);

    if (postRes.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    await hydrateAuthors(postRes.rows);

    const postObj = postRes.rows[0];

    // Optional parse user id if JWT token is passed in authorization header
    let voterUserId: number | null = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const jwt = await import('jsonwebtoken');
        const decoded: any = (jwt.default || jwt).verify(token, process.env.JWT_SECRET || 'fallback-secret-key-1234');
        voterUserId = decoded.id;
      } catch (tokenErr) {
        // Safe to ignore, treat as guest
      }
    }

    let userRating = 0;
    if (voterUserId) {
      const ratingCheck = await pool.query('SELECT rating FROM forum_post_ratings WHERE post_id = $1 AND user_id = $2', [id, voterUserId]);
      if (ratingCheck.rows.length > 0) {
        userRating = ratingCheck.rows[0].rating;
      }
    }

    const commentsRes = await pool.query(`
      SELECT tc.*
      FROM forum_comments tc
      WHERE tc.post_id = $1
      ORDER BY tc.created_at ASC
    `, [id]);
    await hydrateAuthors(commentsRes.rows);

    res.json({
      post: {
        ...postObj,
        avg_rating: parseFloat(postObj.avg_rating) || 0,
        rating_count: parseInt(postObj.rating_count) || 0,
        user_rating: userRating
      },
      comments: commentsRes.rows
    });
  } catch (error: any) {
    console.error('Failed to fetch post details:', error);
    res.status(500).json({ error: 'Failed to fetch post details' });
  }
});

// 4.5 Submit a rating for a post (1-5 stars)
router.post('/posts/:id/rate', authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  const { rating } = req.body;

  const ratingVal = parseInt(rating);
  if (isNaN(ratingVal) || ratingVal < 1 || ratingVal > 5) {
    return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
  }

  try {
    // Check if post exists & isn't by current user
    const postRes = await pool.query('SELECT user_id, title FROM forum_posts WHERE id = $1', [id]);
    if (postRes.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const { user_id: authorId, title } = postRes.rows[0];
    if (authorId === req.user.id) {
      return res.status(400).json({ 
        error: req.user.language === 'ar' 
          ? 'لا يمكنك تقييم منشورك الخاص.' 
          : 'You cannot rate your own post.' 
      });
    }

    // Upsert rating (replaces existing rating cleanly)
    await pool.query(`
      INSERT INTO forum_post_ratings (post_id, user_id, rating)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, post_id) DO UPDATE SET rating = EXCLUDED.rating
    `, [id, req.user.id, ratingVal]);

    // Recalculate stats
    const statsRes = await pool.query(`
      SELECT COALESCE(AVG(rating), 0)::numeric(3,1) as avg_rating,
             COALESCE(COUNT(*), 0)::int as rating_count
      FROM forum_post_ratings
      WHERE post_id = $1
    `, [id]);

    const { avg_rating, rating_count } = statsRes.rows[0];

    // Notify post author if rating is positive (>= 4 stars)
    if (ratingVal >= 4) {
      const raterName = req.user.name || 'someone';
      await corePool.query(`
        INSERT INTO notifications (user_id, type, title_en, title_ar, message_en, message_ar, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        authorId,
        'forum_rating',
        'Post rated highly!',
        'تم تقييم منشورك بشكل إيجابي!',
        `${raterName} rated your post "${title}" ${ratingVal} stars!`,
        `قام ${raterName} بتقييم منشورك "${title}" بـ ${ratingVal} نجوم!`,
        JSON.stringify({ post_id: id, rating: ratingVal })
      ]);
    }

    res.json({
      success: true,
      avg_rating: parseFloat(avg_rating) || 0,
      rating_count,
      user_rating: ratingVal
    });
  } catch (error: any) {
    console.error('Failed to submit post rating:', error);
    res.status(500).json({ error: 'Failed to submit rating' });
  }
});

// 5. Add a comment to a post
router.post('/posts/:id/comments', authenticateToken, forumLimiter, async (req: any, res) => {
  const { id } = req.params;
  const { content } = req.body;
  if (!content) {
    return res.status(400).json({ error: 'Comment content is required' });
  }

  // Content security check: Prevent DoS or DB bloat from extreme inputs
  if (typeof content !== 'string' || content.trim().length < 2 || content.length > 10000) {
    return res.status(400).json({ error: 'Comment content must be between 2 and 10000 characters' });
  }

  try {
    // Check if post is locked
    const postCheck = await pool.query('SELECT is_locked, user_id, title FROM forum_posts WHERE id = $1', [id]);
    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    if (postCheck.rows[0].is_locked) {
      return res.status(403).json({ error: 'Post is locked for comments' });
    }

    const commentRes = await pool.query(`
      INSERT INTO forum_comments (post_id, user_id, content)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [id, req.user.id, content]);

    const rawComment = commentRes.rows[0];
    await hydrateAuthors([rawComment]);

    // Send notifications to post author if the comment is by another user
    const postAuthorId = postCheck.rows[0].user_id;
    if (postAuthorId !== req.user.id) {
      const commenterName = req.user.name || 'someone';
      await corePool.query(`
        INSERT INTO notifications (user_id, type, title_en, title_ar, message_en, message_ar, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        postAuthorId,
        'forum_reply',
        'New reply on your post',
        'تعليق جديد على منشورك',
        `${commenterName} commented on "${postCheck.rows[0].title}"`,
        `قام ${commenterName} بالرد على منشورك "${postCheck.rows[0].title}"`,
        JSON.stringify({ post_id: id, comment_id: commentRes.rows[0].id })
      ]);
    }

    res.status(201).json(rawComment);
  } catch (error: any) {
    console.error('Failed to add comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// 6. Delete a post (owner or administrator)
router.delete('/posts/:id', authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  try {
    const postRes = await pool.query('SELECT user_id FROM forum_posts WHERE id = $1', [id]);
    if (postRes.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const isOwner = postRes.rows[0].user_id === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized to delete this post' });
    }

    await pool.query('DELETE FROM forum_posts WHERE id = $1', [id]);
    res.json({ success: true, message: 'Post deleted successfully' });
  } catch (error: any) {
    console.error('Failed to delete post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// 7. Delete a comment (owner or administrator)
router.delete('/comments/:id', authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  try {
    const commentRes = await pool.query('SELECT user_id FROM forum_comments WHERE id = $1', [id]);
    if (commentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const isOwner = commentRes.rows[0].user_id === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized to delete this comment' });
    }

    await pool.query('DELETE FROM forum_comments WHERE id = $1', [id]);
    res.json({ success: true, message: 'Comment deleted successfully' });
  } catch (error: any) {
    console.error('Failed to delete comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// 8. Admin route: Toggle Pinnned status
router.patch('/posts/:id/pin', authenticateToken, authenticateAdmin, async (req: any, res) => {
  const { id } = req.params;
  const { is_pinned } = req.body;
  try {
    const result = await pool.query(
      'UPDATE forum_posts SET is_pinned = $1 WHERE id = $2 RETURNING *',
      [is_pinned, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Failed to pin/unpin post:', error);
    res.status(500).json({ error: 'Failed to pin/unpin post' });
  }
});

// 9. Admin route: Toggle Locked status
router.patch('/posts/:id/lock', authenticateToken, authenticateAdmin, async (req: any, res) => {
  const { id } = req.params;
  const { is_locked } = req.body;
  try {
    const result = await pool.query(
      'UPDATE forum_posts SET is_locked = $1 WHERE id = $2 RETURNING *',
      [is_locked, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Failed to lock/unlock post:', error);
    res.status(500).json({ error: 'Failed to lock/unlock post' });
  }
});

// 10. Admin route: Get all pending posts for moderation
router.get('/admin/pending-posts', authenticateToken, authenticateAdmin, async (req: any, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, c.name_en as category_name_en, c.name_ar as category_name_ar
      FROM forum_posts p
      JOIN forum_categories c ON p.category_id = c.id
      WHERE p.status = 'pending'
      ORDER BY p.created_at DESC
    `);
    await hydrateAuthors(result.rows);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Failed to fetch pending posts:', error);
    res.status(500).json({ error: 'Failed to fetch pending posts' });
  }
});

// 11. Admin route: Approve or reject post
router.patch('/posts/:id/status', authenticateToken, authenticateAdmin, async (req: any, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'approved' or 'rejected'
  
  if (status !== 'approved' && status !== 'rejected') {
    return res.status(400).json({ error: 'Invalid status' });
  }
  
  try {
    const result = await pool.query(
      'UPDATE forum_posts SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Notify author
    const postAuthorId = result.rows[0].user_id;
    const postTitle = result.rows[0].title;
    if (status === 'approved') {
      await corePool.query(`
        INSERT INTO notifications (user_id, type, title_en, title_ar, message_en, message_ar, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        postAuthorId,
        'forum_status',
        'Your post was approved!',
        'تمت الموافقة على منشورك!',
        `Your post "${postTitle}" was approved and is now public.`,
        `تمت الموافقة على منشورك "${postTitle}" وهو الآن متاح للجميع.`,
        JSON.stringify({ post_id: id })
      ]);
    } else {
      await corePool.query(`
        INSERT INTO notifications (user_id, type, title_en, title_ar, message_en, message_ar, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        postAuthorId,
        'forum_status',
        'Your post was rejected',
        'تم رفض نشر منشورك',
        `Your post "${postTitle}" was rejected due to content policy compliance.`,
        `تم رفض منشورك "${postTitle}" لعدم توافقه مع معايير وسياسات النشر لدينا.`,
        JSON.stringify({ post_id: id })
      ]);
    }
    
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Failed to update post status:', error);
    res.status(500).json({ error: 'Failed to update post status' });
  }
});

// 12. Admin route: Create a new category
router.post('/categories', authenticateToken, authenticateAdmin, async (req: any, res) => {
  const { slug, name_en, name_ar, description_en, description_ar, icon, color, max_posts_per_day, require_approval } = req.body;
  
  if (!slug || !name_en || !name_ar) {
    return res.status(400).json({ error: 'Slug, English Name, and Arabic Name are required' });
  }
  
  try {
    const result = await pool.query(`
      INSERT INTO forum_categories (slug, name_en, name_ar, description_en, description_ar, icon, color, max_posts_per_day, require_approval)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      slug.trim().toLowerCase(), 
      name_en.trim(), 
      name_ar.trim(), 
      description_en?.trim() || '', 
      description_ar?.trim() || '', 
      icon || 'MessageSquare', 
      color || 'emerald', 
      parseInt(max_posts_per_day) || 0, 
      !!require_approval
    ]);
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Failed to create category:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'A category with this slug already exists' });
    }
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// 13. Admin route: Update category
router.put('/categories/:id', authenticateToken, authenticateAdmin, async (req: any, res) => {
  const { id } = req.params;
  const { slug, name_en, name_ar, description_en, description_ar, icon, color, max_posts_per_day, require_approval } = req.body;
  
  if (!slug || !name_en || !name_ar) {
    return res.status(400).json({ error: 'Slug, English Name, and Arabic Name are required' });
  }
  
  try {
    const result = await pool.query(`
      UPDATE forum_categories 
      SET slug = $1, name_en = $2, name_ar = $3, description_en = $4, description_ar = $5, icon = $6, color = $7, max_posts_per_day = $8, require_approval = $9
      WHERE id = $10
      RETURNING *
    `, [
      slug.trim().toLowerCase(), 
      name_en.trim(), 
      name_ar.trim(), 
      description_en?.trim() || '', 
      description_ar?.trim() || '', 
      icon || 'MessageSquare', 
      color || 'emerald', 
      parseInt(max_posts_per_day) || 0, 
      !!require_approval,
      id
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Failed to update category:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'A category with this slug already exists' });
    }
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// 14. Admin route: Delete category
router.delete('/categories/:id', authenticateToken, authenticateAdmin, async (req: any, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM forum_categories WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error: any) {
    console.error('Failed to delete category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

export default router;
