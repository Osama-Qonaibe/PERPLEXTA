import React, { useState, useEffect } from "react";
import {
  Sliders,
  X,
  AlertTriangle,
  AlertCircle,
  Sparkles,
  RotateCcw,
  Save,
  ShieldAlert,
} from "lucide-react";

interface NotificationThresholdsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLow?: number;
  currentHigh?: number;
  onSave: (low: number, high: number) => Promise<void>;
  language?: "ar" | "en";
  theme?: "dark" | "light";
}

export const NotificationThresholdsModal: React.FC<NotificationThresholdsModalProps> = ({
  isOpen,
  onClose,
  currentLow = 50,
  currentHigh = 80,
  onSave,
  language = "ar",
  theme = "dark",
}) => {
  const [lowThreshold, setLowThreshold] = useState<number>(currentLow);
  const [highThreshold, setHighThreshold] = useState<number>(currentHigh);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [activePreset, setActivePreset] = useState<string>("custom");

  useEffect(() => {
    setLowThreshold(currentLow || 50);
    setHighThreshold(currentHigh || 80);
  }, [currentLow, currentHigh, isOpen]);

  if (!isOpen) return null;

  const handleLowChange = (val: number) => {
    const clamped = Math.min(Math.max(10, val), highThreshold - 5);
    setLowThreshold(clamped);
    setActivePreset("custom");
  };

  const handleHighChange = (val: number) => {
    const clamped = Math.min(Math.max(lowThreshold + 5, val), 99);
    setHighThreshold(clamped);
    setActivePreset("custom");
  };

  const applyPreset = (presetKey: string, low: number, high: number) => {
    setLowThreshold(low);
    setHighThreshold(high);
    setActivePreset(presetKey);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(lowThreshold, highThreshold);
      onClose();
    } catch (err) {
      console.error("[NotificationThresholdsModal] Save failed:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const isRtl = language === "ar";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden transition-all transform animate-scale-up font-sans ${
          theme === "dark"
            ? "bg-[#161618] border-gray-800 text-white shadow-black/80"
            : "bg-white border-gray-200 text-gray-900 shadow-xl"
        }`}
        onClick={(e) => e.stopPropagation()}
        dir={isRtl ? "rtl" : "ltr"}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-main,#27272a)] bg-accent/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent/15 text-accent border border-accent/20">
              <Sliders size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span>
                  {isRtl
                    ? "إعداد عتبات التنبيهات والإشعارات"
                    : "Notification Trigger Thresholds"}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-accent/10 text-accent font-bold">
                  {isRtl ? "تخصيص كامل" : "Custom Configuration"}
                </span>
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {isRtl
                  ? "تحديد النسبة المئوية المخصصة لتشغيل إشعارات الاستهلاك المبكرة والتنفيذية بدل الافتراضية"
                  : "Configure custom percentage triggers for early status alerts and urgent capacity notices"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 transition-theme cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Preset Buttons */}
          <div>
            <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-2.5">
              {isRtl ? "أنماط التكافؤ المجهزة مسبقاً" : "System Presets"}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => applyPreset("standard", 50, 80)}
                className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activePreset === "standard" || (lowThreshold === 50 && highThreshold === 80)
                    ? "bg-accent/15 border-accent text-accent shadow-sm"
                    : "bg-gray-100 dark:bg-[#202023] border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-700"
                }`}
              >
                <span>{isRtl ? "افتراضي (50% / 80%)" : "Default (50/80)"}</span>
              </button>

              <button
                type="button"
                onClick={() => applyPreset("proactive", 40, 70)}
                className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activePreset === "proactive" || (lowThreshold === 40 && highThreshold === 70)
                    ? "bg-amber-500/15 border-amber-500 text-amber-500 shadow-sm"
                    : "bg-gray-100 dark:bg-[#202023] border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-700"
                }`}
              >
                <Sparkles size={12} />
                <span>{isRtl ? "مبكر (40% / 70%)" : "Early (40/70)"}</span>
              </button>

              <button
                type="button"
                onClick={() => applyPreset("conservative", 60, 90)}
                className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activePreset === "conservative" || (lowThreshold === 60 && highThreshold === 90)
                    ? "bg-blue-500/15 border-blue-500 text-blue-500 shadow-sm"
                    : "bg-gray-100 dark:bg-[#202023] border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-700"
                }`}
              >
                <ShieldAlert size={12} />
                <span>{isRtl ? "محافظ (60% / 90%)" : "Conservative (60/90)"}</span>
              </button>
            </div>
          </div>

          {/* Interactive Sliders */}
          <div className="space-y-5 p-4 rounded-xl bg-gray-50 dark:bg-[#101012] border border-gray-200 dark:border-gray-800/80">
            {/* Low Threshold Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <AlertCircle size={14} />
                  {isRtl
                    ? "عتبة التنبيه الأولية (الاستهلاك المتوسط)"
                    : "Moderate Warning Trigger Threshold"}
                </span>
                <span className="font-mono bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded border border-amber-500/30 font-bold">
                  {lowThreshold}%
                </span>
              </div>
              <input
                type="range"
                min={10}
                max={highThreshold - 5}
                step={5}
                value={lowThreshold}
                onChange={(e) => handleLowChange(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-normal">
                {isRtl
                  ? `عند وصول استهلاك العضو إلى ${lowThreshold}%، يرسل النظام إشعار تنبيه تشغيلي خفيف بدعوة الترقية.`
                  : `Triggers informative status notifications when user quota or memory buffer hits ${lowThreshold}%.`}
              </p>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-800/80 my-3" />

            {/* High Threshold Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                  <AlertTriangle size={14} />
                  {isRtl
                    ? "عتبة التنبيه الحرج (الاستهلاك العالي العاجل)"
                    : "Urgent Critical Trigger Threshold"}
                </span>
                <span className="font-mono bg-red-500/15 text-red-600 dark:text-red-400 px-2 py-0.5 rounded border border-red-500/30 font-bold">
                  {highThreshold}%
                </span>
              </div>
              <input
                type="range"
                min={lowThreshold + 5}
                max={99}
                step={5}
                value={highThreshold}
                onChange={(e) => handleHighChange(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-red-500"
              />
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-normal">
                {isRtl
                  ? `عند الوصول إلى ${highThreshold}%، يتم إرسال تنبيه حرج مستعجل وتوصية بالترقية أو شحن الرصيد لمنع التوقف.`
                  : `Triggers urgent capacity notices when user reaches ${highThreshold}% of allocated limits.`}
              </p>
            </div>
          </div>

          {/* Visual Scale Diagram */}
          <div>
            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-2">
              {isRtl ? "معاينة نطاقات التنبيه المستهدفة" : "Target Alert Zones Visual Spectrum"}
            </span>
            <div className="relative h-6 w-full rounded-lg overflow-hidden flex font-mono text-[10px] font-bold text-white shadow-inner border border-gray-200 dark:border-gray-800">
              {/* Normal Zone */}
              <div
                style={{ width: `${lowThreshold}%` }}
                className="bg-emerald-600/80 flex items-center justify-center transition-all truncate px-1"
                title="Normal Range"
              >
                0 - {lowThreshold}% ({isRtl ? "طبيعي" : "Normal"})
              </div>
              {/* Moderate Zone */}
              <div
                style={{ width: `${highThreshold - lowThreshold}%` }}
                className="bg-amber-500/90 flex items-center justify-center transition-all truncate px-1"
                title="Moderate Alert Zone"
              >
                {lowThreshold}% - {highThreshold}% ({isRtl ? "تنبيه" : "Alert"})
              </div>
              {/* Critical Zone */}
              <div
                style={{ width: `${100 - highThreshold}%` }}
                className="bg-red-600/90 flex items-center justify-center transition-all truncate px-1"
                title="Critical Alert Zone"
              >
                {highThreshold}%+ ({isRtl ? "حرج" : "Critical"})
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-800/80">
            <button
              type="button"
              onClick={() => {
                setLowThreshold(50);
                setHighThreshold(80);
                setActivePreset("standard");
              }}
              className="px-3 py-2 rounded-lg text-xs font-semibold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 flex items-center gap-1.5 transition-theme cursor-pointer"
            >
              <RotateCcw size={14} />
              <span>{isRtl ? "إعادة ضبط" : "Reset Default"}</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-theme cursor-pointer"
              >
                {isRtl ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-lg bg-accent hover:bg-accent/90 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md cursor-pointer"
              >
                {isSaving ? (
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <Save size={15} />
                )}
                <span>{isRtl ? "حفظ العتبات المخصصة" : "Save Thresholds"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
