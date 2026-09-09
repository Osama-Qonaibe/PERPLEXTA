import express from 'express';
import { pool, getExternalPool } from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

async function generateRecommendationsForUser(userId?: number, options: { limit?: number; categoryFilter?: string; typeFilter?: string } = {}) {
  const limit = options.limit || 12;

  let topCategories: Record<string, number> = {};
  let interactedItemKeys = new Set<string>();
  let dismissedItemKeys = new Set<string>();
  let preferredCategories: string[] = [];
  let preferredPriceMin = 0;
  let preferredPriceMax = 10000;
  let userMemories: any[] = [];

  if (userId) {
    try {
      const prefRes = await pool.query(
        'SELECT preferred_categories, preferred_price_range, explicit_interests FROM user_recommendation_preferences WHERE user_id = $1',
        [userId]
      );
      if (prefRes.rows.length > 0) {
        const p = prefRes.rows[0];
        preferredCategories = p.preferred_categories || [];
        if (p.preferred_price_range) {
          preferredPriceMin = p.preferred_price_range.min ?? 0;
          preferredPriceMax = p.preferred_price_range.max ?? 10000;
        }
      }

      const memoriesRes = await pool.query(
        'SELECT fact, category FROM chat_memories WHERE user_id = $1',
        [userId]
      );
      userMemories = memoriesRes.rows;

      const fbRes = await pool.query(
        'SELECT item_type, item_id, item_key FROM recommendation_feedback WHERE user_id = $1 AND feedback_type IN (\'not_interested\', \'dismissed\')',
        [userId]
      );
      fbRes.rows.forEach((row: any) => {
        dismissedItemKeys.add(`${row.item_type}:${row.item_id || row.item_key}`);
      });

      const interRes = await pool.query(
        `SELECT item_type, item_id, item_key, category, action_type, weight, created_at 
         FROM user_recommendation_interactions 
         WHERE user_id = $1 ORDER BY created_at DESC LIMIT 200`,
        [userId]
      );

      interRes.rows.forEach((row: any) => {
        const key = `${row.item_type}:${row.item_id || row.item_key}`;
        interactedItemKeys.add(key);
        if (row.category) {
          const cat = row.category.toLowerCase().trim();
          topCategories[cat] = (topCategories[cat] || 0) + Number(row.weight || 1);
        }
      });

      const savedRes = await pool.query('SELECT category FROM bulletin_saved_ads s JOIN bulletin_ads a ON s.ad_id = a.id WHERE s.user_id = $1', [userId]);
      savedRes.rows.forEach((r: any) => {
        if (r.category) topCategories[r.category.toLowerCase().trim()] = (topCategories[r.category.toLowerCase().trim()] || 0) + 3.0;
      });

    } catch (err) {
      console.error('[Recommendation Engine] Error fetching user vectors:', err);
    }
  }

  // 1. Query real Viralbook bulletin_ads from database
  const bulletinRes = await pool.query(
    `SELECT a.*,
            COALESCE((SELECT COUNT(*) FROM ad_stats WHERE ad_id = a.id AND type = 'click'), 0) as stats_clicks,
            COALESCE((SELECT COUNT(*) FROM bulletin_ad_likes WHERE ad_id = a.id), 0) as likes_count,
            COALESCE((SELECT COUNT(*) FROM bulletin_ad_comments WHERE ad_id = a.id), 0) as comments_count
     FROM bulletin_ads a
     WHERE a.status = 'approved' OR a.status IS NULL OR a.status = 'active'
     ORDER BY COALESCE(a.is_boosted, false) DESC, a.created_at DESC LIMIT 100`
  );

  // 2. Query real Viralbook bulletin_pages from database
  const pagesRes = await pool.query(
    `SELECT p.*,
            COALESCE((SELECT COUNT(*) FROM bulletin_page_followers WHERE page_id = p.id), 0) as followers_count
     FROM bulletin_pages p
     ORDER BY p.is_verified DESC, p.followers_count DESC LIMIT 30`
  );

  // 3. Query real AI tools from tool_orchestrator
  const toolsRes = await pool.query(
    `SELECT id, tool_id, task_description, task_description_ar, is_active
     FROM tool_orchestrator
     WHERE is_active = true
     LIMIT 30`
  );

  const scoredItems: any[] = [];

  const calculateScoreAndReasons = (item: any, type: string) => {
    let score = 55; // Baseline
    const reasons_en: string[] = [];
    const reasons_ar: string[] = [];
    let matchPercentage = 80;

    const key = `${type}:${item.id || item.tool_id || item.slug}`;
    if (dismissedItemKeys.has(key)) return null; // Exclude dismissed

    const cat = (item.category_en || item.category || item.category_ar || '').toString().toLowerCase().trim();
    const price = Number(item.price || item.price_amount || 0);

    if (cat && topCategories[cat]) {
      score += Math.min(30, topCategories[cat] * 5);
      reasons_en.push(`Based on your interest in ${item.category_en || item.category || 'this topic'}`);
      reasons_ar.push(`بناءً على اهتمامك بـ ${item.category_ar || item.category || 'هذا المجال'}`);
    }

    if (preferredCategories.some(pc => pc.toLowerCase().trim() === cat)) {
      score += 25;
      reasons_en.push(`Matches your saved preference: ${item.category_en || item.category}`);
      reasons_ar.push(`يتطابق مع تفضيلاتك المسجلة: ${item.category_ar || item.category}`);
    }

    // Dynamic Sovereign Memory System Integration
    userMemories.forEach((mem: any) => {
      const factText = (mem.fact || '').toLowerCase();
      const itemTitleEn = (item.title_en || item.title || item.name || item.tool_id || item.slug || '').toLowerCase();
      const itemDescEn = (item.description_en || item.description || item.task_description || '').toLowerCase();

      const memWords = factText.split(/[\s,،\.\-\[\]\:\(\)\|\/\'\"]+/).filter((w: string) => w.length > 3);
      const hasWordOverlap = memWords.some((word: string) => {
        if (['that', 'this', 'user', 'with', 'from', 'have', 'your', 'about', 'some', 'they', 'want', 'like', 'need', 'work', 'live'].includes(word)) return false;
        return itemTitleEn.includes(word) || itemDescEn.includes(word);
      });

      const memCat = (mem.category || '').toLowerCase();
      let categoryCorrelation = false;
      if (memCat === 'technical' && (cat.includes('tech') || cat.includes('ai_tools') || cat.includes('code') || cat.includes('developer'))) {
        categoryCorrelation = true;
      } else if (memCat === 'project' && (cat.includes('project') || cat.includes('business') || cat.includes('marketing') || cat.includes('commercial'))) {
        categoryCorrelation = true;
      }

      if (hasWordOverlap || categoryCorrelation) {
        score += 35;
        let snippet = mem.fact;
        if (snippet.length > 40) snippet = snippet.substring(0, 37) + '...';
        
        reasons_en.push(`Derived from your memory: "${snippet}"`);
        reasons_ar.push(`تم ترشيحه من ذاكرتك الموثقة: "${snippet}"`);
      }
    });

    if (item.is_boosted || item.is_verified) {
      score += 18;
      reasons_en.push('🔥 Verified Viralbook Feature');
      reasons_ar.push('🔥 محتوى/صفحة موثقة ورائجة على فايرال بوك');
    }

    if (Number(item.likes_count) > 5 || Number(item.followers_count) > 10 || Number(item.impressions_count) > 50) {
      score += 15;
      reasons_en.push('🌟 High User Satisfaction');
      reasons_ar.push('🌟 تفاعل مرتفع وموثق');
    }

    if (price >= preferredPriceMin && price <= preferredPriceMax) {
      score += 8;
    }

    if (reasons_en.length === 0) {
      if (type === 'bulletin') {
        reasons_en.push('📌 Recommended Viralbook Listing');
        reasons_ar.push('📌 منشور مقترح على شبكة فايرال بوك');
      } else if (type === 'page') {
        reasons_en.push('🏢 Verified Business Page on Viralbook');
        reasons_ar.push('🏢 صفحة تجارية موثقة على فايرال بوك');
      } else if (type === 'tool') {
        reasons_en.push('⚡ Recommended AI Productivity Assistant');
        reasons_ar.push('⚡ مساعد ذكاء اصطناعي مقترح لتسهيل عملك');
      }
    }

    matchPercentage = Math.min(99, Math.max(72, Math.round(score)));

    return {
      recommendation_id: key,
      item_type: type,
      item_id: item.id || item.tool_id || item.slug,
      score,
      match_percentage: matchPercentage,
      reasons_en,
      reasons_ar,
      data: item
    };
  };

  bulletinRes.rows.forEach((item: any) => {
    const scored = calculateScoreAndReasons(item, 'bulletin');
    if (scored) scoredItems.push(scored);
  });

  pagesRes.rows.forEach((page: any) => {
    const formattedPage = {
      ...page,
      title: page.name,
      title_ar: page.name,
      title_en: page.name,
      image_url: page.avatar_url,
      cover_url: page.cover_url,
      category_ar: page.category || 'صفحة تجارية',
      category_en: page.category || 'Business Page'
    };
    const scored = calculateScoreAndReasons(formattedPage, 'page');
    if (scored) scoredItems.push(scored);
  });

  toolsRes.rows.forEach((tool: any) => {
    const formattedTool = {
      ...tool,
      title_en: tool.tool_id ? tool.tool_id.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : 'AI Tool',
      title_ar: tool.task_description_ar || tool.tool_id || 'أداة ذكية',
      description_en: tool.task_description || 'AI Tool Assistant',
      description_ar: tool.task_description_ar || 'أداة ذكاء اصطناعي',
      category_en: 'ai_tools',
      category_ar: 'أدوات الذكاء الاصطناعي'
    };
    const scored = calculateScoreAndReasons(formattedTool, 'tool');
    if (scored) scoredItems.push(scored);
  });

  scoredItems.sort((a, b) => b.score - a.score);

  const topPicks = scoredItems.slice(0, limit);
  const avgMatch = topPicks.length > 0
    ? Math.round(topPicks.reduce((acc, curr) => acc + curr.match_percentage, 0) / topPicks.length)
    : 88;

  return {
    top_picks: topPicks,
    by_type: {
      bulletin: scoredItems.filter(i => i.item_type === 'bulletin').slice(0, 10),
      pages: scoredItems.filter(i => i.item_type === 'page').slice(0, 6),
      tools: scoredItems.filter(i => i.item_type === 'tool').slice(0, 6)
    },
    user_summary: {
      top_inferred_categories: Object.entries(topCategories)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([cat]) => cat),
      preferred_categories: preferredCategories,
      total_recommendations: scoredItems.length,
      avg_match_percentage: avgMatch
    }
  };
}

/**
 * GET /api/recommendations
 * Unified recommendation endpoint - strictly personalized for authenticated user
 */
router.get('/', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const limit = Number(req.query.limit) || 12;
    const data = await generateRecommendationsForUser(userId, { limit });
    res.json({
      success: true,
      recommendations: data.top_picks,
      categorized: data.by_type,
      user_summary: data.user_summary
    });
  } catch (error: any) {
    console.error('[Recommendations API] GET Error:', error);
    res.status(500).json({ error: 'Failed generating recommendations' });
  }
});

