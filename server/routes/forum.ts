import express from 'express';
import { pool } from '../db/index.js';
import { authenticateToken, authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();

// 1. Get all categories
router.get('/categories', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, 
             COALESCE(COUNT(DISTINCT p.id), 0) as post_count,
             COALESCE(COUNT(DISTINCT tc.id), 0) as comment_count
      FROM forum_categories c
      LEFT JOIN forum_posts p ON c.id = p.category_id
      LEFT JOIN forum_comments tc ON p.id = tc.post_id
      GROUP BY c.id
      ORDER BY c.id ASC
    `);
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch categories', details: error.message });
  }
});

// 2. Get posts by category
router.get('/categories/:categoryId/posts', async (req, res) => {
  const { categoryId } = req.params;
  try {
    const result = await pool.query(`
      SELECT p.*, 
             u.name as author_name, 
             u.avatar as author_avatar, 
             u.role as author_role,
             COALESCE(comment_counts.count, 0) as comment_count
      FROM forum_posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN (
        SELECT post_id, COUNT(*) as count 
        FROM forum_comments 
        GROUP BY post_id
      ) comment_counts ON p.id = comment_counts.post_id
      WHERE p.category_id = $1
      ORDER BY p.is_pinned DESC, p.created_at DESC
    `, [categoryId]);
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch category posts', details: error.message });
  }
});

// 3. Create a post
router.post('/posts', authenticateToken, async (req: any, res) => {
  const { category_id, title, content } = req.body;
  if (!category_id || !title || !content) {
    return res.status(400).json({ error: 'Category ID, title and content are required' });
  }

  try {
    const result = await pool.query(`
      INSERT INTO forum_posts (category_id, user_id, title, content)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [category_id, req.user.id, title, content]);

    // Fetch author info to append
    const postWithAuthor = await pool.query(`
      SELECT p.*, u.name as author_name, u.avatar as author_avatar, u.role as author_role, 0 as comment_count
      FROM forum_posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = $1
    `, [result.rows[0].id]);

    res.status(201).json(postWithAuthor.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create post', details: error.message });
  }
});

// 4. Get post detailed (with comments)
router.get('/posts/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Increment view count
    await pool.query('UPDATE forum_posts SET views = views + 1 WHERE id = $1', [id]);

    const postRes = await pool.query(`
      SELECT p.*, u.name as author_name, u.avatar as author_avatar, u.role as author_role, c.name_en as category_name_en, c.name_ar as category_name_ar
      FROM forum_posts p
      JOIN users u ON p.user_id = u.id
      JOIN forum_categories c ON p.category_id = c.id
      WHERE p.id = $1
    `, [id]);

    if (postRes.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const commentsRes = await pool.query(`
      SELECT tc.*, u.name as author_name, u.avatar as author_avatar, u.role as author_role
      FROM forum_comments tc
      JOIN users u ON tc.user_id = u.id
      WHERE tc.post_id = $1
      ORDER BY tc.created_at ASC
    `, [id]);

    res.json({
      post: postRes.rows[0],
      comments: commentsRes.rows
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch post details', details: error.message });
  }
});

// 5. Add a comment to a post
router.post('/posts/:id/comments', authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  const { content } = req.body;
  if (!content) {
    return res.status(400).json({ error: 'Comment content is required' });
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

    // Fetch comment with author info
    const commentWithAuthor = await pool.query(`
      SELECT tc.*, u.name as author_name, u.avatar as author_avatar, u.role as author_role
      FROM forum_comments tc
      JOIN users u ON tc.user_id = u.id
      WHERE tc.id = $1
    `, [commentRes.rows[0].id]);

    // Send notifications to post author if the comment is by another user
    const postAuthorId = postCheck.rows[0].user_id;
    if (postAuthorId !== req.user.id) {
      const commenterName = req.user.name || 'someone';
      await pool.query(`
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

    res.status(201).json(commentWithAuthor.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to add comment', details: error.message });
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
    res.status(500).json({ error: 'Failed to delete post', details: error.message });
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
    res.status(500).json({ error: 'Failed to delete comment', details: error.message });
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
    res.status(500).json({ error: 'Failed to pin/unpin post', details: error.message });
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
    res.status(500).json({ error: 'Failed to lock/unlock post', details: error.message });
  }
});

export default router;
