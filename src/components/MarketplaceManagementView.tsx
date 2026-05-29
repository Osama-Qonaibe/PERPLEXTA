import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { ShoppingBag, Check, X, Shield, Trash2, ExternalLink, Calendar, Search, Filter, Eye, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MarketplaceItem {
  id: number;
  user_id: number;
  title_en: string;
  title_ar: string;
  description_en: string;
  description_ar: string;
  price: number;
  category_en: string;
  category_ar: string;
  image_url?: string;
  status: string;
  views: number;
  contact_link?: string;
  seller_name: string;
  seller_avatar?: string;
  seller_role?: string;
  created_at: string;
}

export const MarketplaceManagementView: React.FC<{ theme: string; t: any; dir: string }> = ({ theme, t, dir }) => {
  const { token, language } = useAppContext();
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [actioningId, setActioningId] = useState<number | null>(null);

  const fetchAllItems = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/marketplace/admin/items', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (err) {
      console.error('Failed to fetch admin marketplace items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllItems();
  }, [token]);

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    setActioningId(id);
    try {
      const res = await fetch(`/api/marketplace/admin/items/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        // Optimistically update status
        setItems(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item));
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setActioningId(null);
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (!window.confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا المعروض نهائياً؟' : 'Are you sure you want to permanently delete this listing?')) return;
    setActioningId(id);
    try {
      const res = await fetch(`/api/marketplace/items/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        setItems(prev => prev.filter(item => item.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete item:', err);
    } finally {
      setActioningId(null);
    }
  };

  const filteredItems = items.filter(item => {
    const title = language === 'ar' ? item.title_ar : item.title_en;
    const desc = language === 'ar' ? item.description_ar : item.description_en;
    const seller = item.seller_name;

    const matchesSearch = title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          seller.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      
      {/* Overview stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-sm border border-[var(--border)] bg-[var(--bg-surface)]">
          <div className="text-xs font-medium text-gray-500 mb-1">
            {language === 'ar' ? 'إجمالي المعروضات' : 'Total Listings'}
          </div>
          <div className="text-2xl font-black text-[var(--text-primary)] font-mono">{items.length}</div>
        </div>
        <div className="p-4 rounded-sm border border-[var(--border)] bg-[var(--bg-surface)]">
          <div className="text-xs font-medium text-gray-500 mb-1">
            {language === 'ar' ? 'بانتظار الموافقة' : 'Pending Approvals'}
          </div>
          <div className="text-2xl font-black text-amber-500 font-mono">
            {items.filter(i => i.status === 'pending').length}
          </div>
        </div>
        <div className="p-4 rounded-sm border border-[var(--border)] bg-[var(--bg-surface)]">
          <div className="text-xs font-medium text-gray-500 mb-1">
            {language === 'ar' ? 'المعروضات النشطة' : 'Active Offerings'}
          </div>
          <div className="text-2xl font-black text-emerald-500 font-mono">
            {items.filter(i => i.status === 'approved').length}
          </div>
        </div>
        <div className="p-4 rounded-sm border border-[var(--border)] bg-[var(--bg-surface)] font-mono">
          <div className="text-xs font-medium text-gray-500 mb-1">
            {language === 'ar' ? 'المنتجات المباعة' : 'Assets Sold'}
          </div>
          <div className="text-2xl font-black text-blue-500">
            {items.filter(i => i.status === 'sold').length}
          </div>
        </div>
      </div>

      {/* Control Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder={language === 'ar' ? 'البحث عن معروضات بالاسم أو البائع...' : 'Search listings by name or seller...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pl-9 pr-4 bg-[var(--bg-surface)] border border-[var(--border)] rounded-sm outline-none text-xs text-[var(--text-primary)]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {['All', 'pending', 'approved', 'rejected', 'sold'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`h-8 px-3 rounded-sm text-[11px] font-bold whitespace-nowrap transition-all duration-300 ${
                statusFilter === status
                  ? 'text-emerald-500 bg-emerald-500/5 border border-emerald-500/20'
                  : 'text-gray-400 hover:text-[var(--text-primary)] bg-[var(--bg-surface)] border border-[var(--border)]'
              }`}
            >
              {status === 'All' ? (language === 'ar' ? 'جميع الحالات' : 'All States') : status.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Listings Table */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-2">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-gray-400">{language === 'ar' ? 'جاري تحميل المعروضات...' : 'Loading listings...'}</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-12 border border-dashed border-[var(--border)] rounded-lg flex flex-col items-center justify-center text-gray-400">
          <ShoppingBag size={24} className="mb-2 opacity-30" />
          <span className="text-xs">{language === 'ar' ? 'لا توجد منتجات معروضة حالياً' : 'No listings currently listed'}</span>
        </div>
      ) : (
        <div className="overflow-x-auto border border-[var(--border)] rounded-lg bg-[var(--bg-surface)]">
          <table className="w-full border-collapse text-left" dir={dir}>
            <thead>
              <tr className="border-b border-[var(--border)] bg-gray-500/5 text-[10px] uppercase font-black tracking-wider text-gray-400">
                <th className="px-5 py-3.5">{language === 'ar' ? 'العرض' : 'Asset Detail'}</th>
                <th className="px-5 py-3.5">{language === 'ar' ? 'البائع' : 'Seller'}</th>
                <th className="px-5 py-3.5">{language === 'ar' ? 'السعر / الفئة' : 'Price & Category'}</th>
                <th className="px-5 py-3.5">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                <th className="px-5 py-3.5">{language === 'ar' ? 'المشاهدات' : 'Views'}</th>
                <th className="px-5 py-3.5 text-right">{language === 'ar' ? 'الإجراءات الإدارية' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-xs">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-500/5 transition-colors">
                  {/* Title and Image preview */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-md overflow-hidden bg-black border border-[var(--border)] shrink-0">
                        <img src={item.image_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="font-bold text-[var(--text-primary)]">
                          {language === 'ar' ? item.title_ar : item.title_en}
                        </div>
                        <div className="text-[10px] text-gray-500 line-clamp-1 max-w-xs leading-normal">
                          {language === 'ar' ? item.description_ar : item.description_en}
                        </div>
                        <div className="text-[9px] text-gray-500/70 font-mono">
                          Listed at: {new Date(item.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Seller info */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      {item.seller_avatar ? (
                        <img src={item.seller_avatar} className="w-6 h-6 rounded-full object-cover" alt="" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-[10px]">
                          {item.seller_name.charAt(0)}
                        </div>
                      )}
                      <div className="space-y-0.5">
                        <span className="font-bold text-[var(--text-primary)] ">{item.seller_name}</span>
                        {item.seller_role && (
                          <span className="block text-[8px] uppercase tracking-wider font-extrabold text-emerald-500">{item.seller_role}</span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Price and Category */}
                  <td className="px-5 py-4 font-mono">
                    <div className="font-extrabold text-emerald-500">${parseFloat(item.price.toString()).toLocaleString()}</div>
                    <div className="text-[10px] text-gray-500 font-sans mt-0.5">
                      {language === 'ar' ? item.category_ar : item.category_en}
                    </div>
                  </td>

                  {/* Rich Status badge */}
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-[4px] text-[10px] font-bold ${
                      item.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                      item.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                      item.status === 'rejected' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                      'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                    }`}>
                      {item.status.toUpperCase()}
                    </span>
                  </td>

                  {/* Views counter */}
                  <td className="px-5 py-4 font-mono text-gray-500">
                    <div className="flex items-center gap-1">
                      <Eye size={12} />
                      <span>{item.views || 0}</span>
                    </div>
                  </td>

                  {/* Control / Management Actions */}
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {item.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(item.id, 'approved')}
                            disabled={actioningId === item.id}
                            className="p-1.5 h-8 w-8 rounded-[4px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500 hover:text-black transition-all duration-300"
                            title={language === 'ar' ? 'موافقة ونشر' : 'Approve & List'}
                          >
                            <Check size={14} className="mx-auto" />
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(item.id, 'rejected')}
                            disabled={actioningId === item.id}
                            className="p-1.5 h-8 w-8 rounded-[4px] bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all duration-300"
                            title={language === 'ar' ? 'رفض' : 'Reject'}
                          >
                            <X size={14} className="mx-auto" />
                          </button>
                        </>
                      )}

                      {item.status === 'approved' && (
                        <button
                          onClick={() => handleUpdateStatus(item.id, 'sold')}
                          disabled={actioningId === item.id}
                          className="h-8 px-2.5 rounded-[4px] bg-blue-500/10 text-blue-500 border border-blue-500/20 hover:bg-blue-500 hover:text-white text-[10px] font-bold transition-all duration-300"
                        >
                          {language === 'ar' ? 'تعليم كمباع' : 'Mark Sold'}
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        disabled={actioningId === item.id}
                        className="p-1.5 h-8 w-8 rounded-[4px] bg-transparent hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-all duration-300 border border-transparent"
                        title={language === 'ar' ? 'حذف المعروض' : 'Delete listing'}
                      >
                        <Trash2 size={14} className="mx-auto" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
};
