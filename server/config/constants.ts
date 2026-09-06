export interface ToolDefinition {
  id: string;
  cost: number;
  desc: string;
  descAr: string;
}

export const tools: ToolDefinition[] = [
  { id: 'chat', cost: 10, desc: 'Supreme orchestration chat authority', descAr: 'الأداة الأساسية والوحيدة لتوجيه النماذج، وتعتبر السلطة العليا في النظام.' },
  { id: 'chat_fast', cost: 5, desc: 'High-speed technical chat', descAr: 'دردشة تقنية سريعة' },
  { id: 'chat_pro', cost: 25, desc: 'Elite reasoning chat', descAr: 'دردشة عقلية ذكية' },
  { id: 'chat_reasoning', cost: 50, desc: 'Complex reasoning engine', descAr: 'محرك تفكير معقد' },
  { id: 'perplexta_analysis', cost: 15, desc: 'Deep intelligence analysis', descAr: 'تحليل استخباراتي عميق' },
  { id: 'image', cost: 30, desc: 'Professional image synthesis', descAr: 'توليد صور احترافي' },
  { id: 'video', cost: 100, desc: 'High-fidelity video generation', descAr: 'توليد فيديو عالي الدقة' },
  { id: 'tts', cost: 10, desc: 'Perplexta vocal synthesis', descAr: 'توليد صوتي احترافي' },
  { id: 'stt', cost: 10, desc: 'Ultra-precision transcription', descAr: 'نسخ صوتي فائق الدقة' },
  { id: 'legal_analysis', cost: 40, desc: 'Military-grade legal intelligence', descAr: 'تحليل قانوني احترافي' },
  { id: 'learning', cost: 20, desc: 'Education assistant system', descAr: 'مساعد التعليم' },
  { id: 'code', cost: 20, desc: 'Elite engineering workstation', descAr: 'بيئة هندسة برمجيات' },
  { id: 'canvas', cost: 25, desc: 'Smart Audio & Multi-modal Studio', descAr: 'استوديو الصوت الذكي والإنتاج المتعدد' },
  { id: 'notebook', cost: 30, desc: 'Perplexta research notebook', descAr: 'دفتر أبحاث احترافي' },
  { id: 'sovereign_memory', cost: 5, desc: 'Unified sovereign system intelligence and long-term memory synthesis.', descAr: 'ذاكرة النظام السيادية الموحدة وتركيب المعارف طويلة الأمد.' },
  { id: 'sovereign_search', cost: 10, desc: 'Global real-time web intelligence and strategic knowledge extraction.', descAr: 'البحث الذكي العالمي في الوقت الفعلي واستخراج المعرفة الاستراتيجية.' },
  { id: 'vision', cost: 25, desc: 'High-precision sovereign computer vision and multimodal inspection', descAr: 'أداة الرؤية الحاسوبية السيادية الفائقة وتحليل الوسائط المتعددة' },
  { id: 'perplexta_music', cost: 35, desc: 'High-fidelity musical composition and vocal synthesis engine', descAr: 'محرك التأليف الموسيقي وتوليد الصوتيات عالي الدقة' },
  { id: 'x402_api', cost: 15, desc: 'Dynamic high-fidelity artificial intelligence analytics gateway for programmatic developer clients connected via x402 payment protocol.', descAr: 'بوابة تحليلات الذكاء الاصطناعي عالية الدقة الديناميكية لعملاء الوكلاء البرمجيين المتصلين ببروتوكول دفع x402.' }
];
