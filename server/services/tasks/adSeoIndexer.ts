import { pool } from '../../db/index.js';
import { generateSeoWithAi } from '../seoSync.js';
import * as cheerio from 'cheerio';

/**
 * Validates the schema, ensuring the columns exist in advertisements.
 */
async function ensureSchema() {
  console.log('[AdSeoIndexer] Verifying schema constraints for advertisements...');
  const checkColumns = async (table: string, cols: string[]) => {
    for (const col of cols) {
      const res = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = $2
      `, [table, col]);
      if (res.rows.length === 0) {
        console.log(`[AdSeoIndexer] Column ${col} missing in ${table}, adding...`);
        await pool.query(`ALTER TABLE ${table} ADD COLUMN ${col} TEXT`);
      }
    }
  };

  await checkColumns('advertisements', [
    'meta_title_en',
    'meta_title_ar',
    'meta_description_en',
    'meta_description_ar',
    'keywords_en',
    'keywords_ar'
  ]);
}

/**
 * Fetches the URL and extracts textual content.
 */
async function scrapeLandingPage(url: string): Promise<string | null> {
  if (!url || !url.startsWith('http')) return null;
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    
    if (!response.ok) {
      console.warn(`[AdSeoIndexer] URL unreachable (${response.status}): ${url}`);
      return null;
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Extract meaningful text
    $('script, style, noscript, iframe, img, svg').remove();
    let text = $('body').text().replace(/\s+/g, ' ').trim();
    
    return text.substring(0, 5000); // Limit to first 5000 chars for AI
  } catch (error: any) {
    console.warn(`[AdSeoIndexer] Failed to scrape URL: ${url} - ${error.message}`);
    return null;
  }
}

/**
 * Main maintenance job.
 */
export async function runAdSeoIndexerJob() {
  console.log('[AdSeoIndexer] Starting maintenance job...');
  try {
    await ensureSchema();

    // Fetch ads missing SEO meta tags
    const adsRes = await pool.query(`
      SELECT id, title_en, title_ar, description_en, description_ar, target_url 
      FROM advertisements 
      WHERE meta_description_en IS NULL OR TRIM(meta_description_en) = ''
         OR meta_description_ar IS NULL OR TRIM(meta_description_ar) = ''
         OR keywords_en IS NULL OR TRIM(keywords_en) = ''
         OR keywords_ar IS NULL OR TRIM(keywords_ar) = ''
    `);

    console.log(`[AdSeoIndexer] Found ${adsRes.rows.length} advertisements requiring SEO synchronization.`);

    let updatedCount = 0;
    for (const ad of adsRes.rows) {
      console.log(`[AdSeoIndexer] Processing ad ID: ${ad.id}...`);
      
      let pageContent = '';
      if (ad.target_url) {
        console.log(`[AdSeoIndexer] Verifying landing page accessibility: ${ad.target_url}`);
        const scraped = await scrapeLandingPage(ad.target_url);
        if (scraped) {
          pageContent = scraped;
        }
      }

      const aiData = await generateSeoWithAi('marketplace', {
        title_en: ad.title_en,
        title_ar: ad.title_ar,
        description_en: (ad.description_en || '') + '\n\n' + pageContent,
        description_ar: (ad.description_ar || '') + '\n\n' + pageContent,
      });

      if (aiData) {
        await pool.query(`
          UPDATE advertisements 
          SET meta_title_en = $1, 
              meta_title_ar = $2, 
              meta_description_en = $3, 
              meta_description_ar = $4, 
              keywords_en = $5, 
              keywords_ar = $6, 
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $7
        `, [
          aiData.meta_title_en || null,
          aiData.meta_title_ar || null,
          aiData.meta_description_en || null,
          aiData.meta_description_ar || null,
          aiData.keywords_en || null,
          aiData.keywords_ar || null,
          ad.id
        ]);
        updatedCount++;
        console.log(`[AdSeoIndexer] Successfully updated SEO meta for ad ID: ${ad.id}`);
      } else {
        console.warn(`[AdSeoIndexer] Failed to generate SEO meta for ad ID: ${ad.id}`);
      }
    }

    console.log(`[AdSeoIndexer] Maintenance job completed. Updated ${updatedCount} advertisements.`);
    return { success: true, updatedCount };
  } catch (error: any) {
    console.error('[AdSeoIndexer] Fatal error during maintenance job:', error);
    return { success: false, error: error.message };
  }
}
