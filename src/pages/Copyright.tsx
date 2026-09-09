import React from 'react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  ChevronRight, 
  Scale, 
  ShieldCheck, 
  Globe, 
  Building2, 
  FileText,
  Lock,
  UserCheck,
  Cpu,
  Shield,
  Copyright as CopyrightIcon
} from 'lucide-react';
import { motion } from 'motion/react';
import { perplextaPageTransition } from '../constants/motions';
import { ContentContainer } from '../components/ContentContainer';

export const Copyright: React.FC = () => {
  const { language, dir } = useAppContext();
  const navigate = useNavigate();

  const isAr = language === "ar";

  const sections = [
    {
      icon: Building2,
      title: isAr ? "1. ملكية العلامة التجارية والبرمجيات" : "1. Trademark & Software Ownership",
      content: isAr 
        ? "جميع الحقوق البرمجية، الأكواد المصدرية، منطق التوجيه والأوركسترا الذكي، العلامات التجارية، والشعارات الخاصة بـ بيربليكستا وكافة مشاريعنا هي ملكية حصرية لشركة فيرال لينك اب المحدودة."
        : "All software rights, source codes, smart routing & orchestration logic, trademarks, and logos of PERPLEXTA and all our projects are the exclusive property of VIRALLINKUP LTD.",
      subItems: [
        {
          label: isAr ? "العلامات التجارية والشركاء" : "Trademarks & Affiliates",
          desc: isAr ? "يُمنع تماماً استخدام أو نسخ اسم 'بيربليكستا' أو 'فيرال لينك اب' أو أي شعارات مرتبطة بهما لأغراض تجارية دون موافقة كتابية صريحة مسبقة." : "The use or reproduction of the names 'PERPLEXTA' or 'VIRALLINKUP' or any associated logos for commercial purposes is strictly prohibited without prior explicit written consent."
        },
        {
          label: isAr ? "حقوق الملكية الفكرية البرمجية" : "Software Intellectual Property",
          desc: isAr ? "تشمل الحماية واجهات المستخدم، ومحركات الربط الفني، وتكامل نماذج الذكاء الاصطناعي، والمنظومات الفرعية لإدارة الأرصدة والتحقق الذاتي." : "Protection extends to all user interfaces, engineering wrappers, AI integrations, credits management systems, and identity validation workflows."
        }
      ]
    },
    {
      icon: UserCheck,
      title: isAr ? "2. ترخيص الاستخدام والقيود المفروضة" : "2. Usage License & Restrictions",
      content: isAr 
        ? "يُمنح المستخدم ترخيصاً مؤقتاً ومحدوداً للوصول إلى الخدمات، ولا يعني هذا الترخيص نقل أي جزء من ملكية الأصول البرمجية أو الحقوق الحصرية للمستخدم."
        : "Users are granted a temporary and limited license to access our services. This license does not constitute any transfer of ownership of software assets or exclusive rights.",
      subItems: [
        {
          label: isAr ? "حظر الهندسة العكسية" : "Reverse Engineering Prohibition",
          desc: isAr ? "يُحظر تماماً فك التشفير، أو الهندسة العكسية، أو استخراج الأكواد من الكود المصدر للمنصة وتطبيقاتها." : "Decrypting, reverse engineering, or extracting source code from the platform or its applications is strictly forbidden."
        },
        {
          label: isAr ? "الاستخدام الشخصي والمهني العادل" : "Personal & Fair Professional Use",
          desc: isAr ? "يقتصر الترخيص على الاستفادة من مخرجات التوليد والأدوات وفق المعايير والقوانين المعمول بها وبما لا يضر بالمنصة بنية تحتية وقانونياً." : "The license is limited to utilizing generation outputs and tools in compliance with applicable laws, preventing any infrastructure or legal harm."
        }
      ]
    },
    {
      icon: Cpu,
      title: isAr ? "3. حقوق ملكية المحتوى المُولد" : "3. Ownership of Generated Content",
      content: isAr 
        ? "تقديراً لخصوصيتك وحريتك الإبداعية، فإن جميع الحقوق الفكرية والتجارية للمخرجات والنصوص والصور والملفات الصوتية التي تولدها عبر المنصة تعود إليك بالكامل."
        : "In appreciation of your privacy and creative freedom, all intellectual and commercial rights to the text, images, audio files, and outputs you generate through the platform belong entirely to you.",
      subItems: [
        {
          label: isAr ? "مسؤولية المخرجات" : "Output Responsibility",
          desc: isAr ? "يتحمل المستخدم المسؤولية القانونية الكاملة عن طبيعة استخدام المحتوى المولد وتوافقه مع القوانين المحلية والدولية للملكية وحقوق الطبع والنشر." : "The user bears sole legal responsibility for how the generated content is used and its compliance with local and international intellectual property laws."
        },
        {
          label: isAr ? "الاحترام المتبادل للحقوق" : "Mutual Rights Respect",
          desc: isAr ? "نتوقع من المستخدمين احترام حقوق الآخرين، ونلتزم بمعالجة أي بلاغات تتعلق بانتهاك الملكية الفكرية بأعلى درجات الجدية والسرعة." : "We expect users to respect others' rights, and we are committed to processing any copyright infringement claims with the utmost priority and promptness."
        }
      ]
    },
    {
      icon: Scale,
      title: isAr ? "4. الملاحقة القضائية والتدابير القانونية" : "4. Legal Action & Enforcement",
      content: isAr 
        ? "تحتفظ شركة فيرال لينك اب بالحق الكامل في اتخاذ التدابير التقنية والقانونية الصارمة ضد أي انتهاك لحقوق ملكيتها الفكرية أو البرمجية."
        : "VIRALLINKUP LTD reserves the absolute right to take stringent technical and legal actions against any breach of its software intellectual property rights.",
      subItems: [
        {
          label: isAr ? "الملاحقة القانونية" : "International Legal Pursuit",
          desc: isAr ? "تشمل الإجراءات التعقب القضائي لجرائم إساءة الاستخدام، فك الشيفرة البرمجية، محاولات الاختراق، أو سرقة الملكية في المحاكم الدولية والمحلية." : "Measures include legal prosecution for abuse, decompilation, hacking attempts, or copyright theft in domestic and international courts."
        },
        {
          label: isAr ? "العزل التقني الفوري" : "Immediate Technical Isolation",
          desc: isAr ? "نحتفظ بالحق في إيقاف حسابات المخالفين بشكل دائم، ومصادرة كافة النقاط والأرصدة المتبقية في المحفظة، وحظر العناوين الرقمية المرتبطة بهم." : "We reserve the right to permanently terminate offender accounts, seize remaining wallet credits, and blacklist associated digital addresses."
        }
      ]
    }
  ];

  return (
    <ContentContainer>
      <motion.div 
        {...perplextaPageTransition}
        className="space-y-8 select-none py-2"
        dir={dir}
      >
        {/* Floating Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-250/20 dark:border-gray-800/40">
          <button 
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-xs font-black text-gray-500 hover:text-accent transition-colors"
          >
            {dir === 'rtl' ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            <span>{isAr ? "الرجوع" : "Back"}</span>
          </button>
          
          <div className="flex items-center gap-2 text-accent">
            <CopyrightIcon size={14} className="animate-pulse" />
            <span className="text-[10px] font-black tracking-widest uppercase font-mono">
              {isAr ? "حقوق الملكية الفكرية" : "Intellectual Property Policy"}
            </span>
          </div>
        </div>

        {/* Brand Banner */}
        <div className="relative overflow-hidden rounded-[var(--radius)] border border-gray-200/50 dark:border-gray-800/60 bg-gray-50/20 dark:bg-gray-900/10 p-6 md:p-8 space-y-4 shadow-inner">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-2xl pointer-events-none" />
          <h2 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-snug">
            {isAr ? "حقوق الملكية الفكرية وحماية الابتكار" : "Intellectual Property & Innovation Protection"}
          </h2>
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-semibold leading-relaxed max-w-3xl">
            {isAr 
              ? "بيان شامل يوضح حقوق الملكية الفكرية، شروط حماية البرمجيات والعلامات التجارية لشركة فيرال لينك اب المحدودة ومجموعتها التقنية الفعالة."
              : "Comprehensive statement highlighting the intellectual property, trademark protections, and software rights under VIRALLINKUP LTD and its operational portfolio."}
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-6">
          {sections.map((section, idx) => {
            const Icon = section.icon;
            return (
              <div 
                key={idx}
                className="p-5 md:p-6 rounded-[var(--radius)] border border-gray-250/20 dark:border-gray-800/40 bg-[var(--surface-card)] hover:border-accent/40 transition-all duration-300 space-y-4"
              >
                <div className="flex items-center gap-3 text-gray-900 dark:text-white pb-3 border-b border-gray-250/10 dark:border-gray-800/10">
                  <div className="p-2 rounded-md bg-accent/5 text-accent">
                    <Icon size={18} />
                  </div>
                  <h3 className="text-sm md:text-base font-extrabold tracking-tight">
                    {section.title}
                  </h3>
                </div>

                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 font-semibold leading-relaxed">
                  {section.content}
                </p>

                {section.subItems && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {section.subItems.map((sub, sIdx) => (
                      <div 
                        key={sIdx} 
                        className="p-3.5 rounded-[calc(var(--radius)-4px)] border border-gray-250/10 dark:border-gray-800/10 bg-gray-50/10 dark:bg-gray-900/10 space-y-1.5"
                      >
                        <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200">
                          • {sub.label}
                        </h4>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-semibold leading-relaxed">
                          {sub.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Section */}
        <footer className="pt-8 border-t border-gray-250/20 dark:border-gray-800/40 space-y-8">
          <div className="text-center">
            <p className="text-base md:text-lg font-black text-gray-900 dark:text-white tracking-widest uppercase font-mono">
              {isAr ? "فيرال لينك اب - نبتكر لنحمي بياناتك" : "VIRALLINKUP - INNOVATING TO PROTECT YOUR DATA"}
            </p>
          </div>

          <div className="p-5 md:p-6 rounded-[var(--radius)] border border-gray-200/60 dark:border-gray-800/60 bg-gray-50/20 dark:bg-gray-900/10 space-y-3 max-w-4xl mx-auto shadow-inner text-center">
            <div className="flex items-center justify-center gap-2 text-gray-900 dark:text-white">
              <ShieldCheck className="w-5 h-5 text-accent" />
              <h3 className="text-xs md:text-sm font-black">
                {isAr ? "التزام بالحماية والأمان القانوني" : "Commitment to Legal Protection"}
              </h3>
            </div>
            <p className="text-[11px] md:text-xs leading-relaxed text-gray-500 dark:text-gray-400 font-bold max-w-2xl mx-auto">
              {isAr
                ? "إن استخدامك لهذه المنصة يعني موافقتك الصريحة والكاملة على كافة لوائح حماية الملكية الفكرية وشروط الاستخدام وسياسة الخصوصية المعمول بها قانونياً."
                : "Your utilization of this platform constitutes explicit agreement and adherence to all intellectual property protective charters, terms of service, and privacy policies."}
            </p>
          </div>
        </footer>
      </motion.div>
    </ContentContainer>
  );
};

export default Copyright;
