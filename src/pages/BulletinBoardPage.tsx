import { secureStorage } from "@/lib/storage";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import {
  Megaphone, Plus, Search, Heart, MessageSquare, Share2, Bookmark, Gift,
  Phone, Video, CheckCircle2, Eye, Sparkles,
  Send, X, Wallet, Tag, MessageCircle, Building2, MapPin, Globe, Type,
  UserCheck, UserPlus, Inbox, ArrowRight, ArrowLeft, ShieldCheck, Camera,
  Image as ImageIcon, Filter, ChevronLeft, ChevronRight, Layers, Loader2, BarChart2, ArrowUp, ArrowDown, RefreshCw, Rocket,
  Radio, Clapperboard, Bell, Menu, SlidersHorizontal, Trash2, Ban, Volume2, VolumeX,
  Smile, Users, Compass, ChevronDown, Check, Navigation, Lock, Scissors, Edit2, Upload,
  AtSign, Hash, Settings
} from 'lucide-react';
import { toast } from '../context/NotificationContext';
import { useConfirm } from '../context/ConfirmContext';
import { motion, AnimatePresence } from 'motion/react';
import { BulletinAd, BulletinAdComment, BulletinPage, MediaGalleryItem } from '../../server/db/types';
import { UserAdAnalyticsView } from '../components/UserAdAnalyticsView';
import { PostFeed } from '../components/PostFeed';
import { BoardFeed } from '../components/bulletin/BoardFeed';
import { SavedPostsTab } from '../components/bulletin/SavedPostsTab';
import { InquiriesTab } from '../components/bulletin/InquiriesTab';
import { LiveStreamModal } from '../components/bulletin/LiveStreamModal';
import { AdMessengerHub } from '../components/AdMessengerHub';
import { BoostPostModal } from '../components/BoostPostModal';
import { RecommendationWidget } from '../components/RecommendationWidget';
import { MediaFormatPlayer } from '../components/MediaFormatPlayer';
import { VideoTrimmerModal } from '../components/VideoTrimmerModal';
import { VideoPreviewer } from '../components/VideoPreviewer';
import { ReelsFeed } from '../components/ReelsFeed';
import { StoryUploadModal } from '../components/StoryUploadModal';
import { StoryViewerModal } from '../components/StoryViewerModal';
import { VideoFrameCapture } from '../components/VideoFrameCapture';
import { MediaManagerModal } from '../components/MediaManagerModal';
import { ComposerMediaPreview } from '../components/ComposerMediaPreview';
import { MediaLightboxModal, LightboxMediaItem } from '../components/MediaLightboxModal';
import { triggerHaptic } from '../utils/haptics';
import { BulletinAvatar } from '../components/BulletinAvatar';
import { ImageUploadDropzone } from '../components/ImageUploadDropzone';
import { extractVideoThumbnail, getRecommendedDimensions, getMediaUrl, compressAndResizeImage } from '../utils/mediaUtils';
import { stopAllMedia, getGlobalMuteState, setGlobalMuteState } from '../utils/mediaCoordinator';
import { SOCIAL_COLORS } from '../constants/socialColors';
import { isPathBlocked } from '../utils/sectionVisibility';

const PALESTINE_CITIES = [
  'القدس الشريف',
  'غزة',
  'رام الله والبيرة',
  'نابلس',
  'الخليل',
  'جنين',
  'طولكرم',
  'بيت لحم',
  'أريحا والأغوار',
  'قلقيلية',
  'سلفيت',
  'طوباس',
  'خان يونس',
  'رفح'
];

interface LocationSearchResult {
  display_name: string;
  city: string;
  state?: string;
  country: string;
  country_code?: string;
  lat: string;
  lon: string;
}

const getCountryFlagEmoji = (countryCode?: string, countryName?: string): string => {
  if (countryCode && countryCode.length === 2) {
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  }
  if (!countryName) return '🌐';
  if (countryName.includes('فلسطين')) return '🇵🇸';
  if (countryName.includes('الأردن')) return '🇯🇴';
  if (countryName.includes('السعودية')) return '🇸🇦';
  if (countryName.includes('الإمارات')) return '🇦🇪';
  if (countryName.includes('مصر')) return '🇪🇬';
  if (countryName.includes('قطر')) return '🇶🇦';
  if (countryName.includes('الكويت')) return '🇰🇼';
  if (countryName.includes('عمان') || countryName.includes('عُمان')) return '🇴🇲';
  if (countryName.includes('البحرين')) return '🇧🇭';
  if (countryName.includes('العراق')) return '🇮🇶';
  if (countryName.includes('لبنان')) return '🇱🇧';
  if (countryName.includes('سوريا')) return '🇸🇾';
  if (countryName.includes('اليمن')) return '🇾🇪';
  if (countryName.includes('المغرب')) return '🇲🇦';
  if (countryName.includes('الجزائر')) return '🇩🇿';
  if (countryName.includes('تونس')) return '🇹🇳';
  if (countryName.includes('السودان')) return '🇸🇩';
  if (countryName.includes('تركيا')) return '🇹🇷';
  if (countryName.includes('المملكة المتحدة') || countryName.includes('بريطانيا')) return '🇬🇧';
  if (countryName.includes('الولايات المتحدة') || countryName.includes('أمريكا')) return '🇺🇸';
  if (countryName.includes('ألمانيا')) return '🇩🇪';
  if (countryName.includes('فرنسا')) return '🇫🇷';
  if (countryName.includes('كندا')) return '🇨🇦';
  return '🌍';
};

const COUNTRIES_CITIES_DATA: Record<string, string[]> = {
  'فلسطين': PALESTINE_CITIES,
  'الأردن': ['عمان', 'الزرقاء', 'إربد', 'العقبة', 'السلط', 'مادبا', 'المفرق', 'الكرك', 'الطفيلة', 'معان', 'عجلون', 'جرش'],
  'المملكة العربية السعودية': ['الرياض', 'جدة', 'مكة المكرمة', 'المدينة المنورة', 'الدمام', 'الخبر', 'الأحساء', 'تبوك', 'أبها', 'جازان', 'نجران', 'حائل', 'القصيم'],
  'الإمارات العربية المتحدة': ['دبي', 'أبوظبي', 'الشارقة', 'عجمان', 'رأس الخيمة', 'الفجيرة', 'أم القيوين', 'العين'],
  'مصر': ['القاهرة', 'الإسكندرية', 'الجيزة', 'شرم الشيخ', 'الغردقة', 'بورسعيد', 'السويس', 'المنصورة', 'الأقصر', 'أسوان'],
  'قطر': ['الدوحة', 'الريان', 'الوكرة', 'الخور', 'أم صلال'],
  'الكويت': ['الكويت العاصمة', 'حولي', 'الفروانية', 'الأحمدي', 'الجهراء'],
  'سلطنة عمان': ['مسقط', 'صلالة', 'صحار', 'نزوى', 'صور'],
  'البحرين': ['المنامة', 'المحرق', 'الرفاع', 'مدينة عيسى'],
  'العراق': ['بغداد', 'أربيل', 'البصرة', 'الموصل', 'النجف', 'كربلاء'],
  'لبنان': ['بيروت', 'طرابلس', 'صيدا', 'صور', 'زحلة'],
  'سوريا': ['دمشق', 'حلب', 'حمص', 'اللاذقية', 'حماة'],
  'اليمن': ['صنعاء', 'عدن', 'تعز', 'الحديدة', 'المكلا'],
  'المغرب': ['الرباط', 'الدار البيضاء', 'مراكش', 'فاس', 'طنجة'],
  'الجزائر': ['الجزائر العاصمة', 'وهران', 'قسنطينة', 'عنابة'],
  'تونس': ['تونس العاصمة', 'صفاقس', 'سوسة', 'بنزرت'],
  'السودان': ['الخرطوم', 'أم درمان', 'بورتسودان'],
  'تركيا': ['إسطنبول', 'أنقرة', 'إزمير', 'أنطاليا', 'بورصة'],
  'المملكة المتحدة': ['لندن', 'مانشستر', 'برمنهام', 'ليفربول', 'إدنبرة'],
  'الولايات المتحدة': ['نيويورك', 'لوس أنجلوس', 'شيكاغو', 'ميامي', 'واشنطن']
};

const FEELINGS = [
  { id: 'happy', labelAr: 'سعيد', labelEn: 'Happy', icon: '😊' },
  { id: 'blessed', labelAr: 'مبارك', labelEn: 'Blessed', icon: '😇' },
  { id: 'loved', labelAr: 'محبوب', labelEn: 'Loved', icon: '🥰' },
  { id: 'excited', labelAr: 'متحمس', labelEn: 'Excited', icon: '🤩' },
  { id: 'cool', labelAr: 'رائع', labelEn: 'Cool', icon: '😎' },
  { id: 'grateful', labelAr: 'ممتن', labelEn: 'Grateful', icon: '🙏' },
  { id: 'productive', labelAr: 'منتج', labelEn: 'Productive', icon: '💪' },
  { id: 'inspired', labelAr: 'ملهم', labelEn: 'Inspired', icon: '💡' },
];

