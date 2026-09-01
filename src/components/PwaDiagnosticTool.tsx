import React, { useState, useEffect } from 'react';
import { Smartphone, CheckCircle2, XCircle, AlertTriangle, RefreshCw, Terminal, Globe, ShieldCheck, Cpu } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { usePwaContext } from '../context/PwaContext';

export const PwaDiagnosticTool: React.FC = () => {
  const { language } = useAppContext();
  const isAr = language === 'ar';
  const pwa = usePwaContext();

  const [isRunning, setIsRunning] = useState(false);
  const [manifestStatus, setManifestStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
  const [manifestError, setManifestError] = useState<string | null>(null);
  const [manifestData, setManifestData] = useState<any>(null);
  const [swStatus, setSwStatus] = useState<'checking' | 'active' | 'unsupported' | 'error'>('checking');
  const [swDetails, setSwDetails] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 19)]);
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    setManifestStatus('checking');
    setManifestError(null);
    setLogs([]);
    addLog(isAr ? 'بدء الفحص التشخيصي الشامل لتطبيق PWA...' : 'Starting comprehensive PWA diagnostic check...');

    // 1. Check Display Mode & Standalone
    const isStandaloneActive = typeof window !== 'undefined' && (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    );
    addLog(`Display Mode: ${isStandaloneActive ? 'standalone (Installed App)' : 'browser (Browser Tab)'}`);

    // 2. Check Platform & Prompt Support
    addLog(`Platform Taxonomy: ${pwa.mobilePlatform}`);
    addLog(`Can Install natively: ${pwa.canInstall ? 'Yes' : 'No'}`);
    addLog(`Has Deferred Prompt: ${pwa.hasPrompt ? 'Available (Ready for promptInstall)' : 'Not available (Will use Instruction Fallback)'}`);

    // 3. Test Manifest Fetch & JSON Parsing
    try {
      addLog('Fetching /manifest.json...');
      const res = await fetch('/manifest.json', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }
      const rawText = await res.text();
      try {
        const parsed = JSON.parse(rawText);
        setManifestData(parsed);
        setManifestStatus('success');
        addLog('Manifest.json successfully fetched and parsed without syntax errors.');
        addLog(`Manifest Name: "${parsed.name || 'N/A'}", Start URL: "${parsed.start_url || '/'}"`);
        addLog(`Icons Count: ${parsed.icons?.length || 0}`);
      } catch (jsonErr: any) {
        setManifestStatus('error');
        setManifestError(`JSON Parse Error: ${jsonErr.message}`);
        addLog(`[ERROR] Manifest JSON Parse Failed: ${jsonErr.message}`);
      }
    } catch (fetchErr: any) {
      setManifestStatus('error');
      setManifestError(`Fetch Failed: ${fetchErr.message}`);
      addLog(`[ERROR] Failed to fetch /manifest.json: ${fetchErr.message}`);
    }

    // 4. Check Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg && reg.active) {
          setSwStatus('active');
          setSwDetails(`Scope: ${reg.scope}, State: ${reg.active.state}`);
          addLog(`Service Worker active: ${reg.scope}`);
        } else {
          setSwStatus('error');
          setSwDetails('Service Worker registered but not active.');
          addLog('[WARN] Service Worker registered but not currently active.');
        }
      } catch (swErr: any) {
        setSwStatus('error');
        setSwDetails(swErr.message);
        addLog(`[ERROR] Service Worker check error: ${swErr.message}`);
      }
    } else {
      setSwStatus('unsupported');
      setSwDetails('Service Worker not supported in this environment.');
      addLog('[WARN] Service Workers are not supported in navigator.');
    }

    setIsRunning(false);
    addLog(isAr ? 'اكتمل الفحص التشخيصي بنجاح.' : 'Diagnostic check completed.');
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  return (
    <div className="p-6 bg-[var(--surface-card)] rounded-[var(--radius)] border border-[var(--border-main)] space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-accent" />
            {isAr ? 'لوحة تشخيص وتدقيق PWA (PWA Diagnostic Hub)' : 'PWA Diagnostic & Debugging Hub'}
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            {isAr 
              ? 'التحقق من حالة عرض التطبيق (Standalone)، سلامة ملف manifest.json، استجابة Service Worker، ودعم متصفحات الهواتف والكمبيوتر.'
              : 'Inspect display-mode: standalone, manifest JSON parsing, service worker status, and mobile/desktop install capability.'}
          </p>
        </div>

        <button
          onClick={runDiagnostics}
          disabled={isRunning}
          className="px-4 py-2 bg-[var(--bg-accent-emphasis)] text-white text-xs font-bold rounded-[var(--radius)] hover:opacity-90 flex items-center gap-2 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
          {isAr ? 'إعادة الفحص' : 'Run Full Diagnostics'}
        </button>
      </div>

      {/* Grid of Key Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Display Mode Card */}
        <div className="p-4 rounded-[var(--radius)] bg-[var(--surface-subtle)] border border-[var(--border-main)] space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-muted)]">
            <span>{isAr ? 'وضع العرض (Display Mode)' : 'Display Mode'}</span>
            {pwa.isStandalone ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 text-amber-500" />}
          </div>
          <p className="text-sm font-bold text-[var(--text-primary)]">
            {pwa.isStandalone ? 'standalone (App Mode)' : 'browser (Tab Mode)'}
          </p>
          <p className="text-[10px] text-[var(--text-secondary)]">
            {pwa.isStandalone ? (isAr ? 'يعمل كتطبيق مستقل بنجاح' : 'Running as standalone app') : (isAr ? 'يعمل داخل تبويب المتصفح' : 'Running inside browser tab')}
          </p>
        </div>

        {/* Manifest Status Card */}
        <div className="p-4 rounded-[var(--radius)] bg-[var(--surface-subtle)] border border-[var(--border-main)] space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-muted)]">
            <span>{isAr ? 'ملف الـ Manifest' : 'Manifest Parse Status'}</span>
            {manifestStatus === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : manifestStatus === 'error' ? (
              <XCircle className="w-4 h-4 text-rose-500" />
            ) : (
              <RefreshCw className="w-4 h-4 animate-spin text-accent" />
            )}
          </div>
          <p className="text-sm font-bold text-[var(--text-primary)]">
            {manifestStatus === 'success' ? (isAr ? 'صحيح وخالٍ من الأخطاء' : 'Valid JSON & Parsed') : manifestStatus === 'error' ? 'Parsing Error' : 'Checking...'}
          </p>
          <p className="text-[10px] text-[var(--text-secondary)]">
            {manifestError || (manifestData ? `${manifestData.icons?.length || 0} icons defined` : 'Loading manifest.json')}
          </p>
        </div>

        {/* Platform & Install Support Card */}
        <div className="p-4 rounded-[var(--radius)] bg-[var(--surface-subtle)] border border-[var(--border-main)] space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-muted)]">
            <span>{isAr ? 'آلية التثبيت (Prompt)' : 'Install Notification Type'}</span>
            {pwa.canInstall ? <ShieldCheck className="w-4 h-4 text-emerald-500" /> : <Smartphone className="w-4 h-4 text-blue-500" />}
          </div>
          <p className="text-sm font-bold text-[var(--text-primary)]">
            {pwa.canInstall ? (pwa.hasPrompt ? 'Direct Native Prompt' : 'Instruction Fallback') : 'Already Installed'}
          </p>
          <p className="text-[10px] text-[var(--text-secondary)]">
            Platform: <span className="font-semibold text-accent">{pwa.mobilePlatform}</span>
          </p>
        </div>

        {/* Service Worker Card */}
        <div className="p-4 rounded-[var(--radius)] bg-[var(--surface-subtle)] border border-[var(--border-main)] space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-muted)]">
            <span>{isAr ? 'عامل الخدمة (Service Worker)' : 'Service Worker'}</span>
            {swStatus === 'active' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 text-amber-500" />}
          </div>
          <p className="text-sm font-bold text-[var(--text-primary)]">
            {swStatus === 'active' ? 'Active & Registered' : swStatus}
          </p>
          <p className="text-[10px] text-[var(--text-secondary)] truncate">
            {swDetails || 'Checking SW...'}
          </p>
        </div>
      </div>

      {/* Sync Verification Notice */}
      <div className="p-4 rounded-[var(--radius)] bg-accent/5 border border-accent/20 flex items-start gap-3">
        <Cpu className="w-5 h-5 text-accent shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <h4 className="font-bold text-[var(--text-primary)]">
            {isAr ? 'تحقق مزامنة إشعارات التثبيت والتعليمات (Sync Verification)' : 'Installation & Instruction Notification Sync Verification'}
          </h4>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            {isAr
              ? 'يتم اختيار نوع الإشعار تلقائياً بناءً على قدرات المتصفح والجهاز: الأجهزة والبرمجيات التي تدعم التثبيت التلقائي (مثل Android Chrome و Desktop Chrome) تعرض زر التثبيت المباشر (Installation Notification)، بينما الأجهزة التي لا تدعم التثبيت التلقائي أو تتطلب خطوات يدوية (مثل iOS Safari) تعرض دليل التعليمات خطوة بخطوة (Instruction Notification). النظام متزامن بالكامل مع حالة تثبيت التطبيق الفعلية.'
              : 'Notifications are dynamically routed based on browser capability: devices supporting automated native installation show direct Install prompts, while restricted environments (like iOS Safari) present step-by-step instruction guides. Fully synchronized with actual installation state.'}
          </p>
          <div className="pt-2 flex items-center gap-3">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5" /> {isAr ? 'دعم التثبيت التلقائي المباشر' : 'Direct Native Install Supported'} ({pwa.hasPrompt ? 'Yes (Prompt Ready)' : 'No (Instruction Guide Active)'})
            </span>
          </div>
        </div>
      </div>

      {/* Live Console Diagnostic Logs */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-[var(--text-primary)]">
          <span className="flex items-center gap-1.5">
            <Terminal className="w-4 h-4 text-accent" />
            {isAr ? 'سجل تشخيص وحدة التحكم (Diagnostic Logs)' : 'Real-time Diagnostic Logs'}
          </span>
          <span className="text-[10px] text-[var(--text-muted)] font-mono">
            {logs.length} events logged
          </span>
        </div>
        <div className="p-3 bg-black/90 text-emerald-400 font-mono text-[11px] rounded-[var(--radius)] h-44 overflow-y-auto space-y-1 border border-gray-800 shadow-inner">
          {logs.map((log, idx) => (
            <div key={idx} className="leading-relaxed whitespace-pre-wrap">
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
