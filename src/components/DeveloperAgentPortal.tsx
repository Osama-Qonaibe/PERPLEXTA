import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { 
  Terminal, ShieldCheck, Copy, Plus, Trash2, Globe, ArrowRight,
  RefreshCw, FileCode, Code, Check, Key, ShieldAlert, BookOpen, ExternalLink, Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Agent {
  id: number;
  client_id: string;
  client_name: string;
  identity_type: string;
  credential_type: string;
  redirect_uris: string[];
  jwks_uri: string | null;
  user_agent: string | null;
  created_at: string;
}

export const DeveloperAgentPortal: React.FC = () => {
  const { token, language } = useAppContext();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form State
  const [clientName, setClientName] = useState('');
  const [identityType, setIdentityType] = useState('agent');
  const [userAgent, setUserAgent] = useState('');
  const [redirectUris, setRedirectUris] = useState('');

  // Generated Credentials State
  const [generatedCredentials, setGeneratedCredentials] = useState<{
    client_id: string;
    client_secret: string;
    client_name: string;
  } | null>(null);

  // Active Code Language Tab
  const [codeLanguage, setCodeLanguage] = useState<'python' | 'node' | 'curl'>('python');

  const showToast = (msg: string) => {
    // Falls back to browser native or simple console log, alerts can be simulated smoothly or using a toast
    // But since the parent Page has toast, we can use simple states or native UI if needed. We'll use a local toast.
    setLocalToast(msg);
    setTimeout(() => setLocalToast(null), 3000);
  };
  const [localToast, setLocalToast] = useState<string | null>(null);

  const fetchAgents = async () => {
    if (!token || token === 'null') return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/agents', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAgents(data);
      }
    } catch (err) {
      console.error('Failed to fetch agents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, [token]);

  const handleRegisterAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) return;

    setIsRegistering(true);
    try {
      const payload = {
        client_name: clientName,
        identity_type: identityType,
        user_agent: userAgent || undefined,
        redirect_uris: redirectUris ? redirectUris.split(',').map(u => u.trim()) : undefined
      };

      const res = await fetch('/api/auth/register-agent', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setGeneratedCredentials({
          client_id: data.client_id,
          client_secret: data.client_secret,
          client_name: data.client_name
        });
        setClientName('');
        setUserAgent('');
        setRedirectUris('');
        fetchAgents();
        showToast(language === 'ar' ? 'تم تسجيل الوكيل وتوليد المفاتيح بنجاح!' : 'Agent registered and credentials generated successfully!');
      } else {
        showToast(language === 'ar' ? 'فشل تسجيل الوكيل. الرجاء المحاولة مرة أخرى.' : 'Agent registration failed. Please try again.');
      }
    } catch (err) {
      console.error('Error registering agent:', err);
      showToast(language === 'ar' ? 'حدث خطأ غير متوقع خطأ.' : 'An unexpected error occurred.');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleRevokeAgent = async (clientId: string) => {
    if (!window.confirm(language === 'ar' ? 'هل أنت متأكد من إلغاء وتجميد هذا الوكيل؟ سيتم تدمير جميع صلاحياته فوراً!' : 'Are you sure you want to revoke and delete this agent client? All its access rights will be terminated immediately!')) {
      return;
    }

    try {
      const res = await fetch(`/api/auth/agents/${clientId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        setAgents(prev => prev.filter(a => a.client_id !== clientId));
        if (generatedCredentials?.client_id === clientId) {
          setGeneratedCredentials(null);
        }
        showToast(language === 'ar' ? 'تم إلغاء تصاريح الوكيل بنجاح وحذفه.' : 'Agent client successfully revoked and deleted.');
      } else {
        showToast(language === 'ar' ? 'فشل إتمام العملية.' : 'Failed to process agent revocation.');
      }
    } catch (err) {
      console.error('Error revoking agent:', err);
    }
  };

  const handleCopy = (text: string, labelId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(labelId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getActiveHost = () => {
    return window.location.origin;
  };

  // Integration Code Snippets generator
  const getCodeSnippet = () => {
    const host = getActiveHost();
    const activeClientId = generatedCredentials?.client_id || 'agent_client_your_id';
    const activeClientSecret = generatedCredentials?.client_secret || 'agent_secret_your_secret';

    if (codeLanguage === 'python') {
      return `import requests

# 1. إعداد هويات الاتصال / Setup Credentials
client_id = "${activeClientId}"
client_secret = "${activeClientSecret}"
token_url = "${host}/api/auth/token"

# 2. طلب رمز وصول أمني / Request Oauth Access Token
payload = {
    "grant_type": "client_credentials",
    "client_id": client_id,
    "client_secret": client_secret,
    "scope": "read write"
}

print("جاري الاتصال بـ Perplexta...")
response = requests.post(token_url, data=payload)
if response.status_code == 200:
    token_data = response.json()
    access_token = token_data["access_token"]
    print("✓ تم التحقق بنجاح! رمز الوصول الصالح هو:")
    print(access_token)
    
    # 3. استخدم الرمز في طلبات التحليل / Use the token to process API requests
    # headers = {"Authorization": f"Bearer {access_token}"}
    # result = requests.get("${host}/api/user", headers=headers)
else:
    print("✗ فشل التوثيق:", response.text)`;
    }

    if (codeLanguage === 'node') {
      return `const fetch = require('node-fetch');

async function authenticateAgent() {
  const tokenUrl = '${host}/api/auth/token';
  const credentials = {
    grant_type: 'client_credentials',
    client_id: '${activeClientId}',
    client_secret: '${activeClientSecret}'
  };

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });

  if (response.ok) {
    const data = await response.json();
    console.log('✓ authenticated! Access Token:', data.access_token);
  } else {
    console.error('Failed to authenticate:', await response.text());
  }
}

authenticateAgent();`;
    }

    return `curl -X POST "${host}/api/auth/token" \\
  -H "Content-Type: application/json" \\
  -d '{
    "grant_type": "client_credentials",
    "client_id": "${activeClientId}",
    "client_secret": "${activeClientSecret}"
  }'`;
  };

  const isAr = language === 'ar';

  return (
    <div className="space-y-8 font-tajawal">
      {/* Toast Alert */}
      <AnimatePresence>
        {localToast && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-6 py-3 rounded-[4px] backdrop-blur-md shadow-[0_0_20px_rgba(16,185,129,0.15)] flex items-center gap-2"
          >
            <ShieldCheck size={16} />
            <span className="text-sm font-bold">{localToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Header */}
      <div className="p-8 rounded-[4px] border border-gray-200 dark:border-gray-800/60 bg-[#1a1a1c]/10 dark:bg-[#1a1a1c]/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 text-emerald-500">
          <Terminal size={140} />
        </div>
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[11px] font-bold tracking-wider uppercase">
            <Cpu size={12} />
            {isAr ? 'بروتوكول الوكلاء والأتمتة' : 'AI Bot & Agent Integration Profile'}
          </div>
          <h2 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
            {isAr ? 'بوابة المطورين وتكامل الأنظمة الخارجية' : 'Developer & External Agents Portal'}
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed md:w-[85%]">
            {isAr 
              ? 'تتيح هذه اللوحة لك ولشركائك تفعيل معيار الويب الشامل لتوثيق الوكلاء والبرمجيات الذكية (Webbot Auth RFC 7591) للربط المباشر مع عقل ومنصة Perplexta بسلاسة تامة وتشفير عالي الأمان.'
              : 'This interface allows you to bundle and authenticate external bots, scripts, or workspace automations securely using dynamic private signature registries and OAuth2 cryptographic protocols.'}
          </p>
        </div>
      </div>

      {/* Grid Layout: Create Agent & Active Registry */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Create / Register Form (Column Size 5) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 md:p-8 rounded-[4px] border border-gray-200 dark:border-gray-800/60 bg-[#1a1a1c]/5 dark:bg-[#1a1a1c]/20 space-y-6">
            <div className="flex items-center gap-2.5 pb-4 border-b border-gray-200 dark:border-gray-800/40">
              <Key size={18} className="text-emerald-500" />
              <h3 className="font-bold text-base text-gray-900 dark:text-white">
                {isAr ? 'تسجيل وكيل برامجي جديد' : 'Register New Bot Client'}
              </h3>
            </div>

            <form onSubmit={handleRegisterAgent} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 block">
                  {isAr ? 'اسم الوكيل / التطبيق' : 'Agent / Application Name'} <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text"
                  required
                  placeholder={isAr ? 'مثال: نظام التحليل الآلي، Slack Bot' : 'e.g., Analytical Python Script, Telegram Bot'}
                  className="w-full text-sm px-3.5 py-2.5 bg-transparent border border-gray-200 dark:border-gray-800 focus:border-emerald-500 rounded-[4px] transition-all outline-none"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 block">
                  {isAr ? 'نوع الهوية البرمجية' : 'Identity Persona Type'}
                </label>
                <select 
                  className="w-full text-sm px-3.5 py-2.5 bg-[var(--bg-base)] border border-gray-200 dark:border-gray-800 focus:border-emerald-500 rounded-[4px] transition-all outline-none"
                  value={identityType}
                  onChange={e => setIdentityType(e.target.value)}
                >
                  <option value="agent">{isAr ? 'وكيل ذكاء اصطناعي (AI Agent)' : 'AI Agent Developer'}</option>
                  <option value="bot">{isAr ? 'روبوت محادثة خارجي (Chatbot)' : 'Autonomous External Bot'}</option>
                  <option value="crawler">{isAr ? 'جامع ومحلل بيانات (Data Analytics Bridge)' : 'Data Crawler / Bridge'}</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 block">
                  {isAr ? 'معرف المتصفح المتوقع (User-Agent)' : 'Expected Bot User-Agent (Optional)'}
                </label>
                <input 
                  type="text"
                  placeholder="e.g., PerplextaExternalAgent/1.0"
                  className="w-full text-sm px-3.5 py-2.5 bg-transparent border border-gray-200 dark:border-gray-800 focus:border-emerald-500 rounded-[4px] transition-all outline-none"
                  value={userAgent}
                  onChange={e => setUserAgent(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 block">
                  {isAr ? 'عناوين إعادة التوجيه (Redirect URIs)' : 'Client OAuth Redirect URIs (Optional)'}
                </label>
                <input 
                  type="text"
                  placeholder={isAr ? 'الرابط للتوثيق المنقسم (مفصولة بفاصلة)' : 'Comma-separated URLs, if using interactive auth flows'}
                  className="w-full text-sm px-3.5 py-2.5 bg-transparent border border-gray-200 dark:border-gray-800 focus:border-emerald-500 rounded-[4px] transition-all outline-none"
                  value={redirectUris}
                  onChange={e => setRedirectUris(e.target.value)}
                />
                <span className="text-[10px] text-gray-400 leading-relaxed block select-none">
                  {isAr ? 'اختياري لبوتات التوافق الكلاسيكي أو استرداد بيانات السحابة.' : 'Optional for offline background microservices.'}
                </span>
              </div>

              <button
                type="submit"
                disabled={isRegistering}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-black font-bold text-sm tracking-tight rounded-[4px] shadow-lg transition-all duration-300 disabled:opacity-50"
              >
                {isRegistering ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <>
                    <Plus size={16} />
                    {isAr ? 'إنشاء وتوليد المفاتيح' : 'Register and Generate Keys'}
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: Active Agents & Code Integration Space (Column Size 7) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Active Agents List */}
          <div className="p-6 md:p-8 rounded-[4px] border border-gray-200 dark:border-gray-800/60 bg-[#1a1a1c]/5 dark:bg-[#1a1a1c]/20 space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-800/40">
              <div className="flex items-center gap-2">
                <Globe size={18} className="text-emerald-500" />
                <h3 className="font-bold text-base text-gray-900 dark:text-white">
                  {isAr ? 'الوكلاء والأجهزة المرتبطة حالياً' : 'Your Registered Connected Systems'}
                </h3>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-bold">
                {agents.length}
              </span>
            </div>

            {isLoading ? (
              <div className="h-32 flex items-center justify-center">
                <RefreshCw size={24} className="animate-spin text-emerald-500" />
              </div>
            ) : agents.length === 0 ? (
              <div className="h-32 flex flex-col items-center justify-center text-center space-y-2">
                <span className="text-xs text-gray-400 block select-none">
                  {isAr ? 'لا يوجد لديك أي وكلاء مسجلين حالياً.' : 'No automated client connections configured yet.'}
                </span>
                <span className="text-[10px] text-gray-500 block">
                  {isAr ? 'املأ النموذج على الجانب لإنشاء شريك توثيق خارجي جديد.' : 'Create credentials to start integrating other servers.'}
                </span>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-800/60 max-h-56 overflow-y-auto no-scrollbar">
                {agents.map(agent => (
                  <div key={agent.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-800 dark:text-white">
                          {agent.client_name}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-[2px] bg-gray-50 dark:bg-gray-800 text-gray-400 font-mono tracking-wide uppercase">
                          {agent.identity_type}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 font-mono text-[10px] text-gray-400">
                        <span>ID:</span>
                        <span className="text-emerald-500/90">{agent.client_id}</span>
                        <button 
                          onClick={() => handleCopy(agent.client_id, `cid-${agent.id}`)}
                          className="p-1 hover:text-white transition-colors"
                        >
                          {copiedId === `cid-${agent.id}` ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-gray-400">
                        {new Date(agent.created_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                      </span>
                      <button
                        onClick={() => handleRevokeAgent(agent.client_id)}
                        className="w-8 h-8 flex items-center justify-center rounded-[4px] bg-transparent hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-all duration-300 border border-transparent hover:border-red-500/10"
                        title={isAr ? 'إلغاء وتدمير المفتاح' : 'Revoke credentials'}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Integration Guides & Active Token Generation UI */}
          <AnimatePresence>
            {generatedCredentials && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-6 md:p-8 rounded-[4px] border border-emerald-500/20 bg-emerald-500/[0.02] space-y-4 overflow-hidden"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-emerald-500/10 text-emerald-500 shrink-0">
                    <ShieldAlert size={18} />
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                      {isAr ? 'هام للغاية: انسخ مفاتيح التوثيق الخاصة بالوكيل المولد!' : 'CRITICAL Security Credentials Generated!'}
                    </h4>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      {isAr 
                        ? 'السر السري المولد لا يمكن إبرازه مرة أخرى لدواعي الحماية وتدقيق خوارزمياتنا. الرجاء نسخه وحفظه فوراً.'
                        : 'Your developer environment client secret is only shown once. Copy and store it immediately in a safe env vault.'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 font-mono text-xs p-4 bg-black/40 rounded-[4px] border border-gray-800/80">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-gray-400">Client Name:</span>
                    <span className="text-white font-bold">{generatedCredentials.client_name}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-1.5 border-t border-gray-800/60">
                    <span className="text-gray-400">Client ID:</span>
                    <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                      <span>{generatedCredentials.client_id}</span>
                      <button 
                        onClick={() => handleCopy(generatedCredentials.client_id, 'gen-cid')}
                        className="p-1 hover:text-white transition-colors"
                      >
                        {copiedId === 'gen-cid' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-1.5 border-t border-gray-800/60">
                    <span className="text-gray-400">Client Secret:</span>
                    <div className="flex items-center gap-1.5 text-white font-bold select-all">
                      <span>{generatedCredentials.client_secret}</span>
                      <button 
                        onClick={() => handleCopy(generatedCredentials.client_secret, 'gen-sec')}
                        className="p-1 hover:text-white transition-colors"
                      >
                        {copiedId === 'gen-sec' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Dynamic Code Snippets Explorer Card */}
          <div className="p-6 md:p-8 rounded-[4px] border border-gray-200 dark:border-gray-800/60 bg-[#1a1a1c]/5 dark:bg-[#1a1a1c]/20 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
              <div className="flex items-center gap-2">
                <Code size={18} className="text-emerald-500" />
                <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                  {isAr ? 'أمثلة للاتصال وحجز الرموز الأمنية' : 'Code Integration Samples'}
                </h4>
              </div>

              {/* Code language tabs */}
              <div className="flex items-center gap-1 bg-black/20 p-0.5 rounded-[4px] self-start border border-gray-800/50">
                <button
                  onClick={() => setCodeLanguage('python')}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-[2px] transition-colors ${codeLanguage === 'python' ? 'bg-emerald-500 text-black' : 'text-gray-400 hover:text-white'}`}
                >
                  Python
                </button>
                <button
                  onClick={() => setCodeLanguage('node')}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-[2px] transition-colors ${codeLanguage === 'node' ? 'bg-emerald-500 text-black' : 'text-gray-400 hover:text-white'}`}
                >
                  NodeJS
                </button>
                <button
                  onClick={() => setCodeLanguage('curl')}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-[2px] transition-colors ${codeLanguage === 'curl' ? 'bg-emerald-500 text-black' : 'text-gray-400 hover:text-white'}`}
                >
                  cURL
                </button>
              </div>
            </div>

            <div className="relative">
              <button
                onClick={() => handleCopy(getCodeSnippet(), 'code-copy')}
                className="absolute top-3 right-3 p-1.5 rounded-[4px] bg-black/40 hover:bg-black/80 border border-gray-800/50 text-gray-400 hover:text-white transition-all duration-200"
                title={isAr ? 'نسخ الكود' : 'Copy Code'}
              >
                {copiedId === 'code-copy' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
              </button>
              <pre className="text-[10px] font-mono leading-relaxed p-4 bg-black/50 text-gray-300 rounded-[4px] overflow-x-auto max-h-52 no-scrollbar border border-gray-800/80">
                {getCodeSnippet()}
              </pre>
            </div>

            <div className="flex items-center gap-2 pt-2 text-[11px] text-gray-400">
              <BookOpen size={12} />
              <span>
                {isAr 
                  ? 'تم فحص الكود البرمجي لمطابقة خوادم التشغيل النشطة لديك ديناميكياً.' 
                  : 'Codes automatically mapped with your live workspace origin URLs for direct connection.'}
              </span>
            </div>
          </div>

          {/* DNS for AI Discovery (DNS-AID) & Discoverability Docs */}
          <div className="p-6 md:p-8 rounded-[4px] border border-gray-200 dark:border-gray-800/60 bg-[#1a1a1c]/5 dark:bg-[#1a1a1c]/20 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-800/40">
              <Globe size={18} className="text-emerald-500" />
              <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                {isAr ? 'بروتوكول اكتشاف الوكلاء الذاتي بالـ DNS (DNS-AID)' : 'DNS for AI Discovery (DNS-AID) & Discovery'}
              </h4>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              {isAr 
                ? 'لكي تتمكن برمجيات الذكاء الاصطناعي والباحثين التلقائيين من استكشاف بوابة الوكلاء الخاصة بموقعك فورياً وتلقائياً عبر خوادم أسماء النطاق (DNS)، يمكنك نشر سجلات ServiceMode ومطابقة سجلات HTTP Link ورأس ترويسة الصفحة الرئيسية.'
                : 'To allow external AI clients and autonomous crawlers to find your gateway naturally, configure DNS-AID records on your custom domain alongside HTTP Link headers on the homepage.'}
            </p>

            <div className="space-y-4">
              {/* DNS records block */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-emerald-500">
                  {isAr ? '1. سجلات DNS المطلوبة (SVCB / HTTPS):' : '1. Required DNS Records (SVCB/HTTPS / Zone DNSSEC):'}
                </span>
                <div className="relative">
                  <button
                    onClick={() => handleCopy(`_a2a._agents.${window.location.hostname || 'example.com'}. 3600 IN SVCB 1 ${window.location.hostname || 'example.com'}. alpn="a2a" port=443 mandatory=alpn,port`, 'dns-copy')}
                    className="absolute top-2 right-2 p-1 rounded bg-black/40 hover:bg-black/80 border border-gray-800/50 text-gray-400 hover:text-white transition-all text-[10px]"
                    title={isAr ? 'نسخ السجل' : 'Copy DNS Record'}
                  >
                    {copiedId === 'dns-copy' ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                  </button>
                  <pre className="text-[10px] font-mono leading-relaxed p-3 bg-black/50 text-gray-300 rounded-[4px] overflow-x-auto no-scrollbar border border-gray-800/80">
                    {`_a2a._agents.${window.location.hostname || 'example.com'}. 3600 IN SVCB 1 ${window.location.hostname || 'example.com'}. alpn="a2a" port=443 mandatory=alpn,port`}
                  </pre>
                </div>
                <div className="text-[10px] text-gray-400 leading-relaxed block pl-1">
                  {isAr 
                    ? '💡 نصيحة: تأكد من تفعيل بروتوكول DNSSEC وتوقيع المنطقة لمنع تزوير الطلبات وهجمات حجب الهوية أثناء فحص الوكلاء.'
                    : '💡 High Sec: Sign your DNS zones with DNSSEC so validating agents receive securely authenticated payload assertions.'}
                </div>
              </div>

              {/* Link Headers block */}
              <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-800/40">
                <span className="text-[11px] font-bold text-emerald-500">
                  {isAr ? '2. ترويسة اكتشاف الروابط المعينة (HTTP Link Headers):' : '2. Advertised Link HTTP Response Headers (RFC 8288):'}
                </span>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  {isAr 
                    ? 'لقد قمنا بتثبيت ترويسات الاستجابة مسبقاً في الصفحة الرئيسية للتطبيق تلقائياً، والآن يقوم خادم الويب ببث أطراف التوصيل التالية:'
                    : 'Dynamic HTTP response Link headers are pre-configured to be broadcast on the active site root homepage:'}
                </p>
                <pre className="text-[10px] font-mono leading-relaxed p-3 bg-black/50 text-gray-400 rounded-[4px] overflow-x-auto no-scrollbar border border-gray-800/80 select-all">
                  {`Link: </.well-known/api-catalog>; rel="api-catalog", </.well-known/mcp/server-card.json>; rel="service-desc"`}
                </pre>
              </div>
            </div>
          </div>

          {/* x402 Agent-Native Payments (HTTP 402) */}
          <div className="p-6 md:p-8 rounded-[4px] border border-gray-200 dark:border-gray-800/60 bg-[#1a1a1c]/5 dark:bg-[#1a1a1c]/20 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-800/40">
              <Cpu size={18} className="text-emerald-500" />
              <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                {isAr ? 'بروتوكول الدفع الذاتي للوكلاء (x402 Protocol)' : 'x402 Agent-Native Programmatic Payments'}
              </h4>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              {isAr 
                ? 'يدعم التطبيق بروتوكول الدفع المباشر للوكلاء عبر الويب (RFC 402/x402). عند استعلام الوكلاء البرمجية عن طرف التوصيل المحمي، يعيد النظام تلقائياً رمز الحالة 402 الدفع مطلوب مع معايير السداد الكاملة، حيث تقوم محفظة الوكيل بالدفع الفوري والمتابعة التلقائية.'
                : 'Our platform natively implements the x402 HTTP Payment Protocol (RFC 402). When an agent requests a protected API endpoint, the server returns an HTTP 402 Payment Required response containing payment parameters. The agent\'s wallet automatically settles the micropayment and retries the request.'}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 bg-black/30 rounded-[4px] border border-gray-800/60 space-y-2 font-mono text-xs">
                <span className="text-emerald-400 font-bold block mb-1">
                  {isAr ? '⚙️ طرف التوصيل المحمي برمجياً:' : '⚙️ Protected Resource Endpoint:'}
                </span>
                <div className="text-white bg-black/50 p-2 rounded text-[11px] select-all border border-gray-800/40">
                  {`GET /api/agent/exclusive-analysis`}
                </div>
                <div className="pt-2 text-gray-400 text-[10px] space-y-1">
                  <div className="flex justify-between">
                    <span>{isAr ? 'بروتوكول السداد:' : 'Payment Scheme:'}</span>
                    <span className="text-white font-bold">exact</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{isAr ? 'شبكة العمل المقترحة:' : 'Invoiced Network:'}</span>
                    <span className="text-white font-bold">Base Sepolia</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{isAr ? 'العنوان المستهدف محفظة:' : 'Recipient PayTo:'}</span>
                    <span className="text-emerald-500 font-bold">0x71C7...8976F</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{isAr ? 'السعر المحدد:' : 'Asset Pricing:'}</span>
                    <span className="text-white font-bold">0.10 USDC</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-black/30 rounded-[4px] border border-gray-800/60 space-y-2">
                <span className="text-emerald-400 font-bold text-xs block mb-1">
                  {isAr ? '💻 استجابة ترويسة x402 المتوقعة:' : '💻 Expected HTTP 402 Headers:'}
                </span>
                <p className="text-[10px] text-gray-400">
                  {isAr 
                    ? 'سيقوم الخادم ببث الرؤوس التالية للرد بـ 402 وتحفيز السداد التلقائي:'
                    : 'The server returns custom headers to trigger prompt agent-side programmatic settlement:'}
                </p>
                <pre className="text-[9px] font-mono leading-relaxed p-2.5 bg-black/50 text-gray-300 rounded overflow-x-auto no-scrollbar border border-gray-800/40">
{`HTTP/1.1 402 Payment Required
Payment-Requirements: {
  "scheme": "exact",
  "payTo": "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
  "amount": "100000",
  "asset": "eip155:84532/erc20:..."
}`}
                </pre>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
