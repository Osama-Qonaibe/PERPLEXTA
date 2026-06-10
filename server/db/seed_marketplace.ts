/**
 * Marketplace Seed Script
 * Inserts the 13 default marketplace items into the database under admin user (id=1)
 * Run once: npx ts-node server/db/seed_marketplace.ts
 * Safe to re-run — uses ON CONFLICT DO NOTHING based on title_en
 */

import { pool } from './index.js';

const DEFAULT_ITEMS = [
  {
    title_en: 'Apex SaaS Multi-Tenant ERP Suite',
    title_ar: 'منظومة Apex لإدارة الموارد والمؤسسات SaaS',
    description_en: 'A complete modular hyper-optimized enterprise SaaS ERP with automated billing, analytics dashboard, dynamic routing, and role-based access control.',
    description_ar: 'نظام تخطيط موارد المؤسسات السحابي والأكثر مرونة وكفاءة، يدمج حسابات الفوترة والتحليلات البيانية والتحكم المتقدم بالصلاحيات للمنشآت الكبرى.',
    price: 899.00,
    category_en: 'SaaS Systems',
    category_ar: 'أنظمة SaaS',
    image_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1080&h=1080&fit=crop',
    highlight_tag: 'featured',
    license_type: 'commercial_standard',
    referral_percent: 20
  },
  {
    title_en: 'Sovereign Mobile Crypto Wallet App',
    title_ar: 'تطبيق محفظة العملات الرقمية السيادي للجوال',
    description_en: 'Highly secure cross-platform React Native crypto wallet supporting biometric auth, real-time price feeds, gas optimization, and wallet connect.',
    description_ar: 'محفظة عملات مشفرة فائقة الأمان مبنية لتعمل على نظامي آندرويد وآي أو إس مع واجهات تفاعلية مذهلة، ومكاملة البصمة ومؤشرات الأسعار الفورية.',
    price: 450.00,
    category_en: 'Mobile Apps',
    category_ar: 'تطبيقات الجوال',
    image_url: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=1080&h=1080&fit=crop',
    highlight_tag: 'trending',
    license_type: 'commercial_standard',
    referral_percent: 20
  },
  {
    title_en: 'Quantum Scalper High-Frequency Trading Bot',
    title_ar: 'بوت Quantum Scalper للتداول عالي التردد والخاطف',
    description_en: 'Automated trading system utilizing ultra-fast scalp strategies on Binance & Bybit. Programmed in Node.js and customizable with technical indicators.',
    description_ar: 'نظام تداول مؤتمت مصمم لإتمام صفقات سريعة وخاطفة على منصات التداول الكبرى بدقة متناهية وزمن استجابة فائق الصغر للربح السريع.',
    price: 699.00,
    category_en: 'Trading Bots',
    category_ar: 'بوتات التداول',
    image_url: 'https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=1080&h=1080&fit=crop',
    highlight_tag: 'best_seller',
    license_type: 'commercial_standard',
    referral_percent: 20
  },
  {
    title_en: 'Perplexta Premium SaaS Landing Page Kit',
    title_ar: 'قوالب صفحات هبوط المواقع والشركات الممتازة',
    description_en: 'A production-ready responsive Next.js landing page compiled with stunning Framer Motion layout animations, eye-safe dark mode, and custom contact forms.',
    description_ar: 'صفحات هبوط غاية في الجاذبية والأناقة مبنية باستخدام Next.js و Tailwind CSS، مصممة لاستقطاب العملاء وزيادة التحويل والبيع السريع للبرمجيات.',
    price: 120.00,
    category_en: 'Templates & Sites',
    category_ar: 'قوالب ومواقع',
    image_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1080&h=1080&fit=crop',
    highlight_tag: 'new',
    license_type: 'commercial_standard',
    referral_percent: 20
  },
  {
    title_en: 'Hyper-Intelligence LLM Router Plugin',
    title_ar: 'إضافة التوجيه الذكي والربط بنماذج الذكاء الاصطناعي',
    description_en: 'Universal backend middleware to securely route prompts across OpenAI, Gemini & Anthropic with local vector database search and semantic memory caching.',
    description_ar: 'برمجية وسيطة ممتازة لربط الأنظمة بنماذج الذكاء الاصطناعي مع إتاحة استدعاء متوازي واستبدال تلقائي لحفظ ميزانية التشغيل ومنع توقف الخدمة.',
    price: 180.00,
    category_en: 'System Plugins',
    category_ar: 'إضافات الأنظمة',
    image_url: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=1080&h=1080&fit=crop',
    highlight_tag: 'trending',
    license_type: 'commercial_standard',
    referral_percent: 20
  },
  {
    title_en: 'Sovereign Startup-In-A-Box Tech Suite',
    title_ar: 'حزمة إطلاق المشاريع التقنية والشركات كاملة',
    description_en: 'Eradicate technical delays with full-stack templates. Compiles pre-built Auth, Stripe plans, admin database dashboard, mail templates, SEO config, and server setups.',
    description_ar: 'حزمة تقنية تأسيسية جاهزة تبدأ بها مشروعك فوراً؛ تختصر أسابيع التكويد عبر توفير الفوترة، وقواعد البيانات والتحليلات الجاهزة للتعديل.',
    price: 349.00,
    category_en: 'Startup-in-a-Box',
    category_ar: 'Startup-in-a-Box',
    image_url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1080&h=1080&fit=crop',
    highlight_tag: 'featured',
    license_type: 'commercial_extended',
    referral_percent: 20
  },
  {
    title_en: 'Perplexta Enterprise Figma Design System v3',
    title_ar: 'ملفات نظام تصميم واجهات المعاملات الاحترافية Figma v3',
    description_en: 'Pixel-perfect unified multi-device component library including charts, tables, cards, and adaptive grids. Built strictly with auto-layouts and design tokens.',
    description_ar: 'نظام متكامل وموحد من المكونات الرسومية وتخطيطات الشاشات لمصممي ومطوري الويب مبني بدقة متناهية ومكامل للوضع الداكن والفاتح.',
    price: 89.00,
    category_en: 'Figma Files',
    category_ar: 'ملفات Figma',
    image_url: 'https://images.unsplash.com/photo-1581291518655-9523c932ecbe?w=1080&h=1080&fit=crop',
    highlight_tag: 'featured',
    license_type: 'cc_by',
    referral_percent: 15
  },
  {
    title_en: 'Trend-Pulse Quantitative Pine Indicator Suite',
    title_ar: 'مؤشر Trend-Pulse للتحليل الفني وزخم الاتجاهات',
    description_en: 'Custom TradingView Pine script indicator offering clean trend reversal alerts, dynamic volatility channels, and automated backtesting modules.',
    description_ar: 'مؤشر فني برمجي لمنصة TradingView يقيس كميات التداول وزخم الاتجاه لمنحك نقاط دخول وخروج مؤكدة وخوارزميات مجهّزة بأمان كامل.',
    price: 150.00,
    category_en: 'Technical Indicators',
    category_ar: 'مؤشرات فنية',
    image_url: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=1080&h=1080&fit=crop',
    highlight_tag: 'trending',
    license_type: 'commercial_standard',
    referral_percent: 20
  },
  {
    title_en: 'Synthesized AI Agentic Workflow Pack',
    title_ar: 'ملفات سير عمل أتمتة الأنظمة باستخدام العملاء الأذكياء',
    description_en: 'Pre-configured workflow schemes for Make, n8n, and LangChain that automate continuous leads tracking, semantic CRM integration, and mailing broadcasts.',
    description_ar: 'مخططات وجداول عمل ذكية جاهزة لتلقين خوادم الأتمتة وجعل روبوتات المحادثة تدير عمليات المبيعات والدعم الفني وتحديث البيانات كلياً.',
    price: 220.00,
    category_en: 'AI & Automation',
    category_ar: 'AI & أتمتة',
    image_url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1080&h=1080&fit=crop',
    highlight_tag: 'new',
    license_type: 'commercial_standard',
    referral_percent: 20
  },
  {
    title_en: 'Sovereign OSINT Intelligence & Security Codex',
    title_ar: 'الدليل الشامل لاستخبارات المصادر المفتوحة والأمن السيبراني',
    description_en: 'Deep tactical handbook for cybersecurity audit, open source intelligence collection, server defensive config, and operational OPSEC privacy standards.',
    description_ar: 'مرجع وتدريب سيادي غني بالمعلومات التكتيكية لحماية وتأمين الخوادم والاشتغال على جمع ومعالجة معلومات المصادر المفتوحة بأعلى درجات الأمان.',
    price: 45.00,
    category_en: 'E-books & Guides',
    category_ar: 'كتب وأدلة رقمية',
    image_url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1080&h=1080&fit=crop',
    highlight_tag: 'best_seller',
    license_type: 'commercial_standard',
    referral_percent: 20
  },
  {
    title_en: 'Agile Agency PLR Expansion Pack',
    title_ar: 'حزم إعادة البيع والترخيص غير المحدود لوكالات التقنية PLR',
    description_en: 'Unlock master resell rights for 15+ premium technical toolkits, ebooks, and marketing kits. Rebrand, sell, and retain 100% of profit channels.',
    description_ar: 'حقوق إعادة بيع وتوزيع غير محدودة لحزمة برمجية وتثقيفية كاملة، تتيح لك تخصيص الهوية باسم شركتك للبيع للمؤسسات والاستئثار بكامل الربح.',
    price: 299.00,
    category_en: 'PLR/MRR Products',
    category_ar: 'منتجات إعادة البيع PLR',
    image_url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1080&h=1080&fit=crop',
    highlight_tag: 'exclusive',
    license_type: 'commercial_extended',
    referral_percent: 25
  },
  {
    title_en: 'Perplexta Pure Core - Open Source Framework',
    title_ar: 'إطار عمل بيربليكستا كور - مفتوح المصدر بالكامل',
    description_en: 'Ultimate open-source lightweight modular Web & API framework built with pure TypeScript, zero-dependency streaming router, and military-grade encryption.',
    description_ar: 'النسخة مفتوحة المصدر من إطار عمل بيربليكستا الفائق لبناء خوادم وتطبيقات الويب بسرعات قياسية وتشفير عسكري لحماية ونقل البيانات بمرونة تامة.',
    price: 0.00,
    category_en: 'Open Source Systems',
    category_ar: 'أنظمة مفتوحة المصدر',
    image_url: 'https://images.unsplash.com/photo-1618401471353-b98aedd07871?w=1080&h=1080&fit=crop',
    highlight_tag: 'free',
    license_type: 'mit',
    referral_percent: 0
  },
  {
    title_en: 'Free Tailwind Slate UI Dashboard Kit',
    title_ar: 'حزمة قوالب ولوحات تحكم Tailwind المجانية',
    description_en: 'Stunning premium dark-mode dashboard template featuring widgets, interactive telemetry charts, and customized responsive inputs.',
    description_ar: 'قالب لوحة تحكم وتصميم واجهات مستخدم مذهل مبني كلياً بـ Tailwind CSS مع أزرار ومؤشرات تفاعلية ومخططات بيانية مفتوحة للمطورين والنخبة.',
    price: 0.00,
    category_en: 'Free Templates',
    category_ar: 'قوالب مجانية',
    image_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1080&h=1080&fit=crop',
    highlight_tag: 'free',
    license_type: 'mit',
    referral_percent: 0
  }
];

