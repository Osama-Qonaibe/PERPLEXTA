import React, { useState } from 'react';
import { BrainCircuit, Plus, Trash2, Edit2, Save, X, Check, Loader2, Info, User, AlertTriangle, Sparkles } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface Memory {
  id: number;
  fact: string;
  category: string;
  source: 'user' | 'ai';
  created_at: string;
  updated_at: string;
}

interface MemoryCenterProps {
  memories: Memory[];
  isLoading: boolean;
  onAdd: (fact: string, category?: string) => Promise<void>;
  onUpdate: (id: number, fact: string, category?: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onPrune?: () => Promise<void>;
  dir: 'rtl' | 'ltr';
  theme: 'dark' | 'light';
  stickyOffset?: number;
}

export const MemoryCenter: React.FC<MemoryCenterProps> = ({ 
  memories, 
  isLoading, 
  onAdd, 
  onUpdate, 
  onDelete, 
  onPrune,
  dir, 
  theme,
  stickyOffset = 0
}) => {
  const { t } = useTheme();
  const [isAdding, setIsAdding] = useState(false);
  const [newValue, setNewValue] = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editCategory, setEditCategory] = useState('general');
  const [isPruning, setIsPruning] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');

  const categories = [
    { id: 'all', label: t('all') },
    { id: 'personal', label: t('personal') },
    { id: 'technical', label: t('technical') },
    { id: 'preference', label: t('preference') },
    { id: 'project', label: t('project') },
    { id: 'general', label: t('general') },
  ];

  const filteredMemories = filterCategory === 'all' 
    ? memories 
    : memories.filter(m => m.category === filterCategory);

  const MEMORY_LIMIT = 50;
  const memoryCount = memories.length;
  const isLimitReached = memoryCount >= MEMORY_LIMIT;
  const usagePercentage = Math.min(100, (memoryCount / MEMORY_LIMIT) * 100);

  const handleSaveNew = async () => {
    if (!newValue.trim()) return;
    if (isLimitReached) {
      alert(t('memoryLimitReached'));
      return;
    }
    await onAdd(newValue, newCategory);
    setNewValue('');
    setIsAdding(false);
  };

  const handlePrune = async () => {
    if (!onPrune) return;
    if (!window.confirm(dir === 'rtl' ? 'هل أنت متأكد من رغبتك في حذف أقدم 10 حقائق لتوفير مساحة؟' : 'Are you sure you want to delete the 10 oldest facts to free up space?')) return;
    
    setIsPruning(true);
    try {
      await onPrune();
    } finally {
      setIsPruning(false);
    }
  };

  const handleSaveEdit = async (id: number) => {
    if (!editValue.trim()) return;
    await onUpdate(id, editValue, editCategory);
    setEditingId(null);
  };

