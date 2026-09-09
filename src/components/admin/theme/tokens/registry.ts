import { TokenCategory, TokenDefinition } from '../types';
import { DEFAULT_LIGHT_TOKENS, DEFAULT_DARK_TOKENS } from './defaultTokens';

export const TOKEN_CATEGORIES_METADATA: Record<TokenCategory, { nameEn: string; nameAr: string; icon: string; descriptionEn: string; descriptionAr: string }> = {
  surfaces: {
    nameEn: 'Surfaces & Canvases',
    nameAr: 'الأسطح والخلفيات العامة',
    icon: 'Layers',
    descriptionEn: 'Control background colors for main canvas, cards, modals, and elevated layers',
    descriptionAr: 'التحكم في ألوان خلفية الصفحات العامة، البطاقات، النوافذ المنبثقة، والطبقات العلوية'
  },
  typography: {
    nameEn: 'Typography & Text Colors',
    nameAr: 'الخطوط وألوان النصوص',
    icon: 'Type',
    descriptionEn: 'Manage typography scale, font families, and high-contrast text shades',
    descriptionAr: 'إدارة أوزان الخطوط، عائلات الخطوط، ودرجات تباين النصوص الأساسية والهامشية'
  },
  brand_accent: {
    nameEn: 'Brand & Accent System',
    nameAr: 'الهوية البصرية ولون التمييز',
    icon: 'Sparkles',
    descriptionEn: 'Core brand primary accent, hover states, muted fills, and active focus outlines',
    descriptionAr: 'لون هوية المنصة الرئيسي، حالات التمرير، الحدود البارزة، وحلقات التركيز'
  },
  borders_dividers: {
    nameEn: 'Borders & Dividers',
    nameAr: 'الحدود والفواصل الهيكلية',
    icon: 'Square',
    descriptionEn: 'Configure outer, inner, hairline, subtle, and high-contrast separation borders',
    descriptionAr: 'تكوين الحدود الخارجية والداخلية، الفواصل الهيكلية، وخطوط التقسيم الرفيعة'
  },
  buttons_controls: {
    nameEn: 'Buttons & Interactive States',
    nameAr: 'الأزرار وعناصر التفاعل',
    icon: 'MousePointerClick',
    descriptionEn: 'Custom styling for primary, secondary, hover, and disabled action buttons',
    descriptionAr: 'تخصيص أزرار الإجراءات الرئيسية والثانوية، ألوان التحويم، وحالات التعطيل'
  },
  inputs_forms: {
    nameEn: 'Inputs, Search & Forms',
    nameAr: 'حقول الإدخال والبحث والنماذج',
    icon: 'FormInput',
    descriptionEn: 'Backgrounds, inner borders, and active ring styling for input controls',
    descriptionAr: 'خلفيات حقول الإدخال، الحدود الداخلية، وتأثيرات التحديد عند الكتابة والبحث'
  },
  admin_layout: {
    nameEn: 'Admin Layout & Data Tables',
    nameAr: 'لوحة الإدارة وجداول البيانات',
    icon: 'Table',
    descriptionEn: 'Navigation bar, sidebars, table header backgrounds, row hover highlights',
    descriptionAr: 'شريط التنقل الجانبي، خلفية ترويسة الجداول، وتأثيرات تمرير الصفوف الإدارية'
  },
  chat_messages: {
    nameEn: 'Chat Bubbles & Dialogue',
    nameAr: 'فقاعات الدردشة والرسائل',
    icon: 'MessageSquare',
    descriptionEn: 'Visual styles for user and AI assistant conversation bubbles and text',
    descriptionAr: 'التصميم البصري لفقاعات رسائل المستخدم ورسائل المساعد الذكي'
  },
  status_alerts: {
    nameEn: 'Status Alerts & Indicators',
    nameAr: 'حالات النظام والتنبيهات',
    icon: 'AlertCircle',
    descriptionEn: 'Standard WCAG colors for success, warning, danger, and informational alerts',
    descriptionAr: 'ألوان الحالات القياسية: النجاح، التحذيرات، العمليات الحرجة، والمعلومات'
  },
  geometry_elevation: {
    nameEn: 'Geometry, Radii & Shadows',
    nameAr: 'الانحناءات، الظلال والارتفاعات',
    icon: 'Box',
    descriptionEn: 'Border radii scale from sharp to rounded, and ambient elevation shadows',
    descriptionAr: 'مقاييس انحناء الحواف (Radius) والظلال البيئية المحيطية للعناصر'
  }
};

