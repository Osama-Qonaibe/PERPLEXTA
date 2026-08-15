import net from 'net';
import dns from 'dns';

export const FOLLOW_UP_PATTERN = /(?:\[(?:FOLLOW_?UPS?(?:_START)?|FOLLOW[\s-_]UPS?|أسئلة[_\s-]متابعة|اسئلة[_\s-]متابعة|أسئلة[_\s-]المتابعة|اسئلة[_\s-]المتابعة|أسئلة[_\s-]متابعة[_\s-]مقترحة|اسئلة[_\s-]متابعة[_\s-]مقترحة|فوللو[_\s-]?(?:ابس|اب)|فولو[_\s-]?(?:ابس|اب)|اقتراحات[_\s-]متابعة|اقتراحات[_\s-]المتابعة|اقتراحات[_\s-]تفاعلية|اقتراحات|أسئلة[_\s-]مقترحة|اسئلة[_\s-]مقترحة|Follow-?ups?|Follow-?up[\s_]Questions|Suggested[\s_]Questions|Related[\s_]Questions|NEXT_STEPS|SUGGESTIONS)\]|(?:\*\*|#{1,4}\s*|\[)?(?:أسئلة[_\s-]المتابعة|أسئلة[_\s-]متابعة|اسئلة[_\s-]متابعة|فوللو[_\s-]ابس|فولو[_\s-]ابس|فوللو[_\s-]اب|فولو[_\s-]اب|Follow-?ups?|Follow-?up[\s_]Questions|Suggested[\s_]Questions|أسئلة[_\s-]مقترحة|اسئلة[_\s-]مقترحة|FOLLOW_?UPS?(?:_START)?|FOLLOW[\s-_]UPS?|اقتراحات[_\s-]متابعة|اقتراحات[_\s-]المتابعة|اقتراحات[_\s-]تفاعلية|اقتراحات|SUGGESTIONS|NEXT_STEPS)(?:\*\*|:|\])?)\n?([\s\S]*)$/i;

export function formatActionableSuggestion(suggestion: string): string {
  if (!suggestion) return '';
  let s = suggestion.trim();

  // Strip leading numbering or bullet points
  s = s.replace(/^\s*(?:\d+[\.\)\-:]|\*|-|•|–|—|>|\+)\s*/, '').trim();

  // Arabic transformations: Convert assistant question forms into first-person user requests
  // Complex prefixes: هل ترغب في أن أرفق / أضيف / أشرح / أقدم ...
  s = s.replace(/^هل\s+(?:ترغب|تود|تريد|تفضل)\s+(?:في\s+)?أن\s+(?:أرفق|ارفق)\s+/i, 'أرغب بإرفاق ');
  s = s.replace(/^هل\s+(?:ترغب|تود|تريد|تفضل)\s+(?:في\s+)?أن\s+(?:أضيف|اضيف|أضع|اضع)\s+/i, 'أرغب بإضافة ');
  s = s.replace(/^هل\s+(?:ترغب|تود|تريد|تفضل)\s+(?:في\s+)?أن\s+(?:أشرح|اشرح|أوضح|اوضح)\s+/i, 'أرغب بشرح وتوضيح ');
  s = s.replace(/^هل\s+(?:ترغب|تود|تريد|تفضل)\s+(?:في\s+)?أن\s+(?:أحول|احول|أعيد|اعيد)\s+/i, 'أرغب بتحويل ');
  s = s.replace(/^هل\s+(?:ترغب|تود|تريد|تفضل)\s+(?:في\s+)?أن\s+(?:أطور|اطور|أحسن|احسن)\s+/i, 'أرغب بتحسين ');
  s = s.replace(/^هل\s+(?:ترغب|تود|تريد|تفضل)\s+(?:في\s+)?أن\s+(?:أقدم|اقدم|أستعرض|استعرض|أعرض|اعرض)\s+/i, 'أرغب باستعراض ');
  s = s.replace(/^هل\s+(?:ترغب|تود|تريد|تفضل)\s+(?:في\s+)?أن\s+(?:أقوم|اقوم)\s+بـ?\s*/i, 'أرغب بـ ');
  s = s.replace(/^هل\s+(?:ترغب|تود|تريد|تفضل)\s+(?:في\s+)?أن\s+/i, 'أرغب بـ ');

  // Direct question verbs: هل ترغب / هل تود / هل تريد / هل تفضل
  s = s.replace(/^هل\s+(?:ترغب|تود)\s+(?:في\s+|بـ?\s*)?/i, 'أرغب بـ ');
  s = s.replace(/^هل\s+تريد\s+(?:في\s+|بـ?\s*)?/i, 'أريد ');
  s = s.replace(/^هل\s+تفضل\s+(?:في\s+|بـ?\s*)?/i, 'أفضل ');
  s = s.replace(/^هل\s+تحتاج\s+(?:إلى|الى)?\s*/i, 'أحتاج إلى ');
  s = s.replace(/^هل\s+تبحث\s+عن\s*/i, 'أبحث عن ');
  s = s.replace(/^هل\s+يمكننا\s+(?:أن\s+)?/i, 'أرغب بـ ');
  s = s.replace(/^هل\s+يمكنك\s+(?:أن\s+)?/i, 'أرغب بـ ');
  s = s.replace(/^هل\s+نستطيع\s+(?:أن\s+)?/i, 'أرغب بـ ');

  // Clean grammatical prepositions
  s = s.replace(/^أرغب بـ\s+(?:في|بـ?|إلى|الى)\s*/i, 'أرغب بـ ');
  s = s.replace(/^أرغب بـ\s*أ/i, 'أرغب بإ');
  s = s.replace(/^أرغب بـ\s*ت/i, 'أرغب بت');
  s = s.replace(/^أرغب بـ\s*م/i, 'أرغب بم');
  s = s.replace(/^أرغب بـ\s*ا/i, 'أرغب با');
  s = s.replace(/^أرغب بـ\s+/i, 'أرغب بـ ');

  // English transformations
  s = s.replace(/^(?:would\s+you\s+like\s+me\s+to|do\s+you\s+want\s+me\s+to|shall\s+i)\s+/i, 'Please ');
  s = s.replace(/^(?:would\s+you\s+like\s+to|do\s+you\s+want\s+to)\s+/i, 'I want to ');
  s = s.replace(/^should\s+we\s+/i, "Let's ");
  s = s.replace(/^can\s+we\s+/i, "Let's ");

  // Strip trailing question marks from declarative action prompts
  if (
    s.startsWith('أرغب') ||
    s.startsWith('أريد') ||
    s.startsWith('أفضل') ||
    s.startsWith('أود') ||
    s.startsWith('أحتاج') ||
    s.startsWith('أبحث') ||
    s.startsWith('قم ') ||
    s.startsWith('أضف ') ||
    s.startsWith('أرفق ') ||
    s.startsWith('Please') ||
    s.startsWith('I want') ||
    s.startsWith("Let's") ||
    s.startsWith('Show me')
  ) {
    s = s.replace(/[\?؟\s]+$/, '');
  }

  return s;
}

export const extractFollowUps = (text: string, prompt?: string, lang: 'ar' | 'en' = 'ar', toolId: string = 'chat'): { cleanText: string, followUps: string[] } => {
  if (!text) return { cleanText: '', followUps: [] };
  const match = text.match(FOLLOW_UP_PATTERN);
  if (match && match[1]) {
    const rawUps = match[1];
    const followUps = rawUps
      .split('\n')
      .map(q => formatActionableSuggestion(q))
      .filter(q => q.length > 3 && q.length < 250 && !q.startsWith('[') && !q.endsWith(']'));
    const cleanText = text.replace(FOLLOW_UP_PATTERN, '').trim();
    if (followUps.length > 0) {
      return { cleanText, followUps: followUps.slice(0, 3) };
    }
  }

  // Fallback: If no explicit tag was found, generate 3 smart, context-aware follow-up options
  const cleanText = text.replace(FOLLOW_UP_PATTERN, '').trim();
  const fallbackFollowUps = generateContextualFollowUpsFallback(prompt || '', cleanText, lang, toolId);
  return { cleanText, followUps: fallbackFollowUps };
};

export const generateContextualFollowUpsFallback = (
  prompt: string,
  responseText: string,
  lang: 'ar' | 'en' = 'ar',
  toolId: string = 'chat'
): string[] => {
  const combined = (prompt + ' ' + responseText).toLowerCase();

  if (lang === 'ar') {
    if (toolId === 'code' || combined.includes('كود') || combined.includes('برمج') || combined.includes('دالة') || combined.includes('خوارزم') || combined.includes('خطأ') || combined.includes('api') || combined.includes('database') || combined.includes('css') || combined.includes('html')) {
      return [
        'أرغب بإرفاق ملف CSS احترافي وتصميم متجاوب وتأثيرات حركية لهذه الصفحة',
        'قم بتحويل هذه الصفحة إلى بنية مكونات قابلة لإعادة الاستخدام باستخدام React',
        'أرغب بإضافة نظام تحسين محركات البحث المتقدم ومعالجة الأخطاء وحالات الحافة'
      ];
    }
    if (toolId === 'deep_research' || combined.includes('بحث') || combined.includes('دراسة') || combined.includes('تحليل') || combined.includes('تقرير')) {
      return [
        'أرغب باستعراض المراجع والبيانات الإحصائية الدقيقة الداعمة لهذه النتائج',
        'قارن هذه المعطيات بأحدث المعايير والحلول العالمية المعتمدة في هذا المجال',
        'أرغب بخطة عمل تنفيذية مفصلة للبدء في تطبيق الخطوات القادمة'
      ];
    }
    if (toolId === 'canvas' || toolId === 'image' || toolId === 'video') {
      return [
        'أرغب بتعديل النمط الإبداعي والإخراج البصري لهذا العمل',
        'قم بتوليد تنويعات بصرية وتصميمات إضافية متناسقة بنفس الطابع',
        'أرغب بتطبيق إعدادات إخراجية متقدمة وجودة فائقة'
      ];
    }
    return [
      'أرغب باستكشاف الخطوة العملية التالية وتفاصيلها التنفيذية',
      'أرغب بالتعمق أكثر في تفاصيل هذه النقطة مع أمثلة وسيناريوهات واقعية',
      'كيف يمكن تطبيق هذا المفهوم على حالات عملية ومشروعات أخرى؟'
    ];
  } else {
    if (toolId === 'code' || combined.includes('code') || combined.includes('function') || combined.includes('api') || combined.includes('database') || combined.includes('bug')) {
      return [
        'I want to optimize the performance, security, and scalability of this solution',
        'Convert this implementation into a clean, reusable modular architecture',
        'Show me comprehensive edge cases and production test scenarios'
      ];
    }
    if (toolId === 'deep_research' || combined.includes('research') || combined.includes('analysis') || combined.includes('report')) {
      return [
        'I want to review the key statistical evidence and authoritative sources',
        'Compare this approach with leading industry benchmarks and global standards',
        'Provide a detailed actionable execution roadmap for next phases'
      ];
    }
    return [
      'I want to explore the recommended actionable next steps in detail',
      'Elaborate further on this aspect with practical real-world examples',
      'How can this approach be tailored to specific constraints and edge cases?'
    ];
  }
};

export function isPrivateIP(ip: string): boolean {
  if (!net.isIP(ip)) return false;
  
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4) return true;
    if (parts[0] === 127) return true;
    if (parts[0] === 10) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 0) return true;
    return false;
  }
  
  if (net.isIPv6(ip)) {
    const norm = ip.toLowerCase();
    if (norm === '::1' || norm === '0:0:0:0:0:0:0:1' || norm === '::ffff:127.0.0.1') return true;
    if (norm.startsWith('fe80:')) return true;
    if (norm.startsWith('fc') || norm.startsWith('fd')) return true;
    if (norm === '::' || norm === '0:0:0:0:0:0:0:0') return true;
    return false;
  }
  
  return true;
}

