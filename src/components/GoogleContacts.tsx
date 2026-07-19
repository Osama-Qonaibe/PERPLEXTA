import React, { useState, useEffect } from 'react';
import { 
  googleSignIn, 
  googleSignOut, 
  getGoogleAccessToken, 
  initGoogleAuth,
  setGoogleAccessToken
} from '../lib/googleAuth';
import { 
  Users, Search, Plus, Trash2, Edit2, X, Check, Loader2, 
  UserCheck, LogIn, LogOut, Mail, Phone, MapPin, Cake, 
  Briefcase, FileText, AlertCircle, RefreshCw, UserCheck2, ShieldCheck, HelpCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface GoogleContactsProps {
  dir: 'rtl' | 'ltr';
  theme: 'light' | 'dark' | 'system';
}

interface Contact {
  resourceName: string;
  etag: string;
  name: string;
  givenName: string;
  familyName: string;
  email: string;
  phone: string;
  photoUrl: string;
  organization: string;
  jobTitle: string;
  birthday: string;
  address: string;
  notes: string;
  isDirectoryContact?: boolean;
}

export const GoogleContacts: React.FC<GoogleContactsProps> = ({ dir, theme }) => {
  const isAr = dir === 'rtl';

  // Authentication & Connection State
  const [isConnected, setIsConnected] = useState(false);
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Contacts Lists & Loading
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSource, setActiveSource] = useState<'connections' | 'directory'>('connections');

  // Selected Contact & Form State
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form Fields
  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formOrg, setFormOrg] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Confirmation Modals State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize Google Auth Connection
  useEffect(() => {
    const unsubscribe = initGoogleAuth(
      (user, token) => {
        setIsConnected(true);
        setGoogleUser(user);
        fetchContacts(token);
      },
      () => {
        setIsConnected(false);
        setGoogleUser(null);
        setContacts([]);
      }
    );
    return () => unsubscribe();
  }, []);

  // Filter contacts locally on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredContacts(contacts);
      return;
    }
    const q = searchQuery.toLowerCase();
    const filtered = contacts.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.email.toLowerCase().includes(q) || 
      c.phone.toLowerCase().includes(q) ||
      c.organization.toLowerCase().includes(q)
    );
    setFilteredContacts(filtered);
  }, [searchQuery, contacts]);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setIsConnected(true);
        setGoogleUser(result.user);
        toast.success(
          isAr 
            ? 'تم ربط حساب Google الخاص بك بنجاح!' 
            : 'Successfully connected your Google Account!'
        );
        fetchContacts(result.accessToken);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(
        isAr 
          ? 'فشل الاتصال بحساب Google.' 
          : 'Failed to connect Google Account.'
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await googleSignOut();
      setIsConnected(false);
      setGoogleUser(null);
      setContacts([]);
      setFilteredContacts([]);
      setSelectedContact(null);
      setIsEditing(false);
      setIsCreating(false);
      toast.info(
        isAr 
          ? 'تم فصل حساب Google ومسح الذاكرة المؤقتة.' 
          : 'Google Account disconnected and session memory cleared.'
      );
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch Connections (Personal Contacts)
  const fetchContacts = async (accessToken?: string) => {
    const token = accessToken || getGoogleAccessToken();
    if (!token) return;

    setIsLoading(true);
    setSelectedContact(null);
    setIsEditing(false);
    setIsCreating(false);

    try {
      // Fetch user's connections
      const response = await fetch(
        'https://people.googleapis.com/v1/people/me/connections' +
        '?personFields=names,emailAddresses,phoneNumbers,photos,organizations,birthdays,addresses,biographies' +
        '&pageSize=150',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, clear token and request re-auth
          setGoogleAccessToken(null);
          setIsConnected(false);
          return;
        }
        throw new Error(`Google API returned ${response.status}`);
      }

      const data = await response.json();
      const connections = data.connections || [];

      const parsedContacts: Contact[] = connections.map((conn: any) => {
        const nameObj = conn.names?.[0] || {};
        const emailObj = conn.emailAddresses?.[0] || {};
        const phoneObj = conn.phoneNumbers?.[0] || {};
        const photoObj = conn.photos?.[0] || {};
        const orgObj = conn.organizations?.[0] || {};
        const bdayObj = conn.birthdays?.[0] || {};
        const addrObj = conn.addresses?.[0] || {};
        const bioObj = conn.biographies?.[0] || {};

        return {
          resourceName: conn.resourceName,
          etag: conn.etag,
          name: nameObj.displayName || (isAr ? 'بلا اسم' : 'Unnamed Contact'),
          givenName: nameObj.givenName || '',
          familyName: nameObj.familyName || '',
          email: emailObj.value || '',
          phone: phoneObj.value || '',
          photoUrl: photoObj.url || '',
          organization: orgObj.name || '',
          jobTitle: orgObj.title || '',
          notes: bioObj.value || '',
          birthday: bdayObj.date ? `${bdayObj.date.year || ''}-${bdayObj.date.month || ''}-${bdayObj.date.day || ''}` : '',
          address: addrObj.formattedValue || ''
        };
      });

      setContacts(parsedContacts);
      setFilteredContacts(parsedContacts);
    } catch (err: any) {
      console.error('[GoogleContacts] Fetch connections failed:', err);
      toast.error(
        isAr 
          ? 'تعذر جلب جهات الاتصال. يرجى التحقق من أذونات OAuth.' 
          : 'Could not fetch connections. Please check OAuth permissions.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Search Workspace Directory (Enterprise Contacts)
  const searchDirectory = async () => {
    const token = getGoogleAccessToken();
    if (!token) return;

    if (!searchQuery.trim()) {
      toast.warning(
        isAr 
          ? 'يرجى إدخال استعلام للبحث في دليل المؤسسة.' 
          : 'Please enter a search query to browse organization directory.'
      );
      return;
    }

    setIsLoading(true);
    setSelectedContact(null);
    setIsEditing(false);
    setIsCreating(false);

    try {
      const response = await fetch(
        `https://people.googleapis.com/v1/people:searchDirectory?query=${encodeURIComponent(searchQuery)}` +
        `&readMask=names,emailAddresses,phoneNumbers,photos,organizations` +
        `&sources=DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Directory API returned ${response.status}`);
      }

      const data = await response.json();
      const results = data.people || [];

      const parsedDirectory: Contact[] = results.map((person: any) => {
        const nameObj = person.names?.[0] || {};
        const emailObj = person.emailAddresses?.[0] || {};
        const phoneObj = person.phoneNumbers?.[0] || {};
        const photoObj = person.photos?.[0] || {};
        const orgObj = person.organizations?.[0] || {};

        return {
          resourceName: person.resourceName,
          etag: person.etag || '',
          name: nameObj.displayName || (isAr ? 'بلا اسم' : 'Unnamed Contact'),
          givenName: nameObj.givenName || '',
          familyName: nameObj.familyName || '',
          email: emailObj.value || '',
          phone: phoneObj.value || '',
          photoUrl: photoObj.url || '',
          organization: orgObj.name || '',
          jobTitle: orgObj.title || '',
          notes: '',
          birthday: '',
          address: '',
          isDirectoryContact: true
        };
      });

      setFilteredContacts(parsedDirectory);
      toast.success(
        isAr 
          ? `تم العثور على ${parsedDirectory.length} سجل في دليل المؤسسة.` 
          : `Found ${parsedDirectory.length} entries in organization directory.`
      );
    } catch (err: any) {
      console.error('[GoogleContacts] Search directory failed:', err);
      toast.error(
        isAr 
          ? 'فشل البحث في دليل المؤسسة. قد لا يدعم حسابك هذا الإجراء.' 
          : 'Directory search failed. Your account type may not support directory queries.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Form Initializations
  const handleStartCreate = () => {
    setIsCreating(true);
    setIsEditing(false);
    setSelectedContact(null);
    setFormFirstName('');
    setFormLastName('');
    setFormEmail('');
    setFormPhone('');
    setFormOrg('');
    setFormTitle('');
    setFormNotes('');
  };

  const handleStartEdit = (contact: Contact) => {
    setIsEditing(true);
    setIsCreating(false);
    setFormFirstName(contact.givenName);
    setFormLastName(contact.familyName);
    setFormEmail(contact.email);
    setFormPhone(contact.phone);
    setFormOrg(contact.organization);
    setFormTitle(contact.jobTitle);
    setFormNotes(contact.notes);
  };

  const handleCancelForm = () => {
    setIsEditing(false);
    setIsCreating(false);
  };

  // Trigger Confirmation Modal for Contact Mutations
  const handleSaveTrigger = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFirstName.trim()) {
      toast.error(isAr ? 'الاسم الأول مطلوب.' : 'First Name is required.');
      return;
    }
    setShowSaveModal(true);
  };

  // Execute Contact Creation / Editing
  const handleSaveConfirm = async () => {
    const token = getGoogleAccessToken();
    if (!token) return;

    setIsSaving(true);
    try {
      const payload: any = {
        names: [{ givenName: formFirstName, familyName: formLastName }],
        emailAddresses: formEmail ? [{ value: formEmail, type: 'work' }] : [],
        phoneNumbers: formPhone ? [{ value: formPhone, type: 'work' }] : [],
        organizations: formOrg ? [{ name: formOrg, title: formTitle, type: 'work' }] : [],
        biographies: formNotes ? [{ value: formNotes }] : []
      };

      if (isCreating) {
        // CREATE CONTACT
        const res = await fetch('https://people.googleapis.com/v1/people:createContact', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error(`Create returned ${res.status}`);
        
        toast.success(isAr ? 'تم إنشاء جهة الاتصال بنجاح!' : 'Contact created successfully!');
      } else if (isEditing && selectedContact) {
        // UPDATE CONTACT
        payload.etag = selectedContact.etag;
        
        // Specify the fields to update
        const updateFields = 'names,emailAddresses,phoneNumbers,organizations,biographies';
        
        const res = await fetch(
          `https://people.googleapis.com/v1/${selectedContact.resourceName}:updateContact?updatePersonFields=${updateFields}`,
          {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          }
        );

        if (!res.ok) throw new Error(`Update returned ${res.status}`);
        
        toast.success(isAr ? 'تم تحديث بيانات جهة الاتصال!' : 'Contact details updated successfully!');
      }

      setShowSaveModal(false);
      setIsCreating(false);
      setIsEditing(false);
      // Refresh list
      await fetchContacts(token);
    } catch (err: any) {
      console.error('[GoogleContacts] Save failed:', err);
      toast.error(isAr ? 'فشل حفظ التعديلات.' : 'Failed to save modifications.');
    } finally {
      setIsSaving(false);
    }
  };

  // Trigger Confirmation Modal for Deletion
  const handleDeleteTrigger = (contact: Contact) => {
    setContactToDelete(contact);
    setShowDeleteModal(true);
  };

  // Execute Contact Deletion
  const handleDeleteConfirm = async () => {
    const token = getGoogleAccessToken();
    if (!token || !contactToDelete) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`https://people.googleapis.com/v1/${contactToDelete.resourceName}:deleteContact`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error(`Delete returned ${res.status}`);

      toast.success(isAr ? 'تم حذف جهة الاتصال نهائياً.' : 'Contact permanently deleted.');
      setShowDeleteModal(false);
      setContactToDelete(null);
      setSelectedContact(null);
      await fetchContacts(token);
    } catch (err: any) {
      console.error('[GoogleContacts] Delete failed:', err);
      toast.error(isAr ? 'فشل حذف جهة الاتصال.' : 'Failed to delete contact.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-full font-sans select-none">
      
      {/* 1. DISCONNECTED BANNER / INTRO */}
      {!isConnected ? (
        <div className="p-8 md:p-12 rounded-[var(--radius)] border bg-[var(--bg-secondary)]/60 border-[var(--border)]/40 shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500/5 via-transparent to-transparent pointer-events-none" />
          
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-6 shadow-[0_0_20px_rgba(16,185,129,0.15)] animate-pulse">
            <Users size={32} />
          </div>

          <h2 className="text-xl md:text-2xl font-black tracking-tight mb-3">
            {isAr ? 'مركز ذكاء جهات اتصال Google' : 'Google Contacts Intelligence Hub'}
          </h2>

          <p className="text-xs md:text-sm text-gray-500 max-w-xl leading-relaxed mb-8">
            {isAr 
              ? 'اربط حساب Google الخاص بك لاستيراد جهات الاتصال وإدارتها ومزامنتها مباشرةً في نظام بيربليكستا الاحترافي لربط علاقات المطورين والمؤسسات بمرونة وموثوقية.' 
              : 'Connect your Google Workspace or Personal Account to import, organize, edit, and sync contacts natively in Perplexta. Seamlessly search and manage business networks with zero local storage.'
            }
          </p>

          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="gsi-material-button scale-105 active:scale-95 transition-transform duration-200 cursor-pointer shadow-lg"
          >
            <div className="gsi-material-button-state"></div>
            <div className="gsi-material-button-content-wrapper">
              <div className="gsi-material-button-icon">
                {isConnecting ? (
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                ) : (
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: "block" }}>
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  </svg>
                )}
              </div>
              <span className="gsi-material-button-contents font-semibold">
                {isConnecting 
                  ? (isAr ? 'جاري الاتصال...' : 'CONNECTING...') 
                  : (isAr ? 'ربط جهات اتصال Google' : 'Connect Google Contacts')
                }
              </span>
            </div>
          </button>

          <div className="mt-8 flex items-center gap-2 text-gray-500">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {isAr ? 'أمان وسرية تامة لمزودي الخدمة الطرف الثالث' : 'OAuth 2.0 Secure Sandbox Pipeline'}
            </span>
          </div>
        </div>
      ) : (
        
        /* 2. ACTIVE HUB INTERFACE */
        <div className="space-y-6">
          
          {/* Active Account Status Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl border bg-[var(--bg-secondary)] border-[var(--border)] gap-4">
            <div className="flex items-center gap-3">
              {googleUser?.photoURL ? (
                <img 
                  src={googleUser.photoURL} 
                  alt="Avatar" 
                  className="w-10 h-10 rounded-full border border-emerald-500/20 shadow-md"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                  <UserCheck size={18} />
                </div>
              )}
              <div className="flex flex-col text-start">
                <span className="text-xs font-bold text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)] flex items-center gap-1.5">
                  <UserCheck2 size={12} />
                  {isAr ? 'حساب متصل بنجاح' : 'Google Account Sync Active'}
                </span>
                <span className="text-sm font-black truncate max-w-xs">{googleUser?.displayName || 'Google Member'}</span>
                <span className="text-[10px] text-gray-500 tracking-wide font-mono">{googleUser?.email}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchContacts()}
                disabled={isLoading}
                className="w-10 h-10 flex items-center justify-center rounded-[var(--radius)] border border-transparent hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-400 hover:text-emerald-500 transition-all duration-300"
                title={isAr ? 'تحديث جهات الاتصال' : 'Refresh contacts'}
              >
                <RefreshCw size={16} className={isLoading ? 'animate-spin text-emerald-500' : ''} />
              </button>
              
              <div className="w-px h-5 bg-gray-200 dark:bg-gray-800/80" />

              <button
                onClick={handleDisconnect}
                className="px-3 py-1.5 rounded-[var(--radius)] border border-red-500/20 hover:bg-red-500/10 text-red-500 transition-all duration-300 font-bold text-xs flex items-center gap-1.5"
              >
                <LogOut size={13} />
                <span>{isAr ? 'قطع الاتصال' : 'Disconnect'}</span>
              </button>
            </div>
          </div>

          {/* Core Bento Panels Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* Left Column: Explorer Area */}
            <div className="lg:col-span-5 flex flex-col rounded-xl border bg-[var(--bg-secondary)] border-[var(--border)] overflow-hidden min-h-[500px]">
              
              {/* Explorer Header */}
              <div className="p-4 border-b border-[var(--border)]/50 flex flex-col gap-3 flex-none">
                
                {/* Search Bar with Provider Selector */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={isAr ? 'بحث بالاسم، البريد أو الهاتف...' : 'Search contacts, emails, titles...'}
                      className="w-full pl-9 pr-4 py-2 text-xs rounded-lg bg-[var(--bg-input)] border border-[var(--border)] focus:border-emerald-500 focus:shadow-[0_0_8px_rgba(16,185,129,0.15)] outline-none transition-all duration-200 font-sans"
                    />
                  </div>
                  
                  {activeSource === 'directory' && (
                    <button
                      onClick={searchDirectory}
                      disabled={isLoading}
                      className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
                    >
                      {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                      <span>{isAr ? 'دليل' : 'Search'}</span>
                    </button>
                  )}
                </div>

                {/* Scope Toggles & Add Button */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center bg-gray-100 dark:bg-gray-800/80 p-1 rounded-lg gap-1">
                    <button
                      onClick={() => {
                        setActiveSource('connections');
                        setFilteredContacts(contacts);
                      }}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all duration-300 ${
                        activeSource === 'connections' 
                          ? 'bg-white dark:bg-gray-700 text-emerald-500 shadow-sm' 
                          : 'text-gray-400 hover:text-emerald-500'
                      }`}
                    >
                      {isAr ? 'جهات اتصالي' : 'Connections'}
                    </button>
                    <button
                      onClick={() => {
                        setActiveSource('directory');
                        setFilteredContacts([]);
                      }}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all duration-300 ${
                        activeSource === 'directory' 
                          ? 'bg-white dark:bg-gray-700 text-emerald-500 shadow-sm' 
                          : 'text-gray-400 hover:text-emerald-500'
                      }`}
                    >
                      {isAr ? 'دليل المؤسسة' : 'Directory'}
                    </button>
                  </div>

                  <button
                    onClick={handleStartCreate}
                    className="px-2.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-500 rounded-lg text-xs font-bold flex items-center gap-1 transition-all duration-300 shadow-[0_0_12px_rgba(16,185,129,0.05)]"
                  >
                    <Plus size={13} />
                    <span>{isAr ? 'إضافة اتصال' : 'Add Connection'}</span>
                  </button>
                </div>
              </div>

              {/* Explorer List Area */}
              <div className="flex-1 overflow-y-auto max-h-[480px] custom-scrollbar p-2 space-y-1">
                {isLoading ? (
                  <div className="p-12 flex flex-col items-center justify-center gap-3 text-gray-500">
                    <Loader2 size={24} className="animate-spin text-emerald-500" />
                    <span className="text-xs font-semibold tracking-wider">
                      {isAr ? 'جاري استيراد ومزامنة البيانات...' : 'SYNCING GOOGLE DIRECTORY...'}
                    </span>
                  </div>
                ) : filteredContacts.length > 0 ? (
                  filteredContacts.map(contact => {
                    const isSelected = selectedContact?.resourceName === contact.resourceName;
                    return (
                      <div
                        key={contact.resourceName}
                        onClick={() => {
                          setSelectedContact(contact);
                          setIsEditing(false);
                          setIsCreating(false);
                        }}
                        className={`p-3 rounded-lg flex items-center justify-between cursor-pointer border transition-all duration-300 relative ${
                          isSelected 
                            ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500' 
                            : 'border-transparent hover:bg-gray-50/50 dark:hover:bg-gray-800/10 text-gray-400'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {contact.photoUrl ? (
                            <img 
                              src={contact.photoUrl} 
                              alt="Profile" 
                              className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-800"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold uppercase">{contact.name.substring(0, 2)}</span>
                            </div>
                          )}
                          <div className="flex flex-col text-start min-w-0">
                            <span className={`text-xs font-bold truncate ${isSelected ? 'text-emerald-500 font-extrabold' : 'text-gray-200'}`}>
                              {contact.name}
                            </span>
                            {contact.organization && (
                              <span className="text-[9.5px] text-gray-500 truncate mt-0.5 font-sans flex items-center gap-1">
                                <Briefcase size={9} />
                                {contact.organization} {contact.jobTitle ? `- ${contact.jobTitle}` : ''}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Badges for Directory vs Connection */}
                        {contact.isDirectoryContact ? (
                          <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 uppercase tracking-widest">
                            {isAr ? 'مؤسسي' : 'Domain'}
                          </span>
                        ) : null}

                        {isSelected && (
                          <div className={`absolute top-1/2 -translate-y-1/2 w-[3px] h-4 bg-emerald-500 ${
                            dir === 'rtl' ? 'right-0 rounded-l-[1.5px]' : 'left-0 rounded-r-[1.5px]'
                          }`} />
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-12 text-center flex flex-col items-center justify-center text-gray-500">
                    <Users size={24} className="mb-2 opacity-50 text-gray-400" />
                    <span className="text-xs font-bold">
                      {activeSource === 'directory' 
                        ? (isAr ? 'ابحث في دليل المؤسسة أعلاه.' : 'Search the enterprise directory above.')
                        : (isAr ? 'لا توجد جهات اتصال متوفرة.' : 'No connections available.')
                      }
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Details & Actions Area */}
            <div className="lg:col-span-7 flex flex-col rounded-xl border bg-[var(--bg-secondary)] border-[var(--border)] overflow-hidden min-h-[500px]">
              
              {/* Selected Contact View */}
              {selectedContact && !isEditing && !isCreating && (
                <div className="p-6 md:p-8 flex flex-col h-full text-start justify-between">
                  <div className="space-y-6">
                    
                    {/* Header profile info */}
                    <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 pb-6 border-b border-[var(--border)]/50">
                      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                        {selectedContact.photoUrl ? (
                          <img 
                            src={selectedContact.photoUrl} 
                            alt="Contact Profile" 
                            className="w-16 h-16 rounded-full border-2 border-emerald-500/20 shadow-lg object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/20 text-emerald-500 flex items-center justify-center text-xl font-bold shadow-md uppercase">
                            {selectedContact.name.substring(0, 2)}
                          </div>
                        )}

                        <div className="flex flex-col text-center sm:text-start gap-1">
                          <h3 className="text-lg font-black text-gray-100">{selectedContact.name}</h3>
                          {selectedContact.jobTitle || selectedContact.organization ? (
                            <span className="text-xs font-semibold text-emerald-400 flex items-center justify-center sm:justify-start gap-1">
                              <Briefcase size={12} />
                              {selectedContact.jobTitle} {selectedContact.jobTitle && selectedContact.organization ? 'at' : ''} {selectedContact.organization}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500 italic">{isAr ? 'عضو Google الموثق' : 'Verified Google connection'}</span>
                          )}
                        </div>
                      </div>

                      {/* Top Action Panel */}
                      {!selectedContact.isDirectoryContact && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleStartEdit(selectedContact)}
                            className="w-10 h-10 flex items-center justify-center rounded-lg border border-[var(--border)] hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-400 hover:text-emerald-500 transition-all duration-300"
                            title={isAr ? 'تعديل جهة الاتصال' : 'Edit details'}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteTrigger(selectedContact)}
                            className="w-10 h-10 flex items-center justify-center rounded-lg border border-red-500/10 hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-all duration-300"
                            title={isAr ? 'حذف جهة الاتصال' : 'Delete Contact'}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Meta info details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* Email Card */}
                      <div className="p-4 rounded-lg bg-[var(--bg-base)] border border-[var(--border)]/50 space-y-1">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1">
                          <Mail size={11} className="text-emerald-500" />
                          {isAr ? 'البريد الإلكتروني' : 'Email Address'}
                        </span>
                        <p className="text-xs font-semibold truncate font-mono text-gray-200">
                          {selectedContact.email || <span className="text-gray-500 italic">{isAr ? 'غير محدد' : 'Not specified'}</span>}
                        </p>
                      </div>

                      {/* Phone Card */}
                      <div className="p-4 rounded-lg bg-[var(--bg-base)] border border-[var(--border)]/50 space-y-1">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1">
                          <Phone size={11} className="text-emerald-500" />
                          {isAr ? 'الهاتف المحمول' : 'Phone Number'}
                        </span>
                        <p className="text-xs font-semibold truncate font-mono text-gray-200">
                          {selectedContact.phone || <span className="text-gray-500 italic">{isAr ? 'غير محدد' : 'Not specified'}</span>}
                        </p>
                      </div>

                      {/* Birthday Card */}
                      <div className="p-4 rounded-lg bg-[var(--bg-base)] border border-[var(--border)]/50 space-y-1">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1">
                          <Cake size={11} className="text-emerald-500" />
                          {isAr ? 'تاريخ الميلاد' : 'Birthday'}
                        </span>
                        <p className="text-xs font-semibold text-gray-200">
                          {selectedContact.birthday || <span className="text-gray-500 italic">{isAr ? 'غير محدد' : 'Not specified'}</span>}
                        </p>
                      </div>

                      {/* Address Card */}
                      <div className="p-4 rounded-lg bg-[var(--bg-base)] border border-[var(--border)]/50 space-y-1">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1">
                          <MapPin size={11} className="text-emerald-500" />
                          {isAr ? 'الموقع والعنوان' : 'Location Address'}
                        </span>
                        <p className="text-xs font-semibold text-gray-200">
                          {selectedContact.address || <span className="text-gray-500 italic">{isAr ? 'غير محدد' : 'Not specified'}</span>}
                        </p>
                      </div>

                    </div>

                    {/* Biography / Notes */}
                    <div className="p-4 rounded-lg bg-[var(--bg-base)] border border-[var(--border)]/50 space-y-2">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1">
                        <FileText size={11} className="text-emerald-500" />
                        {isAr ? 'ملاحظات وسياق المهنة' : 'Biography & Professional Context'}
                      </span>
                      <p className="text-xs leading-relaxed text-gray-300">
                        {selectedContact.notes || <span className="text-gray-500 italic">{isAr ? 'لا توجد ملاحظات إضافية مسجلة.' : 'No descriptive notes logged.'}</span>}
                      </p>
                    </div>

                  </div>

                  <div className="pt-6 text-gray-500 text-[10px] tracking-wide border-t border-[var(--border)]/50 flex items-center gap-1.5 mt-6">
                    <ShieldCheck size={12} className="text-emerald-500" />
                    <span>
                      {isAr 
                        ? 'تتم معالجة التغييرات على الفور وتنعكس على جميع أجهزتك المتصلة بـ Google.' 
                        : 'Any changes are synchronized securely back to Google Cloud in real-time.'
                      }
                    </span>
                  </div>
                </div>
              )}

              {/* Form Creation or Editing */}
              {(isCreating || isEditing) && (
                <form onSubmit={handleSaveTrigger} className="p-6 md:p-8 flex flex-col justify-between h-full text-start">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-[var(--border)]/50 pb-4">
                      <h3 className="text-sm font-black text-emerald-500 uppercase tracking-widest">
                        {isCreating 
                          ? (isAr ? 'إضافة اتصال جديد لـ Google' : 'CREATE NEW GOOGLE CONNECTION') 
                          : (isAr ? 'تعديل جهة الاتصال الحالية' : 'EDIT GOOGLE CONTACT DETAILS')
                        }
                      </h3>
                      <button
                        type="button"
                        onClick={handleCancelForm}
                        className="w-8 h-8 flex items-center justify-center rounded-[var(--radius)] text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-all duration-300"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      {/* Given name */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{isAr ? 'الاسم الأول *' : 'First Name *'}</label>
                        <input
                          type="text"
                          required
                          value={formFirstName}
                          onChange={(e) => setFormFirstName(e.target.value)}
                          placeholder={isAr ? 'أدخل الاسم الأول' : 'First name'}
                          className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--bg-input)] border border-[var(--border)] focus:border-emerald-500 focus:shadow-[0_0_8px_rgba(16,185,129,0.15)] outline-none transition-all duration-200"
                        />
                      </div>

                      {/* Family Name */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{isAr ? 'الاسم الأخير' : 'Last Name'}</label>
                        <input
                          type="text"
                          value={formLastName}
                          onChange={(e) => setFormLastName(e.target.value)}
                          placeholder={isAr ? 'الاسم الأخير' : 'Last name'}
                          className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--bg-input)] border border-[var(--border)] focus:border-emerald-500 focus:shadow-[0_0_8px_rgba(16,185,129,0.15)] outline-none transition-all duration-200"
                        />
                      </div>

                      {/* Email */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{isAr ? 'البريد الإلكتروني' : 'Email Address'}</label>
                        <input
                          type="email"
                          value={formEmail}
                          onChange={(e) => setFormEmail(e.target.value)}
                          placeholder="name@company.com"
                          className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--bg-input)] border border-[var(--border)] focus:border-emerald-500 focus:shadow-[0_0_8px_rgba(16,185,129,0.15)] outline-none transition-all duration-200"
                        />
                      </div>

                      {/* Phone */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{isAr ? 'رقم الهاتف' : 'Phone Number'}</label>
                        <input
                          type="tel"
                          value={formPhone}
                          onChange={(e) => setFormPhone(e.target.value)}
                          placeholder="+1 (555) 000-0000"
                          className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--bg-input)] border border-[var(--border)] focus:border-emerald-500 focus:shadow-[0_0_8px_rgba(16,185,129,0.15)] outline-none transition-all duration-200"
                        />
                      </div>

                      {/* Organization */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{isAr ? 'الشركة / المنظمة' : 'Company / Org'}</label>
                        <input
                          type="text"
                          value={formOrg}
                          onChange={(e) => setFormOrg(e.target.value)}
                          placeholder={isAr ? 'الشركة' : 'Enterprise / Org name'}
                          className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--bg-input)] border border-[var(--border)] focus:border-emerald-500 focus:shadow-[0_0_8px_rgba(16,185,129,0.15)] outline-none transition-all duration-200"
                        />
                      </div>

                      {/* Job Title */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{isAr ? 'المسمى الوظيفي' : 'Job Title'}</label>
                        <input
                          type="text"
                          value={formTitle}
                          onChange={(e) => setFormTitle(e.target.value)}
                          placeholder={isAr ? 'المسمى الوظيفي' : 'Software Architect'}
                          className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--bg-input)] border border-[var(--border)] focus:border-emerald-500 focus:shadow-[0_0_8px_rgba(16,185,129,0.15)] outline-none transition-all duration-200"
                        />
                      </div>

                    </div>

                    {/* Notes */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{isAr ? 'سيرة ذاتية / ملاحظات' : 'Biography / Additional Notes'}</label>
                      <textarea
                        value={formNotes}
                        onChange={(e) => setFormNotes(e.target.value)}
                        placeholder={isAr ? 'ملاحظات إضافية عن الاتصال...' : 'Write notes or context regarding your connection...'}
                        className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--bg-input)] border border-[var(--border)] focus:border-emerald-500 focus:shadow-[0_0_8px_rgba(16,185,129,0.15)] outline-none h-24 resize-none transition-all duration-200"
                      />
                    </div>
                  </div>

                  {/* Form Submission Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-6 border-t border-[var(--border)]/50 mt-6">
                    <button
                      type="button"
                      onClick={handleCancelForm}
                      className="px-4 py-2 text-xs font-semibold rounded-[var(--radius)] border border-transparent hover:bg-gray-150 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-all duration-300"
                    >
                      {isAr ? 'إلغاء' : 'Cancel'}
                    </button>
                    
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-[var(--radius)] shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all duration-300"
                    >
                      {isAr ? 'حفظ جهة الاتصال' : 'Save Connection'}
                    </button>
                  </div>
                </form>
              )}

              {/* Empty State Banner when nothing selected */}
              {!selectedContact && !isEditing && !isCreating && (
                <div className="p-8 flex-1 flex flex-col items-center justify-center text-center text-gray-500">
                  <UserCheck size={40} className="mb-4 text-gray-400 opacity-60 animate-bounce" />
                  <h4 className="text-sm font-black mb-1">
                    {isAr ? 'لم يتم تحديد جهة اتصال' : 'No Contact Selected'}
                  </h4>
                  <p className="text-[11px] max-w-xs text-gray-500 leading-relaxed">
                    {isAr 
                      ? 'اختر جهة اتصال من اللوحة الجانبية لعرض بياناتها المفصلة أو تعديلها، أو اضغط على زر الإضافة لتسجيل سجل جديد.' 
                      : 'Select any profile from the connection list to view complete structural info, biography notes, or apply modifications.'
                    }
                  </p>
                </div>
              )}

            </div>

          </div>

          {/* 3. MUTATION / SAVE CONFIRMATION MODAL */}
          {showSaveModal && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setShowSaveModal(false)}
              />
              
              <div className={`relative max-w-sm w-full p-6 rounded-xl border shadow-2xl transition-theme z-10 ${
                theme === 'dark' ? 'bg-[#1a1a1c] border-[#27272a] text-gray-100' : 'bg-white border-gray-150 text-gray-900'
              }`}>
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-4">
                  <ShieldCheck size={20} />
                </div>

                <h3 className="text-base font-bold tracking-tight font-sans text-start">
                  {isAr ? 'تأكيد حفظ جهة الاتصال؟' : 'Confirm Contact Modification?'}
                </h3>
                
                <p className={`text-xs mt-2 font-sans text-start ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} leading-relaxed`}>
                  {isAr 
                    ? 'سيتم إرسال هذا الطلب مباشرةً وتخزينه في حساب Google Contacts الموثق الخاص بك على السحابة.' 
                    : 'This action will write modifications directly into your Google Account in real-time. Do you want to proceed?'
                  }
                </p>
                
                <div className={`flex justify-end gap-2.5 mt-6 ${isAr ? 'flex-row-reverse' : ''}`}>
                  <button
                    type="button"
                    onClick={() => setShowSaveModal(false)}
                    className={`px-4 py-2 text-xs font-semibold rounded-[4px] font-sans transition-all duration-300 ${
                      theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-[#252528]' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                    }`}
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleSaveConfirm}
                    disabled={isSaving}
                    className="px-4 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-[4px] font-sans transition-all duration-300 flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                  >
                    {isSaving && <Loader2 size={12} className="animate-spin" />}
                    <span>{isAr ? 'تأكيد الحفظ' : 'Confirm & Save'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 4. PERMANENT DELETION CONFIRMATION MODAL */}
          {showDeleteModal && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setShowDeleteModal(false)}
              />
              
              <div className={`relative max-w-sm w-full p-6 rounded-xl border shadow-2xl transition-theme z-10 ${
                theme === 'dark' ? 'bg-[#1a1a1c] border-[#27272a] text-gray-100' : 'bg-white border-gray-150 text-gray-900'
              }`}>
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-4">
                  <AlertCircle size={20} />
                </div>

                <h3 className="text-base font-bold tracking-tight font-sans text-start text-red-500 dark:text-red-400">
                  {isAr ? 'حذف جهة الاتصال نهائياً؟' : 'Permanently Delete Contact?'}
                </h3>
                
                <p className={`text-xs mt-2 font-sans text-start ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} leading-relaxed`}>
                  {isAr 
                    ? `هل أنت متأكد تماماً من رغبتك في حذف جهة الاتصال هذه؟ لا يمكن التراجع عن هذا الإجراء وسيتم إزالته فورياً من سحابة Google:` 
                    : `Are you sure you want to permanently delete this contact? This action cannot be undone and will erase the contact record from Google Cloud:`
                  }
                </p>

                <div className={`mt-3 p-3 rounded-lg text-xs font-bold leading-relaxed break-all text-start border ${
                  theme === 'dark' ? 'bg-[#212124] border-[#2d2d31] text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-800'
                }`}>
                  {contactToDelete?.name} ({contactToDelete?.email || (isAr ? 'بلا بريد' : 'No Email')})
                </div>
                
                <div className={`flex justify-end gap-2.5 mt-6 ${isAr ? 'flex-row-reverse' : ''}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteModal(false);
                      setContactToDelete(null);
                    }}
                    className={`px-4 py-2 text-xs font-semibold rounded-[4px] font-sans transition-all duration-300 ${
                      theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-[#252528]' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                    }`}
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleDeleteConfirm}
                    disabled={isDeleting}
                    className="px-4 py-2 text-xs font-bold bg-[#db6b7a] hover:bg-[#c95968] text-white rounded-[4px] font-sans transition-all duration-300 flex items-center gap-1.5 shadow-[0_0_12px_rgba(219,107,122,0.25)]"
                  >
                    {isDeleting && <Loader2 size={12} className="animate-spin" />}
                    <span>{isAr ? 'تأكيد الحذف' : 'Confirm & Delete'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