export const TOKEN_REGISTRY: TokenDefinition[] = [
  // Surfaces
  {
    key: '--surface-page',
    category: 'surfaces',
    type: 'color',
    labelEn: 'Page Canvas Background',
    labelAr: 'خلفية الصفحة الرئيسية',
    descriptionEn: 'Base background color for the root document and main view area',
    descriptionAr: 'اللون الأساسي لخلفية المستند ومنطقة العرض الرئيسية',
    defaultValueLight: DEFAULT_LIGHT_TOKENS['--surface-page'],
    defaultValueDark: DEFAULT_DARK_TOKENS['--surface-page'],
    cssVariable: '--surface-page'
  },
  {
    key: '--surface-card',
    category: 'surfaces',
    type: 'color',
    labelEn: 'Card & Container Surface',
    labelAr: 'خلفية البطاقات والحاويات',
    descriptionEn: 'Primary container background for dashboards, cards, and modal dialogs',
    descriptionAr: 'الخلفية الأساسية للبطاقات ولوحات التحكم والنوافذ المنبثقة',
    defaultValueLight: DEFAULT_LIGHT_TOKENS['--surface-card'],
    defaultValueDark: DEFAULT_DARK_TOKENS['--surface-card'],
    cssVariable: '--surface-card'
  },
  {
    key: '--surface-subtle',
    category: 'surfaces',
    type: 'color',
    labelEn: 'Subtle Section Surface',
    labelAr: 'خلفية الأقسام الفرعية والثانوية',
    descriptionEn: 'Secondary background for nested containers, toolbar strips, and badges',
    descriptionAr: 'خلفية ثانوية للحاويات المتداخلة وأشرطة الأدوات والوسوم',
    defaultValueLight: DEFAULT_LIGHT_TOKENS['--surface-subtle'],
    defaultValueDark: DEFAULT_DARK_TOKENS['--surface-subtle'],
    cssVariable: '--surface-subtle'
  },
  {
    key: '--surface-inset',
    category: 'surfaces',
    type: 'color',
    labelEn: 'Inset / Recessed Surface',
    labelAr: 'الطبقات المتداخلة الغائرة',
    descriptionEn: 'Deep recessed background for code blocks, scroll trays, and wells',
    descriptionAr: 'خلفية غائرة للكتل البرمجية، مجاري التمرير، ومناطق العرض الخاصة',
    defaultValueLight: DEFAULT_LIGHT_TOKENS['--surface-inset'],
    defaultValueDark: DEFAULT_DARK_TOKENS['--surface-inset'],
    cssVariable: '--surface-inset'
  },
  {
    key: '--surface-overlay',
    category: 'surfaces',
    type: 'color',
    labelEn: 'Modal Backdrop Overlay',
    labelAr: 'طبقة تعتيم خلفية النوافذ',
    descriptionEn: 'Semi-transparent tint layered behind modal sheets and drawers',
    descriptionAr: 'تظليل نصف شفاف يوضع خلف النوافذ المنبثقة والقوائم السفلية',
    defaultValueLight: DEFAULT_LIGHT_TOKENS['--surface-overlay'],
    defaultValueDark: DEFAULT_DARK_TOKENS['--surface-overlay'],
    cssVariable: '--surface-overlay'
  },

  // Typography
  {
    key: '--fg-primary',
    category: 'typography',
    type: 'color',
    labelEn: 'Primary Text Color',
    labelAr: 'لون النصوص الرئيسية',
    descriptionEn: 'High-contrast foreground for headings, titles, and primary content',
    descriptionAr: 'اللون الأساسي عالي التباين للعناوين والنصوص المحورية',
    defaultValueLight: DEFAULT_LIGHT_TOKENS['--fg-primary'],
    defaultValueDark: DEFAULT_DARK_TOKENS['--fg-primary'],
    cssVariable: '--fg-primary'
  },
  {
    key: '--fg-secondary',
    category: 'typography',
    type: 'color',
    labelEn: 'Secondary Text Color',
    labelAr: 'لون النصوص الثانوية',
    descriptionEn: 'Supporting text for descriptions, subheadings, and metadata',
    descriptionAr: 'النصوص المساندة للأوصاف، العناوين الفرعية، والبيانات الإضافية',
    defaultValueLight: DEFAULT_LIGHT_TOKENS['--fg-secondary'],
    defaultValueDark: DEFAULT_DARK_TOKENS['--fg-secondary'],
    cssVariable: '--fg-secondary'
  },
  {
    key: '--fg-muted',
    category: 'typography',
    type: 'color',
    labelEn: 'Muted / Helper Text',
    labelAr: 'النصوص الباهتة والمساعدة',
    descriptionEn: 'Low-emphasis text for placeholders, timestamps, and captions',
    descriptionAr: 'نصوص منخفضة التباين للتلميحات، الطوابع الزمنية، والملاحظات',
    defaultValueLight: DEFAULT_LIGHT_TOKENS['--fg-muted'],
    defaultValueDark: DEFAULT_DARK_TOKENS['--fg-muted'],
    cssVariable: '--fg-muted'
  },
  {
    key: '--fg-on-emphasis',
    category: 'typography',
    type: 'color',
    labelEn: 'Contrast Text On Accent Fills',
    labelAr: 'نص الأزرار والخلفيات الداكنة',
    descriptionEn: 'Contrasting font color on top of saturated accent backgrounds',
    descriptionAr: 'لون الخط عالي التباين فوق أزرار الإجراءات والخلفيات الملونة',
    defaultValueLight: DEFAULT_LIGHT_TOKENS['--fg-on-emphasis'],
    defaultValueDark: DEFAULT_DARK_TOKENS['--fg-on-emphasis'],
    cssVariable: '--fg-on-emphasis'
  },

  // Brand & Accent
  {
    key: '--accent',
    category: 'brand_accent',
    type: 'color',
    labelEn: 'Primary Brand Accent',
    labelAr: 'لون الهوية الرئيسي',
    descriptionEn: 'The sovereign signature color used for brand moments, links, and highlights',
    descriptionAr: 'اللون المميز لمنصة بيربليكستا المستخدم للروابط والعناصر البارزة',
    defaultValueLight: DEFAULT_LIGHT_TOKENS['--accent'],
    defaultValueDark: DEFAULT_DARK_TOKENS['--accent'],
    cssVariable: '--accent'
  },
  {
    key: '--accent-hover',
    category: 'brand_accent',
    type: 'color',
    labelEn: 'Accent Hover State',
    labelAr: 'لون التمرير عند التحويم (Hover)',
    descriptionEn: 'Optical interactive shift when hovering over accent controls',
    descriptionAr: 'التحول البصري التفاعلي عند وضع مؤشر الفأرة على الأزرار والروابط',
    defaultValueLight: DEFAULT_LIGHT_TOKENS['--accent-hover'],
    defaultValueDark: DEFAULT_DARK_TOKENS['--accent-hover'],
    cssVariable: '--accent-hover'
  },
  {
    key: '--bg-accent-emphasis',
    category: 'brand_accent',
    type: 'color',
    labelEn: 'Accent Emphasis Solid Fill',
    labelAr: 'تعبئة الأزرار المصمتة',
    descriptionEn: 'Solid background applied to primary call-to-actions',
    descriptionAr: 'الخلفية المصمتة المطبقة على أزرار الحفظ والإجراءات الرئيسية',
    defaultValueLight: DEFAULT_LIGHT_TOKENS['--bg-accent-emphasis'],
    defaultValueDark: DEFAULT_DARK_TOKENS['--bg-accent-emphasis'],
    cssVariable: '--bg-accent-emphasis'
  },
  {
    key: '--focus-outline',
    category: 'brand_accent',
    type: 'color',
    labelEn: 'Accessibility Focus Ring',
    labelAr: 'حلقة تركيز إمكانية الوصول',
    descriptionEn: 'Keyboard navigation outline ensuring strict accessibility standards',
    descriptionAr: 'إطار التركيز عند التنقل بلوحة المفاتيح لمعايير الوصول الشامل',
    defaultValueLight: DEFAULT_LIGHT_TOKENS['--focus-outline'],
    defaultValueDark: DEFAULT_DARK_TOKENS['--focus-outline'],
    cssVariable: '--focus-outline'
  },

  // Borders & Dividers
  {
    key: '--border-default',
    category: 'borders_dividers',
    type: 'color',
    labelEn: 'Default Structural Border',
    labelAr: 'الحدود الهيكلية الافتراضية',
    descriptionEn: 'Standard boundary lines for cards, panels, and modal edges',
    descriptionAr: 'الحدود القياسية لحواف البطاقات واللوحات والنوافذ',
    defaultValueLight: DEFAULT_LIGHT_TOKENS['--border-default'],
    defaultValueDark: DEFAULT_DARK_TOKENS['--border-default'],
    cssVariable: '--border-default'
  },
  {
    key: '--border-outer-input',
    category: 'borders_dividers',
    type: 'color',
    labelEn: 'Outer Input Container Border',
    labelAr: 'الحد الخارجي للحاويات وحقول الإدخال',
    descriptionEn: 'Crisp outer border for input wrappers and compound components',
    descriptionAr: 'الحد الخارجي الواضح لإطارات حقول الإدخال والمكونات المركبة',
    defaultValueLight: DEFAULT_LIGHT_TOKENS['--border-outer-input'],
    defaultValueDark: DEFAULT_DARK_TOKENS['--border-outer-input'],
    cssVariable: '--border-outer-input'
  },
  {
    key: '--border-inner-input',
    category: 'borders_dividers',
    type: 'color',
    labelEn: 'Inner Nested Border',
    labelAr: 'الحد الداخلي للعناصر المدمجة',
    descriptionEn: 'Subtle boundary between grouped action buttons and inner sections',
    descriptionAr: 'الحد الخافت الفاصل بين الأزرار المجمعة والأقسام الداخلية',
    defaultValueLight: DEFAULT_LIGHT_TOKENS['--border-inner-input'],
    defaultValueDark: DEFAULT_DARK_TOKENS['--border-inner-input'],
    cssVariable: '--border-inner-input'
  },
  {
    key: '--border-accent',
    category: 'borders_dividers',
    type: 'color',
    labelEn: 'Accent Selected Border',
    labelAr: 'حد التمييز عند الاختيار',
    descriptionEn: 'Highlight border for active tabs, selected cards, and focused rows',
    descriptionAr: 'حد التمييز للتبويبات النشطة، البطاقات المحددة، والصفوف المختارة',
    defaultValueLight: DEFAULT_LIGHT_TOKENS['--border-accent'],
    defaultValueDark: DEFAULT_DARK_TOKENS['--border-accent'],
    cssVariable: '--border-accent'
  },

  // Buttons & Controls
  {
    key: '--bg-btn-primary',
    category: 'buttons_controls',
    type: 'color',
    labelEn: 'Primary Button Background',
    labelAr: 'خلفية الزر الرئيسي',
    descriptionEn: 'Background fill for high-priority user actions',
    descriptionAr: 'اللون التعبوي لأزرار الإجراءات ذات الأولوية القصوى',
    defaultValueLight: DEFAULT_LIGHT_TOKENS['--bg-btn-primary'],
    defaultValueDark: DEFAULT_DARK_TOKENS['--bg-btn-primary'],
    cssVariable: '--bg-btn-primary'
  },
  {
    key: '--fg-btn-primary',
    category: 'buttons_controls',
    type: 'color',
    labelEn: 'Primary Button Text',
    labelAr: 'نص الزر الرئيسي',
    descriptionEn: 'Label color for primary buttons with optimal contrast',
    descriptionAr: 'لون النص داخل الأزرار الرئيسية لضمان أقصى وضوح',
    defaultValueLight: DEFAULT_LIGHT_TOKENS['--fg-btn-primary'],
    defaultValueDark: DEFAULT_DARK_TOKENS['--fg-btn-primary'],
    cssVariable: '--fg-btn-primary'
  },
  {
    key: '--bg-btn-secondary',
    category: 'buttons_controls',
    type: 'color',
    labelEn: 'Secondary Button Background',
    labelAr: 'خلفية الزر الثانوي',
    descriptionEn: 'Surface fill for neutral or secondary utility actions',
    descriptionAr: 'خلفية أزرار الإلغاء والأدوات المساندة المحايدة',
    defaultValueLight: DEFAULT_LIGHT_TOKENS['--bg-btn-secondary'],
    defaultValueDark: DEFAULT_DARK_TOKENS['--bg-btn-secondary'],
    cssVariable: '--bg-btn-secondary'
  },

  // Inputs & Forms
  {
    key: '--bg-input',
    category: 'inputs_forms',
    type: 'color',
    labelEn: 'Input Field Background',
    labelAr: 'خلفية حقول الإدخال والبحث',
    descriptionEn: 'Surface color inside text inputs, textareas, and dropdown selects',
    descriptionAr: 'لون خلفية حقول النص، مربعات الكتابة، والقوائم المنسدلة',
    defaultValueLight: DEFAULT_LIGHT_TOKENS['--bg-input'],
    defaultValueDark: DEFAULT_DARK_TOKENS['--bg-input'],
    cssVariable: '--bg-input'
  },
  {
    key: '--border-focus',
    category: 'inputs_forms',
    type: 'color',
    labelEn: 'Input Active Focus Border',
    labelAr: 'حد الحقل عند الكتابة والتركيز',
    descriptionEn: 'Dynamic border state activated while typing in input fields',
    descriptionAr: 'حالة الحد النشط المتوهج عند الكتابة داخل الحقول',
    defaultValueLight: DEFAULT_LIGHT_TOKENS['--border-focus'],
    defaultValueDark: DEFAULT_DARK_TOKENS['--border-focus'],
    cssVariable: '--border-focus'
  },

  // Admin Layout & Data Tables
  {
    key: '--admin-nav-bg',
    category: 'admin_layout',
    type: 'color',
    labelEn: 'Admin Sidebar / Nav Background',
    labelAr: 'خلفية شريط التنقل الإداري',
    descriptionEn: 'Background tone for admin navigation bar and tool drawers',
    descriptionAr: 'الدرجة اللونية لشريط التنقل وأدراج الأدوات في لوحة الإدارة',
    defaultValueLight: DEFAULT_LIGHT_TOKENS['--admin-nav-bg'],
    defaultValueDark: DEFAULT_DARK_TOKENS['--admin-nav-bg'],
    cssVariable: '--admin-nav-bg'
  },
  {
    key: '--admin-nav-item-active',
    category: 'admin_layout',
    type: 'color',
    labelEn: 'Active Nav Item Highlight',
    labelAr: 'خلفية عنصر التنقل النشط',
    descriptionEn: 'Selected indicator background for the current active admin route',
    descriptionAr: 'الخلفية المميزة للقسم المفتوح حالياً في لوحة الإدارة',
    defaultValueLight: DEFAULT_LIGHT_TOKENS['--admin-nav-item-active'],
    defaultValueDark: DEFAULT_DARK_TOKENS['--admin-nav-item-active'],
    cssVariable: '--admin-nav-item-active'
  },
  {
    key: '--admin-table-header-bg',
    category: 'admin_layout',
    type: 'color',
    labelEn: 'Data Table Header Background',
    labelAr: 'خلفية ترويسة الجداول الإدارية',
    descriptionEn: 'Distinct header fill for structured financial and user data tables',
    descriptionAr: 'خلفية واضحة لترويسة أعمدة جداول المستخدمين والبيانات المالية',
    defaultValueLight: DEFAULT_LIGHT_TOKENS['--admin-table-header-bg'],
    defaultValueDark: DEFAULT_DARK_TOKENS['--admin-table-header-bg'],
    cssVariable: '--admin-table-header-bg'
  },
  {
    key: '--admin-table-row-hover',
    category: 'admin_layout',
    type: 'color',
    labelEn: 'Table Row Hover State',
    labelAr: 'لون تمرير صف الجدول',
    descriptionEn: 'Interactive hover feedback when tracking rows in dense tables',
    descriptionAr: 'تأثير التمرير التفاعلي عند تتبع الصفوف في الجداول الكثيفة',
    defaultValueLight: DEFAULT_LIGHT_TOKENS['--admin-table-row-hover'],
    defaultValueDark: DEFAULT_DARK_TOKENS['--admin-table-row-hover'],
    cssVariable: '--admin-table-row-hover'
  },

  // Chat Messages
  {
    key: '--chat-bubble-user',
    category: 'chat_messages',
    type: 'color',
    labelEn: 'User Chat Bubble Background',
    labelAr: 'خلفية رسالة المستخدم',
    descriptionEn: 'Bubble fill for messages sent by the user',
    descriptionAr: 'خلفية الفقاعة للرسائل الصادرة من المستخدم',
    defaultValueLight: DEFAULT_LIGHT_TOKENS['--chat-bubble-user'],
    defaultValueDark: DEFAULT_DARK_TOKENS['--chat-bubble-user'],
    cssVariable: '--chat-bubble-user'
  },
  {
    key: '--chat-bubble-user-text',
    category: 'chat_messages',
    type: 'color',
    labelEn: 'User Chat Message Text',
    labelAr: 'نص رسالة المستخدم',
    descriptionEn: 'Readable typography inside user message bubbles',
    descriptionAr: 'لون الخط داخل فقاعة رسائل المستخدم',
    defaultValueLight: DEFAULT_LIGHT_TOKENS['--chat-bubble-user-text'],
    defaultValueDark: DEFAULT_DARK_TOKENS['--chat-bubble-user-text'],
    cssVariable: '--chat-bubble-user-text'
  },
  {
    key: '--chat-bubble-assistant',
    category: 'chat_messages',
    type: 'color',
    labelEn: 'Assistant Chat Bubble Background',
    labelAr: 'خلفية رسالة المساعد الذكي',
    descriptionEn: 'Bubble fill for AI responses and generated outputs',
    descriptionAr: 'الخلفية المخصصة لإجابات الذكاء الاصطناعي والمخرجات',
    defaultValueLight: DEFAULT_LIGHT_TOKENS['--chat-bubble-assistant'],
    defaultValueDark: DEFAULT_DARK_TOKENS['--chat-bubble-assistant'],
    cssVariable: '--chat-bubble-assistant'
  },
  {
    key: '--chat-bubble-assistant-text',
    category: 'chat_messages',
    type: 'color',
    labelEn: 'Assistant Message Text',
    labelAr: 'نص رسالة المساعد الذكي',
    descriptionEn: 'Typography color for AI responses',
    descriptionAr: 'لون النصوص لإجابات المساعد الذكي',
    defaultValueLight: DEFAULT_LIGHT_TOKENS['--chat-bubble-assistant-text'],
    defaultValueDark: DEFAULT_DARK_TOKENS['--chat-bubble-assistant-text'],
    cssVariable: '--chat-bubble-assistant-text'
  },

  // Status Alerts
  {
    key: '--fg-success',
    category: 'status_alerts',
    type: 'color',
    labelEn: 'Success State Color',
    labelAr: 'لون النجاح والعمليات المكتملة',
    descriptionEn: 'Indicator for confirmed transactions, active licenses, and green status',
    descriptionAr: 'مؤشر المعاملات المؤكدة، الاشتراكات النشطة، وحالات الاتصال',
    defaultValueLight: DEFAULT_LIGHT_TOKENS['--fg-success'],
    defaultValueDark: DEFAULT_DARK_TOKENS['--fg-success'],
    cssVariable: '--fg-success'
  },
  {
    key: '--fg-warning',
    category: 'status_alerts',
    type: 'color',
    labelEn: 'Warning State Color',
    labelAr: 'لون التنبيه والتحذير',
    descriptionEn: 'Alert for quota thresholds, pending actions, and cautions',
    descriptionAr: 'تنبيه تجاوز سقف الاستهلاك، العمليات المعلقة، والتحذيرات',
    defaultValueLight: DEFAULT_LIGHT_TOKENS['--fg-warning'],
    defaultValueDark: DEFAULT_DARK_TOKENS['--fg-warning'],
    cssVariable: '--fg-warning'
  },
  {
    key: '--fg-danger',
    category: 'status_alerts',
    type: 'color',
    labelEn: 'Danger / Error Color',
    labelAr: 'لون الأخطاء والعمليات الخطرة',
    descriptionEn: 'Indicator for failed operations, critical errors, and destructive actions',
    descriptionAr: 'مؤشر العمليات الفاشلة، الأخطاء الحرجة، وإجراءات الحذف',
    defaultValueLight: DEFAULT_LIGHT_TOKENS['--fg-danger'],
    defaultValueDark: DEFAULT_DARK_TOKENS['--fg-danger'],
    cssVariable: '--fg-danger'
  },
  {
    key: '--fg-info',
    category: 'status_alerts',
    type: 'color',
    labelEn: 'Info State Color',
    labelAr: 'لون المعلومات والإشعارات',
    descriptionEn: 'Neutral informational callouts and technical metrics',
    descriptionAr: 'الملاحظات الإرشادية المحايدة والمقاييس التقنية',
    defaultValueLight: DEFAULT_LIGHT_TOKENS['--fg-info'],
    defaultValueDark: DEFAULT_DARK_TOKENS['--fg-info'],
    cssVariable: '--fg-info'
  },

  // Geometry & Elevation
  {
    key: '--radius-sm',
    category: 'geometry_elevation',
    type: 'size',
    labelEn: 'Small Border Radius',
    labelAr: 'نصف قطر الانحناء الصغير',
    descriptionEn: 'Corner radius for pills, chips, and small control badges',
    descriptionAr: 'انحناء الزوايا للأزرار المصغرة والشارات الصغيرة',
    defaultValueLight: DEFAULT_LIGHT_TOKENS['--radius-sm'],
    defaultValueDark: DEFAULT_DARK_TOKENS['--radius-sm'],
    options: ['2px', '4px', '6px', '8px', '10px'],
    cssVariable: '--radius-sm'
  },
  {
    key: '--radius-md',
    category: 'geometry_elevation',
    type: 'size',
    labelEn: 'Medium Border Radius (Default)',
    labelAr: 'نصف قطر الانحناء المتوسط (الافتراضي)',
    descriptionEn: 'Corner radius for standard buttons, inputs, and dialog cards',
    descriptionAr: 'انحناء الزوايا للأزرار وحقول الإدخال والبطاقات المعتادة',
    defaultValueLight: DEFAULT_LIGHT_TOKENS['--radius-md'],
    defaultValueDark: DEFAULT_DARK_TOKENS['--radius-md'],
    options: ['8px', '10px', '12px', '14px', '16px'],
    cssVariable: '--radius-md'
  },
  {
    key: '--radius-lg',
    category: 'geometry_elevation',
    type: 'size',
    labelEn: 'Large Border Radius',
    labelAr: 'نصف قطر الانحناء الكبير',
    descriptionEn: 'Corner radius for major panels, modals, and container shells',
    descriptionAr: 'انحناء الزوايا للوحات الكبرى والنوافذ المنبثقة الأساسية',
    defaultValueLight: DEFAULT_LIGHT_TOKENS['--radius-lg'],
    defaultValueDark: DEFAULT_DARK_TOKENS['--radius-lg'],
    options: ['12px', '16px', '20px', '24px'],
    cssVariable: '--radius-lg'
  }
];
