import { pool, externalPool } from '../db/index.js';

export function slugify(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s\u0600-\u06FF-]/g, '') // Keep alphanumeric, spaces, hyphens, and Arabic chars
    .replace(/[\s_-]+/g, '-')              // Replace spaces/dashes with single dash
    .replace(/^-+|-+$/g, '');              // Trim leading/trailing dashes
}

export function extractDescription(text: string, maxLength: number = 160): string {
  if (!text || typeof text !== 'string') return '';
  const clean = text
    .replace(/<[^>]*>/g, ' ')               // Remove HTML tags
    .replace(/[#*`_\[\]()]/g, ' ')           // Remove markdown formatting
    .replace(/\s+/g, ' ')                    // Normalize spaces
    .trim();

  if (clean.length <= maxLength) return clean;
  return clean.slice(0, maxLength - 3).trim() + '...';
}

const STOP_WORDS_EN = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can', 'can\'t', 'cannot',
  'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has',
  'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into',
  'is', 'it', 'its', 'itself', 'just', 'more', 'most', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or',
  'other', 'our', 'ours', 'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than', 'that', 'the',
  'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too',
  'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why',
  'with', 'would', 'you', 'your', 'yours'
]);

const STOP_WORDS_AR = new Set([
  'في', 'من', 'على', 'عن', 'إلى', 'مع', 'هذا', 'هذه', 'تم', 'أو', 'أن', 'إن', 'التي', 'الذي', 'الذين', 'اللاتي', 'اللواتي',
  'كان', 'كانت', 'يكون', 'تكون', 'بين', 'حتى', 'إذا', 'كل', 'بعد', 'قبل', 'عند', 'حيث', 'غير', 'قد', 'لم', 'لن', 'لا',
  'ما', 'هو', 'هي', 'هم', 'هن', 'أنا', 'نحن', 'أنت', 'أنتما', 'أنتم', 'ذلك', 'تلك', 'هؤلاء', 'أولئك', 'عبر', 'منذ'
]);

const TRENDING_KEYWORDS_EN = [
  'ai automation', 'enterprise software', 'cloud scaling', 'fullstack development', 
  'realtime analytics', 'secure api', 'modern dashboard', 'nextjs performance', 
  'postgresql optimization', 'ux design system', 'saas growth', 'scalable architecture'
];

const TRENDING_KEYWORDS_AR = [
  'الذكاء الاصطناعي والأتمتة', 'تطوير البرمجيات', 'تحليلات الوقت الفعلي', 'أمن البيانات السحابية', 
  'لوحة تحكم ذكية', 'تطوير الويب الشامل', 'تحسين الأداء', 'قواعد بيانات عالية الأداء', 'تصميم واجهات حديثة', 'الحوسبة السحابية'
];

export function extractKeywords(title: string, category: string, bodyText: string = '', lang: 'en' | 'ar' = 'en'): string {
  const fullText = `${title || ''} ${category || ''} ${bodyText || ''}`;
  const clean = fullText
    .replace(/<[^>]*>/g, ' ')
    .replace(/[#*`_\[\]():;,.!?"'–—]/g, ' ')
    .toLowerCase();

  const words = clean.split(/\s+/).filter(w => w.length > 2);
  const stopWords = lang === 'ar' ? STOP_WORDS_AR : STOP_WORDS_EN;
  const uniqueKeywords: string[] = [];
  const seen = new Set<string>();

  // Prioritize title & category keywords
  const titleWords = `${title || ''} ${category || ''}`
    .replace(/<[^>]*>/g, ' ')
    .replace(/[#*`_\[\]():;,.!?"'–—]/g, ' ')
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 2);

  for (const w of titleWords) {
    if (!stopWords.has(w) && !seen.has(w)) {
      seen.add(w);
      uniqueKeywords.push(w);
    }
  }

  for (const w of words) {
    if (uniqueKeywords.length >= 7) break;
    if (!stopWords.has(w) && !seen.has(w)) {
      seen.add(w);
      uniqueKeywords.push(w);
    }
  }

  // Blend in trending high-performing keywords based on content similarity and search trends
  const trendingPool = lang === 'ar' ? TRENDING_KEYWORDS_AR : TRENDING_KEYWORDS_EN;
  for (const trend of trendingPool) {
    if (uniqueKeywords.length >= 10) break;
    const trendLower = trend.toLowerCase();
    if (clean.includes(trendLower.split(' ')[0]) || uniqueKeywords.length < 5) {
      if (!seen.has(trend)) {
        seen.add(trend);
        uniqueKeywords.push(trend);
      }
    }
  }

  return uniqueKeywords.join(', ');
}

let aiEnabled = true;

export async function generateSeoWithAi(
  type: 'blog' | 'marketplace' | 'bulletin',
  itemData: {
    title_en?: string;
    title_ar?: string;
    content_en?: string;
    content_ar?: string;
    description_en?: string;
    description_ar?: string;
    category_en?: string;
    category_ar?: string;
    technologies?: string;
    features?: string;
  }
) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !aiEnabled) return null;

  try {
    const { GoogleGenAI, Type } = await import('@google/genai');
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const prompt = `You are a professional SEO Specialist for Perplexta Platform. Generate high-ranking, engaging SEO metadata for a ${type === 'blog' ? 'blog article' : type === 'bulletin' ? 'bulletin advertisement' : 'marketplace product'}.
Title (EN): ${itemData.title_en || ''}
Title (AR): ${itemData.title_ar || ''}
Category (EN): ${itemData.category_en || ''}
Category (AR): ${itemData.category_ar || ''}
Context / Content (EN): ${(itemData.content_en || itemData.description_en || '').slice(0, 1000)}
Context / Content (AR): ${(itemData.content_ar || itemData.description_ar || '').slice(0, 1000)}
${itemData.technologies ? `Technologies: ${itemData.technologies}` : ''}
${itemData.features ? `Features: ${itemData.features}` : ''}

Generate JSON with:
1. meta_title_en: Punchy English SEO title max 60 chars ending with "| Perplexta"
2. meta_title_ar: Punchy Arabic SEO title max 60 chars ending with "| بيربليكستا"
3. meta_description_en: Concise English meta description (130-155 characters)
4. meta_description_ar: Concise Arabic meta description (130-155 characters)
5. keywords_en: 8-10 high-performing comma-separated keywords in English optimized with content similarity and trending search data
6. keywords_ar: 8-10 high-performing comma-separated keywords in Arabic optimized with content similarity and trending search data`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            meta_title_en: { type: Type.STRING },
            meta_title_ar: { type: Type.STRING },
            meta_description_en: { type: Type.STRING },
            meta_description_ar: { type: Type.STRING },
            keywords_en: { type: Type.STRING },
            keywords_ar: { type: Type.STRING },
          },
          required: [
            'meta_title_en',
            'meta_title_ar',
            'meta_description_en',
            'meta_description_ar',
            'keywords_en',
            'keywords_ar',
          ],
        },
      },
    });

    if (response && response.text) {
      const parsed = JSON.parse(response.text.trim());
      return parsed;
    }
  } catch (err: any) {
    if (err.status === 400 || (err.message && err.message.includes('API key'))) {
      aiEnabled = false;
      console.error('[SEOSync] AI SEO generation disabled due to invalid API key.');
    } else {
      console.warn(`[SEOSync] AI SEO generation fallback due to error:`, err.message || err);
    }
  }
  return null;
}