/**
 * GET /api/recommendations/marketplace (Legacy compatibility handler - returns empty array)
 */
router.get('/marketplace', authenticateToken, async (req: any, res: any) => {
  res.json({
    success: true,
    items: []
  });
});

/**
 * GET /api/recommendations/bulletin
 */
router.get('/bulletin', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const data = await generateRecommendationsForUser(userId, { limit: 20 });
    res.json({
      success: true,
      items: data.by_type.bulletin || []
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed fetching bulletin recommendations', items: [] });
  }
});

router.get('/bulletins', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const data = await generateRecommendationsForUser(userId, { limit: 20 });
    res.json({
      success: true,
      items: data.by_type.bulletin || []
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed fetching bulletin recommendations', items: [] });
  }
});

/**
 * GET /api/recommendations/tool
 */
router.get('/tool', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const data = await generateRecommendationsForUser(userId, { limit: 20 });
    res.json({
      success: true,
      items: data.by_type.tools || []
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed fetching tool recommendations', items: [] });
  }
});

router.get('/tools', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const data = await generateRecommendationsForUser(userId, { limit: 20 });
    res.json({
      success: true,
      items: data.by_type.tools || []
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed fetching tool recommendations', items: [] });
  }
});

/**
 * GET /api/recommendations/page
 */
