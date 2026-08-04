export const getAuthHeaders = (token: string | null) => ({
  Authorization: token ? `Bearer ${token}` : '',
  'Content-Type': 'application/json',
});

export const getTimeAgo = (dateStr: string | Date | undefined, lang: string = 'ar'): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return lang === 'ar' ? 'الآن' : 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return lang === 'ar' ? `منذ ${minutes} دقيقة` : `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return lang === 'ar' ? `منذ ${hours} ساعة` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return lang === 'ar' ? `منذ ${days} يوم` : `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return lang === 'ar' ? `منذ ${months} شهر` : `${months}mo ago`;
  const years = Math.floor(months / 12);
  return lang === 'ar' ? `منذ ${years} سنة` : `${years}y ago`;
};

export const formatExactTimestamp = (createdAt: string | Date | undefined, dir: 'ltr' | 'rtl' = 'ltr'): string => {
  if (!createdAt) return '';
  const date = new Date(createdAt);
  if (isNaN(date.getTime())) return '';
  
  return date.toLocaleTimeString(dir === 'rtl' ? 'ar-SA' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

export const formatTimeSeconds = (timeInSecs: number): string => {
  if (isNaN(timeInSecs) || timeInSecs < 0) return '0:00';
  const min = Math.floor(timeInSecs / 60);
  const sec = Math.floor(timeInSecs % 60);
  return `${min}:${sec < 10 ? '0' : ''}${sec}`;
};
