import type { QueryClient } from './types.js';
import { ensureColumnsBulk } from './helpers.js';

export const EXTERNAL_SCHEMA_TABLES: { name: string; query: string }[] = [
  {
    name: 'blog_articles',
    query: `CREATE TABLE IF NOT EXISTS blog_articles (
        id SERIAL PRIMARY KEY,
        author_id INTEGER NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        title_en VARCHAR(255) NOT NULL,
        title_ar VARCHAR(255) NOT NULL,
        content_en TEXT NOT NULL,
        content_ar TEXT NOT NULL,
        summary_en TEXT,
        summary_ar TEXT,
        image_url TEXT,
        image_asset_id UUID,
        category_en VARCHAR(100),
        category_ar VARCHAR(100),
        views INTEGER DEFAULT 0,
        view_count INTEGER DEFAULT 0,
        reading_time_minutes INTEGER DEFAULT 5,
        tags TEXT[] DEFAULT ARRAY[]::TEXT[],
        is_published BOOLEAN DEFAULT false,
        published_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
  },
  {
    name: 'blog_comments',
    query: `CREATE TABLE IF NOT EXISTS blog_comments (
        id SERIAL PRIMARY KEY,
        article_id INTEGER NOT NULL REFERENCES blog_articles(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL,
        parent_id INTEGER,
        content TEXT NOT NULL,
        comment TEXT,
        is_approved BOOLEAN DEFAULT true,
        like_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
  },
  {
    name: 'blog_ratings',
    query: `CREATE TABLE IF NOT EXISTS blog_ratings (
        id SERIAL PRIMARY KEY,
        article_id INTEGER NOT NULL REFERENCES blog_articles(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (article_id, user_id)
      )`
  }
];

export async function applyExternalColumnEnforcements(targetExternalPool: QueryClient) {
  // === 2. External DB Column Enforcement ===
  await ensureColumnsBulk(targetExternalPool, 'blog_articles', {
    author_id: { type: 'INTEGER' },
    slug: { type: 'VARCHAR(255)' },
    title_en: { type: 'VARCHAR(255)' },
    title_ar: { type: 'VARCHAR(255)' },
    content_en: { type: 'TEXT' },
    content_ar: { type: 'TEXT' },
    summary_en: { type: 'TEXT' },
    summary_ar: { type: 'TEXT' },
    image_url: { type: 'TEXT' },
    image_asset_id: { type: 'UUID' },
    view_count: { type: 'INTEGER', default: 0 },
    reading_time_minutes: { type: 'INTEGER', default: 5 },
    tags: { type: 'TEXT[]', default: "ARRAY[]::TEXT[]" },
    is_published: { type: 'BOOLEAN', default: false },
    published_at: { type: 'TIMESTAMP' }
  });

  await ensureColumnsBulk(targetExternalPool, 'blog_comments', {
    article_id: { type: 'INTEGER' },
    user_id: { type: 'INTEGER' },
    parent_id: { type: 'INTEGER' },
    comment: { type: 'TEXT' },
    is_approved: { type: 'BOOLEAN', default: true },
    like_count: { type: 'INTEGER', default: 0 }
  });

  await ensureColumnsBulk(targetExternalPool, 'blog_ratings', {
    article_id: { type: 'INTEGER' },
    user_id: { type: 'INTEGER' },
    rating: { type: 'INTEGER', default: 5 }
  });
}

export const EXTERNAL_INDEXES: string[] = [
  `CREATE INDEX IF NOT EXISTS idx_articles_title_fts ON blog_articles USING GIN(to_tsvector('english', title_en))`,
  `CREATE INDEX IF NOT EXISTS idx_articles_content_fts ON blog_articles USING GIN(to_tsvector('english', content_en))`,
  `CREATE INDEX IF NOT EXISTS idx_blog_comments_article_id ON blog_comments(article_id)`,
  `CREATE INDEX IF NOT EXISTS idx_blog_ratings_article_id ON blog_ratings(article_id)`,
  `CREATE INDEX IF NOT EXISTS idx_blog_articles_image_asset_id ON blog_articles(image_asset_id)`
];