  return (
    <div className="space-y-4 md:space-y-6 relative">
      <div 
        className={`sticky z-30 -mx-4 md:-mx-8 px-4 md:px-8 pt-4 md:pt-6 pb-4 md:pb-6 transition-all duration-300 bg-[var(--bg-primary)]/95 backdrop-blur-md border-b border-[var(--border-main)] rounded-t-[var(--radius)]`}
        style={{ top: stickyOffset }}
      >
        <div className="flex flex-row items-center justify-between gap-4 mb-4">
          <div className="hidden sm:block">
            <h2 className="text-xl md:text-2xl font-bold mb-0.5 md:mb-1 text-[var(--text-primary)]">{t('memoryCenter')}</h2>
            <p className="text-[11px] md:text-sm text-[var(--text-secondary)] font-medium opacity-70">
              {dir === 'rtl' 
                ? 'الحقائق والتفضيلات التي تعلمها المساعد عنك.' 
                : 'Facts and preferences the assistant has learned about you.'}
            </p>
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center justify-center gap-2 px-4 md:px-6 py-2 md:py-2.5 bg-emerald-500 text-white hover:bg-emerald-600 rounded-[var(--radius)] transition-all duration-300 font-bold text-xs md:text-sm shadow-xl shadow-emerald-500/20 group w-full sm:w-auto ml-auto"
          >
            <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
            {t('addFact')}
          </button>
        </div>

        {/* Category Filter - Fixed Elite Horizontal Scroll */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar -mx-2 px-2 sm:mx-0 sm:px-0">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id)}
              className={`px-4 md:px-6 py-2 md:py-2.5 rounded-[var(--radius)] text-[10px] md:text-xs font-black uppercase tracking-widest transition-all duration-600 border ${
                filterCategory === cat.id
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                  : 'bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-primary)]/40 hover:text-[var(--text-primary)] hover:border-emerald-500/30'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Memory Capacity Indicator */}
        <div className={`p-4 md:p-6 rounded-[var(--radius)] border transition-all duration-300 ${
          isLimitReached 
            ? 'bg-amber-500/5 border-amber-500/30'
            : 'bg-[var(--bg-secondary)] border-[var(--border-main)] shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <div className="flex items-center gap-2.5 md:gap-3">
              <div className={`w-8 h-8 md:w-10 md:h-10 rounded-[var(--radius)] flex items-center justify-center ${
                isLimitReached ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'
              }`}>
                <BrainCircuit size={16} className="md:w-5 md:h-5" />
              </div>
              <div>
                <h3 className="font-bold text-xs md:text-sm text-[var(--text-primary)]">{t('memoryCapacity')}</h3>
                <p className="text-[9px] md:text-[10px] text-[var(--text-muted)]">
                  {memoryCount} / {MEMORY_LIMIT} {dir === 'rtl' ? 'حقائق' : 'facts'}
                </p>
              </div>
            </div>
            
            {isLimitReached && (
              <button 
                onClick={handlePrune}
                disabled={isPruning}
                className="flex items-center gap-1.5 px-3 md:px-4 py-1.5 md:py-2 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 rounded-[var(--radius)] transition-all text-[10px] md:text-xs font-bold border border-amber-500/20"
              >
                {isPruning ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                {t('prune')}
              </button>
            )}
          </div>

          <div className="w-full h-1.5 md:h-2 bg-[var(--bg-primary)] rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 ease-out rounded-full ${
                isLimitReached ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${usagePercentage}%` }}
            />
          </div>

          {isLimitReached && (
            <div className="mt-3 md:mt-4 flex items-start gap-2">
              <AlertTriangle size={12} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[9px] md:text-[10px] text-amber-600/80 leading-relaxed font-medium">
                {dir === 'rtl' 
                  ? 'وصلت للحد الأقصى. يرجى تنظيف الذاكرة للمتابعة.' 
                  : 'Memory full. Please prune to continue.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Auto-update Indicator */}
      <div className={`p-3 md:p-4 rounded-[var(--radius)] border flex items-start gap-2.5 md:gap-3 bg-emerald-500/5 border-emerald-500/20`}>
        <Info className="text-emerald-500 shrink-0 mt-0.5" size={16} />
        <p className="text-[10px] md:text-xs text-emerald-600/80 leading-relaxed font-medium">
          {dir === 'rtl' 
            ? 'يقوم المساعد بتحديث هذه الذاكرة تلقائياً (AI)، ويمكنك إضافة حقائق بنفسك (User).' 
            : 'Assistant updates memory automatically (AI), or you can add facts manually (User).'}
        </p>
      </div>


      {isAdding && (
        <div className={`p-6 rounded-[var(--radius)] border animate-in slide-in-from-top-2 duration-300 bg-[var(--bg-secondary)] border-[var(--border-main)]`}>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1.5 px-1">
                {t('category') || (dir === 'rtl' ? 'التصنيف' : 'Category')}
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className={`w-full p-2.5 rounded-[var(--radius)] border focus:outline-none focus:border-emerald-500 text-sm transition-all bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-primary)]`}
              >
                {categories.filter(c => c.id !== 'all').map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
              </select>
            </div>
          </div>
          <textarea
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder={dir === 'rtl' ? 'ما الذي يجب أن يتذكره المساعد؟' : 'What should the assistant remember?'}
            className={`w-full p-4 rounded-[var(--radius)] border focus:outline-none focus:border-emerald-500 resize-none h-32 mb-4 transition-all bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-primary)]`}
            autoFocus
          />
          <div className="flex justify-end gap-3">
            <button 
              onClick={() => { setIsAdding(false); setNewValue(''); }}
              className="px-6 py-2 rounded-[var(--radius)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] transition-colors"
            >
              {t('cancel')}
            </button>
            <button 
              onClick={handleSaveNew}
              disabled={!newValue.trim()}
              className="px-6 py-2 rounded-[var(--radius)] text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              {t('save')}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
          <p className="text-sm text-[var(--text-muted)] animate-pulse">{t('loadingMemory')}</p>
        </div>
      ) : filteredMemories.length === 0 ? (
        <div className={`p-12 rounded-[var(--radius)] border border-dashed flex flex-col items-center justify-center text-center border-[var(--border-main)] bg-[var(--bg-secondary)]/30`}>
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
            <BrainCircuit size={40} className="text-emerald-500/50" />
          </div>
          <h3 className="text-xl font-bold mb-2 text-[var(--text-primary)]">{t('noResults')}</h3>
          <p className="text-sm text-[var(--text-secondary)] max-w-sm leading-relaxed">
            {dir === 'rtl' 
              ? 'لا توجد حقائق في هذا التصنيف حالياً.' 
              : 'No facts found in this category yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMemories.map((memory) => (
            <div 
              key={memory.id} 
              className={`group p-6 rounded-[var(--radius)] border transition-all duration-300 bg-[var(--bg-secondary)] border-[var(--border-main)] hover:border-emerald-500/30 hover:bg-[var(--bg-secondary)]/80 hover:shadow-xl hover:shadow-emerald-500/5`}
            >
              {editingId === memory.id ? (
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className={`w-full p-2.5 rounded-[var(--radius)] border focus:outline-none focus:border-emerald-500 text-sm transition-all bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-primary)]`}
                      >
                        {categories.filter(c => c.id !== 'all').map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className={`w-full p-4 rounded-[var(--radius)] border focus:outline-none focus:border-emerald-500 resize-none h-28 transition-all bg-[var(--bg-primary)] border-[var(--border-main)] text-[var(--text-primary)]`}
                    autoFocus
                  />
                  <div className="flex justify-end gap-3 pt-2">
                    <button 
                      onClick={() => setEditingId(null)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-[var(--radius)] text-xs font-bold transition-all duration-300 text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]`}
                    >
                      <X size={14} />
                      {t('cancel')}
                    </button>
                    <button 
                      onClick={() => handleSaveEdit(memory.id)}
                      disabled={!editValue.trim()}
                      className="flex items-center gap-2 px-5 py-2 bg-emerald-500 text-white hover:bg-emerald-600 rounded-[var(--radius)] transition-all duration-300 text-xs font-bold shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                    >
                      <Save size={14} />
                      {t('save')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {memory.source === 'user' ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-500 text-[10px] font-bold uppercase tracking-wider">
                          <User size={10} />
                          {dir === 'rtl' ? 'بواسطة المستخدم' : 'User Added'}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase tracking-wider">
                          <BrainCircuit size={10} />
                          {dir === 'rtl' ? 'تعلم آلي' : 'AI Learned'}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[var(--bg-primary)] text-[var(--text-muted)]`}>
                        {categories.find(c => c.id === memory.category)?.label || memory.category}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-[var(--text-primary)]" dir="auto">
                      {memory.fact}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-3 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-emerald-500" />
                      {new Date(memory.created_at).toLocaleString(dir === 'rtl' ? 'ar-EG' : 'en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                      {memory.updated_at !== memory.created_at && (
                        <>
                          <span className="mx-1">•</span>
                          <span>{dir === 'rtl' ? 'تم التعديل' : 'Updated'}</span>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                    <button 
                      onClick={() => {
                        setEditingId(memory.id);
                        setEditValue(memory.fact);
                        setEditCategory(memory.category);
                      }}
                      className="p-2.5 rounded-[var(--radius)] text-[var(--text-muted)] hover:text-emerald-500 hover:bg-emerald-500/10 transition-all"
                      title={dir === 'rtl' ? 'تعديل' : 'Edit'}
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => onDelete(memory.id)}
                      className="p-2.5 rounded-[var(--radius)] text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-all"
                      title={dir === 'rtl' ? 'حذف' : 'Delete'}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
