import { Variants, Transition } from 'motion/react';

// ============================================================
// 1. الثوابت الأساسية (Core Constants)
// ============================================================

export const UNIFIED_EASE: [number, number, number, number] = [0.25, 1, 0.2, 1];
export const UNIFIED_DURATION = 0.25;

// ============================================================
// 2. الانتقالات الموحدة (Unified Transitions)
// ============================================================

export const UNIFIED_TRANSITION: Transition = {
  type: 'tween',
  duration: UNIFIED_DURATION,
  ease: UNIFIED_EASE,
};

// Aliases for backward compatibility
export const PERPLEXTA_TRANSITION = UNIFIED_TRANSITION;

// Google Material Design Standard Easing (Emphasized Decelerate)
export const GOOGLE_MATERIAL_EASE: [number, number, number, number] = [0.2, 0, 0, 1];

// Dedicated Sidebar Transition (Optimized for premium calmness, smooth and stable feel)
export const SIDEBAR_DURATION = 0.85;
export const SIDEBAR_TRANSITION: Transition = {
  type: 'tween',
  duration: SIDEBAR_DURATION,
  ease: GOOGLE_MATERIAL_EASE,
};

// ============================================================
// 3. حركات متنوعة (Motions)
// ============================================================

/**
 * حركة أساسية للتلاشي مع انتقال سلس
 * الاستخدام: للصفحات والعناصر التي تحتاج تلاشي بسيط
 */
export const FADE: Variants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: UNIFIED_TRANSITION
  },
  exit: { 
    opacity: 0,
    transition: UNIFIED_TRANSITION
  },
};

/**
 * حركة تلاشي مع حركة عمودية للأعلى
 * الاستخدام: للعناصر التي تظهر من الأسفل
 */
export const FADE_UP: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: UNIFIED_TRANSITION
  },
  exit: { 
    opacity: 0, 
    y: -20,
    transition: UNIFIED_TRANSITION
  },
};

/**
 * حركة تلاشي مع حركة عمودية للأسفل
 * الاستخدام: للعناصر التي تظهر من الأعلى
 */
export const FADE_DOWN: Variants = {
  initial: { opacity: 0, y: -20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: UNIFIED_TRANSITION
  },
  exit: { 
    opacity: 0, 
    y: 20,
    transition: UNIFIED_TRANSITION
  },
};

/**
 * حركة تلاشي مع حركة أفقية لليمين
 * الاستخدام: للعناصر التي تظهر من اليسار
 */
export const FADE_RIGHT: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: UNIFIED_TRANSITION
  },
  exit: { 
    opacity: 0, 
    x: 20,
    transition: UNIFIED_TRANSITION
  },
};

/**
 * حركة تلاشي مع حركة أفقية لليسار
 * الاستخدام: للعناصر التي تظهر من اليمين
 */
export const FADE_LEFT: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: UNIFIED_TRANSITION
  },
  exit: { 
    opacity: 0, 
    x: -20,
    transition: UNIFIED_TRANSITION
  },
};

/**
 * حركة تكبير مع تلاشي
 * الاستخدام: للعناصر البارزة أو النماذج
 */
export const SCALE_FADE: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: UNIFIED_TRANSITION
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: UNIFIED_TRANSITION
  },
};

// ============================================================
// 4. الحركات الخاصة بالصفحات (Page Transitions)
// ============================================================

/**
 * حركة انتقال الصفحات الرئيسية
 * نفس FADE ولكن مع إبقاء x,y ثابتة لتجنب حركة غير مرغوب فيها
 */
export const PAGE_TRANSITION: Variants = {
  initial: { opacity: 0.97 },
  animate: { 
    opacity: 1,
    transition: { duration: 0.08, ease: 'easeOut' }
  },
  exit: { 
    opacity: 1,
    transition: { duration: 0.05 }
  },
};

// ============================================================
// 5. التوافق مع الإصدارات السابقة (Backward Compatibility)
// ============================================================

/**
 * @deprecated استخدم FADE بدلاً من ذلك
 */
export const perplextaPageTransition = PAGE_TRANSITION;

/**
 * @deprecated استخدم FADE بدلاً من ذلك
 */
export const perplextaItemTransition = FADE;

/**
 * @deprecated استخدم FADE بدلاً من ذلك
 */
export const FADE_IN = FADE;

/**
 * @deprecated استخدم FADE_UP بدلاً من ذلك
 */
export const FADE_IN_UP = FADE_UP;