async function ensureTableColumns(client: any, tableName: string, columns: Record<string, string>) {
  const tableCheck = await client.query(
    `SELECT table_name FROM information_schema.tables WHERE table_name = $1`,
    [tableName]
  );
  if (tableCheck.rows.length === 0) {
    console.warn(`[SEOSync] Table "${tableName}" does not exist. Skipping column checks.`);
    return;
  }

  const existingRes = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
    [tableName]
  );
  const existingSet = new Set(existingRes.rows.map((r: any) => r.column_name));

  for (const [col, colType] of Object.entries(columns)) {
    if (!existingSet.has(col)) {
      console.log(`[SEOSync] Adding missing column "${col}" (${colType}) to "${tableName}"...`);
      await client.query(`ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${col} ${colType}`);
    }
  }
}

export async function syncBlogArticlesMetadata() {
  const db = externalPool || pool;
  if (!db) {
    console.error('[SEOSync] Core/External Database pool is not initialized');
    return { totalChecked: 0, updatedCount: 0, updatedIds: [], message: 'Database not connected' };
  }

  // Ensure metadata columns exist
  await ensureTableColumns(db, 'blog_articles', {
    meta_title_en: 'VARCHAR(255)',
    meta_title_ar: 'VARCHAR(255)',
    meta_description_en: 'TEXT',
    meta_description_ar: 'TEXT',
    keywords_en: 'TEXT',
    keywords_ar: 'TEXT',
    og_image_url: 'TEXT'
  });

  const res = await db.query(`
    SELECT id, slug, title_en, title_ar, content_en, content_ar, image_url, category_en, category_ar,
           meta_title_en, meta_title_ar, meta_description_en, meta_description_ar, keywords_en, keywords_ar, og_image_url
    FROM blog_articles
    WHERE slug IS NULL OR TRIM(slug) = ''
       OR meta_title_en IS NULL OR TRIM(meta_title_en) = ''
       OR meta_title_ar IS NULL OR TRIM(meta_title_ar) = ''
       OR meta_description_en IS NULL OR TRIM(meta_description_en) = ''
       OR meta_description_ar IS NULL OR TRIM(meta_description_ar) = ''
       OR keywords_en IS NULL OR TRIM(keywords_en) = ''
       OR keywords_ar IS NULL OR TRIM(keywords_ar) = ''
       OR og_image_url IS NULL OR TRIM(og_image_url) = ''
    ORDER BY id ASC
  `);

  let updatedCount = 0;
  let aiProcessedCount = 0;
  const updatedIds: number[] = [];

  for (const row of res.rows) {
    let needsUpdate = false;
    let {
      slug,
      title_en,
      title_ar,
      content_en,
      content_ar,
      image_url,
      category_en,
      category_ar,
      meta_title_en,
      meta_title_ar,
      meta_description_en,
      meta_description_ar,
      keywords_en,
      keywords_ar,
      og_image_url
    } = row;

    const needsAiMetadata =
      !meta_title_en || !meta_title_en.trim() ||
      !meta_title_ar || !meta_title_ar.trim() ||
      !meta_description_en || !meta_description_en.trim() ||
      !meta_description_ar || !meta_description_ar.trim() ||
      !keywords_en || !keywords_en.trim() ||
      !keywords_ar || !keywords_ar.trim();

    let aiData: any = null;
    if (needsAiMetadata) {
      aiData = await generateSeoWithAi('blog', {
        title_en,
        title_ar,
        content_en,
        content_ar,
        category_en,
        category_ar,
      });
      if (aiData) aiProcessedCount++;
    }

    if (!slug || !slug.trim()) {
      slug = `article-${row.id}-${slugify(title_en || title_ar || 'post')}`;
      needsUpdate = true;
    }

    if (!meta_title_en || !meta_title_en.trim()) {
      meta_title_en = aiData?.meta_title_en || `${(title_en || 'Article').trim()} | Perplexta Blog`.slice(0, 255);
      needsUpdate = true;
    }

    if (!meta_title_ar || !meta_title_ar.trim()) {
      meta_title_ar = aiData?.meta_title_ar || `${(title_ar || 'مقال').trim()} | مدونة بيربليكستا`.slice(0, 255);
      needsUpdate = true;
    }

    if (!meta_description_en || !meta_description_en.trim()) {
      meta_description_en = aiData?.meta_description_en || extractDescription(content_en || title_en || '');
      needsUpdate = true;
    }

    if (!meta_description_ar || !meta_description_ar.trim()) {
      meta_description_ar = aiData?.meta_description_ar || extractDescription(content_ar || title_ar || '');
      needsUpdate = true;
    }

    if (!keywords_en || !keywords_en.trim()) {
      keywords_en = aiData?.keywords_en || extractKeywords(title_en || '', category_en || '', content_en || '', 'en');
      needsUpdate = true;
    }

    if (!keywords_ar || !keywords_ar.trim()) {
      keywords_ar = aiData?.keywords_ar || extractKeywords(title_ar || '', category_ar || '', content_ar || '', 'ar');
      needsUpdate = true;
    }

    if (!og_image_url || !og_image_url.trim()) {
      og_image_url = image_url && image_url.trim() ? image_url.trim() : '/app-assets/og-image.jpg';
      needsUpdate = true;
    }

    if (needsUpdate) {
      await db.query(
        `UPDATE blog_articles
         SET slug = $1,
             meta_title_en = $2,
             meta_title_ar = $3,
             meta_description_en = $4,
             meta_description_ar = $5,
             keywords_en = $6,
             keywords_ar = $7,
             og_image_url = $8,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $9`,
        [slug, meta_title_en, meta_title_ar, meta_description_en, meta_description_ar, keywords_en, keywords_ar, og_image_url, row.id]
      );
      updatedCount++;
      updatedIds.push(row.id);
    }
  }

  return {
    totalChecked: res.rows.length,
    updatedCount,
    aiProcessedCount,
    updatedIds,
    message: `Successfully synchronized metadata for ${updatedCount} blog articles.`
  };
}

