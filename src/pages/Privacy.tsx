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

export const Privacy: React.FC = () => {
  const { language, dir } = useAppContext();
  const navigate = useNavigate();

  const isAr = language === "ar";

  const sections = [
    {
      icon: Lock,
      title: isAr ? "1. التشفير المطلق وانعدام الصلاحيات (معمارية المعرفة الصفرية)" : "1. Zero-Knowledge Architecture",
      content: isAr 
        ? "نعلن بوضوح وصرامة تقنية تامة: لا تمتلك إدارة المنصة، ولا فريق المطورين، ولا أي جهة داخلية القدرة أو الصلاحية للوصول إلى محادثاتك، صورك، أكوادك، أو أي محتوى تقوم بتوليده."
        : "We declare with absolute technical strictness: neither the platform management, nor the development team, nor any internal party possesses the capability or authority to access your conversations, images, codes, or any generated content.",
      subItems: [
        {
          label: isAr ? "الناقل الأعمى" : "Blind Carrier",
          desc: isAr ? "تعمل خوادمنا كمضيف آمن وناقل مشفر فقط" : "Our servers function exclusively as a secure host and encrypted carrier."
        },
        {
          label: isAr ? "استحالة فك التشفير" : "Decryption Impossibility",
          desc: isAr ? "حفظ البيانات بمفاتيح تشفير ديناميكية معزولة تجعل فك التشفير مستحيلاً من الناحية الهندسية" : "Data preservation using isolated dynamic encryption keys rendering decryption an engineering impossibility."
        },
        {
          label: isAr ? "تشفير قواعد البيانات" : "Database Encryption",
          desc: isAr ? "تشفير كافة النصوص والمخرجات لحظياً قبل التخزين في قواعد بيانات PostgreSQL" : "Real-time encryption of all prompts and outputs prior to storage in PostgreSQL databases."
        }
      ]
    },
    {
      icon: Database,
      title: isAr ? "2. تصنيف البيانات التي نقوم بجمعها للتشغيل فقط" : "2. Data Classification for Operational Use",
      content: isAr 
        ? "نطبق سياسة الحد الأدنى الضروري ولا نجمع أي بيانات مخفية للاستغلال السلوكي أو غير المصرّح به."
        : "We implement a minimum-necessary policy and abstain from collecting any concealed behavioral data.",
      subItems: [
        {
          label: isAr ? "البيانات المالية" : "Financial Data",
          desc: isAr ? "عدم تخزين تفاصيل البطاقات الائتمانية حيث تتم المعالجة عبر بوابات طرف ثالث ممتثلة لمعايير PCI DSS" : "Zero storage of credit card details; processing is conducted via third-party gateways compliant with PCI DSS standards."
        },
        {
          label: isAr ? "بيانات المصادقة" : "Authentication Data",
          desc: isAr ? "جمع البريد الإلكتروني ومعرفات الدخول الآمنة فقط لتأمين الهوية الرقمية ومنع الاختراقات" : "Collection of email and secure identifiers solely to protect digital identity and prevent unauthorized access."
        },
        {
          label: isAr ? "سجلات التشغيل التقنية" : "Telemetry Data",
          desc: isAr ? "جمع سجلات الخادم الأساسية آلياً لضمان استقرار منطق التبديل الذكي ومنع توقف الخدمة" : "Automated collection of basic server logs to ensure the stability of Smart Switching Logic and service continuity."
        }
      ]
    },
    {
      icon: Cpu,
      title: isAr ? "3. الغرض الحصري من المعالجة الآلية" : "3. Exclusive Purpose of Automated Processing",
      content: isAr 
        ? "تتفاعل بنيتنا التحتية مع طلباتك آلياً دون أي تدخل بشري لضمان السرعة والسرية القصوى."
        : "Our infrastructure interacts with requests autonomously without human intervention to guarantee extreme speed and confidentiality.",
      subItems: [
        {
          label: isAr ? "المزامنة العمياء" : "Blind Sync",
          desc: isAr ? "تأمين نقل حزم البيانات المشفرة بين بيئات العمل المتعددة لضمان عدم فقدان الأعمال" : "Securing the transfer of encrypted data packets across multiple environments to prevent data loss."
        },
        {
          label: isAr ? "الحماية الهيكلية" : "Structural Protection",
          desc: isAr ? "مراقبة معدلات تدفق البيانات لحماية المنصة من الاستهلاك المفرط أو النشاط الضار" : "Monitoring data flow rates to safeguard the platform against excessive consumption or malicious activity."
        },
        {
          label: isAr ? "التوجيه اللحظي" : "Real-time Routing",
          desc: isAr ? "تحليل نوع المهمة برمجياً لتوجيهها نحو محرك الذكاء الاصطناعي الأنسب لضمان الكفاءة القصوى" : "Programmatic task analysis to direct requests to the most efficient AI engine for maximum performance."
        }
      ]
    },
    {
      icon: Globe,
      title: isAr ? "4. الالتزام الصارم بمعايير تقنيات جوجل" : "4. Strict Compliance with Google Technology Standards",
      content: isAr 
        ? "تعتمد ميزات المعالجة والنماذج التوليدية في المنصة على أحدث تقنيات جوجل السحابية مع الالتزام الكامل بسياساتهم الأمنية والخصوصية السلسة."
        : "Processing features and generative models rely on the latest Google Cloud technologies with full adherence to their security and seamless privacy policies.",
      subItems: [
        {
          label: isAr ? "خصوصية التدريب" : "Training Privacy",
          desc: isAr ? "عدم استخدام بياناتك لتدريب نماذج Google الأساسية وفقاً لاتفاقيات مستوى الخدمة للمطورين" : "Your data is not utilized for training base Google models in accordance with developer Service Level Agreements."
        },
        {
          label: isAr ? "بروتوكولات التشفير" : "Encryption Protocols",
          desc: isAr ? "تخضع الطلبات المارة عبر واجهاتنا لنماذج Google لبروتوكولات تشفير فريدة وسرية مطلقة" : "Requests processed through our interfaces to Google models are subject to unique and absolute encryption protocols."
        }
      ]
    },
    {
      icon: ShieldCheck,
      title: isAr ? "5. سياسة المنع البات لبيع ومشاركة البيانات (سياسة عدم البيع)" : "5. Zero-Sell Policy",
      content: isAr 
        ? "نحظر بيع أو تأجير أو المتاجرة ببياناتك أو هويتك الرقمية مع أي جهات إعلانية أو تسويقية تحت أي ظرف ولأي غرض تسويقي."
        : "We strictly prohibit the sale, rental, or trading of your data or digital identity with any advertising or marketing entities under any circumstances.",
      subItems: [
        {
          label: isAr ? "مزودي النماذج" : "AI Providers",
          desc: isAr ? "اقتصار الحركة الآلية على إرسال الطلبات المشفرة للمعالجة الفورية وإرجاع النتيجة لك حصرياً" : "Data movement is limited to sending encrypted requests for immediate processing and exclusive result return."
        },
        {
          label: isAr ? "الامتثال القانوني" : "Legal Compliance",
          desc: isAr ? "عدم الإفصاح عن السجلات التقنية إلا بموجب أمر قضائي ملزم من السلطات المختصة في المملكة المتحدة حصراً" : "Disclosure of technical records occurs only under a binding court order from UK competent authorities exclusively."
        }
      ]
    },
    {
      icon: UserCheck,
      title: isAr ? "6. حقوق السيادة والتحكم المطلق (حقوق بياناتك)" : "6. Your Data Rights",
      content: isAr 
        ? "نمنحك أدوات التحكم الكاملة بمساحتك الرقمية لضمان سيادتك المطلقة، مما يتيح لك الأمان الكامل وحرية إدارة محتواك."
        : "We provide comprehensive control tools over your digital space to ensure absolute sovereignty, giving you complete safety and freedom of content management.",
      subItems: [
        {
          label: isAr ? "حق التصدير الآمن" : "Right of Secure Export",
          desc: isAr ? "طلب تصدير السجلات المشفرة بصيغة قابلة للقراءة لامتلاك نسخة محلية من أعمالك" : "Requesting the export of encrypted records in a readable format to maintain a local copy of your work."
        },
        {
          label: isAr ? "حق التدمير الشامل" : "Right of Total Destruction",
          desc: isAr ? "إمكانية مسح الحساب وكافة الطلبات والمشاريع نهائياً بضغطة زر دون ترك أي أثر أو نسخة احتياطية" : "Ability to permanently erase account and all projects with a single click leaving no trace or backup."
        }
      ]
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
            id="privacy-back-btn"
            className="w-10 h-10 rounded-[4px] flex items-center justify-center transition-all duration-300 bg-transparent border border-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-emerald-500 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]"
          >
            {dir === 'rtl' ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white uppercase flex items-center gap-2">
              <Shield className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" size={20} />
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
            <Shield size={14} className="text-emerald-500" />
            {isAr ? "سياسة الخصوصية" : "Privacy Policy"}
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-gray-900 dark:text-white uppercase">
            {isAr ? "بيربليكستا" : "PERPLEXTA"}
          </h1>
          <p className="text-lg md:text-2xl font-bold text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)] max-w-2xl mx-auto leading-relaxed">
            {isAr ? "سياسة الخصوصية والسيادة الرقمية" : "Privacy Policy and Digital Sovereignty"}
          </p>
        </section>

        {/* Introduction Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
          <div className="space-y-8">
            <div className="p-6 md:p-8 rounded-[var(--radius)] border border-gray-200/60 dark:border-gray-800/60 bg-gray-50/50 dark:bg-gray-900/45 backdrop-blur-sm shadow-sm transition-all hover:border-emerald-500/20 group">
              <div className="flex items-center gap-3 text-gray-900 dark:text-white mb-4">
                <Scale className="w-6 h-6 text-gray-500 dark:text-gray-400 group-hover:text-emerald-500 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] transition-all duration-300" />
                <h2 className="text-xl md:text-2xl font-black">{isAr ? "المبادئ التأسيسية" : "Foundational Principles"}</h2>
              </div>
              <p className="text-sm md:text-base leading-relaxed text-gray-600 dark:text-gray-300 font-medium font-sans">
                {isAr 
                  ? "تدرك شركة فيرال لينك اب المحدودة أن الخصوصية تعني الاستحالة التقنية للوصول للبيانات. بنيت منصة بيربليكستا على أسس هندسية صارمة تضمن سيادتك المطلقة على مساحتك الرقمية وفقاً لأعلى معايير حماية البيانات (GDPR) والقوانين البريطانية."
                  : "VIRALLINKUP LTD understands that true privacy means the technical impossibility of data access. PERPLEXTA is built on rigorous engineering foundations ensuring absolute sovereignty over your digital space in accordance with GDPR standards and UK legislation."}
              </p>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-500 font-mono mt-4">
                {isAr ? "تاريخ السريان: مارس 25, 2026" : "Effective Date: March 25, 2026"}
              </p>
            </div>
          </div>

          <div className="relative aspect-square rounded-[2rem] overflow-hidden bg-gray-50/50 dark:bg-gray-900/30 border border-gray-200/60 dark:border-gray-800/60 flex items-center justify-center p-8 shadow-inner">
            <div className="relative z-10 flex flex-col items-center gap-8 w-full">
              <div className="flex items-center justify-center p-6 rounded-full bg-white dark:bg-gray-950 border border-gray-200/60 dark:border-gray-800/60 shadow-lg hover:shadow-emerald-500/5 transition-all duration-500 group animate-pulse">
                <Lock className="w-24 h-24 text-gray-500 dark:text-gray-400 group-hover:text-emerald-500 group-hover:drop-shadow-[0_0_12px_rgba(16,185,129,0.6)] transition-all duration-500" />
              </div>

              <div className="grid grid-cols-3 gap-3 w-full">
                {[
                  { icon: Shield, label: isAr ? "سيادة مطلقة" : "Absolute Sovereignty" },
                  { icon: Eye, label: isAr ? "شفافية تقنية" : "Tech Transparency" },
                  { icon: Database, label: isAr ? "تشفير كامل" : "Full Encryption" }
                ].map((item, idx) => (
                  <div 
                    key={idx}
                    className="p-3 rounded-xl bg-white dark:bg-gray-950 border border-gray-200/50 dark:border-gray-800/50 flex flex-col items-center gap-2 transition-all duration-300 hover:border-emerald-500/10 hover:-translate-y-1 group hover:shadow-sm"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-900 flex items-center justify-center border border-gray-200/40 dark:border-gray-800/40">
                      <item.icon className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-emerald-500 group-hover:drop-shadow-[0_0_6px_rgba(16,185,129,0.6)] transition-all duration-300" />
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
                className="p-6 md:p-8 rounded-[var(--radius)] border border-gray-200/60 dark:border-gray-800/60 bg-gray-50/20 dark:bg-gray-900/10 hover:bg-gray-50/50 dark:hover:bg-gray-900/40 hover:border-emerald-500/20 transition-all duration-300 group shadow-sm"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-[4px] bg-white dark:bg-gray-950 border border-gray-200/60 dark:border-gray-800/60 flex items-center justify-center text-gray-500 dark:text-gray-400 group-hover:text-emerald-500 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] transition-all duration-300">
                    <section.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white group-hover:text-emerald-500 transition-colors duration-300">{section.title}</h3>
                </div>

                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-semibold mb-6">
                  {section.content}
                </p>

                <div className="space-y-4 pt-6 border-t border-gray-250/20 dark:border-gray-800/40">
                  {section.subItems.map((sub, sIdx) => (
                    <div key={sIdx} className="space-y-1">
                      <h4 className="text-xs font-black uppercase tracking-wider text-emerald-500 drop-shadow-[0_0_4px_rgba(16,185,129,0.1)]">{sub.label}</h4>
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
            <Shield className="w-5 h-5 text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
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
                <span className="inline-block px-3 py-1 text-xs font-bold text-emerald-500 bg-emerald-500/10 rounded-full border border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                  {isAr ? "نشطة" : "ACTIVE"}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-250/20 dark:border-gray-800/40">
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-gray-950 border border-gray-200/50 dark:border-gray-800/50 hover:border-emerald-500/10 transition-all duration-300 group shadow-sm">
                <Globe className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-emerald-500 transition-all duration-300" />
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">{isAr ? "رقم التسجيل" : "Registration Number"}</p>
                  <p className="text-base font-black text-gray-900 dark:text-white font-mono">16804604</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-gray-950 border border-gray-200/50 dark:border-gray-800/50 hover:border-emerald-500/10 transition-all duration-300 group shadow-sm">
                <Building2 className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-emerald-500 transition-all duration-300" />
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
                  <span className="text-emerald-500 font-mono font-bold">58190</span>
                  <span>{isAr ? "أنشطة النشر والابتكار التقني" : "publishing and tech innovation"}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500 font-mono font-bold">62012</span>
                  <span>{isAr ? "تطوير البرمجيات التجارية" : "business software development"}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500 font-mono font-bold">63110</span>
                  <span>{isAr ? "معالجة البيانات والاستضافة" : "data processing and hosting"}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500 font-mono font-bold">70229</span>
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
              <Shield className="w-5 h-5 text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
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
    </motion.div>
  );
};
