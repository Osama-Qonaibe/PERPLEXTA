import express from 'express';
import { pool as corePool, getExternalPool } from '../db/index.js';
import { authenticateToken, authenticateAdmin } from '../middleware/auth.js';
import { io } from '../config/socket.js';
import { pingSearchEngines } from '../services/sitemapPinger.js';

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

router.get('/articles', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 100);
    const offset = (page - 1) * limit;

    const result = await pool.query(`
      SELECT b.*, 
             COALESCE(COUNT(DISTINCT bc.id), 0)::int as comment_count,
             COALESCE(ratings.avg_rate, 0.0) as avg_rating,
             COALESCE(ratings.rate_count, 0) as ratings_count
      FROM blog_articles b
      LEFT JOIN blog_comments bc ON b.id = bc.article_id
      LEFT JOIN (
        SELECT article_id, ROUND(AVG(rating), 1)::float as avg_rate, COUNT(*) as rate_count
        FROM blog_ratings
        GROUP BY article_id
      ) ratings ON b.id = ratings.article_id
      GROUP BY b.id, ratings.avg_rate, ratings.rate_count
      ORDER BY b.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    await hydrateAuthors(result.rows, 'author_id');
    res.json(result.rows);
  } catch (error: any) {
    console.error('Failed to fetch blog articles:', error);
    res.status(500).json({ error: 'Failed to fetch blog articles' });
  }
});

router.get('/articles/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
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

router.post('/articles', authenticateToken, authenticateAdmin, async (req: any, res) => {
  const { title_en, title_ar, content_en, content_ar, image_url, category_en, category_ar, slug } = req.body;
  
  if (!title_en || !title_ar || !content_en || !content_ar || !category_en || !category_ar) {
    return res.status(400).json({ error: 'Titles, contents, and categories are required in English and Arabic' });
  }

  if (image_url && !isSafeUrl(image_url)) {
    return res.status(400).json({ error: 'Insecure or invalid image URL' });
  }

  const finalSlug = slug ? slugify(slug) : slugify(title_en) + '-' + Date.now();

  try {
    const result = await pool.query(`
      INSERT INTO blog_articles (author_id, slug, title_en, title_ar, content_en, content_ar, image_url, category_en, category_ar)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [req.user.id, finalSlug, title_en, title_ar, content_en, content_ar, image_url, category_en, category_ar]);

    const liveArticle = result.rows[0];

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

        if (io) {
          io.emit('new_blog_article', {
            id: liveArticle.id,
            slug: finalSlug,
            title_en,
            title_ar
          });
        }

        await pingSearchEngines(req);
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