export async function syncMarketplaceItemsMetadata() {
  if (!pool) {
    console.error('[SEOSync] Core Database pool is not initialized');
    return { totalChecked: 0, updatedCount: 0, updatedIds: [], message: 'Database not connected' };
  }

  // Ensure metadata columns exist
  await ensureTableColumns(pool, 'marketplace_items', {
    slug: 'VARCHAR(255)',
    meta_title_en: 'VARCHAR(255)',
    meta_title_ar: 'VARCHAR(255)',
    meta_description_en: 'TEXT',
    meta_description_ar: 'TEXT',
    keywords_en: 'TEXT',
    keywords_ar: 'TEXT',
    og_image_url: 'TEXT'
  });

  const res = await pool.query(`
    SELECT id, slug, title_en, title_ar, description_en, description_ar, category_en, category_ar,
           image_url, preview_url, features, technologies,
           meta_title_en, meta_title_ar, meta_description_en, meta_description_ar, keywords_en, keywords_ar, og_image_url
    FROM marketplace_items
    WHERE slug IS NULL OR TRIM(slug) = ''
       OR meta_title_en IS NULL OR TRIM(meta_title_en) = ''
       OR meta_title_ar IS NULL OR TRIM(meta_title_ar) = ''
       OR meta_description_en IS NULL OR TRIM(meta_description_en) = ''
       OR meta_description_ar IS NULL OR TRIM(meta_description_ar) = ''
       OR keywords_en IS NULL OR TRIM(keywords_en) = ''
       OR keywords_ar IS NULL OR TRIM(keywords_ar) = ''
       OR og_image_url IS NULL OR TRIM(og_image_url) = ''
    ORDER BY id ASC
  `);

  let updatedCount = 0;
  let aiProcessedCount = 0;
  const updatedIds: number[] = [];

  for (const row of res.rows) {
    let needsUpdate = false;
    let {
      slug,
      title_en,
      title_ar,
      description_en,
      description_ar,
      category_en,
      category_ar,
      image_url,
      preview_url,
      features,
      technologies,
      meta_title_en,
      meta_title_ar,
      meta_description_en,
      meta_description_ar,
      keywords_en,
      keywords_ar,
      og_image_url
    } = row;

    const needsAiMetadata =
      !meta_title_en || !meta_title_en.trim() ||
      !meta_title_ar || !meta_title_ar.trim() ||
      !meta_description_en || !meta_description_en.trim() ||
      !meta_description_ar || !meta_description_ar.trim() ||
      !keywords_en || !keywords_en.trim() ||
      !keywords_ar || !keywords_ar.trim();

    let aiData: any = null;
    if (needsAiMetadata) {
      aiData = await generateSeoWithAi('marketplace', {
        title_en,
        title_ar,
        description_en,
        description_ar,
        category_en,
        category_ar,
        technologies,
        features,
      });
      if (aiData) aiProcessedCount++;
    }

    if (!slug || !slug.trim()) {
      slug = `item-${row.id}-${slugify(title_en || title_ar || 'product')}`;
      needsUpdate = true;
    }

    if (!meta_title_en || !meta_title_en.trim()) {
      const baseTitle = title_en ? title_en.trim() : 'Marketplace Item';
      const categorySuffix = category_en ? ` - ${category_en.trim()}` : '';
      meta_title_en = aiData?.meta_title_en || `${baseTitle}${categorySuffix} | Perplexta Marketplace`.slice(0, 255);
      needsUpdate = true;
    }

    if (!meta_title_ar || !meta_title_ar.trim()) {
      const baseTitleAr = title_ar ? title_ar.trim() : 'منتج رقمي';
      const categorySuffixAr = category_ar ? ` - ${category_ar.trim()}` : '';
      meta_title_ar = aiData?.meta_title_ar || `${baseTitleAr}${categorySuffixAr} | متجر بيربليكستا`.slice(0, 255);
      needsUpdate = true;
    }

    if (!meta_description_en || !meta_description_en.trim()) {
      meta_description_en = aiData?.meta_description_en || extractDescription(description_en || title_en || '');
      needsUpdate = true;
    }

    if (!meta_description_ar || !meta_description_ar.trim()) {
      meta_description_ar = aiData?.meta_description_ar || extractDescription(description_ar || title_ar || '');
      needsUpdate = true;
    }

    if (!keywords_en || !keywords_en.trim()) {
      const techAndFeatures = `${technologies || ''} ${features || ''}`;
      keywords_en = aiData?.keywords_en || extractKeywords(title_en || '', `${category_en || ''} ${techAndFeatures}`, description_en || '', 'en');
      needsUpdate = true;
    }

    if (!keywords_ar || !keywords_ar.trim()) {
      const techAndFeatures = `${technologies || ''} ${features || ''}`;
      keywords_ar = aiData?.keywords_ar || extractKeywords(title_ar || '', `${category_ar || ''} ${techAndFeatures}`, description_ar || '', 'ar');
      needsUpdate = true;
    }

    if (!og_image_url || !og_image_url.trim()) {
      og_image_url = (image_url && image_url.trim())
        ? image_url.trim()
        : ((preview_url && preview_url.trim()) ? preview_url.trim() : '/app-assets/og-image.jpg');
      needsUpdate = true;
    }

    if (needsUpdate) {
      await pool.query(
        `UPDATE marketplace_items
         SET slug = $1,
             meta_title_en = $2,
             meta_title_ar = $3,
             meta_description_en = $4,
             meta_description_ar = $5,
             keywords_en = $6,
             keywords_ar = $7,
             og_image_url = $8,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $9`,
        [slug, meta_title_en, meta_title_ar, meta_description_en, meta_description_ar, keywords_en, keywords_ar, og_image_url, row.id]
      );
      updatedCount++;
      updatedIds.push(row.id);
    }
  }

  return {
    totalChecked: res.rows.length,
    updatedCount,
    aiProcessedCount,
    updatedIds,
    message: `Successfully synchronized metadata for ${updatedCount} marketplace items.`
  };
}

