import React, { useState, useEffect } from "react";
import { 
  Send, RefreshCw, Save, Search, Plus, Trash2, Edit, CheckCircle, 
  AlertCircle, Info, ChevronDown, UserCheck, Users, Megaphone
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAppContext } from "../../context/AppContext";

export const MarketingBroadcastView = ({
  theme,
  t,
  dir,
  language,
}: {
  theme: string;
  t: (key: string, replacements?: any) => string;
  dir: string;
  language: string;
}) => {
  const { token, setIsOperationPending } = useAppContext();
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchBroadcasts = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/admin/broadcasts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setBroadcasts(await res.json());
      }
    } catch (err) {
      console.error("Error fetching broadcasts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBroadcasts();

    const handleAdd = () => {
       alert("Sovereign Broadcast Engine - Draft Mode Initialized");
    };

    window.addEventListener("admin-add-broadcast", handleAdd);
    return () => window.removeEventListener("admin-add-broadcast", handleAdd);
  }, [token]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Send size={48} className="text-emerald-500 animate-bounce mb-4" />
        <p className="text-gray-500 font-medium uppercase tracking-widest">BROADCAST ENGINE STARTING...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {broadcasts.map((bc, idx) => (
          <div key={idx} className={`p-6 rounded-[4px] border ${theme === "dark" ? "bg-[#111111] border-gray-800/60" : "bg-white border-gray-100"}`}>
             <div className="flex items-center justify-between mb-4">
                <div className="p-2 rounded-[4px] bg-blue-500/10 text-blue-500">
                  <Megaphone size={18} />
                </div>
                <span className={`text-[10px] font-black px-2 py-1 rounded-[4px] ${bc.status === "sent" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>
                  {bc.status?.toUpperCase() || "PENDING"}
                </span>
             </div>
             <h3 className="font-bold text-sm mb-1">{language === "ar" ? bc.title_ar : bc.title_en}</h3>
             <p className="text-xs text-gray-500 line-clamp-2">{language === "ar" ? bc.message_ar : bc.message_en}</p>
             <div className="mt-4 pt-4 border-t border-gray-800/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <Users size={12} className="text-gray-500" />
                   <span className="text-[10px] font-bold text-gray-500">Target: {bc.target_segment || "All Users"}</span>
                </div>
                <button className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter hover:underline">
                  View Analytics
                </button>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};