export async function isSafeHost(hostOrConnStr: string): Promise<boolean> {
  if (!hostOrConnStr) return false;
  
  let host = hostOrConnStr;
  const connStr = hostOrConnStr.trim();

  if (connStr.includes('://')) {
    try {
      const parsed = new URL(connStr);
      host = parsed.hostname;
    } catch {
      const match = connStr.match(/@([^/:]+)/);
      if (match) host = match[1];
    }
  } else {
    host = connStr.split(':')[0];
  }
  
  host = host.trim().toLowerCase();
  
  if (
    host === 'localhost' ||
    host === 'localhost.localdomain' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.lan') ||
    host.endsWith('.test') ||
    host.endsWith('.invalid')
  ) {
    return false;
  }
  
  if (net.isIP(host)) return !isPrivateIP(host);
  
  try {
    const lookup = await dns.promises.lookup(host);
    if (lookup?.address) return !isPrivateIP(lookup.address);
  } catch {
    return false;
  }
  
  return true;
}

export function normalizeArabicNumerals(text: string): string {
  return text
    .replace(/[٠0]/g, '0')
    .replace(/[١1]/g, '1')
    .replace(/[٢2]/g, '2')
    .replace(/[٣3]/g, '3')
    .replace(/[٤4]/g, '4')
    .replace(/[٥5]/g, '5')
    .replace(/[٦6]/g, '6')
    .replace(/[٧7]/g, '7')
    .replace(/[٨8]/g, '8')
    .replace(/[٩9]/g, '9');
}