router.get('/page', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const data = await generateRecommendationsForUser(userId, { limit: 20 });
    res.json({
      success: true,
      items: data.by_type.pages || []
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed fetching page recommendations', items: [] });
  }
});

router.get('/pages', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const data = await generateRecommendationsForUser(userId, { limit: 20 });
    res.json({
      success: true,
      items: data.by_type.pages || []
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed fetching page recommendations', items: [] });
  }
});

/**
 * POST /api/recommendations/track
 * Track interaction event (views, clicks, saves, purchases, searches)
 */
router.post('/track', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { item_type, item_id, item_key, action_type, category, weight } = req.body;

    if (!item_type || !action_type) {
      return res.status(400).json({ error: 'item_type and action_type are required' });
    }

    let defaultWeight = 1.0;
    if (action_type === 'purchase') defaultWeight = 5.0;
    else if (action_type === 'inquire' || action_type === 'save' || action_type === 'like') defaultWeight = 3.0;
    else if (action_type === 'click') defaultWeight = 1.5;
    else if (action_type === 'view') defaultWeight = 0.5;
    else if (action_type === 'dismiss') defaultWeight = -2.0;

    await pool.query(
      `INSERT INTO user_recommendation_interactions 
        (user_id, item_type, item_id, item_key, action_type, category, weight)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        item_type,
        item_id || null,
        item_key || null,
        action_type,
        category || null,
        weight || defaultWeight
      ]
    );

    res.json({ success: true, message: 'Interaction recorded' });
  } catch (error: any) {
    console.error('[Recommendations API] Track Error:', error);
    res.status(500).json({ error: 'Failed recording recommendation interaction' });
  }
});

/**
 * POST /api/recommendations/feedback
 * Negative/Positive explicit feedback (e.g., "Not Interested")
 */
router.post('/feedback', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { item_type, item_id, item_key, feedback_type } = req.body;

    if (!item_type || !feedback_type) {
      return res.status(400).json({ error: 'item_type and feedback_type are required' });
    }

    await pool.query(
      `INSERT INTO recommendation_feedback (user_id, item_type, item_id, item_key, feedback_type)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, item_type, item_id || null, item_key || null, feedback_type]
    );

    if (feedback_type === 'not_interested' || feedback_type === 'dismissed') {
      await pool.query(
        `INSERT INTO user_recommendation_interactions (user_id, item_type, item_id, item_key, action_type, weight)
         VALUES ($1, $2, $3, $4, 'dismiss', -3.0)`,
        [userId, item_type, item_id || null, item_key || null]
      );
    }

    res.json({ success: true, message: 'Feedback recorded successfully' });
  } catch (error: any) {
    console.error('[Recommendations API] Feedback Error:', error);
    res.status(500).json({ error: 'Failed saving feedback' });
  }
});