export async function syncBulletinAdsMetadata() {
  if (!pool) {
    console.error('[SEOSync] Core Database pool is not initialized');
    return { totalChecked: 0, updatedCount: 0, updatedIds: [], message: 'Database not connected' };
  }

  // Ensure metadata columns exist
  await ensureTableColumns(pool, 'bulletin_ads', {
    meta_title_en: 'VARCHAR(255)',
    meta_title_ar: 'VARCHAR(255)',
    meta_description_en: 'TEXT',
    meta_description_ar: 'TEXT',
    keywords_en: 'TEXT',
    keywords_ar: 'TEXT',
    og_image_url: 'TEXT'
  });

  const res = await pool.query(`
    SELECT id, title, description, category, hashtags,
           meta_title_en, meta_title_ar, meta_description_en, meta_description_ar, keywords_en, keywords_ar, og_image_url
    FROM bulletin_ads
    WHERE meta_title_en IS NULL OR TRIM(meta_title_en) = ''
       OR meta_title_ar IS NULL OR TRIM(meta_title_ar) = ''
       OR meta_description_en IS NULL OR TRIM(meta_description_en) = ''
       OR meta_description_ar IS NULL OR TRIM(meta_description_ar) = ''
       OR keywords_en IS NULL OR TRIM(keywords_en) = ''
       OR keywords_ar IS NULL OR TRIM(keywords_ar) = ''
       OR og_image_url IS NULL OR TRIM(og_image_url) = ''
    ORDER BY id ASC
  `);

  let updatedCount = 0;
  let aiProcessedCount = 0;
  const updatedIds: number[] = [];

  for (const row of res.rows) {
    let needsUpdate = false;
    let {
      title,
      description,
      category,
      meta_title_en,
      meta_title_ar,
      meta_description_en,
      meta_description_ar,
      keywords_en,
      keywords_ar,
      og_image_url
    } = row;

    const needsAiMetadata =
      !meta_title_en || !meta_title_en.trim() ||
      !meta_title_ar || !meta_title_ar.trim() ||
      !meta_description_en || !meta_description_en.trim() ||
      !meta_description_ar || !meta_description_ar.trim() ||
      !keywords_en || !keywords_en.trim() ||
      !keywords_ar || !keywords_ar.trim();

    let aiData: any = null;
    if (needsAiMetadata) {
      aiData = await generateSeoWithAi('marketplace', {
        title_en: title,
        title_ar: title,
        description_en: description,
        description_ar: description,
        category_en: category,
        category_ar: category,
      });
      if (aiData) aiProcessedCount++;
    }

    if (!meta_title_en || !meta_title_en.trim()) {
      meta_title_en = aiData?.meta_title_en || `${(title || 'Bulletin Ad').trim()} | Perplexta Bulletin`.slice(0, 255);
      needsUpdate = true;
    }

    if (!meta_title_ar || !meta_title_ar.trim()) {
      meta_title_ar = aiData?.meta_title_ar || `${(title || 'إعلان').trim()} | لوحة إعلانات بيربليكستا`.slice(0, 255);
      needsUpdate = true;
    }

    if (!meta_description_en || !meta_description_en.trim()) {
      meta_description_en = aiData?.meta_description_en || extractDescription(description || title || '');
      needsUpdate = true;
    }

    if (!meta_description_ar || !meta_description_ar.trim()) {
      meta_description_ar = aiData?.meta_description_ar || extractDescription(description || title || '');
      needsUpdate = true;
    }

    if (!keywords_en || !keywords_en.trim()) {
      keywords_en = aiData?.keywords_en || extractKeywords(title || '', category || '', description || '', 'en');
      needsUpdate = true;
    }

    if (!keywords_ar || !keywords_ar.trim()) {
      keywords_ar = aiData?.keywords_ar || extractKeywords(title || '', category || '', description || '', 'ar');
      needsUpdate = true;
    }

    if (!og_image_url || !og_image_url.trim()) {
      og_image_url = '/app-assets/og-image.jpg';
      needsUpdate = true;
    }

    if (needsUpdate) {
      await pool.query(
        `UPDATE bulletin_ads
         SET meta_title_en = $1,
             meta_title_ar = $2,
             meta_description_en = $3,
             meta_description_ar = $4,
             keywords_en = $5,
             keywords_ar = $6,
             og_image_url = $7,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $8`,
        [meta_title_en, meta_title_ar, meta_description_en, meta_description_ar, keywords_en, keywords_ar, og_image_url, row.id]
      );
      updatedCount++;
      updatedIds.push(row.id);
    }
  }

  return {
    totalChecked: res.rows.length,
    updatedCount,
    aiProcessedCount,
    updatedIds,
    message: `Successfully synchronized metadata for ${updatedCount} bulletin ads.`
  };
}

