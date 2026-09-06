import { pool } from '../db/index.js';
import { getCachedOrchestratorConfig, upsertSeoMetadata } from '../db/queries.js';

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
  type: 'bulletin' | 'viralbook',
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

    const prompt = `You are a professional SEO Specialist for Perplexta Platform. Generate high-ranking, engaging SEO metadata for a Viralbook community advertisement / post.
Title (EN): ${itemData.title_en || ''}
Title (AR): ${itemData.title_ar || ''}
Category (EN): ${itemData.category_en || ''}
Category (AR): ${itemData.category_ar || ''}
Context / Content (EN): ${(itemData.content_en || itemData.description_en || '').slice(0, 1000)}
Context / Content (AR): ${(itemData.content_ar || itemData.description_ar || '').slice(0, 1000)}
${itemData.technologies ? `Technologies: ${itemData.technologies}` : ''}
${itemData.features ? `Features: ${itemData.features}` : ''}

Generate JSON with:
1. meta_title_en: Punchy English SEO title max 60 chars ending with "| Viralbook"
2. meta_title_ar: Punchy Arabic SEO title max 60 chars ending with "| فايرال بوك"
3. meta_description_en: Concise English meta description (130-155 characters)
4. meta_description_ar: Concise Arabic meta description (130-155 characters)
5. keywords_en: 8-10 high-performing comma-separated keywords in English optimized with content similarity and trending search data
6. keywords_ar: 8-10 high-performing comma-separated keywords in Arabic optimized with content similarity and trending search data`;

    const orchestrator = await getCachedOrchestratorConfig('perplexta_analysis');
    const modelChain = [
      orchestrator?.primary_model,
      orchestrator?.fallback_1_model,
      orchestrator?.fallback_2_model,
      orchestrator?.fallback_3_model
    ].filter(Boolean) as string[];

    let response: any;

    for (const model of modelChain) {
      try {
        response = await ai.models.generateContent({
          model: model,
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
        break;
      } catch (err: any) {
        console.warn(`[SEOSync] AI SEO generation failed for model ${model}:`, err.message || err);
      }
    }

    if (!response) {
      console.warn("[SEOSync] AI SEO generation fallback due to quota or unavailable models. Using algorithmic extraction.");
      return null;
    }

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

export async function syncBulletinAdsMetadata() {
  if (!pool) {
    console.error('[SEOSync] Core Database pool is not initialized');
    return { totalChecked: 0, updatedCount: 0, updatedIds: [], message: 'Database not connected' };
  }

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
      aiData = await generateSeoWithAi('bulletin', {
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
      meta_title_en = aiData?.meta_title_en || `${(title || 'Viralbook Post').trim()} | Viralbook`.slice(0, 255);
      needsUpdate = true;
    }

    if (!meta_title_ar || !meta_title_ar.trim()) {
      meta_title_ar = aiData?.meta_title_ar || `${(title || 'منشور فايرال بوك').trim()} | فايرال بوك`.slice(0, 255);
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
      og_image_url = '';
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
    message: `Successfully synchronized metadata for ${updatedCount} Viralbook items.`
  };
}

export async function auditContentSeoItems() {
  const db = pool;

  if (!db) {
    throw new Error('Core database pool is not initialized');
  }

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

  const calculateItemAudit = (row: any) => {
    const missingFields: string[] = [];
    let score = 15; // Baseline slug/identifier weight

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
      type: 'bulletin' as const,
      title_en: row.title || 'Untitled',
      title_ar: row.title || 'بدون عنوان',
      slug: `viralbook-${row.id}`,
      category_en: row.category || '',
      category_ar: row.category || '',
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

  const allItems = bulletinRes.rows.map((r: any) => calculateItemAudit(r));

  allItems.sort((a: any, b: any) => {
    if (a.requires_metadata_population !== b.requires_metadata_population) {
      return a.requires_metadata_population ? -1 : 1;
    }
    return a.seo_score - b.seo_score;
  });

  const totalItems = allItems.length;
  const itemsMissingMetadata = allItems.filter((i: any) => i.requires_metadata_population).length;
  const itemsFullyOptimized = totalItems - itemsMissingMetadata;
  const totalScoreSum = allItems.reduce((acc: number, curr: any) => acc + curr.seo_score, 0);
  const overallSeoHealthScore = totalItems > 0 ? parseFloat((totalScoreSum / totalItems).toFixed(1)) : 100;
  const estimatedTimeSeconds = Math.ceil(itemsMissingMetadata * 1.5);

  return {
    summary: {
      total_items: totalItems,
      items_missing_metadata: itemsMissingMetadata,
      items_fully_optimized: itemsFullyOptimized,
      overall_seo_health_score: overallSeoHealthScore,
      estimated_time_seconds: estimatedTimeSeconds
    },
    items: allItems
  };
}

export async function syncSingleContentSeoItem(type: 'bulletin', id: number) {
  const db = pool;
  if (!db) {
    throw new Error('Database pool is not initialized');
  }

  const tableName = 'bulletin_ads';
  const queryRes = await db.query(`SELECT * FROM ${tableName} WHERE id = $1`, [id]);

  if (queryRes.rows.length === 0) {
    throw new Error(`Item with ID ${id} not found`);
  }

  const row = queryRes.rows[0];
  let {
    title,
    description,
    category,
    image_url,
    preview_url,
    technologies,
    features
  } = row;

  const aiData = await generateSeoWithAi('bulletin', {
    title_en: title,
    title_ar: title,
    content_en: description,
    content_ar: description,
    description_en: description,
    description_ar: description,
    category_en: category,
    category_ar: category,
    technologies,
    features
  });

  const slug = `viralbook-${row.id}-${slugify(title || 'post')}`;
  const meta_title_en = aiData?.meta_title_en || `${(title || 'Viralbook Post').trim()} | Viralbook`.slice(0, 255);
  const meta_title_ar = aiData?.meta_title_ar || `${(title || 'منشور فايرال بوك').trim()} | فايرال بوك`.slice(0, 255);
  const meta_description_en = aiData?.meta_description_en || extractDescription(description || title || '');
  const meta_description_ar = aiData?.meta_description_ar || extractDescription(description || title || '');
  const keywords_en = aiData?.keywords_en || extractKeywords(title || '', category || '', description || '', 'en');
  const keywords_ar = aiData?.keywords_ar || extractKeywords(title || '', category || '', description || '', 'ar');
  const og_image_url = (image_url && image_url.trim()) ? image_url.trim() : ((preview_url && preview_url.trim()) ? preview_url.trim() : '');

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

export async function getSmartSeoSuggestion(type: 'bulletin', id: number) {
  const db = pool;
  if (!db) throw new Error('Database is not initialized');

  const tableName = 'bulletin_ads';
  const query = `SELECT id, title, description, category, image_url,
                        meta_title_en, meta_title_ar, meta_description_en, meta_description_ar, keywords_en, keywords_ar, og_image_url
                 FROM bulletin_ads WHERE id = $1`;

  const res = await db.query(query, [id]);
  if (res.rows.length === 0) {
    throw new Error(`Item with id ${id} not found in ${tableName}`);
  }

  const row = res.rows[0];

  const itemData = {
    title_en: row.title,
    title_ar: row.title,
    description_en: row.description,
    description_ar: row.description,
    category_en: row.category,
    category_ar: row.category
  };

  const aiData = await generateSeoWithAi('bulletin', itemData);

  const rawTitle = row.title || 'Viralbook Item';
  const rawTitleAr = row.title || 'منشور فايرال بوك';
  const rawDesc = row.description || row.title || '';
  const rawDescAr = row.description || row.title || '';
  const rawCat = row.category || '';
  const rawCatAr = row.category || '';

  const suggestedTitleEn = aiData?.meta_title_en || `${rawTitle.trim()} | Viralbook`.slice(0, 255);
  const suggestedTitleAr = aiData?.meta_title_ar || `${rawTitleAr.trim()} | فايرال بوك`.slice(0, 255);
  const suggestedDescEn = aiData?.meta_description_en || extractDescription(rawDesc);
  const suggestedDescAr = aiData?.meta_description_ar || extractDescription(rawDescAr);
  const suggestedKeywordsEn = aiData?.keywords_en || extractKeywords(rawTitle, rawCat, rawDesc, 'en');
  const suggestedKeywordsAr = aiData?.keywords_ar || extractKeywords(rawTitleAr, rawCatAr, rawDescAr, 'ar');
  const suggestedSlug = `viralbook-${row.id}-${slugify(rawTitle)}`;
  const suggestedOgImage = row.og_image_url && row.og_image_url.trim() ? row.og_image_url.trim() : (row.image_url && row.image_url.trim() ? row.image_url.trim() : '');

  return {
    id: row.id,
    type,
    item_title_en: rawTitle,
    item_title_ar: rawTitleAr,
    category_en: rawCat,
    category_ar: rawCatAr,
    current: {
      meta_title_en: row.meta_title_en || '',
      meta_title_ar: row.meta_title_ar || '',
      meta_description_en: row.meta_description_en || '',
      meta_description_ar: row.meta_description_ar || '',
      keywords_en: row.keywords_en || '',
      keywords_ar: row.keywords_ar || '',
      slug: `viralbook-${row.id}`,
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
  type: 'bulletin',
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
  const db = pool;
  if (!db) throw new Error('Database is not initialized');

  const tableName = 'bulletin_ads';

  const selectRes = await db.query(`SELECT * FROM ${tableName} WHERE id = $1`, [id]);
  if (selectRes.rows.length === 0) {
    throw new Error(`Item with id ${id} not found in ${tableName}`);
  }
  const existing = selectRes.rows[0];

  const itemTitle = existing.title || 'Item';
  const itemDesc = existing.description || '';
  const itemCat = existing.category || '';

  const meta_title_en = (metadata.meta_title_en !== undefined ? metadata.meta_title_en : existing.meta_title_en) || `${itemTitle} | Viralbook`;
  const meta_title_ar = (metadata.meta_title_ar !== undefined ? metadata.meta_title_ar : existing.meta_title_ar) || `${itemTitle} | فايرال بوك`;
  const meta_description_en = (metadata.meta_description_en !== undefined ? metadata.meta_description_en : existing.meta_description_en) || extractDescription(itemDesc);
  const meta_description_ar = (metadata.meta_description_ar !== undefined ? metadata.meta_description_ar : existing.meta_description_ar) || extractDescription(itemDesc);
  const keywords_en = (metadata.keywords_en !== undefined ? metadata.keywords_en : existing.keywords_en) || extractKeywords(itemTitle, itemCat, '', 'en');
  const keywords_ar = (metadata.keywords_ar !== undefined ? metadata.keywords_ar : existing.keywords_ar) || extractKeywords(itemTitle, itemCat, '', 'ar');
  const og_image_url = (metadata.og_image_url !== undefined ? metadata.og_image_url : existing.og_image_url) || existing.image_url || '';

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

  // Update dynamic route SEO metadata cache and persistent table
  try {
    const routePaths = [`/viralbook/${id}`, `/bulletin/${id}`];

    for (const routePath of routePaths) {
      await upsertSeoMetadata({
        route_path: routePath,
        entity_type: 'viralbook',
        entity_id: String(id),
        title_en: meta_title_en,
        title_ar: meta_title_ar,
        description_en: meta_description_en,
        description_ar: meta_description_ar,
        og_image_url: og_image_url,
        keywords_en: keywords_en,
        keywords_ar: keywords_ar,
        is_active: true
      });
    }
  } catch (err: any) {
    console.warn('[SEOSync] Error updating seo_metadata table in applySmartSeoSuggestion:', err.message);
  }

  return {
    success: true,
    id,
    type,
    slug: `viralbook-${id}`,
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

export async function syncDynamicRoutesToSeoMetadata(): Promise<{ syncedRoutes: number }> {
  console.log('[SEOSync] 🔄 Syncing dynamic routes to seo_metadata table...');
  if (!pool) return { syncedRoutes: 0 };
  let count = 0;

  try {
    const bulletinRes = await pool.query(`
      SELECT id, title, description, image_url, meta_title_en, meta_title_ar,
             meta_description_en, meta_description_ar, keywords_en, keywords_ar, og_image_url
      FROM bulletin_ads
      WHERE deleted_at IS NULL AND (status IS NULL OR status = 'approved' OR status = 'active')
    `);
    for (const row of bulletinRes.rows) {
      await upsertSeoMetadata({
        route_path: `/viralbook/${row.id}`,
        entity_type: 'viralbook',
        entity_id: String(row.id),
        title_en: row.meta_title_en || (row.title ? `${row.title} | Viralbook` : 'Viralbook Post | Perplexta'),
        title_ar: row.meta_title_ar || (row.title ? `${row.title} | فايرال بوك` : 'منشور فايرال بوك | بيربليكستا'),
        description_en: row.meta_description_en || (row.description ? extractDescription(row.description) : ''),
        description_ar: row.meta_description_ar || (row.description ? extractDescription(row.description) : ''),
        og_image_url: row.og_image_url || row.image_url || '',
        keywords_en: row.keywords_en || 'viralbook, perplexta, viral, post, announcement',
        keywords_ar: row.keywords_ar || 'فايرال بوك, إعلانات, بيربليكستا, خدمات, منشورات',
        is_active: true
      });
      await upsertSeoMetadata({
        route_path: `/bulletin/${row.id}`,
        entity_type: 'bulletin',
        entity_id: String(row.id),
        title_en: row.meta_title_en || (row.title ? `${row.title} | Perplexta Bulletin` : 'Bulletin Ad | Perplexta'),
        title_ar: row.meta_title_ar || (row.title ? `${row.title} | نشرة بيربليكستا` : 'إعلان في النشرة | بيربليكستا'),
        description_en: row.meta_description_en || (row.description ? extractDescription(row.description) : ''),
        description_ar: row.meta_description_ar || (row.description ? extractDescription(row.description) : ''),
        og_image_url: row.og_image_url || row.image_url || '',
        keywords_en: row.keywords_en || 'bulletin, perplexta, announcement',
        keywords_ar: row.keywords_ar || 'إعلانات, بيربليكستا, خدمات',
        is_active: true
      });
      count++;
    }

    console.log(`[SEOSync] ✅ Synced ${count} dynamic routes to seo_metadata table.`);
  } catch (err: any) {
    console.error('[SEOSync] Error syncing dynamic routes to seo_metadata:', err.message);
  }

  return { syncedRoutes: count };
}

export async function syncAllContentSeoMetadata() {
  console.log('[SEOSync] 🚀 Initiating AI-assisted sync for missing metadata fields in bulletin_ads...');
  const bulletinResult = await syncBulletinAdsMetadata();
  const dynamicRoutesResult = await syncDynamicRoutesToSeoMetadata();

  const bulletinUpdated = bulletinResult.updatedCount || 0;
  const totalAi = bulletinResult.aiProcessedCount || 0;

  console.log(`[SEOSync] ✅ SEO Metadata sync completed. Total records updated: ${bulletinUpdated} (Viralbook: ${bulletinUpdated}, AI Generated: ${totalAi}, Dynamic Routes Synced: ${dynamicRoutesResult.syncedRoutes})`);

  return {
    success: true,
    totalUpdated: bulletinUpdated,
    totalAiProcessed: totalAi,
    dynamicRoutesSynced: dynamicRoutesResult.syncedRoutes,
    bulletin: bulletinResult,
    timestamp: new Date().toISOString()
  };
}