/**
 * GET /api/recommendations/preferences
 */
router.get('/preferences', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const prefRes = await pool.query(
      'SELECT preferred_categories, preferred_price_range, explicit_interests FROM user_recommendation_preferences WHERE user_id = $1',
      [userId]
    );

    if (prefRes.rows.length === 0) {
      return res.json({
        success: true,
        preferences: {
          preferred_categories: [],
          preferred_price_range: { min: 0, max: 10000 },
          explicit_interests: []
        }
      });
    }

    res.json({
      success: true,
      preferences: prefRes.rows[0]
    });
  } catch (error: any) {
    console.error('[Recommendations API] GET Preferences Error:', error);
    res.status(500).json({ error: 'Failed retrieving user preferences' });
  }
});

/**
 * PUT /api/recommendations/preferences
 */
router.put('/preferences', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { preferred_categories, preferred_price_range, explicit_interests } = req.body;

    await pool.query(
      `INSERT INTO user_recommendation_preferences (user_id, preferred_categories, preferred_price_range, explicit_interests, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) DO UPDATE SET
         preferred_categories = EXCLUDED.preferred_categories,
         preferred_price_range = EXCLUDED.preferred_price_range,
         explicit_interests = EXCLUDED.explicit_interests,
         updated_at = CURRENT_TIMESTAMP`,
      [
        userId,
        JSON.stringify(preferred_categories || []),
        JSON.stringify(preferred_price_range || { min: 0, max: 10000 }),
        JSON.stringify(explicit_interests || [])
      ]
    );

    res.json({ success: true, message: 'Recommendation preferences updated successfully' });
  } catch (error: any) {
    console.error('[Recommendations API] PUT Preferences Error:', error);
    res.status(500).json({ error: 'Failed updating user preferences' });
  }
});

export default router;
