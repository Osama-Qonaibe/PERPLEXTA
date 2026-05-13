import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { API_BASE_URL, SOCKET_URL } from '../constants';

type Language = 'ar' | 'en';
type Theme = 'dark' | 'light';

export interface User {
  id?: number;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
  kyc_required?: boolean;
  kyc_status?: 'pending' | 'verified' | 'rejected' | 'none';
  kyc_rejection_reason?: string | null;
  custom_instructions?: string;
  memory?: string;
  subscription?: {
    plan_id: string;
    status: string;
    created_at?: string;
    current_period_end: string;
    last_period_start?: string;
    plan_name_en: string;
    plan_name_ar?: string;
    billing_period?: string;
    limits: any;
    plan_color?: string;
  } | null;
  usageStats?: Record<string, number>;
}

export interface SiteSettings {
  siteName: string;
  siteNameAr: string;
  siteDescription: string;
  siteDescriptionAr: string;
  logoBase64: string | null;
  faviconBase64: string | null;
  seoDescriptionEn: string;
  seoDescriptionAr: string;
  keywordsEn: string;
  keywordsAr: string;
  googleAnalyticsId: string;
}

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  dir: 'rtl' | 'ltr';
  t: (key: string, replacements?: Record<string, string | number>) => string;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  user: User | null;
  setUser: (user: User | null) => void;
  isAuthReady: boolean;
  token: string | null;
  balance: number;
  balanceUSD: number;
  login: (email: string, password: string) => Promise<{ success: boolean, error?: string }>;
  signup: (email: string, password: string, name: string, ref?: string) => Promise<{ success: boolean, error?: string }>;
  loginWithGoogle: () => void;
  logout: () => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (isOpen: boolean) => void;
  plans: any[];
  setPlans: (plans: any[]) => void;
  siteSettings: SiteSettings;
  setSiteSettings: (settings: SiteSettings) => void;
  economySettings: any;
  setEconomySettings: (settings: any) => void;
  payWithBalance: (planId: string, billingCycle: 'monthly' | 'annual') => Promise<{ success: boolean, message?: string, error?: string }>;
  stripeCheckout: (planId: string, billingCycle: 'monthly' | 'annual') => Promise<{ url?: string, error?: string }>;
  refreshUser: () => Promise<void>;
  notifications: any[];
  setNotifications: (notifications: any[]) => void;
  unreadCount: number;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  socket: Socket | null;
  milestoneData: any;
  setMilestoneData: (data: any) => void;
  isMobile: boolean;
  isInstallable: boolean;
  isInstalling: boolean;
  rememberMe: boolean;
  isOperationPending: boolean;
  setIsOperationPending: (val: boolean) => void;
  setRememberMe: (val: boolean) => void;
  installApp: () => Promise<void>;
  memoryNotification: {
    isVisible: boolean;
    type: 'success' | 'warning' | 'cleanup' | 'optimization' | 'startup';
    desc?: string;
  };
  triggerMemoryNotification: (type: 'success' | 'warning' | 'cleanup' | 'optimization' | 'startup', desc?: string) => void;
  closeMemoryNotification: () => void;
}

