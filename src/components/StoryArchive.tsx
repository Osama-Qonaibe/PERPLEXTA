import React, { useState, useEffect } from 'react';
import { Archive, RotateCcw, Trash2, Loader2, Play, Image as ImageIcon } from 'lucide-react';
import { getMediaUrl } from '../utils/mediaUtils';

interface StoryArchiveProps {
  dir: 'rtl' | 'ltr';
  token: string | null;
  showToast?: (message: string, type?: 'success' | 'error') => void;
}

export const StoryArchive: React.FC<StoryArchiveProps> = ({ dir, token, showToast }) => {
  const [archivedStories, setArchivedStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchArchivedStories = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch('/api/bulletin/ads/my', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.ads) {
        const now = new Date().getTime();
        const expired = data.ads.filter((ad: any) => 
          ad.ad_format === 'story' && 
          ad.expires_at && 
          new Date(ad.expires_at).getTime() < now
        );
        setArchivedStories(expired);
      }
    } catch (err) {
      console.error('Failed to fetch archived stories', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchivedStories();
  }, [token]);

  const handleReshare = async (id: number) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/bulletin/stories/${id}/reshare`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        if (showToast) showToast(dir === 'rtl' ? 'تمت إعادة نشر القصة بنجاح' : 'Story reshared successfully');
        fetchArchivedStories();
      } else {
        if (showToast) showToast(data.error || 'فشل النشر', 'error');
      }
    } catch (err) {
      if (showToast) showToast('حدث خطأ', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!token) return;
    if (!confirm(dir === 'rtl' ? 'هل أنت متأكد من حذف هذه القصة نهائياً؟' : 'Are you sure you want to permanently delete this story?')) return;
    try {
      const res = await fetch(`/api/bulletin/ads/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        if (showToast) showToast(dir === 'rtl' ? 'تم الحذف' : 'Deleted successfully');
        setArchivedStories(prev => prev.filter(s => s.id !== id));
      } else {
        if (showToast) showToast(data.error || 'فشل الحذف', 'error');
      }
    } catch (err) {
      if (showToast) showToast('حدث خطأ', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="animate-spin text-[var(--text-muted)]" size={24} />
      </div>
    );
  }

  if (archivedStories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 bg-[var(--surface-card)] rounded-[var(--radius)] border border-[var(--border-main)] text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--surface-subtle)] flex items-center justify-center mb-4">
          <Archive size={28} className="text-[var(--text-muted)]" />
        </div>
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
          {dir === 'rtl' ? 'لا توجد قصص مؤرشفة' : 'No Archived Stories'}
        </h3>
        <p className="text-xs text-[var(--text-muted)] max-w-sm">
          {dir === 'rtl' 
            ? 'ستظهر هنا القصص التي انتهت مدة عرضها (24 ساعة)، لتتمكن من إعادة نشرها أو حذفها.' 
            : 'Stories that have expired (after 24 hours) will appear here for you to reshare or delete.'}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {archivedStories.map((story, sIdx) => (
        <div key={`archived-story-${story.id || sIdx}-${sIdx}`} className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-black group border border-[var(--border-main)]">
          {story.video_url ? (
            <video 
              src={getMediaUrl(story.video_url)} 
              className="w-full h-full object-cover opacity-60"
            />
          ) : (
            <img 
              src={getMediaUrl(story.image_url)} 
              alt="Archived story"
              className="w-full h-full object-cover opacity-60"
            />
          )}
          
          <div className="absolute top-2 left-2 p-1.5 rounded-full bg-black/50 backdrop-blur-sm z-10">
            {story.video_url ? <Play size={14} className="text-white" /> : <ImageIcon size={14} className="text-white" />}
          </div>

          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-3">
            <span className="text-white/70 text-[10px] mb-2 font-bold flex items-center gap-1">
              <Archive size={12} />
              {new Date(story.created_at).toLocaleDateString(dir === 'rtl' ? 'ar-EG' : 'en-US')}
            </span>
            
            <div className="flex gap-2 w-full">
              <button 
                onClick={() => handleReshare(story.id)}
                className="flex-1 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-[10px] font-bold flex justify-center items-center gap-1 transition-colors"
                title={dir === 'rtl' ? 'إعادة نشر' : 'Reshare'}
              >
                <RotateCcw size={14} />
              </button>
              <button 
                onClick={() => handleDelete(story.id)}
                className="flex-1 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-[10px] font-bold flex justify-center items-center gap-1 transition-colors"
                title={dir === 'rtl' ? 'حذف نهائي' : 'Delete'}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