export async function auditContentSeoItems() {
  const db = pool;
  const extDb = externalPool || pool;

  if (!db) {
    throw new Error('Core database pool is not initialized');
  }

  // Ensure metadata columns exist
  await ensureTableColumns(extDb, 'blog_articles', {
    slug: 'VARCHAR(255)',
    meta_title_en: 'VARCHAR(255)',
    meta_title_ar: 'VARCHAR(255)',
    meta_description_en: 'TEXT',
    meta_description_ar: 'TEXT',
    keywords_en: 'TEXT',
    keywords_ar: 'TEXT',
    og_image_url: 'TEXT'
  });

  await ensureTableColumns(db, 'marketplace_items', {
    slug: 'VARCHAR(255)',
    meta_title_en: 'VARCHAR(255)',
    meta_title_ar: 'VARCHAR(255)',
    meta_description_en: 'TEXT',
    meta_description_ar: 'TEXT',
    keywords_en: 'TEXT',
    keywords_ar: 'TEXT',
    og_image_url: 'TEXT'
  });

  await ensureTableColumns(db, 'bulletin_ads', {
    meta_title_en: 'VARCHAR(255)',
    meta_title_ar: 'VARCHAR(255)',
    meta_description_en: 'TEXT',
    meta_description_ar: 'TEXT',
    keywords_en: 'TEXT',
    keywords_ar: 'TEXT',
    og_image_url: 'TEXT'
  });

  const blogRes = await extDb.query(`
    SELECT id, slug, title_en, title_ar, content_en, content_ar, category_en, category_ar, image_url,
           meta_title_en, meta_title_ar, meta_description_en, meta_description_ar, keywords_en, keywords_ar, og_image_url,
           updated_at, created_at
    FROM blog_articles
    ORDER BY id DESC
  `).catch((err: any) => {
    console.warn('[SEOSync] Failed to query blog_articles:', err.message);
    return { rows: [] };
  });

  const marketplaceRes = await db.query(`
    SELECT id, slug, title_en, title_ar, description_en, description_ar, category_en, category_ar, image_url,
           meta_title_en, meta_title_ar, meta_description_en, meta_description_ar, keywords_en, keywords_ar, og_image_url,
           updated_at, created_at
    FROM marketplace_items
    ORDER BY id DESC
  `).catch((err: any) => {
    console.warn('[SEOSync] Failed to query marketplace_items:', err.message);
    return { rows: [] };
  });

  const bulletinRes = await db.query(`
    SELECT id, title, description, category, image_url,
           meta_title_en, meta_title_ar, meta_description_en, meta_description_ar, keywords_en, keywords_ar, og_image_url,
           updated_at, created_at
    FROM bulletin_ads
    ORDER BY id DESC
  `).catch((err: any) => {
    console.warn('[SEOSync] Failed to query bulletin_ads:', err.message);
    return { rows: [] };
  });

  const calculateItemAudit = (row: any, type: 'blog' | 'marketplace' | 'bulletin') => {
    const missingFields: string[] = [];
    let score = 0;

    if (type !== 'bulletin') {
        if (row.slug && row.slug.trim()) {
          score += 15;
        } else {
          missingFields.push('slug');
        }
    } else {
        score += 15; // Placeholder score for bulletin ads as they might not have slugs yet
    }

    if (row.meta_title_en && row.meta_title_en.trim()) {
      score += 15;
    } else {
      missingFields.push('meta_title_en');
    }

    if (row.meta_title_ar && row.meta_title_ar.trim()) {
      score += 15;
    } else {
      missingFields.push('meta_title_ar');
    }

    if (row.meta_description_en && row.meta_description_en.trim()) {
      score += 15;
    } else {
      missingFields.push('meta_description_en');
    }

    if (row.meta_description_ar && row.meta_description_ar.trim()) {
      score += 15;
    } else {
      missingFields.push('meta_description_ar');
    }

    if (row.keywords_en && row.keywords_en.trim()) {
      score += 10;
    } else {
      missingFields.push('keywords_en');
    }

    if (row.keywords_ar && row.keywords_ar.trim()) {
      score += 10;
    } else {
      missingFields.push('keywords_ar');
    }

    if (row.og_image_url && row.og_image_url.trim()) {
      score += 5;
    } else {
      missingFields.push('og_image_url');
    }

    const requiresPopulation = missingFields.length > 0;

    return {
      id: row.id,
      type,
      title_en: row.title_en || row.title || 'Untitled',
      title_ar: row.title_ar || row.title || 'بدون عنوان',
      slug: row.slug || '',
      category_en: row.category_en || row.category || '',
      category_ar: row.category_ar || row.category || '',
      image_url: row.image_url || row.og_image_url || '',
      meta_title_en: row.meta_title_en || '',
      meta_title_ar: row.meta_title_ar || '',
      meta_description_en: row.meta_description_en || '',
      meta_description_ar: row.meta_description_ar || '',
      keywords_en: row.keywords_en || '',
      keywords_ar: row.keywords_ar || '',
      og_image_url: row.og_image_url || '',
      seo_score: score,
      missing_fields: missingFields,
      requires_metadata_population: requiresPopulation,
      updated_at: row.updated_at || row.created_at || new Date().toISOString()
    };
  };

  const blogItems = blogRes.rows.map((r: any) => calculateItemAudit(r, 'blog'));
  const marketplaceItems = marketplaceRes.rows.map((r: any) => calculateItemAudit(r, 'marketplace'));
  const bulletinItems = bulletinRes.rows.map((r: any) => calculateItemAudit(r, 'bulletin'));
  const allItems = [...blogItems, ...marketplaceItems, ...bulletinItems];

  allItems.sort((a, b) => {
    if (a.requires_metadata_population !== b.requires_metadata_population) {
      return a.requires_metadata_population ? -1 : 1;
    }
    return a.seo_score - b.seo_score;
  });

  const totalItems = allItems.length;
  const itemsMissingMetadata = allItems.filter(i => i.requires_metadata_population).length;
  const itemsFullyOptimized = totalItems - itemsMissingMetadata;
  const totalScoreSum = allItems.reduce((acc, curr) => acc + curr.seo_score, 0);
  const overallSeoHealthScore = totalItems > 0 ? parseFloat((totalScoreSum / totalItems).toFixed(1)) : 100;
  const estimatedTimeSeconds = Math.ceil(itemsMissingMetadata * 1.5);

  return {
    summary: {
      total_items: totalItems,
      total_blog_articles: blogItems.length,
      total_marketplace_items: marketplaceItems.length,
      items_missing_metadata: itemsMissingMetadata,
      items_fully_optimized: itemsFullyOptimized,
      overall_seo_health_score: overallSeoHealthScore,
      estimated_time_seconds: estimatedTimeSeconds
    },
    items: allItems
  };
}