async function seedMarketplace() {
  console.log('🌱 Starting marketplace seed...');

  // Ensure admin user exists (id=1)
  const adminCheck = await pool.query('SELECT id FROM users WHERE id = 1 LIMIT 1');
  if (adminCheck.rows.length === 0) {
    console.error('❌ Admin user (id=1) not found. Please create the admin user first.');
    process.exit(1);
  }

  let inserted = 0;
  let skipped = 0;

  for (const item of DEFAULT_ITEMS) {
    try {
      const result = await pool.query(
        `INSERT INTO marketplace_items (
          user_id, title_en, title_ar, description_en, description_ar,
          price, category_en, category_ar, image_url, status,
          highlight_tag, license_type, referral_percent, views
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'approved',$10,$11,$12,$13)
        ON CONFLICT (title_en) DO NOTHING
        RETURNING id`,
        [
          1,
          item.title_en, item.title_ar,
          item.description_en, item.description_ar,
          item.price,
          item.category_en, item.category_ar,
          item.image_url,
          item.highlight_tag,
          item.license_type,
          item.referral_percent,
          Math.floor(Math.random() * 200) + 30 // realistic initial view count
        ]
      );

      if (result.rows.length > 0) {
        console.log(`  ✅ Inserted: ${item.title_en} (id: ${result.rows[0].id})`);
        inserted++;
      } else {
        console.log(`  ⏭️  Skipped (already exists): ${item.title_en}`);
        skipped++;
      }
    } catch (err: any) {
      console.error(`  ❌ Error inserting "${item.title_en}":`, err.message);
    }
  }

  console.log(`\n🎉 Seed complete! Inserted: ${inserted} | Skipped: ${skipped}`);
  await pool.end();
}

seedMarketplace().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