const translations = {
  ar: {
    rewards: 'المكافآت',
    subscription: 'الاشتراكات',
    consumption: 'الاستهلاك',
    dashboard: 'لوحة التحكم',
    newChat: 'محادثة جديدة',
    settings: 'الإعدادات',
    install_app: 'تثبيت التطبيق',
    howCanIHelp: 'ما الذي تود القيام به؟',
    askAssistant: 'اسأل بيربليكستا',
    fast: 'سريع',
    pro: 'احترافي',
    thinking: 'تفكير',
    uploadImage: 'رفع صورة',
    uploadDocument: 'رفع مستند',
    chat: 'محادثة',
    tools: 'الأدوات',
    chat_fast: 'سريع',
    chat_pro: 'احترافي',
    chat_reasoning: 'تفكير',
    sovereign_search: 'البحث الاستخباراتي',
    perplexta_analysis: 'تحليل بيربليكستا',
    perplexta_analysis_desc: 'البحث التقني والتحليل الرقمي العميق',
    legal_analysis: 'المساعد القانوني',
    legal_analysis_desc: 'تحليل احترافي للوثائق القانونية، الأنظمة، والاستفسارات التشريعية بدقة عالية.',
    notebook: 'مساعد الإعلانات',
    image: 'توليد الصور',
    video: 'توليد فيديو',
    stt: 'تحويل الصوت الى نص',
    tts: 'تحويل النص الى صوت',
    learning: 'التعلم التكيفي',
    code: 'إنشاء كود',
    canvas: 'استوديو الصوت الذكي',
    storage_mb: 'مساحة التخزين (MB)',
    sovereign_memory: 'الذاكرة الجوهرية',
    newBadge: 'جديد',
    commandCenter: 'مركز القيادة',
    aiInfrastructure: 'إدارة المفاتيح',
    dbOrchestration: 'قواعد البيانات',
    financeVault: 'الخزنة المالية',
    financeVaultDesc: 'إدارة الإعدادات الاقتصادية، بوابات الدفع، وعمليات السحب.',
    economySettings: 'الإعدادات الاقتصادية',
    plansSubscriptions: 'الخطط والاشتراكات',
    saveSettings: 'حفظ الإعدادات',
    minWithdrawal: 'الحد الأدنى للسحب (سنت)',
    minWithdrawalDesc: 'أقل مبلغ يمكن للمستخدم طلبه للسحب.',
    referralBonus: 'مكافأة الإحالة (نقاط)',
    referralBonusDesc: 'النقاط التي يحصل عليها المُحيل.',
    welcomeBonus: 'مكافأة الترحيب (نقاط)',
    welcomeBonusDesc: 'النقاط التي يحصل عليها المستخدم الجديد.',
    conversionRate: 'سعر التحويل',
    conversionRateDesc: 'قيمة النقطة الواحدة بالدولار.',
    pointsPerDollar: 'النقاط لكل دولار',
    pointsPerDollarDesc: 'عدد النقاط التي يحصل عليها المستخدم مقابل كل دولار.',
    points: 'نقاط',
    point: 'نقطة',
    cents: 'سنت',
    stripeConfig: 'إعدادات Stripe',
    stripeDesc: 'إدارة مفاتيح API الخاصة بـ Stripe للاشتراكات والمدفوعات.',
    testMode: 'وضع التجربة',
    liveMode: 'وضع التشغيل',
    publishableKey: 'المفتاح العام (Publishable Key)',
    secretKey: 'المفتاح السري (Secret Key)',
    webhookSecret: 'مفتاح الـ Webhook',
    saveStripeConfig: 'حفظ إعدادات Stripe',
    amount: 'المبلغ',
    paymentMethod: 'طريقة الدفع',
    requestDate: 'تاريخ الطلب',
    actions: 'الإجراءات',
    verified: 'موثق',
    paypal: 'باي بال',
    approve: 'موافقة',
    reject: 'رفض',
    requireKyc: 'طلب توثيق الهوية',
    kycStatus: 'حالة التوثيق',
    accountStatus: 'حالة الحساب',
    identityVerification: 'توثيق الهوية',
    required: 'مطلوب',
    notRequired: 'غير مطلوب',
    kycSelfieReview: 'مراجعة صورة التوثيق',
    pendingReview: 'بانتظار المراجعة',
    fullNameOnID: 'الاسم الكامل في الهوية:',
    identitySection: 'قسم الهوية',
    kycPending: 'قيد المراجعة',
    kycVerified: 'تم التحقق بنجاح',
    kycRejected: 'تم الرفض',
    kycRejectionReason: 'سبب الرفض',
    kycNone: 'لم يبدأ',
    kycStatusLabel: 'حالة توثيق الحساب',
    accountSettings: 'إعدادات الحساب',
    shortcuts: 'الاختصارات',
    wallet: 'المحفظة',
    memoryCenter: 'ذاكرة المساعد',
    all: 'الكل',
    personal: 'شخصي',
    technical: 'تقني',
    preference: 'تفضيلات',
    project: 'مشروع',
    general: 'عام',
    addFact: 'إضافة حقيقة',
    memoryCapacity: 'سعة الذاكرة',
    prune: 'تنظيف',
    loadingMemory: 'جاري تحميل الذاكرة...',
    noResults: 'لا توجد نتائج',
    memoryLimitReached: 'لقد وصلت إلى الحد الأقصى للذاكرة (50). يرجى حذف بعض الحقائق القديمة أولاً.',
    userManagement: 'المستخدمين',
    systemSettings: 'إعدادات النظام',
    smartEmailHub: 'البريد الذكي',
    toolOrchestrator: 'الأوركسترا',
    paymentGateways: 'بوابات الدفع',
    withdrawals: 'طلبات السحب',
    kycRequests: 'طلبات التوثيق',
    ledger: 'سجل العمليات',
    modelProviders: 'مزودي النماذج',
    users: 'المستخدمين',
    plans: 'الخطط والاستهلاك',
    saveSuccess: 'تم الحفظ بنجاح',
    saveFailed: 'فشل الحفظ',
    add: 'إضافة',
    edit: 'تعديل',
    delete: 'حذف',
    appName: '',
    home: 'الرئيسية',
    save: 'حفظ',
    avatar: 'الصورة الشخصية',
    uploadFile: 'رفع ملف',
    videoDuration: 'المدة',
    cinematic: 'سينمائي',
    realistic: 'واقعي',
    anime: 'أنمي',
    'digital art': 'فن رقمي',
    standard: 'عادي',
    hd: 'عالي الجودة',
    ultra: 'فائق الجودة',
    
    testConnection: 'فحص الاتصال',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    confirmPassword: 'تأكيد كلمة المرور',
    processing: 'جاري المعالجة',
    continueWithGoogle: 'المتابعة باستخدام جوجل',
    noAccount: 'ليس لديك حساب؟',
    haveAccount: 'لديك حساب بالفعل؟',
    createAccount: 'إنشاء حساب جديد',
    signup: 'إنشاء حساب',
    welcome: 'مرحباً بعودتك!',
    logout: 'تسجيل الخروج',
    forgotPassword: 'نسيت كلمة المرور؟',
    forgotPasswordTitle: 'استعادة كلمة المرور',
    forgotPasswordDesc: 'أدخل بريدك الإلكتروني لاستعادة كلمة المرور',
    sendResetLink: 'إرسال الرابط',
    rememberedPassword: 'تذكرت كلمة المرور؟',
    login: 'تسجيل الدخول',
    analyzingResources: 'جاري تحليل الموارد...',
    usageToday: 'الاستهلاك اليومي',
    usageMonthly: 'الاستهلاك الشهري',
    resourceId: 'المعرف',
    renewal: 'التجديد',
    quotaInfoTitle: 'إدارة الحصص الاحترافية',
    quotaInfoDesc: 'يتم تصفير العدادات اليومية كل 24 ساعة، بينما يتم تصفير العدادات الشهرية في بداية كل شهر ميلادي. في حال تخطي الحصة المجانية، سيقوم النظام تلقائياً بالخصم من رصيد المحفظة لضمان استمرارية الخدمة بأقل تكلفة.',
    
    addNewPlan: 'خطة جديدة',
    planNameEn: 'اسم الخطة بالإنجليزية',
    planNameAr: 'اسم الخطة بالعربية',
    planDescEn: 'وصف الخطة بالإنجليزية',
    planDescAr: 'وصف الخطة بالعربية',
    planFeaturesEn: 'الميزات بالإنجليزية',
    planFeaturesAr: 'الميزات بالعربية',
    addFeature: 'إضافة ميزة',
    badge: 'الشارة',
    discountPercentage: 'نسبة الخصم',
    visible: 'مرئي',
    limits: 'الحدود',
    images: 'الصور',
    connectors: 'الموصلات',
    workspace: 'استوديو الصوت الذكي',
    search: 'البحث',
    art: 'الفن',
    none: 'لا يوجد',
    bestSeller: 'الأكثر مبيعاً',
    popular: 'شائع',
    unlimited: 'unlimited',
    payWithBalance: 'الدفع بالرصيد',
    payWithPoints: 'الدفع بالنقاط',
    upgrade: 'ترقية',
    daily: 'يومي',
    monthly: 'شهري',
    annual: 'سنوي',
    confirmSubscription: 'تأكيد الاشتراك',
    confirmSubscriptionDesc: 'أنت على وشك الاشتراك في خطة {plan} باستخدام رصيدك الحالي.',
    currentBalance: 'رصيدك الحالي',
    planPrice: 'قيمة الخطة',
    remainingBalance: 'الرصيد المتبقي بعد الدفع',
    confirmAndActivate: 'تأكيد وتفعيل الاشتراك',
    cancel: 'إلغاء',
    insufficientBalance: 'رصيدك غير كافٍ لإتمام هذه العملية.',
    subscriptionSuccess: 'تم الاشتراك بنجاح!',
    quotaMilestoneTitle: 'استهلاك {percentage}%',
    quotaMilestone50: 'لقد استهلكت نصف الحد المسموح لك للهذه الأداة!',
    quotaMilestone90: 'تنبيه: أنت على وشك استهلاك كامل الحد المسموح!',
    quotaMilestone100: 'انتهى الحد المسموح! الخدمة مستمرة بالخصم من الرصيد.',
    quotaMilestoneIncentive: 'ادعُ أصدقاءك للحصول على نقاط إضافية والاستمرار في الخدمة باحترافية.',
    rewardFriends: 'اربح مع أصدقائك',
    subscriptionSuccessDesc: 'تم تفعيل خطتك بنجاح! اكسب المزيد من النقاط بدعوة أصدقائك.',
    insufficientBalanceTitle: 'رصيد غير كافٍ',
    insufficientBalanceDesc: 'ليس لديك رصيد كافٍ للاشتراك. ادعُ أصدقاءك لكسب النقاط والاستمرار في استخدام خدماتنا.',
    shareWithFriends: 'شارك مع أصدقائك',
    close: 'إغلاق',
    planForCreators: 'للمؤثرين',
    planForPros: 'للمستخدمين المتقدمين',
    planForBusiness: 'للشركات',
    planColor: 'لون الخطة',
    
    consumptionRadar: 'رادار الاستهلاك',
    realTimeSync: 'مزامنة لحظية للموارد',
    liveNow: 'نشط الآن',
    currentPlan: 'الخطة الحالية',
    subscriptionCycle: 'دورة الاشتراك',
    daysRemaining: 'باقي {days} يوم',
    limitless: 'غير محدود',
    of: 'من',
    usageLoad: 'نسبة الاستخدام',
    noActiveRadar: 'لا يوجد رادار نشط',
    noActiveRadarDesc: 'اشترك في إحدى باقاتنا لتفعيل رادار الاستهلاك والمزامنة الحية.',
    resourceResetProtocol: 'بروتوكول تصفير الموارد',
    resourceResetDesc: 'تتم إعادة تعيين عدادات استهلاك الموارد الملحقة آلياً عند الساعة 12:00 منتصف الليل (UTC).',
    searchUsers: 'البحث عن مستخدم (الاسم، البريد)...',
    active: 'مفعل',
    suspended: 'موقوف',
    sendEmail: 'إرسال بريد',
    viewProfile: 'عرض الملف',
    userProfile: 'ملف المستخدم',
    plan: 'الباقة',
    changePlan: 'تغيير الباقة',
    adjustBalance: 'تعديل الرصيد',
    accountActions: 'إجراءات الحساب',
    suspendAccount: 'إيقاف الحساب',
    activateAccount: 'تنشيط الحساب',
    joinedAt: 'تاريخ الانضمام',
    lastLogin: 'آخر تسجيل دخول',
    usageStats: 'إحصائيات الاستخدام',
    quickActions: 'إجراءات سريعة',
    emailSubject: 'موضوع الرسالة',
    emailBody: 'نص الرسالة',
    send: 'إرسال',
    saveChanges: 'حفظ التغييرات',
    emailSettings: 'إعدادات البريد',
    emailTemplates: 'قوالب البريد',
    broadcast: 'حملات بريدية',
    smtpSettings: 'إعدادات مزود الإرسال',
    smtpHost: 'الخادم',
    smtpPort: 'المنفذ',
    smtpUsername: 'اسم المستخدم',
    smtpPassword: 'كلمة المرور',
    senderName: 'اسم المرسل',
    senderEmail: 'بريد المرسل',
    smtpTestConnection: 'اختبار الاتصال',
    createNewTemplate: 'إنشاء قالب جديد',
    templateName: 'اسم القالب',
    variables: 'المتغيرات المتاحة',
    editTemplate: 'تعديل القالب',
    systemTemplates: 'قوالب النظام الأساسية',
    customTemplates: 'قوالب مخصصة',
    welcomeEmail: 'رسالة الترحيب',
    resetPasswordEmail: 'استعادة كلمة المرور',
    subscriptionSuccessEmail: 'نجاح الاشتراك',
    sendTestEmail: 'إرسال رسالة تجريبية',
    mailerType: 'نوع الإرسال',
    phpMail: 'دالة PHP Mail',
    smtp: 'خادم SMTP',
    encryption: 'نوع التشفير',
    noneEncryption: 'بدون تشفير',
    ssl: 'SSL',
    tls: 'TLS',
    smtpDesc: 'قم بإعداد مزود البريد الإلكتروني الخاص بك',
    securityProtocol: 'بروتوكول الأمان',
    securityProtocolDesc: 'يتم تشفير بيانات اعتماد البريد الإلكتروني باستخدام AES-256 قبل تخزينها في ملف التكوين الآمن. لا يتم كشفها للواجهة الأمامية أو تخزينها كنص صريح في قاعدة البيانات أبداً.',
    spamWarning: 'تأكد من أن مزود الخدمة الخاص بك يسمح بالإرسال من "بريد المرسل" المحدد لتجنب وصول رسائلك إلى مجلد البريد المزعج (Spam).',
    clickToCopy: 'انقر للنسخ واللصق في قالبك.',
    broadcastTitle: 'حملات البث المباشر',
    broadcastDesc: 'أرسل رسائل بريد إلكتروني جماعية لشرائح محددة من المستخدمين، أعلن عن ميزات جديدة، أو قم بتشغيل حملات ترويجية مباشرة من هنا.',
    createCampaign: 'إنشاء حملة',
    campaignName: 'اسم الحملة',
    selectTemplate: 'اختر القالب',
    targetAudience: 'الجمهور المستهدف',
    byPlan: 'حسب الباقة',
    byActivity: 'حسب النشاط',
    activeUsers: 'المستخدمون النشطون',
    inactiveUsers: 'المستخدمون غير النشطين',
    sendCampaign: 'إرسال الحملة',
    campaignHistory: 'سجل الحملات',
    broadcastHistory: 'سجل عمليات البث',
    sent: 'تم الإرسال',
    pendingBroadcast: 'قيد المتابعة',
    failedBroadcast: 'فشل الإرسال',
    recipients: 'المستلمون',
    totalSent: 'إجمالي المرسل',
    successRate: 'نسبة النجاح',
    noCampaigns: 'لا توجد حملات مرسلة بعد.',
    confirmSendCampaign: 'هل أنت متأكد من رغبتك في إرسال هذه الحملة الآن؟ قد يستغرق الأمر بعض الوقت اعتماداً على عدد المستحقين.',
    campaignStartSuccess: 'بدأت الحملة بنجاح، يمكنك متابعة التقدم في السجل.',
    campaignStartError: 'حدث خطأ أثناء بدء الحملة.',
    smartBroadcast: 'مركز البث الذكي',
    broadcastDescription: 'بث حملات البريد الإلكتروني والتنبيهات الفورية بفعالية واحترافية عالية.',
    newBroadcast: 'بث جديد',
    back: 'عودة للخلف',
    broadcastType: 'وسيلة البث',
    broadcastEmail: 'البريد الإلكتروني',
    broadcastNotification: 'تنبيه النطاق الداخلي',
    broadcastBoth: 'القنوات المدمجة (بريد وتنبيه)',
    targetGroup: 'الشريحة المستهدفة',
    allUsers: 'قاعدة المستخدمين الشاملة',
    proOnly: 'مشتركي النخبة (PRO) فقط',
    freeOnly: 'المستخدمين العاديين',
    titleEn: 'العنوان بالإنجليزية',
    titleAr: 'العنوان بالعربية',
    contentEn: 'المحتوى بالإنجليزية',
    contentAr: 'المحتوى بالعربية',
    sendNow: 'إطلاق البث الآن',
    loadingRecords: 'جاري استدعاء السجلات...',
    noBroadcasts: 'لم يتم رصد أي عمليات بث سابقة.',
    launchFirstBroadcast: 'ابدأ حملتك الأولى الآن!',
    broadcastSuccess: 'تم إنجاز البث بنجاح إلى {count} مستخدم',
    totalBroadcasts: 'إجمالي الحملات',
    totalReached: 'إجمالي الوصول',
    activeStatus: 'حالة المحرك',
    engineStatus: 'جاهزية التشغيل',
    ready: 'جاهز (READY)',
    sentCount: 'مستلم',
    lastActive: 'آخر نشاط',
    loginInLast: 'سجل الدخول في آخر',
    days: 'أيام',
    notLoginInLast: 'لم يسجل الدخول في آخر',
    any: 'أي',
    activeSubscription: 'اشتراك نشط',
    suspendedSubscription: 'حساب موقوف',
    verifiedKYC: 'حساب موثق (KYC)',
    notVerifiedKYC: 'حساب غير موثق',
    role_admin: 'مدير نظام',
    role_support: 'دعم فني',
    role_user: 'مستخدم',
    ai: 'الذكاء الاصطناعي',
    system: 'النظام',
    walletAlerts: 'تنبيهات المحفظة',
    discrepancyAnalysis: 'تحليل التناقضات',
    registryVelocityIndex: 'مؤشر سرعة السجل',
    secure: 'آمن',
    warning: 'تحذير',
    critical: 'حرج',
    withdrawal: 'طلب سحب',
    kyc: 'طلب توثيق',
    highValue: 'قيمة عالية',
    todayTx: 'حركات اليوم',
    alertLevel: 'مستوى التنبيه',
    showingLast100: 'عرض آخر 100 سجل',
    deleteAlert: 'هل أنت متأكد من حذف هذا التنبيه؟',
    justNow: 'الآن',
    minutesAgo: 'منذ {n} د',
    hoursAgo: 'منذ {n} س',
    visualIdentity: 'الهوية البصرية',
    siteSettings: 'إعدادات الموقع',
    siteName: 'اسم الموقع',
    siteDescription: 'وصف الموقع',
    logo: 'اللوغو (الشعار)',
    siteFavicon: 'أيقونة الموقع',
    seoFields: 'حقول تحسين محركات البحث',
    metaTags: 'الكلمات الدلالية',
    uploadLogo: 'رفع اللوغو',
    uploadFavicon: 'رفع الأيقونة',
    saveSystemSettings: 'حفظ الإعدادات',
    generalSettings: 'الإعدادات العامة',
    seoDescriptionAr: 'وصف محركات البحث',
    seoDescriptionEn: 'وصف محركات البحث (إنجليزية)',
    keywordsAr: 'الكلمات المفتاحية (مفصولة بفاصلة)',
    keywordsEn: 'الكلمات المفتاحية (بالإنجليزية، مفصولة بفاصلة)',
    googleAnalyticsId: 'معرف إحصاءات جوجل',
    googleAnalyticsDesc: 'مثال: G-XXXXXXXXXX',
    monthlyRevenue: 'الإيرادات الشهرية',
    activeUsersToday: 'المستخدمون النشطون (اليوم)',
    aiGenerations: 'عمليات التوليد الرقمية',
    systemHealth: 'جاهزية النظام',
    optimal: 'مثالية',
    activityCleared: 'تم تطهير السجلات بنجاح',
    alertsCleared: 'تم مسح التنبيهات الأمنية',
    selectAll: 'تحديد الكل',
    batchDeleteConfirm: 'هل أنت متأكد من حذف {count} من العناصر المحددة؟',
    batchDeleteSuccess: 'تم حذف {count} من العناصر بنجاح.',
    deleteSelected: 'حذف المحدد',
    systemMaintenance: 'صيانة النظام',
    pruneSuccess: 'تم تنظيف الإشعارات القديمة بنجاح',
    clearAllChats: 'تطهير الذاكرة السحابية (المحادثات)',
    clearAllChatsConfirm: 'تحذير: هذا سيؤدي إلى حذف كافة المحادثات والرسائل من قاعدة البيانات. هل أنت متأكد؟',
    bulkDeleteActivityConfirm: 'هل أنت متأكد من حذف كافة سجلات {type}؟ لا يمكن التراجع عن هذه الخطوة.',
    bulkDeleteAlertsConfirm: 'هل أنت متأكد من مسح كافة الإنذارات الأمنية؟ سيتم مسح تاريخ المراقبة بالكامل.',
    maintenancePruneLegacy: 'مهمة الصيانة: مسح الإشعارات القديمة',
    maintenanceClearAllNotifs: 'مهمة الصيانة: مسح كافة الإشعارات',
    clearNotifsConfirm: 'هل أنت متأكد من حذف كافة إشعارات النظام لجميع المستخدمين بشكل نهائي؟',
    cpuLoad: 'ضغط المعالج (CPU)',
    memoryAllocation: 'تخصيص الذاكرة',
    systemLoad: 'حمل النظام',
    engineHealth: 'كفاءة المحرك والبنية التحتية',
    databases: 'قواعد البيانات المتعددة',
    coreDb: 'قاعدة البيانات الأساسية',
    ledgerDb: 'قاعدة البيانات المالية',
    connected: 'نشط ومتصل',
    aiQuotas: 'حصص استهلاك الذكاء الاصطناعي',
    financialRadar: 'الرادار المالي الرقمي',
    viewAllTx: 'استعراض كافة المعاملات',
    activityStream: 'سجل الأنشطة المباشرة',
    securityAlerts: 'المراقبة والإنذارات الأمنية',
    systemUptime: 'وقت تشغيل النظام',
    stableOperationalProtocol: 'بروتوكول تشغيل مستقر',
    financialRadarSubtitle: 'بروتوكول مراقبة الاقتصاد المباشر وتدقيق السجلات',
    searchTxPlaceholder: 'بحث في الحركات...',
    walletAlertsEmpty: 'لا توجد تنبيهات حرجة للمحفظة.',
    ledgerExpectation: 'توقعات السجل',
    noDiscrepancies: 'لم يتم الكشف عن أي تناقضات مالية.',
    liveLedgerAudit: 'تدقيق السجل المباشر',
    amountPointsLabel: 'المبلغ (نقطة)',
    typeActionLabel: 'النوع / الإجراء',
    quickVelocity: 'الإحصائيات السريعة',
    allBalancesSynced: 'كافة الأرصدة متوافق مع السجل.',
    noFinancialVectors: 'لا توجد حركات مالية مطابقة للفلاتر.',
    liveTransactionRegistry: 'سجل العمليات المباشر',
    entityUser: 'المستخدم',
    protocol: 'العملية',
    vector: 'المقدار',
    timestamp: 'الوقت',
    apiVaultTitle: 'خزنة مفاتيح السيادة الرقمية',
    apiVaultDesc: 'إدارة وتشفير مفاتيح الوصول لخدمات الذكاء الاصطناعي. نعتمد بروتوكول AES-256 لضمان خصوصية مطلقة وزمن استجابة صفري في التنفيذ.',
    apiVaultProvider: 'المزود العالمي',
    apiKey: 'مفتاح الوصول (API Key)',
    apiVaultTestConnection: 'اختبار الاتصال',
    saveKey: 'تشفير وحفظ القفل',
    keyEncrypted: 'محمي بنظام التشفير العسكري',
    statusActive: 'نشط وفعال',
    statusMissing: 'مفقود',
    showKey: 'إظهار الهوية',
    hideKey: 'إخفاء الهوية',
    testing: 'جاري فحص النزاهة...',
    needsVerification: 'يتطلب تفعيل',
    currentUsage: 'مستوى الاستهلاك',
    remaining: 'المتبقي المتاح',
    used: 'المستنفذ',
    dailyBudgetPlaceholder: 'الميزانية اليومية ($)',
    budgetUpdateSuccess: 'تم تحديث سقف الميزانية بنجاح',
    budgetUpdateFailed: 'فشل في تحديث سقف الميزانية',
    connectionError: 'خطأ في بروتوكول الاتصال',
    budget: 'الميزانية التشغيلية',
    apiKeyLabel: 'الرمز السري (API)',
    primaryEngine: 'المحرك الأساسي',
    fallbackProtocol: 'بروتوكول الطوارئ',
    costPoints: 'التكلفة (نقاط)',
    utilizationRate: 'معدل الاستهلاك',
    enterKeyPlaceholder: 'أدخل رمز الوصول هنا...',
    syncModels: 'مزامنة أحدث النماذج',
    saveKeyBtn: 'اعتماد المفتاح',
    syncUsageLimits: 'مزامنة حدود الحصص',
    ollamaUrlLabel: 'رابط الاتصال السحابي (Endpoint URL)',
    ollamaCloudHint: 'ملاحظة: أدخل رابط Ollama Cloud الخاص بك هنا. يتم استخدام Localhost كخيار احتياطي فقط.',
    dbOrchestrationTitle: 'أوركسترا قواعد البيانات',
    dbOrchestrationDesc: 'إدارة التوازن والربط بين قواعد البيانات الأساسية والمالية بنظام التشفير المحلي الشامل.',
    coreDbTitle: 'قاعدة البيانات الأساسية',
    coreDbLocalTitle: 'قاعدة الأساسية (محلية)',
    ledgerDbLocalTitle: 'قاعدة المالية (محلية)',
    coreDbCloudTitle: 'قاعدة الأساسية (سحابية)',
    ledgerDbCloudTitle: 'قاعدة المالية (سحابية)',
    coreDbDesc: 'البيانات التشغيلية',
    ledgerDbDesc: 'البيانات المالية',
    dbHost: 'المضيف',
    dbPort: 'المنفذ',
    dbUsername: 'اسم المستخدم',
    dbPassword: 'كلمة المرور',
    dbName: 'اسم قاعدة البيانات',
    connectionStringPlaceholder: 'postgresql://user:pass@host:port/db',
    sslMode: 'تشفير الاتصال',
    sslRequire: 'مطلوب',
    sslDisable: 'معطل',
    poolSize: 'حجم التجمع',
    testDbConnection: 'فحص الاتصال',
    saveDbConfig: 'حفظ الإعدادات',
    migrateScratch: 'إنشاء المخطط من الصفر',
    migrateAdditive: 'تحديث المخططات (مزامنة الهيكل)',
    migrateScratchDesc: 'إجراء مسح شامل وإعادة بناء الجداول والهيكل التنظيمي من جديد (يتم حذف البيانات).',
    migrateAdditiveDesc: 'مزامنة هيكل البيانات وإضافة التعديلات البرمجية دون المساس بالبيانات الحالية.',
    statusConnected: 'متصل',
    statusDisconnected: 'غير متصل',
    cloud: 'سحابي',
    local: 'محلي',
    cloudModeHint: 'في الوضع السحابي، يتم الاعتماد كلياً على رابط الاتصال الكامل (Connection String).',
    activate: 'تفعيل (Active)',
    deactivate: 'إيقاف التفعيل',
    standby: 'Standby',
    cloudAutoScalingEnabled: 'التوسع التلقائي للسحابة مفعل',
    connectionString: 'رابط الاتصال (PRIMARY)',
    connectionUrl: 'رابط الاتصال الكامل',
    dbTestSuccess: 'تم الاتصال بنجاح!',
    dbTestFailed: 'فشل الاتصال: يرجى التحقق من البيانات.',
    dbTestError: 'خطأ تقني أثناء محاولة الاتصال.',
    dbSaveSuccess: 'تم حفظ إعدادات قاعدة البيانات بنجاح.',
    dbSaveFailed: 'فشل في حفظ الإعدادات.',
    dbSaveError: 'خطأ في النظام أثناء الحفظ.',
    dbMigrationSuccess: 'تم تحديث مخطط قاعدة البيانات بنجاح.',
    dbMigrationFailed: 'فشل تنفيذ التحديثات (Migrations).',
    dbMigrationError: 'خطأ أثناء تنفيذ التحديثات.',
    primaryDbDesc: 'قاعدة البيانات الأساسية للعمليات الحية والإنتاج.',
    shadowDbDesc: 'نسخة احتياطية متزامنة للحفاظ على البيانات في حالات الطوارئ.',
    core_shadowDbTitle: 'النسخة الاحتياطية للأساسية',
    ledger_shadowDbTitle: 'النسخة الاحتياطية للمالية',
    ledgerDbTitle: 'قاعدة البيانات المالية',
    toolOrchestratorTitle: 'توجيه الأدوات',
    toolOrchestratorDesc: 'نظام التوجيه الذكي. حدد النموذج الأساسي والنماذج الاحتياطية لكل أداة لضمان استمرارية العمل بدون توقف.',
    orchestratorProvider: 'مزود الخدمة',
    model: 'النموذج',
    fallbackSubtitle: 'المزودين الاحتياطيين (يعمل عند العطل أو استهلاك 99%)',
    fallback1: 'احتياطي 1',
    fallback2: 'احتياطي 2',
    fallback3: 'احتياطي 3',
    orchestratorSave: 'حفظ',
    costPerUsage: 'التكلفة لكل طلب',
    toolCode: 'توليد وتحليل الأكواد',
    toolCodeDesc: 'أداة كتابة ومراجعة الأكواد البرمجية',
    withdrawableBalance: 'الرصيد القابل للسحب',
    requestWithdrawal: 'طلب سحب الرصيد',
    pointsBalance: 'رصيد النقاط',
    convertPointsToBalance: 'تحويل النقاط إلى رصيد',
    howSystemWorks: 'كيف يعمل النظام؟',
    shareYourLink: 'شارك رابطك',
    shareYourLinkDesc: 'أرسل الرابط لأصدقائك أو انشره على وسائل التواصل',
    registration: 'التسجيل',
    registrationDesc: 'عندما يسجل صديقك، يحصل على {welcomeBonus} نقطة ترحيبية',
    activationAndProfit: 'التفعيل والربح',
    activationAndProfitDesc: 'بمجرد تفعيل حساب صديقك، تحصل أنت على {referralBonus} نقطة',
    inviteFriendsAndEarn: 'ادعُ الأصدقاء واربح',
    inviteFriendsDesc: 'احصل على {referralBonus} نقطة لكل صديق يسجل من خلالك. سيحصلون هم أيضاً على {welcomeBonus} نقطة!',
    yourReferralLink: 'رابط الإحالة الخاص بك',
    copy: 'نسخ',
    copied: 'تم النسخ',
    totalSuccessfulReferralsUser: 'إجمالي الإحالات الناجحة',
    transactionHistory: 'سجل العمليات',
    noTransactionsYet: 'لا توجد عمليات بعد. ابدأ بدعوة الأصدقاء لكسب النقاط!',
    transactionsWillAppearHere: 'ستظهر معاملاتك هنا بمجرد البدء في استخدام النقاط.',
    userName: 'اسم المستخدم',
    userEmail: 'البريد الإلكتروني',
    status: 'الحالة',
    date: 'التاريخ',
    withdrawalHistory: 'سجلات سحب الرصيد',
    pointsConversionHistory: 'سجل تحويل النقاط إلى رصيد',
    pendingHistory: 'قيد المعالجة',
    completed: 'مكتملة',
    failedStatus: 'فشلت',
    convertPoints: 'تحويل النقاط',
    numberOfPoints: 'عدد النقاط',
    currentBalancePoints: 'رصيدك الحالي: {points} نقطة',
    confirmConversion: 'تأكيد التحويل',
    withdrawBalance: 'سحب الرصيد',
    withdrawalAmount: 'المبلغ المراد سحبه',
    minWithdrawalAmount: 'الحد الأدنى للسحب: {min}',
    withdrawalMethod: 'طريقة السحب',
    paypalUser: 'باي بال',
    crypto: 'عملات رقمية',
    bankAccount: 'حساب بنكي',
    paymentDetails: 'بيانات الدفع',
    paypalEmailPlaceholder: 'أدخل بريد باي بال...',
    cryptoAddressPlaceholder: 'أدخل عنوان المحفظة...',
    bankDetailsPlaceholder: 'أدخل رقم الحساب...',
    sendRequest: 'إرسال الطلب',
    kycVerification: 'توثيق الهوية',
    kycThresholdNote: 'مطلوب فقط للسحوبات التي تتجاوز 100$',
    kycDescription: 'لحماية مجتمعنا ومنع الاحتيال المالي، نلتزم بأعلى معايير الأمان والامتثال للقوانين الدولية. يرجى توثيق هويتك لتتمكن من سحب أرباحك بأمان.',
    fullNameAsPerIdUser: 'الاسم الكامل (مطابق للهوية)',
    takeSelfieWithId: 'التقاط سيلفي مع الهوية',
    selfieSecurityNote: 'نطلب التقاط صورة حية (سيلفي) بدلاً من رفع ملفات لضمان أقصى درجات الأمان وحماية النظام من الملفات الضارة. التزاماً بقوانين حماية البيانات في المملكة المتحدة (UK GDPR)، نؤكد أنه لا يتم تخزين أي صور على خوادمنا؛ حيث يتم إرسالها مباشرة للإدارة ثم تُحذف فوراً من الذاكرة.',
    submitKyc: 'إرسال طلب التوثيق',
    selfieCaptured: 'تم التقاط الصورة بنجاح',
    capture: 'التقاط الصورة',
    
    userSettings: 'إعدادات الحساب',
    profile: 'الملف الشخصي',
    aiPreferences: 'تفضيلات الذكاء الاصطناعي',
    appPreferences: 'تفضيلات التطبيق',
    updateProfile: 'تحديث الملف الشخصي',
    customInstructions: 'نبذة عني',
    customInstructionsDesc: 'أخبر المساعد عنك وعن تفضيلاتك.',
    memoryLog: 'سجل الذاكرة',
    memoryLogDesc: 'هذا هو ما تعلمه المساعد عنك وعن طريقة عملك. يمكنك تعديله أو مسحه في أي وقت.',
    memoryLogPlaceholder: 'لا توجد ذاكرة مسجلة بعد...',
    memoryAutoUpdateNote: 'ملاحظة: يقوم المساعد بتحديث هذا السجل تلقائياً بناءً على محادثاتك لضمان استمرارية السياق.',
    clearMemory: 'مسح الذاكرة',
    customInstructionsPlaceholder: 'مثال: أنا مطور واجهات أمامية (React). يرجى تقديم الأكواد مباشرة بدون شروحات مطولة إلا إذا طلبت ذلك.',
    theme: 'المظهر',
    language: 'اللغة',
    lightMode: 'فاتح',
    darkMode: 'داكن',
    arabic: 'العربية',
    english: 'English',
    termsOfUse: 'شروط الاستخدام',
    privacyPolicy: 'سياسة الخصوصية',
    cookiesPolicy: 'سياسة الكوكيز',
    log_user_login: 'قام بتسجيل الدخول',
    log_user_registration: 'انضم كمستخدم جديد',
    log_notifications_prune: 'تطهير الإشعارات القديمة',
    log_wallet_reconciliation: 'معايرة المحفظة يدوياً',
    log_subscription_payment: 'تفعيل اشتراك مدفوع',
    log_user_permissions_update: 'تحديث صلاحيات الحساب',
    log_ai_generation: 'توليد ذكاء اصطناعي',
    log_used_tool: 'استخدم أداة: {tool}',
    log_notifications_prune_detail: 'تطهير يدوي للإشعارات القديمة',
    log_login_detail: 'دخول ناجح للنظام',
    log_registration_detail: 'تسجيل عضوية جديدة',
    clearAILogs: 'مسح سجل الـ AI',
    clearSystemLogs: 'مسح سجل النظام',
    clearAll: 'مسح الكل',
    noSecurityAlerts: 'لا توجد تنبيهات أمنية حالياً.',
    noActivityLogged: 'لا يوجد نشاط مسجل حالياً.',
    systemUser: 'النظام',
    alert_usage_anomaly: 'خرق أمني: نشاط غير طبيعي',
    alert_quota_bypass: 'خرق أمني: تجاوز القيود',
    alert_ledger_discrepancy: 'تنبيه مالي: خطأ في السجل',
    alert_unauthorized_access: 'دخول غير مصرح به',
    alert_failed_login: 'فشل تسجيل دخول متكرر',
    toastKeySaveSuccess: 'تم حفظ المفتاح بنجاح!',
    toastKeySaveError: 'خطأ في حفظ المفتاح: {error}',
    toastKeyDeleteSuccess: 'تم حذف المفتاح بنجاح',
    toastKeyDeleteError: 'فشل في حذف المفتاح',
    keyDeleteConfirm: 'هل أنت متأكد من حذف مفتاح {provider}؟ سيؤدي هذا إلى إيقاف الأدوات المرتبطة به.',
    toastDbTestSuccess: 'تم الاتصال بقاعدة البيانات بنجاح!',
    toastDbTestFailed: 'فشل الاتصال بقاعدة البيانات: {error}',
    toastDbSaveSuccess: 'تم حفظ إعدادات القاعدة بنجاح',
    toastPlanSaveSuccess: 'تم حفظ الخطة بنجاح',
    toastEconomySaveSuccess: 'تم حفظ إعدادات الاقتصاد بنجاح',
    toastStripeSaveSuccess: 'تم حفظ إعدادات Stripe بنجاح',
    toastAllFieldsRequired: 'جميع حقول الترجمة مطلوبة (الأسماء والأوصاف)',
    toastPricingRequired: 'حقول التسعير مطلوبة',
    toastFeatureRequired: 'مطلوب ميزة واحدة على الأقل',
    toastFeatureTranslationRequired: 'يجب أن تحتوي جميع الميزات على نص باللغتين الإنجليزية والعربية',
    deletePlanConfirm: 'هل أنت متأكد من حذف هذه الخطة؟',
    toastPlanDeleteSuccess: 'تم حذف الخطة بنجاح',
    toastPlanDeleteError: 'فشل في حذف الخطة',
    loadingCommandCenter: 'جاري جلب بيانات مركز القيادة...',
    resourceUtilization: 'استهلاك الموارد',
    serverMonitoringActive: 'يتم مراقبة الخادم بشكل لحظي.',
    deleteLogConfirm: 'هل أنت متأكد من حذف هذا السجل؟',
    deleteAlertConfirm: 'هل أنت متأكد من حذف هذا التنبيه؟',
    reconcileConfirm: 'بدء عملية مطابقة المحفظة؟ سيتم إعادة معايرة رصيد المستخدم بناءً على المعاملات المسجلة فقط.',
    reconcileSuccess: 'تمت المطابقة بنجاح. تم تحديث الرصيد.',
    syncSuccess: 'تمت المزامنة بنجاح',
    syncError: 'فشل المزامنة',
    syncingData: 'جاري مزامنة البيانات...',
    syncModelsFound: 'تم العثور على {count} نموذج للمزود {provider}',
    syncUsageStats: 'الاستهلاك: ${used} من ميزانية ${total}',
    saveData: 'حفظ البيانات',
    lastSync: 'آخر مزامنة',
    remember_me: 'تذكرني',
    mood_epic: 'ملحمي',
    mood_dramatic: 'درامي',
    mood_corporate: 'مؤسسي',
    mood_chill: 'هادئ',
    mood_energetic: 'حماسي',
    mood_romantic: 'رومانسي',
    vocal_none: 'بدون',
    vocal_male: 'ذكر',
    vocal_female: 'أنثى',
    vocal_robot: 'روبوت',
    vocal_professional: 'احترافي',
    mood: 'الحالة',
    vocalType: 'نوع الصوت',
    audioDuration: 'المدة',
  },
  en: {
    rewards: 'Rewards',
    subscription: 'Subscriptions',
    consumption: 'Consumption',
    dashboard: 'Dashboard',
    newChat: 'New Chat',
    settings: 'Settings',
    install_app: 'Install App',
    installing: 'Installing...',
    howCanIHelp: 'What would you like to do?',
    askAssistant: 'Ask Perplexta',
    fast: 'Fast',
    pro: 'Pro',
    thinking: 'Think',
    uploadImage: 'Upload Image',
    uploadDocument: 'Upload Document',
    chat: 'Chat',
    chat_fast: 'Fast',
    chat_pro: 'Pro',
    chat_reasoning: 'Think',
    sovereign_search: 'Intelligence Search',
    perplexta_analysis: 'Perplexta Analysis',
    perplexta_analysis_desc: 'Technical Search & Deep Digital Analysis',
    legal_analysis: 'Legal Assistant',
    legal_analysis_desc: 'Professional analysis of legal documents, regulations, and legislative inquiries with high precision.',
    notebook: 'Ads Assistant',
    image: 'Image Generation',
    video: 'Video Generation',
    stt: 'Speech to Text',
    tts: 'Text to Speech',
    learning: 'Adaptive Learning',
    code: 'Code Generation',
    canvas: 'Smart Audio Studio',
    storage_mb: 'Storage Space (MB)',
    sovereign_memory: 'Core Memory',
    newBadge: 'NEW',
    commandCenter: 'Command Center',
    aiInfrastructure: 'API Keys Vault',
    dbOrchestration: 'Database Orchestration',
    financeVault: 'Finance Ledger',
    financeVaultDesc: 'Manage economic settings, payment gateways, and withdrawals.',
    economySettings: 'Economy Settings',
    saveSettings: 'Save Settings',
    minWithdrawal: 'Min Withdrawal (Cents)',
    minWithdrawalDesc: 'Minimum amount a user can request for withdrawal.',
    referralBonus: 'Referral Bonus (Points)',
    referralBonusDesc: 'Points awarded to the referrer.',
    welcomeBonus: 'Welcome Bonus (Points)',
    welcomeBonusDesc: 'Points awarded to new users.',
    conversionRate: 'Conversion Rate',
    conversionRateDesc: 'Value of one point in USD.',
    pointsPerDollar: 'Points per Dollar',
    pointsPerDollarDesc: 'Points awarded per dollar spent.',
    points: 'Points',
    point: 'Point',
    cents: 'Cents',
    stripeConfig: 'Stripe Configuration',
    stripeDesc: 'Manage Stripe API keys for subscriptions and payments.',
    testMode: 'Test Mode',
    liveMode: 'Live Mode',
    publishableKey: 'Publishable Key',
    secretKey: 'Secret Key',
    webhookSecret: 'Webhook Secret',
    saveStripeConfig: 'Save Stripe Config',
    amount: 'Amount',
    paymentMethod: 'Payment Method',
    requestDate: 'Request Date',
    actions: 'Actions',
    verified: 'Verified',
    paypal: 'PayPal',
    approve: 'Approve',
    reject: 'Reject',
    requireKyc: 'Require KYC',
    kycStatus: 'KYC Status',
    accountStatus: 'Account Status',
    identityVerification: 'Identity Verification',
    required: 'Required',
    notRequired: 'Not Required',
    kycSelfieReview: 'KYC Selfie Review',
    pendingReview: 'Pending Review',
    fullNameOnID: 'Full Name on ID:',
    identitySection: 'Identity Section',
    kycPending: 'Under Review',
    kycVerified: 'Verified Successfully',
    kycRejected: 'Rejected',
    kycRejectionReason: 'Rejection Reason',
    kycNone: 'None',
    kycStatusLabel: 'Account Verification Status',
    accountSettings: 'Account Settings',
    saveSuccess: 'Saved successfully',
    saveFailed: 'Failed to save',
    wallet: 'Wallet',
    memoryCenter: 'Memory Center',
    all: 'All',
    personal: 'Personal',
    technical: 'Technical',
    preference: 'Preference',
    project: 'Project',
    general: 'General',
    addFact: 'Add Fact',
    memoryCapacity: 'Memory Capacity',
    prune: 'Prune',
    loadingMemory: 'Loading memory...',
    noResults: 'No Results',
    memoryLimitReached: 'You have reached the memory limit (50). Please delete some old facts first.',
    shortcuts: 'Shortcuts',
    plansSubscriptions: 'Plans & Subscriptions',
    userManagement: 'User Management',
    systemSettings: 'System Settings',
    smartEmailHub: 'Smart Email Hub',
    toolOrchestrator: 'Tool Orchestrator',
    paymentGateways: 'Payment Gateways',
    withdrawals: 'Withdrawals',
    kycRequests: 'KYC Requests',
    ledger: 'Ledger',
    role_admin: 'Admin',
    role_support: 'Support',
    role_user: 'User',
    ai: 'AI',
    system: 'System',
    walletAlerts: 'Wallet Alerts',
    discrepancyAnalysis: 'Discrepancy Analysis',
    registryVelocityIndex: 'REGISTRY VELOCITY INDEX',
    secure: 'SECURE',
    warning: 'WARNING',
    critical: 'CRITICAL',
    withdrawal: 'Withdrawal',
    kyc: 'KYC',
    highValue: 'High Value',
    todayTx: 'Today\'s Tx',
    alertLevel: 'Alert Level',
    showingLast100: 'showing last 100 entries',
    deleteAlert: 'Are you sure you want to delete this alert?',
    justNow: 'Just now',
    minutesAgo: 'm ago {n}',
    hoursAgo: 'h ago {n}',
    navVisualIdentity: 'Visual Identity',
    modelProviders: 'Model Providers',
    users: 'Users',
    plans: 'Plans & Usage',
    add: 'Add',
    edit: 'Edit',
    delete: 'Delete',
    appName: '',
    home: 'Home',
    save: 'Save',
    avatar: 'Avatar',
    uploadFile: 'Upload File',
    videoDuration: 'Duration',
    cinematic: 'Cinematic',
    realistic: 'Realistic',
    anime: 'Anime',
    'digital art': 'Digital Art',
    standard: 'Standard',
    hd: 'HD',
    ultra: 'Ultra',
    login: 'Login',
    signup: 'Sign Up',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    processing: 'Processing',
    continueWithGoogle: 'Continue with Google',
    noAccount: 'Don\'t have an account?',
    haveAccount: 'Already have an account?',
    createAccount: 'Create new account',
    welcome: 'Welcome back!',
    logout: 'Logout',
    forgotPasswordTitle: 'Forgot Password',
    forgotPasswordDesc: 'Enter your email to reset your password',
    forgotPassword: 'Forgot Password?',
    sendResetLink: 'Send Reset Link',
    rememberedPassword: 'Remembered your password?',
    financialRadar: 'Financial Radar',
    analyzingResources: 'Analyzing Resources...',
    usageToday: 'Daily usage',
    usageMonthly: 'Monthly usage',
    resourceId: 'ID',
    renewal: 'Renewal',
    quotaInfoTitle: 'Professional Quota Management',
    quotaInfoDesc: 'Daily counters reset every 24 hours, while monthly counters reset at the beginning of each calendar month. If free quota is exceeded, the system automatically draws from your wallet balance to ensure service continuity.',
    addNewPlan: 'New Plan',
    planNameEn: 'Plan Name (English)',
    planNameAr: 'Plan Name (Arabic)',
    planDescEn: 'Plan Description (English)',
    planDescAr: 'Plan Description (Arabic)',
    planFeaturesEn: 'Features (English)',
    planFeaturesAr: 'Features (Arabic)',
    addFeature: 'Add Feature',
    badge: 'Badge',
    discountPercentage: 'Discount %',
    visible: 'Visible',
    limits: 'Limits',
    images: 'Images',
    connectors: 'Connectors',
    workspace: 'Smart Audio Studio',
    search: 'Search',
    art: 'Art',
    daily: 'Daily',
    monthly: 'Monthly',
    annual: 'Annual',
    saveNewPlan: 'Save New Plan',
    none: 'None',
    bestSeller: 'Best Seller',
    popular: 'Popular',
    unlimited: 'unlimited',
    payWithBalance: 'Pay with Balance',
    payWithPoints: 'Pay with Points',
    upgrade: 'Upgrade',
    confirmSubscription: 'Confirm Subscription',
    confirmSubscriptionDesc: 'You are about to subscribe to the {plan} plan using your current balance.',
    currentBalance: 'Current Balance',
    planPrice: 'Plan Price',
    remainingBalance: 'Remaining Balance',
    confirmAndActivate: 'Confirm & Activate',
    cancel: 'Cancel',
    insufficientBalance: 'Insufficient balance to complete this transaction.',
    subscriptionSuccess: 'Subscription Successful!',
    quotaMilestoneTitle: 'Consumption {percentage}%',
    quotaMilestone50: "You've used half of your limit for this tool!",
    quotaMilestone90: 'Warning: You are almost at your full limit!',
    quotaMilestone100: 'Limit Reached! Subsidized with balance.',
    quotaMilestoneIncentive: 'Invite your friends to earn extra points and keep going without interruption.',
    rewardFriends: 'Earn with Friends',
    subscriptionSuccessDesc: 'Your plan has been activated successfully! Earn more points by inviting your friends.',
    insufficientBalanceTitle: 'Insufficient Balance',
    insufficientBalanceDesc: 'You don\'t have enough balance to subscribe. Invite friends to earn points and continue using our services.',
    shareWithFriends: 'Share with Friends',
    close: 'Close',
    planForCreators: 'For Creators',
    planForPros: 'For Advanced Users',
    planForBusiness: 'For Businesses',
    planColor: 'Plan Color',

    searchUsers: 'Search users (name, email)...',
    active: 'Active',
    suspended: 'Suspended',
    sendEmail: 'Send Email',
    viewProfile: 'View Profile',
    userProfile: 'User Profile',
    plan: 'Plan',
    changePlan: 'Change Plan',
    adjustBalance: 'Adjust Balance',
    accountActions: 'Account Actions',
    suspendAccount: 'Suspend Account',
    activateAccount: 'Activate Account',
    joinedAt: 'Joined At',
    lastLogin: 'Last Login',
    usageStats: 'Usage Stats',
    quickActions: 'Quick Actions',
    emailSubject: 'Email Subject',
    emailBody: 'Email Body',
    send: 'Send',
    saveChanges: 'Save Changes',

    emailSettings: 'Email Settings',
    emailTemplates: 'Email Templates',
    broadcast: 'Broadcast',
    smtpSettings: 'Provider Settings (SMTP/API)',
    smtpHost: 'Host',
    smtpPort: 'Port',
    smtpUsername: 'Username',
    smtpPassword: 'Password',
    senderName: 'Sender Name',
    senderEmail: 'Sender Email',
    smtpTestConnection: 'Test Connection',
    createNewTemplate: 'Create New Template',
    templateName: 'Template Name',
    variables: 'Available Variables',
    editTemplate: 'Edit Template',
    systemTemplates: 'System Templates',
    customTemplates: 'Custom Templates',
    welcomeEmail: 'Welcome Email',
    resetPasswordEmail: 'Reset Password',
    subscriptionSuccessEmail: 'Subscription Success',
    sendTestEmail: 'Send Test Email',
    mailerType: 'Mailer Type',
    phpMail: 'PHP Mail',
    smtp: 'SMTP Server',
    encryption: 'Encryption',
    noneEncryption: 'None',
    ssl: 'SSL',
    tls: 'TLS',
    smtpDesc: 'Configure your email provider (SendGrid, AWS SES, Resend, etc.)',
    securityProtocol: 'Security Protocol',
    securityProtocolDesc: 'Email credentials are encrypted using AES-256 before being stored in the secure configuration file. They are never exposed to the frontend or stored in plaintext in the database.',
    spamWarning: 'Ensure your provider allows sending from the specified "Sender Email" address to avoid emails landing in spam folders.',
    clickToCopy: 'Click to copy and paste into your template.',
    broadcastTitle: 'Broadcast Campaigns',
    broadcastDesc: 'Send mass emails to specific user segments, announce new features, or run promotional campaigns directly from the hub.',
    createCampaign: 'Create Campaign',
    campaignName: 'Campaign Name',
    selectTemplate: 'Select Template',
    targetAudience: 'Target Audience',
    byPlan: 'By Plan',
    byActivity: 'By Activity',
    activeUsers: 'Active Users',
    inactiveUsers: 'Inactive Users',
    sendCampaign: 'Send Campaign',
    campaignHistory: 'Campaign History',
    broadcastHistory: 'Broadcast History',
    sent: 'Sent',
    pendingBroadcast: 'Pending Broadcast',
    failedBroadcast: 'Failed Broadcast',
    recipients: 'Recipients',
    totalSent: 'Total Sent',
    successRate: 'Success Rate',
    noCampaigns: 'No campaigns sent yet.',
    confirmSendCampaign: 'Are you sure you want to send this campaign now? This might take some time depending on the recipient count.',
    campaignStartSuccess: 'Campaign started successfully, you can track progress in the history.',
    campaignStartError: 'Error starting the campaign.',
    smartBroadcast: 'Smart Broadcast',
    broadcastDescription: 'Send mass emails and instant notifications to your elite audience.',
    newBroadcast: 'New Broadcast',
    back: 'Back',
    broadcastType: 'Broadcast Type',
    broadcastEmail: 'Email',
    broadcastNotification: 'In-App notification',
    broadcastBoth: 'Both (Email & App)',
    targetGroup: 'Target Group',
    allUsers: 'All Users',
    proOnly: 'PRO Users Only',
    freeOnly: 'Free Users Only',
    titleEn: 'Title (English)',
    titleAr: 'Title (Arabic)',
    contentEn: 'Content (English)',
    contentAr: 'Content (Arabic)',
    sendNow: 'Send Now',
    loadingRecords: 'Loading records...',
    noBroadcasts: 'No previous broadcasts found.',
    launchFirstBroadcast: 'Launch your first broadcast now!',
    broadcastSuccess: 'Broadcast sent successfully to {count} users',
    totalBroadcasts: 'Total Campaigns',
    totalReached: 'Total Reached',
    activeStatus: 'Engine Status',
    engineStatus: 'Operational Readiness',
    ready: 'READY',
    sentCount: 'sent',
    lastActive: 'Last Active',
    loginInLast: 'Logged in last',
    days: 'days',
    notLoginInLast: 'Not logged in last',
    any: 'Any',
    activeSubscription: 'Active Subscription',
    suspendedSubscription: 'Suspended Account',
    verifiedKYC: 'Verified Account (KYC)',
    notVerifiedKYC: 'Not Verified Account',

    visualIdentity: 'Visual Identity',
    siteSettings: 'Site Settings',
    siteName: 'Site Name',
    siteDescription: 'Site Description',
    logo: 'Logo',
    favicon: 'Favicon',
    seoFields: 'SEO Fields',
    metaTags: 'Meta Tags',
    uploadLogo: 'Upload Logo',
    uploadFavicon: 'Upload Favicon',
    saveSystemSettings: 'Save Settings',
    generalSettings: 'General Settings',
    seoDescriptionEn: 'SEO Description',
    seoDescriptionAr: 'SEO Description (Arabic)',
    keywordsEn: 'Keywords (comma-separated)',
    keywordsAr: 'Keywords (Arabic, comma-separated)',
    googleAnalyticsId: 'Google Analytics ID',
    googleAnalyticsDesc: 'Example: G-XXXXXXXXXX',

    monthlyRevenue: 'Monthly Revenue',
    activeUsersToday: 'Active Users (Today)',
    aiGenerations: 'AI Generations',
    systemHealth: 'System Health',
    optimal: 'Optimal',
    databases: 'Databases',
    coreDb: 'Core DB (Operational)',
    ledgerDb: 'Ledger DB (Vault)',
    connected: 'Connected',
    aiQuotas: 'AI Provider Quotas',
    viewAllTx: 'View All Transactions',
    activityStream: 'Real-time Activity Stream',
    securityAlerts: 'Security & Limit Violations',
    systemUptime: 'System Uptime',
    stableOperationalProtocol: 'Stable Operational Protocol',
    financialRadarSubtitle: 'Live Economic Surveillance & Ledger Audit Protocol',
    searchTxPlaceholder: 'Search transactions...',
    walletAlertsEmpty: 'No critical wallet alerts.',
    ledgerExpectation: 'Ledger Expectation',
    noDiscrepancies: 'No financial discrepancies detected.',
    liveLedgerAudit: 'Live Ledger Audit',
    amountPointsLabel: 'Amount (Points)',
    typeActionLabel: 'Type / Action',
    maintenancePruneLegacy: 'Maintenance: Prune Legacy Notifs',
    quickVelocity: 'Quick Velocity',
    allBalancesSynced: 'All balances synchronized with ledger.',
    noFinancialVectors: 'No financial vectors matching current filters.',
    liveTransactionRegistry: 'Live Transaction Registry',
    entityUser: 'Entity / User',
    protocol: 'Protocol',
    vector: 'Vector',
    timestamp: 'Timestamp',
    apiVaultTitle: 'AI API Keys Vault',
    apiVaultDesc: 'Manage your AI provider API keys. All keys are AES-256 encrypted at rest and loaded in-memory for zero-latency execution.',
    apiVaultProvider: 'Provider',
    apiKey: 'API Key',
    apiVaultTestConnection: 'Test Connection',
    saveKey: 'Save & Encrypt',
    keyEncrypted: 'Encrypted & Secure',
    statusActive: 'Active',
    statusMissing: 'Missing',
    showKey: 'Show Key',
    hideKey: 'Hide Key',
    testing: 'Testing...',
    needsVerification: 'Needs Verification',
    currentUsage: 'Current Usage',
    remaining: 'Remaining',
    used: 'Used',
    dailyBudgetPlaceholder: 'Daily Budget ($)',
    budgetUpdateSuccess: 'Budget updated successfully',
    budgetUpdateFailed: 'Failed to update budget',
    connectionError: 'Connection error',
    budget: 'Budget',
    apiKeyLabel: 'API Key',
    primaryEngine: 'Primary Engine',
    fallbackProtocol: 'Fallback Protocol',
    costPoints: 'Cost (Points)',
    enterKeyPlaceholder: 'Enter key here...',
    syncModels: 'Sync Models',
    saveKeyBtn: 'Save Key',
    syncUsageLimits: 'Sync Usage Limits',
    ollamaUrlLabel: 'Ollama Cloud Hub Endpoint',
    ollamaCloudHint: 'Note: Enter your full Ollama Cloud instance URL here. Localhost is used as fallback only.',
    dbOrchestrationTitle: 'Database Orchestration',
    dbOrchestrationDesc: 'Manage core and ledger database connections. Credentials are encrypted locally for maximum security and separation of concerns.',
    coreDbTitle: 'Core Database',
    coreDbLocalTitle: 'Core DB (Local) - PostgreSQL',
    ledgerDbLocalTitle: 'Ledger DB (Local) - PostgreSQL',
    coreDbCloudTitle: 'Core DB (Cloud) - PostgreSQL',
    ledgerDbCloudTitle: 'Ledger DB (Cloud) - PostgreSQL',
    coreDbDesc: 'Operational Data (Users, Chats, Logs)',
    ledgerDbDesc: 'Financial Data (Wallets, Transactions, Balances)',
    dbHost: 'Host',
    dbPort: 'Port',
    dbUsername: 'Username',
    dbPassword: 'Password',
    dbName: 'Database Name',
    connectionStringPlaceholder: 'postgresql://user:pass@host:port/db',
    sslMode: 'SSL Mode',
    sslRequire: 'Require',
    sslDisable: 'Disable',
    poolSize: 'Pool Size',
    testDbConnection: 'Test Connection',
    saveDbConfig: 'Save Settings',
    migrateScratch: 'Wipe & Rebuild (From Scratch)',
    migrateAdditive: 'Sync Schema (Additive)',
    migrateScratchDesc: 'Total purge and reconstruction of all tables/schemas.',
    migrateAdditiveDesc: 'Sync structure and apply patches without data loss.',
    statusConnected: 'Connected',
    statusDisconnected: 'Disconnected',
    cloud: 'Cloud',
    local: 'Local',
    cloudModeHint: 'In Cloud Mode, the system relies exclusively on the full Connection String (URI).',
    activate: 'Activate (Active)',
    deactivate: 'Deactivate',
    standby: 'Standby',
    cloudAutoScalingEnabled: 'Auto-scaling enabled for Cloud',
    connectionString: 'Connection String (PRIMARY)',
    connectionUrl: 'Full Connection URL',
    dbTestSuccess: 'Connection successful!',
    dbTestFailed: 'Connection failed: please check credentials.',
    dbTestError: 'Technical error during connection attempt.',
    dbSaveSuccess: 'Database configuration saved successfully.',
    dbSaveFailed: 'Failed to save configuration.',
    dbSaveError: 'System error during save.',
    dbMigrationSuccess: 'Database schema updated successfully.',
    dbMigrationFailed: 'Failed to run migrations.',
    dbMigrationError: 'Error during migrations execution.',
    primaryDbDesc: 'Primary database for live production operations.',
    shadowDbDesc: 'Synchronized shadow copy for emergency data persistence.',
    core_shadowDbTitle: 'Core Shadow (Backup)',
    ledger_shadowDbTitle: 'Ledger Shadow (Backup)',
    ledgerDbTitle: 'Ledger Database (Financial)',
    toolOrchestratorTitle: 'Tool Routing (The Silent Router)',
    toolOrchestratorDesc: 'Smart Routing System. Define primary and fallback models for each tool to ensure zero downtime.',
    orchestratorProvider: 'Provider',
    model: 'Model',
    fallbackSubtitle: 'Fallback Providers (Activates on failure or 99% usage)',
    fallback1: 'Fallback 1',
    fallback2: 'Fallback 2',
    fallback3: 'Fallback 3',
    orchestratorSave: 'Save',
    tools: 'Tools',
    costPerUsage: 'Cost Per Usage',
    toolCode: 'Code Generation & Analysis',
    toolCodeDesc: 'Tool for writing and reviewing code',
    withdrawableBalance: 'Withdrawable Balance',
    requestWithdrawal: 'Request Withdrawal',
    pointsBalance: 'Points Balance',
    convertPointsToBalance: 'Convert Points to Balance',
    howSystemWorks: 'How the system works?',
    shareYourLink: 'Share your link',
    shareYourLinkDesc: 'Send the link to your friends or post it on social media',
    registration: 'Registration',
    registrationDesc: 'When your friend registers, they get {welcomeBonus} welcome points',
    activationAndProfit: 'Activation and Profit',
    activationAndProfitDesc: 'Once your friend activates their account, you get {referralBonus} points',
    inviteFriendsAndEarn: 'Invite Friends and Earn',
    inviteFriendsDesc: 'Get {referralBonus} points for every friend who registers through you. They will also get {welcomeBonus} points!',
    yourReferralLink: 'Your Referral Link',
    copy: 'Copy',
    copied: 'Copied',
    totalSuccessfulReferralsUser: 'Total Successful Referrals',
    transactionHistory: 'Transaction History',
    noTransactionsYet: 'No transactions yet. Start inviting friends to earn points!',
    transactionsWillAppearHere: 'Your transactions will appear here once you start using points.',
    userName: 'User Name',
    userEmail: 'Email',
    status: 'Status',
    date: 'Date',
    withdrawalHistory: 'Withdrawal History',
    pointsConversionHistory: 'Points Conversion History',
    pendingBroadcastHistory: 'Pending (History)',
    completed: 'Completed',
    failedOrBlocked: 'Failed',
    convertPoints: 'Convert Points',
    numberOfPoints: 'Number of Points',
    currentBalancePoints: 'Current Balance: {points} points',
    confirmConversion: 'Confirm Conversion',
    withdrawBalance: 'Withdraw Balance',
    withdrawalAmount: 'Withdrawal Amount',
    minWithdrawalAmount: 'Minimum withdrawal: {min}',
    withdrawalMethod: 'Withdrawal Method',
    paypalUser: 'PayPal',
    crypto: 'Crypto (USDT)',
    bankAccount: 'Bank Account',
    paymentDetails: 'Payment Details',
    paypalEmailPlaceholder: 'Enter PayPal email...',
    cryptoAddressPlaceholder: 'Enter wallet address (USDT TRC20)...',
    bankDetailsPlaceholder: 'Enter IBAN...',
    sendRequest: 'Send Request',
    kycVerification: 'Identity Verification (KYC)',
    kycThresholdNote: 'Only required for withdrawals over $100',
    kycDescription: 'To protect our community and prevent financial fraud, we adhere to the highest security and compliance standards. Please verify your identity to safely withdraw your earnings.',
    fullNameAsPerIdUser: 'Full Name (As per ID or Passport)',
    takeSelfieWithId: 'Take Selfie with ID',
    selfieSecurityNote: 'We require a live selfie instead of file uploads to ensure maximum security and protect the system from malicious files. In compliance with UK Data Protection laws (UK GDPR & Data Protection Act 2018), we confirm that no images are stored on our servers. Images are transmitted directly to the administrator for verification and are immediately discarded from memory.',
    submitKyc: 'Submit Verification Request',
    selfieCaptured: 'Selfie Captured Successfully',
    capture: 'Capture Image',
    
    userSettings: 'Account Settings',
    profile: 'Profile',
    aiPreferences: 'AI Preferences',
    appPreferences: 'App Preferences',
    updateProfile: 'Update Profile',
    customInstructions: 'Custom Instructions',
    customInstructionsDesc: 'Tell the assistant about yourself and your preferences (e.g., "I am a developer, give me code directly without long explanations").',
    memoryLog: 'Memory Log',
    memoryLogDesc: 'This is what the assistant has learned about you and your working style. You can edit or clear it at any time.',
    memoryLogPlaceholder: 'No memory recorded yet...',
    memoryAutoUpdateNote: 'Note: The assistant updates this log automatically based on your conversations to ensure context continuity.',
    clearMemory: 'Clear Memory',
    customInstructionsPlaceholder: 'e.g., I am a senior React developer. Please provide code snippets without explanations unless I ask for them.',
    theme: 'Theme',
    language: 'Language',
    lightMode: 'Light',
    darkMode: 'Dark',
    arabic: 'العربية',
    english: 'English',
    termsOfUse: 'Terms of Use',
    privacyPolicy: 'Privacy Policy',
    cookiesPolicy: 'Cookies Policy',

    consumptionRadar: 'Consumption Radar',
    realTimeSync: 'Live Resource Synchronization',
    liveNow: 'LIVE NOW',
    currentPlan: 'CURRENT PLAN',
    subscriptionCycle: 'SUBSCRIPTION CYCLE',
    daysRemaining: '{days} days remaining',
    limitless: 'LIMITLESS',
    of: 'OF',
    usageLoad: 'USAGE LOAD',
    noActiveRadar: 'No Active Radar',
    noActiveRadarDesc: 'Subscribe to one of our plans to activate the consumption radar and live sync.',
    resourceResetProtocol: 'RESOURCE RESET PROTOCOL',
    resourceResetDesc: 'Consumption counters are recalibrated daily at 00:00 UTC to maintain resource integrity.',
    log_user_login: 'Logged into the system',
    log_user_registration: 'Joined as a new user',
    log_notifications_prune: 'Oracle PRUNE (Notifications)',
    log_wallet_reconciliation: 'Manual wallet reconciliation',
    log_subscription_payment: 'Activated paid subscription',
    log_user_permissions_update: 'Updated user permissions',
    log_ai_generation: 'AI Generation',
    log_used_tool: 'Used tool: {tool}',
    log_notifications_prune_detail: 'Manual prune of legacy notifications',
    log_login_detail: 'Successful system login',
    log_registration_detail: 'New membership registration',
    clearAILogs: 'Clear AI Logs',
    clearSystemLogs: 'Clear System Logs',
    clearAll: 'Clear All',
    noSecurityAlerts: 'No security alerts currently.',
    noActivityLogged: 'No activity logged currently.',
    systemUser: 'System',
    alert_usage_anomaly: 'Security Breach: Usage Anomaly',
    alert_quota_bypass: 'Security Breach: Quota Bypass',
    alert_ledger_discrepancy: 'Finance Alert: Ledger Mismatch',
    alert_unauthorized_access: 'Unauthorized Access Attempt',
    alert_failed_login: 'Multiple Failed Logins',
    toastKeySaveSuccess: 'Key saved successfully!',
    toastKeySaveError: 'Error saving key: {error}',
    toastKeyDeleteSuccess: 'Key deleted successfully',
    toastKeyDeleteError: 'Failed to delete key',
    keyDeleteConfirm: 'Are you sure you want to delete the {provider} key? This will stop the associated tools.',
    toastDbTestSuccess: 'Database connection successful!',
    toastDbTestFailed: 'Database connection failed: {error}',
    toastDbSaveSuccess: 'Database configuration saved',
    toastPlanSaveSuccess: 'Plan saved successfully',
    toastEconomySaveSuccess: 'Economy settings saved successfully',
    toastStripeSaveSuccess: 'Stripe configuration saved successfully',
    toastAllFieldsRequired: 'All translation fields (Names & Descriptions) are required',
    toastPricingRequired: 'Pricing fields are required',
    toastFeatureRequired: 'At least one feature is required',
    toastFeatureTranslationRequired: 'All features must have both English and Arabic text',
    deletePlanConfirm: 'Are you sure you want to delete this plan?',
    toastPlanDeleteSuccess: 'Plan deleted successfully',
    toastPlanDeleteError: 'Failed to delete plan',
    loadingCommandCenter: 'Fetching command center data...',
    resourceUtilization: 'Resource Utilization',
    serverMonitoringActive: 'Real-time server monitoring active.',
    deleteLogConfirm: 'Are you sure you want to delete this log?',
    deleteAlertConfirm: 'Delete this security alert?',
    reconcileConfirm: 'Start wallet reconciliation? This will recalibrate user balance based strictly on ledger transactions.',
    reconcileSuccess: 'Reconciliation successful. Balance updated.',
    activityCleared: 'Activity logs cleared successfully',
    alertsCleared: 'Security alerts cleared',
    selectAll: 'Select All',
    batchDeleteConfirm: 'Are you sure you want to delete {count} selected items?',
    batchDeleteSuccess: 'Successfully deleted {count} items.',
    deleteSelected: 'Delete Selected',
    systemMaintenance: 'System Maintenance',
    pruneSuccess: 'System notifications pruned successfully',
    bulkDeleteActivityConfirm: 'Are you sure you want to clear ALL {type} logs? This cannot be undone.',
    bulkDeleteAlertsConfirm: 'Are you sure you want to clear ALL security alerts? This will wipe the monitoring history.',
    maintenanceClearAllNotifs: 'Maintenance: Wipe All Notifications',
    clearNotifsConfirm: 'Are you sure you want to permanently delete ALL system notifications for all users?',
    clearAllChats: 'Purge Cloud Memory (All Chats)',
    clearAllChatsConfirm: 'WARNING: This will delete ALL chat history and messages from the database. Are you sure?',
    syncSuccess: 'Synchronization Successful',
    syncError: 'Synchronization Failed',
    syncingData: 'Syncing data...',
    syncModelsFound: 'Found {count} models for {provider}',
    syncUsageStats: 'Usage: ${used} of ${total} budget',
    saveData: 'Save Data',
    lastSync: 'Last Sync',
    remember_me: 'Remember me',
    cpuLoad: 'CPU Load',
    memoryAllocation: 'Memory Allocation',
    systemLoad: 'System Load',
    mood_epic: 'Epic',
    mood_dramatic: 'Dramatic',
    mood_corporate: 'Corporate',
    mood_chill: 'Chill',
    mood_energetic: 'Energetic',
    mood_romantic: 'Romantic',
    vocal_none: 'None',
    vocal_male: 'Male',
    vocal_female: 'Female',
    vocal_robot: 'Robot',
    vocal_professional: 'Professional',
    mood: 'Mood',
    vocalType: 'Vocal Type',
    audioDuration: 'Duration',
  }
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    try { return (localStorage.getItem('language') as Language) || 'ar'; } catch (e) { return 'ar'; }
  });
  const [theme, setTheme] = useState<Theme>(() => {
    try { return (localStorage.getItem('theme') as Theme) || 'dark'; } catch (e) { return 'dark'; }
  });
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    try {
      // Sovereign: Comprehensive token discovery (Search URL, Hash Fragment, and LocalStorage)
      const getParam = (name: string) => {
        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.get(name)) return searchParams.get(name);
        const hash = window.location.hash;
        if (hash.includes('?')) {
          const hashQueryParams = new URLSearchParams(hash.split('?')[1]);
          return hashQueryParams.get(name);
        }
        return null;
      };

      const fromUrl = getParam('token');
      if (fromUrl) {
        localStorage.setItem('app_token', fromUrl);
        return fromUrl;
      }
      const rawToken = localStorage.getItem('app_token');
      if (rawToken === 'null' || rawToken === 'undefined') return null;
      return rawToken;
    } catch (e) {
      console.warn('Failed to parse token from URL or storage', e);
      return null;
    }
  });
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [balance, setBalance] = useState<number>(0);
  const [balanceUSD, setBalanceUSD] = useState<number>(0);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isOperationPending, setIsOperationPending] = useState(false);

  const [memoryNotification, setMemoryNotification] = useState<{
    isVisible: boolean;
    type: 'success' | 'warning' | 'cleanup' | 'optimization' | 'startup';
    desc?: string;
  }>({
    isVisible: false,
    type: 'success'
  });

  const triggerMemoryNotification = (type: 'success' | 'warning' | 'cleanup' | 'optimization' | 'startup', desc?: string) => {
    setMemoryNotification({
      isVisible: true,
      type,
      desc
    });
  };

  const closeMemoryNotification = () => {
    setMemoryNotification(prev => ({ ...prev, isVisible: false }));
  };
  const [rememberMe, setRememberMe] = useState<boolean>(() => {
    return localStorage.getItem('app_remember_me') === 'true';
  });
  
  const dir = language === 'ar' ? 'rtl' : 'ltr';
  
  const handleLanguageChange = async (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('language', lang); // Note: Unified key 'language' matched with initializer
    if (token) {
      try {
        await fetch('/api/user/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ language: lang })
        });
      } catch (e) {
        console.error('Failed to sync language to server', e);
      }
    }
  };

  const handleThemeChange = async (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (token) {
      try {
        await fetch('/api/user/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ theme: newTheme })
        });
      } catch (e) {
        console.error('Failed to sync theme to server', e);
      }
    }
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Sovereign Preservation: Prevent accidental exfiltration during pending operations
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isOperationPending) {
        e.preventDefault();
        e.returnValue = ''; // Standard trigger for confirmation dialog
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isOperationPending]);

  const installApp = async () => {
    if (!deferredPrompt) return;
    setIsInstalling(true);
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
    setIsInstalling(false);
  };

  const [economySettings, setEconomySettings] = useState<any>({ 
    welcome_bonus_points: 600, 
    referral_bonus_points: 1000, 
    points_per_dollar: 1000, 
    conversion_rate: 0.001 
  });
  useEffect(() => {
    const handleAuthSuccess = (userData: any) => {
      if (localStorage.getItem('app_oauth_syncing') === 'true') return;
      localStorage.setItem('app_oauth_syncing', 'true');

      const { token: newToken, lang: authLang, ...info } = userData;
      localStorage.setItem('app_token', newToken);
      setToken(newToken);
      setUser(info);
      setIsAuthModalOpen(false); // Close auth modal immediately
      
      // Sync language if provided in OAuth payload
      if (authLang && (authLang === 'ar' || authLang === 'en')) {
        setLanguage(authLang as any);
        localStorage.setItem('language', authLang);
      }
      
      const targetRefRaw = userData.ref || localStorage.getItem('app_ref') || '/';
      const targetRef = (targetRefRaw.startsWith('/') && !targetRefRaw.startsWith('//')) ? targetRefRaw : '/';
      localStorage.removeItem('app_ref');
      
      // Sovereign: Only redirect if this window is NOT the main app window that was already visible
      setTimeout(() => {
        localStorage.removeItem('app_oauth_syncing');
        
        const currentPath = window.location.pathname;
        // If we are already on home or chats, just stay there to avoid flickering
        if ((targetRef === '/' || targetRef === '/chats') && (currentPath === '/' || currentPath === '/chats')) {
          return;
        }
        
        window.location.href = targetRef;
      }, 600);
    };

    // Parse both search and hash for tokens (Sovereign uses hash for popup redirects)
    const getParam = (name: string) => {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get(name)) return searchParams.get(name);
      
      const hash = window.location.hash;
      if (hash.includes('?')) {
        const hashQueryParams = new URLSearchParams(hash.split('?')[1]);
        return hashQueryParams.get(name);
      }
      return null;
    };

    const urlToken = getParam('token');
    const urlUserRaw = getParam('user');

    // Sovereign: Prioritize URL-based authentication signals over existing session data to support seamless redirects/popups
    if (urlToken && urlToken !== token) {
      localStorage.setItem('app_token', urlToken);
      setToken(urlToken);
      
      let userData = null;
      if (urlUserRaw) {
        try {
          userData = JSON.parse(decodeURIComponent(urlUserRaw));
          // Synchronize user state immediately from URL payload to minimize UI flickering
          setUser(userData);
        } catch (e) {
          console.error('Failed to parse user from URL', e);
        }
      }

      // If we're in a popup, notify the opener and close
      if (window.opener && window.opener !== window) {
        window.opener.postMessage({ 
          type: 'OAUTH_AUTH_SUCCESS', 
          user: { token: urlToken, ...userData } 
        }, window.location.origin);
        
        // Also use BroadcastChannel for same-origin robustness
        const authChannel = new BroadcastChannel('app_oauth_channel');
        authChannel.postMessage({ 
          type: 'OAUTH_AUTH_SUCCESS', 
          user: { token: urlToken, ...userData } 
        });
        
        setTimeout(() => window.close(), 500);
      } else {
        // Not a popup (Redirect Mode): Integrate user data via handleAuthSuccess to ensure full state sync and target redirection
        handleAuthSuccess({ token: urlToken, ...userData });
        // Clean the URL history to remove sensitive tokens without forcing a reload
        const newUrl = window.location.pathname + (window.location.hash.includes('?') ? window.location.hash.split('?')[0] : window.location.hash);
        window.history.replaceState({}, '', newUrl);
      }
    }

    const ref = getParam('ref');
    if (ref) localStorage.setItem('app_ref', ref);

    const messageListener = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        handleAuthSuccess(event.data.user);
      }
    };

    const authChannel = new BroadcastChannel('app_oauth_channel');
    authChannel.onmessage = (event) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        handleAuthSuccess(event.data.user);
      }
    };

    const storageListener = (event: StorageEvent) => {
      if (event.key === 'app_oauth_trigger' && event.newValue) {
        const storedToken = localStorage.getItem('app_token');
        const userDataJson = localStorage.getItem('app_oauth_user');
        if (storedToken && userDataJson) {
          try {
            const userData = JSON.parse(userDataJson);
            // Ensure payload is flattened if it was wrapped by popup logic
            const processedUser = userData.user ? { token: userData.token, ...userData.user } : userData;
            handleAuthSuccess(processedUser);
            localStorage.removeItem('app_oauth_user');
            localStorage.removeItem('app_oauth_trigger');
          } catch (e) { console.error('Failed to parse OAuth storage data', e); }
        }
      }
    };

    window.addEventListener('message', messageListener);
    window.addEventListener('storage', storageListener);

    return () => {
      authChannel.close();
      window.removeEventListener('message', messageListener);
      window.removeEventListener('storage', storageListener);
    };
  }, [dir]);

  const fetchWithRetry = async (url: string, options: any = {}, retries = 5, backoff = 1000): Promise<any> => {
    try {
      const res = await fetch(url, options);
      if (!res.ok) {
        if (retries > 0 && (res.status >= 500 || res.status === 404)) {
           // Retry on server errors or initial 404s (startup race)
           await new Promise(r => setTimeout(r, backoff));
           return fetchWithRetry(url, options, retries - 1, backoff * 1.5);
        }
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      if (retries > 0) {
        console.warn(`Fetch failed for ${url}, retrying in ${backoff}ms... (${retries} retries left)`, err);
        await new Promise(resolve => setTimeout(resolve, backoff));
        return fetchWithRetry(url, options, retries - 1, backoff * 1.5);
      }
      throw err;
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isAuthReady) {
        console.warn('Auth ready took too long, forcing ready state for boot resilience.');
        setIsAuthReady(true);
      }
    }, 8000); // 8 second safety net
    return () => clearTimeout(timer);
  }, [isAuthReady]);

  const fetchUserProfile = async () => {
    if (!token) return;
    try {
      const data = await fetchWithRetry(`/api/user/me?t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Sovereign: Handle both legacy wrapped and modern flat user response payloads for maximum resilience
      const userProfile = data.user || (data.email ? data : null);
      
      if (userProfile) {
        setUser(userProfile);
        setBalance(Number(data.points || userProfile.points || 0));
        setBalanceUSD(Number(data.balance || userProfile.balance || 0));
        if (userProfile.language) setLanguage(userProfile.language as Language);
        if (data.economy) setEconomySettings(data.economy);
      }
      setIsAuthReady(true);
    } catch (err) {
      console.error('Profile fetch error:', err);
      if (err instanceof Error && (err.message.includes('401') || err.message.includes('403'))) {
        logout(false);
      }
      setIsAuthReady(true);
    }
  };

  const fetchBalance = async () => {
    if (!token) return;
    try {
      const data = await fetchWithRetry(`/api/user/me?skip_profile=1&t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (data.points !== undefined) setBalance(Number(data.points));
      if (data.balance !== undefined) setBalanceUSD(Number(data.balance));
    } catch (err) {
      console.error('Balance fetch error:', err);
    }
  };

  useEffect(() => {
    fetch(`/api/economy`)
      .then(res => res.json())
      .then(data => data && data.points_per_dollar && setEconomySettings(data))
      .catch(() => {});

    if (token) {
      fetchUserProfile();
      fetchBalance();
      if (socket && !socket.connected) {
        socket.auth = { token };
        socket.connect();
      }
    } else {
      setIsAuthReady(true);
    }
  }, [token, socket]);

  const loginWithGoogle = async () => {
    try {
      const ref = localStorage.getItem('app_ref');
      const lang = localStorage.getItem('language') || 'ar';
      
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
      
      const mode = (isMobileDevice || isStandalone) ? 'redirect' : 'popup';
      
      const res = await fetch(`/api/auth/google/url?lang=${lang}${ref ? `&ref=${ref}` : ''}&mode=${mode}&remember=${rememberMe}`);
      
      if (!res.ok) {
        throw new Error(`Auth URL fetch failed: ${res.status}`);
      }

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        console.error('Non-JSON response from Google Auth URL:', text);
        throw new Error('Invalid server response');
      }

      const data = await res.json();
      
      if (mode === 'redirect') {
        window.location.href = data.url;
        return;
      }

      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      window.open(data.url, 'Google Login', `width=${width},height=${height},left=${left},top=${top}`);

    } catch (error) {
      console.error('Login failed', error);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch(`/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, remember: rememberMe })
      });
      
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (res.ok) {
          setToken(data.token);
          setUser(data.user);
          localStorage.setItem('app_token', data.token);
          setIsAuthModalOpen(false);
          toast.success(dir === 'rtl' ? 'تم تسجيل الدخول بنجاح!' : 'Login Successful!');
          
          setTimeout(() => {
            window.location.href = '/';
          }, 500);
          
          return { success: true };
        } else {
          return { success: false, error: data.error };
        }
      } else {
        const text = await res.text();
        console.error('Non-JSON response from login:', text);
        return { 
          success: false, 
          error: text.includes('Rate exceeded') 
            ? (dir === 'rtl' ? 'تم تجاوز حد الطلبات. يرجى المحاولة لاحقاً.' : 'Rate limit exceeded. Please try again later.')
            : (dir === 'rtl' ? 'حدث خطأ في الخادم' : 'Server error occurred') 
        };
      }
    } catch (error) {
      console.error('Login connection error:', error);
      return { success: false, error: dir === 'rtl' ? 'خطأ في الاتصال' : 'Connection error' };
    }
  };

  const signup = async (email: string, password: string, name: string, ref?: string) => {
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, ref })
      });
      
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (res.ok) {
          setToken(data.token);
          setUser(data.user);
          localStorage.setItem('app_token', data.token);
          setIsAuthModalOpen(false);
          toast.success(dir === 'rtl' ? 'تم إنشاء الحساب بنجاح!' : 'Account Created Successfully!');
          
          setTimeout(() => {
            window.location.href = '/';
          }, 500);
          
          return { success: true };
        } else {
          return { success: false, error: data.error };
        }
      } else {
        const text = await res.text();
        console.error('Non-JSON response from signup:', text);
        return { 
          success: false, 
          error: text.includes('Rate exceeded') 
            ? (dir === 'rtl' ? 'تم تجاوز حد الطلبات. يرجى المحاولة لاحقاً.' : 'Rate limit exceeded. Please try again later.')
            : (dir === 'rtl' ? 'حدث خطأ في الخادم' : 'Server error occurred') 
        };
      }
    } catch (error) {
      console.error('Signup connection error:', error);
      return { success: false, error: dir === 'rtl' ? 'خطأ في الاتصال' : 'Connection error' };
    }
  };

  const logout = (forceRedirect = true) => {
    // Sovereign: Fire and forget logout call to blacklist the token
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(e => console.error('API Logout error', e));
    }

    localStorage.removeItem('app_token');
    
    if (socket) {
      try {
        socket.disconnect();
      } catch (e) {
        console.error('Socket disconnect error during logout', e);
      }
    }
    
    setToken(null);
    setUser(null);
    setBalance(0);
    setBalanceUSD(0);
    setNotifications([]);
    
    if (forceRedirect) {
      setTimeout(() => {
        window.location.href = '/';
      }, 100);
    }
  };

  const [siteSettings, setSiteSettings] = useState<SiteSettings>(() => {
    const saved = localStorage.getItem('site_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved site settings', e);
      }
    }
    return {
      siteName: '',
      siteNameAr: '',
      siteDescription: '',
      siteDescriptionAr: '',
      logoBase64: null,
      faviconBase64: null,
      seoDescriptionEn: '',
      seoDescriptionAr: '',
      keywordsEn: '',
      keywordsAr: '',
      googleAnalyticsId: ''
    };
  });

  useEffect(() => {
    localStorage.setItem('site_settings', JSON.stringify(siteSettings));
  }, [siteSettings]);

  useEffect(() => {
    const appName = language === 'ar' ? siteSettings.siteNameAr : siteSettings.siteName;
    const nameToUse = appName || (language === 'ar' ? 'المنصة الذكية' : 'Smart Platform');
    
    document.title = nameToUse;
  }, [siteSettings, language]);

  const [plans, setPlans] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [milestoneData, setMilestoneData] = useState<any>(null);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    const socketEndpoint = SOCKET_URL || window.location.origin;
    const socketOptions: any = { 
      transports: ['polling', 'websocket'], 
      autoConnect: !!token 
    };

    if (token) {
      socketOptions.auth = { token };
    }

    const newSocket = io(socketEndpoint, socketOptions);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      if (user?.id) {
        newSocket.emit('register_user', user.id);
      }
    });

    newSocket.on('new_notification', (notif: any) => {
      setNotifications(prev => [notif, ...prev]);
    });

    newSocket.on('quota_milestone', (data: any) => {
      setMilestoneData(data);
    });

    newSocket.on('user_profile_updated', () => {
      refreshUser();
    });

    newSocket.on('usage_update', (data: { toolId: string; usageCount: number }) => {
      setUser(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          usageStats: {
            ...prev.usageStats,
            [data.toolId]: data.usageCount
          }
        };
      });
    });

    return () => {
      if (newSocket) newSocket.disconnect();
    };
  }, [token]);

  useEffect(() => {
    if (socket && socket.connected && user?.id) {
      socket.emit('register_user', user.id);
      
      const handleNewNotification = (notif: any) => {
        setNotifications(prev => [notif, ...prev]);
        
        if (Notification.permission === 'granted') {
          new Notification(language === 'ar' ? notif.title_ar : notif.title_en, {
            body: language === 'ar' ? notif.message_ar : notif.message_en,
            icon: '/favicon.ico'
          });
        }
      };

      socket.on('new_notification', handleNewNotification);

      return () => {
        socket.off('new_notification', handleNewNotification);
      };
    }
  }, [socket, user, language]);

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      if (res.ok) {
        setNotifications(await res.json());
      } else if (res.status === 401) {
        console.warn('Unauthorized notification fetch - session likely expired');
      } else {
        console.error('Failed to fetch notifications:', res.status, res.statusText);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        console.debug('Transient network error fetching notifications (likely server initializing)');
      } else {
        console.error('Error fetching notifications:', error);
      }
    }
  };

  const markAsRead = async (id: number) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications/read-all', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (id: number) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const clearAllNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications/all', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications([]);
      }
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  useEffect(() => {
    if (token) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [token]);

  const refreshUser = async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/user/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const userProfile = data.user || (data.email ? data : null);
        if (userProfile) {
          setUser(userProfile);
          setBalance(Number(data.points || userProfile.points || 0));
          setBalanceUSD(Number(data.balance || userProfile.balance || 0));
          if (data.economy) {
            setEconomySettings(data.economy);
          }
        }
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  const payWithBalance = async (planId: string, billingCycle: 'monthly' | 'annual') => {
    if (!token) {
      setIsAuthModalOpen(true);
      return { success: false, error: 'Auth required' };
    }
    try {
      const res = await fetch('/api/subscriptions/pay-with-balance', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ planId, billingCycle })
      });
      const data = await res.json();
      if (res.ok) {
        await refreshUser();
        return { success: true, message: data.message };
      }
      return { success: false, error: data.error };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  };

  const stripeCheckout = async (planId: string, billingCycle: 'monthly' | 'annual') => {
    if (!token) {
      setIsAuthModalOpen(true);
      return { error: 'Auth required' };
    }
    try {
      const res = await fetch('/api/subscriptions/stripe-checkout', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ planId, billingCycle })
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
        return { url: data.url };
      }
      return { error: data.error || 'Stripe error' };
    } catch (error) {
      return { error: 'Network error' };
    }
  };

  useEffect(() => {
    const fetchSettingsAndPlans = async () => {
      const options = token ? { headers: { 'Authorization': `Bearer ${token}` } } : {};
      
      try {
        const settingsData = await fetchWithRetry('/api/settings', options);
        setSiteSettings({
          siteName: settingsData.site_name_en || '',
          siteNameAr: settingsData.site_name_ar || '',
          siteDescription: settingsData.site_description_en || '',
          siteDescriptionAr: settingsData.site_description_ar || '',
          seoDescriptionEn: settingsData.seo_description_en || '',
          seoDescriptionAr: settingsData.seo_description_ar || '',
          keywordsEn: settingsData.keywords_en || '',
          keywordsAr: settingsData.keywords_ar || '',
          googleAnalyticsId: settingsData.google_analytics_id || '',
          logoBase64: settingsData.logo_url || null,
          faviconBase64: settingsData.favicon_url || null
        });
      } catch (err) {
         console.warn('Settings fetch failed (likely unauthorized or server starting):', err);
      }

      try {
        const ecoData = await fetchWithRetry('/api/economy', options, 2, 500);
        setEconomySettings(ecoData);
      } catch (ecoError) {
        console.log('Economy fetch failed (likely unauthorized):', ecoError);
      }

      try {
        const plansData = await fetchWithRetry('/api/plans', options);
        const formattedPlans = (plansData || []).map((p: any) => {
          let features = [];
          let limits = {};
          
          try {
            features = Array.isArray(p.features) ? p.features : (typeof p.features === 'string' ? JSON.parse(p.features || '[]') : []);
          } catch (e) {
            console.error(`Error parsing features for plan ${p.id}:`, e);
          }
          
          try {
            limits = typeof p.limits === 'object' && p.limits !== null ? p.limits : (typeof p.limits === 'string' ? JSON.parse(p.limits || '{}') : {});
          } catch (e) {
            console.error(`Error parsing limits for plan ${p.id}:`, e);
          }

          return {
            id: p.id.toString(),
            nameEn: p.name_en || '',
            nameAr: p.name_ar || '',
            descEn: p.desc_en || '',
            descAr: p.desc_ar || '',
            badge: p.badge || 'none',
            discount: p.discount || 0,
            isActive: p.is_active ?? true,
            isVisible: p.is_visible ?? true,
            monthlyPrice: parseFloat(p.monthly_price || 0),
            annualPrice: parseFloat(p.annual_price || 0),
            color: p.color || '#10b981',
            features,
            limits
          };
        });
        setPlans(formattedPlans);
      } catch (error) {
        console.error('CRITICAL: Error fetching public plan data:', error);
      }
    };
    fetchSettingsAndPlans();
  }, [token]);

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
    localStorage.setItem('language', language);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
    try { localStorage.setItem('theme', theme); } catch(e) {}
  }, [language, theme, dir]);


  useEffect(() => {
    const currentSiteName = language === 'ar' ? (siteSettings.siteNameAr || siteSettings.siteName) : siteSettings.siteName;
    const currentSiteDesc = language === 'ar' ? (siteSettings.siteDescriptionAr || siteSettings.siteDescription) : siteSettings.siteDescription;
    
    document.title = currentSiteName || '...';
    
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', (language === 'ar' ? siteSettings.seoDescriptionAr : siteSettings.seoDescriptionEn) || currentSiteDesc);

    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute('content', (language === 'ar' ? siteSettings.keywordsAr : siteSettings.keywordsEn));

    if (siteSettings.faviconBase64) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = siteSettings.faviconBase64;
    }

    if (siteSettings.googleAnalyticsId) {
      let gaScript = document.getElementById('ga-script') as HTMLScriptElement;
      if (!gaScript) {
        gaScript = document.createElement('script');
        gaScript.id = 'ga-script';
        gaScript.async = true;
        document.head.appendChild(gaScript);
      }
      gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${siteSettings.googleAnalyticsId}`;

      let gaInlineScript = document.getElementById('ga-inline-script');
      if (!gaInlineScript) {
        gaInlineScript = document.createElement('script');
        gaInlineScript.id = 'ga-inline-script';
        document.head.appendChild(gaInlineScript);
      }
      gaInlineScript.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${siteSettings.googleAnalyticsId}');
      `;
    }
  }, [siteSettings, language]);

  const t = (key: string, replacements?: Record<string, string | number>) => {
    let str = (translations[language] as any)[key] || key;
    
    if (key === 'appName') {
      str = language === 'ar' 
        ? (siteSettings.siteNameAr || '') 
        : (siteSettings.siteName || '');
    }

    if (replacements) {
      Object.entries(replacements).forEach(([k, v]) => {
        str = str.replace(`{${k}}`, v.toString());
      });
    }
    return str;
  };

  return (
    <AppContext.Provider value={{ 
      language, setLanguage: handleLanguageChange, 
      theme, setTheme: handleThemeChange, 
      dir, t, 
      isSidebarOpen, setIsSidebarOpen,
      user, setUser, isAuthReady,
      token, balance,
      login, signup,
      loginWithGoogle, logout,
      isAuthModalOpen, setIsAuthModalOpen,
      plans, setPlans,
      siteSettings, setSiteSettings,
      economySettings, setEconomySettings,
      payWithBalance, stripeCheckout, refreshUser, balanceUSD,
      notifications, setNotifications, unreadCount, markAsRead, markAllAsRead,
      deleteNotification,
      clearAllNotifications,
      socket,
      milestoneData,
      setMilestoneData,
      isMobile,
      isInstallable,
      isInstalling,
      rememberMe,
      setRememberMe,
      isOperationPending,
      setIsOperationPending,
      installApp,
      memoryNotification,
      triggerMemoryNotification,
      closeMemoryNotification
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