export async function syncSingleContentSeoItem(type: 'blog' | 'marketplace' | 'bulletin', id: number) {
  const db = type === 'blog' ? (externalPool || pool) : pool;
  if (!db) {
    throw new Error('Database pool is not initialized');
  }

  const tableName = type === 'blog' ? 'blog_articles' : type === 'bulletin' ? 'bulletin_ads' : 'marketplace_items';
  const queryRes = await db.query(`SELECT * FROM ${tableName} WHERE id = $1`, [id]);

  if (queryRes.rows.length === 0) {
    throw new Error(`${type} item with ID ${id} not found`);
  }

  const row = queryRes.rows[0];
  let {
    title_en,
    title_ar,
    content_en,
    content_ar,
    description_en,
    description_ar,
    category_en,
    category_ar,
    image_url,
    preview_url,
    technologies,
    features
  } = row;

  const aiData = await generateSeoWithAi(type, {
    title_en,
    title_ar,
    content_en,
    content_ar,
    description_en,
    description_ar,
    category_en,
    category_ar,
    technologies,
    features
  });

  const slug = `item-${row.id}-${slugify(title_en || title_ar || 'item')}`;
  const meta_title_en = aiData?.meta_title_en || `${(title_en || 'Item').trim()} | Perplexta Platform`.slice(0, 255);
  const meta_title_ar = aiData?.meta_title_ar || `${(title_ar || 'عنصر').trim()} | منصة بيربليكستا`.slice(0, 255);
  const meta_description_en = aiData?.meta_description_en || extractDescription(content_en || description_en || title_en || '');
  const meta_description_ar = aiData?.meta_description_ar || extractDescription(content_ar || description_ar || title_ar || '');
  const keywords_en = aiData?.keywords_en || extractKeywords(title_en || '', category_en || '', content_en || description_en || '', 'en');
  const keywords_ar = aiData?.keywords_ar || extractKeywords(title_ar || '', category_ar || '', content_ar || description_ar || '', 'ar');
  const og_image_url = (image_url && image_url.trim()) ? image_url.trim() : ((preview_url && preview_url.trim()) ? preview_url.trim() : '/app-assets/og-image.jpg');

  if (type === 'bulletin') {
    await db.query(
      `UPDATE ${tableName}
       SET meta_title_en = $1,
           meta_title_ar = $2,
           meta_description_en = $3,
           meta_description_ar = $4,
           keywords_en = $5,
           keywords_ar = $6,
           og_image_url = $7,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8`,
      [meta_title_en, meta_title_ar, meta_description_en, meta_description_ar, keywords_en, keywords_ar, og_image_url, id]
    );
  } else {
    await db.query(
      `UPDATE ${tableName}
       SET slug = $1,
           meta_title_en = $2,
           meta_title_ar = $3,
           meta_description_en = $4,
           meta_description_ar = $5,
           keywords_en = $6,
           keywords_ar = $7,
           og_image_url = $8,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9`,
      [slug, meta_title_en, meta_title_ar, meta_description_en, meta_description_ar, keywords_en, keywords_ar, og_image_url, id]
    );
  }

  return {
    success: true,
    id,
    type,
    slug,
    meta_title_en,
    meta_title_ar,
    meta_description_en,
    meta_description_ar,
    keywords_en,
    keywords_ar,
    og_image_url,
    seo_score: 100,
    requires_metadata_population: false
  };
}


