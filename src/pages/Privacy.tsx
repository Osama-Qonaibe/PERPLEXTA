import React from 'react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, 
  Lock, 
  Eye, 
  UserCheck, 
  Database, 
  Globe, 
  Scale,
  Cpu,
  Building2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { motion } from 'motion/react';
import { perplextaPageTransition } from '../constants/motions';
import { ContentContainer } from '../components/ContentContainer';

export const Privacy: React.FC = () => {
  const { language, dir } = useAppContext();
  const navigate = useNavigate();

  const isAr = language === "ar";

  const sections = [
    {
      icon: Lock,
      title: isAr ? "1. التشفير المطلق وانعدام الصلاحيات (معمارية المعرفة الصفرية)" : "1. Zero-Knowledge Architecture",
      content: isAr 
        ? "نعلن بوضوح وصرامة تقنية تامة: لا تمتلك إدارة المنصة، ولا فريق المطورين، ولا أي جهة داخلية القدرة أو الصلاحية للوصول إلى محادثاتك، ملفاتك المرفوعة، صورك، أو أي محتوى تقوم بتوليده."
        : "We declare with absolute technical strictness: neither the platform management, nor the development team, nor any internal party possesses the capability or authority to access your conversations, uploaded files, images, or any generated content.",
      subItems: [
        {
          label: isAr ? "الناقل الأعمى للملفات والرسائل" : "Blind Carrier for Files & Texts",
          desc: isAr ? "تعمل خوادمنا كمضيف آمن وناقل مشفر فقط، مع معالجة المستندات (PDF/Text) والصور بصورة لحظية." : "Our servers function exclusively as a secure host and encrypted carrier, processing documents (PDF/Text) and images in real-time."
        },
        {
          label: isAr ? "استحالة فك التشفير" : "Decryption Impossibility",
          desc: isAr ? "حفظ البيانات بمفاتيح تشفير ديناميكية معزولة تجعل فك التشفير مستحيلاً من الناحية الهندسية." : "Data preservation using isolated dynamic encryption keys rendering decryption an engineering impossibility."
        },
        {
          label: isAr ? "التشفير اللحظي لقواعد البيانات" : "Real-time Database Encryption",
          desc: isAr ? "تشفير كافة النصوص، الملفات، والمخرجات لحظياً قبل تخزينها المتين والموزع بأمان." : "Real-time encryption of all text prompts, files, and outputs prior to secure, robust, distributed storage."
        }
      ]
    },
    {
      icon: Database,
      title: isAr ? "2. تصنيف البيانات لمعالجة العمليات الحيوية والمالية" : "2. Data Classification for Essential Operations",
      content: isAr 
        ? "نطبق سياسة الحد الأدنى الضروري ولا نجمع أي بيانات مخفية، ونعالِج البيانات المالية بشكل معزول تماماً."
        : "We implement a minimum-necessary policy, abstaining from concealed data collection, and processing financial data in absolute isolation.",
      subItems: [
        {
          label: isAr ? "البيانات والعمليات المالية" : "Financial Operations Data",
          desc: isAr ? "معالجة المدفوعات والاشتراكات والمحفظة تتم حصراً عبر بوابات عالمية آمنة (مثل Stripe)، دون تخزين بطاقات ائتمان." : "Payments, subscriptions, and wallet top-ups are processed exclusively via secure global gateways (e.g., Stripe) without storing credit cards."
        },
        {
          label: isAr ? "بيانات المصادقة" : "Authentication Data",
          desc: isAr ? "جمع معلومات التسجيل الأساسية (البريد الإلكتروني) لتأمين الهوية الرقمية، الأرصدة، والمكافآت الخاصة بك." : "Collection of basic registration details (email) to secure your digital identity, balances, and exclusive rewards."
        },
        {
          label: isAr ? "توليد وتحليل الوسائط" : "Media Generation & Parsing",
          desc: isAr ? "تحليل الأكواد ومعالجة الصوتيات وتوليد الفيديو يتم آلياً داخل بيئة منعزلة وتُحذف المؤقتات الفورية فور اكتمال الجيل." : "Code parsing, audio processing, and video generation occur automatically in an isolated environment; temp buffers are destroyed instantly upon completion."
        }
      ]
    },
    {
      icon: Cpu,
      title: isAr ? "3. الغرض الحصري من المعالجة الآلية" : "3. Exclusive Purpose of Automated Processing",
      content: isAr 
        ? "تتفاعل بنيتنا التحتية مع طلباتك آلياً باستخدام منطق التوجيه الذكي، دون تدخل بشري لضمان الكفاءة القصوى والسرية المطلقة."
        : "Our infrastructure interacts with requests autonomously using smart routing logic, without human intervention to guarantee maximum efficiency and absolute confidentiality.",
      subItems: [
        {
          label: isAr ? "التوجيه اللحظي الذكي" : "Smart Real-time Routing",
          desc: isAr ? "تحليل نوع المهمة برمجياً لتوجيهها بين محركات التعلم العميق وتوليد الصوت/الفيديو حسب الاحتياج بأفضل استقرار." : "Programmatic task analysis routing requests between deep learning engines and Audio/Video generators based on precise parameters."
        },
        {
          label: isAr ? "حماية الحصص والموارد" : "Resource & Quota Protection",
          desc: isAr ? "مراقبة معدلات الاستهلاك بدقة لحماية بيئة المنصة وضمان العدالة وفق نظام اشتراكات ومحافظ صارم." : "Precise monitoring of consumption rates to protect the platform environment and ensure fair utilization according to strict wallet/subscription architectures."
        }
      ]
    },
    {
      icon: Globe,
      title: isAr ? "4. التوافق العالي مع شركاء البنية الذكية ومزودي السحابة" : "4. Unyielding Compliance with Enterprise Cloud & AI Partners",
      content: isAr 
        ? "تعتمد ميزاتنا وتوليد الفيديو ومعالجة النصوص على أحدث الخوادم وتقنيات الذكاء الاصطناعي العالمية مع التقيد الصارم بسياسات الخصوصية الخاصة بعدم التدريب."
        : "Our generation tools (video, text, audio) rely on state-of-the-art enterprise AI cloud technologies with strict adherence to Zero-Training privacy policies.",
      subItems: [
        {
          label: isAr ? "الخصوصية ضد تدريب النماذج" : "Anti-Training Privacy Clause",
          desc: isAr ? "عدم استخدام بياناتك (نصوص التدقيق القانوني، الملفات الخاصة، الأكواد) لتدريب أي نماذج ذكاء اصطناعي وفق اتفاقيات المطورين الرسمية." : "We guarantee your data (legal reviews, private files, code) is NEVER used to train base AI models, per official enterprise agreements."
        },
        {
          label: isAr ? "الأنفاق المشفرة للتصيير" : "Encrypted Rendering Tunnels",
          desc: isAr ? "تمرير طلبات توليد الوسائط وصوت الذكاء الاصطناعي عبر قنوات مشفرة مؤمنة بالكامل وتحذف البيانات المعالجة تلقائياً." : "Routing media generation and AI acoustics requests through fully secured encrypted channels, with automatic processed data deletion."
        }
      ]
    },
    {
      icon: ShieldCheck,
      title: isAr ? "5. سياسة المنع البات لبيع ومشاركة البيانات (الاحتفاظ العقيم)" : "5. Zero-Sell Policy & Sterile Retention",
      content: isAr 
        ? "نحظر بيع أو مشاركة بيانات مساحتك الشخصية، ملفاتك، أو أرصدة محفظتك مع أي جهة تسويقية أو تحليلية إطلاقاً."
        : "Sale or sharing of your personal space data, files, or wallet balances with any marketing or analytics entities is strictly prohibited entirely.",
      subItems: [
        {
          label: isAr ? "مزودي النماذج الآمنة" : "Secure Model Providers",
          desc: isAr ? "اقتصار التبادل التقني مع مزودي الخدمة (Google, OpenAI وغيرها) على واجهات برمجة مشفرة من المستوى المؤسسي بلا احتفاظ." : "Technical handshakes with providers (Google, OpenAI, etc.) are restricted to enterprise-level encrypted APIs with Zero Retention."
        },
        {
          label: isAr ? "الامتثال القانوني المحض" : "Absolute Legal Compliance",
          desc: isAr ? "لا تُفصَح السجلات التشغيلية المحدودة والخاصة بالمكافآت والتعاملات المشبوهة إلا بموجب قوانين بريطانيا النافذة ومكافحة غسل الأموال." : "Limited operational logs related to rewards and suspicious ledgers are disclosed strictly under UK laws and AML requirements."
        }
      ]
    },
    {
      icon: UserCheck,
      title: isAr ? "6. حقوق السيادة والتحكم المطلق (حقوق بياناتك)" : "6. Your Paramount Data Rights",
      content: isAr 
        ? "نمنحك أدوات تحكم واسعة وحقيقية في كل بيانات ومرفقات مساحتك الرقمية."
        : "We bestow upon you expansive, authentic control instruments over all your digital space data and attachments.",
      subItems: [
        {
          label: isAr ? "حق الحذف الشامل الآمن" : "Right of Erasure and Safe Purge",
          desc: isAr ? "إمكانية مسح الحساب، سجل المحادثات، وتدمير كافة المرفقات والملفات من شبكة الخوادم نهائياً من خلال واجهة الاستخدام." : "Ability to erase the account, chat history, and securely purge all attachments/files from the server grid via the user interface."
        },
        {
          label: isAr ? "سحب الأرصدة والمكافآت" : "Credits and Rewards Retraction",
          desc: isAr ? "في حالة الإغلاق، تسقط الأرصدة الترويجية وتتم تصفية البيانات المرتبطة ببرنامج الإحالات بشكل آمن لا رجعة فيه." : "Upon closure, promotional balances are voided, and data tied to referral programs is securely, irreversibly liquidated."
        }
      ]
    }
  ];

  return (
    <ContentContainer 
      initial="initial"
      animate="animate"
      exit="exit"
      variants={perplextaPageTransition}
      className="pb-32 overflow-y-auto h-full custom-scrollbar"
    >
      {/* Sticky Header */}
      <div className="sticky -top-0.5 z-20 -mx-4 md:-mx-8 px-4 md:px-8 py-4 mb-10 bg-[var(--bg-primary)]/90 backdrop-blur-md border-b border-[var(--border-main)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            id="privacy-back-btn"
            className="w-10 h-10 rounded-[4px] flex items-center justify-center transition-theme bg-transparent border border-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-accent hover:"
          >
            {dir === 'rtl' ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white uppercase flex items-center gap-2">
              <Shield className="text-accent " size={20} />
              {isAr ? 'سياسة الخصوصية' : 'Privacy Policy'}
            </h1>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest font-mono">
              {isAr ? 'حماية البيانات والسيادة' : 'DATA PROTECTION & SOVEREIGNTY'}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-24">
        {/* Hero Section */}
        <section className="text-center space-y-4 pt-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-100 dark:bg-gray-900/50 border border-gray-250/20 dark:border-gray-800/40 text-gray-800 dark:text-gray-200 text-xs font-bold uppercase tracking-widest">
            <Shield size={14} className="text-accent" />
            {isAr ? "سياسة الخصوصية" : "Privacy Policy"}
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-gray-900 dark:text-white uppercase">
            {isAr ? "بيربليكستا" : "PERPLEXTA"}
          </h1>
          <p className="text-lg md:text-2xl font-bold text-accent  max-w-2xl mx-auto leading-relaxed">
            {isAr ? "سياسة الخصوصية والسيادة الرقمية" : "Privacy Policy and Digital Sovereignty"}
          </p>
        </section>

        {/* Introduction Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
          <div className="space-y-8">
            <div className="p-6 md:p-8 rounded-[var(--radius)] border border-gray-200/60 dark:border-gray-800/60 bg-gray-50/50 dark:bg-gray-900/45 backdrop-blur-sm shadow-sm transition-theme hover:border-accent/20 group">
              <div className="flex items-center gap-3 text-gray-900 dark:text-white mb-4">
                <Scale className="w-6 h-6 text-gray-500 dark:text-gray-400 group-hover:text-accent group-hover: transition-theme" />
                <h2 className="text-xl md:text-2xl font-black">{isAr ? "المبادئ التأسيسية" : "Foundational Principles"}</h2>
              </div>
              <p className="text-sm md:text-base leading-relaxed text-gray-600 dark:text-gray-300 font-medium font-sans">
                {isAr 
                  ? "تدرك شركة فيرال لينك اب المحدودة أن الخصوصية تعني الاستحالة التقنية للوصول للبيانات. بنيت منصة بيربليكستا على أسس هندسية صارمة تضمن سيادتك المطلقة على مساحتك الرقمية وفقاً لأعلى معايير حماية البيانات (GDPR) والقوانين البريطانية."
                  : "VIRALLINKUP LTD understands that true privacy means the technical impossibility of data access. PERPLEXTA is built on rigorous engineering foundations ensuring absolute sovereignty over your digital space in accordance with GDPR standards and UK legislation."}
              </p>
              <p className="text-xs font-bold uppercase tracking-wider text-accent font-mono mt-4">
                {isAr ? "تاريخ السريان: مارس 25, 2026" : "Effective Date: March 25, 2026"}
              </p>
            </div>
          </div>

          <div className="relative aspect-square rounded-[2rem] overflow-hidden bg-gray-50/50 dark:bg-gray-900/30 border border-gray-200/60 dark:border-gray-800/60 flex items-center justify-center p-8 shadow-inner">
            <div className="relative z-10 flex flex-col items-center gap-8 w-full">
              <div className="flex items-center justify-center p-6 rounded-full bg-white dark:bg-gray-950 border border-gray-200/60 dark:border-gray-800/60 shadow-lg hover:shadow-none transition-theme group animate-pulse">
                <Lock className="w-24 h-24 text-gray-500 dark:text-gray-400 group-hover:text-accent group-hover: transition-theme" />
              </div>

              <div className="grid grid-cols-3 gap-3 w-full">
                {[
                  { icon: Shield, label: isAr ? "سيادة مطلقة" : "Absolute Sovereignty" },
                  { icon: Eye, label: isAr ? "شفافية تقنية" : "Tech Transparency" },
                  { icon: Database, label: isAr ? "تشفير كامل" : "Full Encryption" }
                ].map((item, idx) => (
                  <div 
                    key={idx}
                    className="p-3 rounded-xl bg-white dark:bg-gray-950 border border-gray-200/50 dark:border-gray-800/50 flex flex-col items-center gap-2 transition-theme hover:border-accent/10 hover:-translate-y-1 group hover:shadow-sm"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-900 flex items-center justify-center border border-gray-200/40 dark:border-gray-800/40">
                      <item.icon className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-accent group-hover: transition-theme" />
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

        {/* Policy Content Sections Grid */}
        <section className="space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white uppercase">
              {isAr ? "بنود السيادة والخصوصية" : "Sovereignty & Privacy Clauses"}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 max-w-2xl mx-auto font-medium leading-relaxed">
              {isAr ? "نصوص رسمية تحدد التزاماتنا التقنية والقانونية والأخلاقية لحماية مساحتك الرقمية." : "Official clauses defining our technical, ethical, and legal obligations to protect your digital space."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {sections.map((section, i) => (
              <div 
                key={i} 
                className="p-6 md:p-8 rounded-[var(--radius)] border border-gray-200/60 dark:border-gray-800/60 bg-gray-50/20 dark:bg-gray-900/10 hover:bg-gray-50/50 dark:hover:bg-gray-900/40 hover:border-accent/20 transition-theme group shadow-sm"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-[4px] bg-white dark:bg-gray-950 border border-gray-200/60 dark:border-gray-800/60 flex items-center justify-center text-gray-500 dark:text-gray-400 group-hover:text-accent group-hover: transition-theme">
                    <section.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white group-hover:text-accent transition-colors duration-300">{section.title}</h3>
                </div>

                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-semibold mb-6">
                  {section.content}
                </p>

                <div className="space-y-4 pt-6 border-t border-gray-250/20 dark:border-gray-800/40">
                  {section.subItems.map((sub, sIdx) => (
                    <div key={sIdx} className="space-y-1">
                      <h4 className="text-xs font-black uppercase tracking-wider text-accent ">{sub.label}</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed font-sans">{sub.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Corporate Identity & Transparency */}
        <section className="p-6 md:p-8 rounded-[var(--radius)] border border-gray-200/60 dark:border-gray-800/60 bg-gray-50/20 dark:bg-gray-900/10 space-y-8">
          <div className="flex items-center gap-3 text-gray-900 dark:text-white">
            <Shield className="w-5 h-5 text-accent " />
            <h2 className="text-xl md:text-2xl font-black">{isAr ? "الهوية المؤسسية والشفافية" : "Corporate Identity & Transparency"}</h2>
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
                  {isAr ? "شركة محدودة بالأسهم مسجلة رسمياً في المملكة المتحدة" : "A company limited by shares officially registered in the United Kingdom"}
                </p>
              </div>
              <div>
                <span className="inline-block px-3 py-1 text-xs font-bold text-accent bg-accent/10 rounded-full border border-accent/20 shadow-[0_0_8px_rgba(156,163,175,0.2)]">
                  {isAr ? "نشطة" : "ACTIVE"}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-250/20 dark:border-gray-800/40">
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-gray-950 border border-gray-200/50 dark:border-gray-800/50 hover:border-accent/10 transition-theme group shadow-sm">
                <Globe className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-accent transition-theme" />
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">{isAr ? "رقم التسجيل" : "Registration Number"}</p>
                  <p className="text-base font-black text-gray-900 dark:text-white font-mono">16804604</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-gray-950 border border-gray-200/50 dark:border-gray-800/50 hover:border-accent/10 transition-theme group shadow-sm">
                <Building2 className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-accent transition-theme" />
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">{isAr ? "المقر المسجل" : "Registered Office"}</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">128 City Road, London, EC1V 2NX</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 rounded-xl bg-white dark:bg-gray-950 border border-gray-200/50 dark:border-gray-800/50 space-y-3 shadow-sm">
              <p className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">{isAr ? "طبيعة العمل" : "Nature of Business"}</p>
              <ul className="space-y-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
                <li className="flex items-center gap-2">
                  <span className="text-accent font-mono font-bold">58190</span>
                  <span>{isAr ? "أنشطة النشر والابتكار التقني" : "publishing and tech innovation"}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent font-mono font-bold">62012</span>
                  <span>{isAr ? "تطوير البرمجيات التجارية" : "business software development"}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent font-mono font-bold">63110</span>
                  <span>{isAr ? "معالجة البيانات والاستضافة" : "data processing and hosting"}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent font-mono font-bold">70229</span>
                  <span>{isAr ? "استشارات الإدارة المتخصصة" : "management consultancy"}</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Footer Section */}
        <footer className="pt-10 border-t border-gray-250/20 dark:border-gray-800/40 space-y-10">
          <div className="text-center">
            <p className="text-lg md:text-xl font-black text-gray-900 dark:text-white tracking-widest uppercase font-mono">
              {isAr ? "فيرال لينك اب - نبتكر لنحمي بياناتك" : "VIRALLINKUP - INNOVATING TO PROTECT YOUR DATA"}
            </p>
          </div>

          <div className="p-6 md:p-8 rounded-[var(--radius)] border border-gray-200/60 dark:border-gray-800/60 bg-gray-50/20 dark:bg-gray-900/10 space-y-4 max-w-4xl mx-auto shadow-inner">
            <div className="flex items-center gap-3 text-gray-900 dark:text-white">
              <Shield className="w-5 h-5 text-accent " />
              <h3 className="text-base md:text-lg font-black">{isAr ? "حقوق الملكية الفكرية" : "Intellectual Property Rights"}</h3>
            </div>
            <p className="text-xs md:text-sm leading-relaxed text-gray-600 dark:text-gray-300 font-semibold font-sans">
              {isAr 
                ? "جميع الحقوق البرمجية، العلامة التجارية، ومنطق الربط الذكي الخاص بـ بيربليكستا وكافة مشاريعنا هي حقوق محفوظة لشركة فيرال لينك اب المحدودة. أي محاولة لإعادة الإنتاج أو الاستخدام غير المصرح به تعرض الفاعل للمساءلة القانونية الدولية"
                : "All software rights, trademarks, and the smart connection logic of PERPLEXTA and all our projects are reserved rights of VIRALLINKUP LTD. Any attempt at reproduction or unauthorized use exposes the actor to international legal accountability"}
            </p>
          </div>
        </footer>
      </div>
    </ContentContainer>
  );
};
