import React from 'react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  ChevronRight, 
  Scale, 
  ShieldCheck, 
  Globe, 
  CreditCard, 
  Building2, 
  FileText,
  Lock,
  Ban,
  UserCheck,
  Cpu,
  Shield
} from 'lucide-react';
import { motion } from 'motion/react';
import { perplextaPageTransition } from '../constants/motions';

export const Terms: React.FC = () => {
  const { language, dir } = useAppContext();
  const navigate = useNavigate();

  const isAr = language === "ar";

  const sections = [
    {
      icon: UserCheck,
      title: isAr ? "1. الأهلية وشروط الترخيص" : "1. Eligibility and Licensing Terms",
      content: isAr 
        ? "يُمنح المستخدم ترخيصاً محدوداً، غير حصري، وغير قابل للتحويل لاستخدام خدمات المنصة وفقاً للأغراض التشغيلية المحددة لها."
        : "Users are granted a limited, non-exclusive, and non-transferable license to utilize the platform's services in accordance with their specified operational purposes.",
      subItems: [
        {
          label: isAr ? "حظر الهندسة العكسية" : "Reverse Engineering Ban",
          desc: isAr ? "يُحظر تماماً محاولة الهندسة العكسية لأي جزء من الكود البرمجي الخاص بمنطق التبديل الذكي (Hybrid Logic) أو واجهة الإدارة." : "Attempting to reverse engineer any part of the Hybrid Logic code or management interface is strictly prohibited."
        },
        {
          label: isAr ? "الأهلية القانونية" : "Legal Eligibility",
          desc: isAr ? "يقتصر الوصول للمنصة على الأشخاص الذين بلغوا السن القانوني في ولايتهم القضائية، أو من لديهم موافقة صريحة من ولي الأمر." : "Access to the platform is restricted to individuals who have reached the legal age in their jurisdiction, or those with explicit parental consent."
        }
      ]
    },
    {
      icon: Ban,
      title: isAr ? "2. سياسة الاستخدام العادل والامتثال" : "2. Fair Use and Compliance Policy",
      content: isAr 
        ? "نطبق سياسات صارمة لمنع التلاعب وضمان استقرار الموارد لضمان جودة الخدمة لجميع المستخدمين."
        : "We implement strict policies to prevent manipulation and ensure resource stability to maintain service quality for all users.",
      subItems: [
        {
          label: isAr ? "الاستخدام الآلي المحظور" : "Prohibited Automated Use",
          desc: isAr ? "يُحظر استخدام أي أدوات آلية (Bots/Scripts) للوصول إلى خدماتنا أو محاولة التلاعب بمعدلات الاستهلاك." : "The use of automated tools (Bots/Scripts) to access our services or attempt to manipulate consumption rates is strictly prohibited."
        },
        {
          label: isAr ? "الأنشطة المحظورة" : "Prohibited Activities",
          desc: isAr ? "يُمنع استخدام المنصة لتوليد محتوى غير قانوني، يحرض على العنف، ينتهك الخصوصية، أو يحتوي على برمجيات خبيثة." : "Using the platform to generate illegal content, incite violence, violate privacy, or distribute malicious software is forbidden."
        },
        {
          label: isAr ? "إجراءات تعليق الحساب" : "Account Suspension Procedures",
          desc: isAr ? "تحتفظ شركة VIRALLINKUP LTD بالحق المطلق في تجميد أو إنهاء أي حساب يثبت تلاعبه بالأنظمة دون إشعار مسبق." : "VIRALLINKUP LTD reserves the absolute right to freeze or terminate any account proven to manipulate systems without prior notice."
        }
      ]
    },
    {
      icon: Cpu,
      title: isAr ? "3. المسؤولية عن مخرجات الذكاء الاصطناعي" : "3. AI Output Liability",
      content: isAr 
        ? "يقر المستخدم بأن المخرجات هي نتاج خوارزميات ذكاء اصطناعي متقدمة، وتُقدم للمستخدم على مسؤوليته الخاصة."
        : "The user acknowledges that outputs are the product of advanced artificial intelligence algorithms and are provided at the user's own risk.",
      subItems: [
        {
          label: isAr ? "دقة المخرجات" : "Output Accuracy",
          desc: isAr ? "الإجابات والصور والأكواد هي نتاج تقنيات الـ AI المتكاملة بالمنصة؛ لا نضمن دقة أو ملاءمة النتائج لغرض محدد دائماً." : "Answers, images, and codes are products of advanced integrated artificial technologies; we do not guarantee exact accuracy or complete suitability for any specific custom purpose."
        },
        {
          label: isAr ? "المسؤولية القانونية" : "Legal Liability",
          desc: isAr ? "يتحمل المستخدم المسؤولية الكاملة عن استخدام المخرجات؛ ولا تتحمل الشركة أي مسؤولية عن أضرار مباشرة أو غير مباشرة ناتجة عنها." : "The user assumes full responsibility for the use of outputs; the company assumes no liability for any direct or indirect damages resulting therefrom."
        }
      ]
    },
    {
      icon: CreditCard,
      title: isAr ? "4. الاشتراكات والمدفوعات" : "4. Subscriptions and Payments",
      content: isAr 
        ? "تخضع كافة العمليات المالية لمعايير الأمان البنكي والشفافية المطلقة للتداول الرقمي الآمن."
        : "All financial operations are subject to standard banking security protocols and absolute transaction transparency.",
      subItems: [
        {
          label: isAr ? "الرسوم والاشتراكات" : "Fees and Subscriptions",
          desc: isAr ? "يلتزم المستخدم بدفع رسوم الاشتراك المقررة؛ وتحتفظ الشركة بالحق في تعديل هيكل الأسعار وفقاً لمتطلبات السوق والنمو." : "Users are committed to paying the prescribed subscription fees; the company reserves the right to modify the pricing structure according to market requirement."
        },
        {
          label: isAr ? "استمرارية الخدمة" : "Service Continuity",
          desc: isAr ? "نضمن كفاءة منطق التبديل بنسبة فائقة، ولا نتحمل مسؤولية التوقف الطويل الناتج عن مزودي الخدمات الأصليين." : "We guarantee switching logic efficiency at the highest levels, but assume no responsibility for downtime caused by upstream providers."
        },
        {
          label: isAr ? "سياسة الاسترداد" : "Refund Policy",
          desc: isAr ? "نظراً للاستهلاك الفوري للموارد الرقمية، فإن جميع الاشتراكات غير قابلة للاسترداد ما لم ينص القانون على خلاف ذلك صراحة." : "Due to the immediate consumption of digital resources, all subscription fees are non-refundable unless otherwise required by law."
        }
      ]
    },
    {
      icon: ShieldCheck,
      title: isAr ? "5. الملكية الفكرية والسيادة الرقمية" : "5. Intellectual Property and Digital Sovereignty",
      content: isAr 
        ? "جميع العلامات التجارية والمنطق البرمجي لـ بيربليكستا هي ملكية حصرية لشركة فيرال لينك اب المحدودة."
        : "All trademarks and programming logic of PERPLEXTA are the exclusive property of VIRALLINKUP LTD.",
      subItems: [
        {
          label: isAr ? "ملكية المحتوى" : "Content Ownership",
          desc: isAr ? "يحتفظ المستخدم بملكية المحتوى المولد، مع منح المنصة ترخيصاً تقنياً محدوداً لتقديم الخدمة فقط." : "Users retain ownership of generated content, granting the platform a limited technical license to process it solely for service delivery."
        },
        {
          label: isAr ? "حماية الابتكار" : "Innovation Protection",
          desc: isAr ? "يُحظر أي استخدام غير مصرح به للشعارات أو الخوارزميات الخاصة بالمنصة تحت طائلة المسؤولية القانونية." : "Any unauthorized use of the platform's logos or algorithms is strictly prohibited under penalty of legal liability."
        }
      ]
    },
    {
      icon: Globe,
      title: isAr ? "6. الامتثال لمعايير السحابة" : "6. Compliance with Cloud Standards",
      content: isAr 
        ? "يلتزم المستخدم تلقائياً بسياسات الاستخدام المقبول لشركاء البنية التحتية السحابية المتقدمة."
        : "Users automatically adhere to the acceptable use policies of our advanced cloud infrastructure partners.",
      subItems: [
        {
          label: isAr ? "سياسات الاستخدام" : "Use Policies",
          desc: isAr ? "الالتزام التام بالضوابط العالمية فيما يخص الذكاء الاصطناعي التوليدي والآمن." : "Full compliance with global regulations regarding generative and safe artificial intelligence."
        },
        {
          label: isAr ? "الانتهاكات" : "Violations",
          desc: isAr ? "أي انتهاك للسياسات الخارجية يعتبر انتهاكاً مباشراً لشروطنا ويؤدي لتعليق الخدمة فوراً." : "Any violation of external cloud policies is considered a direct violation of our terms and leads to immediate service suspension."
        }
      ]
    },
    {
      icon: Scale,
      title: isAr ? "7. إخلاء المسؤولية والقانون الواجب التطبيق" : "7. Disclaimer and Governing Law",
      content: isAr 
        ? "تُقدم الخدمة 'كما هي' وتخضع للقوانين والأنظمة الرسمية السارية."
        : "The service is provided 'as is' and is fully subject to active legal regulatory laws.",
      subItems: [
        {
          label: isAr ? "القانون الواجب" : "Governing Law",
          desc: isAr ? "تخضع هذه الاتفاقية وتفسر وفقاً لقوانين إنجلترا وويلز (England and Wales)." : "This agreement is governed by and construed in accordance with the laws of England and Wales."
        },
        {
          label: isAr ? "فض النزاعات" : "Dispute Resolution",
          desc: isAr ? "أي نزاع قانوني يتم فضه حصرياً أمام المحاكم المختصة في المملكة المتحدة." : "Any legal dispute shall be resolved exclusively before the competent courts in the United Kingdom."
        }
      ]
    },
    {
      icon: Shield,
      title: isAr ? "8. اتفاقية المكافآت والامتثال المالي" : "8. Rewards and Financial Compliance",
      content: isAr 
        ? "تُعد هذه الاتفاقية وثيقة قانونية ملزمة وجزءاً أصيلاً من شروط استخدام منصة بيربليكستا."
        : "This agreement is a binding legal document and an integral part of the PERPLEXTA Terms of Use.",
      subItems: [
        {
          label: isAr ? "الأهلية والإحالات" : "Eligibility and Referrals",
          desc: isAr ? "يُحظر إنشاء حسابات وهمية أو استخدام البوتات؛ التلاعب يؤدي لتجميد الحساب ومصادرة النقاط فوراً." : "Creating fake accounts or using bots is strictly prohibited; manipulation leads to immediate account freezing and points confiscation."
        },
        {
          label: isAr ? "آلية التحويل" : "Transfer Mechanism",
          desc: isAr ? "تخضع طلبات السحب لتدقيق بشري وتقني صارم، ولا تُعتبر النقاط رصيداً نهائياً إلا بعد الموافقة الأمنية." : "Withdrawal requests are subject to strict human and technical auditing; points are not final until security approval."
        },
        {
          label: isAr ? "الامتثال الدولي (AML)" : "International Compliance (AML)",
          desc: isAr ? "نلتزم بقوانين مكافحة غسل الأموال (UK AML)؛ ويُحظر التعامل مع الدول المدرجة على قوائم العقوبات الدولية." : "We comply with UK AML laws; transactions with countries on international sanctions lists are strictly prohibited."
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
            id="terms-back-btn"
            className="w-10 h-10 rounded-[4px] flex items-center justify-center transition-all duration-300 bg-transparent border border-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-emerald-500 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]"
          >
            {dir === 'rtl' ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white uppercase flex items-center gap-2">
              <Scale className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" size={20} />
              {isAr ? 'الشروط والأحكام' : 'Terms & Conditions'}
            </h1>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest font-mono">
              {isAr ? 'القواعد والسياسات المنظمة' : 'GOVERNING RULES & POLICIES'}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-24">
        {/* Hero Section */}
        <section className="text-center space-y-4 pt-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-100 dark:bg-gray-900/50 border border-gray-250/20 dark:border-gray-800/40 text-gray-800 dark:text-gray-200 text-xs font-bold uppercase tracking-widest">
            <Scale size={14} className="text-emerald-500" />
            {isAr ? "الشروط والأحكام" : "Terms & Conditions"}
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-gray-900 dark:text-white uppercase">
            {isAr ? "بيربليكستا" : "PERPLEXTA"}
          </h1>
          <p className="text-lg md:text-2xl font-bold text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)] max-w-2xl mx-auto leading-relaxed">
            {isAr ? "الشروط والسيادة الرقمية للاتفاقية" : "Terms, Conditions, and Digital Sovereignty"}
          </p>
        </section>

        {/* Introduction Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
          <div className="space-y-8">
            <div className="p-6 md:p-8 rounded-[var(--radius)] border border-gray-200/60 dark:border-gray-800/60 bg-gray-50/50 dark:bg-gray-900/45 backdrop-blur-sm shadow-sm transition-all hover:border-emerald-500/20 group">
              <div className="flex items-center gap-3 text-gray-900 dark:text-white mb-4">
                <FileText className="w-6 h-6 text-gray-500 dark:text-gray-400 group-hover:text-emerald-500 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] transition-all duration-300" />
                <h2 className="text-xl md:text-2xl font-black">{isAr ? "الموافقة والالتزام" : "Agreement & Compliance"}</h2>
              </div>
              <p className="text-sm md:text-base leading-relaxed text-gray-600 dark:text-gray-300 font-medium">
                {isAr 
                  ? "باستخدامك لمنصة بيربليكستا، فأنت تقر بموافقتك الكاملة وغير المشروطة على الالتزام بهذه الشروط والأحكام الصادرة عن شركة فيرال لينك اب المحدودة. إذا كنت لا توافق على أي جزء منها، يجب عليك التوقف فوراً عن استخدام المنصة."
                  : "By using the PERPLEXTA platform, you acknowledge your full and unconditional agreement to abide by these Terms and Conditions issued by VIRALLINKUP LTD. If you do not agree with any part of them, you must immediately cease using the platform."}
              </p>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-500 font-mono mt-4">
                {isAr ? "تاريخ السريان: مارس 25, 2026" : "Effective Date: March 25, 2026"}
              </p>
            </div>
          </div>

          <div className="relative aspect-square rounded-[2rem] overflow-hidden bg-gray-50/50 dark:bg-gray-900/30 border border-gray-200/60 dark:border-gray-800/60 flex items-center justify-center p-8 shadow-inner">
            <div className="relative z-10 flex flex-col items-center gap-8 w-full">
              <div className="flex items-center justify-center p-6 rounded-full bg-white dark:bg-gray-950 border border-gray-200/60 dark:border-gray-800/60 shadow-lg hover:shadow-emerald-500/5 transition-all duration-500 group animate-pulse">
                <Scale className="w-24 h-24 text-gray-500 dark:text-gray-400 group-hover:text-emerald-500 group-hover:drop-shadow-[0_0_12px_rgba(16,185,129,0.6)] transition-all duration-500" />
              </div>

              <div className="grid grid-cols-3 gap-3 w-full">
                {[
                  { icon: Shield, label: isAr ? "حماية قانونية" : "Legal Protection" },
                  { icon: Lock, label: isAr ? "التزام صارم" : "Strict Compliance" },
                  { icon: Globe, label: isAr ? "معايير دولية" : "Global Standards" }
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

        {/* Terms Content Sections Grid */}
        <section className="space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white uppercase">
              {isAr ? "بنود الاتفاقية والسياسة" : "Agreement Clauses & Policies"}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 max-w-2xl mx-auto font-medium leading-relaxed">
              {isAr ? "نصوص قانونية تبين العلاقة التنظيمية بين المستخدم والمنصة لضمان سيادة حقوق كافة الأطراف." : "Legal text clarifying the regulatory relation between user and platform to maintain absolute rights sovereignty."}
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

        {/* Legal Acknowledgment Card */}
        <section className="p-8 md:p-10 rounded-[var(--radius)] border border-emerald-500/20 bg-emerald-500/[0.03] dark:bg-emerald-500/[0.01] dark:border-emerald-500/10 shadow-[0_4px_24px_rgba(16,185,129,0.03)] space-y-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-all duration-500" />
          <h2 className="text-2xl font-black text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]">{isAr ? "إقرار قانوني بموافقة المعرفة الصفرية" : "Legal Zero-Knowledge Acknowledgment"}</h2>
          <p className="text-sm md:text-base leading-relaxed text-gray-800 dark:text-gray-200 font-semibold font-sans">
            {isAr 
              ? "استخدامك للمنصة يعني أنك قرأت وفهمت أن بيربليكستا تعمل بنظام المعرفة الصفرية فيما يخص بياناتك، وأنه يتعين عليك الالتزام بكافة الضوابط الصارمة المذكورة أعلاه لحماية استقرار المنصة الاستراتيجية وحقوق الملكية للشركة المالكة."
              : "Your use of the platform signifies that you have fully read and understood that PERPLEXTA operates strictly on a Zero-Knowledge paradigm regarding your personal data processing pipelines, and that you totally agree with all rigid regulations described above to maintain platform integrity, stability, and proprietary intellectual laws."}
          </p>
        </section>

        {/* Corporate Identity & Transparency (Same as about us) */}
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