export async function getSmartSeoSuggestion(type: 'blog' | 'marketplace' | 'bulletin', id: number) {
  const db = type === 'blog' ? (externalPool || pool) : pool;
  if (!db) throw new Error('Database is not initialized');

  const tableName = type === 'blog' ? 'blog_articles' : type === 'bulletin' ? 'bulletin_ads' : 'marketplace_items';
  const query = type === 'blog' 
    ? `SELECT id, slug, title_en, title_ar, content_en, content_ar, image_url, category_en, category_ar,
              meta_title_en, meta_title_ar, meta_description_en, meta_description_ar, keywords_en, keywords_ar, og_image_url
       FROM blog_articles WHERE id = $1`
    : type === 'bulletin'
    ? `SELECT id, title, description, category, image_url,
              meta_title_en, meta_title_ar, meta_description_en, meta_description_ar, keywords_en, keywords_ar, og_image_url
       FROM bulletin_ads WHERE id = $1`
    : `SELECT id, slug, title_en, title_ar, description_en, description_ar, image_url, category_en, category_ar,
              technologies, features, meta_title_en, meta_title_ar, meta_description_en, meta_description_ar, keywords_en, keywords_ar, og_image_url
       FROM marketplace_items WHERE id = $1`;

  const res = await db.query(query, [id]);
  if (res.rows.length === 0) {
    throw new Error(`Item with id ${id} not found in ${tableName}`);
  }

  const row = res.rows[0];

  const itemData = type === 'blog' ? {
    title_en: row.title_en,
    title_ar: row.title_ar,
    content_en: row.content_en,
    content_ar: row.content_ar,
    category_en: row.category_en,
    category_ar: row.category_ar
  } : {
    title_en: row.title_en,
    title_ar: row.title_ar,
    description_en: row.description_en,
    description_ar: row.description_ar,
    category_en: row.category_en,
    category_ar: row.category_ar,
    technologies: row.technologies,
    features: row.features
  };

  const aiData = await generateSeoWithAi(type, itemData);

  const suggestedTitleEn = aiData?.meta_title_en || `${(row.title_en || 'Perplexta Item').trim()} | Perplexta Platform`.slice(0, 255);
  const suggestedTitleAr = aiData?.meta_title_ar || `${(row.title_ar || 'عنصر بيربليكستا').trim()} | منصة بيربليكستا`.slice(0, 255);
  const suggestedDescEn = aiData?.meta_description_en || extractDescription(row.content_en || row.description_en || row.title_en || '');
  const suggestedDescAr = aiData?.meta_description_ar || extractDescription(row.content_ar || row.description_ar || row.title_ar || '');
  const suggestedKeywordsEn = aiData?.keywords_en || extractKeywords(row.title_en || '', row.category_en || '', row.content_en || row.description_en || '', 'en');
  const suggestedKeywordsAr = aiData?.keywords_ar || extractKeywords(row.title_ar || '', row.category_ar || '', row.content_ar || row.description_ar || '', 'ar');
  const suggestedSlug = row.slug && row.slug.trim() ? row.slug.trim() : `${type}-${row.id}-${slugify(row.title_en || row.title_ar || 'item')}`;
  const suggestedOgImage = row.og_image_url && row.og_image_url.trim() ? row.og_image_url.trim() : (row.image_url && row.image_url.trim() ? row.image_url.trim() : '/app-assets/og-image.jpg');

  return {
    id: row.id,
    type,
    item_title_en: row.title_en || '',
    item_title_ar: row.title_ar || '',
    category_en: row.category_en || '',
    category_ar: row.category_ar || '',
    current: {
      meta_title_en: row.meta_title_en || '',
      meta_title_ar: row.meta_title_ar || '',
      meta_description_en: row.meta_description_en || '',
      meta_description_ar: row.meta_description_ar || '',
      keywords_en: row.keywords_en || '',
      keywords_ar: row.keywords_ar || '',
      slug: row.slug || '',
      og_image_url: row.og_image_url || ''
    },
    suggested: {
      meta_title_en: suggestedTitleEn,
      meta_title_ar: suggestedTitleAr,
      meta_description_en: suggestedDescEn,
      meta_description_ar: suggestedDescAr,
      keywords_en: suggestedKeywordsEn,
      keywords_ar: suggestedKeywordsAr,
      slug: suggestedSlug,
      og_image_url: suggestedOgImage
    },
    ai_generated: Boolean(aiData)
  };
}

