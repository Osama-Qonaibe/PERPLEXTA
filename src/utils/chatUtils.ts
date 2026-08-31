import { toast } from '../context/NotificationContext';

export const FOLLOW_UP_PATTERN = /(?:\[(?:FOLLOW_?UPS?(?:_START)?|FOLLOW[\s-_]UPS?|أسئلة[_\s-]متابعة|اسئلة[_\s-]متابعة|أسئلة[_\s-]المتابعة|اسئلة[_\s-]المتابعة|أسئلة[_\s-]متابعة[_\s-]مقترحة|اسئلة[_\s-]متابعة[_\s-]مقترحة|فوللو[_\s-]?(?:ابس|اب)|فولو[_\s-]?(?:ابس|اب)|اقتراحات[_\s-]متابعة|اقتراحات[_\s-]المتابعة|اقتراحات[_\s-]تفاعلية|اقتراحات|أسئلة[_\s-]مقترحة|اسئلة[_\s-]مقترحة|Follow-?ups?|Follow-?up[\s_]Questions|Suggested[\s_]Questions|Related[\s_]Questions|NEXT_STEPS|SUGGESTIONS)\]|(?:\*\*|#{1,4}\s*|\[)?(?:أسئلة[_\s-]المتابعة|أسئلة[_\s-]متابعة|اسئلة[_\s-]متابعة|فوللو[_\s-]ابس|فولو[_\s-]ابس|فوللو[_\s-]اب|فولو[_\s-]اب|Follow-?ups?|Follow-?up[\s_]Questions|Suggested[\s_]Questions|أسئلة[_\s-]مقترحة|اسئلة[_\s-]مقترحة|FOLLOW_?UPS?(?:_START)?|FOLLOW[\s-_]UPS?|اقتراحات[_\s-]متابعة|اقتراحات[_\s-]المتابعة|اقتراحات[_\s-]تفاعلية|اقتراحات|SUGGESTIONS|NEXT_STEPS)(?:\*\*|:|\])?)\n?([\s\S]*)$/i;

export function formatActionableSuggestion(suggestion: string): string {
  if (!suggestion) return '';
  let s = suggestion.trim();

  // Strip leading numbering or bullet points
  s = s.replace(/^\s*(?:\d+[\.\)\-:]|\*|-|•|–|—|>|\+)\s*/, '').trim();

  // Arabic transformations: Convert assistant question forms into first-person user requests
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

export const extractFollowUpsClient = (text: string): { cleanText: string; followUps: string[] } => {
  if (!text) return { cleanText: '', followUps: [] };
  const match = text.match(FOLLOW_UP_PATTERN);
  if (match && match[1]) {
    const rawUps = match[1];
    const followUps = rawUps
      .split('\n')
      .map(q => formatActionableSuggestion(q))
      .filter(q => q.length > 3 && q.length < 250 && !q.startsWith('[') && !q.endsWith(']'));
    const cleanText = text
      .replace(FOLLOW_UP_PATTERN, '')
      .replace(/<extracted_memory[^>]*>[\s\S]*?<\/extracted_memory>/gi, '')
      .replace(/<extracted_memory[^>]*>[\s\S]*$/gi, '')
      .trim();
    return { cleanText, followUps: followUps.slice(0, 3) };
  }
  const cleanText = text
    .replace(FOLLOW_UP_PATTERN, '')
    .replace(/<extracted_memory[^>]*>[\s\S]*?<\/extracted_memory>/gi, '')
    .replace(/<extracted_memory[^>]*>[\s\S]*$/gi, '')
    .trim();
  return { cleanText, followUps: [] };
};

export const stripProtocolMarkers = (text: string): string => {
  if (!text) return text;
  return text
    .replace(FOLLOW_UP_PATTERN, '')
    .replace(/<extracted_memory[^>]*>[\s\S]*?<\/extracted_memory>/gi, '')
    .replace(/<extracted_memory[^>]*>[\s\S]*$/gi, '')
    .replace(/\[(?:FOLLOW_?UPS?(?:_START)?|FOLLOW[\s-_]UPS?|أسئلة[_\s-]متابعة|اسئلة[_\s-]متابعة|فوللو[_\s-]?(?:ابس|اب)|فولو[_\s-]?(?:ابس|اب))\][\s\S]*$/i, '')
    .trim();
};

export const showSuccessToast = (dir: 'rtl' | 'ltr', msgAr: string, msgEn: string) => {
  toast.success(dir === 'rtl' ? msgAr : msgEn);
};

export const showErrorToast = (dir: 'rtl' | 'ltr', msgAr: string, msgEn: string) => {
  toast.error(dir === 'rtl' ? msgAr : msgEn);
};

export const showInfoToast = (dir: 'rtl' | 'ltr', msgAr: string, msgEn: string) => {
  toast.info(dir === 'rtl' ? msgAr : msgEn);
};
