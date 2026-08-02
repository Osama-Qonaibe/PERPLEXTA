import React, { useState } from "react";
import { useAppContext } from "../context/AppContext";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Newspaper,
  Info,
  Target,
  Globe,
  Shield,
  Building2,
  ExternalLink,
  Layers,
  Cpu,
  Palette,
  Video,
  Zap,
  Search,
  Lock,
  CheckCircle2,
  Scale,
  MessageSquare,
  Code,
  Image as ImageIcon,
  BookOpen,
  Music,
  Megaphone,
  Volume2,
  Mic,
  Boxes,
  Wallet,
  Gift,
  CreditCard,
} from "lucide-react";
import { motion } from "motion/react";
import { perplextaPageTransition } from "../constants/motions";

export const About: React.FC = () => {
  const { language, dir, theme } = useAppContext();
  const navigate = useNavigate();

  const isAr = language === "ar";

  const [expandedCards, setExpandedCards] = useState<Record<number, boolean>>(
    {},
  );

  const toggleCard = (index: number) => {
    setExpandedCards((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const featuresToolsList = [
    {
      id: "chat",
      title: isAr ? "محادثة" : "Chat",
      desc: isAr
        ? "مساعد استراتيجي نخبوي للنقاش المهني، حل المشكلات المعقدة، والتحليل المنطقي العام بشكل سريع وفعال."
        : "Elite strategic assistant for professional discourse, complex problem solving, and efficient logical analysis.",
      imageUrl:
        "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=600",
      icon: <MessageSquare size={20} />,
    },
    {
      id: "code",
      title: isAr ? "توليد كود" : "Code Generation",
      desc: isAr
        ? "محطة عمل هندسة البرمجيات. يوفر بناء الهياكل البرمجية المتقدمة وكتابة شيفرات دقيقة ونظيفة تلبي احتياجاتك."
        : "Master-level software engineering workstation providing advanced code scaffolding and generation.",
      imageUrl:
        "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=600",
      icon: <Code size={20} />,
    },
    {
      id: "perplexta_analysis",
      title: isAr ? "تحليل بيربليكستا" : "Perplexta Analysis",
      desc: isAr
        ? "البحث التقني والتحليل الرقمي العميق لاستخراج البيانات الاستراتيجية والمؤشرات الإحصائية بدقة فائقة."
        : "High-precision intelligent engine for deep search and extracting strategic data and statistical indicators.",
      imageUrl:
        "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=600",
      icon: <Search size={20} />,
    },
    {
      id: "image",
      title: isAr ? "توليد صورة" : "Image Generation",
      desc: isAr
        ? "محرك توليد بصري عالي الدقة للأصول المهنية. إمكانية تحويل النصوص لصور بمستوى إبداعي استثنائي لمختلف الاستخدامات."
        : "High-precision visual synthesis engine for professional assets. Text to image generation with exceptional creativity.",
      imageUrl:
        "https://images.unsplash.com/photo-1561557944-6e7860d1a7eb?auto=format&fit=crop&q=80&w=600",
      icon: <ImageIcon size={20} />,
    },
    {
      id: "video",
      title: isAr ? "توليد فيديو" : "Video Generation",
      desc: isAr
        ? "توليد مشاهد بصرية احترافية وتحريك العناصر بناءً على التعليمات الوصفية، مع الالتزام بالمعايير الدولية السينمائية."
        : "Generate professional visual scenes and animate elements with strict international cinematic standards.",
      imageUrl:
        "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&q=80&w=600",
      icon: <Video size={20} />,
    },
    {
      id: "learning",
      title: isAr ? "مساعد التعليم" : "Education Assistant",
      desc: isAr
        ? "مساعد مخصص لتقديم الشروحات التعليمية، تصميم الخطط الدراسية، وطرح أمثلة عملية مبسطة للمفاهيم الصعبة."
        : "A tailored assistant for educational explanations, study plan design, and practical examples for complex concepts.",
      imageUrl:
        "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=600",
      icon: <BookOpen size={20} />,
    },
    {
      id: "legal_analysis",
      title: isAr ? "مساعد القانون" : "Legal Assistant",
      desc: isAr
        ? "تدقيق الوثائق، استخراج النصوص التشريعية، وتوفير المشورة الدقيقة للقضايا القانونية المعقدة بمنهجية احترافية."
        : "Document auditing, legislative text extraction, and precise advisory for complex legal matters with professional methodology.",
      imageUrl:
        "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&q=80&w=600",
      icon: <Scale size={20} />,
    },
    {
      id: "canvas",
      title: isAr ? "استوديو الصوت" : "Audio Studio",
      desc: isAr
        ? "محرك هندسة صوتي ولحني احترافي متخصص في تحرير الصوت وإدارة الملفات الصوتية بميزات ومرونة عالية."
        : "Professional audio and melody engineering engine specialized in sound editing and audio management.",
      imageUrl:
        "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&q=80&w=600",
      icon: <Music size={20} />,
    },
    {
      id: "notebook",
      title: isAr ? "المفكرة البحثية" : "Research Notebook",
      desc: isAr
        ? "أداة متطورة لتلخيص المستندات البحثية، تنظيم المعلومات الرقمية، وحفظ المعرفة للاسترجاع السريع والموثوق."
        : "Advanced tool for summarizing research documents, organizing digital information, and deep knowledge retention.",
      imageUrl:
        "https://images.unsplash.com/photo-1456324504439-367cee3b3c32?auto=format&fit=crop&q=80&w=600",
      icon: <Megaphone size={20} />,
    },
    {
      id: "stt",
      title: isAr ? "تحويل الصوت الى نص" : "Speech to Text",
      desc: isAr
        ? "محرك التفريغ الصوتي فائق الدقة. استخراج النصوص من المحادثات والمقاطع الصوتية بكفاءة عالية وبدون أخطاء."
        : "High-fidelity acoustic transcription engine. Efficient and accurate extraction of text from audio clips.",
      imageUrl:
        "https://images.unsplash.com/photo-1589254065878-42c9da997008?auto=format&fit=crop&q=80&w=600",
      icon: <Mic size={20} />,
    },
    {
      id: "tts",
      title: isAr ? "تحويل النص الى صوت" : "Text to Speech",
      desc: isAr
        ? "توليد صوتي طبيعي متطور وهندسة صوتية نخبوية، مما يتيح لك الاستماع للنصوص والمحتويات بنبرة واقعية ولغات متعددة."
        : "Elite natural acoustic synthesis and voice engineering, allowing you to listen to context in a realistic tone.",
      imageUrl:
        "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?auto=format&fit=crop&q=80&w=600",
      icon: <Volume2 size={20} />,
    },
  ];

  const newsList = [
    {
      date: "2026-05-27",
      title: isAr
        ? "دمج محرك الفيديو الاحترافي وتوسيع بيئة العمل"
        : "Professional Video Engine Integration & Ecosystem Expansion",
      excerpt: isAr
        ? "استكمال منظومة بيئة بيربليكستا بإضافة توليد الفيديو السينمائي والأدوات المتقدمة في واجهة واحدة..."
        : "Completing the Perplexta ecosystem by adding cinematic video generation and advanced tools in a unified interface...",
      fullContent: isAr
        ? "أكملنا بنجاح دمج محرك توليد الفيديو الاحترافي وتوسيع بيئة الأدوات المتاحة للنخبة لتشمل مساعد التعليم، والمساعد القانوني، والمفكرة البحثية. هذا التحديث يجعل المنصة بيئة متكاملة تدمج تحليل الأكواد، قراءة الملفات المعقدة، التوليد الصوتي، والإبداع المرئي ضمن واجهة واحدة احترافية وببنية هندسية متينة تضمن تنفيذًا دون أخطاء."
        : "We successfully integrated a professional video generation engine and expanded our elite tools to include Education Assistant, Legal Assistant, and Research Notebook. This update makes the platform a unified ecosystem integrating code analysis, complex file parsing, audio generation, and visual creativity in a single professional interface with a robust architecture ensuring error-free execution.",
      imageUrl:
        "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=600",
    },
    {
      date: "2026-05-20",
      title: isAr
        ? "إطلاق تحديث ذكاء بيربليكستا 2.5"
        : "Perplexta Intelligence 2.5 Launched",
      excerpt: isAr
        ? "مستوى جديد من استخراج المعرفة والوعي الذاتي بالسياق النشط مع معالجة PDF متطورة..."
        : "A new level of knowledge extraction and stateful context tracking with robust PDF support...",
      fullContent: isAr
        ? "أطلقنا رسمياً التحديث 2.5 لنواة المعرفة في بيربليكستا. يأتي هذا التحديث بدعم كامل لمعالجة واستخلاص الملفات عالية الكثافة (حتى 100 ميجابايت)، وبروتوكول دمج الذاكرة التلقائي لحماية النواة من تراكم الجلسات، إلى جانب تصفية الأخطاء الهيكلية لاسترجاع الاستجابات الذكية بأسرع وتيرة."
        : "We have officially deployed Perplexta Intelligence 2.5. This release introduces high-capacity context attachment capabilities (up to 100MB volumes), real-time proactive memory distillation, and robust PDF parsing APIs, paired with structural JSON parsing repair for reasoning models (like o1 and DeepSeek).",
      imageUrl:
        "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=600",
    },
    {
      date: "2026-05-15",
      title: isAr
        ? "تأمين النظام بدستور بروتوكول الأمان الموحد"
        : "Military-Grade Secure Constitution Active",
      excerpt: isAr
        ? "دمج الدستور الأمني فائق الحماية CORE_PROTOCOL لضمان السيادة المطلقة لبيانات المهام..."
        : "Integration of the Perplexta Global Edition constitution under advanced CORE_PROTOCOL...",
      fullContent: isAr
        ? "قامت المنصة بتفعيل الدستور الأمني الشامل ثنائي اللغة (العربية والإنجليزية). يفرض هذا الدستور حماية معيارية مشددة في الخادم وتشفير البيانات الحساسة بمستويات AES-256، مما يمنع تسريب تفاصيل الجلسات أو كسر السيادة الرقمية حتى في الاستعلامات المتقدمة."
        : "Perplexta has activated its bilingual military-grade Global Constitution on the server. Managed under the CORE_PROTOCOL flag, this protocol guarantees robust AES-256 encryption on all sensitive API integrations, preventing data leaks and maintaining absolute digital sovereignty.",
      imageUrl:
        "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?auto=format&fit=crop&q=80&w=600",
    },
  ];

  const ecosystem = [
    {
      name: isAr ? "بيربليكستا" : "perplexta",
      desc: isAr
        ? "المنصة الأحدث المتخصصة في التصميم، وصناعة الفيديو والصور بدعم تقني متكامل"
        : "The latest platform specialized in design, video and image creation with integrated technical support",
      url: "https://perplexta.com",
    },
    {
      name: "HebronAI",
      desc: isAr
        ? "أضخم منصة للمطورين وصناع المحتوى، تضم أدوات ونماذج ذكاء اصطناعي متقدمة"
        : "The largest platform for developers and content creators, featuring advanced AI tools and models",
      url: "https://hebronai.net",
    },
    {
      name: "HebronMart",
      desc: isAr
        ? "مول رقمي متعدد التجار يربط الأسواق المحلية بالعالمية في تجربة تسوق فريدة"
        : "A multi-vendor digital mall connecting local markets to the world in a unique shopping experience",
      url: "https://hebronmart.com",
    },
    {
      name: "VLU Panel",
      desc: isAr
        ? "لوحة التسويق الرقمي، تحسين محركات البحث (SEO)، وتعزيز الحضور والسمعة الرقمية"
        : "Digital marketing panel, SEO, and enhancing digital presence and reputation",
      url: "https://virallinkup.com",
    },
    {
      name: "VLU Net",
      desc: isAr
        ? "مكتبة المنتجات الرقمية المرخصة (GPL) الجاهزة لإعادة البيع والتخصيص"
        : "Library of licensed digital products (GPL) ready for resale and customization",
      url: "https://virallinkup.net",
    },
    {
      name: "VLU Host",
      desc: isAr
        ? "خدمات الاستضافة السحابية وإدارة الخوادم الخاصة لضمان السيادة الرقمية"
        : "Cloud hosting services and private server management to ensure digital sovereignty",
      url: "https://virallinkup.org",
    },
  ];

  const features = [
    {
      title: isAr ? "الإدارة الذاتية للمهام" : "Autonomous Task Management",
      desc: isAr
        ? "نظام ذكي يتولى تحديد المحرك الأنسب لكل عملية لضمان أعلى جودة تنفيذ دون تدخل بشري"
        : "An intelligent system that determines the most suitable engine for each process to ensure the highest quality of execution without human intervention",
      icon: Zap,
    },
    {
      title: isAr ? "الاستقرار الفائق" : "Extreme Stability",
      desc: isAr
        ? "بنية تحتية سحابية متطورة تضمن استمرارية الخدمة بنسبة توافر كاملة وتحت أصعب ظروف ضغط البيانات"
        : "Advanced cloud infrastructure ensuring service continuity with full availability under the most challenging data pressure conditions",
      icon: Globe,
    },
    {
      title: isAr ? "البحث الإدراكي المتقدم" : "Advanced Cognitive Search",
      desc: isAr
        ? "قدرة فائقة على جلب المعلومات اللحظية وتحليلها بعمق لتزويدك بإجابات دقيقة وموثقة من قلب الويب"
        : "Superior ability to fetch real-time information and analyze it deeply to provide accurate and documented answers from the heart of the web",
      icon: Search,
    },
    {
      title: isAr ? "الإبداع متعدد الوسائط" : "Multimedia Creativity",
      desc: isAr
        ? "توليد محتوى بصري وسينمائي وصوتي احترافي عبر تكاملات تقنية ذكية تعيد صياغة مفهوم الابتكار"
        : "Generating professional visual cinematic and audio content through smart technical integrations that redefine the concept of innovation",
      icon: Palette,
    },
    {
      title: isAr ? "الخصوصية المطلقة" : "Absolute Privacy",
      desc: isAr
        ? "حماية بيانات المستخدمين داخل نظام مشفر بالكامل يتبع سياسات صارمة في السيادة الرقمية والأمان"
        : "Protecting user data within a fully encrypted system following strict policies in digital sovereignty and security",
      icon: Lock,
    },
    {
      title: isAr ? "الربط المتقدم للمطورين" : "Advanced Developer Integration",
      desc: isAr
        ? "توفير واجهات برمجية متقدمة تتيح للمطورين دمج قدرات المنصة الذكية داخل تطبيقاتهم ومشاريعهم الخاصة بمرونة عالية"
        : "Providing advanced APIs that allow developers to integrate the platform's smart capabilities into their own applications and projects with high flexibility",
      icon: Cpu,
    },
  ];

  const economyList = [
    {
      id: "wallet",
      title: isAr ? "المحفظة الرقمية" : "Digital Wallet",
      desc: isAr 
        ? "نظام مالي متطور الدفتر المزدوج. شحن الرصيد، الدفع بنقرة واحدة، وتتبع دقيق للمعاملات المالية وحركات الأرصدة." 
        : "Advanced Dual-Ledger financial system. Top-up balances, 1-click payments, and precise transaction tracking.",
      imageUrl: "https://images.unsplash.com/photo-1616803140344-6682afb13cda?auto=format&fit=crop&q=80&w=600",
      icon: <Wallet size={20} />
    },
    {
      id: "referrals",
      title: isAr ? "برنامج الإحالات والمكافآت" : "Rewards & Referrals Program",
      desc: isAr 
        ? "نظام إحالة هرمي يمنحك مكافآت مستمرة. شارك رابطك واكسب أرصدة مجانية مع كل اشتراك جديد بمرونة عالية." 
        : "Hierarchical referral system for continuous rewards. Share your link and earn free credits with every new subscription.",
      imageUrl: "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&q=80&w=600",
      icon: <Gift size={20} />
    },
    {
       id: "subscriptions",
       title: isAr ? "الاشتراكات والباقات" : "Flexible Subscriptions",
       desc: isAr
         ? "باقات متنوعة تناسب احتياجاتك، بدءاً من خطط البداية وحتى قوة النخبة الاستراتيجية مع تحكم كامل بالحصص."
         : "Diverse plans tailoring to your needs, from Starter to Elite strategic power with full quota control.",
       imageUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=600",
       icon: <CreditCard size={20} />
    }
  ];

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={perplextaPageTransition}
      className="max-w-5xl mx-auto px-6 sm:px-8 pb-32 overflow-y-auto h-full custom-scrollbar"
    >
      {/* Sticky Header */}
      <div className="sticky -top-0.5 z-20 -mx-6 sm:-mx-8 px-6 sm:px-8 py-4 mb-10 bg-[var(--bg-primary)]/90 backdrop-blur-md border-b border-[var(--border-main)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            id="about-back-btn"
            className="w-10 h-10 rounded-[4px] flex items-center justify-center transition-theme bg-transparent border border-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-emerald-500 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]"
          >
            {dir === "rtl" ? (
              <ChevronRight size={18} />
            ) : (
              <ChevronLeft size={18} />
            )}
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white uppercase flex items-center gap-2">
              <Info
                className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                size={20}
              />
              {isAr ? "من نحن" : "About Us"}
            </h1>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest font-mono">
              {isAr ? "رؤية المنصة وهويتها" : "PLATFORM VISION & IDENTITY"}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-24">
        {/* Hero Section */}
        <section className="text-center space-y-4 pt-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-100 dark:bg-gray-900/50 border border-gray-250/20 dark:border-gray-800/40 text-gray-800 dark:text-gray-200 text-xs font-bold uppercase tracking-widest">
            <Info size={14} className="text-emerald-500" />
            {isAr ? "من نحن" : "About Us"}
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-gray-900 dark:text-white uppercase">
            {isAr ? "بيربليكستا" : "PERPLEXTA"}
          </h1>
          <p className="text-lg md:text-2xl font-bold text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)] max-w-2xl mx-auto leading-relaxed">
            {isAr
              ? "القوة الكامنة خلف القرار الذكي"
              : "The Power Behind Smart Decisions"}
          </p>
        </section>

        {/* Vision & Mission Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
          <div className="space-y-8">
            <div className="p-6 md:p-8 rounded-[var(--radius)] border border-gray-200/60 dark:border-gray-800/60 bg-gray-50/50 dark:bg-gray-900/45 backdrop-blur-sm shadow-sm transition-theme hover:border-emerald-500/20 group">
              <div className="flex items-center gap-3 text-gray-900 dark:text-white mb-4">
                <Target className="w-6 h-6 text-gray-500 dark:text-gray-400 group-hover:text-emerald-500 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] transition-theme" />
                <h2 className="text-xl md:text-2xl font-black">
                  {isAr ? "الرؤية" : "Vision"}
                </h2>
              </div>
              <p className="text-sm md:text-base leading-relaxed text-gray-600 dark:text-gray-300 font-medium">
                {isAr
                  ? "نؤمن بأن التكنولوجيا يجب أن تخدم الإنسان ببساطة. رؤيتنا هي إنهاء تشتت المستخدم بين الأدوات عبر نظام سيادي يفهم احتياجاتك ويوجهها بدقة للمسار التقني الأمثل، لضمان نتائج مثالية وموثوقة."
                  : "We believe technology should serve humanity simply. Our vision is to eliminate tool fragmentation through a sovereign system that understands your needs and autonomously directs them to the optimal technical path, ensuring seamless, reliable results."}
              </p>
            </div>

            <div className="p-6 md:p-8 rounded-[var(--radius)] border border-gray-200/60 dark:border-gray-800/60 bg-gray-50/50 dark:bg-gray-900/45 backdrop-blur-sm shadow-sm transition-theme hover:border-emerald-500/20 group">
              <div className="flex items-center gap-3 text-gray-900 dark:text-white mb-4">
                <Zap className="w-6 h-6 text-gray-500 dark:text-gray-400 group-hover:text-emerald-500 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] transition-theme" />
                <h2 className="text-xl md:text-2xl font-black">
                  {isAr ? "الرسالة" : "Mission"}
                </h2>
              </div>
              <p className="text-sm md:text-base leading-relaxed text-gray-600 dark:text-gray-300 font-medium">
                {isAr
                  ? "تمكين المبدعين والشركات من تجاوز حدود الإنتاجية التقليدية. نقدم حلولاً تقنية ذكية وعميقة، مع التزام مطلق بحماية الخصوصية وتعزيز السيادة الرقمية لضمان بيئة عمل آمنة ومستقرة."
                  : "We empower creators and enterprises to exceed productivity limits. By delivering intelligent, simple, and deep technical solutions, we maintain an absolute commitment to digital sovereignty and privacy, ensuring a secure and stable digital environment."}
              </p>
            </div>
          </div>

          <div className="relative aspect-square rounded-[2rem] overflow-hidden bg-gray-50/50 dark:bg-gray-900/30 border border-gray-200/60 dark:border-gray-800/60 flex items-center justify-center p-8 shadow-inner">
            <div className="relative z-10 flex flex-col items-center gap-8 w-full">
              <div className="flex items-center justify-center p-6 rounded-full bg-white dark:bg-gray-950 border border-gray-200/60 dark:border-gray-800/60 shadow-lg hover:shadow-emerald-500/5 transition-theme group">
                <Layers className="w-24 h-24 text-gray-500 dark:text-gray-400 group-hover:text-emerald-500 group-hover:drop-shadow-[0_0_12px_rgba(16,185,129,0.6)] transition-theme" />
              </div>

              <div className="grid grid-cols-3 gap-3 w-full">
                {[
                  {
                    icon: Palette,
                    label: isAr ? "تصميم فائق" : "Superior Design",
                  },
                  {
                    icon: Video,
                    label: isAr ? "صناعة محتوى" : "Content Creation",
                  },
                  { icon: Cpu, label: isAr ? "ذكاء متصل" : "Connected AI" },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-white dark:bg-gray-950 border border-gray-200/50 dark:border-gray-800/50 flex flex-col items-center gap-2 transition-theme hover:border-emerald-500/10 hover:-translate-y-1 group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-900 flex items-center justify-center border border-gray-200/40 dark:border-gray-800/40">
                      <item.icon className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-emerald-500 group-hover:drop-shadow-[0_0_6px_rgba(16,185,129,0.6)] transition-theme" />
                    </div>
                    <span className="text-[9px] uppercase font-black tracking-wider text-center leading-tight text-gray-800 dark:text-gray-200">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white uppercase">
              {isAr ? "الميزات والقدرات" : "Features & Capabilities"}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 max-w-2xl mx-auto font-medium leading-relaxed">
              {isAr
                ? "هندسة برمجية فريدة تجعلها المنصة الأكثر ذكاءً في إدارة الموارد التقنية عالمياً."
                : "Unique software architecture making it the smartest platform for managing technical resources globally."}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div
                key={i}
                className="p-6 rounded-[var(--radius)] border border-gray-200/60 dark:border-gray-800/60 bg-gray-50/20 dark:bg-gray-900/20 hover:bg-gray-50/50 dark:hover:bg-gray-900/40 hover:border-emerald-500/20 transition-theme group"
              >
                <div className="w-10 h-10 rounded-[4px] bg-white dark:bg-gray-950 border border-gray-200/60 dark:border-gray-800/60 flex items-center justify-center text-gray-500 dark:text-gray-400 group-hover:text-emerald-500 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] group-hover:border-emerald-500/10 mb-4 transition-theme">
                  <feature.icon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-semibold font-sans">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Why PERPLEXTA */}
        <section className="p-8 md:p-10 rounded-[var(--radius)] border border-emerald-500/20 bg-emerald-500/[0.03] dark:bg-emerald-500/[0.01] dark:border-emerald-500/10 shadow-[0_4px_24px_rgba(16,185,129,0.03)] space-y-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-theme" />
          <h2 className="text-2xl font-black text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]">
            {isAr ? "لماذا بيربليكستا؟" : "Why PERPLEXTA?"}
          </h2>
          <p className="text-sm md:text-base leading-relaxed text-gray-800 dark:text-gray-200 font-semibold font-sans">
            {isAr
              ? 'لأننا قدمنا "المساعد التنفيذي" المتكامل. بيربليكستا لا تخطئ في اختيار الأداة، فهي مبنية على منطق "البناء النظيف" الذي يربط القوى التقنية العالمية في واجهة واحدة. نمنحك صفوة النتائج، ونوفر عليك الوقت والجهد وتكاليف الاشتراك المتعددة، بحل شامل يدار بعقل اصطناعي لا ينام.'
              : 'Because we have provided an integrated "Executive Assistant." PERPLEXTA does not make mistakes in choosing the tool, built on the logic of "Clean Build" that connects global technical powers in one simple interface. We give you the finest results, saving you time, effort, and multiple subscription costs, with a comprehensive solution managed by an artificial mind that never sleeps.'}
          </p>
        </section>

        {/* Technical Standards */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center border border-gray-200/60 dark:border-gray-800/60 rounded-[var(--radius)] p-6 md:p-8 bg-gray-50/20 dark:bg-gray-900/10">
          <div className="space-y-4 text-center md:text-right animate-pulse">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] mx-auto md:mx-0 md:mr-0 inline-block md:block" />
            <h3 className="text-2xl font-black text-gray-900 dark:text-white">
              {isAr ? "أمان وموثوقية عالمية" : "Global Security & Reliability"}
            </h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Scale className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <h2 className="text-xl font-bold">
                {isAr
                  ? "المعايير التقنية والالتزام"
                  : "Technical Standards & Commitment"}
              </h2>
            </div>
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 font-semibold leading-relaxed">
              {isAr
                ? "نستخدم أحدث تقنيات Google المتطورة، ونلتزم بسياساتهم الصارمة. هذا الالتزام يضمن لمستخدمينا أعلى مستويات الأمان، والدقة، والموثوقية التقنية التي تفرضها المعايير العالمية في معالجة البيانات والذكاء الاصطناعي."
                : "We rely on the latest advanced Google technologies and are fully committed to their strict policies. This commitment ensures our users receive the highest levels of security, accuracy, and technical reliability imposed by global standards in data processing and AI."}
            </p>
          </div>
        </section>

        {/* Corporate Identity & Transparency */}
        <section className="p-6 md:p-8 rounded-[var(--radius)] border border-gray-200/60 dark:border-gray-800/60 bg-gray-50/20 dark:bg-gray-900/10 space-y-8">
          <div className="flex items-center gap-3 text-gray-900 dark:text-white">
            <Shield className="w-5 h-5 text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <h2 className="text-xl md:text-2xl font-black">
              {isAr
                ? "الهوية المؤسسية والشفافية"
                : "PERPLEXTA - Corporate Identity & Transparency"}
            </h2>
          </div>

          <div className="space-y-4">
            <p className="text-sm md:text-base font-bold text-gray-800 dark:text-gray-100">
              {isAr
                ? "منصة بيربليكستا هي مشروع تقني رائد مملوك ومدار بالكامل من قبل"
                : "The PERPLEXTA platform is a leading technical project fully owned and managed by"}
            </p>
            <div className="p-6 rounded-xl bg-white dark:bg-gray-950 border border-gray-200/60 dark:border-gray-800/60 flex items-center justify-between shadow-sm">
              <div>
                <h3 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white mb-1">
                  {isAr ? "فيرال لينك اب المحدودة" : "VIRALLINKUP LTD"}
                </h3>
                <p className="text-xs md:text-sm font-semibold text-gray-600 dark:text-gray-300">
                  {isAr
                    ? "شركة محدودة بالأسهم مسجلة رسمياً في المملكة المتحدة"
                    : "A company limited by shares officially registered in the United Kingdom"}
                </p>
              </div>
              <div>
                <span className="inline-block px-3 py-1 text-xs font-bold text-emerald-500 bg-emerald-500/10 rounded-full border border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                  {isAr ? "نشطة" : "ACTIVE"}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-250/20 dark:border-gray-800/40">
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-gray-950 border border-gray-200/50 dark:border-gray-800/50 hover:border-emerald-500/10 transition-theme group shadow-sm">
                <Globe className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-emerald-500 transition-theme" />
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">
                    {isAr ? "رقم التسجيل" : "Registration Number"}
                  </p>
                  <p className="text-base font-black text-gray-900 dark:text-white font-mono">
                    16804604
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-gray-950 border border-gray-200/50 dark:border-gray-800/50 hover:border-emerald-500/10 transition-theme group shadow-sm">
                <Building2 className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-emerald-500 transition-theme" />
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">
                    {isAr ? "المقر المسجل" : "Registered Office"}
                  </p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    128 City Road, London, EC1V 2NX
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-gray-950 border border-gray-200/50 dark:border-gray-800/50 space-y-3 shadow-sm">
              <p className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">
                {isAr ? "طبيعة العمل" : "Nature of Business"}
              </p>
              <ul className="space-y-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500 font-mono font-bold">
                    58190
                  </span>
                  <span>
                    {isAr
                      ? "أنشطة النشر والابتكار التقني"
                      : "publishing and tech innovation"}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500 font-mono font-bold">
                    62012
                  </span>
                  <span>
                    {isAr
                      ? "تطوير البرمجيات التجارية"
                      : "business software development"}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500 font-mono font-bold">
                    63110
                  </span>
                  <span>
                    {isAr
                      ? "معالجة البيانات والاستضافة"
                      : "data processing and hosting"}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500 font-mono font-bold">
                    70229
                  </span>
                  <span>
                    {isAr
                      ? "استشارات الإدارة المتخصصة"
                      : "management consultancy"}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Ecosystem */}
        <section className="space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white uppercase">
              {isAr ? "منظومة مشاريعنا" : "Our Digital Ecosystem"}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 max-w-2xl mx-auto font-medium">
              {isAr
                ? "VIRALLINKUP LTD تفتخر بإدارة شبكة متكاملة من المنصات الرقمية"
                : "VIRALLINKUP LTD is proud to manage an integrated network of digital platforms"}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {ecosystem.map((item, i) => (
              <a
                key={i}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                id={`ecosystem-link-${i}`}
                className="p-5 rounded-2xl bg-gray-50/30 dark:bg-gray-900/10 border border-gray-200/60 dark:border-gray-800/60 hover:border-emerald-500/20 hover:bg-gray-55/70 dark:hover:bg-gray-900/30 transition-theme group block relative overflow-hidden shadow-sm hover:shadow-md"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-black text-gray-900 dark:text-white group-hover:text-emerald-500 transition-colors">
                    {item.name}
                  </h3>
                  <ExternalLink className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-emerald-500 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] transition-theme" />
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-semibold">
                  {item.desc}
                </p>
                <div className="pt-3 mt-3 border-t border-gray-250/20 dark:border-gray-800/40 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 font-mono">
                    {item.url.replace("https://", "")}
                  </span>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Features & Tools */}
        <section className="space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white uppercase flex items-center justify-center gap-2">
              <Boxes
                className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                size={24}
              />
              {isAr ? "الميزات والأدوات" : "Features & Tools"}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 max-w-2xl mx-auto font-medium">
              {isAr
                ? "استكشف القدرات المعمارية والأدوات الاحترافية المدمجة في بيئة عمل بيربليكستا."
                : "Explore the architectural capabilities and professional tools integrated within the Perplexta ecosystem."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuresToolsList.map((tool, i) => (
              <div
                key={i}
                className="p-6 rounded-[var(--radius)] border border-gray-200/60 dark:border-gray-800/60 bg-gray-50/20 dark:bg-gray-900/20 hover:bg-gray-50/50 dark:hover:bg-gray-900/45 hover:border-emerald-500/20 transition-theme group flex flex-col justify-between gap-4 cursor-pointer relative overflow-hidden shadow-sm hover:shadow-md h-fit"
              >
                <div className="space-y-4">
                  {/* Tool Header */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[4px] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)] group-hover:bg-emerald-500/20 group-hover:scale-105 transition-theme">
                      {tool.icon}
                    </div>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white group-hover:text-emerald-500 transition-colors duration-300">
                      {tool.title}
                    </h3>
                  </div>

                  {/* Image Preview Placeholder */}
                  <div className="relative w-full aspect-[16/10] rounded-md overflow-hidden border border-gray-200/50 dark:border-gray-800/45 shadow-sm bg-black/5 dark:bg-black/20 group-hover:border-emerald-500/30 transition-colors duration-300">
                    <img
                      src={tool.imageUrl}
                      alt={tool.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-950/60 to-transparent pointer-events-none" />
                  </div>

                  {/* Tool Capabilities */}
                  <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 font-semibold leading-relaxed">
                    {tool.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Economy & Rewards */}
        <section className="space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white uppercase flex items-center justify-center gap-2">
              <Wallet className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" size={24} />
              {isAr ? "اقتصاد المنصة والمكافآت" : "Platform Economy & Rewards"}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 max-w-2xl mx-auto font-medium">
              {isAr 
                ? "نظام البيئة المالية لبيربليكستا حيث تلتقي إدارة الأرصدة الشفافة مع الاشتراكات المرنة وبرامج المكافآت المستدامة." 
                : "The financial ecosystem of Perplexta, combining transparent ledger management, flexible subscriptions, and sustainable reward programs."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {economyList.map((item, i) => (
              <div
                key={i}
                className="p-6 rounded-[var(--radius)] border border-gray-200/60 dark:border-gray-800/60 bg-gray-50/20 dark:bg-gray-900/20 hover:bg-gray-50/50 dark:hover:bg-gray-900/45 hover:border-emerald-500/20 transition-theme group flex flex-col justify-between gap-4 cursor-pointer relative overflow-hidden shadow-sm hover:shadow-md h-fit"
              >
                <div className="space-y-4">
                  {/* Item Header */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[4px] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)] group-hover:bg-emerald-500/20 group-hover:scale-105 transition-theme">
                      {item.icon}
                    </div>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white group-hover:text-emerald-500 transition-colors duration-300">
                      {item.title}
                    </h3>
                  </div>

                  {/* Image Preview Placeholder */}
                  <div className="relative w-full aspect-[16/10] rounded-md overflow-hidden border border-gray-200/50 dark:border-gray-800/45 shadow-sm bg-black/5 dark:bg-black/20 group-hover:border-emerald-500/30 transition-colors duration-300">
                    <img 
                      src={item.imageUrl} 
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-950/60 to-transparent pointer-events-none" />
                  </div>

                  {/* Economy capabilities */}
                  <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 font-semibold leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* News & Releases */}
        <section className="space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white uppercase flex items-center justify-center gap-2">
              <Newspaper
                className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                size={24}
              />
              {isAr ? "أحدث الأخبار وتحديثات النظام" : "Latest News & Releases"}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 max-w-2xl mx-auto font-medium">
              {isAr
                ? "ابق على اطلاع بآخر أخبار المنصة، والترقيات الهيكلية، والتطورات الهندسية لبيئة تحليلاتنا."
                : "Stay updated with our latest platform announcements, architectural upgrades, and engineering milestones."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {newsList.map((item, i) => {
              const isExpanded = !!expandedCards[i];
              return (
                <div
                  key={i}
                  id={`news-card-${i}`}
                  className="news-card p-6 rounded-[var(--radius)] border border-gray-200/60 dark:border-gray-800/60 bg-gray-50/20 dark:bg-gray-900/20 hover:bg-gray-50/50 dark:hover:bg-gray-900/45 hover:border-emerald-500/20 transition-theme group flex flex-col justify-between gap-4 cursor-pointer relative overflow-hidden shadow-sm hover:shadow-md h-fit"
                  onClick={() => toggleCard(i)}
                >
                  <div className="space-y-3">
                    {/* Header: Date + Chevron indicator */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-black tracking-widest text-emerald-500 drop-shadow-[0_0_6px_rgba(16,185,129,0.3)] bg-emerald-500/5 px-2.5 py-1 rounded-[4px] border border-emerald-500/15">
                        {item.date}
                      </span>
                      <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                        className="text-gray-400 group-hover:text-emerald-500 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] transition-theme"
                      >
                        <ChevronDown size={14} />
                      </motion.div>
                    </div>

                    {/* News Title */}
                    <h3 className="text-base font-black text-gray-900 dark:text-white group-hover:text-emerald-500 transition-colors duration-300 leading-snug">
                      {item.title}
                    </h3>

                    {/* Image Preview */}
                    {item.imageUrl && (
                      <div className="relative w-full aspect-[16/9] rounded-md overflow-hidden border border-gray-200/50 dark:border-gray-800/45 shadow-sm bg-black/5 dark:bg-black/20 group-hover:border-emerald-500/30 transition-colors duration-300">
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-950/60 to-transparent pointer-events-none" />
                      </div>
                    )}

                    {/* Excerpt */}
                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 font-semibold leading-relaxed">
                      {item.excerpt}
                    </p>

                    {/* Collapsible content with smooth height and opacity transitions */}
                    <motion.div
                      initial={false}
                      animate={{
                        height: isExpanded ? "auto" : 0,
                        opacity: isExpanded ? 1 : 0,
                      }}
                      transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="pt-4 border-t border-gray-200/50 dark:border-gray-800/45 text-xs text-gray-500 dark:text-gray-400 font-semibold leading-relaxed font-sans select-text whitespace-pre-line flex flex-col gap-3">
                        <span>{item.fullContent}</span>
                        <div className="flex justify-end pt-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCard(i);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-gray-500/5 hover:bg-emerald-500/10 dark:bg-gray-800/30 dark:hover:bg-emerald-500/15 border border-gray-200 dark:border-gray-800 hover:border-emerald-500/30 dark:hover:border-emerald-500/45 text-[var(--text-primary)] hover:text-emerald-500 text-[10px] font-black uppercase tracking-wider transition-theme cursor-pointer shadow-sm hover:shadow-[0_0_12px_rgba(16,185,129,0.2)] select-none"
                          >
                            <span>{isAr ? "▲ عرض أقل" : "▲ Show Less"}</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </div>

                  {/* Read More Button with the "Emerald Glow" Hover Effect */}
                  <div className="pt-2 flex items-center justify-start text-[10px] font-black uppercase tracking-wider text-emerald-500 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] transition-theme select-none">
                    <span>
                      {isExpanded
                        ? isAr
                          ? "عرض أقل ▲"
                          : "Read Less ▲"
                        : isAr
                          ? "اقرأ المزيد ◀"
                          : "Read More ◀"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Footer Section */}
        <footer className="pt-10 border-t border-gray-250/20 dark:border-gray-800/40 space-y-10">
          <div className="text-center">
            <p className="text-lg md:text-xl font-black text-gray-900 dark:text-white tracking-widest uppercase font-mono">
              {isAr
                ? "فيرال لينك اب - نبتكر لنحمي بياناتك"
                : "VIRALLINKUP - INNOVATING TO PROTECT YOUR DATA"}
            </p>
          </div>

          <div className="p-6 md:p-8 rounded-[var(--radius)] border border-gray-200/60 dark:border-gray-800/60 bg-gray-50/20 dark:bg-gray-900/10 space-y-4 max-w-4xl mx-auto shadow-inner">
            <div className="flex items-center gap-3 text-gray-900 dark:text-white">
              <Shield className="w-5 h-5 text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <h3 className="text-base md:text-lg font-black">
                {isAr ? "حقوق الملكية الفكرية" : "Intellectual Property Rights"}
              </h3>
            </div>
            <p className="text-xs md:text-sm leading-relaxed text-gray-600 dark:text-gray-300 font-semibold font-sans">
              {isAr
                ? "جميع الحقوق البرمجية، العلامة التجارية، ومنطق الربط الذكي الخاص بـ بيربليكستا وكافة مشاريعنا هي حقوق محفوظة لشركة فيرال لينك اب المحدودة. أي محاولة لإعادة الإنتاج أو الاستخدام غير المصرح به تعرض الفاعل للمساءلة القانونية الدولية"
                : "All software rights, trademarks, and the smart connection logic of PERPLEXTA and all our projects are reserved rights of VIRALLINKUP LTD. Any attempt at reproduction or unauthorized use exposes the actor to international legal accountability"}
            </p>
          </div>
        </footer>
      </div>
    </motion.div>
  );
};
