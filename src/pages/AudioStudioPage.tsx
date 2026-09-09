import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { 
  Music, Volume2, Mic, Sparkles, Sliders, ArrowLeft, ArrowRight,
  Play, Pause, Download, ChevronRight, ChevronLeft, Send, Lock,
  Settings, Cpu, Layers, Disc, Trash2, ArrowUpRight, Check, AlertCircle,
  HelpCircle, Sparkle, RefreshCw
} from 'lucide-react';
import { resolveImageUrl } from '../utils/imageResolver';

type AudioTab = 'tts' | 'stt' | 'music' | 'orchestra';

export const AudioStudioPage: React.FC = () => {
  const { theme, language, siteSettings, dir, user, token, plans, balance, balanceUSD } = useAppContext();
  const navigate = useNavigate();
  const siteName = language === 'ar' ? siteSettings?.siteNameAr : siteSettings?.siteName;
  const logo = theme === 'dark' ? siteSettings?.logoBase64 : (siteSettings?.logoLightBase64 || siteSettings?.logoBase64);
  const isAr = dir === 'rtl';

  const [activeTab, setActiveTab] = useState<AudioTab>('orchestra');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // TTS State
  const [ttsText, setTtsText] = useState('');
  const [ttsGender, setTtsGender] = useState<'male' | 'female'>('female');
  const [ttsTone, setTtsTone] = useState<'natural' | 'professional' | 'energetic' | 'deep'>('natural');
  const [ttsSpeed, setTtsSpeed] = useState<'slow' | 'natural' | 'fast'>('natural');

  // STT State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [sttFile, setSttFile] = useState<File | null>(null);
  const [sttDragOver, setSttDragOver] = useState(false);
  const [recordingWaveform, setRecordingWaveform] = useState<number[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Music State
  const [musicPrompt, setMusicPrompt] = useState('');
  const [musicMood, setMusicMood] = useState<'Epic' | 'Tarab' | 'EDM' | 'Acoustic' | 'LoFi' | 'Jazz' | 'Pop' | 'Classical'>('Tarab');
  const [musicVocal, setMusicVocal] = useState<'Choir' | 'Female' | 'Male' | 'Vocaloid' | 'Instrumental'>('Instrumental');
  const [musicDuration, setMusicDuration] = useState<number>(30);

  // Orchestra State
  const [orchPrompt, setOrchPrompt] = useState('');
  const [orchGenre, setOrchGenre] = useState('ambient');
  const [orchTempo, setOrchTempo] = useState('natural');

  // Plan verification
  const currentPlan = plans?.find((p: any) => p.id?.toString() === user?.subscription?.plan_id?.toString());
  const hasBalance = (balance && balance > 0) || (balanceUSD && balanceUSD > 0);

  // Gating check for tools
  const isToolLocked = (toolId: string) => {
    const limit = currentPlan?.limits?.[toolId];
    if (!limit) return false;
    const isZeroLimit = limit.daily === 0 && limit.monthly === 0;
    return isZeroLimit && !hasBalance;
  };

  // Timer for voice recording animation
  useEffect(() => {
    if (isRecording) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
        // generate random heights for real-time waveform bars
        setRecordingWaveform(prev => {
          const next = [...prev];
          if (next.length > 25) next.shift();
          next.push(Math.floor(Math.random() * 24) + 6);
          return next;
        });
      }, 1000);
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setRecordingSeconds(0);
      setRecordingWaveform([]);
    }
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [isRecording]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setSttDragOver(true);
  };

  const handleDragLeave = () => {
    setSttDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setSttDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.size > 100 * 1024 * 1024) {
        setErrorText(isAr ? 'حجم الملف كبير جداً (الحد الأقصى 100 ميجابايت)' : 'File is too large (maximum 100MB)');
        return;
      }
      setSttFile(file);
      setErrorText(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > 100 * 1024 * 1024) {
        setErrorText(isAr ? 'حجم الملف كبير جداً (الحد الأقصى 100 ميجابايت)' : 'File is too large (maximum 100MB)');
        return;
      }
      setSttFile(file);
      setErrorText(null);
    }
  };

  const triggerGeneration = async (toolId: 'tts' | 'stt' | 'perplexta_music' | 'canvas', promptText: string, additionalParams?: any) => {
    if (isToolLocked(toolId)) {
      setErrorText(isAr ? 'نظراً لقيود باقتك الحالية ومحفظتك، هذا الخيار غير متاح حالياً.' : 'This tool is currently restricted on your plan/credits.');
      return;
    }

    if (!promptText.trim() && toolId !== 'stt') {
      setErrorText(isAr ? 'الرجاء إدخال نص أو وصف صالح.' : 'Please provide a valid prompt or text input.');
      return;
    }

    setIsGenerating(true);
    setErrorText(null);

    try {
      // 1. Post Chat Creation to Server API
      const title = isAr ? `جلسة استوديو الصوت - ${new Date().toLocaleDateString('ar-EG')}` : `Audio Studio Session - ${new Date().toLocaleDateString()}`;
      
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          message: promptText,
          tool: toolId === 'canvas' ? 'canvas' : toolId
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create studio session');
      }

      const chatData = await res.json();

      // 2. Smoothly transition to chat with parameters stored in sessionStorage
      if (additionalParams) {
        sessionStorage.setItem(`audio_params_${chatData.id}`, JSON.stringify(additionalParams));
      }

      navigate(`/chat/${chatData.id}`);
    } catch (err: any) {
      console.error('[AudioStudio] Trigger generation error:', err);
      setErrorText(err.message || (isAr ? 'حدث خطأ في معالجة طلبك' : 'An error occurred processing your request'));
    } finally {
      setIsGenerating(false);
    }
  };

  const executeTTS = () => {
    const prompt = isAr 
      ? `قم بتحويل النص التالي بدقة واحترافية عالية إلى نطق طبيعي مسموع:\n"${ttsText}"\n\n[الإعدادات المحددة]:\n- الجنس: ${ttsGender === 'female' ? 'أنثى' : 'ذكر'}\n- النبرة: ${ttsTone}\n- السرعة: ${ttsSpeed}`
      : `Convert the following text precisely to high-fidelity professional voice narration:\n"${ttsText}"\n\n[Settings]:\n- Gender: ${ttsGender}\n- Tone: ${ttsTone}\n- Speed: ${ttsSpeed}`;
    
    triggerGeneration('tts', prompt, { gender: ttsGender, tone: ttsTone, speed: ttsSpeed });
  };

  const executeSTT = () => {
    if (!sttFile && !isRecording) {
      setErrorText(isAr ? 'الرجاء تحميل ملف صوتي أو بدء التسجيل' : 'Please upload an audio file or start recording');
      return;
    }
    const prompt = isAr
      ? `قم بتفريغ المقطع الصوتي المرفق وتحويله إلى نصوص مكتوبة بدقة بالغة واستخراج المفردات اللغوية بدقة.`
      : `Transcribe the attached audio recording with ultra-high precision, converting speech to highly readable, structured text.`;
    
    triggerGeneration('stt', prompt);
  };

  const executeMusic = () => {
    const prompt = isAr
      ? `قم بتأليف وإنتاج مقطع موسيقي احترافي بناءً على الوصف التالي:\n"${musicPrompt}"\n\n[التنسيق الصوتي والتقني]:\n- النمط والمود: ${musicMood}\n- التوزيع الغنائي: ${musicVocal}\n- المدة الزمنية المستهدفة: ${musicDuration} ثانية`
      : `Compose and synthesize a professional music track based on this prompt:\n"${musicPrompt}"\n\n[Audio Parameters]:\n- Mood/Style: ${musicMood}\n- Vocals: ${musicVocal}\n- Target Duration: ${musicDuration} seconds`;

    triggerGeneration('perplexta_music', prompt, { mood: musicMood, vocalType: musicVocal, duration: musicDuration });
  };

  const executeOrchestra = () => {
    const prompt = isAr
      ? `صمم بيئة أوركسترا وهندسة صوتية متكاملة بـ 3 مراحل (الغلاف، هندسة المقام، الإخراج النهائي) مستنداً على الوصف:\n"${orchPrompt}"`
      : `Produce a 3-phase sound orchestra suite incorporating custom visualization artwork, acoustic workstation parameters, and final cinematic audio for prompt:\n"${orchPrompt}"`;

    triggerGeneration('canvas', prompt, { genre: orchGenre, tempo: orchTempo });
  };

  return (
    <div className="h-screen bg-[var(--surface-page)] text-[var(--text-primary)] font-sans flex flex-col overflow-hidden select-none">
      {/* Platform Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[var(--surface-page)]/90 border-b border-[var(--border-main)] pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)} 
              className="h-9 px-3 flex items-center gap-1.5 rounded-[var(--radius)] bg-[var(--surface-subtle)] border border-[var(--border-main)] text-[var(--text-primary)] hover:text-accent transition-theme active:scale-95 cursor-pointer text-xs font-bold"
            >
              {isAr ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
              <span>{isAr ? 'الرجوع' : 'Back'}</span>
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[8px] bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                <Music className="w-4 h-4 animate-pulse" />
              </div>
              <div className="flex items-center">
                <h1 className="text-sm font-black tracking-wide uppercase leading-tight">
                  {isAr ? 'استوديو الصوت' : 'AUDIO STUDIO'}
                </h1>
              </div>
            </div>
          </div>

          {/* Quick Stats or Logo */}
          <div className="flex items-center gap-2">
            {logo ? (
              <img src={resolveImageUrl(logo, 'general')} alt={siteName} className="w-7 h-7 rounded-[6px] object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-[6px] bg-[var(--surface-subtle)] border border-[var(--border-main)] flex items-center justify-center">
                <Cpu className="w-3.5 h-3.5 text-accent" />
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto max-w-5xl w-full mx-auto px-4 py-3 space-y-3">
        {/* Banner Section */}
        <section className="p-4 sm:p-5 rounded-[var(--radius)] bg-gradient-to-br from-[var(--surface-card)] to-[var(--surface-subtle)] border border-[var(--border-main)] relative overflow-hidden">
          <div className="max-w-3xl relative z-10 space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-[11px] font-black uppercase tracking-wider">
              <Sparkle size={12} className="animate-spin-slow" />
              <span>{isAr ? 'الإنتاج الرقمي الاحترافي' : 'Digital Professional Production'}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight">
              {isAr ? 'مجمع الإبداع وهندسة الصوتيات' : 'Sovereign Acoustic Synthesis Suite'}
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed max-w-2xl">
              {isAr 
                ? 'محيط عمل متكامل يدمج أنظمة توليد النطق وتحويل الصوت لنصوص، مع محركات تلحين الموسيقى وتصميم الألبومات بمراحل أوركسترا متتالية ودقيقة.' 
                : 'A fully-integrated workstation uniting TTS, speech transcribing, music composition, and premium multi-phase album sound orchestration.'}
            </p>
          </div>
          <div className="absolute top-0 right-0 w-36 h-36 bg-accent/5 blur-[80px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-36 h-36 bg-accent/5 blur-[80px] pointer-events-none" />
        </section>

        {/* Tab Navigation Controls - Sticky */}
        <section className="sticky top-14 z-30 bg-[var(--surface-page)]/95 backdrop-blur-md py-1.5 grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { id: 'orchestra', icon: <Sliders className="w-4 h-4" />, titleAr: 'الأوركسترا الصوتية', titleEn: 'Sound Orchestra' },
            { id: 'music', icon: <Disc className="w-4 h-4" />, titleAr: 'الموسيقى والأغاني', titleEn: 'Music & Songs' },
            { id: 'tts', icon: <Volume2 className="w-4 h-4" />, titleAr: 'تحويل النص لصوت', titleEn: 'Text to Speech' },
            { id: 'stt', icon: <Mic className="w-4 h-4" />, titleAr: 'تحويل الصوت لنص', titleEn: 'Speech to Text' },
          ].map((tab) => {
            const isSelected = activeTab === tab.id;
            const isLocked = isToolLocked(tab.id === 'orchestra' ? 'canvas' : tab.id === 'music' ? 'perplexta_music' : tab.id);

            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as AudioTab);
                  setErrorText(null);
                }}
                className={`p-3.5 rounded-[var(--radius)] border font-bold text-xs flex items-center justify-between transition-all duration-200 active:scale-98 cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--bg-accent-emphasis)] text-[var(--fg-on-emphasis)] border-accent shadow-sm'
                    : 'bg-[var(--surface-card)] text-[var(--text-primary)] border-[var(--border-main)] hover:border-accent/40'
                } ${isLocked ? 'opacity-70' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <span className={isSelected ? 'text-inherit' : 'text-accent'}>
                    {tab.icon}
                  </span>
                  <span>{isAr ? tab.titleAr : tab.titleEn}</span>
                </div>
                {isLocked && <Lock size={12} className="text-amber-500 shrink-0 ml-1.5" />}
              </button>
            );
          })}
        </section>

        {/* Error Notification Alert */}
        {errorText && (
          <div className="p-4 rounded-[var(--radius)] bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold flex items-center gap-2.5">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorText}</span>
          </div>
        )}

        {/* Workspace Active Views */}
        <section className="p-6 sm:p-8 rounded-[var(--radius)] bg-[var(--surface-card)] border border-[var(--border-main)] min-h-[300px] flex flex-col justify-between relative shadow-xs">
          
          {/* View 1: Sound Orchestra (Canvas) */}
          {activeTab === 'orchestra' && (
            <div className="space-y-6 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border-main)] pb-3">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-accent" />
                    <h3 className="font-black text-sm uppercase tracking-wider">
                      {isAr ? 'الأوركسترا الصوتية الفنية' : 'Sound Orchestra Workspace'}
                    </h3>
                  </div>
                  <span className="text-[10px] font-black text-accent uppercase tracking-widest bg-accent/10 border border-accent/20 px-2.5 py-0.5 rounded-full">
                    {isAr ? '3 مراحل إنتاج' : '3-Phase Production'}
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-wide">
                    {isAr ? 'صف المفهوم الموسيقي أو السيناريو اللحني' : 'Describe the musical concept or scene'}
                  </label>
                  <textarea
                    value={orchPrompt}
                    onChange={(e) => setOrchPrompt(e.target.value)}
                    placeholder={isAr ? 'مثال: معزوفة عود شرقي حزين مع تداخل الكمان والأصوات الطبيعية الهادئة للأمطار والليل الغامض...' : 'Example: Dramatic cinematic orchestral arrangement with slow ambient violin and natural rain frequencies...'}
                    className="w-full h-32 rounded-[var(--radius)] bg-[var(--surface-subtle)] border border-[var(--border-main)] p-4 text-xs font-bold focus:border-accent focus:outline-none transition-theme leading-relaxed text-[var(--text-primary)]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-wide block">
                      {isAr ? 'التصنيف الموسيقي العام' : 'General Genre'}
                    </label>
                    <select
                      value={orchGenre}
                      onChange={(e) => setOrchGenre(e.target.value)}
                      className="w-full h-10 px-3 rounded-[var(--radius)] bg-[var(--surface-subtle)] border border-[var(--border-main)] text-xs font-bold text-[var(--text-primary)]"
                    >
                      <option value="ambient">{isAr ? 'محيطي / Ambient' : 'Ambient'}</option>
                      <option value="cinematic">{isAr ? 'سينمائي / Cinematic' : 'Cinematic'}</option>
                      <option value="traditional">{isAr ? 'تقليدي شرقي / Tarab' : 'Tarab / Traditional'}</option>
                      <option value="electronic">{isAr ? 'إلكتروني / Techno' : 'Electronic / Techno'}</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-wide block">
                      {isAr ? 'سرعة الإيقاع الإجمالي' : 'Overall Tempo'}
                    </label>
                    <select
                      value={orchTempo}
                      onChange={(e) => setOrchTempo(e.target.value)}
                      className="w-full h-10 px-3 rounded-[var(--radius)] bg-[var(--surface-subtle)] border border-[var(--border-main)] text-xs font-bold text-[var(--text-primary)]"
                    >
                      <option value="slow">{isAr ? 'بطيء / Slow Pace' : 'Slow Pace'}</option>
                      <option value="natural">{isAr ? 'طبيعي / Natural' : 'Natural Speed'}</option>
                      <option value="fast">{isAr ? 'حماسي وسريع / Fast Upbeat' : 'Fast Upbeat'}</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-[var(--border-main)] flex items-center justify-between">
                <p className="text-[10px] text-[var(--text-muted)] font-bold max-w-md">
                  {isAr 
                    ? 'الأوركسترا ستقوم أولاً بتصميم غلاف فني ملائم، ثم هندسة الآلات الصوتية ومقاماتها، لتنتهي بصياغة المقطع الصوتي التفاعلي بالكامل.'
                    : 'Sovereign orchestra automatically synthesizes cover artwork, digital frequency scales, and generates the final high-fidelity audio.'}
                </p>
                <button
                  onClick={executeOrchestra}
                  disabled={isGenerating}
                  className="h-10 px-6 rounded-[var(--radius)] bg-[var(--bg-accent-emphasis)] text-[var(--fg-on-emphasis)] font-black text-xs transition-all flex items-center gap-2 hover:opacity-90 active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isGenerating ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  <span>{isAr ? 'بدء إنتاج الأوركسترا' : 'Launch Orchestra Suite'}</span>
                </button>
              </div>
            </div>
          )}

          {/* View 2: Music & Songs */}
          {activeTab === 'music' && (
            <div className="space-y-6 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border-main)] pb-3">
                  <div className="flex items-center gap-2">
                    <Disc className="w-5 h-5 text-accent" />
                    <h3 className="font-black text-sm uppercase tracking-wider">
                      {isAr ? 'تأليف وتلحين الأغاني والموسيقى' : 'Music & Songs Workstation'}
                    </h3>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-wide">
                    {isAr ? 'ما الذي تود تأليفه؟ صف اللحن أو الأغنية' : 'Describe the track, rhythm, or lyrics'}
                  </label>
                  <textarea
                    value={musicPrompt}
                    onChange={(e) => setMusicPrompt(e.target.value)}
                    placeholder={isAr ? 'مثال: أغنية طرب شرقية هادئة على مقام راست بآلة العود والناي تحاكي الشوق والحنين...' : 'Example: Lofi chill study beat with soft acoustic guitar chords and ambient keyboard layer...'}
                    className="w-full h-32 rounded-[var(--radius)] bg-[var(--surface-subtle)] border border-[var(--border-main)] p-4 text-xs font-bold focus:border-accent focus:outline-none transition-theme leading-relaxed text-[var(--text-primary)]"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-wide block">
                      {isAr ? 'المزاج والحالة اللحنية' : 'Mood & Musical Style'}
                    </label>
                    <select
                      value={musicMood}
                      onChange={(e) => setMusicMood(e.target.value as any)}
                      className="w-full h-10 px-3 rounded-[var(--radius)] bg-[var(--surface-subtle)] border border-[var(--border-main)] text-xs font-bold text-[var(--text-primary)]"
                    >
                      <option value="Tarab">{isAr ? 'طرب شرقي / Tarab' : 'Traditional Tarab'}</option>
                      <option value="Epic">{isAr ? 'أوركسترا ملحمية / Epic Orchestral' : 'Epic Orchestral'}</option>
                      <option value="EDM">{isAr ? 'إلكترونك دي جي / EDM Techno' : 'EDM & Techno'}</option>
                      <option value="Acoustic">{isAr ? 'هادئ غيتار / Acoustic Guitar' : 'Acoustic Guitar'}</option>
                      <option value="LoFi">{isAr ? 'لوفاي مريح / LoFi Study' : 'LoFi Chill'}</option>
                      <option value="Jazz">{isAr ? 'جاز بلوز / Jazz & Blues' : 'Jazz & Blues'}</option>
                      <option value="Pop">{isAr ? 'بوب حماسي / Upbeat Pop' : 'Upbeat Pop'}</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-wide block">
                      {isAr ? 'التوزيع الصوتي والأداء' : 'Vocal Distribution'}
                    </label>
                    <select
                      value={musicVocal}
                      onChange={(e) => setMusicVocal(e.target.value as any)}
                      className="w-full h-10 px-3 rounded-[var(--radius)] bg-[var(--surface-subtle)] border border-[var(--border-main)] text-xs font-bold text-[var(--text-primary)]"
                    >
                      <option value="Instrumental">{isAr ? 'موسيقى فقط (عزف) / Instrumental' : 'Instrumental Only'}</option>
                      <option value="Choir">{isAr ? 'كورال جماعي / Choral Choir' : 'Choral Choir'}</option>
                      <option value="Female">{isAr ? 'صوت أنثوي / Female Voice' : 'Female Lead Voice'}</option>
                      <option value="Male">{isAr ? 'صوت ذكوري / Male Voice' : 'Male Lead Voice'}</option>
                      <option value="Vocaloid">{isAr ? 'صوت مصنع رقمي / AI Synthesizer' : 'AI Synthesizer'}</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-black text-[var(--text-secondary)] uppercase tracking-wide">
                      <span>{isAr ? 'المدة الزمنية (بالثواني)' : 'Target Duration'}</span>
                      <span className="text-accent">{musicDuration}s</span>
                    </div>
                    <div className="h-10 flex items-center">
                      <input
                        type="range"
                        min="10"
                        max="120"
                        step="5"
                        value={musicDuration}
                        onChange={(e) => setMusicDuration(parseInt(e.target.value, 10))}
                        className="w-full accent-accent bg-[var(--surface-subtle)] h-1.5 rounded-lg appearance-none cursor-pointer border border-[var(--border-main)]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-[var(--border-main)] flex items-center justify-between">
                <p className="text-[10px] text-[var(--text-muted)] font-bold max-w-md">
                  {isAr
                    ? 'سيتم توليد وتلحين المقطع الصوتي بدقة بالغة ونقاء صوتي متقدم يطابق معايير الاستوديوهات الرقمية العالمية.'
                    : 'Synthesizes professional grade music streams with clean acoustic patterns based on your prompt details.'}
                </p>
                <button
                  onClick={executeMusic}
                  disabled={isGenerating}
                  className="h-10 px-6 rounded-[var(--radius)] bg-[var(--bg-accent-emphasis)] text-[var(--fg-on-emphasis)] font-black text-xs transition-all flex items-center gap-2 hover:opacity-90 active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isGenerating ? <RefreshCw size={14} className="animate-spin" /> : <Disc size={14} />}
                  <span>{isAr ? 'تأليف اللحن الموسيقي' : 'Compose Audio'}</span>
                </button>
              </div>
            </div>
          )}

          {/* View 3: Text to Speech (TTS) */}
          {activeTab === 'tts' && (
            <div className="space-y-6 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border-main)] pb-3">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-5 h-5 text-accent" />
                    <h3 className="font-black text-sm uppercase tracking-wider">
                      {isAr ? 'تحويل النصوص المكتوبة لنطق طبيعي' : 'Text to Speech Engine'}
                    </h3>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-wide">
                    {isAr ? 'أدخل النص المراد نطقه بطلاقة' : 'Type or paste your text to read'}
                  </label>
                  <textarea
                    value={ttsText}
                    onChange={(e) => setTtsText(e.target.value)}
                    placeholder={isAr ? 'اكتب هنا ما تود سماعه، مثل التقارير الإخبارية، المناهج التعليمية، أو السرد القصصي الاحترافي...' : 'Type anything you want the engine to narrate with high-fidelity, organic voice patterns...'}
                    className="w-full h-32 rounded-[var(--radius)] bg-[var(--surface-subtle)] border border-[var(--border-main)] p-4 text-xs font-bold focus:border-accent focus:outline-none transition-theme leading-relaxed text-[var(--text-primary)]"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-wide block">
                      {isAr ? 'نوع وجنس المعلق' : 'Voice Persona'}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setTtsGender('female')}
                        className={`h-10 rounded-[var(--radius)] border text-xs font-bold transition-all ${
                          ttsGender === 'female'
                            ? 'bg-accent/10 text-accent border-accent'
                            : 'bg-[var(--surface-subtle)] text-[var(--text-primary)] border-[var(--border-main)] hover:border-accent/40'
                        }`}
                      >
                        {isAr ? 'صوت أنثوي' : 'Female Voice'}
                      </button>
                      <button
                        onClick={() => setTtsGender('male')}
                        className={`h-10 rounded-[var(--radius)] border text-xs font-bold transition-all ${
                          ttsGender === 'male'
                            ? 'bg-accent/10 text-accent border-accent'
                            : 'bg-[var(--surface-subtle)] text-[var(--text-primary)] border-[var(--border-main)] hover:border-accent/40'
                        }`}
                      >
                        {isAr ? 'صوت ذكوري' : 'Male Voice'}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-wide block">
                      {isAr ? 'الأسلوب والنبرة الكلامية' : 'Reading Tone'}
                    </label>
                    <select
                      value={ttsTone}
                      onChange={(e) => setTtsTone(e.target.value as any)}
                      className="w-full h-10 px-3 rounded-[var(--radius)] bg-[var(--surface-subtle)] border border-[var(--border-main)] text-xs font-bold text-[var(--text-primary)]"
                    >
                      <option value="natural">{isAr ? 'طبيعي وسردي / Natural' : 'Natural Narrative'}</option>
                      <option value="professional">{isAr ? 'إخباري رسمي / Corporate' : 'Formal Corporate'}</option>
                      <option value="energetic">{isAr ? 'حماسي وتفاعلي / Upbeat' : 'Upbeat Promotional'}</option>
                      <option value="deep">{isAr ? 'سينمائي عميق / Cinematic' : 'Cinematic Deep'}</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-wide block">
                      {isAr ? 'سرعة النطق' : 'Pacing Speed'}
                    </label>
                    <select
                      value={ttsSpeed}
                      onChange={(e) => setTtsSpeed(e.target.value as any)}
                      className="w-full h-10 px-3 rounded-[var(--radius)] bg-[var(--surface-subtle)] border border-[var(--border-main)] text-xs font-bold text-[var(--text-primary)]"
                    >
                      <option value="slow">{isAr ? 'هادئ وبطيء / Calming' : 'Calm & Slow'}</option>
                      <option value="natural">{isAr ? 'طبيعي ومدروس / Regular' : 'Regular'}</option>
                      <option value="fast">{isAr ? 'سريع ومتدفق / Fluent' : 'Fluent & Fast'}</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-[var(--border-main)] flex items-center justify-between">
                <p className="text-[10px] text-[var(--text-muted)] font-bold max-w-md">
                  {isAr
                    ? 'سيتم توليد نطق صوتي نقي وخالٍ من العيوب يحاكي الفصاحة الطبيعية البشرية مع مخارج حروف متقنة.'
                    : 'Synthesizes clean natural speech audio outputs from the provided text string using highly sophisticated parameters.'}
                </p>
                <button
                  onClick={executeTTS}
                  disabled={isGenerating}
                  className="h-10 px-6 rounded-[var(--radius)] bg-[var(--bg-accent-emphasis)] text-[var(--fg-on-emphasis)] font-black text-xs transition-all flex items-center gap-2 hover:opacity-90 active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isGenerating ? <RefreshCw size={14} className="animate-spin" /> : <Volume2 size={14} />}
                  <span>{isAr ? 'توليد النطق الطبيعي' : 'Generate Speech'}</span>
                </button>
              </div>
            </div>
          )}

          {/* View 4: Speech to Text (STT) */}
          {activeTab === 'stt' && (
            <div className="space-y-6 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border-main)] pb-3">
                  <div className="flex items-center gap-2">
                    <Mic className="w-5 h-5 text-accent" />
                    <h3 className="font-black text-sm uppercase tracking-wider">
                      {isAr ? 'تفريغ وتحويل الملفات الصوتية لنصوص مكتوبة' : 'Speech to Text Ingestion Engine'}
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* File Upload Zone */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border border-dashed rounded-[var(--radius)] p-6 flex flex-col items-center justify-center text-center gap-3 min-h-[180px] transition-all relative ${
                      sttDragOver
                        ? 'border-accent bg-accent/5 scale-[1.01]'
                        : 'border-[var(--border-main)] bg-[var(--surface-subtle)] hover:border-accent/40'
                    }`}
                  >
                    <input
                      type="file"
                      id="stt-file-input"
                      accept="audio/*"
                      onChange={handleFileSelect}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <div className="w-12 h-12 rounded-full bg-[var(--surface-card)] border border-[var(--border-main)] flex items-center justify-center text-[var(--text-secondary)] shadow-sm">
                      <Download size={20} className="text-accent" />
                    </div>
                    {sttFile ? (
                      <div className="space-y-1">
                        <p className="text-xs font-black text-[var(--text-primary)] max-w-[240px] truncate">{sttFile.name}</p>
                        <p className="text-[10px] text-accent font-bold">{(sttFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-xs font-black text-[var(--text-primary)]">
                          {isAr ? 'اسحب وأسقط الملف الصوتي هنا' : 'Drag & drop audio file here'}
                        </p>
                        <p className="text-[10px] text-[var(--text-muted)] font-bold">
                          {isAr ? 'أو انقر للتصفح (الحد الأقصى 100 ميجابايت)' : 'or click to browse local storage (max 100MB)'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Microphone Recording Zone */}
                  <div className="border border-[var(--border-main)] rounded-[var(--radius)] bg-[var(--surface-subtle)] p-6 flex flex-col items-center justify-center text-center gap-4 min-h-[180px]">
                    {isRecording ? (
                      <div className="space-y-4 w-full flex flex-col items-center">
                        <div className="flex items-center gap-1.5 h-8">
                          {recordingWaveform.map((height, i) => (
                            <div
                              key={i}
                              style={{ height: `${height}px` }}
                              className="w-1 bg-accent rounded-full transition-all duration-150 animate-pulse"
                            />
                          ))}
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-black text-red-500 animate-pulse flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                            {isAr ? 'جاري تسجيل الصوت المباشر...' : 'Live recording voice...'}
                          </p>
                          <p className="text-xs font-bold text-[var(--text-secondary)]">
                            {Math.floor(recordingSeconds / 60).toString().padStart(2, '0')}:{(recordingSeconds % 60).toString().padStart(2, '0')}
                          </p>
                        </div>
                        <button
                          onClick={() => setIsRecording(false)}
                          className="px-4 py-1.5 rounded-[var(--radius-sm)] bg-red-500/15 text-red-500 text-[10px] font-black border border-red-500/20 uppercase tracking-widest active:scale-95"
                        >
                          {isAr ? 'إيقاف وحفظ التسجيل' : 'Stop & Save'}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3 flex flex-col items-center">
                        <button
                          onClick={() => setIsRecording(true)}
                          className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center shadow-lg active:scale-95 cursor-pointer hover:bg-red-500/15"
                        >
                          <Mic size={24} />
                        </button>
                        <div className="space-y-0.5">
                          <p className="text-xs font-black text-[var(--text-primary)]">
                            {isAr ? 'تسجيل فوري من الميكروفون' : 'Direct Micro Voice Record'}
                          </p>
                          <p className="text-[10px] text-[var(--text-muted)] font-bold">
                            {isAr ? 'سجل ملاحظاتك الصوتية بدقة' : 'Record voice notes and parse with AI'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-[var(--border-main)] flex items-center justify-between">
                <p className="text-[10px] text-[var(--text-muted)] font-bold max-w-md">
                  {isAr
                    ? 'محرك تحويل الصوت إلى نصوص يتميز بمقاومة الضوضاء وتفكيك اللهجات الدارجة بدقة متناهية.'
                    : 'Transcribes human acoustic frequencies and outputs readable formatted text files with metadata extraction.'}
                </p>
                <button
                  onClick={executeSTT}
                  disabled={isGenerating || (!sttFile && !isRecording)}
                  className="h-10 px-6 rounded-[var(--radius)] bg-[var(--bg-accent-emphasis)] text-[var(--fg-on-emphasis)] font-black text-xs transition-all flex items-center gap-2 hover:opacity-90 active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isGenerating ? <RefreshCw size={14} className="animate-spin" /> : <Mic size={14} />}
                  <span>{isAr ? 'تفريغ وتفسير المقطع الصوتي' : 'Transcribe Audio'}</span>
                </button>
              </div>
            </div>
          )}

        </section>

      </main>

      {/* Fixed Bottom Footer Bar */}
      <footer className="flex-shrink-0 z-50 bg-[var(--surface-page)] border-t border-[var(--border-main)] select-none py-3 shadow-md">
        <div className="max-w-5xl w-full mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] sm:text-[11px] text-[var(--text-secondary)]">
          <nav className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 font-bold text-accent">
            <button 
              type="button"
              onClick={() => navigate('/about')} 
              className="cursor-pointer hover:underline bg-transparent border-0 p-0 text-inherit font-inherit transition-colors duration-150"
            >
              {isAr ? 'من نحن' : 'About Us'}
            </button>
            <span className="text-[var(--text-muted)] select-none">•</span>
            <button 
              type="button"
              onClick={() => navigate('/terms')} 
              className="cursor-pointer hover:underline bg-transparent border-0 p-0 text-inherit font-inherit transition-colors duration-150"
            >
              {isAr ? 'شروط الخدمة' : 'Terms of Service'}
            </button>
            <span className="text-[var(--text-muted)] select-none">•</span>
            <button 
              type="button"
              onClick={() => navigate('/privacy')} 
              className="cursor-pointer hover:underline bg-transparent border-0 p-0 text-inherit font-inherit transition-colors duration-150"
            >
              {isAr ? 'سياسة الخصوصية' : 'Privacy Policy'}
            </button>
            <span className="text-[var(--text-muted)] select-none">•</span>
            <button 
              type="button"
              onClick={() => navigate('/copyright')} 
              className="cursor-pointer hover:underline bg-transparent border-0 p-0 text-inherit font-inherit transition-colors duration-150"
            >
              {isAr ? 'حقوق الملكية الفكرية' : 'Intellectual Property'}
            </button>
          </nav>
          <p className="font-sans tracking-wide leading-relaxed text-[var(--text-muted)] whitespace-nowrap text-[9px] sm:text-[11px]">
            {isAr 
              ? 'جميع الحقوق محفوظة © 2026 ViralLinkUp'
              : '© 2026 ViralLinkUp. All rights reserved.'
            }
          </p>
        </div>
      </footer>
    </div>
  );
};

export default AudioStudioPage;
