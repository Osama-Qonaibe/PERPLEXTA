export const getTimeAgo = (date: string | Date, language: string = 'en', t?: (key: string, replacements?: any) => string): string => {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
  
  // If t is provided, use it for localized strings
  if (t) {
    if (seconds < 60) return t('justNow');
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return t('minutesAgo', { n: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('hoursAgo', { n: hours });
    const days = Math.floor(hours / 24);
    if (days < 7) return t('daysAgo', { n: days });
  }

  // Fallback to simple English logic if t is missing
  if (seconds < 60) return language === 'ar' ? 'الآن' : 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return language === 'ar' ? `منذ ${minutes} دقيقة` : `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return language === 'ar' ? `منذ ${hours} ساعة` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return language === 'ar' ? `منذ ${days} أيام` : `${days}d ago`;

  return new Date(date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US');
};