export const BulletinBoardPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: routeIdParam, subPath, subId } = useParams<{ id?: string; subPath?: string; subId?: string }>();
  const { language, user, token, setIsAuthModalOpen, theme, siteSettings, isMobile, refreshUser } = useAppContext();
  const isRtl = language === 'ar';

  const resolveActiveTabFromLocation = (): 'board' | 'reels' | 'pages' | 'inquiries' | 'my_ads' | 'analytics' | 'saved' => {
    try {
      if (typeof window !== 'undefined') {
        const path = window.location.pathname.toLowerCase();
        const searchParams = new URLSearchParams(window.location.search);
        const urlTab = searchParams.get('tab');

        if (urlTab === 'inquiries' || path.includes('/inquiries')) return 'inquiries';
        if (path.startsWith('/reels') || path.includes('/reels')) return 'reels';
        if (path.includes('/pages')) return 'pages';
        if (path.includes('/my-ads') || path.includes('/my_ads')) return 'my_ads';
        if (path.includes('/analytics')) return 'analytics';
        if (path.includes('/saved')) return 'saved';
        
        // If explicitly visiting main bulletin/viralbook path without subpath or query param, force board
        if (path === '/viralbook' || path === '/bulletin' || path === '/viralbook/' || path === '/bulletin/') {
          if (urlTab && urlTab !== 'board') {
            const validTabs = ['board', 'reels', 'pages', 'inquiries', 'my_ads', 'analytics', 'saved'];
            if (validTabs.includes(urlTab)) return urlTab as any;
          }
          return 'board';
        }

        // Check legacy query param
        const validTabs = ['board', 'reels', 'pages', 'inquiries', 'my_ads', 'analytics', 'saved'];
        if (urlTab && validTabs.includes(urlTab)) {
          return urlTab as any;
        }

        const savedTab = sessionStorage.getItem('perplexta_bulletin_active_tab');
        if (savedTab && validTabs.includes(savedTab)) {
          return savedTab as any;
        }
      }
    } catch (e) {
      // Ignore sessionStorage errors
    }
    return 'board';
  };

  const [activeTab, setActiveTab] = useState<'board' | 'reels' | 'pages' | 'inquiries' | 'my_ads' | 'analytics' | 'saved'>(resolveActiveTabFromLocation);

  // Synchronize Active Tab with URL location changes (e.g. Header button vs Footer Chat button)
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const urlTab = searchParams.get('tab');
    const path = location.pathname.toLowerCase();

    if (urlTab === 'inquiries' || path.includes('/inquiries')) {
      if (activeTab !== 'inquiries') {
        setActiveTab('inquiries');
        fetchInquiries();
      }
    } else if (path === '/viralbook' || path === '/bulletin' || path === '/viralbook/' || path === '/bulletin/') {
      if (activeTab !== 'board' && !urlTab) {
        setActiveTab('board');
      }
    }
  }, [location.pathname, location.search]);

  // Synchronize Active Tab to SessionStorage & clean URL paths
  useEffect(() => {
    try {
      sessionStorage.setItem('perplexta_bulletin_active_tab', activeTab);
      if (typeof window !== 'undefined') {
        const tabToPathMap: Record<string, string> = {
          board: '/viralbook',
          reels: '/viralbook/reels',
          pages: '/viralbook/pages',
          inquiries: '/viralbook/inquiries',
          my_ads: '/viralbook/my-ads',
          analytics: '/viralbook/analytics',
          saved: '/viralbook/saved'
        };

        const targetPath = tabToPathMap[activeTab] || '/viralbook';
        const currentPath = window.location.pathname;

        const isExactOrSubMatch = currentPath === targetPath || 
          (activeTab === 'board' && (currentPath === '/viralbook' || currentPath === '/bulletin' || /^\/(?:viralbook|bulletin)\/\d+$/.test(currentPath))) ||
          (activeTab === 'reels' && (currentPath.startsWith('/viralbook/reels') || currentPath.startsWith('/reels')));

        if (!isExactOrSubMatch) {
          window.history.replaceState(null, '', targetPath);
        }

        // Clean up legacy query strings (?tab=..., ?post=...)
        if (window.location.search) {
          const url = new URL(window.location.href);
          if (url.searchParams.has('tab')) {
            url.searchParams.delete('tab');
            const cleanSearch = url.searchParams.toString();
            const newCleanUrl = url.pathname + (cleanSearch ? `?${cleanSearch}` : '') + url.hash;
            window.history.replaceState(null, '', newCleanUrl);
          }
        }
      }
    } catch (e) {
      // Ignore
    }
  }, [activeTab]);

  // Persist and restore scroll position on window refresh/navigation
  useEffect(() => {
    try {
      const savedScroll = sessionStorage.getItem(`perplexta_scroll_${activeTab}`);
      if (savedScroll) {
        const scrollY = parseInt(savedScroll, 10);
        if (!isNaN(scrollY) && scrollY > 0) {
          setTimeout(() => {
            window.scrollTo({ top: scrollY, behavior: 'instant' as any });
          }, 80);
        }
      }

      const handleScroll = () => {
        try {
          sessionStorage.setItem(`perplexta_scroll_${activeTab}`, String(window.scrollY));
        } catch (e) {}
      };

      window.addEventListener('scroll', handleScroll, { passive: true });
      return () => window.removeEventListener('scroll', handleScroll);
    } catch (e) {}
  }, [activeTab]);
  const [activeReelModalId, setActiveReelModalId] = useState<number | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  const [messagingAdId, setMessagingAdId] = useState<number | null>(null);
  const [insightsAdId, setInsightsAdId] = useState<number | null>(null);

  const [ads, setAds] = useState<BulletinAd[]>([]);
  const [myAds, setMyAds] = useState<BulletinAd[]>([]);
  const [savedAds, setSavedAds] = useState<BulletinAd[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [isStoryViewerOpen, setIsStoryViewerOpen] = useState(false);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);
  const [previewingVideoStoryId, setPreviewingVideoStoryId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingSaved, setLoadingSaved] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>(() => {
    return secureStorage.getSync('perplexta_user_country') || 'فلسطين';
  });
  const [selectedCity, setSelectedCity] = useState<string>(() => {
    return secureStorage.getSync('perplexta_user_city') || 'all';
  });
  const [selectedRadius, setSelectedRadius] = useState<string>(() => {
    return secureStorage.getSync('perplexta_user_radius') || '10';
  });
  const [isLocationFlyoutOpen, setIsLocationFlyoutOpen] = useState<boolean>(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState<string>('');
  const [autocompleteResults, setAutocompleteResults] = useState<LocationSearchResult[]>([]);
  const [isSearchingGeoLocation, setIsSearchingGeoLocation] = useState<boolean>(false);
  const [isDetectingGps, setIsDetectingGps] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'latest' | 'popular'>('latest');

  const [mousePos, setMousePos] = useState<{ x: number; y: number; isInside: boolean }>({ x: 0, y: 0, isInside: false });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; isOpen: boolean }>({ x: 0, y: 0, isOpen: false });

  // Unified reactive collection of all available video ads for seamless Reels viewing (strictly excluding stories)
  const combinedReelsAds = useMemo(() => {
    const map = new Map<number, BulletinAd>();
    [...ads, ...myAds, ...savedAds].forEach(a => {
      if (a && a.id && a.video_url && a.ad_format !== 'story' && !(a as any).is_story) {
        map.set(Number(a.id), a);
      }
    });
    return Array.from(map.values());
  }, [ads, myAds, savedAds]);

  useEffect(() => {
    if (!locationSearchQuery || locationSearchQuery.trim().length < 2) {
      setAutocompleteResults([]);
      setIsSearchingGeoLocation(false);
      return;
    }

    setIsSearchingGeoLocation(true);
    const timer = setTimeout(async () => {
      try {
        const query = encodeURIComponent(locationSearchQuery.trim());
        const lang = isRtl ? 'ar' : 'en';
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${query}&addressdetails=1&limit=8&accept-language=${lang}`
        );
        if (res.ok) {
          const data = await res.json();
          const mapped: LocationSearchResult[] = data.map((item: any) => {
            const addr = item.address || {};
            const cityName =
              addr.city ||
              addr.town ||
              addr.village ||
              addr.municipality ||
              addr.suburb ||
              addr.county ||
              item.name ||
              locationSearchQuery;
            const countryName = addr.country || '';
            const stateName = addr.state || addr.region || '';
            return {
              display_name: item.display_name,
              city: cityName,
              state: stateName,
              country: countryName,
              country_code: addr.country_code,
              lat: item.lat,
              lon: item.lon,
            };
          });
          setAutocompleteResults(mapped);
        }
      } catch (err) {
        console.error('Location autocomplete error:', err);
      } finally {
        setIsSearchingGeoLocation(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [locationSearchQuery, isRtl]);

  const handleSelectAutocompleteResult = (result: LocationSearchResult) => {
    if (result.country) {
      setSelectedCountry(result.country);
      secureStorage.set('perplexta_user_country', result.country);
    }
    setSelectedCity(result.city);
    secureStorage.set('perplexta_user_city', result.city);
    setLocationSearchQuery('');
    setAutocompleteResults([]);
    setIsLocationFlyoutOpen(false);
    toast.success(
      isRtl
        ? `📍 تم تحديد المدينة الموثّقة: ${result.city} (${result.country || ''})`
        : `📍 Location set: ${result.city}, ${result.country || ''}`
    );
  };

  const getAvailableCities = () => {
    let list: string[] = [];
    if (selectedCountry === 'all') {
      Object.values(COUNTRIES_CITIES_DATA).forEach((cities) => {
        list.push(...cities);
      });
    } else if (COUNTRIES_CITIES_DATA[selectedCountry]) {
      list = COUNTRIES_CITIES_DATA[selectedCountry];
    } else {
      list = PALESTINE_CITIES;
    }

    const uniqueCities = Array.from(new Set(list));

    if (locationSearchQuery.trim()) {
      const q = locationSearchQuery.toLowerCase().trim();
      return uniqueCities.filter((c) => c.toLowerCase().includes(q));
    }

    return uniqueCities;
  };

  const handleSelectCity = (city: string, radius = selectedRadius) => {
    setSelectedCity(city);
    setSelectedRadius(radius);
    secureStorage.set('perplexta_user_city', city);
    secureStorage.set('perplexta_user_radius', radius);
    setIsLocationFlyoutOpen(false);
    toast.success(
      isRtl
        ? `📍 تم اختيار المنطقة: ${city === 'all' ? 'كافة المحافظات' : city}`
        : `📍 Location set: ${city === 'all' ? 'All Regions' : city}`
    );
  };

  const handleDetectGpsLocation = () => {
    if (!navigator.geolocation) {
      toast.error(isRtl ? 'خاصية تحديد الموقع غير مدعومة في جهازك' : 'Geolocation is not supported');
      return;
    }
    setIsDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=ar`);
          const data = await res.json();
          const detectedCity = data.address?.city || data.address?.town || data.address?.state || data.address?.county || 'القدس الشريف';
          
          handleSelectCity(detectedCity);
          toast.success(isRtl ? `🎯 تم تحديد موقعك الحالي بنجاح: ${detectedCity}` : `🎯 Location detected: ${detectedCity}`);
        } catch (e) {
          handleSelectCity('القدس الشريف');
          toast.success(isRtl ? '🎯 تم تحديد موقعك: القدس الشريف' : '🎯 Location set to Jerusalem');
        } finally {
          setIsDetectingGps(false);
        }
      },
      (err) => {
        setIsDetectingGps(false);
        toast.error(isRtl ? 'تعذر الحصول على إذن الموقع من الجهاز' : 'Failed to get location permission');
      },
      { timeout: 8000 }
    );
  };

  const [pagesList, setPagesList] = useState<BulletinPage[]>([]);
  const [myPagesList, setMyPagesList] = useState<BulletinPage[]>([]);
  const [pagesLoading, setPagesLoading] = useState<boolean>(false);
  
  const [selectedPageDetail, setSelectedPageDetail] = useState<{ page: BulletinPage; ads: BulletinAd[] } | null>(null);
  const [pageDetailTab, setPageDetailTab] = useState<'ads' | 'about' | 'media'>('ads');

  // Profile Settings & Page Edit states
  const [isProfileEditModalOpen, setIsProfileEditModalOpen] = useState<boolean>(false);
  const [isEditPageModalOpen, setIsEditPageModalOpen] = useState<boolean>(false);
  const [editingPageData, setEditingPageData] = useState<BulletinPage | null>(null);
  const [isSubmittingProfile, setIsSubmittingProfile] = useState<boolean>(false);
  const [isSubmittingPageEdit, setIsSubmittingPageEdit] = useState<boolean>(false);

  const [profileFormData, setProfileFormData] = useState({
    name: '',
    avatar: '',
    email: '',
    custom_instructions: '',
    language: 'ar',
    theme: 'light'
  });
  
  // KYC form fields
  const [kycFullName, setKycFullName] = useState<string>('');
  const [kycIDNumber, setKycIDNumber] = useState<string>('');
  const [kycSelfieUrl, setKycSelfieUrl] = useState<string>('');
  const [kycTab, setKycTab] = useState<'info' | 'kyc'>('info');

  const [editPageFormData, setEditPageFormData] = useState({
    name: '',
    category: '',
    city: '',
    address: '',
    description: '',
    avatar_url: '',
    cover_url: '',
    whatsapp_number: '',
    phone_number: '',
    website_url: ''
  });
  const [editPageManagers, setEditPageManagers] = useState<any[]>([]);
  const [newManagerEmail, setNewManagerEmail] = useState<string>('');
  const [newManagerRole, setNewManagerRole] = useState<'full' | 'limited'>('limited');

  useEffect(() => {
    if (editingPageData) {
      setEditPageFormData({
        name: editingPageData.name || '',
        category: editingPageData.category || 'تجارة إلكترونية / E-Commerce',
        city: editingPageData.city || 'غزة',
        address: editingPageData.address || '',
        description: editingPageData.description || '',
        avatar_url: editingPageData.avatar_url || '',
        cover_url: editingPageData.cover_url || '',
        whatsapp_number: editingPageData.whatsapp_number || '',
        phone_number: editingPageData.phone_number || '',
        website_url: editingPageData.website_url || ''
      });
      let managersList: any[] = [];
      if (editingPageData.managers) {
        try {
          managersList = typeof editingPageData.managers === 'string'
            ? JSON.parse(editingPageData.managers)
            : editingPageData.managers;
        } catch (e) {
          managersList = [];
        }
      }
      setEditPageManagers(Array.isArray(managersList) ? managersList : []);
    }
  }, [editingPageData]);

  useEffect(() => {
    if (user) {
      setProfileFormData({
        name: user.name || '',
        avatar: user.avatar || '',
        email: user.email || '',
        custom_instructions: user.custom_instructions || '',
        language: (user as any).language || language || 'ar',
        theme: (user as any).theme || theme || 'light'
      });
      setKycFullName('');
      setKycIDNumber('');
      setKycSelfieUrl('');
      setKycTab('info');
    }
  }, [user, isProfileEditModalOpen]);

  const [inquiriesList, setInquiriesList] = useState<any[]>([]);
  const [inquiriesSearchTerm, setInquiriesSearchTerm] = useState<string>('');
  const [inquiriesLoading, setInquiriesLoading] = useState<boolean>(false);
  const [selectedInboxAd, setSelectedInboxAd] = useState<BulletinAd | null>(null);

  useEffect(() => {
    if (token) {
      fetchMyAds();
      fetchInquiries();
      fetchMyPages();
      fetchWallet();
    } else {
      setMyAds([]);
      setInquiriesList([]);
      setMyPagesList([]);
      setWalletBalance(0);
    }
  }, [token]);

  useEffect(() => {
    const handleOpenInquiries = () => {
      setSelectedPageDetail(null);
      setActiveTab('inquiries');
      fetchInquiries();
    };
    const handleInquiriesUpdated = () => {
      fetchInquiries();
    };

    window.addEventListener('open-bulletin-inquiries', handleOpenInquiries);
    window.addEventListener('bulletin-inquiry-updated', handleInquiriesUpdated);
    return () => {
      window.removeEventListener('open-bulletin-inquiries', handleOpenInquiries);
      window.removeEventListener('bulletin-inquiry-updated', handleInquiriesUpdated);
    };
  }, []);

  const [pullDistance, setPullDistance] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const pullStartLocation = useRef<number | null>(null);
  const pullDistanceRef = useRef<number>(0);
  const isMouseDownRef = useRef<boolean>(false);
  const hasTriggeredHapticRef = useRef<boolean>(false);

  const triggerFeedRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setPullDistance(0);
    pullDistanceRef.current = 0;
    try {
      if (activeTab === 'board') {
        await Promise.all([
          fetchAds(1, false),
          fetchPages()
        ]);
      } else if (activeTab === 'pages') {
        await fetchPages();
      } else if (activeTab === 'my_ads') {
        await fetchMyAds();
      }
    } catch (e) {
      console.error('Pull to refresh error:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, textarea, select, [role="button"], video, audio')) {
      return;
    }
    const scrollElem = document.querySelector('main .overflow-y-auto') || document.documentElement;
    const scrollTop = scrollElem ? scrollElem.scrollTop : window.scrollY;
    if (scrollTop <= 0) {
      pullStartLocation.current = e.clientY;
      pullDistanceRef.current = 0;
      hasTriggeredHapticRef.current = false;
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch (err) {}
    } else {
      pullStartLocation.current = null;
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (pullStartLocation.current === null) return;
    const scrollElem = document.querySelector('main .overflow-y-auto') || document.documentElement;
    const scrollTop = scrollElem ? scrollElem.scrollTop : window.scrollY;
    if (scrollTop > 0) {
      pullStartLocation.current = null;
      if (pullDistanceRef.current !== 0) {
        pullDistanceRef.current = 0;
        setPullDistance(0);
      }
      return;
    }

    const rawDist = e.clientY - pullStartLocation.current;
    if (rawDist > 0) {
      const dampedDist = Math.min(rawDist * 0.45, 90);
      if (Math.abs(dampedDist - pullDistanceRef.current) > 2) {
        pullDistanceRef.current = dampedDist;
        setPullDistance(dampedDist);

        if (dampedDist >= 55 && !hasTriggeredHapticRef.current) {
          hasTriggeredHapticRef.current = true;
          if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(12);
          }
        } else if (dampedDist < 55) {
          hasTriggeredHapticRef.current = false;
        }
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const currentDist = pullDistanceRef.current || pullDistance;
    if (currentDist >= 55 && !isRefreshing) {
      triggerFeedRefresh();
    } else {
      setPullDistance(0);
      pullDistanceRef.current = 0;
    }
    pullStartLocation.current = null;
    hasTriggeredHapticRef.current = false;
    try {
      if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      }
    } catch (err) {}
  };

  const [walletBalance, setWalletBalance] = useState<number>(0);

  const [isLiveStreamOpen, setIsLiveStreamOpen] = useState<boolean>(false);
  const [isStreamSetupOpen, setIsStreamSetupOpen] = useState<boolean>(false);
  const [streamTitleInput, setStreamTitleInput] = useState<string>('');
  const [isMuted, setIsMuted] = useState<boolean>(() => getGlobalMuteState());

  // Synchronize mute state across all media and live streams
  useEffect(() => {
    const handleMuteChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ muted: boolean }>;
      if (typeof customEvent.detail?.muted === 'boolean') {
        setIsMuted(customEvent.detail.muted);
      }
    };
    window.addEventListener('perplexta:mute_change', handleMuteChange);
    return () => window.removeEventListener('perplexta:mute_change', handleMuteChange);
  }, []);
  const [currentFeedIndex, setCurrentFeedIndex] = useState<number>(0);
  const [liveComments, setLiveComments] = useState<{id: string, user: string, text: string}[]>([]);
  const [liveLikes, setLiveLikes] = useState<number>(0);
  const [liveViewers, setLiveViewers] = useState<number>(0);
  const [newLiveComment, setNewLiveComment] = useState<string>('');
  const [isGiftModalOpen, setIsGiftModalOpen] = useState<boolean>(false);
  const [giftsCatalog, setGiftsCatalog] = useState<any[]>([]);
  const [showLikeAnimation, setShowLikeAnimation] = useState<boolean>(false);

  const streamFeed = [
    { id: 'live-1', type: 'live', host: 'Ahmed Khalil', hostId: 101, title: isRtl ? 'تحليل السوق العقاري' : 'Real Estate Market Analysis', viewers: 1240 },
    { id: 'reel-1', type: 'reel', host: 'Sara Tech', hostId: 102, title: isRtl ? 'مراجعة آيفون 16 برو' : 'iPhone 16 Pro Review', viewers: 850 },
    { id: 'live-2', type: 'live', host: 'Mustafa Business', hostId: 103, title: isRtl ? 'أسرار النجاح في التجارة' : 'Success Secrets in Business', viewers: 2100 },
  ];

  const videoRef = useRef<HTMLVideoElement>(null);
  const storyPressTimerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const handleSendLiveComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLiveComment.trim()) return;
    setLiveComments(prev => [...prev, { id: Date.now().toString(), user: user?.name || (isRtl ? 'مستخدم' : 'User'), text: newLiveComment }]);
    setNewLiveComment('');
  };

  const handleLiveLike = () => {
    setLiveLikes(prev => prev + 1);
    setShowLikeAnimation(true);
    setTimeout(() => setShowLikeAnimation(false), 1000);
  };

  const fetchGiftsCatalog = async () => {
    try {
      const res = await fetch('/api/gifts');
      const data = await res.json();
      if (Array.isArray(data)) {
        setGiftsCatalog(data);
      }
    } catch (e) {
      console.error('Error fetching gifts:', e);
    }
  };

  const handleSendGift = async (gift: any) => {
    if (!token) {
      toast.error(isRtl ? 'يرجى تسجيل الدخول أولاً' : 'Please login first');
      setIsAuthModalOpen(true);
      return;
    }

    try {
      const res = await fetch('/api/gifts/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          giftId: gift.id,
          recipientId: streamFeed[currentFeedIndex]?.hostId || 1,
          context: 'live'
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(isRtl 
          ? `تم إرسال ${gift.name_ar} بنجاح!` 
          : `Sent ${gift.name_en} successfully!`
        );
        setIsGiftModalOpen(false);
        fetchWallet();
        setLiveComments(prev => [...prev, { 
          id: Date.now().toString(), 
          user: user?.name || (isRtl ? 'مستخدم' : 'User'), 
          text: isRtl ? `أرسل هدية: ${gift.name_ar} ${gift.icon}` : `Sent a gift: ${gift.name_en} ${gift.icon}` 
        }]);
      } else {
        toast.error(isRtl ? (data.error_ar || data.error) : data.error);
      }
    } catch (e) {
      toast.error(isRtl ? 'حدث خطأ أثناء إرسال الهدية' : 'Error sending gift');
    }
  };

  const startLiveStream = async () => {
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch (e: any) {
        if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
            toast.info(isRtl ? 'تم تفعيل الكاميرا فقط (الميكروفون غير موجود).' : 'Camera only activated (microphone not found).');
          } catch (e2: any) {
            if (e2.name === 'NotFoundError' || e2.name === 'DevicesNotFoundError') {
              stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              toast.info(isRtl ? 'تم تفعيل الميكروفون فقط (الكاميرا غير موجودة).' : 'Microphone only activated (camera not found).');
            } else {
              throw e2;
            }
          }
        } else {
          throw e;
        }
      }
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error accessing media devices:', err);
      toast.error(isRtl ? 'تعذر الوصول إلى الكاميرا والميكروفون. يرجى التحقق من الصلاحيات.' : 'Could not access camera and microphone. Please check permissions.');
    }
  };

  const stopLiveStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    let interval: any;
    if (isLiveStreamOpen) {
      startLiveStream();
      fetchGiftsCatalog();
      setLiveViewers(Math.floor(Math.random() * 1200) + 1500);
      setLiveLikes(Math.floor(Math.random() * 800));
      setLiveComments([]);
      
      interval = setInterval(() => {
        setLiveViewers(prev => {
          const drift = Math.floor(Math.random() * 51) - 25; // -25 to +25
          const next = prev + drift;
          if (next < 1500) return 1500 + Math.floor(Math.random() * 200);
          if (next > 10000) return 10000 - Math.floor(Math.random() * 200);
          return next;
        });
      }, 3000);
    } else {
      stopLiveStream();
      setIsGiftModalOpen(false);
    }
    return () => {
      stopLiveStream();
      if (interval) clearInterval(interval);
    };
  }, [isLiveStreamOpen]);

  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState<boolean>(false);
  const [isAdModalOpen, setIsAdModalOpen] = useState<boolean>(false);
  const [isStoryModalOpen, setIsStoryModalOpen] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [editingAdId, setEditingAdId] = useState<number | null>(null);
  const [isSubmittingAd, setIsSubmittingAd] = useState<boolean>(false);
  const [isAudienceModalOpen, setIsAudienceModalOpen] = useState<boolean>(false);
  const [selectedAudienceFilter, setSelectedAudienceFilter] = useState<string>('all');
  const [adFormData, setAdFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    video_url: '',
    media_gallery: [] as MediaGalleryItem[],
    whatsapp_number: '',
    phone_number: '',
    target_url: '',
    hashtags: '',
    page_id: '' as string | number,
    location_city: 'القدس الشريف',
    location_radius: '10',
    feeling: '',
    is_ai_generated: false,
    tagged_users: [] as string[],
    has_whatsapp_button: false,
    audience: 'public' as 'public' | 'friends' | 'only_me',
    ad_format: 'post' as 'post' | 'reel' | 'story',
    quick_questions: ['', '', ''] as string[],
    aspect_ratio: 'grid' as string
  });

  const [suggestionType, setSuggestionType] = useState<'none' | 'hashtag' | 'mention'>('none');
  const [suggestionQuery, setSuggestionQuery] = useState('');
  const [trendingHashtags, setTrendingHashtags] = useState<string[]>([]);
  const [mentionSuggestions, setMentionSuggestions] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/bulletin/hashtags/trending')
      .then(res => res.json())
      .then(data => {
        if (data && data.success) {
          setTrendingHashtags(data.tags);
        }
      })
      .catch(err => console.error('[Hashtags client] Fetch failed:', err));
  }, []);

  useEffect(() => {
    if (suggestionType !== 'mention') return;
    const url = `/api/bulletin/mentions/suggest?q=${encodeURIComponent(suggestionQuery)}`;
    fetch(url, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.success) {
          setMentionSuggestions(data.results);
        }
      })
      .catch(err => console.error('[Mentions client] Fetch failed:', err));
  }, [suggestionType, suggestionQuery, token]);

  const handleComposerTextChange = (text: string) => {
    if (text.length > 1000) return;
    setAdFormData(prev => ({ ...prev, description: text }));

    const lastWord = text.split(/[\s\n]+/).pop() || '';
    if (lastWord.startsWith('#')) {
      setSuggestionType('hashtag');
      setSuggestionQuery(lastWord.slice(1));
    } else if (lastWord.startsWith('@')) {
      setSuggestionType('mention');
      setSuggestionQuery(lastWord.slice(1));
    } else {
      setSuggestionType('none');
      setSuggestionQuery('');
    }
  };

  const handleSelectSuggestion = (selectedVal: string) => {
    const text = adFormData.description;
    const words = text.split(/([\s\n]+)/);
    
    let replaced = false;
    for (let i = words.length - 1; i >= 0; i--) {
      if (words[i].trim().startsWith('#') && suggestionType === 'hashtag') {
        words[i] = selectedVal.startsWith('#') ? selectedVal : `#${selectedVal}`;
        replaced = true;
        break;
      }
      if (words[i].trim().startsWith('@') && suggestionType === 'mention') {
        words[i] = selectedVal.startsWith('@') ? selectedVal : `@${selectedVal}`;
        
        const cleanName = selectedVal.replace(/^@/, '');
        if (!adFormData.tagged_users.includes(cleanName)) {
          setAdFormData(prev => ({
            ...prev,
            tagged_users: [...prev.tagged_users, cleanName]
          }));
        }
        
        replaced = true;
        break;
      }
    }
    
    const newText = words.join('') + ' ';
    setAdFormData(prev => ({ ...prev, description: newText }));
    setSuggestionType('none');
    setSuggestionQuery('');
  };

  const [isMediaManagerOpen, setIsMediaManagerOpen] = useState(false);

  const [isTrimmerModalOpen, setIsTrimmerModalOpen] = useState(false);
  const [trimmerVideoUrl, setTrimmerVideoUrl] = useState('');
  const [videoMetadataInfo, setVideoMetadataInfo] = useState<{
    fileSize?: number;
    duration?: number;
    resolution?: string;
    fileName?: string;
    uploadProgress?: number;
    processingStage?: 'idle' | 'uploading' | 'transcoding' | 'extracting' | 'done';
    localVideoUrl?: string;
  }>({ processingStage: 'done' });

  const [composerView, setComposerView] = useState<'main' | 'feelings' | 'location' | 'tagging' | 'emojis'>('main');
  const [userSearch, setUserSearch] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [selectedComposerCountry, setSelectedComposerCountry] = useState<string>('فلسطين');
  const [customLocationSearch, setCustomLocationSearch] = useState<string>('');

  const openReelUploadModal = () => {
    setAdFormData({
      title: '',
      description: '',
      image_url: '',
      video_url: '',
      media_gallery: [],
      whatsapp_number: (user as any)?.phone || '',
      phone_number: '',
      target_url: '',
      hashtags: '',
      page_id: '' as string | number,
      location_city: 'القدس الشريف',
      location_radius: '10',
      feeling: '',
      is_ai_generated: false,
      tagged_users: [] as string[],
      has_whatsapp_button: false,
      audience: 'public' as 'public' | 'friends' | 'only_me',
      ad_format: 'reel',
      quick_questions: ['', '', ''] as string[],
      aspect_ratio: 'grid'
    });
    setVideoMetadataInfo({ processingStage: 'done' });
    setIsEditMode(false);
    setEditingAdId(null);
    setComposerView('main');
    setIsAdModalOpen(true);
  };

  const openPostUploadModal = () => {
    setAdFormData({
      title: '',
      description: '',
      image_url: '',
      video_url: '',
      media_gallery: [],
      whatsapp_number: (user as any)?.phone || '',
      phone_number: '',
      target_url: '',
      hashtags: '',
      page_id: '' as string | number,
      location_city: 'القدس الشريف',
      location_radius: '10',
      feeling: '',
      is_ai_generated: false,
      tagged_users: [] as string[],
      has_whatsapp_button: false,
      audience: 'public' as 'public' | 'friends' | 'only_me',
      ad_format: 'post',
      quick_questions: ['', '', ''] as string[],
      aspect_ratio: 'grid'
    });
    setVideoMetadataInfo({ processingStage: 'done' });
    setIsEditMode(false);
    setEditingAdId(null);
    setComposerView('main');
    setIsAdModalOpen(true);
  };


  useEffect(() => {
    if (!customLocationSearch || customLocationSearch.trim().length < 2) {
      setLocationSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingLocation(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(customLocationSearch.trim())}&limit=5&accept-language=ar`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setLocationSuggestions(data);
        }
      } catch (e) {
        console.error('Error fetching location suggestions:', e);
      } finally {
        setIsSearchingLocation(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [customLocationSearch]);

  const [isPageModalOpen, setIsPageModalOpen] = useState<boolean>(false);
  const [isSubmittingPage, setIsSubmittingPage] = useState<boolean>(false);
  const [pageFormData, setPageFormData] = useState({
    name: '',
    category: 'تجارة إلكترونية / E-Commerce',
    city: 'غزة',
    address: '',
    description: '',
    avatar_url: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=200&q=80',
    cover_url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80',
    whatsapp_number: '',
    phone_number: '',
    website_url: ''
  });

  const [inquireAd, setInquireAd] = useState<BulletinAd | null>(null);
  const [inquiryText, setInquiryText] = useState<string>('');
  const [inquiryPhone, setInquiryPhone] = useState<string>('');
  const [isSendingInquiry, setIsSendingInquiry] = useState<boolean>(false);

  const [expandedAdId, setExpandedAdId] = useState<number | null>(null);
  const [commentsMap, setCommentsMap] = useState<Record<number, BulletinAdComment[]>>({});
  const [loadingCommentsAdId, setLoadingCommentsAdId] = useState<number | null>(null);
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [replyToCommentId, setReplyToCommentId] = useState<number | null>(null);

  const [lightboxState, setLightboxState] = useState<{
    isOpen: boolean;
    items: LightboxMediaItem[];
    initialIndex: number;
    postTitle?: string;
    authorName?: string;
    ad?: BulletinAd | null;
  }>({
    isOpen: false,
    items: [],
    initialIndex: 0,
    ad: null
  });

  const updateUrlWithPost = (postId: number | null) => {
    if (typeof window !== 'undefined') {
      const cleanUrl = postId ? `/viralbook/${postId}` : `/viralbook`;
      if (window.location.pathname !== cleanUrl) {
        window.history.pushState(null, '', cleanUrl);
      }
    }
  };

  const handleOpenLightbox = (url: string, items?: any[], index = 0, postTitle?: string, authorName?: string, ad?: BulletinAd) => {
    let resolvedItems: LightboxMediaItem[] = [];
    if (items && Array.isArray(items) && items.length > 0) {
      resolvedItems = items.map((it: any, i: number) => {
        if (typeof it === 'string') {
          return { id: `item-${i}`, url: it, type: 'image' };
        }
        return {
          id: it.id || `item-${i}`,
          url: it.url,
          type: it.type || (it.url?.endsWith('.mp4') ? 'video' : 'image'),
          caption: it.caption || '',
          thumbnailUrl: it.thumbnailUrl
        };
      });
    } else {
      resolvedItems = [{ id: 'item-0', url, type: url?.endsWith('.mp4') ? 'video' : 'image' }];
    }

    setLightboxState({
      isOpen: true,
      items: resolvedItems,
      initialIndex: index,
      postTitle,
      authorName,
      ad: ad || undefined
    });
    
    if (ad && ad.id) {
      updateUrlWithPost(ad.id);
    }
  };

  const setLightboxImage = (url: string | null) => {
    if (!url) {
      setLightboxState(prev => ({ ...prev, isOpen: false }));
      updateUrlWithPost(null);
    } else {
      handleOpenLightbox(url);
    }
  };
  const [isAddToPostModalOpen, setIsAddToPostModalOpen] = useState<boolean>(false);

  const [boostingAd, setBoostingAd] = useState<BulletinAd | null>(null);
  const [isBoostModalOpen, setIsBoostModalOpen] = useState<boolean>(false);

  const isAnyModalOpen = isAdModalOpen || 
    isStoryViewerOpen || 
    isLiveStreamOpen || 
    isStoryModalOpen || 
    isAudienceModalOpen || 
    isPageModalOpen || 
    isAddToPostModalOpen || 
    isBoostModalOpen || 
    isGiftModalOpen ||
    inquireAd !== null ||
    isMediaManagerOpen ||
    isTrimmerModalOpen ||
    editingAdId !== null;

  useEffect(() => {
    if (isAnyModalOpen) {
      document.body.classList.add('layout-locked', 'workspace-focus-mode');
      document.documentElement.classList.add('workspace-focus-mode');
    } else {
      document.body.classList.remove('layout-locked', 'workspace-focus-mode');
      document.documentElement.classList.remove('workspace-focus-mode');
    }
    return () => {
      document.body.classList.remove('layout-locked', 'workspace-focus-mode');
      document.documentElement.classList.remove('workspace-focus-mode');
    };
  }, [isAnyModalOpen]);

  const handleOpenBoostModal = (ad: BulletinAd) => {
    if (!user || !token) {
      toast.error(isRtl ? 'يرجى تسجيل الدخول أولاً لتمويل إعلانك' : 'Please log in first to boost your ad');
      setIsAuthModalOpen(true);
      return;
    }
    setBoostingAd(ad);
    setIsBoostModalOpen(true);
  };

  const handleBoostSuccess = (updatedAd: BulletinAd) => {
    setAds(prev => prev.map(a => a.id === updatedAd.id ? { ...a, ...updatedAd, is_boosted: true } : a));
    setMyAds(prev => prev.map(a => a.id === updatedAd.id ? { ...a, ...updatedAd, is_boosted: true } : a));
    fetchAds(1, false);
    fetchWallet();
  };

  useEffect(() => {
    let targetPostId: number | null = null;
    
    // 1. Check path params (e.g. /viralbook/42 or /viralbook/board/42)
    if (routeIdParam && !isNaN(Number(routeIdParam))) {
      targetPostId = Number(routeIdParam);
    } else if (subPath && !isNaN(Number(subPath))) {
      targetPostId = Number(subPath);
    } else if (subId && !isNaN(Number(subId))) {
      targetPostId = Number(subId);
    } else if (typeof window !== 'undefined') {
      const pathMatch = window.location.pathname.match(/^\/(?:viralbook|bulletin)\/(\d+)$/i);
      if (pathMatch && pathMatch[1]) {
        targetPostId = Number(pathMatch[1]);
      }
    }

    // 2. Check query params fallback (?post=123 or ?id=123)
    if (!targetPostId && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const postStr = urlParams.get('post') || urlParams.get('id');
      if (postStr && !isNaN(Number(postStr))) {
        targetPostId = Number(postStr);
      }
    }
    
    if (targetPostId && targetPostId > 0) {
      const postId = targetPostId;
      const fetchDirectPost = async () => {
        try {
          const res = await fetch(`/api/bulletin/ads/${postId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          const data = await res.json();
          if (data.success && data.ad) {
            const ad = data.ad;
            const mediaUrl = getMediaUrl(ad.video_url || ad.image_url);
            handleOpenLightbox(mediaUrl, ad.media_gallery, 0, ad.title, ad.author_name, ad);

            // Fetch comments for this direct post to preserve session state on refresh
            try {
              const cRes = await fetch(`/api/bulletin/ads/${postId}/comments`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
              });
              const cData = await cRes.json();
              if (cData.success) {
                setCommentsMap(prev => ({ ...prev, [postId]: cData.comments || [] }));
              }
            } catch (cErr) {
              console.error('Failed to fetch direct post comments:', cErr);
            }
          }
        } catch (e) {
          console.error('Failed to fetch direct post:', e);
        }
      };
      fetchDirectPost();
    }
  }, [token, routeIdParam, subPath, subId]);

  // DIRECT REEL DEEP-LINKING (e.g. /viralbook/reels/123 or /reels/123 or ?tab=reels&reel=1)
  useEffect(() => {
    let targetReelId: number | null = null;
    const isReelRoute = location.pathname.startsWith('/reels') || 
      location.pathname.includes('/reels') || 
      subPath === 'reels';

    if (isReelRoute) {
      if (subId && !isNaN(Number(subId))) {
        targetReelId = Number(subId);
      } else if (routeIdParam && !isNaN(Number(routeIdParam))) {
        targetReelId = Number(routeIdParam);
      } else if (typeof window !== 'undefined') {
        const reelMatch = location.pathname.match(/\/(?:reels|viralbook\/reels|bulletin\/reels)\/(\d+)/i);
        if (reelMatch && reelMatch[1]) {
          targetReelId = Number(reelMatch[1]);
        }
      }
    }

    if (!targetReelId && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const reelIdStr = urlParams.get('reel');
      if (reelIdStr && !isNaN(Number(reelIdStr))) {
        targetReelId = Number(reelIdStr);
      }
    }
    
    if (targetReelId && targetReelId > 0) {
      const reelId = targetReelId;
      const fetchDirectReel = async () => {
        try {
          const res = await fetch(`/api/bulletin/ads/${reelId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          const data = await res.json();
          if (data.success && data.ad && data.ad.video_url) {
            // Inject reel into ads so it exists for the ReelsFeed
            setAds(prev => {
              const exists = prev.some(a => a.id === data.ad.id);
              if (exists) return prev;
              return [data.ad, ...prev];
            });
            setActiveReelModalId(reelId);
            setActiveTab('reels');
          }
        } catch (e) {
          console.error('Failed to fetch direct reel:', e);
        }
      };
      fetchDirectReel();
    }
  }, [token, routeIdParam, subPath, subId, location.pathname]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const boostStatus = urlParams.get('status');
    const sessionId = urlParams.get('session_id');

    if (boostStatus === 'boost-success' && sessionId && token) {
      fetch(`/api/bulletin/verify-boost-session?session_id=${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            toast.success(isRtl ? 'تم ترويج إعلانك وتنشيطه بنجاح عبر Stripe! 🚀' : 'Ad boosted successfully via Stripe!');
            fetchAds(1, false);
            fetchWallet();
          }
        })
        .catch(console.error);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [token]);

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const adIdParam = routeIdParam || urlParams.get('id') || urlParams.get('ad');
    if (adIdParam) {
      const targetId = Number(adIdParam);
      if (!isNaN(targetId) && targetId > 0) {
        const exists = ads.some(a => a.id === targetId);
        if (exists) {
          setExpandedAdId(targetId);
          setTimeout(() => {
            const el = document.getElementById(`bulletin-ad-${targetId}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 350);
        } else {
          fetch(`/api/bulletin/ads/${targetId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          })
            .then(res => res.json())
            .then(data => {
              if (data.success && data.ad) {
                setAds(prev => [data.ad, ...prev.filter(a => a.id !== data.ad.id)]);
                setExpandedAdId(targetId);
                setTimeout(() => {
                  const el = document.getElementById(`bulletin-ad-${targetId}`);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 350);
              }
            })
            .catch(err => console.error('Failed to load deep-linked ad:', err));
        }
      }
    }
  }, [token, location, routeIdParam, ads]);

  const [adPage, setAdPage] = useState<number>(1);
  const [hasMoreAds, setHasMoreAds] = useState<boolean>(true);
  const [loadingMoreAds, setLoadingMoreAds] = useState<boolean>(false);
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);

  const handleNavigateToPost = async (adId: number) => {
    if (!adId) return;

    // 1. Close overlays & stop playing media
    stopAllMedia();
    setActiveReelModalId(null);
    setLightboxState(prev => ({ ...prev, isOpen: false }));
    updateUrlWithPost(null);

    // 2. Switch to main board feed
    if (activeTab !== 'board') {
      setActiveTab('board');
    }

    // 3. Clear restrictive filters so the target post is guaranteed to show
    setSelectedCategory('all');
    setSearchQuery('');
    setSelectedAudienceFilter('all');
    setSelectedCity('all');

    // 4. Fetch the ad if it is not in the current list
    let targetAd = ads.find(a => a.id === adId);
    if (!targetAd) {
      try {
        const res = await fetch(`/api/bulletin/ads/${adId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const data = await res.json();
        if (data.success && data.ad) {
          targetAd = data.ad;
          setAds(prev => [data.ad, ...prev.filter(a => a.id !== data.ad.id)]);
        }
      } catch (e) {
        console.error('Failed to fetch target post for navigation:', e);
      }
    }

    // 5. Expand post comments/content
    setExpandedAdId(adId);

    // 6. Smoothly scroll into viewport and flash an attention pulse ring
    const executeScroll = (attempts = 0) => {
      const el = document.getElementById(`bulletin-ad-${adId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-4', 'ring-accent', 'ring-offset-4', 'ring-offset-white', 'dark:ring-offset-zinc-900', 'shadow-2xl', 'transition-all', 'duration-500');
        setTimeout(() => {
          el.classList.remove('ring-4', 'ring-accent', 'ring-offset-4', 'ring-offset-white', 'dark:ring-offset-zinc-900', 'shadow-2xl');
        }, 3500);
      } else if (attempts < 8) {
        setTimeout(() => executeScroll(attempts + 1), 150);
      }
    };

    setTimeout(() => executeScroll(), 120);
  };


  const handleStoryViewed = async (storyId: number) => {
    try {
      const response = await fetch(`/api/bulletin/ads/${storyId}/impression`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        setStories(prev => prev.map(s => s.id === storyId ? { ...s, impressions_count: (Number(s.impressions_count) || 0) + 1 } : s));
      }
    } catch (err) {
      // silent error
    }
  };

  const handleStoryDeleted = (storyId: number) => {
    setStories(prev => prev.filter(s => s.id !== storyId));
    fetchStories();
  };

  const fetchAds = async (pageNum = 1, append = false) => {
    if (append) {
      setLoadingMoreAds(true);
    } else {
      setLoading(true);
      setAdPage(1);
    }

    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (selectedCity !== 'all') params.append('city', selectedCity);
      if (selectedAudienceFilter !== 'all') params.append('audience', selectedAudienceFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (sortBy) params.append('sort', sortBy);
      params.append('page', String(pageNum));
      params.append('limit', '8');

      const res = await fetch(`/api/bulletin/ads?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.status === 503) {
        toast.error(isRtl ? 'النظام قيد التشغيل، يرجى المحاولة بعد لحظات' : 'System initializing, please retry in a moment');
        return;
      }

      if (res.status === 429) {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || (isRtl ? 'تم تجاوز حد الطلبات، يرجى الانتظار قليلًا' : 'Rate limit exceeded, please wait a moment'));
        return;
      }

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

      const data = await res.json();
      if (data.success) {
        const fetchedAds: BulletinAd[] = data.ads || [];
        if (append) {
          const existingIds = new Set(ads.map(a => a.id));
          const newUniqueAds = fetchedAds.filter(a => !existingIds.has(a.id));
          if (newUniqueAds.length > 0) {
            setAds(prev => [...prev, ...newUniqueAds]);
            setHasMoreAds(true);
          } else {
            if (ads.length > 0) {
              const recycled = ads.slice(0, 8).map((ad, idx) => ({
                ...ad,
                _virtualId: `${ad.id}_recycle_${pageNum}_${idx}_${Date.now()}`
              }));
              setAds(prev => [...prev, ...recycled as any]);
              setHasMoreAds(true);
            } else {
              setHasMoreAds(false);
            }
          }
        } else {
          setAds(fetchedAds);
          setHasMoreAds(true);
        }
      }
    } catch (error) {
      console.error('Error fetching bulletin ads:', error);
      toast.error(isRtl ? 'تعذر تحميل الإعلانات' : 'Failed to load ads');
    } finally {
      setLoading(false);
      setLoadingMoreAds(false);
    }
  };

  const fetchStories = async () => {
    try {
      const res = await fetch('/api/bulletin/stories', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.status === 503) return;
      if (!res.ok) throw new Error('Failed to fetch stories');
      const data = await res.json();
      if (data.success) {
        setStories(data.stories || []);
      }
    } catch (error) {
      console.error('Error fetching stories:', error);
    }
  };

  const handleLoadMoreAds = () => {
    if (loading || loadingMoreAds) return;
    const nextPage = adPage + 1;
    setAdPage(nextPage);
    fetchAds(nextPage, true);
  };

  const fetchPages = async () => {
    setPagesLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await fetch(`/api/bulletin/pages?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      
      if (res.status === 503) return;
      if (!res.ok) throw new Error('Failed to fetch pages');
      const data = await res.json();
      if (data.success) {
        setPagesList(data.pages || []);
      }
    } catch (error) {
      console.error('Error fetching pages:', error);
    } finally {
      setPagesLoading(false);
    }
  };

  const fetchMyPages = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/bulletin/pages/my', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setMyPagesList(data.pages || []);
      }
    } catch (e) {}
  };

  const fetchMyAds = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/bulletin/ads/my', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setMyAds(data.ads || []);
      }
    } catch (e) {}
  };

  const fetchInquiries = async () => {
    if (!token) return;
    setInquiriesLoading(true);
    try {
      const [legacyRes, directRes] = await Promise.all([
        fetch('/api/bulletin/inquiries/my', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/bulletin/my-inquiries', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const legacyData = await legacyRes.json().catch(() => ({ inquiries: [] }));
      const directData = await directRes.json().catch(() => ({ inquiries: [] }));

      const legacyInquiries = (legacyData.inquiries || []).map((inq: any) => ({
        ...inq,
        type: 'legacy'
      }));

      const directInquiries = (directData.inquiries || []).map((thread: any) => ({
        id: `direct_${thread.ad_id}_${thread.other_user_id}`,
        ad_id: thread.ad_id,
        ad_title: thread.ad_title,
        ad_image: thread.ad_image,
        sender_id: thread.other_user_id,
        sender_name: thread.other_user_name,
        sender_avatar: thread.other_user_avatar,
        message: thread.last_message,
        unread_count: thread.unread_count,
        created_at: thread.last_message_at,
        type: 'direct'
      }));

      setInquiriesList([...directInquiries, ...legacyInquiries]);
    } catch (e) {
    } finally {
      setInquiriesLoading(false);
    }
  };

  const fetchWallet = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/wallet', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data) {
        setWalletBalance(parseFloat(data.balance) || 0);
      }
    } catch (e) {}
  };

  useEffect(() => {
    sessionStorage.removeItem('perplexta_bulletin_scroll_y');
    fetchAds();
    fetchStories();
    fetchPages();
  }, [selectedCategory, selectedCity, sortBy, selectedAudienceFilter]);

  useEffect(() => {
    const getScrollContainer = (): HTMLElement | Window => {
      const el = document.querySelector('main > div.overflow-y-auto') || document.querySelector('.overflow-y-auto');
      return (el as HTMLElement) || window;
    };

    const container = getScrollContainer();

    const handleScroll = () => {
      const currentY = container instanceof Window ? window.scrollY : container.scrollTop;
      setShowScrollTop(currentY > 350);

      if (activeTab === 'board' && currentY > 0) {
        sessionStorage.setItem('perplexta_bulletin_scroll_y', String(currentY));
      }
    };

    if (container instanceof Window) {
      window.addEventListener('scroll', handleScroll, { passive: true });
    } else {
      container.addEventListener('scroll', handleScroll, { passive: true });
    }

    return () => {
      if (container instanceof Window) {
        window.removeEventListener('scroll', handleScroll);
      } else {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'board' && !loading && ads.length > 0) {
      const savedScrollY = sessionStorage.getItem('perplexta_bulletin_scroll_y');
      if (savedScrollY && Number(savedScrollY) > 0) {
        const targetY = Number(savedScrollY);
        const timer = setTimeout(() => {
          const container = document.querySelector('main > div.overflow-y-auto') || document.querySelector('.overflow-y-auto');
          if (container) {
            container.scrollTop = targetY;
          } else {
            window.scrollTo({ top: targetY, behavior: 'instant' });
          }
        }, 120);
        return () => clearTimeout(timer);
      }
    }
  }, [activeTab, loading, ads.length]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sessionStorage.removeItem('perplexta_bulletin_scroll_y');
    if (activeTab === 'board') fetchAds();
    if (activeTab === 'pages') fetchPages();
  };

  const handleToggleLike = async (adId: number, reaction: string = 'like') => {
    if (!token) {
      toast.error(isRtl ? 'يرجى تسجيل الدخول للتفاعل مع الإعلان' : 'Please log in to like ads');
      return;
    }

    setAds(prev => prev.map(ad => {
      if (ad.id === adId) {
        const currentReaction = (ad as any).user_reaction;
        const isRemoving = currentReaction === reaction;
        const nextReaction = isRemoving ? null : reaction;
        const countDelta = isRemoving ? -1 : (currentReaction ? 0 : 1);
        return {
          ...ad,
          user_has_liked: Boolean(nextReaction),
          user_reaction: nextReaction,
          likes_count: Math.max(0, (ad.likes_count || 0) + countDelta)
        };
      }
      return ad;
    }));

    setSavedAds(prev => prev.map(ad => {
      if (ad.id === adId) {
        const currentReaction = (ad as any).user_reaction;
        const isRemoving = currentReaction === reaction;
        const nextReaction = isRemoving ? null : reaction;
        const countDelta = isRemoving ? -1 : (currentReaction ? 0 : 1);
        return {
          ...ad,
          user_has_liked: Boolean(nextReaction),
          user_reaction: nextReaction,
          likes_count: Math.max(0, (ad.likes_count || 0) + countDelta)
        };
      }
      return ad;
    }));

    try {
      const res = await fetch(`/api/bulletin/ads/${adId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reaction })
      });
      const data = await res.json();
      if (data.success && data.user_reaction !== undefined) {
        setAds(prev => prev.map(ad => ad.id === adId ? { ...ad, user_has_liked: data.isLiked, user_reaction: data.user_reaction, likes_count: data.likesCount } : ad));
        setSavedAds(prev => prev.map(ad => ad.id === adId ? { ...ad, user_has_liked: data.isLiked, user_reaction: data.user_reaction, likes_count: data.likesCount } : ad));
      } else if (!data.success) {
        fetchAds();
      }
    } catch (e) {
      fetchAds();
    }
  };

  const handleToggleFollowPage = async (pageId: number) => {
    if (!token) {
      toast.error(isRtl ? 'يرجى تسجيل الدخول لمتابعة الصفحة' : 'Please log in to follow page');
      return;
    }

    setPagesList(prev => prev.map(p => {
      if (p.id === pageId) {
        const following = p.user_is_following;
        return {
          ...p,
          user_is_following: !following,
          followers_count: following ? Math.max(0, p.followers_count - 1) : p.followers_count + 1
        };
      }
      return p;
    }));

    if (selectedPageDetail && selectedPageDetail.page.id === pageId) {
      setSelectedPageDetail(prev => prev ? {
        ...prev,
        page: {
          ...prev.page,
          user_is_following: !prev.page.user_is_following,
          followers_count: prev.page.user_is_following ? Math.max(0, prev.page.followers_count - 1) : prev.page.followers_count + 1
        }
      } : null);
    }

    try {
      const res = await fetch(`/api/bulletin/pages/${pageId}/follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.is_following ? (isRtl ? 'تمت متابعة الصفحة' : 'Page followed') : (isRtl ? 'تم إلغاء المتابعة' : 'Unfollowed'));
      }
    } catch (e) {
      fetchPages();
    }
  };

  const handleOpenPageDetail = async (pageId: number) => {
    try {
      const res = await fetch(`/api/bulletin/pages/${pageId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (data.success) {
        setSelectedPageDetail({ page: data.page, ads: data.ads || [] });
        setPageDetailTab('ads');
        window.scrollTo({ top: 180, behavior: 'smooth' });
      } else {
        toast.error(data.error || 'تعذر فتح الصفحة');
      }
    } catch (e) {
      toast.error(isRtl ? 'تعذر تحميل الصفحة' : 'Failed to load page');
    }
  };

  const handleBackToBoard = () => {
    setSelectedPageDetail(null);
  };

  const handleToggleCommentLike = async (adId: number, commentId: number, reaction: string = 'like') => {
    if (!token) {
      setIsAuthModalOpen(true);
      return;
    }

    setCommentsMap((prev) => ({
      ...prev,
      [adId]: (prev[adId] || []).map((c) => {
        if (c.id === commentId) {
          const isRemoving = c.user_reaction === reaction;
          return {
            ...c,
            user_reaction: isRemoving ? null : reaction,
            like_count: Math.max(0, (c.like_count || 0) + (isRemoving ? -1 : (c.user_reaction ? 0 : 1))),
          };
        }
        return c;
      })
    }));

    try {
      await fetch(`/api/bulletin/comments/${commentId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reaction })
      });
    } catch (e) {}
  };

  const toggleComments = async (adId: number) => {
    if (expandedAdId === adId) {
      setExpandedAdId(null);
      return;
    }

    setExpandedAdId(adId);
    if (!commentsMap[adId]) {
      setLoadingCommentsAdId(adId);
      try {
        const res = await fetch(`/api/bulletin/ads/${adId}/comments`);
        const data = await res.json();
        if (data.success) {
          setCommentsMap(prev => ({ ...prev, [adId]: data.comments || [] }));
        }
      } catch (e) {
        console.error('Failed to fetch comments:', e);
      } finally {
        setLoadingCommentsAdId(null);
      }
    }
  };

  const handleAddComment = async (adId: number, parentIdOrText?: number | string, optParentId?: number) => {
    if (!token) {
      toast.error(isRtl ? 'يرجى تسجيل الدخول للتعليق' : 'Please log in to comment');
      return;
    }
    let text = newCommentText;
    let parentId = typeof parentIdOrText === 'number' ? parentIdOrText : optParentId;
    if (typeof parentIdOrText === 'string') {
      text = parentIdOrText;
    }
    const contentToSend = text;
    if (!contentToSend || !contentToSend.trim()) return;

    try {
      const res = await fetch(`/api/bulletin/ads/${adId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: contentToSend.trim(), parent_id: parentId })
      });
      const data = await res.json();
      if (data.success && data.comment) {
        setCommentsMap(prev => ({
          ...prev,
          [adId]: [...(prev[adId] || []), data.comment]
        }));
        if (typeof parentIdOrText !== 'string') {
          setNewCommentText('');
          setReplyToCommentId(null);
        }
        setAds(prev => prev.map(a => a.id === adId ? { ...a, comments_count: a.comments_count + 1 } : a));
        toast.success(isRtl ? 'تم إضافة تعليقك' : 'Comment added');
      } else {
        toast.error(data.error || 'فشل إرسال التعليق');
      }
    } catch (e) {
      toast.error('حدث خطأ أثناء إضافة التعليق');
    }
  };

  const handleSendInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error(isRtl ? 'يرجى تسجيل الدخول لإرسال الاستفسار' : 'Please log in to inquire');
      return;
    }
    if (!inquireAd || !inquiryText.trim()) return;

    setIsSendingInquiry(true);
    try {
      const res = await fetch(`/api/bulletin/ads/${inquireAd.id}/inquire`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          message: inquiryText.trim(),
          sender_phone: inquiryPhone.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(isRtl ? 'تم إرسال استفسارك للتاجر بنجاح!' : 'Inquiry sent to merchant successfully!');
        setInquireAd(null);
        setInquiryText('');
        setInquiryPhone('');
      } else {
        toast.error(data.error || 'فشل إرسال الاستفسار');
      }
    } catch (e) {
      toast.error('حدث خطأ أثناء إرسال الاستفسار');
    } finally {
      setIsSendingInquiry(false);
    }
  };

  const handleMessageAdvertiser = async (ad: BulletinAd, customMessage?: string) => {
    if (!token || !user) {
      toast.error(isRtl ? 'يرجى تسجيل الدخول أولاً لمراسلة المعلن' : 'Please log in to message the advertiser');
      setIsAuthModalOpen(true);
      return;
    }

    if (user.id && (user.id === ad.user_id)) {
      toast.error(isRtl ? 'هذا إعلانك الخاص، لا يمكنك مراسلة نفسك' : 'This is your own advertisement');
      return;
    }

    setMessagingAdId(ad.id);
    try {
      const res = await fetch(`/api/bulletin/ads/${ad.id}/message-advertiser`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ message: customMessage || '' })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(isRtl ? 'تم فتح المحادثة المشفرة مع المعلن في صندوق الرسائل!' : 'Encrypted chat with advertiser opened in messenger!');
        setInquireAd(null);
        await fetchInquiries();
        setSelectedInboxAd(ad);
        setActiveTab('inquiries');
      } else {
        toast.error(data.error || (isRtl ? 'فشل مراسلة المعلن' : 'Failed to message advertiser'));
      }
    } catch (e) {
      toast.error(isRtl ? 'حدث خطأ أثناء الاتصال بالمعلن' : 'Error contacting advertiser');
    } finally {
      setMessagingAdId(null);
    }
  };

  const fetchSavedAds = async () => {
    if (!token) return;
    setLoadingSaved(true);
    try {
      const res = await fetch('/api/bulletin/saved', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSavedAds(data.ads);
      }
    } catch (e) {
      console.error('Fetch saved ads error:', e);
    } finally {
      setLoadingSaved(false);
    }
  };

  const handleToggleSave = async (adOrId: BulletinAd | number) => {
    if (!token) {
      toast.error(isRtl ? 'يرجى تسجيل الدخول أولاً' : 'Please log in first');
      return;
    }
    const targetId = typeof adOrId === 'number' ? adOrId : adOrId.id;

    try {
      const res = await fetch(`/api/bulletin/ads/${targetId}/save`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        const updateFn = (prev: BulletinAd[]) => prev.map(a => a.id === targetId ? { ...a, user_has_saved: data.saved } : a);
        setAds(updateFn);
        setMyAds(updateFn);
        if (data.saved) {
          fetchSavedAds();
        } else {
          setSavedAds(prev => prev.filter(a => a.id !== targetId));
        }
      }
    } catch (e) {
      toast.error('حدث خطأ أثناء حفظ المنشور');
    }
  };

  const handleReportAd = async (ad: BulletinAd) => {
    if (!token) {
      toast.error(isRtl ? 'يرجى تسجيل الدخول أولاً' : 'Please log in first');
      return;
    }

    const reason = await confirm({
      title: isRtl ? 'الإبلاغ عن المنشور' : 'Report Post',
      description: isRtl ? 'لماذا تبلغ عن هذا المنشور؟' : 'Why are you reporting this post?',
      hasInput: true,
      inputPlaceholder: isRtl ? 'أدخل سبب الإبلاغ...' : 'Enter reason...',
      confirmLabel: isRtl ? 'إرسال البلاغ' : 'Submit Report',
      variant: 'warning',
      requiredInput: true,
    });
    if (!reason || typeof reason !== 'string' || !reason.trim()) return;

    try {
      const response = await fetch(`/api/bulletin/ads/${ad.id}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
      });
      const data = await response.json();
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.error || (isRtl ? 'فشل إرسال البلاغ' : 'Failed to send report'));
      }
    } catch (error) {
      toast.error(isRtl ? 'خطأ في الاتصال' : 'Connection error');
    }
  };

  const handleEditAd = (ad: BulletinAd) => {
    const synthesizedGallery: MediaGalleryItem[] = [];
    if (ad.media_gallery && Array.isArray(ad.media_gallery) && ad.media_gallery.length > 0) {
      synthesizedGallery.push(...ad.media_gallery);
    } else {
      if (ad.image_url) {
        const urls = ad.image_url.split(',').map(u => u.trim()).filter(Boolean);
        urls.forEach((url, i) => {
          synthesizedGallery.push({
            id: `img-${i}-${Date.now()}`,
            url,
            type: 'image',
            caption: ''
          });
        });
      }
      if (ad.video_url) {
        synthesizedGallery.push({
          id: `vid-0-${Date.now()}`,
          url: ad.video_url,
          type: 'video',
          caption: '',
          thumbnailUrl: ad.image_url ? ad.image_url.split(',')[0].trim() : undefined
        });
      }
    }

    setAdFormData({
      title: ad.title,
      description: ad.description,
      image_url: ad.image_url || '',
      video_url: ad.video_url || '',
      media_gallery: synthesizedGallery,
      whatsapp_number: ad.whatsapp_number || '',
      phone_number: ad.phone_number || '',
      target_url: ad.target_url || '',
      hashtags: Array.isArray(ad.hashtags) ? ad.hashtags.join(',') : (ad.hashtags || ''),
      page_id: ad.page_id || '',
      location_city: ad.location_city || 'القدس الشريف',
      location_radius: '10',
      feeling: ad.feeling || '',
      is_ai_generated: ad.is_ai_generated || false,
      tagged_users: Array.isArray(ad.tagged_users) ? ad.tagged_users : [],
      has_whatsapp_button: !!ad.whatsapp_number,
      audience: (ad.audience as any) || 'public',
      ad_format: (ad.ad_format as any) || 'post',
      quick_questions: Array.isArray(ad.quick_questions) ? ad.quick_questions : ['', '', ''],
      aspect_ratio: (ad as any).aspect_ratio || 'grid'
    });
    setEditingAdId(ad.id);
    setIsEditMode(true);
    setIsAdModalOpen(true);
  };

  const confirm = useConfirm();

  const handleDeleteAd = async (ad: BulletinAd) => {
    if (!token) return;
    const confirmDelete = await confirm({
      title: isRtl ? 'حذف المنشور' : 'Delete Post',
      description: isRtl ? 'هل أنت متأكد من حذف هذا المنشور نهائياً؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure you want to delete this post permanently? This action cannot be undone.',
      variant: 'danger',
      confirmLabel: isRtl ? 'حذف نهائياً' : 'Delete Permanently'
    });
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/bulletin/ads/${ad.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        toast.success(isRtl ? 'تم حذف المنشور بنجاح' : 'Post deleted successfully');
        setAds(prev => prev.filter(a => a.id !== ad.id));
        setMyAds(prev => prev.filter(a => a.id !== ad.id));
      } else {
        toast.error(data.error || 'فشل حذف المنشور');
      }
    } catch (e) {
      toast.error('حدث خطأ أثناء حذف المنشور');
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error(isRtl ? 'يرجى تسجيل الدخول أولاً' : 'Please log in first');
      return;
    }

    const totalMediaCount = (adFormData.media_gallery && adFormData.media_gallery.length > 0)
      ? adFormData.media_gallery.length
      : (adFormData.image_url ? adFormData.image_url.split(',').map(u => u.trim()).filter(Boolean).length : 0);
    if (totalMediaCount > 20) {
      toast.error(isRtl ? 'الحد الأقصى المسموح به هو 20 وسيطة فقط' : 'The maximum limit allowed is only 20 media items');
      return;
    }

    setIsSubmittingAd(true);
    try {
      const desc = adFormData.description || '';
      // Intelligent auto-extraction of hashtags (#tag) and mentions (@user) from natural post text
      const textHashtags = (desc.match(/#[\p{L}\p{N}_]+/gu) || []).map(h => h.replace(/^#/, '').trim());
      const existingHashtags = Array.isArray(adFormData.hashtags)
        ? adFormData.hashtags.map((h: any) => String(h).replace(/^#/, '').trim()).filter(Boolean)
        : typeof adFormData.hashtags === 'string'
        ? adFormData.hashtags.split(/[,\s]+/).map(h => h.replace(/^#/, '').trim()).filter(Boolean)
        : [];
      const mergedHashtags = Array.from(new Set([...existingHashtags, ...textHashtags]));

      const textMentions = (desc.match(/@[\p{L}\p{N}_]+/gu) || []).map(m => m.replace(/^@/, '').trim()).filter(Boolean);
      const existingMentions = (Array.isArray(adFormData.tagged_users) ? adFormData.tagged_users : [])
        .map(m => String(m).replace(/^@/, '').trim())
        .filter(Boolean);
      const mergedMentions = Array.from(new Set([...existingMentions, ...textMentions]));

      const payload = {
        ...adFormData,
        title: adFormData.title?.trim() || (desc.length > 60 ? desc.slice(0, 60) + '...' : desc) || 'منشور جديد',
        hashtags: mergedHashtags.join(','),
        tagged_users: mergedMentions
      };

      const url = isEditMode ? `/api/bulletin/ads/${editingAdId}` : '/api/bulletin/ads';
      const method = isEditMode ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        toast.clear();
        if (isEditMode) {
          toast.success(isRtl ? 'تم تحديث المنشور بنجاح! ✨' : 'Post updated successfully! ✨');
        } else {
          toast.success(isRtl ? 'تم نشر منشورك بنجاح! 🎉' : 'Your post has been published successfully! 🎉');
        }
        setIsAdModalOpen(false);
        setIsEditMode(false);
        setEditingAdId(null);
        setAdFormData({
          title: '',
          description: '',
          image_url: '',
          video_url: '',
          media_gallery: [],
          whatsapp_number: '',
          phone_number: '',
          target_url: '',
          hashtags: '',
          page_id: '',
          location_city: 'القدس الشريف',
          location_radius: '10',
          feeling: '',
          is_ai_generated: false,
          tagged_users: [],
          has_whatsapp_button: false,
          audience: 'public',
          ad_format: 'post',
          quick_questions: ['', '', ''],
          aspect_ratio: 'grid'
        });
        fetchMyAds();
        fetchAds();
        fetchWallet();
        if (selectedPageDetail) {
          handleOpenPageDetail(selectedPageDetail.page.id);
        }
        // Redirect to homepage feed and scroll to top
        setActiveTab('board');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        toast.error(data.error || 'فشل نشر المنشور');
      }
    } catch (error) {
      console.error('Error creating ad:', error);
      toast.error('حدث خطأ أثناء نشر الإعلان');
    } finally {
      setIsSubmittingAd(false);
    }
  };

  const handleMixedMediaUpload = async (e: React.ChangeEvent<HTMLInputElement> | { target: { files: FileList | File[] } }) => {
    const filesList = e.target.files;
    if (!filesList || filesList.length === 0) return;

    setIsAdModalOpen(true);
    const filesArray = Array.from(filesList);

    const currentGallery = adFormData.media_gallery || [];
    const maxLimit = 20;

    if (currentGallery.length >= maxLimit) {
      toast.error(isRtl ? `الحد الأقصى هو ${maxLimit} وسيطة للمنشور الواحد` : `Cannot upload more than ${maxLimit} media items per post`);
      return;
    }

    let filesToUpload = filesArray;
    if (currentGallery.length + filesArray.length > maxLimit) {
      const allowedCount = maxLimit - currentGallery.length;
      toast.warning(
        isRtl 
          ? `الحد الأقصى هو ${maxLimit} عنصر. سيتم رفع أول ${allowedCount} وسائط إضافية فقط.` 
          : `Maximum limit is ${maxLimit} items. Only the first ${allowedCount} items will be uploaded.`
      );
      filesToUpload = filesArray.slice(0, allowedCount);
    }

    const toastId = toast.loading(
      isRtl 
        ? `جاري معالجة ورفع الوسائط (${filesToUpload.length} عنصر)...` 
        : `Processing and uploading media (${filesToUpload.length} items)...`
    );

    try {
      const authToken = token || secureStorage.getSync('app_token') || '';
      const newItems: MediaGalleryItem[] = [];
      let imagesUploaded = 0;
      let videosUploaded = 0;

      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        const isVideo = file.type.startsWith('video/');
        const isImage = file.type.startsWith('image/');

        if (!isVideo && !isImage) {
          toast.error(isRtl ? `الملف ${file.name} ليس مدعوماً (صور أو فيديو فقط)` : `File ${file.name} is not supported`);
          continue;
        }

        if (isVideo) {
          if (file.size > 100 * 1024 * 1024) {
            toast.error(isRtl ? `حجم الفيديو ${file.name} يتجاوز 100MB` : `Video ${file.name} exceeds 100MB`);
            continue;
          }

          let thumbUrl: string | undefined;
          try {
            thumbUrl = await extractVideoThumbnail(file);
          } catch (_) {}

          const formDataUpload = new FormData();
          formDataUpload.append('file', file);

          const res = await fetch('/api/files/upload', {
            method: 'POST',
            headers: { Authorization: `Bearer ${authToken}` },
            body: formDataUpload
          });

          if (res.ok) {
            const data = await res.json();
            const rawUrl = data.fileUrl || data.file?.url || data.file?.file_url || data.url || data.path;
            const fileUrl = getMediaUrl(rawUrl);
            if (fileUrl) {
              newItems.push({
                id: `vid-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                url: fileUrl,
                type: 'video',
                caption: '',
                thumbnailUrl: thumbUrl
              });
              videosUploaded++;
            }
          }
        } else {
          // Image
          if (file.size > 25 * 1024 * 1024) {
            toast.error(isRtl ? `حجم الصورة ${file.name} يتجاوز 25MB` : `Image ${file.name} exceeds 25MB`);
            continue;
          }

          const compressed = await compressAndResizeImage(file, {
            format: 'feed',
            quality: 0.88,
            mimeType: 'image/webp'
          });

          const formDataUpload = new FormData();
          formDataUpload.append('file', compressed.file);

          const res = await fetch('/api/files/upload', {
            method: 'POST',
            headers: { Authorization: `Bearer ${authToken}` },
            body: formDataUpload
          });

          if (res.ok) {
            const data = await res.json();
            const rawUrl = data.fileUrl || data.file?.url || data.file?.file_url || data.url || data.path;
            const fileUrl = getMediaUrl(rawUrl);
            if (fileUrl) {
              newItems.push({
                id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                url: fileUrl,
                type: 'image',
                caption: ''
              });
              imagesUploaded++;
            }
          }
        }
      }

      if (newItems.length > 0) {
        setAdFormData(prev => {
          const combinedGallery = [...(prev.media_gallery || []), ...newItems];
          const allImages = combinedGallery.filter(m => m.type === 'image').map(m => m.url);
          const firstVideo = combinedGallery.find(m => m.type === 'video');

          return {
            ...prev,
            media_gallery: combinedGallery,
            image_url: allImages.join(','),
            video_url: firstVideo ? firstVideo.url : prev.video_url
          };
        });
        toast.dismiss(toastId);
        const msg = isRtl
          ? `تم رفع الوسائط بنجاح (${imagesUploaded} صور، ${videosUploaded} فيديو)!`
          : `Successfully uploaded ${imagesUploaded} images & ${videosUploaded} videos!`;
        toast.success(msg);
      } else {
        throw new Error('No files uploaded');
      }
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(isRtl ? 'حدث خطأ أثناء رفع الوسائط، يرجى المحاولة لاحقاً' : 'Error uploading media files, please try again.');
    }
  };

  const handleImageFileUpload = (e: any) => handleMixedMediaUpload(e);

  const handleVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      toast.error(isRtl ? 'حجم الفيديو كبير جداً (الحد الأقصى 100MB)' : 'Video file is too large (max 100MB)');
      return;
    }

    setIsAdModalOpen(true);
    const localUrl = URL.createObjectURL(file);
    
    setVideoMetadataInfo({
      fileName: file.name,
      fileSize: file.size,
      localVideoUrl: localUrl,
      uploadProgress: 0,
      processingStage: 'uploading'
    });

    const formDataUpload = new FormData();
    formDataUpload.append('file', file);

    const handleUploadFallback = (f: File, url: string) => {
      console.error('Video upload failed, falling back to local object URL');
      setAdFormData(prev => ({ ...prev, video_url: url }));
      setVideoMetadataInfo(prev => ({
        ...prev,
        processingStage: 'done',
        uploadProgress: 100
      }));
      toast.success(isRtl ? 'تم تحميل المقطع محلياً وجاهز للنشر!' : 'Video loaded locally and ready!');
      extractVideoThumbnail(f).then(thumb => {
        if (thumb) {
          setAdFormData(prev => ({ ...prev, image_url: prev.image_url || thumb }));
        }
      }).catch(() => {});
    };

    const authToken = token || secureStorage.getSync('app_token') || '';
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/files/upload', true);
    xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = (event.loaded / event.total) * 100;
        setVideoMetadataInfo(prev => ({
          ...prev,
          uploadProgress: percentComplete,
          processingStage: percentComplete >= 100 ? 'transcoding' : 'uploading'
        }));
      }
    };

    xhr.onload = async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          const rawUrl = data.fileUrl || data.file?.file_url || data.file?.url || data.url || data.path;
          const fileUrl = getMediaUrl(rawUrl);
          if (fileUrl) {
            setAdFormData(prev => {
              const gallery = [...(prev.media_gallery || [])];
              if (!gallery.some(m => m.url === fileUrl)) {
                gallery.push({
                  id: `vid-${Date.now()}`,
                  url: fileUrl,
                  type: 'video',
                  caption: ''
                });
              }
              return {
                ...prev,
                video_url: fileUrl,
                media_gallery: gallery,
                ad_format: (prev.ad_format as string) === 'banner' ? 'post' : (prev.ad_format || 'post')
              };
            });
            
            setVideoMetadataInfo(prev => ({
              ...prev,
              fileSize: data.fileSize || data.file?.file_size || file.size,
              duration: data.duration || data.file?.duration,
              resolution: data.resolution || data.file?.resolution,
              processingStage: 'done',
              uploadProgress: 100
            }));
            
            toast.success(isRtl ? 'تم رفع وتشغيل مقطع الفيديو بنجاح!' : 'Video uploaded & ready!');

            try {
              const thumb = await extractVideoThumbnail(file);
              if (thumb) {
                setAdFormData(prev => ({
                  ...prev,
                  image_url: prev.image_url || thumb
                }));
              }
            } catch (thumbErr) {
              // Auto video thumbnail extraction silent handling
            }
          } else {
             handleUploadFallback(file, localUrl);
          }
        } catch (err) {
          console.error('Parse response error:', err);
          handleUploadFallback(file, localUrl);
        }
      } else {
        const errJson = (() => { try { return JSON.parse(xhr.responseText); } catch (e) { return {}; } })();
        toast.error(errJson.error || errJson.message_ar || (isRtl ? 'فشل الرفع' : 'Upload failed'));
        handleUploadFallback(file, localUrl);
      }
    };

    xhr.onerror = () => {
      toast.error(isRtl ? 'حدث خطأ في الشبكة' : 'Network error occurred');
      handleUploadFallback(file, localUrl);
    };

    xhr.send(formDataUpload);
  };

  const handleReelFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!token) {
      toast.error(isRtl ? 'يرجى تسجيل الدخول أولاً' : 'Please log in first');
      return;
    }

    if (!file.type.startsWith('video/')) {
      toast.error(isRtl ? 'يرجى اختيار مقطع فيديو فقط لرفع الريلز القياسي (9:16)' : 'Please select a video file for standard Reels (9:16)');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      toast.error(isRtl ? 'حجم فيديو الريلز كبير جداً (الحد الأقصى 100MB)' : 'Reel video file is too large (max 100MB)');
      return;
    }

    setAdFormData(prev => ({ ...prev, ad_format: 'reel' }));

    const localUrl = URL.createObjectURL(file);
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.src = localUrl;

    tempVideo.onloadedmetadata = () => {
      const w = tempVideo.videoWidth || 1080;
      const h = tempVideo.videoHeight || 1920;
      const d = tempVideo.duration || 0;

      const isVertical = h >= w;

      if (!isVertical || d > 90) {
        toast.info(
          isRtl
            ? 'المقطع غير رأسي (9:16) أو يتجاوز 90 ثانية. تم فتح أداة التعديل لقص الضبط القياسي تلقائياً!'
            : 'Video is non-vertical (9:16) or exceeds 90s. Trimmer opened for automatic 9:16 framing!'
        );
        setTrimmerVideoUrl(localUrl);
        setIsTrimmerModalOpen(true);
      } else {
        toast.success(isRtl ? 'تم التحقق من المقطع: قياس رأسي عالمي 9:16 جاهز للنشر كـ Reels!' : 'Validated: International 9:16 vertical Reel ready!');
        handleVideoFileUpload(e);
      }
    };

    tempVideo.onerror = () => {
      handleVideoFileUpload(e);
    };
  };

  const handleCreatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error(isRtl ? 'يرجى تسجيل الدخول أولاً' : 'Please log in first');
      return;
    }

    setIsSubmittingPage(true);
    try {
      const res = await fetch('/api/bulletin/pages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(pageFormData)
      });
      const data = await res.json();
      if (data.success) {
        toast.success(isRtl ? 'مبروك! تم إنشاء صفحتك التجارية وتفعيلها بنجاح 🏪' : 'Merchant page created successfully!');
        setIsPageModalOpen(false);
        setPageFormData({
          name: '',
          category: 'تجارة إلكترونية / E-Commerce',
          city: 'غزة',
          address: '',
          description: '',
          avatar_url: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=200&q=80',
          cover_url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80',
          whatsapp_number: '',
          phone_number: '',
          website_url: ''
        });
        fetchPages();
        fetchMyPages();
      } else {
        toast.error(data.error || 'فشل إنشاء الصفحة التجارية');
      }
    } catch (e) {
      toast.error('حدث خطأ أثناء إنشاء الصفحة');
    } finally {
      setIsSubmittingPage(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIsSubmittingProfile(true);
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: profileFormData.name,
          avatar: profileFormData.avatar,
          custom_instructions: profileFormData.custom_instructions
        })
      });
      if (res.ok) {
        toast.success(isRtl ? 'تم تحديث ملفك الشخصي بنجاح! ✨' : 'Profile updated successfully!');
        await refreshUser();
        setIsProfileEditModalOpen(false);
      } else {
        const err = await res.json();
        toast.error(err.error || (isRtl ? 'فشل تعديل الملف الشخصي' : 'Failed to update profile'));
      }
    } catch (e) {
      toast.error(isRtl ? 'حدث خطأ غير متوقع' : 'An unexpected error occurred');
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  const handleKycSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!kycFullName.trim() || !kycSelfieUrl.trim()) {
      toast.error(isRtl ? 'يرجى ملء جميع الحقول المطلوبة لتوثيق الهوية' : 'Please fill in all required fields');
      return;
    }
    setIsSubmittingProfile(true);
    try {
      const res = await fetch('/api/kyc/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          fullName: kycFullName.trim(),
          selfie: kycSelfieUrl.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(isRtl ? 'تم إرسال طلب التوثيق بنجاح! قيد المراجعة 🛡️' : 'Verification request submitted successfully!');
        await refreshUser();
        setIsProfileEditModalOpen(false);
      } else {
        toast.error(data.error || (isRtl ? 'فشل إرسال طلب التوثيق' : 'Failed to submit verification'));
      }
    } catch (e) {
      toast.error(isRtl ? 'حدث خطأ غير متوقع' : 'An unexpected error occurred');
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  const handleSavePageEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingPageData) return;
    setIsSubmittingPageEdit(true);
    try {
      const payload: any = {
        ...editPageFormData,
        managers: editPageManagers
      };

      const res = await fetch(`/api/bulletin/pages/${editingPageData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        toast.success(isRtl ? 'تم حفظ تعديلات الصفحة التجارية بنجاح! 🏪' : 'Page edited successfully!');
        setIsEditPageModalOpen(false);
        setEditingPageData(null);
        await fetchPages();
        await fetchMyPages();
        
        if (selectedPageDetail && selectedPageDetail.page.id === data.page.id) {
          setSelectedPageDetail(prev => prev ? { ...prev, page: data.page } : null);
        }
      } else {
        toast.error(data.error || (isRtl ? 'فشل تعديل الصفحة التجارية' : 'Failed to edit page'));
      }
    } catch (e) {
      toast.error(isRtl ? 'حدث خطأ أثناء تعديل الصفحة' : 'Error updating page');
    } finally {
      setIsSubmittingPageEdit(false);
    }
  };

  const handleShareAd = async (ad: BulletinAd) => {
    const shareUrl = `${window.location.origin}/viralbook/${ad.id}`;

    try {
      await fetch(`/api/bulletin/ads/${ad.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: user?.id,
          sharer_name: user?.name || user?.email || (isRtl ? 'أحد المستخدمين' : 'A user'),
        }),
      });
    } catch (e) {}

    // 1. If native system share sheet is supported, invoke it cleanly without conflicting toasts
    if (navigator.share) {
      try {
        await navigator.share({
          title: ad.title,
          text: ad.description,
          url: shareUrl
        });
        return;
      } catch (e: any) {
        // Dismissed / cancelled by user - stop cleanly without showing conflicting notifications
        if (e?.name === 'AbortError') {
          return;
        }
      }
    }

    // 2. Fallback only if native share is not available on this platform
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = shareUrl;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      toast.success(isRtl ? 'تم نسخ رابط المنشور بنجاح' : 'Post link copied to clipboard');
    } catch (err) {}
  };

  const handleWhatsAppClick = (ad: BulletinAd, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!ad.whatsapp_number) return;
    
    fetch(`/api/bulletin/ads/${ad.id}/click`, { method: 'POST' }).catch(() => {});

    let cleanPhone = ad.whatsapp_number.replace(/[^0-9]/g, '');
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
      `مرحباً! أود الاستفسار عن إعلانك "${ad.title}" على المنصة التجارية.`
    )}`;
    window.open(waUrl, '_blank');
  };

  const filteredInquiriesList = inquiriesList.filter(inq => {
    const term = inquiriesSearchTerm.toLowerCase();
    return (
      (inq.sender_name && inq.sender_name.toLowerCase().includes(term)) ||
      (inq.message && inq.message.toLowerCase().includes(term)) ||
      (inq.ad_title && inq.ad_title.toLowerCase().includes(term)) ||
      (inq.sender_phone && inq.sender_phone.toLowerCase().includes(term))
    );
  });

  // ---------------------------------------------------------
  // STORY GROUPING LOGIC (Facebook Style)
  // ---------------------------------------------------------
  const orderedStories = useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    stories.forEach((story: any) => {
      // Group by page_id if it's a merchant story, otherwise by user_id
      const key = story.page_id ? `page-${story.page_id}` : `user-${story.author_id || story.user_id}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(story);
    });

    const result: any[] = [];
    Object.values(groups).forEach(group => {
      // Sort stories in each group by date (latest first)
      const sorted = [...group].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      // Limit to 10 stories per user/page as requested
      result.push(...sorted.slice(0, 10));
    });
    return result;
  }, [stories]);

  const representativeStories = useMemo(() => {
    const seen = new Set();
    return orderedStories.filter((story: any) => {
      const key = story.page_id ? `page-${story.page_id}` : `user-${story.author_id || story.user_id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [orderedStories]);

  const handleMobileBack = () => {
    if (isMobileSearchOpen) {
      setIsMobileSearchOpen(false);
      return;
    }
    if (selectedPageDetail) {
      handleBackToBoard();
      return;
    }
    if (activeTab !== 'board') {
      setActiveTab('board');
      return;
    }
    navigate('/chat');
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] transition-theme pb-[calc(var(--safe-area-spacing)+6px+env(safe-area-inset-bottom,0px))]">
      
      {/* Top Banner / Hero Header Section - Hidden on Mobile and in Analytics/Pages full view */}
      {activeTab !== 'analytics' && activeTab !== 'pages' && !selectedPageDetail && (
        <div className="hidden lg:block relative border-b border-gray-200/80 dark:border-gray-800/80 bg-gradient-to-b from-gray-500/10 via-transparent to-transparent py-8 px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-start max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[4px] bg-accent/10 border border-accent/20 text-accent text-xs font-bold">
                <Sparkles size={14} className="animate-spin-slow" />
                <span>{isRtl ? 'فيرال بوك - شبكة المحتوى والترويج التفاعلي' : 'Viralbook - Interactive Content & Promotion Network'}</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight">
                {isRtl ? 'فيرال بوك | Viralbook' : 'Viralbook Platform'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                {isRtl
                  ? 'المنظومة الرقمية المتكاملة لإدارة الحملات الإعلانية التجارية، تسويق المنتجات، وتنمية العلامات التجارية'
                  : 'The ultimate digital ecosystem for commercial ad campaign management, product marketing, and brand development.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Container - Facebook 3-Column Layout */}
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 pt-1 sm:pt-4 lg:pt-6 pb-28 lg:pb-8">
        
        {/* Header Search & Sort Toolbar - Hidden on Mobile (moved to sidebar) */}
        {!selectedPageDetail && (
          <div className="hidden lg:flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-gray-200/80 dark:border-gray-800/80">
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-extrabold text-gray-800 dark:text-gray-200">
                {activeTab === 'board' && (isRtl ? 'الإعلانات والمنشورات' : 'Ads & Posts')}
                {activeTab === 'pages' && (isRtl ? 'دليل الصفحات التجارية' : 'Merchant Pages Directory')}
                {activeTab === 'inquiries' && (isRtl ? 'الرسائل والاستفسارات' : 'Inquiries & Messages')}
                {activeTab === 'my_ads' && (isRtl ? 'حملاتي وإعلاناتي النشطة' : 'My Active Campaigns')}
                {activeTab === 'analytics' && (isRtl ? 'تحليلات نتائج الإعلانات' : 'Ad Performance Analytics')}
              </h2>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Desktop Location Selector Button */}
              {activeTab === 'board' && (
                <button
                  type="button"
                  onClick={() => setIsLocationFlyoutOpen(!isLocationFlyoutOpen)}
                  className="flex items-center gap-1.5 px-2.5 h-8 rounded-[8px] bg-accent/10 hover:bg-accent/20 text-accent dark:text-accent font-bold text-[12px] border border-accent/30 transition-theme shrink-0"
                  title={isRtl ? 'تحديد نطاق تغطية الموقع' : 'Location radius filter'}
                >
                  <MapPin size={13} className="text-accent animate-pulse shrink-0" />
                  <span className="max-w-[150px] truncate">
                    {selectedCity === 'all' 
                      ? (isRtl ? '📍 كافة المحافظات' : '📍 All Regions') 
                      : `📍 ${selectedCity} (${selectedRadius === 'all' ? (isRtl ? 'الكل' : 'All') : `+${selectedRadius} ${isRtl ? 'كم' : 'km'}`})`}
                  </span>
                  <ChevronDown size={12} className={`transition-transform duration-200 shrink-0 ${isLocationFlyoutOpen ? 'rotate-180' : ''}`} />
                </button>
              )}

              <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:w-64">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isRtl ? 'بحث...' : 'Search...'}
                  className="w-full ps-8 pe-3 h-8 text-[12px] rounded-[var(--radius-sm)] bg-[var(--surface-card)] text-[var(--text-primary)] border border-[var(--border-main)] focus:outline-none focus:border-accent transition-theme"
                />
                <Search size={13} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              </form>

              {activeTab === 'board' && (
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'latest' | 'popular')}
                  className="px-2.5 h-8 text-[12px] rounded-[var(--radius-sm)] bg-[var(--surface-card)] text-[var(--text-primary)] border border-[var(--border-main)] focus:outline-none focus:border-accent transition-theme shrink-0"
                >
                  <option value="latest">{isRtl ? 'الأحدث' : 'Latest'}</option>
                  <option value="popular">{isRtl ? 'الأكثر تفاعلاً' : 'Popular'}</option>
                </select>
              )}
            </div>
          </div>
        )}

        {/* Mobile Ads Sidebar Drawer (Facebook / Instagram Style) */}
        <AnimatePresence>
          {isMobileSidebarOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileSidebarOpen(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ x: isRtl ? '100%' : '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: isRtl ? '100%' : '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                className={`absolute top-0 bottom-0 ${isRtl ? 'end-0' : 'start-0'} w-80 max-w-[85%] bg-white dark:bg-[#1a1a1c] shadow-2xl z-10 flex flex-col`}
              >
                <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-[8px] bg-accent/10 flex items-center justify-center text-accent font-bold">
                      <SlidersHorizontal size={14} />
                    </div>
                    <h3 className="text-xs font-extrabold">{isRtl ? 'قائمة فيرال بوك والتحكم' : 'Viralbook Menu & Controls'}</h3>
                  </div>
                  <button
                    onClick={() => setIsMobileSidebarOpen(false)}
                    className="w-8 h-8 rounded-[8px] border border-[var(--border-main)] flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[var(--surface-subtle)] active:scale-95 transition-theme"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-5">
                  {/* Navigation Links (Facebook-style Mobile Menu) */}
                  <div className="space-y-1.5 pb-2 border-b border-gray-100 dark:border-gray-800">
                    <h4 className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mb-2">{isRtl ? 'أقسام المنصة' : 'Platform Sections'}</h4>
                    <button
                      onClick={() => { setSelectedPageDetail(null); setActiveTab('board'); setIsMobileSidebarOpen(false); }}
                      className={`group w-full px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-theme ${
                        activeTab === 'board' && !selectedPageDetail
                          ? 'bg-accent dark:bg-accent/10 text-accent dark:text-accent shadow-sm border border-accent dark:border-accent/20'
                          : 'bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900/60'
                      }`}
                    >
                      <Megaphone size={16} className={`transition-theme ${activeTab === 'board' && !selectedPageDetail ? 'text-accent ' : 'text-gray-400 group-hover:text-accent'}`} />
                      <span>{isRtl ? 'الإعلانات والمنشورات' : 'Ads & Posts'}</span>
                    </button>

                    <button
                      onClick={() => { setSelectedPageDetail(null); setActiveTab('pages'); setIsMobileSidebarOpen(false); }}
                      className={`group w-full px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-theme ${
                        activeTab === 'pages' && !selectedPageDetail
                          ? 'bg-accent dark:bg-accent/10 text-accent dark:text-accent shadow-sm border border-accent dark:border-accent/20'
                          : 'bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900/60'
                      }`}
                    >
                      <Building2 size={16} className={`transition-theme ${activeTab === 'pages' && !selectedPageDetail ? 'text-accent ' : 'text-gray-400 group-hover:text-accent'}`} />
                      <span>{isRtl ? 'الصفحات التجارية' : 'Merchant Pages'}</span>
                    </button>

                    {user && (
                      <button
                        onClick={() => { setSelectedPageDetail(null); setActiveTab('inquiries'); setIsMobileSidebarOpen(false); }}
                        className={`group w-full px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-theme ${
                          activeTab === 'inquiries' && !selectedPageDetail
                            ? 'bg-accent dark:bg-accent/10 text-accent dark:text-accent shadow-sm border border-accent dark:border-accent/20'
                            : 'bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900/60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Inbox size={16} className={`transition-theme ${activeTab === 'inquiries' && !selectedPageDetail ? 'text-accent ' : 'text-gray-400 group-hover:text-accent'}`} />
                          <span>{isRtl ? 'الرسائل والاستفسارات' : 'Inquiries & Messages'}</span>
                        </div>
                        {inquiriesList.length > 0 && (
                          <span className="px-2 py-0.5 rounded-[4px] bg-accent/10 text-accent text-[10px] font-black">
                            {inquiriesList.length}
                          </span>
                        )}
                      </button>
                    )}

                    {user && (
                      <button
                        onClick={() => { setSelectedPageDetail(null); setActiveTab('my_ads'); setIsMobileSidebarOpen(false); }}
                        className={`group w-full px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-theme ${
                          activeTab === 'my_ads' && !selectedPageDetail
                            ? 'bg-accent dark:bg-accent/10 text-accent dark:text-accent shadow-sm border border-accent dark:border-accent/20'
                            : 'bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900/60'
                        }`}
                      >
                        <Tag size={16} className={`transition-theme ${activeTab === 'my_ads' && !selectedPageDetail ? 'text-accent ' : 'text-gray-400 group-hover:text-accent'}`} />
                        <span>{isRtl ? 'إعلاناتي وإدارتها' : 'My Advertisements'}</span>
                      </button>
                    )}

                    <button
                      onClick={() => { setSelectedPageDetail(null); setActiveTab('analytics'); setIsMobileSidebarOpen(false); }}
                      className={`group w-full px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-theme ${
                        activeTab === 'analytics' && !selectedPageDetail
                          ? 'bg-accent dark:bg-accent/10 text-accent dark:text-accent shadow-sm border border-accent dark:border-accent/20'
                          : 'bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900/60'
                      }`}
                    >
                      <BarChart2 size={16} className={`transition-theme ${activeTab === 'analytics' && !selectedPageDetail ? 'text-accent ' : 'text-gray-400 group-hover:text-accent'}`} />
                      <span>{isRtl ? 'تحليلات الأداء' : 'Performance Analytics'}</span>
                    </button>

                    <button
                      onClick={() => {
                        if (!token) { setIsAuthModalOpen(true); return; }
                        setSelectedPageDetail(null);
                        setActiveTab('saved');
                        setIsMobileSidebarOpen(false);
                        fetchSavedAds();
                      }}
                      className={`group w-full px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-theme ${
                        activeTab === 'saved' && !selectedPageDetail
                          ? 'bg-accent dark:bg-accent/10 text-accent dark:text-accent shadow-sm border border-accent dark:border-accent/20'
                          : 'bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900/60'
                      }`}
                    >
                      <Bookmark size={16} className={`transition-theme ${activeTab === 'saved' && !selectedPageDetail ? 'text-accent ' : 'text-gray-400 group-hover:text-accent'}`} />
                      <span>{isRtl ? 'المحفوظات' : 'Saved Items'}</span>
                    </button>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => {
                        if (!token) { setIsAuthModalOpen(true); return; }
                        setIsPageModalOpen(true);
                        setIsMobileSidebarOpen(false);
                      }}
                      className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Building2 size={14} className="text-accent" />
                      <span>{isRtl ? 'إنشاء صفحة' : 'Create Page'}</span>
                    </button>
                    <button
                      onClick={() => {
                        if (!token) { setIsAuthModalOpen(true); return; }
                        setIsAdModalOpen(true);
                        setIsMobileSidebarOpen(false);
                      }}
                      className="p-2.5 rounded-xl bg-accent text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-none"
                    >
                      <Plus size={14} />
                      <span>{isRtl ? 'نشر إعلان' : 'Publish Ad'}</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Layout Grid: Main Content + Sidebar OR Standalone Views */}
        {activeTab === 'analytics' && !selectedPageDetail ? (
          /* VIEW 1: DEDICATED FULL ANALYTICS VIEW */
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-transparent border border-gray-200/80 dark:border-white/[0.06]">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveTab('board')}
                  className="px-4 py-2 rounded-xl bg-accent hover:bg-accent text-white font-bold text-xs flex items-center gap-2 shadow transition-theme active:scale-95"
                >
                  {isRtl ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
                  <span>{isRtl ? 'رجوع إلى خلاصة الإعلانات' : 'Back to Feed'}</span>
                </button>
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold flex items-center gap-2">
                    <BarChart2 size={18} className="text-accent" />
                    <span>{isRtl ? 'تحليلات نتائج الإعلانات وأداء الحملات' : 'Ad Performance Analytics'}</span>
                  </h2>
                  <p className="text-[11px] text-gray-400">
                    {isRtl ? 'متابعة تفصيلية لنسب المشاهدة، التفاعلات، والنقرات المباشرة' : 'Detailed conversion metrics, impressions, and engagement'}
                  </p>
                </div>
              </div>
            </div>

            <UserAdAnalyticsView />
          </div>
        ) : activeTab === 'reels' ? (
          /* VIEW REELS: FULL SCREEN VERTICAL SWIPEABLE REELS FEED STREAM */
          <div className="w-full h-full">
            {/* Reels Feed Component */}
            <ReelsFeed
              ads={combinedReelsAds.length > 0 ? combinedReelsAds : ads}
              isRtl={isRtl}
              token={token}
              user={user}
              commentsMap={commentsMap}
              onToggleLike={handleToggleLike}
              onToggleSave={handleToggleSave}
              onAddComment={handleAddComment}
              onToggleCommentLike={handleToggleCommentLike}
              onMessageAdvertiser={handleMessageAdvertiser}
              onShare={handleShareAd}
              onBoostAd={handleOpenBoostModal}
              onDeleteReel={(id) => {
                const ad = ads.find(a => a.id === id);
                if (ad) handleDeleteAd(ad);
              }}
              onEditReel={handleEditAd}
              onOpenPageDetail={handleOpenPageDetail}
              onClose={() => setActiveTab('board')}
              onOpenUploadReels={openReelUploadModal}
              onUploadReelClick={openReelUploadModal}
              onViewPost={handleNavigateToPost}
              onArchiveAd={(archivedAd) => {
                setAds(prev => prev.filter(a => a.id !== archivedAd.id));
                setSavedAds(prev => prev.filter(a => a.id !== archivedAd.id));
              }}
              onTrashAd={(trashedAd) => {
                setAds(prev => prev.filter(a => a.id !== trashedAd.id));
                setSavedAds(prev => prev.filter(a => a.id !== trashedAd.id));
              }}
              onUpdateAd={(updatedAd) => {
                setAds(prev => prev.map(a => a.id === updatedAd.id ? { ...a, ...updatedAd } : a));
                setSavedAds(prev => prev.map(a => a.id === updatedAd.id ? { ...a, ...updatedAd } : a));
              }}
              onReportAd={handleReportAd}
              initialAdId={activeReelModalId || undefined}
              isLoading={loading}
            />
          </div>
        ) : activeTab === 'pages' && !selectedPageDetail ? (
          /* VIEW 2: DEDICATED ALL PAGES DIRECTORY VERTICAL FEED STREAM */
          <div className="space-y-6 max-w-4xl mx-auto px-2 sm:px-0">
            {/* Header Bar with Back Button */}
            <div className="ui-card-container flex flex-col sm:flex-row items-center justify-between gap-3 text-start">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={() => setActiveTab('board')}
                  className="ui-btn-secondary text-xs shrink-0 cursor-pointer"
                >
                  {isRtl ? <ArrowRight size={15} /> : <ArrowLeft size={15} />}
                  <span>{isRtl ? 'رجوع إلى خلاصة الإعلانات' : 'Back to Feed'}</span>
                </button>
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-base font-extrabold flex items-center gap-2 text-[var(--text-primary)]">
                    <Building2 size={18} className="text-accent shrink-0" />
                    <span>{isRtl ? 'دليل الصفحات والأنشطة التجارية' : 'Commercial Pages & Business Directory'}</span>
                  </h2>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    {isRtl ? 'تصفح واستكشف كافة الكيانات والأنشطة التجارية الموثوقة' : 'Explore all verified business profiles and commercial entities'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  if (!token) {
                    toast.error(isRtl ? 'يرجى تسجيل الدخول أولاً' : 'Please log in first');
                    return;
                  }
                  setIsPageModalOpen(true);
                }}
                className="ui-btn-primary text-xs w-full sm:w-auto shrink-0 cursor-pointer"
              >
                <Plus size={15} />
                <span>{isRtl ? 'أنشئ صفحتك التجارية' : 'Create Merchant Page'}</span>
              </button>
            </div>

            {/* Pages Vertical Feed */}
            {pagesLoading ? (
              <div className="space-y-6">
                {[1, 2, 3].map(n => (
                  <div key={`bulletin-skel-pages-${n}`} className="rounded-3xl bg-white dark:bg-transparent h-72 border border-gray-200/80 dark:border-white/[0.06] animate-pulse"></div>
                ))}
              </div>
            ) : pagesList.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <Building2 size={32} className="text-[var(--text-muted)] mx-auto" />
                <h3 className="text-sm font-bold text-[var(--text-primary)]">{isRtl ? 'لا توجد صفحات تجارية مطابقة' : 'No Merchant Pages Found'}</h3>
                <button
                  onClick={() => setIsPageModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[var(--text-primary)] hover:text-accent transition-theme cursor-pointer border border-[var(--border-main)] rounded-[var(--radius-full)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)]"
                >
                  <Plus size={14} className="stroke-[2.5]" />
                  <span>{isRtl ? 'إنشاء صفحة تجارية' : 'Create Merchant Page'}</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto">
                {pagesList.map((page, pIdx) => (
                  <motion.div
                    key={`page-item-${page.id}-${pIdx}`}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-3xl bg-white dark:bg-transparent border border-gray-200/80 dark:border-white/[0.06] transition-theme space-y-4"
                  >
                    {/* Cover Banner */}
                    <div className="h-32 sm:h-52 w-full bg-gray-200 dark:bg-gray-800 relative cursor-pointer overflow-hidden rounded-t-3xl" onClick={() => handleOpenPageDetail(page.id)}>
                      <img src={getMediaUrl(page.cover_url)} alt={page.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                      <span className="absolute top-3 start-3 px-3 py-1 rounded-[4px] bg-black/60 text-white text-[11px] font-bold backdrop-blur-md">
                        {page.category}
                      </span>
                    </div>

                    {/* Avatar & Header Info */}
                    <div className="px-4 sm:px-6 -mt-12 sm:-mt-16 space-y-3 relative z-10">
                      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                        <div className="flex items-end gap-3 cursor-pointer min-w-0" onClick={() => handleOpenPageDetail(page.id)}>
                          <BulletinAvatar
                            src={page.avatar_url}
                            alt={page.name}
                            size="lg"
                            isPage={true}
                          />
                          <div className="mb-1 min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <h3 className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-white truncate hover:text-accent transition-colors">{page.name}</h3>
                              <CheckCircle2 size={16} className="text-blue-500 shrink-0" />
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                              <span className="flex items-center gap-1"><MapPin size={12} className="text-accent" /> {page.city}</span>
                              <span>•</span>
                              <span>{page.followers_count} {isRtl ? 'متابع' : 'Followers'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 pt-1 sm:pt-0 overflow-x-auto pb-1 sm:pb-0">
                          <button
                            onClick={() => handleToggleFollowPage(page.id)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold transition-theme flex items-center gap-1 shadow shrink-0 ${
                              page.user_is_following
                                ? 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                                : 'bg-accent text-white hover:bg-accent'
                            }`}
                          >
                            {page.user_is_following ? <UserCheck size={14} /> : <UserPlus size={14} />}
                            <span>{page.user_is_following ? (isRtl ? 'متابع' : 'Following') : (isRtl ? 'متابعة' : '+ Follow')}</span>
                          </button>

                          <button
                            onClick={() => handleOpenPageDetail(page.id)}
                            className="px-3 py-2 rounded-xl bg-gray-900 text-white dark:bg-gray-100 dark:text-black font-black text-xs flex items-center gap-1 shadow shrink-0"
                          >
                            <Globe size={14} />
                            <span>{isRtl ? 'زيارة' : 'Visit'}</span>
                          </button>

                          {page.whatsapp_number && (
                            <a
                              href={`https://wa.me/${page.whatsapp_number.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="w-9 h-9 rounded-[var(--radius-xs)] bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 flex items-center justify-center transition-theme shadow-2xs shrink-0 cursor-pointer" style={{ color: SOCIAL_COLORS.whatsapp.base }}
                              title={isRtl ? 'تواصل عبر واتساب' : 'WhatsApp'}
                              aria-label={isRtl ? 'تواصل عبر واتساب' : 'WhatsApp'}
                            >
                              <Phone size={15} />
                            </a>
                          )}
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed pt-1 line-clamp-3">
                        {page.description}
                      </p>
                    </div>

                    <div className="px-4 sm:px-6 pb-3 pt-2 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1.5">
                        <Tag size={13} className="text-accent" />
                        <span className="font-semibold text-gray-700 dark:text-gray-300">{page.ads_count || 0} {isRtl ? 'إعلان نشط' : 'active ads'}</span>
                      </span>

                      <button
                        onClick={() => handleOpenPageDetail(page.id)}
                        className="text-accent font-bold hover:underline flex items-center gap-1 text-xs"
                      >
                        <span>{isRtl ? 'استعراض المنتجات' : 'Browse'}</span>
                        {isRtl ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* VIEW 3: STANDARD 3-COLUMN LAYOUT */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* SIDEBAR: MERCHANT PAGES LIST & SHORTCUTS (4 COLS) - Hidden on Mobile */}
          <div className="hidden lg:block lg:col-span-4 space-y-5 order-2 lg:order-1">
            
            {/* User Profile & Social Shortcuts Box */}
            <div className="ui-card-container space-y-3">
              {user ? (
                <div className="flex items-center justify-between pb-3 border-b border-[var(--border-main)] gap-2">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <BulletinAvatar
                      src={user.avatar}
                      alt={user.name}
                      size="md"
                      isOnline={true}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <h3 className="text-xs font-extrabold truncate">{user.name}</h3>
                        <ShieldCheck size={14} className="text-accent shrink-0" />
                      </div>
                      <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setIsProfileEditModalOpen(true)}
                      className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] text-gray-500 dark:text-gray-400 transition-theme shrink-0 cursor-pointer"
                      title={isRtl ? 'إعدادات الحساب وتوثيق الهوية' : 'Account Settings & Verification'}
                    >
                      <Settings size={18} className="transition-theme hover:rotate-45" />
                    </button>

                    <button
                      onClick={() => { setSelectedPageDetail(null); setActiveTab('inquiries'); }}
                      className="relative p-2.5 rounded-xl bg-accent/10 hover:bg-accent/20 text-accent transition-theme shrink-0 group shadow-2xs cursor-pointer"
                      title={isRtl ? 'صندوق محادثات المسنجر' : 'Messenger Chats'}
                    >
                      <MessageSquare size={18} className="transition-theme" />
                      {inquiriesList.length > 0 && (
                        <span className="absolute -top-1 -end-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-extrabold flex items-center justify-center ring-2 ring-white dark:ring-black">
                          {inquiriesList.length}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-accent/10 border border-accent/20 text-center space-y-2">
                  <p className="text-xs font-bold text-accent">
                    {isRtl ? 'سجل الدخول لنشر وتفاعل كامل مع الإعلانات!' : 'Sign in to publish and interact!'}
                  </p>
                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className="w-full py-2 rounded-xl bg-accent text-white font-bold text-xs shadow"
                  >
                    {isRtl ? 'تسجيل الدخول / حساب جديد' : 'Sign In'}
                  </button>
                </div>
              )}

              {/* Navigation Quick Links */}
              <div className="space-y-0.5">
                <button
                  onClick={() => { setSelectedPageDetail(null); setActiveTab('board'); }}
                  className={`w-full p-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-theme ${
                    activeTab === 'board' && !selectedPageDetail
                      ? 'bg-accent/10 text-accent'
                      : 'hover:bg-gray-100/60 dark:hover:bg-white/[0.04] text-gray-600 dark:text-gray-300'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Megaphone size={16} className="text-accent" />
                    <span>{isRtl ? 'الإعلانات والمنشورات' : 'Ads & Posts'}</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                    {ads.length}
                  </span>
                </button>

                <button
                  onClick={() => { setSelectedPageDetail(null); setActiveTab('pages'); }}
                  className={`w-full p-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-theme ${
                    activeTab === 'pages' && !selectedPageDetail
                      ? 'bg-accent/10 text-accent'
                      : 'hover:bg-gray-100/60 dark:hover:bg-white/[0.04] text-gray-600 dark:text-gray-300'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Building2 size={16} className="text-blue-500" />
                    <span>{isRtl ? 'دليل الصفحات التجارية' : 'Merchant Pages'}</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500">
                    {pagesList.length}
                  </span>
                </button>

                {user && (
                  <button
                    onClick={() => { setSelectedPageDetail(null); setActiveTab('inquiries'); }}
                    className={`w-full p-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-theme ${
                      activeTab === 'inquiries' && !selectedPageDetail
                        ? 'bg-accent/10 text-accent'
                        : 'hover:bg-gray-100/60 dark:hover:bg-white/[0.04] text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Inbox size={16} className="text-amber-500" />
                      <span>{isRtl ? 'الرسائل والاستفسارات' : 'Inquiries'}</span>
                    </span>
                    {inquiriesList.length > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-white font-extrabold">
                        {inquiriesList.length}
                      </span>
                    )}
                  </button>
                )}

                {user && (
                  <button
                    onClick={() => { setSelectedPageDetail(null); setActiveTab('saved'); fetchSavedAds(); }}
                    className={`w-full p-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-theme ${
                      activeTab === 'saved' && !selectedPageDetail
                        ? 'bg-accent/10 text-accent'
                        : 'hover:bg-gray-100/60 dark:hover:bg-white/[0.04] text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Bookmark size={16} className="text-accent" />
                      <span>{isRtl ? 'المنشورات المحفوظة' : 'Saved Posts'}</span>
                    </span>
                    {savedAds.length > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                        {savedAds.length}
                      </span>
                    )}
                  </button>
                )}

                {user && (
                  <button
                    onClick={() => { setSelectedPageDetail(null); setActiveTab('my_ads'); }}
                    className={`w-full p-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-theme ${
                      activeTab === 'my_ads' && !selectedPageDetail
                        ? 'bg-accent/10 text-accent'
                        : 'hover:bg-gray-100/60 dark:hover:bg-white/[0.04] text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Tag size={16} className="text-accent" />
                      <span>{isRtl ? 'حملاتي وإعلاناتي' : 'My Campaigns'}</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                      {myAds.length}
                    </span>
                  </button>
                )}

                {user && (
                  <button
                    onClick={() => { setSelectedPageDetail(null); setActiveTab('analytics'); }}
                    className={`w-full p-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-theme ${
                      activeTab === 'analytics' && !selectedPageDetail
                        ? 'bg-accent/10 text-accent'
                        : 'hover:bg-gray-100/60 dark:hover:bg-white/[0.04] text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <BarChart2 size={16} className="text-purple-500" />
                      <span>{isRtl ? 'تحليلات نتائج الأداء' : 'Analytics'}</span>
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Dedicated Bulletin Ads Recommendations Card */}
            <RecommendationWidget 
              variant="bulletin"
              filterType="bulletin" 
              limit={3} 
              title={isRtl ? 'إعلانات موصى بها' : 'Recommended Ads'}
              subtitle={isRtl ? 'مقترحات مخصصة بناءً على سلوكك واهتماماتك' : 'Tailored ad suggestions'}
              className="ui-card-container"
            />

            {/* Commercial Profile Settings Box */}
            {user && (
              <div className="ui-card-container space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--border-main)]">
                  <h3 className="text-xs font-extrabold flex items-center gap-1.5 text-[var(--text-primary)]">
                    <Building2 size={16} className="text-accent" />
                    <span>{isRtl ? 'إعدادات التاجر' : 'Merchant Settings'}</span>
                  </h3>
                  <button
                    onClick={() => setIsPageModalOpen(true)}
                    className="ui-btn-pill py-1 px-2.5 text-[11px]"
                    title={isRtl ? 'إضافة ملف تجاري جديد' : 'Add New Commercial Profile'}
                  >
                    <Plus size={13} />
                    <span>{isRtl ? 'إضافة' : 'Add'}</span>
                  </button>
                </div>

                {myPagesList.length === 0 ? (
                  <div className="text-center py-3 text-xs text-[var(--text-muted)] space-y-2">
                    <p>{isRtl ? 'لم تقم بإعداد ملفك التجاري بعد. افصل هويتك الشخصية عن الإعلانات.' : 'No commercial profile setup yet. Separate your personal identity from your ads.'}</p>
                    <button
                      onClick={() => setIsPageModalOpen(true)}
                      className="ui-btn-pill px-3.5 py-1.5 text-[11px]"
                    >
                      {isRtl ? 'إعداد الملف التجاري الآن' : 'Setup Commercial Profile'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {myPagesList.map((page, idx) => (
                      <div
                        key={`my-page-${page.id}-${idx}`}
                        onClick={() => handleOpenPageDetail(page.id)}
                        className={`p-2.5 rounded-[var(--radius-md)] border transition-theme cursor-pointer flex items-center justify-between gap-2.5 hover:border-accent/40 ${
                          selectedPageDetail?.page.id === page.id
                            ? 'bg-accent/10 border-accent'
                            : 'bg-transparent hover:bg-[var(--surface-subtle)] border-[var(--border-main)]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <BulletinAvatar
                            src={page.avatar_url}
                            alt={page.name}
                            size="md"
                            isPage={true}
                          />
                          <div className="min-w-0">
                            <h4 className="text-xs font-extrabold truncate">{page.name}</h4>
                            <p className="text-[10px] text-gray-400 truncate">{page.city} • {page.followers_count} {isRtl ? 'متابع' : 'followers'}</p>
                          </div>
                        </div>

                        <span className="text-[10px] font-bold text-accent px-2 py-0.5 rounded-md bg-accent/10 shrink-0">
                          {isRtl ? 'إدارة' : 'Manage'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Featured Recommended Pages Sidebar */}
            <div className="ui-card-container space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-main)]">
                <h3 className="text-xs font-extrabold flex items-center gap-1.5 text-[var(--text-primary)]">
                  <UserPlus size={16} className="text-accent" />
                  <span>{isRtl ? 'صفحات موصى بها' : 'Recommended Pages'}</span>
                </h3>
                <button
                  onClick={() => setActiveTab('pages')}
                  className="text-[11px] font-bold text-accent hover:underline"
                >
                  {isRtl ? 'عرض الكل' : 'See All'}
                </button>
              </div>

              {pagesLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(n => (
                    <div key={`bulletin-skel-rec-${n}`} className="h-12 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse"></div>
                  ))}
                </div>
              ) : pagesList.slice(0, 5).length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-2">{isRtl ? 'لا توجد صفحات حالياً' : 'No pages'}</p>
              ) : (
                <div className="space-y-2.5">
                  {pagesList.slice(0, 5).map((page, idx) => (
                    <div
                      key={`rec-page-${page.id}-${idx}`}
                      className="p-2.5 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2 hover:border-accent/40 transition-theme"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <BulletinAvatar
                          src={page.avatar_url}
                          alt={page.name}
                          size="md"
                          isPage={true}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <h4 className="text-xs font-bold truncate">{page.name}</h4>
                            <CheckCircle2 size={13} className="text-blue-500 shrink-0" />
                          </div>
                          <p className="text-[10px] text-gray-400 truncate">{page.city} • {page.followers_count} {isRtl ? 'متابع' : 'followers'}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleOpenPageDetail(page.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-accent hover:bg-accent text-white font-bold text-[10px] shrink-0 transition-theme shadow-sm"
                      >
                        {isRtl ? 'زيارة' : 'Visit'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* MAIN COLUMN: FEED OR FULL PAGE VIEW (8 COLS) */}
          <div 
            className="col-span-12 lg:col-span-8 space-y-6 order-1 lg:order-2 relative max-w-2xl mx-auto w-full overflow-hidden"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setMousePos({
                x: Math.round(e.clientX - rect.left),
                y: Math.round(e.clientY - rect.top),
                isInside: true
              });
            }}
            onMouseEnter={() => setMousePos(prev => ({ ...prev, isInside: true }))}
            onMouseLeave={() => setMousePos(prev => ({ ...prev, isInside: false }))}
            onContextMenu={(e) => {
              e.preventDefault();
              const rect = e.currentTarget.getBoundingClientRect();
              setContextMenu({
                x: Math.max(10, Math.min(e.clientX - rect.left, rect.width - 200)),
                y: Math.max(10, Math.min(e.clientY - rect.top, rect.height - 150)),
                isOpen: true
              });
            }}
            onClick={() => {
              if (contextMenu.isOpen) setContextMenu(prev => ({ ...prev, isOpen: false }));
            }}
            style={{
              transform: pullDistance > 0 ? `translateY(${Math.min(pullDistance * 0.28, 26)}px)` : 'none',
              transition: pullDistance === 0 ? 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)' : 'none'
            }}
          >
            {/* Custom Aesthetic Right-Click Context Menu */}
            <AnimatePresence>
              {contextMenu.isOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -8 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className={`absolute z-50 w-52 rounded-xl shadow-2xl border p-1.5 backdrop-blur-xl select-none ${
                    theme === 'dark' 
                      ? 'bg-[#18181b]/95 border-gray-800 text-gray-200' 
                      : 'bg-white/95 border-gray-200 text-gray-800'
                  }`}
                  style={{
                    left: `${contextMenu.x}px`,
                    top: `${contextMenu.y}px`,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-500/10 mb-1">
                    {isRtl ? 'إجراءات سريعة' : 'Quick Actions'}
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      setContextMenu(prev => ({ ...prev, isOpen: false }));
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium hover:bg-accent/10 hover:text-accent transition-colors text-start"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    {isRtl ? 'نسخ رابط الصفحة' : 'Copy Page Link'}
                  </button>
                  <button
                    onClick={() => {
                      triggerFeedRefresh();
                      setContextMenu(prev => ({ ...prev, isOpen: false }));
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium hover:bg-accent/10 hover:text-accent transition-colors text-start"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {isRtl ? 'تحديث المحتوى' : 'Refresh Feed'}
                  </button>
                  <div className="my-1 border-t border-gray-500/10" />
                  <button
                    onClick={() => {
                      sessionStorage.clear();
                      sessionStorage.removeItem('perplexta_bulletin_scroll_y');
                      secureStorage.remove('perplexta_bulletin_scroll_y');
                      window.location.reload();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-red-500 hover:bg-red-500/10 transition-colors text-start"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    {isRtl ? 'إعادة ضبط الجلسة' : 'Clear Session'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            {/* Subtle Motion-Blurred Pointer Trail Indicator */}
            {mousePos.isInside && !isAnyModalOpen && (
              <div 
                className="absolute pointer-events-none z-30 transition-theme ease-out rounded-[4px] bg-accent/20 blur-[2px]"
                style={{
                  left: `${mousePos.x}px`,
                  top: `${mousePos.y}px`,
                  width: '28px',
                  height: '28px',
                  transform: 'translate(-50%, -50%)',
                  boxShadow: '0 0 16px rgba(156,163,175,0.4)',
                }}
              >
                <div className="absolute inset-1 rounded-[4px] bg-accent/40 animate-ping opacity-75" />
                <div className="absolute inset-2 rounded-[4px] bg-accent shadow-[0_0_8px_#334155]" />
              </div>
            )}

            {/* Pull to Refresh Indicator */}
            <AnimatePresence>
              {(pullDistance > 0 || isRefreshing) && (
                <motion.div
                  initial={{ opacity: 0, y: -25, scale: 0.85 }}
                  animate={{ 
                    opacity: 1, 
                    y: isRefreshing ? 12 : Math.min(pullDistance * 0.55, 42),
                    scale: pullDistance >= 55 || isRefreshing ? 1.05 : 0.95
                  }}
                  exit={{ opacity: 0, y: -20, scale: 0.8 }}
                  transition={{ type: 'spring', damping: 22, stiffness: 350 }}
                  className={`absolute -top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3.5 py-1.5 rounded-[4px] border shadow-xl backdrop-blur-md transition-theme pointer-events-none ${
                    isRefreshing || pullDistance >= 55
                      ? 'bg-accent/10 dark:bg-accent/40 border-accent/40 text-accent shadow-none'
                      : 'bg-white/90 dark:bg-[#1a1a1c]/90 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {isRefreshing ? (
                    <RefreshCw size={15} className="animate-spin text-accent shrink-0" />
                  ) : pullDistance >= 55 ? (
                    <ArrowUp size={15} className="text-accent shrink-0 transition-transform duration-200" />
                  ) : (
                    <ArrowDown 
                      size={15} 
                      className="text-gray-400 shrink-0 transition-transform duration-200" 
                      style={{ transform: `rotate(${Math.min(pullDistance * 3, 180)}deg)` }}
                    />
                  )}
                  <span className="text-[11px] font-extrabold tracking-tight">
                    {isRefreshing 
                      ? (isRtl ? 'جاري تحديث الخلاصة...' : 'Refreshing feed...') 
                      : pullDistance >= 55 
                        ? (isRtl ? 'اترك للتحديث الآن' : 'Release to refresh') 
                        : (isRtl ? 'اسحب لأسفل لتحديث الإعلانات' : 'Pull down to refresh')}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ========================================================== */}
            {/* VIEW A: FULL MERCHANT PAGE VIEW (REPLACES AD BOARD IN PLACE)*/}
            {/* ========================================================== */}
            {selectedPageDetail ? (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl bg-white dark:bg-transparent border border-gray-200/80 dark:border-white/[0.06] overflow-hidden space-y-4"
              >
                {/* Back Button Bar */}
                <div className="p-3 bg-gray-50/50 dark:bg-white/[0.02] border-b border-gray-200/80 dark:border-white/[0.06] flex items-center justify-between">
                  <button
                    onClick={handleBackToBoard}
                    className="px-3 py-1.5 rounded-xl bg-accent text-white font-bold text-xs flex items-center gap-2 hover:bg-accent transition-theme shadow"
                  >
                    {isRtl ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
                    <span>{isRtl ? 'العودة إلى خلاصة فيرال بوك' : 'Back to Viralbook Feed'}</span>
                  </button>

                  <span className="text-xs font-bold text-gray-400">
                    {isRtl ? 'عرض كامل للصفحة التجارية' : 'Merchant Page View'}
                  </span>
                </div>

                {/* Facebook Cover Image */}
                <div className="h-48 sm:h-56 w-full bg-gray-200 dark:bg-white/[0.03] relative">
                  <img
                    src={getMediaUrl(selectedPageDetail.page.cover_url)}
                    alt={selectedPageDetail.page.name}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-3 start-3 px-3 py-1 rounded-[4px] bg-black/60 text-white text-xs font-bold backdrop-blur-md">
                    {selectedPageDetail.page.category}
                  </span>
                </div>

                {/* Page Profile Header */}
                <div className="px-6 -mt-10 pb-4 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <BulletinAvatar
                      src={selectedPageDetail.page.avatar_url}
                      alt={selectedPageDetail.page.name}
                      size="lg"
                      isPage={true}
                    />

                    {/* Action Bar */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleToggleFollowPage(selectedPageDetail.page.id)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-theme flex items-center gap-1.5 shadow ${
                          selectedPageDetail.page.user_is_following
                            ? 'bg-gray-200 dark:bg-white/[0.06] text-gray-700 dark:text-gray-300'
                            : 'bg-accent text-white hover:bg-accent'
                        }`}
                      >
                        {selectedPageDetail.page.user_is_following ? <UserCheck size={16} /> : <UserPlus size={16} />}
                        <span>{selectedPageDetail.page.user_is_following ? (isRtl ? 'تتابعها' : 'Following') : (isRtl ? '+ متابعة الصفحة' : '+ Follow Page')}</span>
                      </button>

                      {(() => {
                        const isPageOwnerOrManager = user && (
                          selectedPageDetail.page.user_id === user.id ||
                          selectedPageDetail.page.owner_id === user.id ||
                          user.role === 'admin' ||
                          (selectedPageDetail.page.managers && (
                            (() => {
                              try {
                                const list = typeof selectedPageDetail.page.managers === 'string'
                                  ? JSON.parse(selectedPageDetail.page.managers)
                                  : selectedPageDetail.page.managers;
                                return Array.isArray(list) && list.some((m: any) => m.userId === user.id || m.email === user.email);
                              } catch (e) {
                                return false;
                              }
                            })()
                          ))
                        );
                        if (!isPageOwnerOrManager) return null;
                        return (
                          <button
                            onClick={() => {
                              setEditingPageData(selectedPageDetail.page);
                              setIsEditPageModalOpen(true);
                            }}
                            className="px-4 py-2 rounded-xl text-xs font-bold transition-theme flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] text-gray-700 dark:text-gray-300 shadow cursor-pointer"
                          >
                            <Settings size={16} />
                            <span>{isRtl ? 'إدارة وتعديل الصفحة' : 'Manage & Edit Page'}</span>
                          </button>
                        );
                      })()}

                      {selectedPageDetail.page.whatsapp_number && (
                        <a
                          href={`https://wa.me/${selectedPageDetail.page.whatsapp_number.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="w-9 h-9 rounded-[var(--radius-xs)] bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 flex items-center justify-center transition-theme shadow-2xs cursor-pointer" style={{ color: SOCIAL_COLORS.whatsapp.base }}
                          title={isRtl ? 'تواصل عبر واتساب' : 'WhatsApp'}
                          aria-label={isRtl ? 'تواصل عبر واتساب' : 'WhatsApp'}
                        >
                          <Phone size={16} />
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl sm:text-2xl font-extrabold">{selectedPageDetail.page.name}</h2>
                      <CheckCircle2 size={20} className="text-blue-500 shrink-0" />
                    </div>

                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed max-w-3xl">
                      {selectedPageDetail.page.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 pt-2 border-t border-gray-100 dark:border-white/[0.04]">
                      <span className="flex items-center gap-1"><MapPin size={14} className="text-accent" /> {selectedPageDetail.page.city}</span>
                      <span>•</span>
                      <span>{selectedPageDetail.page.followers_count} {isRtl ? 'متابع' : 'Followers'}</span>
                      <span>•</span>
                      <span>{selectedPageDetail.ads.length} {isRtl ? 'إعلان منشور' : 'Ads published'}</span>
                    </div>
                  </div>

                  {/* Sub-tabs for Page Detail */}
                  <div className="flex items-center gap-2 border-b border-gray-200/80 dark:border-white/[0.06] pt-3">
                    <button
                      onClick={() => setPageDetailTab('ads')}
                      className={`px-4 py-2 text-xs font-bold border-b-2 transition-theme ${
                        pageDetailTab === 'ads'
                          ? 'border-accent text-accent'
                          : 'border-transparent text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      {isRtl ? 'إعلانات ومنشورات الصفحة' : 'Page Posts & Ads'}
                    </button>
                    <button
                      onClick={() => setPageDetailTab('about')}
                      className={`px-4 py-2 text-xs font-bold border-b-2 transition-theme ${
                        pageDetailTab === 'about'
                          ? 'border-accent text-accent'
                          : 'border-transparent text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      {isRtl ? 'معلومات الشركة والتواصل' : 'About & Contact'}
                    </button>
                    <button
                      onClick={() => setPageDetailTab('media')}
                      className={`px-4 py-2 text-xs font-bold border-b-2 transition-theme ${
                        pageDetailTab === 'media'
                          ? 'border-accent text-accent'
                          : 'border-transparent text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      {isRtl ? 'معرض التصاميم والصور' : 'Media Gallery'}
                    </button>
                  </div>

                  {/* SUB-TAB 1: PAGE ADS FEED */}
                  {pageDetailTab === 'ads' && (
                    <div className="pt-2 space-y-4">
                      {user && myPagesList.some(p => p.id === selectedPageDetail.page.id) && (
                        <div className="p-3.5 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-between">
                          <span className="text-xs font-bold text-accent">
                            {isRtl ? 'أنت مالك هذه الصفحة التجارية! يمكنك إضافة منشور إعلاني جديد باسمها.' : 'You own this page! Add a new ad post.'}
                          </span>
                          <button
                            onClick={() => {
                              setAdFormData(prev => ({ ...prev, page_id: selectedPageDetail.page.id }));
                              setIsAdModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-accent text-white font-bold text-xs"
                          >
                            + {isRtl ? 'نشر إعلان باسم الصفحة' : 'Post as Page'}
                          </button>
                        </div>
                      )}

                      {selectedPageDetail.ads.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 dark:bg-white/[0.02] border border-gray-200/60 dark:border-white/[0.06] rounded-2xl space-y-2">
                          <Megaphone size={32} className="text-gray-300 mx-auto" />
                          <p className="text-xs text-gray-400 italic">
                            {isRtl ? 'لا توجد إعلانات نشطة لهذه الصفحة حالياً' : 'No active ads for this page yet.'}
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-4 max-w-2xl mx-auto w-full">
                          {selectedPageDetail.ads.map((ad, adIdx) => (
                            <div key={`page-ad-${ad.id}-${adIdx}`} className="p-3.5 rounded-2xl bg-gray-50/50 dark:bg-transparent border border-gray-200/80 dark:border-white/[0.06] space-y-2.5">
                              <div className="relative aspect-square rounded-xl overflow-hidden cursor-pointer" onClick={() => handleOpenLightbox(getMediaUrl(ad.image_url), ad.media_gallery, 0, ad.title, ad.author_name, ad)}>
                                <img
                                  src={getMediaUrl(ad.image_url)}
                                  alt={ad.title || 'Ad thumbnail'}
                                  onError={(e) => {
                                    const target = e.currentTarget;
                                    if (!target.dataset.fallback) {
                                      target.dataset.fallback = 'true';
                                      target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1080&q=80';
                                    }
                                  }}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <h4 className="text-xs font-extrabold line-clamp-1">{ad.title}</h4>
                              <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">{ad.description}</p>
                              
                              <div className="flex items-center justify-end pt-1 gap-1.5 ms-auto">
                                <button
                                  onClick={() => handleMessageAdvertiser(ad)}
                                  disabled={messagingAdId === ad.id}
                                  className="w-8 h-8 rounded-[var(--radius-xs)] bg-[var(--surface-card)] hover:bg-[var(--surface-subtle)] text-[var(--text-primary)] border border-[var(--border-main)] hover:border-accent/40 flex items-center justify-center transition-theme shadow-2xs disabled:opacity-50 cursor-pointer"
                                  title={isRtl ? 'مراسلة المعلن في محادثة خاصة' : 'Message Advertiser'}
                                  aria-label={isRtl ? 'مراسلة المعلن في محادثة خاصة' : 'Message Advertiser'}
                                >
                                  {messagingAdId === ad.id ? (
                                    <Loader2 size={14} className="animate-spin text-accent" />
                                  ) : (
                                    <MessageCircle size={14} className="text-accent shrink-0" />
                                  )}
                                </button>

                                {ad.whatsapp_number && (
                                  <button
                                    onClick={(e) => handleWhatsAppClick(ad, e)}
                                    className="w-8 h-8 rounded-[var(--radius-xs)] bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 flex items-center justify-center transition-theme shadow-2xs cursor-pointer" style={{ color: SOCIAL_COLORS.whatsapp.base }}
                                    title={isRtl ? 'مراسلة عبر واتساب' : 'WhatsApp'}
                                    aria-label={isRtl ? 'مراسلة عبر واتساب' : 'WhatsApp'}
                                  >
                                    <Phone size={14} className="shrink-0" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* SUB-TAB 2: ABOUT */}
                  {pageDetailTab === 'about' && (
                    <div className="p-4 rounded-2xl bg-gray-50/50 dark:bg-transparent border border-gray-200/80 dark:border-white/[0.06] space-y-3 text-xs">
                      <h4 className="font-extrabold text-sm border-b border-gray-200/80 dark:border-white/[0.06] pb-2">
                        {isRtl ? 'تفاصيل الصفحة التجارية:' : 'Business Details:'}
                      </h4>
                      <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{selectedPageDetail.page.description}</p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <div className="p-3 rounded-xl bg-white dark:bg-transparent border border-gray-200/80 dark:border-white/[0.06]">
                          <span className="text-gray-400 text-[10px] block">{isRtl ? 'المحافظة / المدينة:' : 'City:'}</span>
                          <strong className="font-bold text-xs">{selectedPageDetail.page.city}</strong>
                        </div>

                        {selectedPageDetail.page.address && (
                          <div className="p-3 rounded-xl bg-white dark:bg-transparent border border-gray-200/80 dark:border-white/[0.06]">
                            <span className="text-gray-400 text-[10px] block">{isRtl ? 'العنوان التفصيلي:' : 'Address:'}</span>
                            <strong className="font-bold text-xs">{selectedPageDetail.page.address}</strong>
                          </div>
                        )}

                        {selectedPageDetail.page.whatsapp_number && (
                          <div className="p-3 rounded-xl bg-white dark:bg-transparent border border-gray-200/80 dark:border-white/[0.06]">
                            <span className="text-gray-400 text-[10px] block">{isRtl ? 'الواتساب الرسمي:' : 'WhatsApp:'}</span>
                            <strong className="font-bold text-xs text-accent">{selectedPageDetail.page.whatsapp_number}</strong>
                          </div>
                        )}

                        {selectedPageDetail.page.website_url && (
                          <div className="p-3 rounded-xl bg-white dark:bg-transparent border border-gray-200/80 dark:border-white/[0.06]">
                            <span className="text-gray-400 text-[10px] block">{isRtl ? 'الموقع الإلكتروني:' : 'Website:'}</span>
                            <a href={selectedPageDetail.page.website_url} target="_blank" rel="noreferrer" className="font-bold text-xs text-blue-500 hover:underline">
                              {selectedPageDetail.page.website_url}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* SUB-TAB 3: MEDIA GALLERY */}
                  {pageDetailTab === 'media' && (
                    <div className="pt-2">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {selectedPageDetail.ads.map((ad, gIdx) => (
                          <div
                            key={`page-gallery-ad-${ad.id}-${gIdx}`}
                            onClick={() => handleOpenLightbox(getMediaUrl(ad.image_url), ad.media_gallery, 0, ad.title, ad.author_name, ad)}
                            className="aspect-square rounded-2xl overflow-hidden cursor-pointer relative group bg-gray-100 dark:bg-gray-900"
                          >
                            <img
                              src={getMediaUrl(ad.image_url)}
                              alt={ad.title || 'Ad gallery image'}
                              onError={(e) => {
                                const target = e.currentTarget;
                                if (!target.dataset.fallback) {
                                  target.dataset.fallback = 'true';
                                  target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1080&q=80';
                                }
                              }}
                              className="w-full h-full object-cover transition-theme"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-theme flex items-end p-2 text-white text-[10px] font-bold">
                              {ad.title}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              </motion.div>
            ) : (
              <>
                {/* ========================================================== */}
                {/* TAB 1: SOCIAL AD FEED & FACEBOOK POST CREATOR TRIGGER      */}
                {/* ========================================================== */}
                {activeTab === 'board' && (
                  <BoardFeed
                    isRtl={isRtl}
                    selectedCity={selectedCity}
                    selectedRadius={selectedRadius}
                    setIsLocationFlyoutOpen={setIsLocationFlyoutOpen}
                    handleDetectGpsLocation={handleDetectGpsLocation}
                    isDetectingGps={isDetectingGps}
                    triggerFeedRefresh={triggerFeedRefresh}
                    isRefreshing={isRefreshing}
                    storiesProps={{
                      isRtl,
                      activeTab,
                      setActiveTab,
                      token,
                      user,
                      setIsStoryModalOpen,
                      representativeStories,
                      orderedStories,
                      previewingVideoStoryId,
                      setPreviewingVideoStoryId,
                      setSelectedStoryIndex,
                      setIsStoryViewerOpen,
                      storyPressTimerRef,
                      getMediaUrl,
                    }}
                    composerProps={{
                      user,
                      token,
                      isRtl,
                      setIsAdModalOpen,
                      setIsStreamSetupOpen,
                      openPostUploadModal,
                      openReelUploadModal,
                    }}
                    ads={ads}
                    loading={loading}
                    hasMoreAds={hasMoreAds}
                    loadingMoreAds={loadingMoreAds}
                    handleLoadMoreAds={handleLoadMoreAds}
                    setActiveReelModalId={setActiveReelModalId}
                    setActiveTab={setActiveTab}
                    searchQuery={searchQuery}
                    token={token}
                    user={user}
                    handleReportAd={handleReportAd}
                    handleToggleLike={handleToggleLike}
                    toggleComments={toggleComments}
                    handleToggleCommentLike={handleToggleCommentLike}
                    expandedAdId={expandedAdId}
                    commentsMap={commentsMap}
                    loadingCommentsAdId={loadingCommentsAdId}
                    newCommentText={newCommentText}
                    setNewCommentText={setNewCommentText}
                    handleAddComment={handleAddComment}
                    replyToCommentId={replyToCommentId}
                    setReplyToCommentId={setReplyToCommentId}
                    handleMessageAdvertiser={handleMessageAdvertiser}
                    messagingAdId={messagingAdId}
                    setInquireAd={setInquireAd}
                    handleWhatsAppClick={handleWhatsAppClick}
                    handleShareAd={handleShareAd}
                    handleOpenPageDetail={handleOpenPageDetail}
                    handleOpenLightbox={handleOpenLightbox}
                    openPostUploadModal={openPostUploadModal}
                    handleOpenBoostModal={handleOpenBoostModal}
                    handleEditAd={handleEditAd}
                    handleDeleteAd={handleDeleteAd}
                    handleToggleSave={handleToggleSave}
                    setAds={setAds}
                    setSavedAds={setSavedAds}
                  />
                )}



                {/* ========================================================== */}
                {/* TAB: SAVED POSTS                                          */}
                {/* ========================================================== */}
                {activeTab === 'saved' && (
                  <SavedPostsTab
                    savedAds={savedAds}
                    loadingSaved={loadingSaved}
                    isRtl={isRtl}
                    token={token}
                    user={user}
                    setActiveTab={setActiveTab}
                    handleReportAd={handleReportAd}
                    handleToggleLike={handleToggleLike}
                    toggleComments={toggleComments}
                    handleToggleCommentLike={handleToggleCommentLike}
                    expandedAdId={expandedAdId}
                    commentsMap={commentsMap}
                    loadingCommentsAdId={loadingCommentsAdId}
                    newCommentText={newCommentText}
                    setNewCommentText={setNewCommentText}
                    handleAddComment={handleAddComment}
                    replyToCommentId={replyToCommentId}
                    setReplyToCommentId={setReplyToCommentId}
                    handleMessageAdvertiser={handleMessageAdvertiser}
                    messagingAdId={messagingAdId}
                    setInquireAd={setInquireAd}
                    handleWhatsAppClick={handleWhatsAppClick}
                    handleShareAd={handleShareAd}
                    handleOpenPageDetail={handleOpenPageDetail}
                    handleOpenLightbox={handleOpenLightbox}
                    openPostUploadModal={openPostUploadModal}
                    handleOpenBoostModal={handleOpenBoostModal}
                    handleEditAd={handleEditAd}
                    handleDeleteAd={handleDeleteAd}
                    handleToggleSave={handleToggleSave}
                    setAds={setAds}
                    setSavedAds={setSavedAds}
                  />
                )}

                {/* ========================================================== */}
                {/* TAB 3: CUSTOMER INQUIRIES & DIRECT MESSAGES INBOX           */}
                {/* ========================================================== */}
                {activeTab === 'inquiries' && (
                  <InquiriesTab
                    isRtl={isRtl}
                    setActiveTab={setActiveTab}
                    selectedInboxAd={selectedInboxAd}
                    setSelectedInboxAd={setSelectedInboxAd}
                    inquiriesSearchTerm={inquiriesSearchTerm}
                    setInquiriesSearchTerm={setInquiriesSearchTerm}
                    inquiriesLoading={inquiriesLoading}
                    inquiriesList={inquiriesList}
                    filteredInquiriesList={filteredInquiriesList}
                    fetchInquiries={fetchInquiries}
                  />
                )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================== */}
      {/* LIVE STREAM MODAL                                          */}
      {/* ========================================================== */}
      <LiveStreamModal
        isOpen={isLiveStreamOpen}
        onClose={() => {
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }
          setIsLiveStreamOpen(false);
        }}
        isRtl={isRtl}
        user={user}
        walletBalance={walletBalance}
        streamTitleInput={streamTitleInput}
        streamFeed={streamFeed}
        currentFeedIndex={currentFeedIndex}
        setCurrentFeedIndex={setCurrentFeedIndex}
        streamRef={streamRef}
        videoRef={videoRef}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
        liveViewers={liveViewers}
        liveLikes={liveLikes}
        handleLiveLike={handleLiveLike}
        showLikeAnimation={showLikeAnimation}
        liveComments={liveComments}
        newLiveComment={newLiveComment}
        setNewLiveComment={setNewLiveComment}
        handleSendLiveComment={handleSendLiveComment}
        isGiftModalOpen={isGiftModalOpen}
        setIsGiftModalOpen={setIsGiftModalOpen}
        giftsCatalog={giftsCatalog}
        handleSendGift={handleSendGift}
      />

      {/* ========================================================== */}
      {/* MODAL 1: CREATE NEW CAMPAIGN AD (META-STYLE POSTING)       */}
      {/* ========================================================== */}
      <AnimatePresence>
        {isAdModalOpen && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-1.5 sm:p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-xl rounded-[var(--radius-lg)] bg-[var(--surface-card)] border border-[var(--border-main)] shadow-2xl overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[90vh] my-1 sm:my-8 text-[var(--text-primary)]"
            >
              {/* Header (Facebook Standard Centered Title & Status) */}
              <div className="relative flex items-center justify-center p-2.5 sm:p-4 border-b border-gray-100 dark:border-zinc-800">
                {/* Ready/Upload Status Pill (Facebook style 100% ⬆) */}
                {(adFormData.image_url || adFormData.video_url || videoMetadataInfo.localVideoUrl) && (
                  <div className="absolute start-2.5 sm:start-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[var(--fg-success)] text-white text-[10px] sm:text-[11px] font-bold shadow-xs">
                    <span>100%</span>
                    <ArrowUp size={11} className="stroke-[3]" />
                  </div>
                )}

                <h3 className="text-xs sm:text-base font-extrabold text-gray-900 dark:text-gray-100 text-center">
                  {composerView === 'feelings' ? (isRtl ? 'كيف تشعر؟' : 'How are you feeling?') :
                   composerView === 'location' ? (isRtl ? 'أين أنت؟' : 'Where are you?') :
                   composerView === 'tagging' ? (isRtl ? 'إشارة إلى أشخاص' : 'Tag people') :
                   composerView === 'emojis' ? (isRtl ? 'اختر رمزاً تعبيرياً' : 'Choose Emoji') :
                   isEditMode ? (isRtl ? 'تعديل المنشور' : 'Edit Post') :
                   (isRtl ? 'إنشاء منشور' : 'Create Post')}
                </h3>

                <button 
                  type="button"
                  onClick={() => {
                    if (composerView === 'main') setIsAdModalOpen(false);
                    else setComposerView('main');
                  }}
                  className="absolute end-2.5 sm:end-3.5 top-1/2 -translate-y-1/2 w-7 h-7 sm:w-9 sm:h-9 rounded-[4px] bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 flex items-center justify-center text-gray-500 dark:text-gray-300 transition-colors shadow-xs"
                >
                  {composerView === 'main' ? <X size={16} className="sm:size-[18px]" /> : <ArrowLeft size={16} className={`sm:size-[18px] ${isRtl ? 'rotate-180' : ''}`} />}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-2.5 sm:p-5 scrollbar-thin">
                {composerView === 'main' && (
                  <form onSubmit={handleCreateCampaign} className="space-y-2.5 sm:space-y-4">
                    {/* User Info & Audience Controls (Facebook Standard) */}
                    <div className="flex items-center gap-2 sm:gap-3">
                      <BulletinAvatar
                        src={adFormData.page_id ? myPagesList.find(p => p.id === Number(adFormData.page_id))?.avatar_url : user?.avatar}
                        alt={adFormData.page_id ? myPagesList.find(p => p.id === Number(adFormData.page_id))?.name : user?.name}
                        size="sm"
                        isPage={Boolean(adFormData.page_id)}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                          <span className="text-xs sm:text-base font-bold text-gray-900 dark:text-gray-100 truncate">
                            {adFormData.page_id ? myPagesList.find(p => p.id === Number(adFormData.page_id))?.name : user?.name}
                          </span>
                          {adFormData.feeling && (
                            <span className="text-[11px] sm:text-xs text-gray-500 font-medium truncate">
                              — {isRtl ? 'يشعر بـ' : 'is feeling'} {FEELINGS.find(f => f.id === adFormData.feeling)?.icon} {isRtl ? FEELINGS.find(f => f.id === adFormData.feeling)?.labelAr : FEELINGS.find(f => f.id === adFormData.feeling)?.labelEn}
                            </span>
                          )}
                          {adFormData.location_city && (
                            <span className="text-[11px] sm:text-xs text-gray-500 font-medium truncate">
                              — {isRtl ? 'في' : 'in'} <span className="text-accent font-bold">{adFormData.location_city}</span>
                            </span>
                          )}
                        </div>

                        {/* Facebook-Style Option Pills */}
                        <div className="flex items-center gap-1 sm:gap-1.5 mt-1 sm:mt-1.5 flex-wrap">
                          {/* Page / Profile Selector */}
                          {myPagesList.length > 0 && (
                            <select 
                              value={adFormData.page_id}
                              onChange={(e) => setAdFormData({...adFormData, page_id: e.target.value})}
                              className="text-[10px] sm:text-[11px] bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 sm:px-2 rounded-md border-none focus:ring-0 font-bold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                            >
                              <option value="">{isRtl ? 'حسابي الشخصي' : 'Personal Profile'}</option>
                              {myPagesList.map((p, pIdx) => <option key={`bulletin-opt-mypage-${p.id}-${pIdx}`} value={p.id}>{p.name}</option>)}
                            </select>
                          )}

                          {/* Audience Selector Pill */}
                          <button
                            type="button"
                            onClick={() => setIsAudienceModalOpen(true)}
                            className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-1.5 py-0.5 sm:px-2 rounded-md bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                            title={isRtl ? 'تحديد جمهور المنشور' : 'Select audience'}
                          >
                            {adFormData.audience === 'friends' ? (
                              <>
                                <Users size={10} className="text-blue-500 shrink-0" />
                                <span>{isRtl ? 'الأصدقاء' : 'Friends'}</span>
                              </>
                            ) : adFormData.audience === 'only_me' ? (
                              <>
                                <Lock size={10} className="text-amber-500 shrink-0" />
                                <span>{isRtl ? 'أنا فقط' : 'Only Me'}</span>
                              </>
                            ) : (
                              <>
                                <Globe size={10} className="text-gray-500 dark:text-gray-400 shrink-0" />
                                <span>{isRtl ? 'العامة' : 'Public'}</span>
                              </>
                            )}
                            <ChevronDown size={10} className="text-gray-400" />
                          </button>

                          {/* AI Content Label Pill (Facebook Standard) */}
                          <button
                            type="button"
                            onClick={() => setAdFormData(prev => ({ ...prev, is_ai_generated: !prev.is_ai_generated }))}
                            className={`flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-1.5 py-0.5 sm:px-2 rounded-md transition-colors cursor-pointer ${
                              adFormData.is_ai_generated
                                ? 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300'
                                : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-700'
                            }`}
                            title={isRtl ? 'تسمية المحتوى الذي تم إنشاؤه بالذكاء الاصطناعي' : 'Label AI-generated content'}
                          >
                            {adFormData.is_ai_generated ? (
                              <>
                                <Sparkles size={10} className="text-purple-500 shrink-0" />
                                <span>{isRtl ? 'ذكاء اصطناعي: مفعّل' : 'AI label: On'}</span>
                              </>
                            ) : (
                              <>
                                <span>{isRtl ? 'تسمية الذكاء الاصطناعي ➕' : 'AI label off ➕'}</span>
                              </>
                            )}
                            <ChevronDown size={10} className="text-gray-400" />
                          </button>

                          {/* Format Selector Pill (Standard Post / Reels / Story) */}
                          <button
                            type="button"
                            onClick={() => {
                              setAdFormData(prev => ({
                                ...prev,
                                ad_format: prev.ad_format === 'post' ? 'reel' : prev.ad_format === 'reel' ? 'story' : 'post'
                              }));
                            }}
                            className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-1.5 py-0.5 sm:px-2 rounded-md bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer"
                            title={isRtl ? 'تغيير شكل وتنسيق المنشور' : 'Change post format'}
                          >
                            <Clapperboard size={10} className="shrink-0 text-indigo-500" />
                            <span>
                              {adFormData.ad_format === 'reel' ? (isRtl ? 'ريلز (9:16)' : 'Reel (9:16)') :
                               adFormData.ad_format === 'story' ? (isRtl ? 'قصة (9:16)' : 'Story (9:16)') :
                               (isRtl ? 'منشور عادي' : 'Standard Post')}
                            </span>
                            <ChevronDown size={10} className="text-gray-400" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Natural, Free & Unrestricted Composer Body */}
                    <div className="py-1 sm:py-2">
                      <textarea
                        value={adFormData.description}
                        onChange={(e) => handleComposerTextChange(e.target.value)}
                        placeholder={
                          isRtl
                            ? `بمَ تفكر اليوم، ${user?.name ? user.name.split(' ')[0] : ''}؟`
                            : `What's on your mind, ${user?.name ? user.name.split(' ')[0] : ''}?`
                        }
                        className="w-full text-sm sm:text-lg bg-transparent border-0 outline-none focus:outline-none focus:ring-0 resize-none min-h-[80px] sm:min-h-[140px] text-gray-900 dark:text-gray-100 p-1 placeholder-gray-400 dark:placeholder-zinc-500 font-normal leading-relaxed mb-1"
                        rows={3}
                        autoFocus
                      />
                      
                      {/* Character Counter */}
                      <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-zinc-500 font-mono px-1 pb-1">
                        <span>
                          {isRtl ? 'الحد الأقصى 1000 حرف' : 'Max 1000 chars'}
                        </span>
                        <span className={adFormData.description.length >= 900 ? 'text-red-500 font-bold' : ''}>
                          {adFormData.description.length} / 1000
                        </span>
                      </div>

                      {/* Suggestions Overlay */}
                      {suggestionType !== 'none' && (
                        <div className="my-2 p-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-lg max-h-[160px] overflow-y-auto z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                          <div className="flex items-center justify-between px-2 pb-1.5 border-b border-gray-100 dark:border-zinc-800 text-[10px] text-gray-400 dark:text-zinc-500 font-extrabold">
                            <span>
                              {suggestionType === 'hashtag'
                                ? (isRtl ? 'اقتراحات وسوم شائعة (#)' : 'Trending Hashtags (#)')
                                : (isRtl ? 'خيارات المنشن والإشارة (@)' : 'Mentions & Sharing Precision (@)')}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setSuggestionType('none');
                                setSuggestionQuery('');
                              }}
                              className="hover:text-red-500 font-black text-xs"
                            >
                              ×
                            </button>
                          </div>
                          <div className="divide-y divide-gray-50 dark:divide-zinc-800/50 mt-1">
                            {suggestionType === 'hashtag' && (
                              trendingHashtags
                                .filter(tag => !suggestionQuery || tag.toLowerCase().includes(suggestionQuery.toLowerCase()))
                                .map((tag, idx) => (
                                  <button
                                    key={`has-${idx}`}
                                    type="button"
                                    onClick={() => handleSelectSuggestion(tag)}
                                    className="w-full text-right sm:text-left rtl:text-right ltr:text-left px-2 py-1.5 text-xs hover:bg-blue-500/5 hover:text-blue-600 dark:hover:bg-blue-500/10 dark:hover:text-blue-400 transition-colors font-semibold text-gray-700 dark:text-zinc-300 flex items-center gap-2"
                                  >
                                    <span className="text-blue-500 dark:text-blue-400 font-bold">#</span>
                                    <span>{tag}</span>
                                  </button>
                                ))
                            )}

                            {suggestionType === 'mention' && (
                              mentionSuggestions
                                .filter(item => {
                                  const q = suggestionQuery.toLowerCase();
                                  return !suggestionQuery || item.name.toLowerCase().includes(q) || item.username.toLowerCase().includes(q);
                                })
                                .map((item, idx) => {
                                  const isBroadcast = item.type === 'broadcast';
                                  return (
                                    <button
                                      key={`men-${idx}`}
                                      type="button"
                                      onClick={() => handleSelectSuggestion(item.username)}
                                      className="w-full text-right sm:text-left rtl:text-right ltr:text-left px-2 py-1.5 text-xs hover:bg-blue-500/5 hover:text-blue-600 dark:hover:bg-blue-500/10 dark:hover:text-blue-400 transition-colors font-semibold text-gray-700 dark:text-zinc-300 flex items-center justify-between"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className={isBroadcast ? 'text-purple-500' : 'text-blue-500'}>
                                          {isBroadcast ? '📢' : '@'}
                                        </span>
                                        <span>{isRtl && item.labelAr ? item.labelAr : item.name}</span>
                                      </div>
                                      {!isBroadcast && (
                                        <span className="text-[9px] text-gray-400 dark:text-zinc-500 font-mono">
                                          @{item.username}
                                        </span>
                                      )}
                                    </button>
                                  );
                                })
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* If no media is selected yet, show a beautiful, high-fidelity drag-and-drop media upload card */}
                    {!(
                      (adFormData.media_gallery && adFormData.media_gallery.length > 0) ||
                      adFormData.image_url ||
                      adFormData.video_url ||
                      videoMetadataInfo.localVideoUrl
                    ) && (
                      <div className="border border-dashed border-gray-300 dark:border-zinc-700 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-2xl p-6 flex flex-col items-center justify-center bg-gray-50/50 dark:bg-zinc-800/10 hover:bg-indigo-500/5 dark:hover:bg-indigo-400/5 transition-all group relative cursor-pointer min-h-[120px]">
                        <input
                          type="file"
                          multiple
                          accept="image/*,video/*"
                          className="absolute inset-0 opacity-0 cursor-pointer z-10"
                          onChange={handleMixedMediaUpload}
                        />
                        <div className="w-10 h-10 rounded-[4px] bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Upload size={20} />
                        </div>
                        <p className="mt-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 text-center">
                          {isRtl ? 'انقر أو اسحب ميديا (صور أو فيديوهات) هنا للرفع' : 'Click or drag media (photos or videos) here to upload'}
                        </p>
                        <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500 text-center">
                          {isRtl ? 'يدعم رفع عشوائي لعدة صور وفيديوهات معاً (حتى 20 وسيطة)' : 'Supports mixed photos & videos with captions (up to 20 items)'}
                        </p>
                      </div>
                    )}

                    {/* Media Attachments Preview Grid (Facebook Collage with 'Edit All' Button) */}
                    {(
                      (adFormData.media_gallery && adFormData.media_gallery.length > 0) ||
                      adFormData.image_url ||
                      adFormData.video_url ||
                      videoMetadataInfo.localVideoUrl
                    ) && (
                      <div className="mb-2 sm:mb-3">
                        <ComposerMediaPreview
                          mediaItems={
                            adFormData.media_gallery && adFormData.media_gallery.length > 0
                              ? adFormData.media_gallery
                              : [
                                  ...(adFormData.image_url
                                    ? adFormData.image_url.split(',').map((u, i) => ({
                                        id: `img-${i}`,
                                        url: u.trim(),
                                        type: 'image' as const,
                                        caption: ''
                                      }))
                                    : []),
                                  ...(adFormData.video_url
                                    ? [
                                        {
                                          id: 'vid-0',
                                          url: adFormData.video_url,
                                          type: 'video' as const,
                                          caption: ''
                                        }
                                      ]
                                    : [])
                                ]
                          }
                          onOpenMediaManager={() => setIsMediaManagerOpen(true)}
                          onClearAll={() => {
                            setAdFormData(prev => ({
                              ...prev,
                              image_url: '',
                              video_url: '',
                              media_gallery: []
                            }));
                            setVideoMetadataInfo({ processingStage: 'done' });
                          }}
                          onAddMoreClick={() => {
                            const input = document.getElementById('composer-mixed-media-input') as HTMLInputElement;
                            if (input) input.click();
                          }}
                          isRtl={isRtl}
                        />

                        {/* Hidden input for adding more media to the gallery */}
                        <input
                          id="composer-mixed-media-input"
                          type="file"
                          multiple
                          accept="image/*,video/*"
                          className="hidden"
                          onChange={handleMixedMediaUpload}
                        />

                        {/* Attached Action Banner (Facebook WhatsApp CTA Card Preview) */}
                        {adFormData.has_whatsapp_button && (
                          <div className="mt-2 p-2 sm:p-3 bg-gray-50 dark:bg-zinc-800/90 rounded-xl border border-gray-200/80 dark:border-zinc-700/80 flex items-center justify-between gap-2 sm:gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-[4px] bg-[#25D366]/10 flex items-center justify-center text-[#25D366] shrink-0">
                                <MessageCircle size={16} className="text-[#25D366] sm:size-5" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-[11px] sm:text-sm font-extrabold text-gray-900 dark:text-gray-100 truncate">
                                  {adFormData.page_id ? myPagesList.find(p => p.id === Number(adFormData.page_id))?.name : (user?.name || 'Afaq Academy')}
                                </h4>
                                <p className="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 font-medium truncate">
                                  {isRtl ? 'انقر لبدء المحادثة المباشرة عبر واتساب' : 'Click to start direct chat on WhatsApp'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                              <div className="px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-[#25D366] text-white text-[10px] sm:text-xs font-bold flex items-center gap-1 shadow-xs">
                                <MessageCircle size={12} className="fill-white/20 sm:size-[14px]" />
                                <span>{isRtl ? 'واتساب' : 'WhatsApp'}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setAdFormData(prev => ({ ...prev, has_whatsapp_button: false }))}
                                className="w-6 h-6 sm:w-7 sm:h-7 rounded-[4px] bg-gray-200 dark:bg-zinc-700 hover:bg-red-500 hover:text-white flex items-center justify-center text-gray-500 dark:text-gray-300 transition-colors cursor-pointer"
                                title={isRtl ? 'إزالة زر الواتساب' : 'Remove WhatsApp CTA'}
                              >
                                <X size={11} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Video Cover Frame & Thumbnail Extractor / Scrubber */}
                    {(adFormData.video_url || videoMetadataInfo.localVideoUrl) && (
                      <div className="mb-2 sm:mb-3">
                        <VideoFrameCapture
                          videoUrl={adFormData.video_url || videoMetadataInfo.localVideoUrl || ''}
                          currentCoverUrl={adFormData.image_url}
                          onSelectCover={(coverUrl) => {
                            setAdFormData(prev => ({ ...prev, image_url: coverUrl }));
                          }}
                          onRemoveCover={() => {
                            setAdFormData(prev => ({ ...prev, image_url: '' }));
                          }}
                          isRtl={isRtl}
                        />
                      </div>
                    )}

                    {/* WhatsApp Number Configuration (Inline when button active) */}
                    {adFormData.has_whatsapp_button && (
                      <div className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-[var(--status-success-subtle)] border border-[var(--fg-success)]/30 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1">
                          <Phone size={13} className="text-[#25D366] shrink-0" />
                          <input
                            type="text"
                            value={adFormData.whatsapp_number}
                            onChange={(e) => setAdFormData({ ...adFormData, whatsapp_number: e.target.value })}
                            placeholder={isRtl ? 'رقم الواتساب (مثال: 970599000000+)' : 'WhatsApp Number (e.g., +970599000000)'}
                            className="w-full text-xs bg-transparent border-0 outline-none focus:outline-none focus:ring-0 p-0 text-gray-800 dark:text-gray-200 font-bold"
                          />
                        </div>
                      </div>
                    )}

                    {/* Facebook-Standard "Add to Your Post" Toolbar */}
                    <div className="p-2 sm:p-3 rounded-xl border border-gray-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-800/40 flex items-center justify-between shadow-xs">
                      <span className="text-[11px] sm:text-sm font-bold text-gray-800 dark:text-gray-200 shrink-0">
                        {isRtl ? 'إضافة إلى منشورك' : 'Add to your post'}
                      </span>
                      <div className="flex items-center gap-0.5 sm:gap-1">
                        {/* 1. Photo / Video */}
                        <label className="p-1.5 sm:p-2 rounded-[4px] hover:bg-[var(--status-success-subtle)] text-[var(--fg-success)] cursor-pointer transition-colors" title={isRtl ? 'صور / فيديو' : 'Photos / Video'}>
                          <ImageIcon size={17} className="sm:size-[22px]" />
                          <input 
                            type="file" 
                            multiple
                            accept="image/*,video/*" 
                            className="hidden" 
                            onChange={handleMixedMediaUpload} 
                          />
                        </label>

                        {/* 2. Tag People (Blue) */}
                        <button 
                          type="button" 
                          onClick={() => setComposerView('tagging')} 
                          className="p-1.5 sm:p-2 rounded-[4px] hover:bg-blue-50 dark:hover:bg-blue-950/30 text-blue-500 transition-colors" 
                          title={isRtl ? 'إشارة إلى أشخاص' : 'Tag people'}
                        >
                          <Users size={17} className="sm:size-[22px]" />
                        </button>

                        {/* 3. WhatsApp Action Toggle (Vibrant Green) */}
                        <button 
                          type="button" 
                          onClick={() => {
                            setAdFormData(prev => ({ 
                              ...prev, 
                              has_whatsapp_button: !prev.has_whatsapp_button,
                              whatsapp_number: prev.whatsapp_number || (user as any)?.phone || ''
                            }));
                            if (!adFormData.has_whatsapp_button) {
                              toast.success(isRtl ? 'تم إرفاق زر المراسلة عبر واتساب' : 'WhatsApp CTA button attached');
                            }
                          }} 
                          className={`p-1.5 sm:p-2 rounded-[4px] transition-colors ${adFormData.has_whatsapp_button ? 'bg-[#25D366]/15 text-[#25D366]' : 'hover:bg-[#25D366]/10 text-[#25D366]'}`}
                          title={isRtl ? 'زر مراسلة واتساب' : 'WhatsApp Button'}
                        >
                          <MessageCircle size={17} className="sm:size-[22px]" />
                        </button>

                        {/* 4. Location / Check-in (Rose) */}
                        <button 
                          type="button" 
                          onClick={() => setComposerView('location')} 
                          className={`p-1.5 sm:p-2 rounded-[8px] transition-colors ${adFormData.location_city ? 'bg-rose-500/15 text-rose-500' : 'hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500'}`}
                          title={isRtl ? 'الموقع' : 'Location'}
                        >
                          <MapPin size={17} className="sm:size-[22px]" />
                        </button>

                        {/* 5. Feeling / Activity (Amber) */}
                        <button 
                          type="button" 
                          onClick={() => setComposerView('feelings')} 
                          className={`p-1.5 sm:p-2 rounded-[8px] transition-colors ${adFormData.feeling ? 'bg-amber-500/15 text-amber-500' : 'hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-500'}`}
                          title={isRtl ? 'الشعور / النشاط' : 'Feeling / Activity'}
                        >
                          <Smile size={17} className="sm:size-[22px]" />
                        </button>

                        {/* 6. More Options (...) */}
                        <button 
                          type="button" 
                          onClick={() => setIsAddToPostModalOpen(true)} 
                          className="p-1.5 sm:p-2 rounded-[8px] hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-400 transition-colors" 
                          title={isRtl ? 'المزيد' : 'More'}
                        >
                          <SlidersHorizontal size={16} className="sm:size-[20px]" />
                        </button>
                      </div>
                    </div>

                    {/* Copyright & Verification Status (Facebook standard) */}
                    <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 px-1">
                      <CheckCircle2 size={12} className="text-[var(--fg-success)] shrink-0 sm:size-[13px]" />
                      <span>{isRtl ? '© جارٍ التحقق من وجود محتوى محمي بحقوق النشر' : '© Checking for copyrighted content'}</span>
                    </div>

                    {/* Full-width High-Contrast Post / Next Button */}
                    <button
                      type="submit"
                      disabled={isSubmittingAd || (!adFormData.description && !adFormData.image_url && !adFormData.video_url)}
                      className="w-full py-2 sm:py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 dark:disabled:bg-zinc-800 disabled:text-gray-400 dark:disabled:text-zinc-600 text-white font-extrabold text-xs sm:text-base shadow-sm transition-all active:scale-[0.99] cursor-pointer disabled:cursor-not-allowed"
                    >
                      {isSubmittingAd ? (isRtl ? 'جاري النشر...' : 'Publishing...') : (isEditMode ? (isRtl ? 'حفظ التعديلات' : 'Save Changes') : (isRtl ? 'نشر' : 'Post'))}
                    </button>
                  </form>
                )}

                {composerView === 'feelings' && (
                  <div className="grid grid-cols-2 gap-2">
                    {FEELINGS.map((f, fIdx) => (
                      <button
                        key={`bulletin-feel-${f.id}-${fIdx}`}
                        onClick={() => {
                          setAdFormData({...adFormData, feeling: f.id});
                          setComposerView('main');
                        }}
                        className={`p-3 rounded-xl border flex items-center gap-3 transition-theme ${adFormData.feeling === f.id ? 'border-accent bg-accent/5 text-accent' : 'border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-600 dark:text-gray-400'}`}
                      >
                        <span className="text-xl">{f.icon}</span>
                        <span className="text-xs font-bold">{isRtl ? f.labelAr : f.labelEn}</span>
                      </button>
                    ))}
                    <button 
                      onClick={() => { setAdFormData({...adFormData, feeling: ''}); setComposerView('main'); }}
                      className="col-span-2 p-2 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-theme"
                    >
                      {isRtl ? 'إزالة الشعور' : 'Remove Feeling'}
                    </button>
                  </div>
                )}

                {composerView === 'location' && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="p-4 rounded-2xl bg-white dark:bg-[#18181b] border border-gray-200/90 dark:border-gray-800 shadow-xl space-y-4 text-start"
                  >
                    {/* Instant Flyout Header */}
                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800/80 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-accent/10 text-accent flex items-center justify-center border border-accent/20 shrink-0">
                          <MapPin size={16} className="animate-bounce" />
                        </div>
                        <div>
                          <h3 className="text-xs sm:text-sm font-black text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                            <span>{isRtl ? 'قائمة تحديد موقع المنشور والتغطية' : 'Post Location & Radius Flyout'}</span>
                            <span className="text-[9px] bg-accent/15 text-accent dark:text-accent px-1.5 py-0.5 rounded-[8px] font-bold">
                              {isRtl ? 'مباشر' : 'Live'}
                            </span>
                          </h3>
                          <p className="text-[10px] text-gray-400">
                            {isRtl ? 'حدد نطاق وصول منشورك الجغرافي بالوقت الفعلي' : 'Set your post visibility & reach radius in real time'}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setComposerView('main')}
                        className="w-8 h-8 rounded-[8px] bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 flex items-center justify-center text-gray-500 transition-theme hover:rotate-90"
                        title={isRtl ? 'إغلاق' : 'Close'}
                      >
                        <X size={15} />
                      </button>
                    </div>

                    {/* Active Location Selection Preview Banner */}
                    <div className="p-3 rounded-xl bg-gradient-to-r from-gray-500/10 via-gray-500/10 to-gray-500/5 border border-accent/25 flex items-center justify-between shadow-2xs">
                      <div className="flex items-center gap-2">
                        <Navigation size={14} className="text-accent shrink-0" />
                        <div>
                          <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
                            {isRtl ? 'الموقع ونطاق الرؤية المحدد:' : 'Targeted Location & Coverage:'}
                          </p>
                          <p className="text-xs font-black text-accent dark:text-accent truncate max-w-[220px] sm:max-w-[320px]">
                            {adFormData.location_city 
                              ? `📍 ${adFormData.location_city} (${adFormData.location_radius === 'all' ? (isRtl ? 'بلا حدود' : 'Unlimited') : `+${adFormData.location_radius || '10'} ${isRtl ? 'كم' : 'km'}`})`
                              : (isRtl ? '🌐 غير محدد (تغطية عامة)' : '🌐 Not set (Global Feed)')}
                          </p>
                        </div>
                      </div>

                      {adFormData.location_city && (
                        <button
                          type="button"
                          onClick={() => setAdFormData(prev => ({ ...prev, location_city: '' }))}
                          className="text-[11px] font-extrabold text-red-500 hover:text-red-600 dark:hover:text-red-400 px-2 py-1 bg-red-500/10 rounded-lg transition-colors shrink-0"
                        >
                          {isRtl ? 'إلغاء التحديد' : 'Clear'}
                        </button>
                      )}
                    </div>

                    {/* 1. REAL-TIME AUTOCOMPLETE SEARCH */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-extrabold text-gray-700 dark:text-gray-300 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Search size={12} className="text-accent" />
                          <span>{isRtl ? 'البحث عن مدينة أو معالم بالوقت الفعلي:' : 'Real-Time Location Autocomplete:'}</span>
                        </span>
                        {isSearchingLocation && (
                          <span className="text-[10px] text-accent font-bold animate-pulse flex items-center gap-1">
                            <Loader2 size={11} className="animate-spin" />
                            <span>{isRtl ? 'جاري البحث...' : 'Searching...'}</span>
                          </span>
                        )}
                      </label>

                      <div className="relative">
                        <input 
                          type="text" 
                          value={customLocationSearch}
                          onChange={(e) => setCustomLocationSearch(e.target.value)}
                          placeholder={isRtl ? 'اكتب اسم المدينة، الحي، الدولة أو المعلم...' : 'Type city, landmark, or country...'}
                          className="w-full ps-8 pe-8 py-2 text-xs rounded-xl bg-gray-50 dark:bg-zinc-800/90 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-accent font-bold transition-theme shadow-inner"
                        />
                        <Search size={14} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        {customLocationSearch && (
                          <button
                            type="button"
                            onClick={() => { setCustomLocationSearch(''); setLocationSuggestions([]); }}
                            className="absolute end-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>

                      {/* Autocomplete Dropdown */}
                      {locationSuggestions.length > 0 && (
                        <div className="mt-1 max-h-44 overflow-y-auto custom-scrollbar border border-accent/30 rounded-xl bg-white dark:bg-zinc-900 p-1.5 shadow-xl space-y-1">
                          <div className="text-[10px] font-bold text-accent dark:text-accent px-2 py-0.5 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
                            <span>{isRtl ? 'النتائج المباشرة:' : 'Live Matches:'}</span>
                            <span>{locationSuggestions.length}</span>
                          </div>
                          {locationSuggestions.map((item, idx) => (
                            <button
                              key={`bulletin-loc-sugg-${item.display_name || idx}-${idx}`}
                              type="button"
                              onClick={() => {
                                setAdFormData(prev => ({ ...prev, location_city: item.display_name }));
                                setLocationSuggestions([]);
                                setCustomLocationSearch('');
                              }}
                              className="w-full text-right rtl:text-right ltr:text-left px-3 py-2 text-xs text-gray-800 dark:text-gray-200 hover:bg-accent/10 rounded-lg transition-colors flex items-center gap-2 font-medium"
                            >
                              <MapPin size={12} className="text-accent shrink-0" />
                              <span className="truncate">{item.display_name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 2. DYNAMIC COUNTRY & CITY DROPDOWN */}
                    <div className="space-y-1.5 p-3 rounded-2xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-200/80 dark:border-gray-800">
                      <label className="block text-[11px] font-extrabold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                        <Building2 size={13} className="text-accent" />
                        <span>{isRtl ? 'اختيار سريع حسب القوائم الجاهزة:' : 'Quick Country & City Selection:'}</span>
                      </label>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {/* Country Dropdown */}
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 mb-0.5">
                            {isRtl ? 'الدولة:' : 'Country:'}
                          </label>
                          <select
                            value={selectedComposerCountry}
                            onChange={(e) => {
                              const country = e.target.value;
                              setSelectedComposerCountry(country);
                              const cities = COUNTRIES_CITIES_DATA[country] || [];
                              const firstCity = cities[0] || country;
                              setAdFormData(prev => ({ ...prev, location_city: `${country} - ${firstCity}` }));
                            }}
                            className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-800 dark:text-gray-200 focus:outline-none focus:border-accent transition-theme cursor-pointer shadow-2xs"
                          >
                            {Object.keys(COUNTRIES_CITIES_DATA).map((c, cIdx) => (
                              <option key={`bulletin-cntry-${c}-${cIdx}`} value={c}>
                                📍 {c}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* City Dropdown */}
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 mb-0.5">
                            {isRtl ? 'المدينة:' : 'City:'}
                          </label>
                          <select
                            value={
                              adFormData.location_city?.includes(' - ') 
                                ? adFormData.location_city.split(' - ')[1] 
                                : adFormData.location_city
                            }
                            onChange={(e) => {
                              const cityName = e.target.value;
                              setAdFormData(prev => ({
                                ...prev,
                                location_city: `${selectedComposerCountry} - ${cityName}`
                              }));
                            }}
                            className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-800 dark:text-gray-200 focus:outline-none focus:border-accent transition-theme cursor-pointer shadow-2xs"
                          >
                            {(COUNTRIES_CITIES_DATA[selectedComposerCountry] || []).map((cityName, ctIdx) => (
                              <option key={`bulletin-city-opt-${cityName}-${ctIdx}`} value={cityName}>
                                🌆 {cityName}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* 3. REACH VISIBILITY RADIUS SLIDER (5-100 KM) */}
                    <div className="space-y-2 p-3 rounded-2xl bg-gradient-to-br from-gray-500/10 via-gray-50 to-gray-500/5 dark:from-gray-500/10 dark:via-zinc-800/60 dark:to-gray-500/5 border border-accent/20">
                      <div className="flex items-center justify-between text-xs font-extrabold">
                        <span className="text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                          <SlidersHorizontal size={13} className="text-accent" />
                          <span>{isRtl ? 'شعاع مسافة التغطية برؤية المنشور:' : 'Post Visibility Distance Radius:'}</span>
                        </span>
                        <span className="text-accent dark:text-accent font-black text-xs bg-accent/15 px-2 py-0.5 rounded-lg border border-accent/20">
                          {adFormData.location_radius === 'all' 
                            ? (isRtl ? '🌐 بلا حدود' : '🌐 Unlimited') 
                            : `🎯 +${adFormData.location_radius || '10'} ${isRtl ? 'كم' : 'km'}`}
                        </span>
                      </div>

                      {/* Interactive Range Input Slider */}
                      <div className="space-y-1 pt-1">
                        <input
                          type="range"
                          min="5"
                          max="100"
                          step="5"
                          value={adFormData.location_radius === 'all' ? '100' : (adFormData.location_radius || '10')}
                          onChange={(e) => setAdFormData(prev => ({ ...prev, location_radius: e.target.value }))}
                          className="w-full h-2 bg-gray-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-accent hover:accent-accent-400 transition-theme"
                        />
                        <div className="flex justify-between text-[9px] font-bold text-gray-400 px-0.5">
                          <span>5 {isRtl ? 'كم' : 'km'}</span>
                          <span>25 {isRtl ? 'كم' : 'km'}</span>
                          <span>50 {isRtl ? 'كم' : 'km'}</span>
                          <span>100 {isRtl ? 'كم' : 'km'}</span>
                        </div>
                      </div>

                      {/* Quick Radius Preset Chips */}
                      <div className="flex items-center gap-1 pt-1">
                        {['5', '10', '25', '50', '100', 'all'].map((r, rIdx) => (
                          <button
                            key={`bulletin-rad-opt-${r}-${rIdx}`}
                            type="button"
                            onClick={() => setAdFormData(prev => ({ ...prev, location_radius: r }))}
                            className={`flex-1 py-1 rounded-lg text-[10px] font-extrabold transition-theme border ${
                              (adFormData.location_radius || '10') === r
                                ? 'bg-accent text-white border-accent shadow-2xs'
                                : 'bg-white dark:bg-zinc-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-accent/50'
                            }`}
                          >
                            {r === 'all' ? (isRtl ? 'الكل' : 'All') : `${r} ${isRtl ? 'كم' : 'km'}`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 4. GPS AUTO DETECT BUTTON */}
                    <button
                      type="button"
                      onClick={() => {
                        if (!navigator.geolocation) {
                          toast.error(isRtl ? 'المتصفح لا يدعم تحديد الموقع' : 'Geolocation is not supported');
                          return;
                        }
                        toast.loading(isRtl ? 'جاري تحديد موقعك الجغرافي...' : 'Detecting GPS location...');
                        navigator.geolocation.getCurrentPosition(
                          async (position) => {
                            toast.dismiss();
                            const { latitude, longitude } = position.coords;
                            try {
                              const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=ar`);
                              const data = await res.json();
                              const place = data.address?.city || data.address?.town || data.address?.state || data.address?.county || `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
                              setAdFormData(prev => ({ ...prev, location_city: place }));
                              toast.success(isRtl ? `🎯 تم تحديد موقعك: ${place}` : `🎯 Location set: ${place}`);
                            } catch (e) {
                              const locStr = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
                              setAdFormData(prev => ({ ...prev, location_city: locStr }));
                              toast.success(isRtl ? `🎯 تم إضافة الموقع: ${locStr}` : `🎯 Coords added: ${locStr}`);
                            }
                          },
                          () => {
                            toast.dismiss();
                            toast.error(isRtl ? 'تعذر الوصول لموقع الجهاز' : 'Could not detect location');
                          },
                          { timeout: 8000 }
                        );
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-accent/10 hover:bg-accent/20 border border-accent/30 text-accent dark:text-accent font-extrabold text-[11px] flex items-center justify-center gap-1.5 transition-theme active:scale-95"
                    >
                      <Compass size={14} className="text-accent shrink-0" />
                      <span>{isRtl ? '🎯 تحديد موقعي الجغرافي تلقائياً (GPS)' : '🎯 Auto-Detect GPS Location'}</span>
                    </button>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                      <button
                        type="button"
                        onClick={() => setComposerView('main')}
                        className="flex-1 py-2 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-theme"
                      >
                        {isRtl ? 'إلغاء' : 'Cancel'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setComposerView('main')}
                        className="flex-1 py-2.5 bg-accent hover:bg-accent text-white rounded-xl text-xs font-extrabold transition-theme shadow-md shadow-none flex items-center justify-center gap-1.5 active:scale-95"
                      >
                        <Check size={15} />
                        <span>{isRtl ? 'تأكيد وحفظ الموقع' : 'Apply Location'}</span>
                      </button>
                    </div>
                  </motion.div>
                )}

                {composerView === 'tagging' && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 text-[10px] font-bold text-blue-600">
                      {isRtl ? 'ميزة الإشارة تتيح لك تنبيه المستخدمين الآخرين حول منشورك.' : 'Tagging allows you to notify other users about your post.'}
                    </div>
                    <input 
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder={isRtl ? 'اكتب أسماء المستخدمين (مفصولة بفاصلة)...' : 'Enter usernames (comma separated)...'}
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-xs focus:outline-none focus:border-blue-500"
                    />
                    <button 
                      onClick={() => {
                        const tags = userSearch.split(',').map(s => s.trim()).filter(Boolean);
                        setAdFormData({...adFormData, tagged_users: tags});
                        setComposerView('main');
                      }}
                      className="w-full py-2.5 rounded-xl bg-blue-500 text-white font-bold text-xs"
                    >
                      {isRtl ? 'حفظ التغييرات' : 'Save Changes'}
                    </button>
                  </div>
                )}

                {composerView === 'emojis' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-8 gap-2 max-h-[350px] overflow-y-auto p-1 scrollbar-thin">
                      {['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','🤠','🥳','🤖','👋','🤚','🖐','✋','🖖','👌','🤌','🤏','✌️','🤞','🫰','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🧠','👀','👁️','👅','👄','💋','❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','💕','💞','💓','💗','💖','💘','💝','✨','⭐','🌟','💫','🔥','💥','💯','💢','💬','💭','💤','🚀','💡','🎉','🏆','🥇','💎'].map((emoji, idx) => (
                        <button
                          key={`bulletin-emoji-${idx}`}
                          type="button"
                          onClick={() => {
                            setAdFormData(prev => ({ ...prev, description: prev.description + emoji }));
                            setComposerView('main');
                          }}
                          className="h-10 text-xl flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-theme"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Post Audience Selector Modal */}
      <AnimatePresence>
        {isAudienceModalOpen && (
          <div className="fixed inset-0 z-[100001] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md bg-[var(--surface-card)] border border-[var(--border-main)] text-[var(--text-primary)] rounded-[var(--radius-lg)] shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-[8px] bg-accent/10 text-accent flex items-center justify-center">
                    <Globe size={18} />
                  </div>
                  <h3 className="text-base font-black text-gray-900 dark:text-gray-100">
                    {isRtl ? 'تحديد جمهور المنشور' : 'Select Post Audience'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAudienceModalOpen(false)}
                  className="w-8 h-8 rounded-[8px] bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-4 space-y-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                  {isRtl
                    ? 'من يمكنه رؤية منشورك؟ يحدد هذا الخيار الفئات المسموح لها برؤية المنشور في التغذية الرئيسية والبحث.'
                    : 'Who can see your post? This option determines who is allowed to view the post in the main feed and search.'}
                </p>

                {/* Public Option */}
                <button
                  type="button"
                  onClick={() => {
                    setAdFormData(prev => ({ ...prev, audience: 'public' }));
                    setIsAudienceModalOpen(false);
                  }}
                  className={`w-full p-3.5 rounded-2xl border text-start transition-theme flex items-center justify-between ${
                    adFormData.audience === 'public'
                      ? 'border-accent bg-accent/60 dark:bg-accent/30 ring-1 ring-accent-500/50'
                      : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
                      <Globe size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <span>{isRtl ? 'العامة' : 'Public'}</span>
                        <span className="text-[10px] bg-accent/10 text-accent dark:text-accent px-2 py-0.5 rounded-[8px] font-bold">
                          {isRtl ? 'موصى به' : 'Recommended'}
                        </span>
                      </h4>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                        {isRtl ? 'أي شخص داخل المنصة أو خارجها' : 'Anyone on or off the platform'}
                      </p>
                    </div>
                  </div>
                  {adFormData.audience === 'public' && (
                    <div className="w-6 h-6 rounded-[6px] bg-accent text-white flex items-center justify-center shadow-xs">
                      <Check size={14} />
                    </div>
                  )}
                </button>

                {/* Friends Option */}
                <button
                  type="button"
                  onClick={() => {
                    setAdFormData(prev => ({ ...prev, audience: 'friends' }));
                    setIsAudienceModalOpen(false);
                  }}
                  className={`w-full p-3.5 rounded-2xl border text-start transition-theme flex items-center justify-between ${
                    adFormData.audience === 'friends'
                      ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/30 ring-1 ring-blue-500/50'
                      : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                      <Users size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-gray-900 dark:text-gray-100">
                        {isRtl ? 'الأصدقاء' : 'Friends'}
                      </h4>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                        {isRtl ? 'المستخدمون والمسجلون فقط على المنصة' : 'Registered members & friends only'}
                      </p>
                    </div>
                  </div>
                  {adFormData.audience === 'friends' && (
                    <div className="w-6 h-6 rounded-[6px] bg-blue-500 text-white flex items-center justify-center shadow-xs">
                      <Check size={14} />
                    </div>
                  )}
                </button>

                {/* Only Me Option */}
                <button
                  type="button"
                  onClick={() => {
                    setAdFormData(prev => ({ ...prev, audience: 'only_me' }));
                    setIsAudienceModalOpen(false);
                  }}
                  className={`w-full p-3.5 rounded-2xl border text-start transition-theme flex items-center justify-between ${
                    adFormData.audience === 'only_me'
                      ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/30 ring-1 ring-amber-500/50'
                      : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                      <Lock size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-gray-900 dark:text-gray-100">
                        {isRtl ? 'أنا فقط' : 'Only Me'}
                      </h4>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                        {isRtl ? 'منشور خاص بك لا يظهر لأي مستخدم آخر' : 'Private post visible only to you'}
                      </p>
                    </div>
                  </div>
                  {adFormData.audience === 'only_me' && (
                    <div className="w-6 h-6 rounded-[6px] bg-amber-500 text-white flex items-center justify-center shadow-xs">
                      <Check size={14} />
                    </div>
                  )}
                </button>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <span className="text-[11px] text-gray-400 font-medium">
                  {isRtl ? 'سيتم تطبيق هذا الخيار على هذا المنشور' : 'Selection will apply to this post'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsAudienceModalOpen(false)}
                  className="px-5 py-2 rounded-xl bg-accent hover:bg-accent text-white text-xs font-black transition-theme shadow-md shadow-none"
                >
                  {isRtl ? 'تم التحديد' : 'Done'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Facebook-Style Add To Post Modal / Menu */}
      <AnimatePresence>
        {isAddToPostModalOpen && (
          <div className="fixed inset-0 z-[100001] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md rounded-3xl bg-[#242526] text-white border border-gray-700 p-5 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-gray-700/60">
                <button 
                  type="button" 
                  onClick={() => setIsAddToPostModalOpen(false)} 
                  className="p-2 rounded-[8px] hover:bg-gray-800 text-gray-300 transition-colors"
                >
                  <ArrowLeft size={20} className={isRtl ? 'rotate-180' : ''} />
                </button>
                <h3 className="text-base font-extrabold text-white">
                  {isRtl ? 'إضافة إلى منشورك' : 'Add to your post'}
                </h3>
                <div className="w-9" />
              </div>

              <div className="grid grid-cols-2 gap-2 py-2">
                {/* 1. Photo/Video */}
                <label className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-800/80 cursor-pointer transition-theme group">
                  <div className="w-10 h-10 rounded-[8px] bg-accent/10 flex items-center justify-center text-accent transition-theme">
                    <ImageIcon size={22} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-100">{isRtl ? 'صورة/فيديو' : 'Photo/Video'}</span>
                    <span className="text-[9px] text-gray-400">{isRtl ? 'إرفاق وسائط' : 'Attach media'}</span>
                  </div>
                  <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={(e) => {
                    const files = e.target.files;
                    if (files && files.length > 0) {
                      if (files[0].type.startsWith('image/')) {
                        handleImageFileUpload(e);
                      } else {
                        handleVideoFileUpload(e);
                      }
                    }
                    setIsAddToPostModalOpen(false);
                  }} />
                </label>

                {/* 2. Feeling/Activity */}
                <button
                  type="button"
                  onClick={() => {
                    setComposerView('feelings');
                    setIsAddToPostModalOpen(false);
                  }}
                  className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-800/80 text-left rtl:text-right transition-theme group"
                >
                  <div className="w-10 h-10 rounded-[8px] bg-orange-500/10 flex items-center justify-center text-orange-500 transition-theme">
                    <Smile size={22} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-100">{isRtl ? 'شعور/نشاط' : 'Feeling/Activity'}</span>
                    <span className="text-[9px] text-gray-400">{isRtl ? 'شارك حالتك' : 'Share status'}</span>
                  </div>
                </button>

                {/* 3. Tag People */}
                <button
                  type="button"
                  onClick={() => {
                    setComposerView('tagging');
                    setIsAddToPostModalOpen(false);
                  }}
                  className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-800/80 text-left rtl:text-right transition-theme group"
                >
                  <div className="w-10 h-10 rounded-[8px] bg-blue-500/10 flex items-center justify-center text-blue-500 transition-theme">
                    <Users size={22} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-100">{isRtl ? 'إشارة إلى الأشخاص' : 'Tag people'}</span>
                    <span className="text-[9px] text-gray-400">{isRtl ? 'مع أصدقائك' : 'With friends'}</span>
                  </div>
                </button>

                {/* 4. Location */}
                <button
                  type="button"
                  onClick={() => {
                    setComposerView('location');
                    setIsAddToPostModalOpen(false);
                  }}
                  className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-800/80 text-left rtl:text-right transition-theme group"
                >
                  <div className="w-10 h-10 rounded-[8px] bg-red-500/10 flex items-center justify-center text-red-500 transition-theme">
                    <MapPin size={22} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-100">{isRtl ? 'دخول / موقع' : 'Check in'}</span>
                    <span className="text-[9px] text-gray-400">{isRtl ? 'مكانك الحالي' : 'Your location'}</span>
                  </div>
                </button>

                {/* 5. Receive Calls / Phone */}
                <button
                  type="button"
                  onClick={() => {
                    setAdFormData(prev => ({ ...prev, has_whatsapp_button: !prev.has_whatsapp_button }));
                    setIsAddToPostModalOpen(false);
                    toast.success(isRtl ? 'تم تفعيل زر تلقي المكالمات/واتساب' : 'Call/WhatsApp button activated');
                  }}
                  className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-800/80 text-left rtl:text-right transition-theme group"
                >
                  <div className="w-10 h-10 rounded-[8px] bg-blue-600/10 flex items-center justify-center text-blue-500 transition-theme">
                    <Phone size={22} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-100">{isRtl ? 'تلقي مكالمات' : 'Receive calls'}</span>
                    <span className="text-[9px] text-gray-400">{isRtl ? 'رقم الاتصال السريع' : 'Direct contact'}</span>
                  </div>
                </button>

                {/* 6. GIF Image */}
                <button
                  type="button"
                  onClick={async () => {
                    const gifUrl = await confirm({
                      title: isRtl ? 'إضافة صورة GIF' : 'Add GIF Image',
                      description: isRtl ? 'أدخل رابط صورة GIF المتحركة:' : 'Enter GIF image URL:',
                      hasInput: true,
                      inputPlaceholder: 'https://...',
                      confirmLabel: isRtl ? 'إضافة' : 'Add',
                      variant: 'info',
                      requiredInput: true,
                    });
                    if (gifUrl && typeof gifUrl === 'string') {
                      setAdFormData(prev => ({ ...prev, image_url: gifUrl }));
                      toast.success(isRtl ? 'تمت إضافة صورة GIF بنجاح' : 'GIF added successfully');
                    }
                    setIsAddToPostModalOpen(false);
                  }}
                  className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-800/80 text-left rtl:text-right transition-theme group"
                >
                  <div className="w-10 h-10 rounded-[8px] bg-accent/10 flex items-center justify-center text-accent font-extrabold text-xs transition-theme">
                    GIF
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-100">{isRtl ? 'صورة GIF' : 'GIF Image'}</span>
                    <span className="text-[9px] text-gray-400">{isRtl ? 'صور متحركة' : 'Animated sticker'}</span>
                  </div>
                </button>

                {/* 7. Live Video */}
                <button
                  type="button"
                  onClick={() => {
                    setAdFormData(prev => ({ ...prev, description: (prev.description ? prev.description + '\n' : '') + '🔴 [بث مباشر / Live Broadcast]' }));
                    setIsAddToPostModalOpen(false);
                    toast.success(isRtl ? 'تمت إضافة علامة البث المباشر' : 'Live video badge added');
                  }}
                  className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-800/80 text-left rtl:text-right transition-theme group"
                >
                  <div className="w-10 h-10 rounded-[8px] bg-red-600/10 flex items-center justify-center text-red-500 transition-theme">
                    <Radio size={22} className="animate-pulse" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-100">{isRtl ? 'فيديو بث مباشر' : 'Live Video'}</span>
                    <span className="text-[9px] text-gray-400">{isRtl ? 'بث مباشر الآن' : 'Broadcast live'}</span>
                  </div>
                </button>

                {/* 8. Life Event */}
                <button
                  type="button"
                  onClick={() => {
                    setAdFormData(prev => ({ ...prev, description: (prev.description ? prev.description + '\n' : '') + '🎉 [حدث شخصي هام / Life Event]' }));
                    setIsAddToPostModalOpen(false);
                    toast.success(isRtl ? 'تمت إضافة علامة الحدث الشخصي' : 'Life event badge added');
                  }}
                  className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-800/80 text-left rtl:text-right transition-theme group"
                >
                  <div className="w-10 h-10 rounded-[8px] bg-blue-400/10 flex items-center justify-center text-blue-400 transition-theme">
                    <Bookmark size={22} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-100">{isRtl ? 'حدث شخصي' : 'Life Event'}</span>
                    <span className="text-[9px] text-gray-400">{isRtl ? 'مناسبة خاصة' : 'Milestone'}</span>
                  </div>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsAddToPostModalOpen(false)}
                className="w-full py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-bold text-xs transition-theme"
              >
                {isRtl ? 'إغلاق' : 'Close'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================== */}
      {/* MODAL 2: CREATE MERCHANT PAGE                              */}
      {/* ========================================================== */}
      <AnimatePresence>
        {isPageModalOpen && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-xl rounded-2xl bg-white dark:bg-[#1a1a1c] border border-gray-200 dark:border-gray-800 p-6 shadow-2xl space-y-4 my-8"
            >
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                <div className="flex items-center gap-2">
                  <Building2 size={20} className="text-accent" />
                  <h3 className="text-sm font-extrabold">{isRtl ? 'إنشاء صفحة تجارية جديدة' : 'Create Merchant Page'}</h3>
                </div>
                <button onClick={() => setIsPageModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreatePage} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1">{isRtl ? 'اسم الشركة / المتجر:' : 'Page Name:'}</label>
                    <input
                      type="text"
                      required
                      value={pageFormData.name}
                      onChange={(e) => setPageFormData({ ...pageFormData, name: e.target.value })}
                      placeholder={isRtl ? 'شركة القدس للتكنولوجيا' : 'Name...'}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1">{isRtl ? 'المدينة / المحافظة:' : 'City:'}</label>
                    <select
                      value={pageFormData.city}
                      onChange={(e) => setPageFormData({ ...pageFormData, city: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
                    >
                      {PALESTINE_CITIES.map((c, cIdx) => (
                        <option key={`bulletin-pal-city-${c}-${cIdx}`} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">{isRtl ? 'نبذة عن الشركة والخدمات:' : 'About Business:'}</label>
                  <textarea
                    rows={3}
                    required
                    value={pageFormData.description}
                    onChange={(e) => setPageFormData({ ...pageFormData, description: e.target.value })}
                    placeholder={isRtl ? 'صف خدماتك ومنتجاتك وساعات العمل بالتفصيل...' : 'Description...'}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ImageUploadDropzone
                    label={isRtl ? 'صورة الشعار (Avatar):' : 'Avatar (Profile Logo):'}
                    value={pageFormData.avatar_url}
                    onChange={(url) => setPageFormData({ ...pageFormData, avatar_url: url })}
                    aspectRatio={1}
                    targetWidth={400}
                    targetHeight={400}
                    placeholderText={isRtl ? 'رفع صورة الشعار من الجهاز (1:1)' : 'Upload Avatar Image (1:1)'}
                    isRtl={isRtl}
                  />

                  <ImageUploadDropzone
                    label={isRtl ? 'صورة الغلاف (Cover Banner):' : 'Cover Banner:'}
                    value={pageFormData.cover_url}
                    onChange={(url) => setPageFormData({ ...pageFormData, cover_url: url })}
                    aspectRatio={3}
                    targetWidth={1200}
                    targetHeight={400}
                    placeholderText={isRtl ? 'رفع صورة الغلاف من الجهاز (3:1)' : 'Upload Cover Banner (3:1)'}
                    isRtl={isRtl}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1">{isRtl ? 'رقم الواتساب الرسمي:' : 'Official WhatsApp:'}</label>
                    <input
                      type="text"
                      value={pageFormData.whatsapp_number}
                      onChange={(e) => setPageFormData({ ...pageFormData, whatsapp_number: e.target.value })}
                      placeholder="+970599000000"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1">{isRtl ? 'العنوان التفصيلي:' : 'Detailed Address:'}</label>
                    <input
                      type="text"
                      value={pageFormData.address}
                      onChange={(e) => setPageFormData({ ...pageFormData, address: e.target.value })}
                      placeholder={isRtl ? 'شارع عمر المختار - حي الرمال' : 'Address...'}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmittingPage}
                    className="px-6 py-2.5 rounded-xl bg-accent hover:bg-accent text-white font-bold text-xs shadow-lg shadow-none transition-theme"
                  >
                    {isSubmittingPage ? (isRtl ? 'جاري الإنشاء...' : 'Creating...') : (isRtl ? 'تفعيل الصفحة التجارية' : 'Create Page')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================== */}
      {/* MODAL 3: DIRECT CUSTOMER INQUIRY POPUP                      */}
      {/* ========================================================== */}
      <AnimatePresence>
        {inquireAd && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md rounded-2xl bg-white dark:bg-[#1a1a1c] border border-gray-200 dark:border-gray-800 p-5 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <MessageCircle size={18} className="text-accent" />
                  <h3 className="text-xs font-extrabold">{isRtl ? 'إرسال استفسار مباشر للتاجر' : 'Direct Merchant Inquiry'}</h3>
                </div>
                <button onClick={() => setInquireAd(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={16} />
                </button>
              </div>

              <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-900/60 flex items-center gap-2.5 border border-gray-100 dark:border-gray-800">
                <img src={getMediaUrl(inquireAd.image_url)} alt={inquireAd.title} className="w-12 h-12 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold truncate">{inquireAd.title}</h4>
                  <p className="text-[10px] text-gray-400">{inquireAd.author_name}</p>
                </div>
              </div>

              <form onSubmit={handleSendInquiry} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold mb-1">{isRtl ? 'رسالتك واستفسارك:' : 'Your Inquiry:'}</label>
                  <textarea
                    rows={3}
                    required
                    value={inquiryText}
                    onChange={(e) => setInquiryText(e.target.value)}
                    placeholder={isRtl ? 'مرحباً، أود معرفة أسعار ومكونات هذا المنتج...' : 'Message...'}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold mb-1">{isRtl ? 'رقم هاتفك / الواتساب للتواصل contigo:' : 'Your Phone/WhatsApp:'}</label>
                  <input
                    type="text"
                    value={inquiryPhone}
                    onChange={(e) => setInquiryPhone(e.target.value)}
                    placeholder="+970599111222"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
                  />
                </div>

                <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-2">
                  <button
                    type="button"
                    onClick={() => handleMessageAdvertiser(inquireAd, inquiryText)}
                    disabled={messagingAdId === inquireAd.id}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-gray-500/10 to-teal-600 hover:from-gray-500/10 hover:to-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-none transition-theme disabled:opacity-50"
                  >
                    {messagingAdId === inquireAd.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <MessageCircle size={14} />
                    )}
                    <span>{isRtl ? 'مراسلة المعلن مباشرة (فتح محادثة خاصة)' : 'Message Advertiser (Open Direct Chat)'}</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isSendingInquiry}
                    className="w-full py-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold text-xs flex items-center justify-center gap-2 transition-theme"
                  >
                    <Send size={13} />
                    <span>{isSendingInquiry ? (isRtl ? 'جاري الإرسال...' : 'Sending...') : (isRtl ? 'إرسال كاستفسار سريع فقط' : 'Send Quick Inquiry Only')}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* BOOST POST MODAL */}
      {boostingAd && (
        <BoostPostModal
          isOpen={isBoostModalOpen}
          onClose={() => {
            setIsBoostModalOpen(false);
            setBoostingAd(null);
          }}
          ad={boostingAd}
          walletBalance={walletBalance}
          token={token}
          isRtl={isRtl}
          onSuccess={handleBoostSuccess}
        />
      )}

      {/* STREAM SETUP MODAL */}
      <AnimatePresence>
        {isStreamSetupOpen && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm rounded-[32px] bg-white dark:bg-[#1a1a1c] border border-gray-200 dark:border-gray-800 p-8 shadow-2xl space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4 border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
                  <Radio size={32} className="text-red-500 animate-pulse" />
                </div>
                <h3 className="text-xl font-black tracking-tight">{isRtl ? 'إعداد البث المباشر' : 'Live Stream Setup'}</h3>
                <p className="text-xs text-gray-500 font-medium">
                  {isRtl ? 'أدخل عنواناً جذاباً لمتابعيك قبل البدء' : 'Enter a catchy title for your audience before starting'}
                </p>
              </div>

              <div className="space-y-4">
                <div className="relative group">
                  <input
                    type="text"
                    value={streamTitleInput}
                    onChange={(e) => setStreamTitleInput(e.target.value)}
                    placeholder={isRtl ? 'مثلاً: جولة في مكتبي الجديد...' : 'e.g., Tour of my new office...'}
                    className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500/50 transition-theme font-bold"
                    autoFocus
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-700 pointer-events-none transition-colors group-focus-within:text-red-500/50">
                    <Type size={18} />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setIsStreamSetupOpen(false);
                      setStreamTitleInput('');
                    }}
                    className="flex-1 py-4 rounded-2xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 font-black text-xs transition-theme active:scale-95"
                  >
                    {isRtl ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    onClick={() => {
                      if (!streamTitleInput.trim()) {
                        toast.error(isRtl ? 'يرجى إدخال عنوان للبث' : 'Please enter a stream title');
                        return;
                      }
                      setIsStreamSetupOpen(false);
                      setIsLiveStreamOpen(true);
                    }}
                    className="flex-[2] py-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-700 hover:to-rose-600 text-white font-black text-xs shadow-xl shadow-red-500/25 transition-theme active:scale-95 flex items-center justify-center gap-2"
                  >
                    <span>{isRtl ? 'بدء البث المباشر 🚀' : 'Start Streaming 🚀'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================== */}
      {/* INSTANT LIGHTWEIGHT FLYOUT: LOCATION & RADIUS COVERAGE    */}
      {/* ========================================================== */}
      <AnimatePresence>
        {isLocationFlyoutOpen && (
          <div 
            className="fixed inset-0 z-[100000] flex items-start sm:items-center justify-center pt-16 sm:pt-0 p-3 sm:p-4 bg-black/25 dark:bg-black/55 backdrop-blur-[2px] transition-theme"
            onClick={() => setIsLocationFlyoutOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.97, opacity: 0, y: -10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.97, opacity: 0, y: -10 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm sm:max-w-md rounded-2xl bg-white dark:bg-[#18181b] border border-gray-200 dark:border-gray-800/90 shadow-2xl p-4 space-y-3.5 my-auto max-h-[88vh] overflow-y-auto custom-scrollbar backdrop-blur-md"
            >
              {/* Instant Flyout Header */}
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center text-accent border border-accent/20">
                    <MapPin size={16} className="animate-bounce shrink-0" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-gray-900 dark:text-gray-100 flex items-center gap-1">
                      <span>{isRtl ? 'قائمة التغطية والموقع السريعة' : 'Instant Location & Radius Flyout'}</span>
                      <span className="text-[9px] bg-accent/15 text-accent dark:text-accent px-1.5 py-0.5 rounded-[4px] font-bold">
                        {isRtl ? 'مباشر' : 'Live'}
                      </span>
                    </h3>
                    <p className="text-[10px] text-gray-400">
                      {isRtl ? 'ابحث بالوقت الفعلي أو اضبط شعاع التغطية (5 - 100 كم)' : 'Real-time search & radius visibility (5-100 km)'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsLocationFlyoutOpen(false)}
                  className="w-7 h-7 rounded-[4px] bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 flex items-center justify-center text-gray-500 transition-theme hover:rotate-90"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Active Location & Radius Badge */}
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-gradient-to-r from-gray-500/10 via-gray-500/10 to-gray-500/5 border border-accent/25 text-accent dark:text-accent shadow-2xs">
                <div className="flex items-center gap-2 text-[11px] font-bold truncate">
                  <Navigation size={13} className="text-accent shrink-0" />
                  <span className="truncate">
                    {isRtl ? 'النطاق الحالي:' : 'Current Feed:'}{' '}
                    <strong className="text-accent dark:text-accent font-extrabold">
                      {selectedCity === 'all' 
                        ? (isRtl ? '🌐 جميع الدول والمحافظات' : '🌐 All Global Regions') 
                        : `📍 ${selectedCountry ? `${selectedCountry} - ` : ''}${selectedCity} (${selectedRadius === 'all' ? (isRtl ? 'الكل' : 'All') : `+${selectedRadius}كم`})`}
                    </strong>
                  </span>
                </div>
                {selectedCity !== 'all' && (
                  <button
                    type="button"
                    onClick={() => {
                      handleSelectCity('all', 'all');
                      setSelectedCountry('all');
                    }}
                    className="text-[10px] font-extrabold text-gray-500 hover:text-red-500 underline transition-theme shrink-0 ms-1"
                  >
                    {isRtl ? 'إعادة ضبط' : 'Reset'}
                  </button>
                )}
              </div>

              {/* 1. Country Selection Dropdown */}
              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                  <Globe size={13} className="text-accent" />
                  <span>{isRtl ? 'اختر الدولة:' : 'Select Country:'}</span>
                </label>
                <select
                  value={selectedCountry}
                  onChange={(e) => {
                    const c = e.target.value;
                    setSelectedCountry(c);
                    secureStorage.set('perplexta_user_country', c);
                    handleSelectCity('all');
                  }}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-gray-50 dark:bg-zinc-800/90 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-accent transition-theme cursor-pointer shadow-2xs"
                >
                  <option value="all">🌐 {isRtl ? 'كافة الدول (تغطية عالمية)' : 'All Countries (Global)'}</option>
                  <option value="فلسطين">🇵🇸 فلسطين</option>
                  <option value="الأردن">🇯🇴 الأردن</option>
                  <option value="المملكة العربية السعودية">🇸🇦 المملكة العربية السعودية</option>
                  <option value="الإمارات العربية المتحدة">🇦🇪 الإمارات العربية المتحدة</option>
                  <option value="مصر">🇪🇬 مصر</option>
                  <option value="قطر">🇶🇦 قطر</option>
                  <option value="الكويت">🇰🇼 الكويت</option>
                  <option value="سلطنة عمان">🇴🇲 سلطنة عمان</option>
                  <option value="البحرين">🇧🇭 البحرين</option>
                  <option value="العراق">🇮🇶 العراق</option>
                  <option value="لبنان">🇱🇧 لبنان</option>
                  <option value="سوريا">🇸🇾 سوريا</option>
                  <option value="اليمن">🇾🇪 اليمن</option>
                  <option value="المغرب">🇲🇦 المغرب</option>
                  <option value="الجزائر">🇩🇿 الجزائر</option>
                  <option value="تونس">🇹🇳 تونس</option>
                  <option value="السودان">🇸🇩 السودان</option>
                  <option value="تركيا">🇹🇷 تركيا</option>
                  <option value="المملكة المتحدة">🇬🇧 المملكة المتحدة</option>
                  <option value="الولايات المتحدة">🇺🇸 الولايات المتحدة</option>
                </select>
              </div>

              {/* 2. Real-Time Autocomplete API Search Field */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold text-gray-700 dark:text-gray-300 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Building2 size={13} className="text-accent" />
                    <span>{isRtl ? 'البحث التفاعلي المباشر (بالوقت الفعلي):' : 'Real-Time Autocomplete Search:'}</span>
                  </span>
                  {isSearchingGeoLocation && (
                    <span className="text-[10px] text-accent font-bold flex items-center gap-1">
                      <Loader2 size={11} className="animate-spin" />
                      {isRtl ? 'جاري البحث...' : 'Searching...'}
                    </span>
                  )}
                </label>

                {/* Real-Time Input Box */}
                <div className="relative">
                  <input
                    type="text"
                    value={locationSearchQuery}
                    onChange={(e) => setLocationSearchQuery(e.target.value)}
                    placeholder={isRtl ? 'ابحث عن أي مدينة أو دولة أو منطقة بالوقت الفعلي...' : 'Search any city, country or landmark in real time...'}
                    className="w-full ps-8 pe-8 py-2 text-xs rounded-xl bg-gray-50 dark:bg-zinc-800/90 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-accent transition-theme shadow-inner font-medium"
                  />
                  <Search size={14} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  {isSearchingGeoLocation ? (
                    <Loader2 size={13} className="absolute end-2.5 top-1/2 -translate-y-1/2 text-accent animate-spin" />
                  ) : locationSearchQuery ? (
                    <button
                      type="button"
                      onClick={() => {
                        setLocationSearchQuery('');
                        setAutocompleteResults([]);
                      }}
                      className="absolute end-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={13} />
                    </button>
                  ) : null}
                </div>

                {/* Real-time Autocomplete API Results Dropdown */}
                {autocompleteResults.length > 0 && (
                  <div className="space-y-1 mt-1 max-h-48 overflow-y-auto custom-scrollbar border border-accent/30 rounded-xl bg-white dark:bg-zinc-900 p-1.5 shadow-xl">
                    <div className="text-[10px] font-bold text-accent dark:text-accent px-2 py-1 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
                      <span className="flex items-center gap-1">
                        <Sparkles size={11} />
                        {isRtl ? 'نتائج الخريطة المباشرة (موثّقة):' : 'Verified Live Location Results:'}
                      </span>
                      <span className="text-[9px] bg-accent/10 px-1.5 py-0.5 rounded text-accent font-extrabold">
                        {autocompleteResults.length} {isRtl ? 'نتيجة' : 'results'}
                      </span>
                    </div>
                    {autocompleteResults.map((item, idx) => {
                      const flag = getCountryFlagEmoji(item.country_code, item.country);
                      return (
                        <button
                          key={`${item.city}-${item.lat}-${idx}`}
                          type="button"
                          onClick={() => handleSelectAutocompleteResult(item)}
                          className="w-full text-start p-2 rounded-lg hover:bg-accent/10 dark:hover:bg-accent/20 transition-theme flex items-center justify-between group border border-transparent hover:border-accent/20"
                        >
                          <div className="flex items-center gap-2 truncate me-2">
                            <span className="text-sm shrink-0">{flag}</span>
                            <div className="truncate">
                              <div className="text-xs font-black text-gray-900 dark:text-gray-100 group-hover:text-accent transition-colors flex items-center gap-1">
                                <span>{item.city}</span>
                                {item.country && <span className="text-[10px] text-gray-400 font-normal">({item.country})</span>}
                              </div>
                              <div className="text-[10px] text-gray-400 truncate font-medium">
                                {item.state ? `${item.state} - ` : ''}{item.display_name}
                              </div>
                            </div>
                          </div>
                          <span className="text-[9px] font-extrabold text-accent bg-accent/10 px-1.5 py-0.5 rounded shrink-0 flex items-center gap-0.5">
                            <CheckCircle2 size={10} />
                            {isRtl ? 'اختيار' : 'Select'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Cities Quick Selector Grid */}
                <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto p-1 custom-scrollbar">
                  <button
                    type="button"
                    onClick={() => handleSelectCity('all')}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-theme border ${
                      selectedCity === 'all'
                        ? 'bg-accent text-white border-accent shadow-2xs'
                        : 'bg-gray-50 dark:bg-zinc-800/80 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-accent/10'
                    }`}
                  >
                    <Globe size={12} className={selectedCity === 'all' ? 'text-white' : 'text-accent shrink-0'} />
                    <span className="truncate">{isRtl ? 'كل مدن الدولة' : 'All Cities'}</span>
                  </button>

                  {getAvailableCities().map((c, cIdx) => (
                    <button
                      key={`bulletin-avail-city-${c}-${cIdx}`}
                      type="button"
                      onClick={() => handleSelectCity(c)}
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-theme border ${
                        selectedCity === c
                          ? 'bg-accent text-white border-accent shadow-2xs'
                          : 'bg-gray-50 dark:bg-zinc-800/80 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-accent/10'
                      }`}
                    >
                      <MapPin size={12} className={selectedCity === c ? 'text-white' : 'text-accent shrink-0'} />
                      <span className="truncate">{c}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. GPS Auto-Detect & Interactive Radius Slider (5-100 km) */}
              <div className="pt-2 space-y-2 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={handleDetectGpsLocation}
                  disabled={isDetectingGps}
                  className="w-full py-1.5 px-3 rounded-xl bg-accent/10 hover:bg-accent/20 border border-accent/30 text-accent dark:text-accent font-extrabold text-[11px] flex items-center justify-center gap-1.5 transition-theme active:scale-95 disabled:opacity-50"
                >
                  {isDetectingGps ? <Loader2 size={13} className="animate-spin text-accent" /> : <Compass size={13} />}
                  <span>{isRtl ? '🎯 تحديد موقعي الآن تلقائياً (GPS)' : '🎯 Auto-Detect My Location (GPS)'}</span>
                </button>

                {/* Reach Visibility Interactive Radius Slider (5-100km) */}
                <div className="space-y-2 bg-gradient-to-br from-gray-500/10 via-gray-50 to-gray-500/5 dark:from-gray-500/10 dark:via-zinc-800/60 dark:to-gray-500/5 p-3 rounded-2xl border border-accent/20">
                  <div className="flex items-center justify-between text-xs font-extrabold">
                    <span className="text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                      <SlidersHorizontal size={13} className="text-accent" />
                      <span>{isRtl ? 'نطاق الوصول والشعاع:' : 'Reach Visibility Radius:'}</span>
                    </span>
                    <span className="text-accent dark:text-accent font-black text-xs bg-accent/15 px-2 py-0.5 rounded-lg border border-accent/20">
                      {selectedRadius === 'all' ? (isRtl ? '🌐 بلا حدود (الكل)' : '🌐 Unlimited (Global)') : `🎯 +${selectedRadius} ${isRtl ? 'كم' : 'km'}`}
                    </span>
                  </div>

                  {/* Interactive Range Input Slider */}
                  <div className="space-y-1 pt-1">
                    <input
                      type="range"
                      min="5"
                      max="100"
                      step="5"
                      value={selectedRadius === 'all' ? 100 : Number(selectedRadius)}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedRadius(val);
                        secureStorage.set('perplexta_user_radius', val);
                      }}
                      className="w-full h-2 bg-gray-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-accent hover:accent-accent-400 transition-theme"
                    />
                    <div className="flex justify-between text-[9px] font-bold text-gray-400 px-0.5">
                      <span>5 {isRtl ? 'كم' : 'km'}</span>
                      <span>25 {isRtl ? 'كم' : 'km'}</span>
                      <span>50 {isRtl ? 'كم' : 'km'}</span>
                      <span>100 {isRtl ? 'كم' : 'km'}</span>
                    </div>
                  </div>

                  {/* Quick Radius Preset Chips */}
                  <div className="flex items-center gap-1 pt-1">
                    {['5', '10', '25', '50', '100', 'all'].map((r, rIdx) => (
                      <button
                        key={`bulletin-filter-rad-${r}-${rIdx}`}
                        type="button"
                        onClick={() => {
                          setSelectedRadius(r);
                          secureStorage.set('perplexta_user_radius', r);
                        }}
                        className={`flex-1 py-1 rounded-lg text-[10px] font-extrabold transition-theme border ${
                          selectedRadius === r
                            ? 'bg-accent text-white border-accent shadow-2xs'
                            : 'bg-white dark:bg-zinc-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-accent/50'
                        }`}
                      >
                        {r === 'all' ? (isRtl ? 'الكل' : 'All') : `${r} ${isRtl ? 'كم' : 'km'}`}
                      </button>
                    ))}
                  </div>

                  {/* Reach Visibility Live Feedback */}
                  <div className="text-[10px] font-bold text-accent dark:text-accent bg-accent/10 px-2.5 py-1.5 rounded-xl border border-accent/20 flex items-center gap-1.5">
                    <Radio size={12} className="text-accent animate-pulse shrink-0" />
                    <span>
                      {isRtl
                        ? `تغطية الإعلانات نشطة في نطاق ${selectedRadius === 'all' ? 'جميع المناطق بلا قيود' : `${selectedRadius} كم حول ${selectedCity === 'all' ? 'جميع المدن' : selectedCity}`}`
                        : `Active feed filtering for ${selectedRadius === 'all' ? 'all locations' : `${selectedRadius} km around ${selectedCity}`}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Confirm & Apply Button */}
              <button
                type="button"
                onClick={() => setIsLocationFlyoutOpen(false)}
                className="w-full py-2.5 rounded-xl bg-accent hover:bg-accent text-white font-extrabold text-xs shadow-md shadow-none active:scale-95 transition-theme flex items-center justify-center gap-1.5"
              >
                <Check size={15} />
                <span>{isRtl ? 'تأكيد وتطبيق التغطية' : 'Apply Proximity'}</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FLOATING BACK TO TOP BUTTON */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            onClick={() => {
              const container = document.querySelector('main > div.overflow-y-auto') || document.querySelector('.overflow-y-auto');
              if (container) {
                container.scrollTo({ top: 0, behavior: 'smooth' });
              } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className="fixed bottom-20 lg:bottom-6 end-6 z-50 h-8 px-3 rounded-[8px] bg-accent hover:bg-accent text-white transition-theme flex items-center gap-1.5 text-[12px] font-bold cursor-pointer shadow-none active:scale-95"
            title={isRtl ? 'العودة لأعلى الصفحة' : 'Scroll to top'}
          >
            <ArrowUp size={14} />
            <span className="hidden sm:inline">{isRtl ? 'أعلى الصفحة' : 'Top'}</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* FIXED BOTTOM NAVIGATION BAR (Header-to-Footer Symmetry) */}
      <nav className="lg:!hidden mobile-bottom-nav">
        {/* Tab 1: Home / Feed */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('selection');
            setSelectedPageDetail(null);
            setActiveTab('board');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`mobile-nav-item ${
            activeTab === 'board' && !selectedPageDetail ? 'active text-accent' : ''
          }`}
        >
          <div className="mobile-nav-icon">
            <Megaphone size={14} className={activeTab === 'board' && !selectedPageDetail ? 'fill-accent/10 text-accent' : ''} />
            {activeTab === 'board' && !selectedPageDetail && (
              <motion.div layoutId="nav-indicator" className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent" />
            )}
          </div>
          <span className={`mobile-nav-label ${activeTab === 'board' && !selectedPageDetail ? 'opacity-100 font-extrabold' : 'opacity-80'}`}>
            {isRtl ? 'الرئيسية' : 'Feed'}
          </span>
        </button>

        {/* Tab 2: Messages */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('selection');
            if (!token) { setIsAuthModalOpen(true); return; }
            setSelectedPageDetail(null);
            setActiveTab('inquiries');
          }}
          className={`mobile-nav-item ${
            activeTab === 'inquiries' ? 'active text-accent' : ''
          }`}
        >
          <div className="mobile-nav-icon">
            <MessageSquare size={14} className={activeTab === 'inquiries' ? 'fill-accent/10 text-accent' : ''} />
            {inquiriesList.length > 0 && (
              <span className="absolute -top-1 -right-1.5 min-w-[13px] h-[13px] px-0.5 rounded-[4px] bg-red-500 text-white text-[7.5px] font-black flex items-center justify-center ring-2 ring-white dark:ring-[#18181b] animate-bounce">
                {inquiriesList.length}
              </span>
            )}
            {activeTab === 'inquiries' && (
              <motion.div layoutId="nav-indicator" className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent" />
            )}
          </div>
          <span className={`mobile-nav-label ${activeTab === 'inquiries' ? 'opacity-100 font-extrabold' : 'opacity-80'}`}>
            {isRtl ? 'الرسائل' : 'Messages'}
          </span>
        </button>

        {/* Tab 3: Quick Add (+) - Centered */}
        <div className="relative flex items-center justify-center">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('medium');
              if (!token) { setIsAuthModalOpen(true); return; }
              setIsAdModalOpen(true);
            }}
            className="mobile-nav-center-action"
            title={isRtl ? 'إضافة منشور جديد' : 'Create Post'}
          >
            <Plus size={15} className="stroke-[2.5]" />
          </button>
        </div>

        {/* Tab 4: Pages */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('selection');
            setSelectedPageDetail(null);
            setActiveTab('pages');
          }}
          className={`mobile-nav-item ${
            activeTab === 'pages' ? 'active text-accent' : ''
          }`}
        >
          <div className="mobile-nav-icon">
            <Building2 size={14} className={activeTab === 'pages' ? 'fill-accent/10 text-accent' : ''} />
            {activeTab === 'pages' && (
              <motion.div layoutId="nav-indicator" className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent" />
            )}
          </div>
          <span className={`mobile-nav-label ${activeTab === 'pages' ? 'opacity-100 font-extrabold' : 'opacity-80'}`}>
            {isRtl ? 'الصفحات' : 'Pages'}
          </span>
        </button>

        {/* Tab 5: Menu */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('medium');
            setIsMobileSidebarOpen(true);
          }}
          className={`mobile-nav-item ${
            isMobileSidebarOpen ? 'active text-accent' : ''
          }`}
        >
          <div className="mobile-nav-icon">
            <SlidersHorizontal size={14} className={isMobileSidebarOpen ? 'text-accent' : ''} />
            {isMobileSidebarOpen && (
              <motion.div layoutId="nav-indicator" className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent" />
            )}
          </div>
          <span className={`mobile-nav-label ${isMobileSidebarOpen ? 'opacity-100 font-extrabold' : 'opacity-80'}`}>
            {isRtl ? 'القائمة' : 'Menu'}
          </span>
        </button>
      </nav>



      {/* Story Upload Modal */}
      <StoryUploadModal
        isOpen={isStoryModalOpen}
        onClose={() => setIsStoryModalOpen(false)}
        isRtl={isRtl}
        token={token}
        user={user}
        userPages={myPagesList}
        onStoryCreated={(newStory) => {
          fetchStories();
        }}
      />

      <StoryViewerModal
        isOpen={isStoryViewerOpen}
        onClose={() => {
          setIsStoryViewerOpen(false);
          setPreviewingVideoStoryId(null);
        }}
        stories={orderedStories}
        initialStoryIndex={selectedStoryIndex}
        currentUser={user}
        isRtl={isRtl}
        onStoryViewed={handleStoryViewed}
        onStoryDeleted={handleStoryDeleted}
      />

      {/* Video Trimmer Modal */}
      <VideoTrimmerModal
        isOpen={isTrimmerModalOpen}
        onClose={() => setIsTrimmerModalOpen(false)}
        videoUrl={trimmerVideoUrl}
        isRtl={isRtl}
        onTrimComplete={(trimmed) => {
          setAdFormData(prev => ({
            ...prev,
            video_url: trimmed.videoUrl,
            ad_format: trimmed.adFormat as any
          }));
          toast.success(isRtl ? 'تم تطبيق إعدادات وقص الفيديو بنجاح!' : 'Video trimming & format settings applied successfully!');
        }}
      />

      {/* Media Manager Modal (Edit All, Captions & Reordering) */}
      <MediaManagerModal
        isOpen={isMediaManagerOpen}
        onClose={() => setIsMediaManagerOpen(false)}
        mediaItems={adFormData.media_gallery || []}
        onChangeMediaItems={(updatedMedia) => {
          setAdFormData(prev => {
            const allImages = updatedMedia.filter(m => m.type === 'image').map(m => m.url);
            const firstVideo = updatedMedia.find(m => m.type === 'video');
            return {
              ...prev,
              media_gallery: updatedMedia,
              image_url: allImages.join(','),
              video_url: firstVideo ? firstVideo.url : ''
            };
          });
        }}
        onAddMoreFiles={handleMixedMediaUpload}
        isRtl={isRtl}
      />

      {/* Media Lightbox Modal (Full-Screen Viewer for Images & Videos with Facebook-style edge tools) */}
      <MediaLightboxModal
        isOpen={lightboxState.isOpen}
        onClose={() => {
          setLightboxState(prev => ({ ...prev, isOpen: false }));
          updateUrlWithPost(null);
        }}
        items={lightboxState.items}
        initialIndex={lightboxState.initialIndex}
        onToggleCommentLike={handleToggleCommentLike}
        isRtl={isRtl}
        postTitle={lightboxState.postTitle}
        authorName={lightboxState.authorName}
        ad={lightboxState.ad}
        comments={lightboxState.ad ? commentsMap[lightboxState.ad.id] : undefined}
        loadingComments={lightboxState.ad ? loadingCommentsAdId === lightboxState.ad.id : false}
        onToggleLike={handleToggleLike}
        onAddComment={handleAddComment}
        onShare={handleShareAd}
        onBoostAd={handleOpenBoostModal}
        onEditAd={handleEditAd}
        onViewPost={handleNavigateToPost}
        user={user}
        token={token}
      />

      {/* FULL-SCREEN REELS MODAL OVERLAY WHEN CLICKED FROM FEED */}
      <AnimatePresence>
        {activeReelModalId !== null && (
          <div className="fixed inset-0 z-[9999] bg-[var(--surface-page)] text-[var(--text-primary)] w-screen h-[100dvh]">
            <ReelsFeed
              ads={combinedReelsAds.length > 0 ? combinedReelsAds : ads}
              initialAdId={activeReelModalId}
              isRtl={isRtl}
              token={token}
              user={user}
              commentsMap={commentsMap}
              onToggleLike={handleToggleLike}
              onToggleSave={handleToggleSave}
              onAddComment={handleAddComment}
              onToggleCommentLike={handleToggleCommentLike}
              onMessageAdvertiser={handleMessageAdvertiser}
              onShare={handleShareAd}
              onBoostAd={handleOpenBoostModal}
              onDeleteReel={(id) => {
                const ad = ads.find(a => a.id === id);
                if (ad) handleDeleteAd(ad);
              }}
              onEditReel={handleEditAd}
              onOpenPageDetail={handleOpenPageDetail}
              onOpenUploadReels={() => {
                stopAllMedia('reel_upload_preview');
                openReelUploadModal();
              }}
              onUploadReelClick={() => {
                stopAllMedia('reel_upload_preview');
                openReelUploadModal();
              }}
              onClose={() => {
                stopAllMedia();
                setActiveReelModalId(null);
              }}
              onViewPost={handleNavigateToPost}
              onArchiveAd={(archivedAd) => {
                setAds(prev => prev.filter(a => a.id !== archivedAd.id));
                setSavedAds(prev => prev.filter(a => a.id !== archivedAd.id));
              }}
              onTrashAd={(trashedAd) => {
                setAds(prev => prev.filter(a => a.id !== trashedAd.id));
                setSavedAds(prev => prev.filter(a => a.id !== trashedAd.id));
              }}
              onUpdateAd={(updatedAd) => {
                setAds(prev => prev.map(a => a.id === updatedAd.id ? { ...a, ...updatedAd } : a));
                setSavedAds(prev => prev.map(a => a.id === updatedAd.id ? { ...a, ...updatedAd } : a));
              }}
              onReportAd={handleReportAd}
              isLoading={loading}
            />
          </div>
        )}
      </AnimatePresence>
      
      {/* Story Peek Overlay (Floating Long-press Preview) */}
      <AnimatePresence>
        {previewingVideoStoryId && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 z-[1000] pointer-events-none flex items-center justify-center p-6"
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="relative w-full max-w-[280px] aspect-[9/16] rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white/20 z-10 bg-black">
              {getMediaUrl(stories.find(s => s.id === previewingVideoStoryId)?.video_url) ? (
                <video
                  src={getMediaUrl(stories.find(s => s.id === previewingVideoStoryId)?.video_url)}
                  className="w-full h-full object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              ) : (
                <img
                  src={getMediaUrl(stories.find(s => s.id === previewingVideoStoryId)?.image_url)}
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute top-4 start-4 flex items-center gap-2 bg-black/20 backdrop-blur-md p-1.5 pr-3 rounded-[4px]">
                <BulletinAvatar 
                  src={stories.find(s => s.id === previewingVideoStoryId)?.author_avatar} 
                  alt={stories.find(s => s.id === previewingVideoStoryId)?.author_name}
                  size="sm"
                />
                <div className="flex flex-col">
                  <span className="text-white text-[11px] font-bold drop-shadow-md leading-none">
                    {stories.find(s => s.id === previewingVideoStoryId)?.author_name}
                  </span>
                  <span className="text-white/60 text-[9px] drop-shadow-md">
                    {isRtl ? 'معاينة سريعة' : 'Quick Preview'}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================== */}
      {/* MODAL 5: EDIT PROFILE & VERIFICATION                       */}
      {/* ========================================================== */}
      <AnimatePresence>
        {isProfileEditModalOpen && user && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-xl rounded-2xl bg-white dark:bg-[#1a1a1c] border border-gray-200 dark:border-gray-800 p-6 shadow-2xl space-y-4 my-8 text-[var(--text-primary)]"
            >
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                <div className="flex items-center gap-2">
                  <Settings size={20} className="text-accent" />
                  <h3 className="text-sm font-extrabold">{isRtl ? 'إعدادات الحساب وتوثيق الهوية' : 'Account Settings & KYC'}</h3>
                </div>
                <button onClick={() => setIsProfileEditModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>

              {/* Sub tabs */}
              <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-2">
                <button
                  type="button"
                  onClick={() => setKycTab('info')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-theme ${
                    kycTab === 'info'
                      ? 'bg-accent/10 text-accent'
                      : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900'
                  }`}
                >
                  {isRtl ? 'المعلومات الشخصية' : 'Personal Profile'}
                </button>
                <button
                  type="button"
                  onClick={() => setKycTab('kyc')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-theme flex items-center gap-1 ${
                    kycTab === 'kyc'
                      ? 'bg-accent/10 text-accent'
                      : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900'
                  }`}
                >
                  <ShieldCheck size={14} />
                  <span>{isRtl ? 'طلب شارة التوثيق (KYC)' : 'Get Verified (KYC)'}</span>
                </button>
              </div>

              {kycTab === 'info' ? (
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800/50 gap-2">
                      <BulletinAvatar
                        src={profileFormData.avatar}
                        alt={profileFormData.name}
                        size="lg"
                      />
                      <div className="flex flex-wrap items-center justify-center gap-1.5">
                        <label className="ui-btn-pill py-1 px-2.5 text-[10px] cursor-pointer flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md">
                          <Upload size={12} />
                          <span>{isRtl ? 'تحميل صورة' : 'Upload Avatar'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  toast.info(isRtl ? 'جاري رفع الصورة...' : 'Uploading...');
                                  const url = await handleUploadFile(file);
                                  setProfileFormData({ ...profileFormData, avatar: url });
                                  toast.success(isRtl ? 'تم رفع صورتك الشخصية بنجاح!' : 'Avatar uploaded!');
                                } catch (err: any) {
                                  toast.error(err.message || 'Upload failed');
                                }
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1">{isRtl ? 'الاسم الكامل بالمنصة:' : 'Display Name:'}</label>
                      <input
                        type="text"
                        required
                        value={profileFormData.name}
                        onChange={(e) => setProfileFormData({ ...profileFormData, name: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
                        placeholder="Your Name"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1">{isRtl ? 'البريد الإلكتروني (غير قابل للتعديل):' : 'Email (Read Only):'}</label>
                      <input
                        type="email"
                        disabled
                        value={profileFormData.email}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-gray-100 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-gray-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1">{isRtl ? 'توجيهات مخصصة للذكاء الاصطناعي (أدخل اهتماماتك أو تفضيلاتك):' : 'Custom AI Instructions:'}</label>
                      <textarea
                        rows={3}
                        value={profileFormData.custom_instructions}
                        onChange={(e) => setProfileFormData({ ...profileFormData, custom_instructions: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
                        placeholder={isRtl ? 'مثال: تفضيل النشرات الإعلانية بمجال العقارات والسيارات بغزة...' : 'E.g., Prefer real estate ads...'}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t border-gray-100 dark:border-gray-800 pt-3">
                    <button
                      type="button"
                      onClick={() => setIsProfileEditModalOpen(false)}
                      className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-800 text-xs font-bold"
                    >
                      {isRtl ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingProfile}
                      className="px-4 py-2 rounded-xl bg-accent text-white text-xs font-bold flex items-center gap-1"
                    >
                      {isSubmittingProfile ? (isRtl ? 'جاري الحفظ...' : 'Saving...') : (isRtl ? 'حفظ التغييرات' : 'Save Changes')}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  {/* Verification Status */}
                  {user.kyc_status === 'verified' && (
                    <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center space-y-2">
                      <div className="flex justify-center">
                        <ShieldCheck size={40} className="text-blue-500" />
                      </div>
                      <h4 className="text-sm font-extrabold text-blue-500">{isRtl ? 'حسابك موثق بالشارة الزرقاء' : 'Account Verified'}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {isRtl ? 'لقد قمنا بالتحقق من هويتك بنجاح. تتمتع الآن بثقة كاملة في جميع صفقاتك ونشراتك.' : 'Your identity is fully verified.'}
                      </p>
                    </div>
                  )}

                  {user.kyc_status === 'pending' && (
                    <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-center space-y-2">
                      <div className="flex justify-center">
                        <div className="w-10 h-10 rounded-full border-4 border-yellow-500 border-t-transparent animate-spin" />
                      </div>
                      <h4 className="text-sm font-extrabold text-yellow-500">{isRtl ? 'طلب التوثيق قيد المراجعة' : 'Verification Pending'}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {isRtl ? 'طلبك الآن قيد التدقيق لدى الإدارة. سيتم إخطارك وتفعيل الشارة الزرقاء فوراً بعد التحقق.' : 'Your request is under review.'}
                      </p>
                    </div>
                  )}

                  {(user.kyc_status === 'none' || user.kyc_status === 'rejected' || !user.kyc_status) && (
                    <form onSubmit={handleKycSubmit} className="space-y-4">
                      {user.kyc_status === 'rejected' && (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-500">
                          {isRtl ? 'تم رفض طلب التوثيق السابق. يرجى تقديم الاسم الحقيقي ومستند واضح للتحقق.' : 'Previous verification request was rejected. Please submit valid documents.'}
                        </div>
                      )}

                      <div className="p-3.5 rounded-xl bg-accent/5 border border-accent/10 space-y-1">
                        <h4 className="text-xs font-extrabold text-accent">{isRtl ? 'احصل على الشارة الزرقاء في فيرال بوك 🛡️' : 'Get the Blue Verification Badge'}</h4>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed">
                          {isRtl ? 'توثيق الهوية يضمن للعملاء سلامة الصفقات ويمنح منشوراتك الأولوية التامة في محركات البحث والتوصيات بالمنصة.' : 'Verifying your identity builds trust and boosts search priority.'}
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-bold mb-1">{isRtl ? 'الاسم الكامل القانوني (مطابق للهوية):' : 'Legal Full Name:'}</label>
                          <input
                            type="text"
                            required
                            value={kycFullName}
                            onChange={(e) => setKycFullName(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
                            placeholder={isRtl ? 'مثال: محمد أحمد علي' : 'Legal Name'}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold mb-1">{isRtl ? 'رقم الهوية الوطنية / جواز السفر:' : 'ID / Passport Number:'}</label>
                          <input
                            type="text"
                            required
                            value={kycIDNumber}
                            onChange={(e) => setKycIDNumber(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
                            placeholder="E.g., 401234567"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold mb-1">{isRtl ? 'صورة الهوية أو مستند رسمي للتوثيق:' : 'Official Identity Document or Selfie with ID:'}</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              required
                              value={kycSelfieUrl}
                              onChange={(e) => setKycSelfieUrl(e.target.value)}
                              className="flex-1 px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
                              placeholder="https://..."
                            />
                            <label className="px-3 py-2 rounded-xl bg-accent text-white text-xs font-bold cursor-pointer flex items-center justify-center shrink-0">
                              <Upload size={14} />
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    try {
                                      toast.info(isRtl ? 'جاري رفع المستند...' : 'Uploading...');
                                      const url = await handleUploadFile(file);
                                      setKycSelfieUrl(url);
                                      toast.success(isRtl ? 'تم رفع صورة المستند بنجاح!' : 'Document uploaded!');
                                    } catch (err: any) {
                                      toast.error(err.message || 'Upload failed');
                                    }
                                  }
                                }}
                              />
                            </label>
                          </div>
                          {kycSelfieUrl && (
                            <div className="mt-2 h-20 w-32 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-100">
                              <img src={kycSelfieUrl} className="w-full h-full object-cover" alt="Selfie" referrerPolicy="no-referrer" />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 border-t border-gray-100 dark:border-gray-800 pt-3">
                        <button
                          type="button"
                          onClick={() => setIsProfileEditModalOpen(false)}
                          className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-800 text-xs font-bold"
                        >
                          {isRtl ? 'إلغاء' : 'Cancel'}
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmittingProfile}
                          className="px-4 py-2 rounded-xl bg-accent text-white text-xs font-bold"
                        >
                          {isSubmittingProfile ? (isRtl ? 'جاري الإرسال...' : 'Submitting...') : (isRtl ? 'تقديم طلب التوثيق' : 'Submit Verification Request')}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================== */}
      {/* MODAL 6: EDIT BUSINESS PAGE & MANAGERS                     */}
      {/* ========================================================== */}
      <AnimatePresence>
        {isEditPageModalOpen && editingPageData && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-xl rounded-2xl bg-white dark:bg-[#1a1a1c] border border-gray-200 dark:border-gray-800 p-6 shadow-2xl space-y-4 my-8 text-[var(--text-primary)]"
            >
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                <div className="flex items-center gap-2">
                  <Building2 size={20} className="text-accent" />
                  <h3 className="text-sm font-extrabold">{isRtl ? 'إدارة وتعديل الصفحة التجارية والمسؤولين' : 'Manage Merchant Page & Admins'}</h3>
                </div>
                <button onClick={() => { setIsEditPageModalOpen(false); setEditingPageData(null); }} className="text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSavePageEdit} className="space-y-4">
                <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-1">
                  
                  {/* Basic settings */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold mb-1">{isRtl ? 'اسم الشركة / المتجر:' : 'Page Name:'}</label>
                      <input
                        type="text"
                        required
                        value={editPageFormData.name}
                        onChange={(e) => setEditPageFormData({ ...editPageFormData, name: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1">{isRtl ? 'المدينة:' : 'City:'}</label>
                      <select
                        value={editPageFormData.city}
                        onChange={(e) => setEditPageFormData({ ...editPageFormData, city: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
                      >
                        {PALESTINE_CITIES.map((c, idx) => (
                          <option key={`edit-pal-city-${c}-${idx}`} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold mb-1">{isRtl ? 'الصنف / الفئة:' : 'Category:'}</label>
                      <input
                        type="text"
                        required
                        value={editPageFormData.category}
                        onChange={(e) => setEditPageFormData({ ...editPageFormData, category: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
                        placeholder="E.g., E-Commerce"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1">{isRtl ? 'العنوان الفعلي:' : 'Address:'}</label>
                      <input
                        type="text"
                        value={editPageFormData.address}
                        onChange={(e) => setEditPageFormData({ ...editPageFormData, address: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
                        placeholder="E.g., Remal Street"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1">{isRtl ? 'نبذة ووصف الشركة:' : 'Description:'}</label>
                    <textarea
                      rows={2}
                      required
                      value={editPageFormData.description}
                      onChange={(e) => setEditPageFormData({ ...editPageFormData, description: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
                    />
                  </div>

                  {/* Social media and contacts */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold mb-1">{isRtl ? 'رقم الواتساب:' : 'WhatsApp:'}</label>
                      <input
                        type="text"
                        value={editPageFormData.whatsapp_number}
                        onChange={(e) => setEditPageFormData({ ...editPageFormData, whatsapp_number: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
                        placeholder="970599..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1">{isRtl ? 'الهاتف للتواصل:' : 'Phone:'}</label>
                      <input
                        type="text"
                        value={editPageFormData.phone_number}
                        onChange={(e) => setEditPageFormData({ ...editPageFormData, phone_number: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1">{isRtl ? 'الموقع الإلكتروني:' : 'Website URL:'}</label>
                      <input
                        type="text"
                        value={editPageFormData.website_url}
                        onChange={(e) => setEditPageFormData({ ...editPageFormData, website_url: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
                        placeholder="https://..."
                      />
                    </div>
                  </div>

                  {/* Visual assets */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold mb-1">{isRtl ? 'رابط شعار الصفحة (Avatar):' : 'Avatar URL:'}</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          value={editPageFormData.avatar_url}
                          onChange={(e) => setEditPageFormData({ ...editPageFormData, avatar_url: e.target.value })}
                          className="flex-1 px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
                        />
                        <label className="px-3 py-2 rounded-xl bg-accent text-white text-xs font-bold cursor-pointer flex items-center justify-center shrink-0">
                          <Upload size={14} />
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  toast.info(isRtl ? 'جاري الرفع...' : 'Uploading...');
                                  const url = await handleUploadFile(file);
                                  setEditPageFormData({ ...editPageFormData, avatar_url: url });
                                  toast.success(isRtl ? 'تم رفع الشعار!' : 'Avatar uploaded!');
                                } catch (err: any) {
                                  toast.error(err.message || 'Upload failed');
                                }
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1">{isRtl ? 'رابط غلاف الصفحة (Cover):' : 'Cover URL:'}</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          value={editPageFormData.cover_url}
                          onChange={(e) => setEditPageFormData({ ...editPageFormData, cover_url: e.target.value })}
                          className="flex-1 px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
                        />
                        <label className="px-3 py-2 rounded-xl bg-accent text-white text-xs font-bold cursor-pointer flex items-center justify-center shrink-0">
                          <Upload size={14} />
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  toast.info(isRtl ? 'جاري الرفع...' : 'Uploading...');
                                  const url = await handleUploadFile(file);
                                  setEditPageFormData({ ...editPageFormData, cover_url: url });
                                  toast.success(isRtl ? 'تم رفع الغلاف!' : 'Cover uploaded!');
                                } catch (err: any) {
                                  toast.error(err.message || 'Upload failed');
                                }
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Page Managers management */}
                  <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-3">
                    <h4 className="text-xs font-extrabold flex items-center gap-1.5 text-accent">
                      <Users size={16} />
                      <span>{isRtl ? 'إدارة المسؤولين والأدوار' : 'Manage Page Admins/Managers'}</span>
                    </h4>

                    {/* If current user is owner, they can add/delete managers */}
                    {editingPageData.user_id === user.id || editingPageData.owner_id === user.id || user.role === 'admin' ? (
                      <div className="space-y-3">
                        <div className="flex gap-2 items-end">
                          <div className="flex-1">
                            <label className="block text-[10px] font-bold mb-0.5 text-gray-400">{isRtl ? 'البريد الإلكتروني للمسؤول الجديد:' : 'New Manager Email:'}</label>
                            <input
                              type="email"
                              value={newManagerEmail}
                              onChange={(e) => setNewManagerEmail(e.target.value)}
                              className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
                              placeholder="manager@example.com"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold mb-0.5 text-gray-400">{isRtl ? 'الصلاحية:' : 'Permission Role:'}</label>
                            <select
                              value={newManagerRole}
                              onChange={(e) => setNewManagerRole(e.target.value as 'full' | 'limited')}
                              className="px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
                            >
                              <option value="limited">{isRtl ? 'مدير محدود المهام' : 'Limited Admin'}</option>
                              <option value="full">{isRtl ? 'مدير كامل الصلاحيات' : 'Full Admin'}</option>
                            </select>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (!newManagerEmail.trim()) {
                                toast.error(isRtl ? 'يرجى إدخال البريد الإلكتروني للمسؤول' : 'Email is required');
                                return;
                              }
                              const emailClean = newManagerEmail.trim().toLowerCase();
                              if (editPageManagers.some(m => m.email === emailClean)) {
                                toast.error(isRtl ? 'هذا البريد الإلكتروني مضاف بالفعل كمسؤول' : 'Manager already exists');
                                return;
                              }
                              const newMgr = {
                                email: emailClean,
                                name: emailClean.split('@')[0],
                                role: newManagerRole
                              };
                              setEditPageManagers([...editPageManagers, newMgr]);
                              setNewManagerEmail('');
                              toast.success(isRtl ? 'تمت إضافة المسؤول للقايمة مؤقتاً! يرجى حفظ الصفحة لتأكيد الحفظ بالخادم.' : 'Manager added to list! Save page to persist.');
                            }}
                            className="px-3 py-2 bg-accent text-white text-xs font-bold rounded-xl h-9 flex items-center justify-center shrink-0 cursor-pointer"
                          >
                            <span>{isRtl ? 'إضافة' : 'Add'}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-950 text-center text-xs text-gray-400">
                        {isRtl ? 'صلاحية إضافة وإزالة المسؤولين مقتصرة على مالك الصفحة الأساسي.' : 'Only page owner can manage managers.'}
                      </div>
                    )}

                    {/* Managers list */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-gray-400">{isRtl ? 'قائمة المسؤولين الحاليين:' : 'Current Managers List:'}</p>
                      {editPageManagers.length === 0 ? (
                        <p className="text-[10px] text-gray-500 italic">{isRtl ? 'لا يوجد مسؤولين إضافيين لهذه الصفحة حالياً.' : 'No additional managers.'}</p>
                      ) : (
                        <div className="grid grid-cols-1 gap-1.5">
                          {editPageManagers.map((mgr, mIdx) => (
                            <div key={`edit-mgr-${mIdx}`} className="p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <span className="text-xs font-extrabold truncate block">{mgr.name || mgr.email}</span>
                                <span className="text-[10px] text-gray-400 truncate block">{mgr.email}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                  mgr.role === 'full' 
                                    ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' 
                                    : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                                }`}>
                                  {mgr.role === 'full' 
                                    ? (isRtl ? 'مدير كامل' : 'Full Admin') 
                                    : (isRtl ? 'مدير محدود' : 'Limited Admin')}
                                </span>
                                {(editingPageData.user_id === user.id || editingPageData.owner_id === user.id || user.role === 'admin') && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditPageManagers(editPageManagers.filter((_, idx) => idx !== mIdx));
                                      toast.info(isRtl ? 'تم حذف المسؤول من القائمة! يرجى حفظ الصفحة لتأكيد التغيير.' : 'Manager removed! Save page to persist.');
                                    }}
                                    className="p-1 rounded-md text-red-500 hover:bg-red-500/10 transition-theme"
                                    title={isRtl ? 'إزالة المسؤول' : 'Remove Manager'}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                <div className="flex items-center justify-end gap-2 border-t border-gray-100 dark:border-gray-800 pt-3">
                  <button
                    type="button"
                    onClick={() => { setIsEditPageModalOpen(false); setEditingPageData(null); }}
                    className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-800 text-xs font-bold"
                  >
                    {isRtl ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingPageEdit}
                    className="px-4 py-2 rounded-xl bg-accent text-white text-xs font-bold"
                  >
                    {isSubmittingPageEdit ? (isRtl ? 'جاري الحفظ...' : 'Saving...') : (isRtl ? 'حفظ التعديلات' : 'Save Changes')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default BulletinBoardPage;
