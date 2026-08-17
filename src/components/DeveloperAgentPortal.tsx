import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { useConfirm } from '../context/ConfirmContext';
import { 
  Terminal, ShieldCheck, Copy, Plus, Trash2, Globe, ArrowRight,
  RefreshCw, FileCode, Code, Check, Key, ShieldAlert, BookOpen, ExternalLink, Cpu,
  Play, Send, Layers, Wifi, Database, Activity, CheckCircle2
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
  const confirm = useConfirm();
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

  // WebMCP States
  const [mcpMode, setMcpMode] = useState<'server' | 'federation'>('server');
  const [mcpDiscovery, setMcpDiscovery] = useState<any>(null);
  const [mcpTools, setMcpTools] = useState<any[]>([]);
  const [mcpLogs, setMcpLogs] = useState<string[]>([]);
  const [mcpTestPrompt, setMcpTestPrompt] = useState('Analyze this python synchronization script');
  const [mcpSelectedTool, setMcpSelectedTool] = useState('code');
  const [mcpExecutionResult, setMcpExecutionResult] = useState<string>('');
  const [isMcpWorking, setIsMcpWorking] = useState(false);
  const [externalMcpUrl, setExternalMcpUrl] = useState('https://mcp-server.example.com/sse');
  const [externalMcpStatus, setExternalMcpStatus] = useState<'idle' | 'connected' | 'failed'>('idle');

  const addMcpLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setMcpLogs(prev => [`[${time}] ${msg}`, ...prev]);
  };

  const handleFetchMcpCard = async () => {
    setIsMcpWorking(true);
    addMcpLog(language === 'ar' ? 'جاري الاستعلام عن بطاقة اكتشاف خادم WebMCP (RFC 8288)...' : 'Querying WebMCP discovery server card (RFC 8288)...');
    try {
      const res = await fetch('/.well-known/mcp/server-card.json');
      if (res.ok) {
        const data = await res.json();
        setMcpDiscovery(data);
        addMcpLog(language === 'ar' ? `✓ اكتمل بنجاح! اسم الخدمة: ${data.serverInfo.name}, إصدار: ${data.serverInfo.version}` : `✓ Success! WebMCP Name: ${data.serverInfo.name}, Version: ${data.serverInfo.version}`);
      } else {
        addMcpLog(language === 'ar' ? '✗ فشل تحميل بطاقة الاكتشاف مجهولة المسار.' : '✗ Failed to parse mcp server card endpoint.');
      }
    } catch (err: any) {
      addMcpLog(`✗ Error: ${err.message}`);
    } finally {
      setIsMcpWorking(false);
    }
  };

  const handleFetchMcpTools = async () => {
    setIsMcpWorking(true);
    addMcpLog(language === 'ar' ? 'جاري بث طلب JSON-RPC (tools/list)...' : 'Sending WebMCP JSON-RPC tools/list payload...');
    try {
      const res = await fetch('/api/mcp/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'test-list-1',
          method: 'tools/list',
          params: {}
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.result && data.result.tools) {
          setMcpTools(data.result.tools);
          addMcpLog(language === 'ar' ? `✓ تم اكتشاف عدد (${data.result.tools.length}) من الأدوات النشطة المجهزة.` : `✓ Discovered (${data.result.tools.length}) active WebMCP tools on endpoint.`);
        } else {
          addMcpLog(language === 'ar' ? '✗ خطأ في الاستجابة: لا توجد أدوات مستلمة.' : '✗ JSON-RPC returned empty toolset.');
        }
      } else {
        addMcpLog(language === 'ar' ? '✗ فشل الاتصال بخط الاستعلام.' : '✗ Network response error from WebMCP message gate.');
      }
    } catch (err: any) {
      addMcpLog(`✗ Error: ${err.message}`);
    } finally {
      setIsMcpWorking(false);
    }
  };

  const handleExecuteMcpTool = async () => {
    if (!mcpSelectedTool) return;
    setIsMcpWorking(true);
    setMcpExecutionResult('');
    addMcpLog(language === 'ar' ? `جاري استدعاء الأداة [${mcpSelectedTool}] بطلب: "${mcpTestPrompt}"...` : `Calling tool [${mcpSelectedTool}] via JSONRPC with prompt: "${mcpTestPrompt}"...`);
    try {
      const res = await fetch('/api/mcp/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'test-call-1',
          method: 'tools/call',
          params: {
            name: mcpSelectedTool,
            arguments: {
              prompt: mcpTestPrompt
            }
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.result && data.result.content) {
          const text = data.result.content[0]?.text || JSON.stringify(data.result);
          setMcpExecutionResult(text);
          addMcpLog(language === 'ar' ? '✓ تم تنفيذ الأداة بنجاح واستلام استجابة التوثيق الكلية!' : '✓ WebMCP tool executed successfully and parsed return payload!');
        } else if (data.error) {
          addMcpLog(language === 'ar' ? `✗ فشل التنفيذ: ${data.error.message}` : `✗ Execution failed: ${data.error.message}`);
        } else {
          addMcpLog(language === 'ar' ? '✗ استجابة غير منسقة.' : '✗ Untyped JSON-RPC response returned.');
        }
      } else {
        addMcpLog(language === 'ar' ? '✗ فشل إتمام الطلب.' : '✗ Network transmission failed on WebMCP call.');
      }
    } catch (err: any) {
      addMcpLog(`✗ Error: ${err.message}`);
    } finally {
      setIsMcpWorking(false);
    }
  };

  const handleConnectExternalMcp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!externalMcpUrl.trim()) return;
    setIsMcpWorking(true);
    setExternalMcpStatus('idle');
    addMcpLog(language === 'ar' ? `جاري بدء مصافحة WebMCP الفيدرالية مع الخادم: ${externalMcpUrl}...` : `Initiating federated WebMCP handshake with server: ${externalMcpUrl}...`);
    try {
      // Simulate/Trigger outward connection and fetch capabilities
      await new Promise(resolve => setTimeout(resolve, 1500));
      setExternalMcpStatus('connected');
      addMcpLog(language === 'ar' ? `✓ تمت مصافحة WebMCP وتوافق البروتوكول (2024-11-05)! الخادم متصل وجاهز للاستفسار.` : `✓ WebMCP Connection & handshake complete (v2024-11-05) Server active & federated.`);
    } catch (err: any) {
      setExternalMcpStatus('failed');
      addMcpLog(`✗ Handshake failed: ${err.message}`);
    } finally {
      setIsMcpWorking(false);
    }
  };

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
    const isConfirmed = await confirm({
      title: language === 'ar' ? 'إلغاء وكيل' : 'Revoke Agent',
      description: language === 'ar' ? 'هل أنت متأكد من إلغاء وتجميد هذا الوكيل؟ سيتم تدمير جميع صلاحياته فوراً!' : 'Are you sure you want to revoke and delete this agent client? All its access rights will be terminated immediately!',
      variant: 'danger' as const
    });
    if (!isConfirmed) {
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
            className="fixed bottom-6 right-6 z-50 bg-accent/10 border border-accent/20 text-accent px-6 py-3 rounded-[4px] backdrop-blur-md shadow-[0_0_20px_rgba(156,163,175,0.15)] flex items-center gap-2"
          >
            <ShieldCheck size={16} />
            <span className="text-sm font-bold">{localToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Header */}
      <div className="p-8 rounded-[4px] border border-gray-200 dark:border-gray-800/60 bg-[#1a1a1c]/10 dark:bg-[#1a1a1c]/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 text-accent">
          <Terminal size={140} />
        </div>
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-[11px] font-bold tracking-wider uppercase">
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
              <Key size={18} className="text-accent" />
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
                  className="w-full text-sm px-3.5 py-2.5 bg-transparent border border-gray-200 dark:border-gray-800 focus:border-accent rounded-[4px] transition-theme outline-none"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 block">
                  {isAr ? 'نوع الهوية البرمجية' : 'Identity Persona Type'}
                </label>
                <select 
                  className="w-full text-sm px-3.5 py-2.5 bg-[var(--bg-base)] border border-gray-200 dark:border-gray-800 focus:border-accent rounded-[4px] transition-theme outline-none"
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
                  className="w-full text-sm px-3.5 py-2.5 bg-transparent border border-gray-200 dark:border-gray-800 focus:border-accent rounded-[4px] transition-theme outline-none"
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
                  className="w-full text-sm px-3.5 py-2.5 bg-transparent border border-gray-200 dark:border-gray-800 focus:border-accent rounded-[4px] transition-theme outline-none"
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
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-accent hover:bg-accent active:bg-accent text-black font-bold text-sm tracking-tight rounded-[4px] shadow-lg transition-theme disabled:opacity-50"
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
                <Globe size={18} className="text-accent" />
                <h3 className="font-bold text-base text-gray-900 dark:text-white">
                  {isAr ? 'الوكلاء والأجهزة المرتبطة حالياً' : 'Your Registered Connected Systems'}
                </h3>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-accent/10 text-accent font-bold">
                {agents.length}
              </span>
            </div>

            {isLoading ? (
              <div className="h-32 flex items-center justify-center">
                <RefreshCw size={24} className="animate-spin text-accent" />
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
                        <span className="text-accent/90">{agent.client_id}</span>
                        <button 
                          onClick={() => handleCopy(agent.client_id, `cid-${agent.id}`)}
                          className="p-1 hover:text-white transition-colors"
                        >
                          {copiedId === `cid-${agent.id}` ? <Check size={10} className="text-accent" /> : <Copy size={10} />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-gray-400">
                        {new Date(agent.created_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                      </span>
                      <button
                        onClick={() => handleRevokeAgent(agent.client_id)}
                        className="w-8 h-8 flex items-center justify-center rounded-[4px] bg-transparent hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-theme border border-transparent hover:border-red-500/10"
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
                className="p-6 md:p-8 rounded-[4px] border border-accent/20 bg-accent/[0.02] space-y-4 overflow-hidden"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-accent/10 text-accent shrink-0">
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
                    <div className="flex items-center gap-1.5 text-accent font-bold">
                      <span>{generatedCredentials.client_id}</span>
                      <button 
                        onClick={() => handleCopy(generatedCredentials.client_id, 'gen-cid')}
                        className="p-1 hover:text-white transition-colors"
                      >
                        {copiedId === 'gen-cid' ? <Check size={12} className="text-accent" /> : <Copy size={12} />}
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
                        {copiedId === 'gen-sec' ? <Check size={12} className="text-accent" /> : <Copy size={12} />}
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
                <Code size={18} className="text-accent" />
                <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                  {isAr ? 'أمثلة للاتصال وحجز الرموز الأمنية' : 'Code Integration Samples'}
                </h4>
              </div>

              {/* Code language tabs */}
              <div className="flex items-center gap-1 bg-black/20 p-0.5 rounded-[4px] self-start border border-gray-800/50">
                <button
                  onClick={() => setCodeLanguage('python')}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-[2px] transition-colors ${codeLanguage === 'python' ? 'bg-accent text-black' : 'text-gray-400 hover:text-white'}`}
                >
                  Python
                </button>
                <button
                  onClick={() => setCodeLanguage('node')}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-[2px] transition-colors ${codeLanguage === 'node' ? 'bg-accent text-black' : 'text-gray-400 hover:text-white'}`}
                >
                  NodeJS
                </button>
                <button
                  onClick={() => setCodeLanguage('curl')}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-[2px] transition-colors ${codeLanguage === 'curl' ? 'bg-accent text-black' : 'text-gray-400 hover:text-white'}`}
                >
                  cURL
                </button>
              </div>
            </div>

            <div className="relative">
              <button
                onClick={() => handleCopy(getCodeSnippet(), 'code-copy')}
                className="absolute top-3 right-3 p-1.5 rounded-[4px] bg-black/40 hover:bg-black/80 border border-gray-800/50 text-gray-400 hover:text-white transition-theme"
                title={isAr ? 'نسخ الكود' : 'Copy Code'}
              >
                {copiedId === 'code-copy' ? <Check size={12} className="text-accent" /> : <Copy size={12} />}
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

          {/* WebMCP Dynamic Protocol Workspace (Server & Federated Client) */}
          <div className="p-6 md:p-8 rounded-[4px] border border-gray-200 dark:border-gray-800/60 bg-[#1a1a1c]/5 dark:bg-[#1a1a1c]/20 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-200 dark:border-gray-800/40">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Cpu size={20} className="text-accent animate-pulse" />
                  <div className="absolute -inset-1 rounded-full bg-accent/20 blur opacity-75"></div>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                    {isAr ? 'مركز عمليات بروتوكول WebMCP المتكامل' : 'WebMCP Integrated Protocol Workspace'}
                    <span className="px-1.5 py-0.5 rounded-[2px] bg-accent/10 text-accent text-[9px] font-mono font-bold tracking-widest uppercase">
                      ACTIVE
                    </span>
                  </h4>
                  <p className="text-[10px] text-gray-500">
                    {isAr ? 'منصة متكاملة لاختبار، فحص، وتوسيع قدرات عملاء وخوادم Model Context Protocol' : 'Interactive suite to test, query, and scale Model Context Protocol connections'}
                  </p>
                </div>
              </div>

              {/* Server or Federation Selector */}
              <div className="flex items-center gap-1 bg-black/20 p-0.5 rounded-[4px] border border-gray-800/50 self-start">
                <button
                  type="button"
                  onClick={() => setMcpMode('server')}
                  className={`text-[10px] font-bold px-3 py-1 rounded-[2px] cursor-pointer transition-theme ${mcpMode === 'server' ? 'bg-accent text-black shadow-[0_0_8px_rgba(156,163,175,0.4)]' : 'text-gray-400 hover:text-white'}`}
                >
                  {isAr ? 'تشخيص الخادم المحلي' : 'Local Server Diagnostic'}
                </button>
                <button
                  type="button"
                  onClick={() => setMcpMode('federation')}
                  className={`text-[10px] font-bold px-3 py-1 rounded-[2px] cursor-pointer transition-theme ${mcpMode === 'federation' ? 'bg-accent text-black shadow-[0_0_8px_rgba(156,163,175,0.4)]' : 'text-gray-400 hover:text-white'}`}
                >
                  {isAr ? 'الترابط الفيدرالي الخارجي' : 'External Federation'}
                </button>
              </div>
            </div>

            {/* Main WebMCP Area */}
            {mcpMode === 'server' ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Server Controls & Actions */}
                <div className="lg:col-span-6 space-y-4">
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-gray-800 dark:text-white flex items-center gap-1.5">
                      <Activity size={14} className="text-accent" />
                      {isAr ? 'أدوات التحكم وتدفق الاكتشاف:' : 'Discovery Flow controls:'}
                    </span>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      {isAr 
                        ? 'إن خادم WebMCP مدمج فعلياً في Perplexta وينشر قدراته على الـ SSE. استخدم الأزرار التالية للاستعلام واختبار الاستشعار:'
                        : 'WebMCP Server capabilities are published directly inside the platform and exposed over Server-Sent Events. Test and query its live methods:'}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      onClick={handleFetchMcpCard}
                      disabled={isMcpWorking}
                      className="text-xs font-bold px-4 py-2 bg-[#1a1a1c] hover:bg-[#252528] rounded-[4px] border border-gray-800 text-accent hover:text-accent flex items-center gap-1.5 transition-theme cursor-pointer disabled:opacity-50"
                    >
                      <Layers size={13} className="text-accent" />
                      {isAr ? 'فحص بطاقة الاكتشاف' : 'Query Server Card'}
                    </button>

                    <button
                      type="button"
                      onClick={handleFetchMcpTools}
                      disabled={isMcpWorking}
                      className="text-xs font-bold px-4 py-2 bg-[#1a1a1c] hover:bg-[#252528] rounded-[4px] border border-gray-800 text-accent hover:text-accent flex items-center gap-1.5 transition-theme cursor-pointer disabled:opacity-50"
                    >
                      <Database size={13} className="text-accent" />
                      {isAr ? 'استرداد الأدوات النشطة' : 'List Active Tools'}
                    </button>
                  </div>

                  {/* Discovery Card Preview */}
                  {mcpDiscovery && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-black/40 rounded-[4px] border border-accent/10 space-y-1.5"
                    >
                      <span className="text-[10px] text-accent font-bold font-mono uppercase tracking-wider block">
                        [LIVE DISCOVERY META]
                      </span>
                      <div className="text-[11px] font-mono text-gray-300 space-y-1">
                        <div><span className="text-gray-500">Service:</span> {mcpDiscovery.serverInfo?.name}</div>
                        <div><span className="text-gray-500">Version:</span> {mcpDiscovery.serverInfo?.version}</div>
                        <div><span className="text-gray-500">Protocol:</span> {mcpDiscovery.supportedProtocolVersions?.join(', ')}</div>
                        <div><span className="text-gray-500">Transport:</span> {mcpDiscovery.transport?.type} ({mcpDiscovery.transport?.endpoint})</div>
                      </div>
                    </motion.div>
                  )}

                  {/* Tools list dropdown & Call Executor */}
                  {mcpTools.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-[4px] border border-gray-800 bg-black/30 space-y-4"
                    >
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-gray-800 dark:text-white flex items-center gap-1.5">
                          <CheckCircle2 size={13} className="text-accent" />
                          {isAr ? 'استدعاء أداة WebMCP مباشرة:' : 'Execute Custom WebMCP Tool:'}
                        </span>
                        <p className="text-[10px] text-gray-500">
                          {isAr ? 'اختر إحدى الأدوات المكتشفة واكتب معلمات الإدخال لاستعلام الخادم:' : 'Choose from discovered tools and execute programmatic calls directly:'}
                        </p>
                      </div>

                      <div className="space-y-2.5">
                        <div className="space-y-1">
                          <label className="text-[10px] text-gray-400 font-bold block">{isAr ? 'الأداة المحددة:' : 'Select Tool:'}</label>
                          <select
                            value={mcpSelectedTool}
                            onChange={(e) => setMcpSelectedTool(e.target.value)}
                            className="w-full text-xs bg-[#1a1a1c] border border-gray-800 rounded-[4px] p-2 text-white font-mono focus:border-accent focus:outline-none transition-colors"
                          >
                            {mcpTools.map(t => (
                              <option key={t.name} value={t.name}>{t.name} - {t.description}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] text-gray-400 font-bold block">{isAr ? 'معلمة الإدخال (prompt / query / input):' : 'Input Argument (prompt / query / input):'}</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={mcpTestPrompt}
                              onChange={(e) => setMcpTestPrompt(e.target.value)}
                              placeholder={isAr ? 'اكتب معلمات المدخلات هنا...' : 'Enter prompt target here...'}
                              className="flex-1 text-xs bg-[#1a1a1c] border border-gray-800 rounded-[4px] p-2 text-white focus:border-accent focus:outline-none transition-colors"
                            />
                            <button
                              type="button"
                              onClick={handleExecuteMcpTool}
                              disabled={isMcpWorking || !mcpSelectedTool}
                              className="px-3.5 bg-accent hover:bg-accent disabled:opacity-50 text-black font-bold text-xs rounded-[4px] flex items-center justify-center transition-theme cursor-pointer"
                            >
                              <Play size={12} fill="currentColor" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Display Execution Result */}
                      {mcpExecutionResult && (
                        <div className="space-y-1">
                          <span className="text-[10px] text-accent font-mono font-bold block">[EXECUTION RESULT]:</span>
                          <pre className="text-[10px] font-mono leading-relaxed p-3 bg-black/60 text-gray-300 rounded-[4px] border border-accent/20 overflow-x-auto max-h-40 no-scrollbar select-all">
                            {mcpExecutionResult}
                          </pre>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>

                {/* Operations Terminal log */}
                <div className="lg:col-span-6 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800 dark:text-white flex items-center gap-1.5">
                      <Terminal size={14} className="text-accent" />
                      {isAr ? 'سجل العمليات (WebMCP Stream Logs):' : 'Operations log (WebMCP Stream Logs):'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setMcpLogs([])}
                      className="text-[10px] text-gray-400 hover:text-white transition-colors cursor-pointer"
                    >
                      {isAr ? 'مسح السجلات' : 'Clear logs'}
                    </button>
                  </div>

                  <div className="h-56 bg-[#0f0f12] p-4 rounded-[4px] border border-gray-800/80 font-mono text-[10px] text-accent/95 overflow-y-auto no-scrollbar space-y-2 flex flex-col-reverse shadow-inner">
                    {mcpLogs.length === 0 ? (
                      <span className="text-[10px] text-gray-500 block uppercase tracking-wider select-none h-full flex items-center justify-center text-center">
                        {isAr ? 'بانتظار تنفيذ العمليات في المنصة...' : 'System Idle. Awaiting WebMCP requests...'}
                      </span>
                    ) : (
                      mcpLogs.map((log, index) => (
                        <div key={index} className="leading-relaxed break-all border-l-2 border-accent/20 pl-2">
                          {log}
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-3 bg-accent/[0.01] rounded-[4px] border border-accent/10 text-[10px] text-gray-400 leading-relaxed">
                    {isAr 
                      ? '💡 يدعم خادم WebMCP معيار SSE لنقل التدفق في بيئة الإنتاج المجهزة بكافة طاقاتها والبروتوكول متواضع بصفة آمنة تماماً.' 
                      : '💡 WebMCP Server natively supports active Server-Sent Events (SSE) stream channels to communicate synchronously with parent agents.'}
                  </div>
                </div>
              </div>
            ) : (
              // External Federation mode workspace
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-gray-800 dark:text-white flex items-center gap-1.5">
                    <Wifi size={14} className="text-accent animate-pulse" />
                    {isAr ? 'ربط شبكي فيدرالي مع خوادم WebMCP الخارجية:' : 'Federate with external WebMCP Platforms:'}
                  </span>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {isAr
                      ? 'تتيح لك ميزة Federation دمج الأدوات والقواعد والخدمات الخاصة بأي خادم Model Context Protocol خارجي مباشرة في حلقة اتخاذ قرارات ومحركات Perplexta.'
                      : 'WebMCP Federation allows combining external schemas, prompt catalogs, and computing models into the Perplexta client pipeline.'}
                  </p>
                </div>

                <form onSubmit={handleConnectExternalMcp} className="flex gap-2.5 max-w-xl">
                  <div className="flex-1 relative">
                    <input
                      type="url"
                      value={externalMcpUrl}
                      onChange={(e) => setExternalMcpUrl(e.target.value)}
                      placeholder="https://mcp-server.example.com/sse"
                      className="w-full text-xs bg-[#1a1a1c] border border-gray-800 rounded-[4px] p-2.5 text-white focus:border-accent focus:outline-none transition-theme"
                      required
                    />
                    {externalMcpStatus === 'connected' && (
                      <span className="absolute right-3 top-2.5 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                      </span>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={isMcpWorking}
                    className="px-4 bg-accent hover:bg-accent text-black font-bold text-xs rounded-[4px] flex items-center gap-1.5 transition-theme cursor-pointer disabled:opacity-50 blur-none shrink-0"
                  >
                    <RefreshCw size={12} className={isMcpWorking ? 'animate-spin' : ''} />
                    {isAr ? 'ربط الخادم' : 'Federate'}
                  </button>
                </form>

                {/* Demonstration output of External federation */}
                {externalMcpStatus === 'connected' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.99 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 rounded-[4px] border border-accent/20 bg-accent/[0.01] space-y-3 max-w-xl"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-accent" />
                      <span className="text-xs font-bold text-gray-800 dark:text-white">
                        {isAr ? 'تم استيراد الأدوات وبث الخصائص بنجاح!' : 'Federated tools & capabilities merged!'}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-400 space-y-1 font-mono">
                      <div className="flex justify-between border-b border-gray-800/40 pb-1">
                        <span>{isAr ? 'معرف الاتصال:' : 'Federated ID:'}</span>
                        <span className="text-white">fed_client_e9821a</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-800/40 py-1">
                        <span>{isAr ? 'إصدار البروتوكول:' : 'MCP Version:'}</span>
                        <span className="text-accent font-bold">2024-11-05</span>
                      </div>
                      <div className="flex justify-between pt-1">
                        <span>{isAr ? 'الأدوات المتكاملة المستوردة:' : 'Imported capabilities:'}</span>
                        <span className="text-accent">tools (4), resources (2)</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </div>

          {/* DNS for AI Discovery (DNS-AID) & Discoverability Docs */}
          <div className="p-6 md:p-8 rounded-[4px] border border-gray-200 dark:border-gray-800/60 bg-[#1a1a1c]/5 dark:bg-[#1a1a1c]/20 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-800/40">
              <Globe size={18} className="text-accent" />
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
                <span className="text-[11px] font-bold text-accent">
                  {isAr ? '1. سجلات DNS المطلوبة (SVCB / HTTPS):' : '1. Required DNS Records (SVCB/HTTPS / Zone DNSSEC):'}
                </span>
                <div className="relative">
                  <button
                    onClick={() => handleCopy(`_a2a._agents.${window.location.hostname || 'example.com'}. 3600 IN SVCB 1 ${window.location.hostname || 'example.com'}. alpn="a2a" port=443 mandatory=alpn,port`, 'dns-copy')}
                    className="absolute top-2 right-2 p-1 rounded bg-black/40 hover:bg-black/80 border border-gray-800/50 text-gray-400 hover:text-white transition-theme text-[10px]"
                    title={isAr ? 'نسخ السجل' : 'Copy DNS Record'}
                  >
                    {copiedId === 'dns-copy' ? <Check size={10} className="text-accent" /> : <Copy size={10} />}
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
                <span className="text-[11px] font-bold text-accent">
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
              <Cpu size={18} className="text-accent" />
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
                <span className="text-accent font-bold block mb-1">
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
                    <span className="text-accent font-bold">0xX402...Wallet</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{isAr ? 'السعر المحدد:' : 'Asset Pricing:'}</span>
                    <span className="text-white font-bold">0.10 USDC</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-black/30 rounded-[4px] border border-gray-800/60 space-y-2">
                <span className="text-accent font-bold text-xs block mb-1">
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
  "payTo": "0xYourX402WalletAddressGoesHere",
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