router.put('/articles/:id', authenticateToken, authenticateAdmin, async (req: any, res) => {
  const { id } = req.params;
  const { title_en, title_ar, content_en, content_ar, image_url, category_en, category_ar, slug } = req.body;

  if (!title_en || !title_ar || !content_en || !content_ar || !category_en || !category_ar) {
    return res.status(400).json({ error: 'All fields are required' });
  }

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

router.post('/articles/:id/rate', authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  const { rating } = req.body;

  if (rating === undefined || rating < 1 || rating > 5 || !Number.isInteger(Number(rating))) {
    return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
  }

  try {
    await pool.query(`
      INSERT INTO blog_ratings (article_id, user_id, rating)
      VALUES ($1, $2, $3)
      ON CONFLICT (article_id, user_id)
      DO UPDATE SET rating = EXCLUDED.rating
    `, [id, req.user.id, rating]);

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

export async function ensureBlogSeedData() {
  try {
    const extTarget = getExternalPool();
    await extTarget.query(`
      CREATE TABLE IF NOT EXISTS blog_articles (
        id SERIAL PRIMARY KEY,
        author_id INTEGER NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        title_en VARCHAR(255) NOT NULL,
        title_ar VARCHAR(255) NOT NULL,
        content_en TEXT NOT NULL,
        content_ar TEXT NOT NULL,
        image_url TEXT,
        category_en VARCHAR(100) NOT NULL,
        category_ar VARCHAR(100) NOT NULL,
        views INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await extTarget.query(`
      CREATE TABLE IF NOT EXISTS blog_comments (
        id SERIAL PRIMARY KEY,
        article_id INTEGER NOT NULL REFERENCES blog_articles(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await extTarget.query(`
      CREATE TABLE IF NOT EXISTS blog_ratings (
        id SERIAL PRIMARY KEY,
        article_id INTEGER NOT NULL REFERENCES blog_articles(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (article_id, user_id)
      );
    `);

    const countRes = await extTarget.query('SELECT COUNT(*)::int as count FROM blog_articles');
    if (countRes.rows[0].count === 0) {
      let authorId = 1;
      try {
        const userRes = await corePool.query("SELECT id FROM users ORDER BY (role = 'admin') DESC, id ASC LIMIT 1");
        if (userRes.rows.length > 0) {
          authorId = userRes.rows[0].id;
        }
      } catch (err) {
        console.warn('[Blog Seed] Could not retrieve user, defaulting author_id to 1');
      }

      const articles = [
        {
          slug: 'ai-technical-analysis-2026-breakthrough',
          title_en: 'AI-Powered Technical Analysis: How Machine Learning Transforms Market Structure',
          title_ar: 'التحليل الفني المعزز بالذكاء الاصطناعي: كيف يُعيد التعلم الآلي تشكيل قراءة النماذج السعرية',
          category_en: 'Technical Analysis',
          category_ar: 'التحليل الفني',
          image_url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=80',
          views: 1420,
          content_en: `# AI-Powered Technical Analysis: A Quantitative Paradigm

Technical analysis is experiencing a monumental evolution. By combining deep neural networks with real-time liquidity cluster detection, analysts can now identify institutional order blocks, Fair Value Gaps (FVG), and high-probability breakout zones with millisecond precision.

### Key Technological Pillars:
1. **Algorithmic Liquidity Mapping**: Real-time identification of buy-side and sell-side liquidity pools.
2. **Multi-Timeframe Confluence**: Synchronous evaluation across tick, 5-minute, and daily aggregations.
3. **Adaptive Volatility Bounds**: Dynamic ATR and Bollinger normalization calibrated for macroeconomic releases.

*Perplexta Analysis Engine leverages dual-system neural checkpoints to ensure zero-hallucination signal verification.*`,
          content_ar: `# التحليل الفني المعزز بالذكاء الاصطناعي: نقلة نوعية كمية

يمر التحليل الفني بنقلة تاريخية في دقة التنبؤ وقراءة الأسواق. عبر دمج الشبكات العصبية العميقة مع خوارزميات رصد كتل السيولة (Order Blocks) والفجوات السعرية العادلة (FVG)، بات بمقدور المحللين والمتداولين رصد مناطق التجميع والتصريف المؤسسية بدقة متناهية.

### الركائز التكنولوجية الأساسية:
1. **الرصد الآلي لمناطق السيولة**: تعقب تجمعات أوامر الشراء والبيع الكبرى على مختلف الأطر الزمنية.
2. **التوافق المتعدد للأطر الزمنية**: مواءمة لحظية بين الفواصل الصغيرة (5 دقائق) والأطر اليومية الكبرى.
3. **نطاقات التذبذب المتكيفة**: معايرة ديناميكية لمؤشرات ATR والبولنجر لتجاوز الضوضاء السعرية اللحظية.

*يوفر محرك Perplexta تحليلاً كمياً صارماً يعتمد على خوارزميات مطابقة الأنماط وتأكيد أحجام التداول الحقيقية.*`
        },
        {
          slug: 'quantitative-trading-systems-resilience',
          title_en: 'Building Resilient Quantitative Trading Systems with Dual-Model Architectures',
          title_ar: 'بناء استراتيجيات التداول الكمي عالية المرونة باستخدام بنية النماذج المزدوجة',
          category_en: 'Quantitative Trading',
          category_ar: 'التداول الكمي',
          image_url: 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?auto=format&fit=crop&w=1200&q=80',
          views: 980,
          content_en: `# Zero-Downtime Financial Engineering

Modern quantitative execution demands failover mechanics that transition seamlessly when latency spikes or provider rate limits are encountered.

### The Perplexta Dual Architecture:
- **Silent Failover Orchestration**: Instant fallback across distributed inference endpoints with in-memory key stores.
- **Strict Risk Budgets**: Real-time position sizing based on portfolio variance and Kelly criterion parameters.
- **Append-Only Financial Ledger**: Immutable transactional records guaranteeing cryptographic auditability.`,
          content_ar: `# الهندسة المالية فائقة المرونة والاستقرار

يتطلب التنفيذ الكمي الحديث محركات مخاطر فائقة المتانة قادرة على التبديل الصامت (Silent Failover) والتنفيذ اللحظي في أجزاء من الألف من الثانية دون أي انقطاع أثناء جلسات التذبذب العالي.

### البنية الهندسية لمنصة Perplexta:
- **التوجيه الذكي والتبديل الصامت**: انتقال فوري بين نماذج الذكاء الاصطناعي والمزودين عند وصول حدود الاستهلاك.
- **إدارة المخاطر الصارمة**: حساب الحجم الأمثل للصفقات بناءً على تباين المحفظة ومعادلة كيلي.
- **سجل المعاملات غير القابل للتعديل**: توثيق فوري لكافة العمليات والتحليلات ضمن بيئة مشفرة ومحمية.`
        },
        {
          slug: 'enterprise-security-and-zero-trust-vaults',
          title_en: 'Zero-Trust Architecture & AES-256 Encryption in Financial Intelligence Systems',
          title_ar: 'هندسة انعدام الثقة (Zero-Trust) والتشفير العسكري في منصات الاستخبارات المالية',
          category_en: 'Security & Infrastructure',
          category_ar: 'الأمان والبنية التحتية',
          image_url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=80',
          views: 840,
          content_en: `# Institutional Security Standards

Protecting proprietary trading strategies, private API credentials, and financial transactions requires multi-layered defense-in-depth:
- **In-Memory AES-256 Secret Decryption**: Keys are decrypted at runtime in milliseconds without filesystem exposure.
- **Strict Database Segregation**: Operational metadata is fully isolated from the financial ledger vault.
- **Multi-Factor Verification**: Cryptographic signatures validate every sensitive administrative action.`,
          content_ar: `# المعايير الأمنية المؤسسية لحماية البيانات

الأمان الرقمي ليس مجرد ميزة إضافية، بل هو الركيزة الجوهرية لمنصات التحليل المؤسسية.
- **التشفير الفوري AES-256 في الذاكرة**: قراءة المفاتيح السرية في 0.001ms دون تخزينها كنصوص مكشوفة.
- **العزل التام لقواعد البيانات**: فصل قاعدة البيانات التشغيلية عن قاعدة البيانات المالية وسجل الحسابات (Ledger).
- **التحقق متعدد المراحل**: توثيق رقمي صارم لكافة العمليات الإدارية الحساسة وتغييرات النظام.`
        },
        {
          slug: 'nlp-sentiment-alpha-financial-markets',
          title_en: 'Deciphering Market Sentiment: Real-Time NLP for Macro News & Social Alpha',
          title_ar: 'فك شفرة المشاعر السوقية: معالجة اللغات الطبيعية الحية لتحليل الأخبار الاقتصادية',
          category_en: 'Artificial Intelligence',
          category_ar: 'الذكاء الاصطناعي',
          image_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
          views: 1120,
          content_en: `# Macro Intelligence & Natural Language Processing

How large language models transform breaking central bank statements, macroeconomic releases, and earnings calls into quantified market bias.

- **Entity & Metric Extraction**: Isolating CPI, Interest Rate guidance, and labor statistics from unstructured transcripts.
- **Context-Aware Sentiment Scoring**: Differentiating between hawkish nuance and dovish market pauses.
- **Correlation Mapping**: Assessing cross-asset impact across FX, Commodities, and Equities.`,
          content_ar: `# معالجة اللغات الطبيعية لتحليل المشاعر والبيانات الاقتصادية

كيف تحول تقنيات الذكاء الاصطناعي ومعالجة اللغات الطبيعية (NLP) المتقدمة بيانات البنوك المركزية ومؤشرات التضخم إلى إشارات احتمالية دقيقة لدعم القرار الاستثماري.

- **استخراج المؤشرات الحيوية**: استخلاص بيانات الفائدة، ومعدلات التضخم (CPI) وسوق العمل آلياً وفور صدورها.
- **تحديد نبرة الخطاب النقدي**: التمييز الدقيق بين التشدد والتيسير النقدي في تصريحات صناع القرار.
- **رسم خريطة الارتباطات**: قياس التأثير المتبادل بين العملات، السلع، ومؤشرات الأسهم العالمية.`
        }
      ];

      for (const a of articles) {
        const insRes = await extTarget.query(`
          INSERT INTO blog_articles (author_id, slug, title_en, title_ar, content_en, content_ar, image_url, category_en, category_ar, views)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING id
        `, [authorId, a.slug, a.title_en, a.title_ar, a.content_en, a.content_ar, a.image_url, a.category_en, a.category_ar, a.views]);

        const artId = insRes.rows[0].id;
        // Add sample ratings
        await extTarget.query(`
          INSERT INTO blog_ratings (article_id, user_id, rating)
          VALUES ($1, $2, 5)
          ON CONFLICT DO NOTHING
        `, [artId, authorId]).catch(() => {});
      }

      console.log(`[Blog Seed] Successfully seeded ${articles.length} rich articles into blog_articles.`);
    }
  } catch (err: any) {
    console.error('[Blog Seed] Failed to ensure blog seed data:', err.message);
  }
}

export default router;