export async function applySmartSeoSuggestion(
  type: 'blog' | 'marketplace' | 'bulletin',
  id: number,
  metadata: {
    meta_title_en?: string;
    meta_title_ar?: string;
    meta_description_en?: string;
    meta_description_ar?: string;
    keywords_en?: string;
    keywords_ar?: string;
    slug?: string;
    og_image_url?: string;
  }
) {
  const db = type === 'blog' ? (externalPool || pool) : pool;
  if (!db) throw new Error('Database is not initialized');

  const tableName = type === 'blog' ? 'blog_articles' : type === 'bulletin' ? 'bulletin_ads' : 'marketplace_items';

  const selectRes = await db.query(`SELECT * FROM ${tableName} WHERE id = $1`, [id]);
  if (selectRes.rows.length === 0) {
    throw new Error(`Item with id ${id} not found in ${tableName}`);
  }
  const existing = selectRes.rows[0];

  const itemTitleEn = existing.title_en || existing.title || 'Item';
  const itemTitleAr = existing.title_ar || existing.title || 'عنصر';
  const itemDescEn = existing.content_en || existing.description_en || existing.description || '';
  const itemDescAr = existing.content_ar || existing.description_ar || existing.description || '';
  const itemCatEn = existing.category_en || existing.category || '';
  const itemCatAr = existing.category_ar || existing.category || '';

  const meta_title_en = (metadata.meta_title_en !== undefined ? metadata.meta_title_en : existing.meta_title_en) || `${itemTitleEn} | Perplexta`;
  const meta_title_ar = (metadata.meta_title_ar !== undefined ? metadata.meta_title_ar : existing.meta_title_ar) || `${itemTitleAr} | بيربليكستا`;
  const meta_description_en = (metadata.meta_description_en !== undefined ? metadata.meta_description_en : existing.meta_description_en) || extractDescription(itemDescEn);
  const meta_description_ar = (metadata.meta_description_ar !== undefined ? metadata.meta_description_ar : existing.meta_description_ar) || extractDescription(itemDescAr);
  const keywords_en = (metadata.keywords_en !== undefined ? metadata.keywords_en : existing.keywords_en) || extractKeywords(itemTitleEn, itemCatEn, '', 'en');
  const keywords_ar = (metadata.keywords_ar !== undefined ? metadata.keywords_ar : existing.keywords_ar) || extractKeywords(itemTitleAr, itemCatAr, '', 'ar');
  const slug = (metadata.slug !== undefined ? metadata.slug : existing.slug) || `${type}-${id}-${slugify(itemTitleEn)}`;
  const og_image_url = (metadata.og_image_url !== undefined ? metadata.og_image_url : existing.og_image_url) || existing.image_url || '/app-assets/og-image.jpg';

  if (type === 'bulletin') {
      await db.query(
        `UPDATE ${tableName}
         SET meta_title_en = $1,
             meta_title_ar = $2,
             meta_description_en = $3,
             meta_description_ar = $4,
             keywords_en = $5,
             keywords_ar = $6,
             og_image_url = $7,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $8`,
        [meta_title_en, meta_title_ar, meta_description_en, meta_description_ar, keywords_en, keywords_ar, og_image_url, id]
      );
  } else {
      await db.query(
        `UPDATE ${tableName}
         SET slug = $1,
             meta_title_en = $2,
             meta_title_ar = $3,
             meta_description_en = $4,
             meta_description_ar = $5,
             keywords_en = $6,
             keywords_ar = $7,
             og_image_url = $8,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $9`,
        [slug, meta_title_en, meta_title_ar, meta_description_en, meta_description_ar, keywords_en, keywords_ar, og_image_url, id]
      );
  }

  return {
    success: true,
    id,
    type,
    slug,
    meta_title_en,
    meta_title_ar,
    meta_description_en,
    meta_description_ar,
    keywords_en,
    keywords_ar,
    og_image_url,
    seo_score: 100
  };
}

export async function syncAllContentSeoMetadata() {
  console.log('[SEOSync] 🚀 Initiating AI-assisted sync for missing metadata fields in blog_articles, marketplace_items & bulletin_ads...');
  const blogResult = await syncBlogArticlesMetadata();
  const marketplaceResult = await syncMarketplaceItemsMetadata();
  const bulletinResult = await syncBulletinAdsMetadata();

  const blogUpdated = blogResult.updatedCount || 0;
  const marketplaceUpdated = marketplaceResult.updatedCount || 0;
  const bulletinUpdated = bulletinResult.updatedCount || 0;
  const totalUpdated = blogUpdated + marketplaceUpdated + bulletinUpdated;
  const totalAi = (blogResult.aiProcessedCount || 0) + (marketplaceResult.aiProcessedCount || 0) + (bulletinResult.aiProcessedCount || 0);

  console.log(`[SEOSync] ✅ SEO Metadata sync completed. Total records updated: ${totalUpdated} (Blog: ${blogUpdated}, Marketplace: ${marketplaceUpdated}, Bulletin: ${bulletinUpdated}, AI Generated: ${totalAi})`);

  return {
    success: true,
    totalUpdated,
    totalAiProcessed: totalAi,
    blog: blogResult,
    marketplace: marketplaceResult,
    bulletin: bulletinResult,
    timestamp: new Date().toISOString()
  };
}



