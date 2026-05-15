import React, { useState, useEffect } from "react";
import { 
  Mail, RefreshCw, Save, Search, Plus, Trash2, Edit, CheckCircle, 
  AlertCircle, Info, ChevronDown, FileText, Layout
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAppContext } from "../../context/AppContext";

export const EmailTemplateHubView = ({
  theme,
  t,
  dir,
}: {
  theme: string;
  t: (key: string, replacements?: any) => string;
  dir: string;
}) => {
  const { token, setIsOperationPending } = useAppContext();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);

  const fetchTemplates = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/admin/emails/templates", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setTemplates(await res.json());
      }
    } catch (err) {
      console.error("Error fetching templates:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [token]);

  const handleSave = async () => {
    if (!token || !editingTemplate) return;
    setIsSaving(true);
    setIsOperationPending(true);
    try {
      const res = await fetch(`/api/admin/emails/templates/${editingTemplate.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editingTemplate),
      });
      if (res.ok) {
        setEditingTemplate(null);
        await fetchTemplates();
      }
    } catch (err) {
      console.error("Error saving template:", err);
    } finally {
      setIsSaving(false);
      setIsOperationPending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Mail size={48} className="text-emerald-500 animate-pulse mb-4" />
        <p className="text-gray-500 font-medium uppercase tracking-widest">COMMUNICATION HUB LOADING...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {templates.map((template) => (
          <motion.div
            key={template.id}
            layout
            className={`p-6 rounded-[4px] border ${theme === "dark" ? "bg-[#111111] border-gray-800/60" : "bg-white border-gray-100"} hover:shadow-lg transition-all duration-300`}
          >
             <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-[4px] bg-emerald-500/10 text-emerald-500">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm uppercase tracking-tight">{template.name}</h3>
                  <p className="text-[9px] font-black text-gray-500 uppercase">{template.subject_en?.substring(0, 30)}...</p>
                </div>
              </div>
              <button
                onClick={() => setEditingTemplate(template)}
                className="p-2 rounded-[4px] hover:bg-gray-500/10 transition-colors text-gray-500"
              >
                <Edit size={18} />
              </button>
            </div>

            <div className="space-y-4">
               <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                  <Layout size={14} className="text-gray-400" />
                  <span>Version: {template.version || "1.0.0"}</span>
               </div>
               <div className="p-3 rounded-[4px] bg-gray-500/5 border border-gray-800/20">
                  <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Last Dispatch:</p>
                  <p className="text-xs font-medium text-emerald-500">2,450 Success / 12 Failures</p>
               </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {editingTemplate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
             <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[4px] border border-gray-800 shadow-2xl p-8 ${theme === "dark" ? "bg-[#0f0f11] text-white" : "bg-white text-gray-900"}`}
             >
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-black uppercase tracking-tight">Edit Email Protocol</h3>
                  <button onClick={() => setEditingTemplate(null)} className="text-gray-500 hover:text-white transition-colors">
                    <Trash2 size={24} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                   <div className="space-y-4">
                      <label className="text-xs font-black text-gray-500 uppercase">Subject (EN)</label>
                      <input
                        type="text"
                        value={editingTemplate.subject_en}
                        onChange={(e) => setEditingTemplate({...editingTemplate, subject_en: e.target.value})}
                        className={`w-full px-4 py-3 rounded-[4px] border focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${theme === "dark" ? "bg-[#1a1a1c] border-gray-800" : "bg-gray-50 border-gray-200"}`}
                      />
                   </div>
                   <div className="space-y-4">
                      <label className="text-xs font-black text-gray-500 uppercase">Subject (AR)</label>
                      <input
                        type="text"
                        value={editingTemplate.subject_ar}
                        onChange={(e) => setEditingTemplate({...editingTemplate, subject_ar: e.target.value})}
                        className={`w-full px-4 py-3 rounded-[4px] border focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${theme === "dark" ? "bg-[#1a1a1c] border-gray-800" : "bg-gray-50 border-gray-200"}`}
                      />
                   </div>
                </div>

                <div className="flex justify-end gap-4">
                   <button
                    onClick={() => setEditingTemplate(null)}
                    className="px-6 py-2.5 rounded-[4px] border border-gray-800 hover:bg-gray-500/5 font-bold text-xs uppercase"
                   >
                     Cancel
                   </button>
                   <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-2.5 rounded-[4px] font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
                   >
                      {isSaving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                      DEPLOY TEMPLATE
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
