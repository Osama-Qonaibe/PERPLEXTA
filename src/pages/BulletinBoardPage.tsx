import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import {
  Megaphone, Plus, Search, Heart, MessageSquare, Share2, Bookmark, Gift,
  ExternalLink, Phone, PhoneCall, Video, Film, Upload, CheckCircle2, AlertCircle, Clock, Eye, Sparkles,
  Send, X, Wallet, Tag, MessageCircle, Building2, MapPin, Globe, Type,
  UserCheck, UserPlus, Inbox, ArrowRight, ArrowLeft, ShieldCheck, Camera,
  Image as ImageIcon, Filter, ChevronLeft, ChevronRight, Layers, Loader2, BarChart2, ArrowUp, ArrowDown, RefreshCw, Rocket,
  Radio, Clapperboard, Bell, Menu, SlidersHorizontal, Trash2, Ban, Volume2, VolumeX,
  Smile, Users, Compass, ChevronDown, Check, Navigation, Lock, Scissors, ShoppingBag, Edit2
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { BulletinAd, BulletinAdComment, BulletinPage, BulletinInquiry } from '../../server/db/types';
import { UserAdAnalyticsView } from '../components/UserAdAnalyticsView';
import { PostFeed } from '../components/PostFeed';
import { AdDirectChat } from '../components/AdDirectChat';
import { AdMessengerHub } from '../components/AdMessengerHub';
import { BoostPostModal } from '../components/BoostPostModal';
import { RecommendationWidget } from '../components/RecommendationWidget';
import { AdInsightsTab } from '../components/AdInsightsTab';
import { MediaFormatPlayer } from '../components/MediaFormatPlayer';
import { VideoTrimmerModal } from '../components/VideoTrimmerModal';
import { VideoPreviewer } from '../components/VideoPreviewer';
import { extractVideoThumbnail, getRecommendedDimensions, getMediaUrl, compressAndResizeImage } from '../utils/mediaUtils';

const DURATION_TIERS = [
  { days: 3, price: 3.00, labelAr: '3 أيام', labelEn: '3 Days', badgeAr: 'اقتصادي', badgeEn: 'Basic' },
  { days: 7, price: 5.00, labelAr: '7 أيام', labelEn: '7 Days', badgeAr: 'الأكثر شيوعاً', badgeEn: 'Popular' },
  { days: 15, price: 10.00, labelAr: '15 يوماً', labelEn: '15 Days', badgeAr: 'توفير 20%', badgeEn: 'Save 20%' },
  { days: 30, price: 18.00, labelAr: '30 يوماً', labelEn: '30 Days', badgeAr: 'أعلى قيمة (توفير 40%)', badgeEn: 'Best Value' },
];

const CATEGORIES = [
  { id: 'all', nameAr: 'جميع التصنيفات', nameEn: 'All Categories' },
  { id: 'تكنولوجيا / Tech', nameAr: 'تكنولوجيا وذكاء اصطناعي', nameEn: 'Tech & AI' },
  { id: 'خدمات / Services', nameAr: 'خدمات وأعمال برمجية', nameEn: 'Services & Freelance' },
  { id: 'تجارة إلكترونية / E-Commerce', nameAr: 'منتجات وتجارة إلكترونية', nameEn: 'E-Commerce' },
  { id: 'عقارات وسيارت / Real Estate', nameAr: 'عقارات وسيارات', nameEn: 'Real Estate & Vehicles' },
  { id: 'دورات وتدريب / Courses', nameAr: 'دورات واستشارات', nameEn: 'Courses & Coaching' },
  { id: 'وظائف / Jobs', nameAr: 'فرص عمل وتوظيف', nameEn: 'Jobs & Careers' },
  { id: 'أخرى / General', nameAr: 'عام ومتنوع', nameEn: 'General' },
];

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
  const { language, user, token, setIsAuthModalOpen, theme } = useAppContext();
  const isRtl = language === 'ar';

  const [activeTab, setActiveTab] = useState<'board' | 'pages' | 'inquiries' | 'my_ads' | 'analytics' | 'saved'>('board');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  const [messagingAdId, setMessagingAdId] = useState<number | null>(null);
  const [insightsAdId, setInsightsAdId] = useState<number | null>(null);

  const [ads, setAds] = useState<BulletinAd[]>([]);
  const [myAds, setMyAds] = useState<BulletinAd[]>([]);
  const [savedAds, setSavedAds] = useState<BulletinAd[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingSaved, setLoadingSaved] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>(() => {
    return localStorage.getItem('perplexta_user_country') || 'فلسطين';
  });
  const [selectedCity, setSelectedCity] = useState<string>(() => {
    return localStorage.getItem('perplexta_user_city') || 'all';
  });
  const [selectedRadius, setSelectedRadius] = useState<string>(() => {
    return localStorage.getItem('perplexta_user_radius') || '10';
  });
  const [isLocationFlyoutOpen, setIsLocationFlyoutOpen] = useState<boolean>(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState<string>('');
  const [autocompleteResults, setAutocompleteResults] = useState<LocationSearchResult[]>([]);
  const [isSearchingGeoLocation, setIsSearchingGeoLocation] = useState<boolean>(false);
  const [isDetectingGps, setIsDetectingGps] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'latest' | 'popular'>('latest');

  const [mousePos, setMousePos] = useState<{ x: number; y: number; isInside: boolean }>({ x: 0, y: 0, isInside: false });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; isOpen: boolean }>({ x: 0, y: 0, isOpen: false });

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
      localStorage.setItem('perplexta_user_country', result.country);
    }
    setSelectedCity(result.city);
    localStorage.setItem('perplexta_user_city', result.city);
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
    localStorage.setItem('perplexta_user_city', city);
    localStorage.setItem('perplexta_user_radius', radius);
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
  const [isMuted, setIsMuted] = useState<boolean>(false);
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
    whatsapp_number: '',
    phone_number: '',
    target_url: '',
    hashtags: '#فلسطين,#تنمية,#أعمال,#خدمات',
    page_id: '' as string | number,
    location_city: 'القدس الشريف',
    location_radius: '10',
    feeling: '',
    is_ai_generated: false,
    tagged_users: [] as string[],
    has_whatsapp_button: false,
    audience: 'public' as 'public' | 'friends' | 'only_me',
    ad_format: 'post' as 'post' | 'reel' | 'story',
    quick_questions: ['', '', ''] as string[]
  });

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

  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isAddToPostModalOpen, setIsAddToPostModalOpen] = useState<boolean>(false);

  const [boostingAd, setBoostingAd] = useState<BulletinAd | null>(null);
  const [isBoostModalOpen, setIsBoostModalOpen] = useState<boolean>(false);

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
    const adIdParam = urlParams.get('id') || urlParams.get('ad');
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
  }, [token, location, ads]);

  const [adPage, setAdPage] = useState<number>(1);
  const [hasMoreAds, setHasMoreAds] = useState<boolean>(true);
  const [loadingMoreAds, setLoadingMoreAds] = useState<boolean>(false);
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);


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
      const res = await fetch('/api/bulletin/my-ads', {
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
        fetch('/api/bulletin/inquiries', { headers: { Authorization: `Bearer ${token}` } }),
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
      const res = await fetch('/api/finance/wallet', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.wallet) {
        setWalletBalance(parseFloat(data.wallet.balance) || 0);
      }
    } catch (e) {}
  };

  useEffect(() => {
    sessionStorage.removeItem('perplexta_bulletin_scroll_y');
    fetchAds();
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

  const handleToggleLike = async (adId: number) => {
    if (!token) {
      toast.error(isRtl ? 'يرجى تسجيل الدخول للتفاعل مع الإعلان' : 'Please log in to like ads');
      return;
    }

    setAds(prev => prev.map(ad => {
      if (ad.id === adId) {
        const hasLiked = ad.user_has_liked;
        return {
          ...ad,
          user_has_liked: !hasLiked,
          likes_count: hasLiked ? Math.max(0, ad.likes_count - 1) : ad.likes_count + 1
        };
      }
      return ad;
    }));

    try {
      const res = await fetch(`/api/bulletin/ads/${adId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.success) fetchAds();
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

  const handleAddComment = async (adId: number, parentId?: number) => {
    if (!token) {
      toast.error(isRtl ? 'يرجى تسجيل الدخول للتعليق' : 'Please log in to comment');
      return;
    }
    if (!newCommentText.trim()) return;

    try {
      const res = await fetch(`/api/bulletin/ads/${adId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: newCommentText.trim(), parent_id: parentId })
      });
      const data = await res.json();
      if (data.success && data.comment) {
        setCommentsMap(prev => ({
          ...prev,
          [adId]: [...(prev[adId] || []), data.comment]
        }));
        setNewCommentText('');
        setReplyToCommentId(null);
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

  const handleToggleSave = async (ad: BulletinAd) => {
    if (!token) {
      toast.error(isRtl ? 'يرجى تسجيل الدخول أولاً' : 'Please log in first');
      return;
    }

    try {
      const res = await fetch(`/api/bulletin/ads/${ad.id}/save`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        const updateFn = (prev: BulletinAd[]) => prev.map(a => a.id === ad.id ? { ...a, user_has_saved: data.saved } : a);
        setAds(updateFn);
        setMyAds(updateFn);
        if (data.saved) {
          fetchSavedAds();
        } else {
          setSavedAds(prev => prev.filter(a => a.id !== ad.id));
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

    const reason = prompt(isRtl ? 'لماذا تبلغ عن هذا المنشور؟' : 'Why are you reporting this post?');
    if (!reason || !reason.trim()) return;

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
    setAdFormData({
      title: ad.title,
      description: ad.description,
      image_url: ad.image_url || '',
      video_url: ad.video_url || '',
      whatsapp_number: ad.whatsapp_number || '',
      phone_number: ad.phone_number || '',
      target_url: ad.target_url || '',
      hashtags: Array.isArray(ad.hashtags) ? ad.hashtags.join(',') : (ad.hashtags || '#فلسطين,#تنمية,#أعمال,#خدمات'),
      page_id: ad.page_id || '',
      location_city: ad.location_city || 'القدس الشريف',
      location_radius: '10',
      feeling: ad.feeling || '',
      is_ai_generated: ad.is_ai_generated || false,
      tagged_users: Array.isArray(ad.tagged_users) ? ad.tagged_users : [],
      has_whatsapp_button: !!ad.whatsapp_number,
      audience: (ad.audience as any) || 'public',
      ad_format: (ad.ad_format as any) || 'post',
      quick_questions: Array.isArray(ad.quick_questions) ? ad.quick_questions : ['', '', '']
    });
    setEditingAdId(ad.id);
    setIsEditMode(true);
    setIsAdModalOpen(true);
  };

  const handleDeleteAd = async (ad: BulletinAd) => {
    if (!token) return;
    const confirmDelete = window.confirm(isRtl ? 'هل أنت متأكد من حذف هذا المنشور نهائياً؟' : 'Are you sure you want to delete this post permanently?');
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

    setIsSubmittingAd(true);
    try {
      const url = isEditMode ? `/api/bulletin/ads/${editingAdId}` : '/api/bulletin/ads';
      const method = isEditMode ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(adFormData)
      });
      const data = await res.json();

      if (data.success) {
        toast.success(
          isEditMode
            ? (isRtl ? 'تم تحديث المنشور بنجاح!' : 'Post updated successfully!')
            : (isRtl
              ? 'تم نشر المنشور بنجاح! يمكنك الآن ترويجه في أي وقت لزيادة الوصول.'
              : 'Post published successfully! You can boost it anytime for higher reach.')
        );
        setIsAdModalOpen(false);
        setIsEditMode(false);
        setEditingAdId(null);
        setAdFormData({
          title: '',
          description: '',
          image_url: '',
          video_url: '',
          whatsapp_number: '',
          phone_number: '',
          target_url: '',
          hashtags: '#فلسطين,#تنمية,#أعمال,#خدمات',
          page_id: '',
          location_city: 'القدس الشريف',
          location_radius: '10',
          feeling: '',
          is_ai_generated: false,
          tagged_users: [],
          has_whatsapp_button: false,
          audience: 'public',
          ad_format: 'post',
          quick_questions: ['', '', '']
        });
        fetchMyAds();
        fetchAds();
        fetchWallet();
        if (selectedPageDetail) {
          handleOpenPageDetail(selectedPageDetail.page.id);
        }
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

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement> | { target: { files: FileList | File[] } }) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      toast.error(isRtl ? 'حجم الصورة كبير جداً (الحد الأقصى 25MB)' : 'Image file is too large (max 25MB)');
      return;
    }

    setIsAdModalOpen(true);
    const toastId = toast.loading(
      isRtl ? 'جاري تقليص وتحسين أبعاد الصورة للإعلان...' : 'Optimizing and resizing ad image...'
    );

    try {
      const compressed = await compressAndResizeImage(file, {
        format: (adFormData as any).format || 'sidebar',
        quality: 0.88,
        mimeType: 'image/webp'
      });

      const uploadFile = compressed.file;

      const formDataUpload = new FormData();
      formDataUpload.append('file', uploadFile);

      const authToken = token || localStorage.getItem('app_token') || '';
      const res = await fetch('/api/files/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`
        },
        body: formDataUpload
      });

      if (res.ok) {
        const data = await res.json();
        const rawUrl = data.fileUrl || data.file?.url || data.file?.file_url || data.url || data.path;
        const fileUrl = getMediaUrl(rawUrl);
        if (fileUrl) {
          setAdFormData(prev => ({ ...prev, image_url: fileUrl }));
          toast.dismiss(toastId);
          
          const origKb = (compressed.originalSize / 1024).toFixed(0);
          const compKb = (compressed.compressedSize / 1024).toFixed(0);

          if (compressed.compressedSize < compressed.originalSize) {
            toast.success(
              isRtl
                ? `تم تقليص ورفع الصورة بنجاح! (${compKb}KB بدلاً من ${origKb}KB)`
                : `Image optimized & uploaded! (${compKb}KB down from ${origKb}KB)`
            );
          } else {
            toast.success(isRtl ? 'تم رفع الصورة بنجاح!' : 'Image uploaded successfully!');
          }
          return;
        }
      }
      throw new Error('Upload endpoint failed');
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(isRtl ? 'فشل رفع الصورة إلى الخادم، يرجى المحاولة لاحقاً' : 'Image upload failed, please try again.');
    }
  };

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

    const authToken = token || localStorage.getItem('app_token') || '';
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
            setAdFormData(prev => ({
              ...prev,
              video_url: fileUrl,
              ad_format: (prev.ad_format as string) === 'banner' ? 'post' : (prev.ad_format || 'post')
            }));
            
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

  const handleShareAd = async (ad: BulletinAd) => {
    const shareUrl = `${window.location.origin}/bulletin?ad=${ad.id}`;
    const text = `${ad.title}\n${ad.description}\n${shareUrl}`;

    try {
      await fetch(`/api/bulletin/ads/${ad.id}/share`, { method: 'POST' });
    } catch (e) {}

    if (navigator.share) {
      try {
        await navigator.share({
          title: ad.title,
          text: ad.description,
          url: shareUrl
        });
        toast.success(isRtl ? 'تمت المشاركة بنجاح' : 'Shared successfully');
        return;
      } catch (e) {}
    }

    navigator.clipboard.writeText(text);
    toast.success(isRtl ? 'تم نسخ رابط ونص الترويج!' : 'Link copied to clipboard!');
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

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] transition-colors duration-300 pb-20">
      
      {/* MOBILE SOCIAL HEADER (Facebook Clean UI Style) */}
      <div className="block lg:hidden sticky top-0 z-30 bg-white/95 dark:bg-[var(--bg-base)]/95 backdrop-blur-md border-b border-[var(--border-main)] px-8 sm:px-4 md:px-6 py-2 transition-theme">
        {isMobileSearchOpen ? (
          /* Expandable Mobile Interactive Search Bar */
          <form onSubmit={(e) => { handleSearchSubmit(e); setIsMobileSearchOpen(false); }} className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isRtl ? 'ابحث عن منتج، صفحة، أو إعلان...' : 'Search ad, product, page...'}
                autoFocus
                className="w-full ps-9 pe-8 py-2 text-xs font-bold rounded-[10px] bg-gray-100 dark:bg-[var(--bg-secondary)] border border-[var(--border-main)] text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
              />
              <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery('')} className="absolute end-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={13} />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsMobileSearchOpen(false)}
              className="px-3 py-2 rounded-[10px] text-xs font-bold text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[var(--bg-secondary)]"
            >
              {isRtl ? 'إلغاء' : 'Cancel'}
            </button>
          </form>
        ) : (
          /* Standard Compact Facebook Style Header */
          <div className="flex items-center justify-between gap-2 h-10">
            {/* Brand Logo & Name */}
            <div 
              onClick={() => { setSelectedPageDetail(null); setActiveTab('board'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="flex items-center gap-2 shrink-0 cursor-pointer active:scale-95 transition-transform h-full"
            >
              <div className="w-10 h-10 rounded-[10px] bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-bold border border-emerald-500/20">
                <Megaphone size={16} />
              </div>
              <div className="flex flex-col justify-center">
                <h2 className="text-[13px] font-black tracking-tight flex items-center gap-1 leading-none text-gray-900 dark:text-gray-100">
                  <span>{isRtl ? 'بيربليكستا' : 'Perplexta'}</span>
                  <ShieldCheck size={12} className="text-emerald-500 shrink-0" />
                </h2>
                <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold pt-0.5">{isRtl ? 'سوشيال' : 'Social'}</p>
              </div>
            </div>

            {/* Left/End side: Search + Notifications Capsules Only */}
            <div className="flex items-center gap-2 h-full">
              {/* Search Toggle Button */}
              <button
                type="button"
                onClick={() => setIsMobileSearchOpen(true)}
                className="w-10 h-10 rounded-[10px] bg-transparent hover:bg-gray-100 dark:hover:bg-[var(--bg-secondary)] flex items-center justify-center text-gray-400 hover:text-emerald-500 active:scale-95 transition-theme border border-[var(--border-main)]"
                title={isRtl ? 'البحث بالمنصة' : 'Search Platform'}
              >
                <Search size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Top Banner / Hero Header Section - Hidden on Mobile and in Analytics/Pages full view */}
      {activeTab !== 'analytics' && activeTab !== 'pages' && !selectedPageDetail && (
        <div className="hidden lg:block relative border-b border-gray-200/80 dark:border-gray-800/80 bg-gradient-to-b from-emerald-500/10 via-transparent to-transparent py-8 px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-start max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold">
                <Sparkles size={14} className="animate-spin-slow" />
                <span>{isRtl ? 'منصة الترويج والشبكة التجارية المتكاملة في فلسطين' : 'Palestine Premier Merchant Network'}</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight">
                {isRtl ? 'منصة بيربليكستا التجارية' : 'Perplexta Commercial Platform'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                {isRtl
                  ? 'المنصة التجارية والشبكة المتكاملة للتسويق، عرض الإعلانات المربعة، إدارة الصفحات، وتحليل الحملات باحترافية عالية.'
                  : 'The ultimate commercial platform and professional network for digital advertising, merchant pages, and high-conversion campaigns.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Container - Facebook 3-Column Layout */}
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-20 lg:pb-8">
        
        {/* Header Search & Sort Toolbar - Hidden on Mobile (moved to sidebar) */}
        {!selectedPageDetail && (
          <div className="hidden lg:flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-gray-200/80 dark:border-gray-800/80">
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-extrabold text-gray-800 dark:text-gray-200">
                {activeTab === 'board' && (isRtl ? 'خلاصة الإعلانات والمنشورات العامة' : 'Global Feed & Advertisements')}
                {activeTab === 'pages' && (isRtl ? 'دليل الصفحات التجارية' : 'Merchant Pages Directory')}
                {activeTab === 'inquiries' && (isRtl ? 'الرسائل والاستفسارات' : 'Inquiries & Messages')}
                {activeTab === 'my_ads' && (isRtl ? 'حملاتي وإعلاناتي النشطة' : 'My Active Campaigns')}
                {activeTab === 'analytics' && (isRtl ? 'تحليلات نتائج الإعلانات' : 'Ad Performance Analytics')}
              </h2>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Desktop Location Selector Button (Facebook Marketplace Style) */}
              {activeTab === 'board' && (
                <button
                  type="button"
                  onClick={() => setIsLocationFlyoutOpen(!isLocationFlyoutOpen)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-extrabold text-xs border border-emerald-500/30 transition-theme shadow-sm active:scale-95 shrink-0"
                  title={isRtl ? 'تحديد نطاق تغطية الموقع' : 'Location radius filter'}
                >
                  <MapPin size={14} className="text-emerald-500 animate-pulse shrink-0" />
                  <span className="max-w-[150px] truncate">
                    {selectedCity === 'all' 
                      ? (isRtl ? '📍 كافة المحافظات' : '📍 All Regions') 
                      : `📍 ${selectedCity} (${selectedRadius === 'all' ? (isRtl ? 'الكل' : 'All') : `+${selectedRadius} ${isRtl ? 'كم' : 'km'}`})`}
                  </span>
                  <ChevronDown size={13} className={`transition-transform duration-200 shrink-0 ${isLocationFlyoutOpen ? 'rotate-180' : ''}`} />
                </button>
              )}

              <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:w-64">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isRtl ? 'ابحث عن منتج، صفحة، أو هاشتاق...' : 'Search product, page, hashtag...'}
                  className="w-full ps-9 pe-3 py-2 text-xs rounded-xl bg-white dark:bg-[#1a1a1c] border border-gray-200 dark:border-gray-800 focus:border-emerald-500 focus:outline-none transition-theme"
                />
                <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </form>

              {activeTab === 'board' && (
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'latest' | 'popular')}
                  className="px-2.5 py-2 text-xs rounded-xl bg-white dark:bg-[#1a1a1c] border border-gray-200 dark:border-gray-800 focus:border-emerald-500 focus:outline-none transition-theme shrink-0"
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
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-bold">
                      <SlidersHorizontal size={16} />
                    </div>
                    <h3 className="text-xs font-extrabold">{isRtl ? 'قائمة الإعلانات والتحكم' : 'Ads Menu & Controls'}</h3>
                  </div>
                  <button
                    onClick={() => setIsMobileSidebarOpen(false)}
                    className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <X size={18} />
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
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-100 dark:border-emerald-500/20'
                          : 'bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900/60'
                      }`}
                    >
                      <Megaphone size={16} className={`transition-theme ${activeTab === 'board' && !selectedPageDetail ? 'text-emerald-500 scale-110 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'text-gray-400 group-hover:text-emerald-400'}`} />
                      <span>{isRtl ? 'الرئيسية والإعلانات العامة' : 'Global Feed'}</span>
                    </button>

                    {/* Added Marketplace and Blog links directly in Bulletin Board sidebar per user request */}
                    <button
                      onClick={() => { navigate('/marketplace'); setIsMobileSidebarOpen(false); }}
                      className="group w-full px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-theme bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900/60"
                    >
                      <ShoppingBag size={16} className="text-gray-400 group-hover:text-emerald-400" />
                      <span>{isRtl ? 'السوق (Marketplace)' : 'Marketplace'}</span>
                    </button>

                    <button
                      onClick={() => { navigate('/blog'); setIsMobileSidebarOpen(false); }}
                      className="group w-full px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-theme bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900/60"
                    >
                      <Edit2 size={16} className="text-gray-400 group-hover:text-emerald-400" />
                      <span>{isRtl ? 'المقالات والمدونة' : 'Insights & Blog'}</span>
                    </button>

                    <button
                      onClick={() => { setSelectedPageDetail(null); setActiveTab('pages'); setIsMobileSidebarOpen(false); }}
                      className={`group w-full px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-theme ${
                        activeTab === 'pages' && !selectedPageDetail
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-100 dark:border-emerald-500/20'
                          : 'bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900/60'
                      }`}
                    >
                      <Building2 size={16} className={`transition-theme ${activeTab === 'pages' && !selectedPageDetail ? 'text-emerald-500 scale-110 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'text-gray-400 group-hover:text-emerald-400'}`} />
                      <span>{isRtl ? 'الصفحات التجارية' : 'Merchant Pages'}</span>
                    </button>

                    {user && (
                      <button
                        onClick={() => { setSelectedPageDetail(null); setActiveTab('inquiries'); setIsMobileSidebarOpen(false); }}
                        className={`group w-full px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-theme ${
                          activeTab === 'inquiries' && !selectedPageDetail
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-100 dark:border-emerald-500/20'
                            : 'bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900/60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Inbox size={16} className={`transition-theme ${activeTab === 'inquiries' && !selectedPageDetail ? 'text-emerald-500 scale-110 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'text-gray-400 group-hover:text-emerald-400'}`} />
                          <span>{isRtl ? 'الرسائل والاستفسارات' : 'Inquiries & Messages'}</span>
                        </div>
                        {inquiriesList.length > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-black">
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
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-100 dark:border-emerald-500/20'
                            : 'bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900/60'
                        }`}
                      >
                        <Tag size={16} className={`transition-theme ${activeTab === 'my_ads' && !selectedPageDetail ? 'text-emerald-500 scale-110 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'text-gray-400 group-hover:text-emerald-400'}`} />
                        <span>{isRtl ? 'إعلاناتي وإدارتها' : 'My Advertisements'}</span>
                      </button>
                    )}

                    <button
                      onClick={() => { setSelectedPageDetail(null); setActiveTab('analytics'); setIsMobileSidebarOpen(false); }}
                      className={`group w-full px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-theme ${
                        activeTab === 'analytics' && !selectedPageDetail
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-100 dark:border-emerald-500/20'
                          : 'bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900/60'
                      }`}
                    >
                      <BarChart2 size={16} className={`transition-theme ${activeTab === 'analytics' && !selectedPageDetail ? 'text-emerald-500 scale-110 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'text-gray-400 group-hover:text-emerald-400'}`} />
                      <span>{isRtl ? 'تحليلات الأداء' : 'Performance Analytics'}</span>
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
                      <Building2 size={14} className="text-emerald-500" />
                      <span>{isRtl ? 'إنشاء صفحة' : 'Create Page'}</span>
                    </button>
                    <button
                      onClick={() => {
                        if (!token) { setIsAuthModalOpen(true); return; }
                        setIsAdModalOpen(true);
                        setIsMobileSidebarOpen(false);
                      }}
                      className="p-2.5 rounded-xl bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20"
                    >
                      <Plus size={14} />
                      <span>{isRtl ? 'نشر إعلان' : 'Publish Ad'}</span>
                    </button>
                  </div>

                  {/* Search & Sort */}
                  <div className="space-y-2 pt-1">
                    <h4 className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">{isRtl ? 'البحث والفلترة' : 'Search & Sort'}</h4>
                    <form onSubmit={handleSearchSubmit} className="relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={isRtl ? 'ابحث عن منتج، صفحة...' : 'Search product...'}
                        className="w-full ps-9 pe-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 focus:border-emerald-500 focus:outline-none"
                      />
                      <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </form>

                    {activeTab === 'board' && (
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as 'latest' | 'popular')}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 focus:border-emerald-500 focus:outline-none"
                      >
                        <option value="latest">{isRtl ? 'ترتيب حسب: الأحدث' : 'Sort: Latest'}</option>
                        <option value="popular">{isRtl ? 'ترتيب حسب: الأكثر تفاعلاً' : 'Sort: Popular'}</option>
                      </select>
                    )}
                  </div>

                  {/* Mobile Drawer Recommendations Card */}
                  <RecommendationWidget 
                    variant="bulletin"
                    filterType="bulletin" 
                    limit={3} 
                    title={isRtl ? 'إعلانات وتفضيلات مخصصة' : 'Recommended Ads'}
                    subtitle={isRtl ? 'مقترحات إعلانية وفقاً لاهتماماتك' : 'Tailored ad recommendations'}
                    className="p-3 mt-5 rounded-2xl bg-white dark:bg-[#1a1a1c] border border-gray-200 dark:border-gray-800 shadow-sm"
                  />
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Layout Grid: Main Content + Sidebar OR Standalone Views */}
        {activeTab === 'analytics' && !selectedPageDetail ? (
          /* VIEW 1: DEDICATED FULL ANALYTICS VIEW */
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-[#1a1a1c] border border-gray-200 dark:border-gray-800 shadow-sm">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveTab('board')}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-2 shadow transition-theme active:scale-95"
                >
                  {isRtl ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
                  <span>{isRtl ? 'رجوع إلى خلاصة الإعلانات' : 'Back to Feed'}</span>
                </button>
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold flex items-center gap-2">
                    <BarChart2 size={18} className="text-emerald-500" />
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
        ) : activeTab === 'pages' && !selectedPageDetail ? (
          /* VIEW 2: DEDICATED ALL PAGES DIRECTORY VERTICAL FEED STREAM */
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header Bar with Back Button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-[#1a1a1c] border border-gray-200 dark:border-gray-800 shadow-sm">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={() => setActiveTab('board')}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-2 shadow transition-theme active:scale-95 shrink-0"
                >
                  {isRtl ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
                  <span>{isRtl ? 'رجوع إلى خلاصة الإعلانات' : 'Back to Feed'}</span>
                </button>
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold flex items-center gap-2">
                    <Building2 size={18} className="text-emerald-500" />
                    <span>{isRtl ? 'دليل كافة الصفحات التجارية الموثوقة' : 'All Verified Merchant Pages'}</span>
                  </h2>
                  <p className="text-[11px] text-gray-400">
                    {isRtl ? 'موجز متصل لكافة الصفحات التجارية في فلسطين مع إمكانية التمرير والاستكشاف' : 'Continuous vertical feed of all verified merchant pages'}
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
                className="px-4 py-2 rounded-xl bg-gray-900 dark:bg-gray-100 dark:text-gray-900 text-white font-bold text-xs shadow flex items-center gap-1.5 shrink-0"
              >
                <Plus size={15} />
                <span>{isRtl ? 'أنشئ صفحتك التجارية' : 'Create Merchant Page'}</span>
              </button>
            </div>

            {/* Pages Vertical Feed */}
            {pagesLoading ? (
              <div className="space-y-6">
                {[1, 2, 3].map(n => (
                  <div key={n} className="rounded-3xl bg-white dark:bg-[#1a1a1c] h-72 border border-gray-200 dark:border-gray-800 animate-pulse"></div>
                ))}
              </div>
            ) : pagesList.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-[#1a1a1c] rounded-3xl border border-gray-200 dark:border-gray-800 space-y-4">
                <Building2 size={40} className="text-emerald-500 mx-auto" />
                <h3 className="text-base font-bold">{isRtl ? 'لا توجد صفحات تجارية مطابقة' : 'No Merchant Pages Found'}</h3>
                <button
                  onClick={() => setIsPageModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-white font-bold text-xs"
                >
                  {isRtl ? 'أنشئ أول صفحة تجارية لك' : 'Create Merchant Page'}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {pagesList.map(page => (
                  <motion.div
                    key={page.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-3xl bg-white dark:bg-[#1a1a1c] border border-gray-200/80 dark:border-gray-800/80 overflow-hidden shadow-sm hover:shadow-md transition-theme space-y-4"
                  >
                    {/* Cover Banner */}
                    <div className="h-44 sm:h-56 w-full bg-gray-200 dark:bg-gray-800 relative cursor-pointer" onClick={() => handleOpenPageDetail(page.id)}>
                      <img src={getMediaUrl(page.cover_url)} alt={page.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                      <span className="absolute top-3 start-3 px-3 py-1 rounded-full bg-black/60 text-white text-[11px] font-bold backdrop-blur-md">
                        {page.category}
                      </span>
                    </div>

                    {/* Avatar & Header Info */}
                    <div className="px-6 -mt-12 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                        <div className="flex items-end gap-3 cursor-pointer" onClick={() => handleOpenPageDetail(page.id)}>
                          <img
                            src={getMediaUrl(page.avatar_url)}
                            alt={page.name}
                            className="w-20 h-20 sm:w-22 sm:h-22 rounded-full border-4 border-white dark:border-[#1a1a1c] object-cover shadow-lg shrink-0"
                          />
                          <div className="mb-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h3 className="text-base sm:text-lg font-extrabold truncate hover:text-emerald-500 transition-colors">{page.name}</h3>
                              <CheckCircle2 size={16} className="text-blue-500 shrink-0" />
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                              <span className="flex items-center gap-1"><MapPin size={12} className="text-emerald-500" /> {page.city}</span>
                              <span>•</span>
                              <span>{page.followers_count} {isRtl ? 'متابع' : 'Followers'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleToggleFollowPage(page.id)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-theme flex items-center gap-1.5 shadow ${
                              page.user_is_following
                                ? 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                                : 'bg-emerald-500 text-white hover:bg-emerald-600'
                            }`}
                          >
                            {page.user_is_following ? <UserCheck size={15} /> : <UserPlus size={15} />}
                            <span>{page.user_is_following ? (isRtl ? 'تتابعها' : 'Following') : (isRtl ? '+ متابعة' : '+ Follow')}</span>
                          </button>

                          <button
                            onClick={() => handleOpenPageDetail(page.id)}
                            className="px-4 py-2 rounded-xl bg-gray-900 dark:bg-gray-100 dark:text-gray-900 text-white font-bold text-xs flex items-center gap-1.5 shadow"
                          >
                            <Globe size={14} />
                            <span>{isRtl ? 'زيارة الصفحة والإعلانات' : 'Visit Page'}</span>
                          </button>

                          {page.whatsapp_number && (
                            <a
                              href={`https://wa.me/${page.whatsapp_number.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-1 hover:bg-emerald-700 transition-theme shadow"
                              title={isRtl ? 'تواصل واتساب' : 'WhatsApp'}
                            >
                              <Phone size={15} />
                            </a>
                          )}
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed pt-1">
                        {page.description}
                      </p>
                    </div>

                    <div className="px-6 pb-4 pt-2 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between text-xs text-gray-400">
                      <span className="flex items-center gap-1.5">
                        <Tag size={13} className="text-emerald-500" />
                        <span>{page.ads_count || 0} {isRtl ? 'إعلان ومنشور نشط' : 'active ads'}</span>
                      </span>

                      <button
                        onClick={() => handleOpenPageDetail(page.id)}
                        className="text-emerald-500 font-bold hover:underline flex items-center gap-1 text-xs"
                      >
                        <span>{isRtl ? 'استعراض المنشورات والمنتجات' : 'Browse Posts'}</span>
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
            <div className="p-4 rounded-2xl bg-white dark:bg-[#1a1a1c] border border-gray-200 dark:border-gray-800 shadow-sm space-y-3">
              {user ? (
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800 gap-2">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative shrink-0">
                      <img
                        src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                        alt={user.name}
                        className="w-11 h-11 rounded-full object-cover border-2 border-emerald-500/40"
                      />
                      <span className="absolute bottom-0 end-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#1a1a1c]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <h3 className="text-xs font-extrabold truncate">{user.name}</h3>
                        <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
                      </div>
                      <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => { setSelectedPageDetail(null); setActiveTab('inquiries'); }}
                    className="relative p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 transition-theme shrink-0 group shadow-2xs cursor-pointer"
                    title={isRtl ? 'صندوق محادثات المسنجر' : 'Messenger Chats'}
                  >
                    <MessageSquare size={18} className="group-hover:scale-110 transition-transform" />
                    {inquiriesList.length > 0 && (
                      <span className="absolute -top-1 -end-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-extrabold flex items-center justify-center ring-2 ring-white dark:ring-[#1a1a1c]">
                        {inquiriesList.length}
                      </span>
                    )}
                  </button>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-2">
                  <p className="text-xs font-bold text-emerald-500">
                    {isRtl ? 'سجل الدخول لنشر وتفاعل كامل مع الإعلانات!' : 'Sign in to publish and interact!'}
                  </p>
                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className="w-full py-2 rounded-xl bg-emerald-500 text-white font-bold text-xs shadow"
                  >
                    {isRtl ? 'تسجيل الدخول / حساب جديد' : 'Sign In'}
                  </button>
                </div>
              )}

              {/* Navigation Quick Links */}
              <div className="space-y-1">
                <button
                  onClick={() => { setSelectedPageDetail(null); setActiveTab('board'); }}
                  className={`w-full p-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-theme ${
                    activeTab === 'board' && !selectedPageDetail
                      ? 'bg-emerald-500/10 text-emerald-500'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Megaphone size={16} className="text-emerald-500" />
                    <span>{isRtl ? 'خلاصة الإعلانات والمنشورات' : 'Global Feed'}</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
                    {ads.length}
                  </span>
                </button>

                {/* Added Marketplace and Blog links directly in Bulletin Board sidebar per user request */}
                <button
                  onClick={() => navigate('/marketplace')}
                  className="w-full p-2.5 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-600 dark:text-gray-300 transition-theme"
                >
                  <ShoppingBag size={16} className="text-emerald-500" />
                  <span>{isRtl ? 'السوق والتسوق' : 'Marketplace'}</span>
                </button>

                <button
                  onClick={() => navigate('/blog')}
                  className="w-full p-2.5 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-600 dark:text-gray-300 transition-theme"
                >
                  <Edit2 size={16} className="text-emerald-500" />
                  <span>{isRtl ? 'المقالات والرؤى' : 'Insights & Blog'}</span>
                </button>

                <button
                  onClick={() => { setSelectedPageDetail(null); setActiveTab('pages'); }}
                  className={`w-full p-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-theme ${
                    activeTab === 'pages' && !selectedPageDetail
                      ? 'bg-emerald-500/10 text-emerald-500'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-600 dark:text-gray-300'
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
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-600 dark:text-gray-300'
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
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Bookmark size={16} className="text-emerald-500" />
                      <span>{isRtl ? 'المنشورات المحفوظة' : 'Saved Posts'}</span>
                    </span>
                    {savedAds.length > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
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
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Tag size={16} className="text-emerald-600" />
                      <span>{isRtl ? 'حملاتي وإعلاناتي' : 'My Campaigns'}</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
                      {myAds.length}
                    </span>
                  </button>
                )}

                {user && (
                  <button
                    onClick={() => { setSelectedPageDetail(null); setActiveTab('analytics'); }}
                    className={`w-full p-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-theme ${
                      activeTab === 'analytics' && !selectedPageDetail
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-600 dark:text-gray-300'
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
              title={isRtl ? 'إعلانات وتفضيلات مخصصة' : 'Recommended Ads'}
              subtitle={isRtl ? 'مقترحات مخصصة بناءً على سلوكك واهتماماتك' : 'Tailored ad suggestions'}
              className="p-4 mt-6 rounded-2xl bg-white dark:bg-[#1a1a1c] border border-gray-200 dark:border-gray-800 shadow-sm"
            />

            {/* Commercial Profile Settings Box */}
            {user && (
              <div className="p-4 rounded-2xl bg-white dark:bg-[#1a1a1c] border border-gray-200 dark:border-gray-800 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800/80">
                  <h3 className="text-xs font-extrabold flex items-center gap-1.5">
                    <Building2 size={16} className="text-emerald-500" />
                    <span>{isRtl ? 'الملف التجاري (إعدادات التاجر)' : 'Commercial Profile (Seller Settings)'}</span>
                  </h3>
                  <button
                    onClick={() => setIsPageModalOpen(true)}
                    className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-theme text-[11px] font-bold flex items-center gap-1"
                    title={isRtl ? 'إضافة ملف تجاري جديد' : 'Add New Commercial Profile'}
                  >
                    <Plus size={13} />
                    <span>{isRtl ? 'إضافة' : 'Add'}</span>
                  </button>
                </div>

                {myPagesList.length === 0 ? (
                  <div className="text-center py-4 text-xs text-gray-400 space-y-2">
                    <p>{isRtl ? 'لم تقم بإعداد ملفك التجاري بعد. افصل هويتك الشخصية عن الإعلانات.' : 'No commercial profile setup yet. Separate your personal identity from your ads.'}</p>
                    <button
                      onClick={() => setIsPageModalOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500 text-white font-bold text-[11px] shadow-sm hover:bg-emerald-600 transition-theme"
                    >
                      {isRtl ? 'إعداد الملف التجاري الآن' : 'Setup Commercial Profile'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {myPagesList.map(page => (
                      <div
                        key={page.id}
                        onClick={() => handleOpenPageDetail(page.id)}
                        className={`p-2.5 rounded-xl border transition-theme cursor-pointer flex items-center justify-between gap-2.5 hover:border-emerald-500/50 ${
                          selectedPageDetail?.page.id === page.id
                            ? 'bg-emerald-500/10 border-emerald-500'
                            : 'bg-gray-50/50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={getMediaUrl(page.avatar_url)}
                            alt={page.name}
                            className="w-9 h-9 rounded-full object-cover border border-gray-200 dark:border-gray-700 shrink-0"
                          />
                          <div className="min-w-0">
                            <h4 className="text-xs font-extrabold truncate">{page.name}</h4>
                            <p className="text-[10px] text-gray-400 truncate">{page.city} • {page.followers_count} {isRtl ? 'متابع' : 'followers'}</p>
                          </div>
                        </div>

                        <span className="text-[10px] font-bold text-emerald-500 px-2 py-1 rounded-lg bg-emerald-500/10 shrink-0">
                          {isRtl ? 'إدارة' : 'Manage'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Featured Recommended Pages Sidebar */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#1a1a1c] border border-gray-200 dark:border-gray-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800/80">
                <h3 className="text-xs font-extrabold flex items-center gap-1.5">
                  <UserPlus size={16} className="text-emerald-500" />
                  <span>{isRtl ? 'أبرز الصفحات الموصى بها' : 'Featured Pages'}</span>
                </h3>
                <button
                  onClick={() => setActiveTab('pages')}
                  className="text-[11px] font-bold text-emerald-500 hover:underline"
                >
                  {isRtl ? 'عرض الكل' : 'See All'}
                </button>
              </div>

              {pagesLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(n => (
                    <div key={n} className="h-12 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse"></div>
                  ))}
                </div>
              ) : pagesList.slice(0, 5).length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-2">{isRtl ? 'لا توجد صفحات حالياً' : 'No pages'}</p>
              ) : (
                <div className="space-y-2.5">
                  {pagesList.slice(0, 5).map(page => (
                    <div
                      key={page.id}
                      className="p-2.5 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2 hover:border-emerald-500/40 transition-theme"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={page.avatar_url}
                          alt={page.name}
                          className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-700 shrink-0"
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
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] shrink-0 transition-theme shadow-sm"
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
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors text-start"
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
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors text-start"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {isRtl ? 'تحديث المحتوى' : 'Refresh Feed'}
                  </button>
                  <div className="my-1 border-t border-gray-500/10" />
                  <button
                    onClick={() => {
                      localStorage.clear();
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
            {mousePos.isInside && (
              <div 
                className="absolute pointer-events-none z-30 transition-theme ease-out rounded-full bg-emerald-500/20 blur-[2px]"
                style={{
                  left: `${mousePos.x}px`,
                  top: `${mousePos.y}px`,
                  width: '28px',
                  height: '28px',
                  transform: 'translate(-50%, -50%)',
                  boxShadow: '0 0 16px rgba(16,185,129,0.4)',
                }}
              >
                <div className="absolute inset-1 rounded-full bg-emerald-500/40 animate-ping opacity-75" />
                <div className="absolute inset-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
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
                  className={`absolute -top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3.5 py-1.5 rounded-full border shadow-xl backdrop-blur-md transition-theme pointer-events-none ${
                    isRefreshing || pullDistance >= 55
                      ? 'bg-emerald-500/10 dark:bg-emerald-950/40 border-emerald-500/40 text-emerald-500 shadow-emerald-500/10'
                      : 'bg-white/90 dark:bg-[#1a1a1c]/90 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {isRefreshing ? (
                    <RefreshCw size={15} className="animate-spin text-emerald-500 shrink-0" />
                  ) : pullDistance >= 55 ? (
                    <ArrowUp size={15} className="text-emerald-500 shrink-0 transition-transform duration-200" />
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
                className="rounded-3xl bg-white dark:bg-[#1a1a1c] border border-gray-200 dark:border-gray-800 shadow-md overflow-hidden space-y-4"
              >
                {/* Back Button Bar */}
                <div className="p-3 bg-gray-50 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                  <button
                    onClick={handleBackToBoard}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 hover:bg-emerald-600 transition-theme shadow"
                  >
                    {isRtl ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
                    <span>{isRtl ? 'العودة إلى لوحة الإعلانات والمنشورات' : 'Back to Main Ad Feed'}</span>
                  </button>

                  <span className="text-xs font-bold text-gray-400">
                    {isRtl ? 'عرض كامل للصفحة التجارية' : 'Merchant Page View'}
                  </span>
                </div>

                {/* Facebook Cover Image */}
                <div className="h-48 sm:h-56 w-full bg-gray-200 dark:bg-gray-800 relative">
                  <img
                    src={getMediaUrl(selectedPageDetail.page.cover_url)}
                    alt={selectedPageDetail.page.name}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-3 start-3 px-3 py-1 rounded-full bg-black/60 text-white text-xs font-bold backdrop-blur-md">
                    {selectedPageDetail.page.category}
                  </span>
                </div>

                {/* Page Profile Header */}
                <div className="px-6 -mt-14 pb-4 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <img
                      src={getMediaUrl(selectedPageDetail.page.avatar_url)}
                      alt={selectedPageDetail.page.name}
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white dark:border-[#1a1a1c] object-cover shadow-xl shrink-0"
                    />

                    {/* Action Bar */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleToggleFollowPage(selectedPageDetail.page.id)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-theme flex items-center gap-1.5 shadow ${
                          selectedPageDetail.page.user_is_following
                            ? 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                            : 'bg-emerald-500 text-white hover:bg-emerald-600'
                        }`}
                      >
                        {selectedPageDetail.page.user_is_following ? <UserCheck size={16} /> : <UserPlus size={16} />}
                        <span>{selectedPageDetail.page.user_is_following ? (isRtl ? 'تتابعها' : 'Following') : (isRtl ? '+ متابعة الصفحة' : '+ Follow Page')}</span>
                      </button>

                      {selectedPageDetail.page.whatsapp_number && (
                        <a
                          href={`https://wa.me/${selectedPageDetail.page.whatsapp_number.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 hover:bg-emerald-700 transition-theme shadow"
                        >
                          <Phone size={15} />
                          <span>واتساب</span>
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

                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800">
                      <span className="flex items-center gap-1"><MapPin size={14} className="text-emerald-500" /> {selectedPageDetail.page.city}</span>
                      <span>•</span>
                      <span>{selectedPageDetail.page.followers_count} {isRtl ? 'متابع' : 'Followers'}</span>
                      <span>•</span>
                      <span>{selectedPageDetail.ads.length} {isRtl ? 'إعلان منشور' : 'Ads published'}</span>
                    </div>
                  </div>

                  {/* Sub-tabs for Page Detail */}
                  <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pt-3">
                    <button
                      onClick={() => setPageDetailTab('ads')}
                      className={`px-4 py-2 text-xs font-bold border-b-2 transition-theme ${
                        pageDetailTab === 'ads'
                          ? 'border-emerald-500 text-emerald-500'
                          : 'border-transparent text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      {isRtl ? 'إعلانات ومنشورات الصفحة' : 'Page Posts & Ads'}
                    </button>
                    <button
                      onClick={() => setPageDetailTab('about')}
                      className={`px-4 py-2 text-xs font-bold border-b-2 transition-theme ${
                        pageDetailTab === 'about'
                          ? 'border-emerald-500 text-emerald-500'
                          : 'border-transparent text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      {isRtl ? 'معلومات الشركة والتواصل' : 'About & Contact'}
                    </button>
                    <button
                      onClick={() => setPageDetailTab('media')}
                      className={`px-4 py-2 text-xs font-bold border-b-2 transition-theme ${
                        pageDetailTab === 'media'
                          ? 'border-emerald-500 text-emerald-500'
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
                        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-500">
                            {isRtl ? 'أنت مالك هذه الصفحة التجارية! يمكنك إضافة منشور إعلاني جديد باسمها.' : 'You own this page! Add a new ad post.'}
                          </span>
                          <button
                            onClick={() => {
                              setAdFormData(prev => ({ ...prev, page_id: selectedPageDetail.page.id }));
                              setIsAdModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500 text-white font-bold text-xs"
                          >
                            + {isRtl ? 'نشر إعلان باسم الصفحة' : 'Post as Page'}
                          </button>
                        </div>
                      )}

                      {selectedPageDetail.ads.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 dark:bg-gray-900/40 rounded-2xl space-y-2">
                          <Megaphone size={32} className="text-gray-300 mx-auto" />
                          <p className="text-xs text-gray-400 italic">
                            {isRtl ? 'لا توجد إعلانات نشطة لهذه الصفحة حالياً' : 'No active ads for this page yet.'}
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-4 max-w-2xl mx-auto w-full">
                          {selectedPageDetail.ads.map(ad => (
                            <div key={ad.id} className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-2.5">
                              <div className="relative aspect-square rounded-xl overflow-hidden cursor-pointer" onClick={() => setLightboxImage(getMediaUrl(ad.image_url))}>
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
                              
                              <div className="flex items-center justify-between pt-1 gap-1.5">
                                <button
                                  onClick={() => handleMessageAdvertiser(ad)}
                                  disabled={messagingAdId === ad.id}
                                  className="flex-1 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center gap-1 transition-theme shadow-sm shadow-emerald-500/20 disabled:opacity-50"
                                  title={isRtl ? 'مراسلة المعلن في محادثة خاصة' : 'Message Advertiser'}
                                >
                                  {messagingAdId === ad.id ? (
                                    <Loader2 size={13} className="animate-spin" />
                                  ) : (
                                    <MessageCircle size={13} />
                                  )}
                                  <span>{isRtl ? 'مراسلة المعلن' : 'Message Advertiser'}</span>
                                </button>

                                {ad.whatsapp_number && (
                                  <button
                                    onClick={(e) => handleWhatsAppClick(ad, e)}
                                    className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center gap-1 hover:bg-emerald-700 transition-theme"
                                  >
                                    <Phone size={13} />
                                    <span>واتساب</span>
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
                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 space-y-3 text-xs">
                      <h4 className="font-extrabold text-sm border-b border-gray-200 dark:border-gray-800 pb-2">
                        {isRtl ? 'تفاصيل الصفحة التجارية:' : 'Business Details:'}
                      </h4>
                      <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{selectedPageDetail.page.description}</p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <div className="p-3 rounded-xl bg-white dark:bg-[#1a1a1c] border border-gray-100 dark:border-gray-800">
                          <span className="text-gray-400 text-[10px] block">{isRtl ? 'المحافظة / المدينة:' : 'City:'}</span>
                          <strong className="font-bold text-xs">{selectedPageDetail.page.city}</strong>
                        </div>

                        {selectedPageDetail.page.address && (
                          <div className="p-3 rounded-xl bg-white dark:bg-[#1a1a1c] border border-gray-100 dark:border-gray-800">
                            <span className="text-gray-400 text-[10px] block">{isRtl ? 'العنوان التفصيلي:' : 'Address:'}</span>
                            <strong className="font-bold text-xs">{selectedPageDetail.page.address}</strong>
                          </div>
                        )}

                        {selectedPageDetail.page.whatsapp_number && (
                          <div className="p-3 rounded-xl bg-white dark:bg-[#1a1a1c] border border-gray-100 dark:border-gray-800">
                            <span className="text-gray-400 text-[10px] block">{isRtl ? 'الواتساب الرسمي:' : 'WhatsApp:'}</span>
                            <strong className="font-bold text-xs text-emerald-500">{selectedPageDetail.page.whatsapp_number}</strong>
                          </div>
                        )}

                        {selectedPageDetail.page.website_url && (
                          <div className="p-3 rounded-xl bg-white dark:bg-[#1a1a1c] border border-gray-100 dark:border-gray-800">
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
                        {selectedPageDetail.ads.map(ad => (
                          <div
                            key={ad.id}
                            onClick={() => setLightboxImage(getMediaUrl(ad.image_url))}
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
                              className="w-full h-full object-cover group-hover:scale-105 transition-theme"
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
                  <div className="space-y-4 sm:space-y-6">

                    {/* Mobile Smart Quick-Filter Bar (Location Pill + GPS Button) */}
                    <div className="lg:hidden flex items-center justify-between gap-2 py-1 px-1">
                      <div className="flex items-center gap-1.5 w-full justify-between">
                        <button
                          type="button"
                          onClick={() => setIsLocationFlyoutOpen(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-[#1a1a1c] hover:bg-emerald-500/10 text-gray-800 dark:text-gray-200 hover:text-emerald-500 text-[11px] font-extrabold border border-gray-200 dark:border-gray-800 transition-theme active:scale-95 shadow-2xs truncate"
                        >
                          <MapPin size={12} className="text-emerald-500 shrink-0" />
                          <span className="truncate">
                            {selectedCity === 'all' 
                              ? (isRtl ? '📍 كافة المدن والمحافظات' : '📍 All Cities') 
                              : `${selectedCity}${selectedRadius !== 'all' ? ` (+${selectedRadius}كم)` : ''}`}
                          </span>
                          <ChevronDown size={11} className="text-gray-400 shrink-0" />
                        </button>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={handleDetectGpsLocation}
                            disabled={isDetectingGps}
                            className="px-2.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 text-[11px] font-bold flex items-center gap-1 border border-emerald-500/20 active:scale-95 transition-theme disabled:opacity-50 shrink-0"
                            title={isRtl ? 'استخدام موقعي الحالي (GPS)' : 'GPS Location'}
                          >
                            {isDetectingGps ? <Loader2 size={12} className="animate-spin text-emerald-500" /> : <Compass size={12} />}
                            <span className="text-[10px] font-extrabold">{isRtl ? 'موقعي' : 'GPS'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={triggerFeedRefresh}
                            disabled={isRefreshing}
                            className="px-2.5 py-1.5 rounded-full bg-white dark:bg-[#1a1a1c] hover:bg-emerald-500/10 text-gray-700 dark:text-gray-300 hover:text-emerald-500 text-[11px] font-bold flex items-center gap-1 border border-gray-200 dark:border-gray-800 active:scale-95 transition-theme disabled:opacity-50 shrink-0 shadow-2xs"
                            title={isRtl ? 'تحديث خلاصة الإعلانات' : 'Refresh Feed'}
                          >
                            <RefreshCw size={12} className={isRefreshing ? "animate-spin text-emerald-500" : ""} />
                            <span className="text-[10px] font-extrabold">{isRtl ? 'تحديث' : 'Refresh'}</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Stories / Reels Highlights Carousel Bar (Facebook Native 9:16 Style) */}
                    <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1a1a1c] border border-gray-200 dark:border-gray-800 shadow-sm space-y-2">
                      <div className="flex items-center justify-between px-1">
                        <h3 className="text-xs font-extrabold flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                          <Sparkles size={14} className="text-emerald-500 animate-pulse" />
                          <span>{isRtl ? 'قصص وأبرز ريلز الصفحات التجارية' : 'Page Stories & Highlights'}</span>
                        </h3>
                        <button
                          onClick={() => setActiveTab('pages')}
                          className="text-[11px] font-bold text-emerald-500 hover:underline"
                        >
                          {isRtl ? 'استعراض الكل' : 'View All'}
                        </button>
                      </div>

                      <div className="flex items-center gap-2.5 overflow-x-auto scrollbar-none pb-1 pt-1">
                        {/* Tile 1: Create Story (Facebook Native Avatar + Floating Button Style) */}
                        <div
                          onClick={() => {
                            if (!token) {
                              toast.error(isRtl ? 'يرجى تسجيل الدخول أولاً' : 'Please log in first');
                              return;
                            }
                            setIsAdModalOpen(true);
                          }}
                          className="relative w-26 h-42 sm:w-30 sm:h-48 rounded-2xl overflow-hidden bg-white dark:bg-[#1f1f23] border border-gray-200 dark:border-gray-800 shrink-0 cursor-pointer group shadow-sm hover:shadow-md transition-theme flex flex-col justify-between"
                        >
                          {/* Upper Avatar Background */}
                          <div className="relative w-full h-[72%] overflow-hidden bg-gray-200 dark:bg-zinc-800">
                            <img
                              src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                              alt={user?.name || 'User'}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                          </div>

                          {/* Center Floating (+) Button */}
                          <div className="absolute top-[65%] start-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-emerald-500 text-white border-2 border-white dark:border-[#1f1f23] flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                            <Plus size={18} className="stroke-[3]" />
                          </div>

                          {/* Bottom Text Area */}
                          <div className="h-[28%] bg-white dark:bg-[#1f1f23] flex items-center justify-center px-1 pt-1">
                            <span className="text-[10px] font-extrabold text-gray-900 dark:text-gray-100 text-center truncate">
                              {isRtl ? 'إنشاء قصة' : 'Create Story'}
                            </span>
                          </div>
                        </div>

                        {/* Merchant Pages Stories (9:16 Aspect Ratio) */}
                        {pagesList.slice(0, 10).map((page) => (
                          <div
                            key={page.id}
                            onClick={() => handleOpenPageDetail(page.id)}
                            className="relative w-26 h-42 sm:w-30 sm:h-48 rounded-2xl overflow-hidden bg-gray-900 shrink-0 cursor-pointer group shadow-sm hover:shadow-md transition-theme p-2 flex flex-col justify-between border border-gray-200/50 dark:border-gray-800/80"
                          >
                            <img
                              src={getMediaUrl(page.cover_url || page.avatar_url)}
                              alt={page.name}
                              className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-85"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/30" />
                            
                            {/* Story Ring Avatar */}
                            <div className="relative z-10 w-8 h-8 rounded-full p-[2px] bg-gradient-to-tr from-emerald-500 via-teal-400 to-blue-500 shadow-md">
                              <img
                                src={getMediaUrl(page.avatar_url)}
                                alt={page.name}
                                className="w-full h-full rounded-full object-cover border border-black"
                              />
                            </div>

                            <div className="relative z-10 min-w-0">
                              <div className="flex items-center gap-1">
                                <p className="text-[11px] font-extrabold text-white truncate drop-shadow">{page.name}</p>
                                <CheckCircle2 size={11} className="text-blue-400 shrink-0" />
                              </div>
                              <p className="text-[9px] text-gray-300 truncate">{page.city}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Facebook Post Creation Bar (Composer Box) */}
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#1a1a1c] border border-gray-200 dark:border-gray-800 shadow-sm space-y-3">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                          alt={user?.name || 'User'}
                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border border-gray-200 dark:border-gray-700 shrink-0"
                        />
                        <button
                          onClick={() => {
                            if (!token) {
                              toast.error(isRtl ? 'يرجى تسجيل الدخول أولاً' : 'Please log in first');
                              return;
                            }
                            setIsAdModalOpen(true);
                          }}
                          className="flex-1 text-start px-4 py-2 sm:py-2.5 rounded-full bg-gray-100 dark:bg-zinc-800/80 hover:bg-gray-200/80 dark:hover:bg-zinc-700/80 text-xs text-gray-500 dark:text-gray-400 font-medium transition-theme border border-transparent hover:border-gray-300 dark:hover:border-gray-700"
                        >
                          {isRtl ? 'بم تفكر اليوم؟' : "What's on your mind?"}
                        </button>
                      </div>

                      <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800/80 pt-2 text-[11px] sm:text-xs text-gray-500">
                        <button
                          onClick={() => {
                            if (!token) {
                              toast.error(isRtl ? 'يرجى تسجيل الدخول أولاً' : 'Please log in first');
                              return;
                            }
                            setIsStreamSetupOpen(true);
                          }}
                          className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl hover:bg-red-500/10 hover:text-red-500 font-bold transition-theme text-red-500 whitespace-nowrap"
                        >
                          <Radio size={15} className="text-red-500 animate-pulse shrink-0" />
                          <span>{isRtl ? 'بث مباشر' : 'Live Stream'}</span>
                        </button>

                        <label className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl hover:bg-blue-500/10 hover:text-blue-500 font-bold transition-theme text-blue-500 whitespace-nowrap cursor-pointer">
                          <Video size={15} className="text-blue-500 shrink-0" />
                          <span>{isRtl ? 'فيديو أو صورة' : 'Photo/Video'}</span>
                          <input 
                            type="file" 
                            accept="image/*,video/*" 
                            className="hidden" 
                            onChange={(e) => {
                              if (!token) {
                                toast.error(isRtl ? 'يرجى تسجيل الدخول أولاً' : 'Please log in first');
                                return;
                              }
                              const file = e.target.files?.[0];
                              if (file) {
                                if (file.type.startsWith('image/')) handleImageFileUpload(e);
                                else handleVideoFileUpload(e);
                                setAdFormData(prev => ({ ...prev, ad_format: 'post' }));
                                setIsAdModalOpen(true);
                              }
                            }} 
                          />
                        </label>

                        <label className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl hover:bg-purple-500/10 hover:text-purple-500 font-bold transition-theme text-purple-500 whitespace-nowrap cursor-pointer">
                          <Clapperboard size={15} className="text-purple-500 shrink-0" />
                          <span>{isRtl ? 'ريلز' : 'Reels'}</span>
                          <input 
                            type="file" 
                            accept="video/*" 
                            className="hidden" 
                            onChange={(e) => {
                              if (!token) {
                                toast.error(isRtl ? 'يرجى تسجيل الدخول أولاً' : 'Please log in first');
                                return;
                              }
                              handleVideoFileUpload(e);
                              setAdFormData(prev => ({ ...prev, ad_format: 'reel' }));
                              setIsAdModalOpen(true);
                            }} 
                          />
                        </label>

                        <label className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl hover:bg-emerald-500/10 hover:text-emerald-500 font-bold transition-theme text-emerald-500 whitespace-nowrap cursor-pointer">
                          <Camera size={15} className="text-emerald-500 shrink-0" />
                          <span>{isRtl ? 'قصة' : 'Story'}</span>
                          <input 
                            type="file" 
                            accept="image/*,video/*" 
                            className="hidden" 
                            onChange={(e) => {
                              if (!token) {
                                toast.error(isRtl ? 'يرجى تسجيل الدخول أولاً' : 'Please log in first');
                                return;
                              }
                              const file = e.target.files?.[0];
                              if (file) {
                                if (file.type.startsWith('image/')) handleImageFileUpload(e);
                                else handleVideoFileUpload(e);
                                setAdFormData(prev => ({ ...prev, ad_format: 'story' }));
                                setIsAdModalOpen(true);
                              }
                            }} 
                          />
                        </label>
                      </div>
                    </div>

                    {/* Ads Feed Grid */}
                    <PostFeed
                      ads={ads}
                      loading={loading}
                      hasMore={hasMoreAds}
                      loadingMore={loadingMoreAds}
                      onLoadMore={handleLoadMoreAds}
                      isRtl={isRtl}
                      token={token}
                      user={user}
                      searchQuery={searchQuery}
                      onReportAd={handleReportAd}
                      onToggleLike={handleToggleLike}
                      onToggleComments={toggleComments}
                      expandedAdId={expandedAdId}
                      commentsMap={commentsMap}
                      loadingCommentsAdId={loadingCommentsAdId}
                      newCommentText={newCommentText}
                      setNewCommentText={setNewCommentText}
                      onAddComment={handleAddComment}
                       replyToCommentId={replyToCommentId}
                       setReplyToCommentId={setReplyToCommentId}
                      onMessageAdvertiser={handleMessageAdvertiser}
                      messagingAdId={messagingAdId}
                      onInquire={setInquireAd}
                      onWhatsApp={handleWhatsAppClick}
                      onShare={handleShareAd}
                      onOpenPageDetail={handleOpenPageDetail}
                      onOpenLightbox={setLightboxImage}
                      onCreateAdClick={() => {
                        setIsEditMode(false);
                        setEditingAdId(null);
                        setAdFormData({
                          title: '',
                          description: '',
                          image_url: '',
                          video_url: '',
                          whatsapp_number: '',
                          phone_number: '',
                          target_url: '',
                          hashtags: '#فلسطين,#تنمية,#أعمال,#خدمات',
                          page_id: '',
                          location_city: 'القدس الشريف',
                          location_radius: '10',
                          feeling: '',
                          is_ai_generated: false,
                          tagged_users: [],
                          has_whatsapp_button: false,
                          audience: 'public',
                          ad_format: 'post',
                          quick_questions: ['', '', '']
                        });
                        setIsAdModalOpen(true);
                      }}
                      onBoostAd={handleOpenBoostModal}
                      onEditAd={handleEditAd}
                      onDeleteAd={handleDeleteAd}
                      onToggleSave={handleToggleSave}
                    />
                  </div>
                )}

                {/* ========================================================== */}
                {/* TAB: SAVED POSTS                                          */}
                {/* ========================================================== */}
                {activeTab === 'saved' && (
                  <div className="space-y-4">
                    <div className="bg-white dark:bg-[#1a1a1c] p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                           <Bookmark size={20} />
                         </div>
                         <div>
                           <h2 className="text-sm font-extrabold text-gray-900 dark:text-white">
                             {isRtl ? 'المنشورات المحفوظة' : 'Saved Posts'}
                           </h2>
                           <p className="text-[10px] text-gray-500 font-bold">
                             {isRtl ? `لديك ${savedAds.length} منشورات محفوظة` : `You have ${savedAds.length} saved posts`}
                           </p>
                         </div>
                      </div>
                      <button 
                         onClick={() => setActiveTab('board')}
                         className="text-xs font-bold text-emerald-500 hover:underline"
                      >
                         {isRtl ? 'استعراض المزيد' : 'Browse More'}
                      </button>
                    </div>

                    <PostFeed
                      ads={savedAds}
                      loading={loadingSaved}
                      hasMore={false}
                      loadingMore={false}
                      onLoadMore={() => {}}
                      isRtl={isRtl}
                      token={token}
                      user={user}
                      searchQuery={''}
                      onReportAd={handleReportAd}
                      onToggleLike={handleToggleLike}
                      onToggleComments={toggleComments}
                      expandedAdId={expandedAdId}
                      commentsMap={commentsMap}
                      loadingCommentsAdId={loadingCommentsAdId}
                      newCommentText={newCommentText}
                      setNewCommentText={setNewCommentText}
                      onAddComment={handleAddComment}
                       replyToCommentId={replyToCommentId}
                       setReplyToCommentId={setReplyToCommentId}
                      onMessageAdvertiser={handleMessageAdvertiser}
                      messagingAdId={messagingAdId}
                      onInquire={setInquireAd}
                      onWhatsApp={handleWhatsAppClick}
                      onShare={handleShareAd}
                      onOpenPageDetail={handleOpenPageDetail}
                      onOpenLightbox={setLightboxImage}
                      onCreateAdClick={() => {
                        setIsEditMode(false);
                        setEditingAdId(null);
                        setAdFormData({
                          title: '',
                          description: '',
                          image_url: '',
                          video_url: '',
                          whatsapp_number: '',
                          phone_number: '',
                          target_url: '',
                          hashtags: '#فلسطين,#تنمية,#أعمال,#خدمات',
                          page_id: '',
                          location_city: 'القدس الشريف',
                          location_radius: '10',
                          feeling: '',
                          is_ai_generated: false,
                          tagged_users: [],
                          has_whatsapp_button: false,
                          audience: 'public',
                          ad_format: 'post',
                          quick_questions: ['', '', '']
                        });
                        setIsAdModalOpen(true);
                      }}
                      onBoostAd={handleOpenBoostModal}
                      onEditAd={handleEditAd}
                      onDeleteAd={handleDeleteAd}
                      onToggleSave={handleToggleSave}
                    />
                  </div>
                )}

                {/* ========================================================== */}
                {/* TAB 3: CUSTOMER INQUIRIES & DIRECT MESSAGES INBOX           */}
                {/* ========================================================== */}
                {activeTab === 'inquiries' && (
                  <div className="space-y-4">
                    <div className="bg-white dark:bg-[#1a1a1c] p-3 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setActiveTab('board')}
                            className="w-9 h-9 shrink-0 rounded-xl bg-gray-100 dark:bg-gray-800/80 flex items-center justify-center text-gray-500 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-theme"
                            title={isRtl ? 'العودة للصفحة الرئيسية' : 'Back to Home'}
                          >
                            {isRtl ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
                          </button>
                          <h2 className="text-base font-extrabold flex items-center gap-2 truncate">
                            <MessageSquare size={18} className="text-emerald-500 shrink-0" />
                            <span className="truncate">{isRtl ? 'صندوق الرسائل' : 'Messenger'}</span>
                          </h2>
                        </div>
                        {!selectedInboxAd && (
                          <div className="relative w-full sm:w-64 shrink-0">
                            <input
                              type="text"
                              value={inquiriesSearchTerm}
                              onChange={e => setInquiriesSearchTerm(e.target.value)}
                              placeholder={isRtl ? 'ابحث عن محادثة أو مرسل...' : 'Search messages, senders...'}
                              className={`w-full ${isRtl ? 'pr-9 pl-3' : 'pl-9 pr-3'} py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-theme dark:text-white`}
                            />
                            <Search size={14} className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-gray-400`} />
                          </div>
                        )}
                        {selectedInboxAd && (
                          <button
                            onClick={() => setSelectedInboxAd(null)}
                            className="px-3.5 py-2 shrink-0 rounded-xl bg-gray-100 dark:bg-gray-800/80 text-xs font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-theme flex items-center gap-1.5 w-full sm:w-auto justify-center"
                          >
                            {isRtl ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
                            <span>{isRtl ? 'رجوع للقائمة' : 'Back to List'}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {inquiriesLoading ? (
                      <div className="text-center py-16 bg-white dark:bg-[#1a1a1c] rounded-[24px] border border-gray-100 dark:border-gray-800/60 shadow-sm flex items-center justify-center gap-3">
                        <Loader2 size={20} className="animate-spin text-emerald-500" />
                        <span className="text-sm font-bold text-gray-500">{isRtl ? 'جاري تحميل صندوق الرسائل...' : 'Loading messenger...'}</span>
                      </div>
                    ) : inquiriesList.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-24 px-4 bg-white dark:bg-[#1a1a1c] rounded-[24px] border border-gray-100 dark:border-gray-800/60 shadow-sm space-y-5 text-center">
                        <div className="w-20 h-20 rounded-full bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center">
                          <MessageSquare size={32} className="text-gray-400 dark:text-gray-500" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">
                            {isRtl ? 'لا توجد رسائل حالياً' : 'No Messages Yet'}
                          </h3>
                          <p className="text-xs font-medium text-gray-500 max-w-sm mx-auto leading-relaxed">
                            {isRtl 
                              ? 'عندما تتلقى استفسارات أو رسائل حول إعلاناتك، ستظهر هنا في صندوق المحادثات المشفرة، لضمان خصوصية تواصلك.'
                              : 'When you receive inquiries or messages about your ads, they will appear here in your encrypted inbox, ensuring communication privacy.'}
                          </p>
                        </div>
                        <button
                          onClick={() => setActiveTab('board')}
                          className="mt-4 px-6 py-2.5 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm shadow-emerald-500/20 text-xs font-bold transition-theme flex items-center gap-2"
                        >
                          {isRtl ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
                          <span>{isRtl ? 'العودة للصفحة الرئيسية' : 'Back to Main Feed'}</span>
                        </button>
                      </div>
                    ) : (
                      <AdMessengerHub
                        inquiries={filteredInquiriesList}
                        onRefresh={fetchInquiries}
                        isRtl={isRtl}
                      />
                    )}
                  </div>
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
      <AnimatePresence>
        {isLiveStreamOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-md sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 100 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 100 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onPanEnd={(e, info) => {
                if (info.offset.y < -50 && currentFeedIndex < streamFeed.length - 1) {
                  setCurrentFeedIndex(i => i + 1);
                } else if (info.offset.y > 50 && currentFeedIndex > 0) {
                  setCurrentFeedIndex(i => i - 1);
                }
              }}
              className="relative w-full h-full sm:h-[85vh] sm:max-w-4xl sm:rounded-[24px] overflow-hidden bg-black shadow-2xl flex flex-col touch-none"
            >
              {/* Header */}
              <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-6 pt-12 sm:px-8 sm:pt-8 bg-gradient-to-b from-black/95 via-black/40 to-transparent">
                <div className="flex items-center gap-3 overflow-hidden">
                  <button
                    onClick={() => {
                      if (streamRef.current) {
                        streamRef.current.getTracks().forEach(track => track.stop());
                        streamRef.current = null;
                      }
                      setIsLiveStreamOpen(false);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-[4px] bg-red-600/10 hover:bg-red-600/20 backdrop-blur-md border border-red-500/20 text-white transition-theme active:scale-95 group shadow-lg shrink-0"
                    title={isRtl ? 'خروج من البث' : 'Exit Stream'}
                  >
                    <ArrowRight size={16} className={isRtl ? "" : "rotate-180"} />
                    <span className="text-[10px] font-black tracking-tight">{isRtl ? 'خروج' : 'EXIT'}</span>
                  </button>
                  
                  <div className="flex flex-col overflow-hidden">
                    <h3 className="text-xs font-black text-white truncate max-w-[120px] sm:max-w-[250px] drop-shadow-md">
                      {streamTitleInput || streamFeed[currentFeedIndex]?.title || (isRtl ? 'بث مباشر غير معنون' : 'Untitled Live Stream')}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500 text-white text-[8px] font-black rounded-[2px] animate-pulse">
                        <Radio size={8} />
                        {isRtl ? 'مباشر' : 'LIVE'}
                      </span>
                      <span className="text-[9px] font-bold text-gray-300 truncate">
                        @{user?.name || streamFeed[currentFeedIndex]?.host || (isRtl ? 'مستخدم' : 'User')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/60 backdrop-blur-md text-white text-[11px] font-bold rounded-[4px] border border-white/10 shadow-xl">
                    <Eye size={14} className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                    <span className="tabular-nums">{liveViewers + (streamFeed[currentFeedIndex]?.viewers || 0)}</span>
                  </div>

                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="w-9 h-9 rounded-[4px] bg-black/60 hover:bg-black/80 backdrop-blur-md flex items-center justify-center text-white transition-theme border border-white/10 active:scale-90 shadow-xl"
                    title={isMuted ? (isRtl ? 'تفعيل الصوت' : 'Unmute') : (isRtl ? 'كتم الصوت' : 'Mute')}
                  >
                    {isMuted ? <VolumeX size={18} className="text-red-400" /> : <Volume2 size={18} className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" />}
                  </button>

                  <div className="hidden sm:flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-[4px] border border-white/10 shadow-xl">
                    <Wallet size={12} className="text-yellow-400" />
                    <span className="text-[11px] font-black text-white">{walletBalance}</span>
                  </div>
                </div>
              </div>

              {/* Camera Stream Container */}
              <div className="absolute inset-0 w-full h-full bg-gray-950 flex items-center justify-center overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentFeedIndex}
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.15 }}
                    className="w-full h-full"
                  >
                    {!streamRef.current && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
                        <div className="text-center space-y-4">
                          <div className="w-16 h-16 rounded-[4px] bg-gray-900 flex items-center justify-center mx-auto border-2 border-dashed border-gray-700 animate-spin-slow">
                            <Camera size={24} className="text-gray-600" />
                          </div>
                          <p className="text-[10px] font-black text-gray-500 tracking-widest uppercase">
                            {isRtl ? 'جاري تهيئة البث...' : 'Initializing Stream...'}
                          </p>
                        </div>
                      </div>
                    )}
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted={isMuted}
                      className="w-full h-full object-cover transform scale-100 transition-transform duration-700"
                    />
                  </motion.div>
                </AnimatePresence>
                
                {/* Visual Enhancer Overlay */}
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/40 via-transparent to-black/60 z-10" />
              </div>

              {/* Overlay Content */}
              <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-end">
                <AnimatePresence mode="wait">
                  {showLikeAnimation && (
                    <motion.div
                      key="like-anim"
                      initial={{ opacity: 0, scale: 0, y: 0 }}
                      animate={{ opacity: 1, scale: 1.5, y: -200 }}
                      exit={{ opacity: 0 }}
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-red-500 z-50 pointer-events-none"
                    >
                      <Heart size={80} fill="currentColor" />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-end justify-between px-6 pb-12 sm:px-8 sm:pb-8 bg-gradient-to-t from-black/95 via-black/40 to-transparent pt-32 w-full pointer-events-auto">
                  
                  {/* Left Side: Comments Stream & Host Info */}
                  <div className="w-[75%] sm:w-[80%] space-y-4">
                    {/* Host & Title Info */}
                    <div className="space-y-1.5 mb-6">
                      <div className="flex items-center gap-2">
                        <div className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-[4px]">
                          <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                            {streamFeed[currentFeedIndex]?.type === 'live' ? (isRtl ? 'بث مباشر' : 'LIVE') : (isRtl ? 'ريلز' : 'REEL')}
                          </span>
                        </div>
                        <h3 className="text-white font-black text-base drop-shadow-2xl tracking-tight">
                          {streamTitleInput ? (user?.name || (isRtl ? 'أنت' : 'You')) : streamFeed[currentFeedIndex]?.host}
                        </h3>
                      </div>
                      <p className="text-white/90 text-xs font-bold line-clamp-1 drop-shadow-xl pr-4">
                        {streamTitleInput || streamFeed[currentFeedIndex]?.title}
                      </p>
                    </div>

                    <div className="max-h-[30vh] overflow-y-auto pr-3 space-y-3 scrollbar-hide flex flex-col justify-end [mask-image:linear-gradient(to_bottom,transparent,black_20%)]">
                      {liveComments.map((comment, idx) => (
                        <motion.div 
                          key={comment.id}
                          initial={{ opacity: 0, x: -30, scale: 0.9 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          className="bg-black/60 backdrop-blur-md rounded-[4px] p-2.5 inline-block max-w-fit border border-white/10 shadow-2xl"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-[4px] bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                              <span className="text-[9px] font-black text-emerald-500">{comment.user.charAt(0).toUpperCase()}</span>
                            </div>
                            <span className="text-emerald-500 font-black text-[10px] uppercase tracking-tighter drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]">{comment.user}</span>
                          </div>
                          <p className="text-white text-[12px] mt-1 leading-relaxed drop-shadow-sm font-bold">{comment.text}</p>
                        </motion.div>
                      ))}
                    </div>
                    
                    {/* Bottom: Comment Input Area (Refined Alignment) */}
                    <form onSubmit={handleSendLiveComment} className="flex items-center gap-2 mt-6">
                      <div className="flex-1 relative group">
                        <input
                          type="text"
                          value={newLiveComment}
                          onChange={e => setNewLiveComment(e.target.value)}
                          placeholder={isRtl ? 'قل شيئاً جميلاً...' : 'Say something nice...'}
                          className="w-full bg-black/40 border border-white/10 rounded-[4px] pl-4 pr-10 py-3 text-xs text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 backdrop-blur-xl transition-theme group-hover:bg-black/60 shadow-inner"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30">
                          <MessageCircle size={16} />
                        </div>
                      </div>
                      <button 
                        type="submit"
                        disabled={!newLiveComment.trim()}
                        className="w-10 h-10 rounded-[4px] bg-emerald-500 flex items-center justify-center text-white hover:bg-emerald-400 disabled:opacity-20 disabled:bg-gray-800 transition-theme shrink-0 shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-95"
                      >
                        <Send size={16} className={isRtl ? 'rotate-180 -ml-0.5' : 'ml-0.5'} />
                      </button>
                    </form>
                  </div>

                  {/* Right Side: Interaction Buttons (Social Stack) */}
                  <div className="flex flex-col items-center gap-4 mb-1 pr-1">
                    <button onClick={() => setIsGiftModalOpen(true)} className="group flex flex-col items-center gap-1 transition-transform active:scale-90">
                      <div className="w-10 h-10 rounded-[4px] bg-yellow-400/10 backdrop-blur-md border border-yellow-400/30 flex items-center justify-center text-yellow-400 group-hover:bg-yellow-400 group-hover:text-black transition-theme shadow-xl">
                        <Gift size={20} />
                      </div>
                      <span className="text-[9px] text-white font-black uppercase tracking-widest drop-shadow-2xl">{isRtl ? 'هدايا' : 'Gifts'}</span>
                    </button>

                    <button onClick={handleLiveLike} className="group flex flex-col items-center gap-1 transition-transform active:scale-90">
                      <div className="w-10 h-10 rounded-[4px] bg-red-500/10 backdrop-blur-md border border-red-500/30 flex items-center justify-center text-white group-hover:bg-red-500 transition-theme shadow-xl">
                        <Heart size={20} className={liveLikes > 0 ? "fill-current text-red-500 group-hover:text-white" : ""} />
                      </div>
                      <span className="text-[9px] text-white font-black drop-shadow-2xl">{liveLikes > 1000 ? (liveLikes/1000).toFixed(1) + 'K' : liveLikes}</span>
                    </button>

                    <button className="group flex flex-col items-center gap-1 transition-transform active:scale-90">
                      <div className="w-10 h-10 rounded-[4px] bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-emerald-500 hover:text-white transition-theme shadow-xl group-hover:border-emerald-500/50">
                        <Share2 size={20} />
                      </div>
                      <span className="text-[9px] text-white font-black uppercase tracking-widest drop-shadow-2xl">{isRtl ? 'مشاركة' : 'Share'}</span>
                    </button>

                    <div className="w-9 h-9 rounded-[4px] border-2 border-emerald-500 p-0.5 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)] bg-black/20">
                      <img 
                        src={user?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80"} 
                        alt="host" 
                        className="w-full h-full rounded-[2px] object-cover"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Gift Modal Overlay */}
              <AnimatePresence>
                {isGiftModalOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 100 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 100 }}
                    className="absolute bottom-0 inset-x-0 bg-gray-900 rounded-t-[32px] p-6 z-50 border-t border-gray-800 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] pointer-events-auto"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-white font-extrabold text-lg flex items-center gap-2">
                        <Gift className="text-yellow-400" size={20} />
                        {isRtl ? 'إرسال هدية للمنشئ' : 'Send Gift to Creator'}
                      </h3>
                      <button onClick={() => setIsGiftModalOpen(false)} className="text-gray-400 hover:text-white bg-white/5 p-2 rounded-full">
                        <X size={20} />
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-3 mb-6">
                      {giftsCatalog.length > 0 ? (
                        giftsCatalog.map(gift => (
                          <button
                            key={gift.id}
                            onClick={() => handleSendGift(gift)}
                            className="flex flex-col items-center justify-center p-3 bg-gray-800 rounded-2xl border border-gray-700 hover:border-emerald-500 hover:bg-gray-700 transition-theme group"
                          >
                            <span className="text-3xl mb-2 group-hover:scale-125 transition-transform">{gift.icon}</span>
                            <span className="text-[10px] text-white font-bold mb-1 truncate w-full text-center">
                              {isRtl ? gift.name_ar : gift.name_en}
                            </span>
                            <span className="text-[10px] text-yellow-400 flex items-center gap-1 font-black">
                              {gift.points} <Wallet size={10} />
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="col-span-4 py-8 text-center text-gray-500 text-xs">
                          {isRtl ? 'جاري تحميل الهدايا...' : 'Loading gifts...'}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                      <div className="flex items-center gap-2 text-gray-300">
                        <Wallet size={18} className="text-emerald-500" />
                        <span className="text-sm">{isRtl ? 'رصيدك الحالي:' : 'Your Balance:'}</span>
                      </div>
                      <span className="text-emerald-500 font-extrabold text-lg">{walletBalance}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Instructions Hint for Mobile */}
              <div className="absolute left-1/2 bottom-4 -translate-x-1/2 pointer-events-none z-30 flex flex-col items-center opacity-40">
                <div className="w-1 h-8 rounded-full bg-white/20 relative overflow-hidden">
                  <motion.div 
                    animate={{ y: [-32, 32] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="w-full h-1/2 bg-emerald-500"
                  />
                </div>
                <span className="text-[8px] text-white font-black mt-1 tracking-tighter uppercase">{isRtl ? 'اسحب للأعلى للتمرير' : 'SWIPE UP'}</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================== */}
      {/* MODAL 1: CREATE NEW CAMPAIGN AD (META-STYLE POSTING)       */}
      {/* ========================================================== */}
      <AnimatePresence>
        {isAdModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-xl rounded-2xl bg-white dark:bg-[#1a1a1c] border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] my-2 sm:my-8"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-2.5 sm:p-4 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2 sm:gap-3">
                  <button 
                    onClick={() => {
                      if (composerView === 'main') setIsAdModalOpen(false);
                      else setComposerView('main');
                    }}
                    className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
                  >
                    {composerView === 'main' ? <X size={18} className="sm:w-5 sm:h-5" /> : <ArrowLeft size={18} className={`sm:w-5 sm:h-5 ${isRtl ? 'rotate-180' : ''}`} />}
                  </button>
                  <h3 className="text-xs sm:text-base font-extrabold text-gray-800 dark:text-gray-100">
                    {composerView === 'feelings' ? (isRtl ? 'كيف تشعر؟' : 'How are you feeling?') :
                     composerView === 'location' ? (isRtl ? 'أين أنت؟' : 'Where are you?') :
                     composerView === 'tagging' ? (isRtl ? 'إشارة إلى أشخاص' : 'Tag people') :
                     composerView === 'emojis' ? (isRtl ? 'اختر رمزاً تعبيرياً' : 'Choose Emoji') :
                     isEditMode ? (isRtl ? 'تعديل المنشور' : 'Edit Post') :
                     (isRtl ? 'بم تفكر اليوم؟' : "What's on your mind?")}
                  </h3>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2.5 sm:p-4 scrollbar-thin">
                {composerView === 'main' && (
                  <form onSubmit={handleCreateCampaign} className="space-y-2.5 sm:space-y-4">
                    {/* User Info Header */}
                    <div className="flex items-center gap-2.5 sm:gap-3 mb-2 sm:mb-4">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden ring-2 ring-emerald-500/20 shrink-0">
                        {adFormData.page_id ? (
                          <img src={myPagesList.find(p => p.id === Number(adFormData.page_id))?.avatar_url} className="w-full h-full object-cover" />
                        ) : (
                          user?.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold">U</div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-100 truncate">
                            {adFormData.page_id ? myPagesList.find(p => p.id === Number(adFormData.page_id))?.name : user?.name}
                          </span>
                          {adFormData.feeling && (
                            <span className="text-[10px] sm:text-xs text-gray-500 font-medium truncate">
                              — {isRtl ? 'يشعر بـ' : 'is feeling'} {FEELINGS.find(f => f.id === adFormData.feeling)?.icon} {isRtl ? FEELINGS.find(f => f.id === adFormData.feeling)?.labelAr : FEELINGS.find(f => f.id === adFormData.feeling)?.labelEn}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <select 
                            value={adFormData.page_id}
                            onChange={(e) => setAdFormData({...adFormData, page_id: e.target.value})}
                            className="text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-lg border-none focus:ring-0 font-bold text-gray-500 cursor-pointer"
                          >
                            <option value="">{isRtl ? 'حسابي الشخصي' : 'Personal Profile'}</option>
                            {myPagesList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                          <button
                            type="button"
                            onClick={() => setIsAudienceModalOpen(true)}
                            className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-lg transition-theme border cursor-pointer active:scale-95 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60"
                            title={isRtl ? 'تحديد جمهور رؤية المنشور' : 'Change post audience'}
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
                                <Globe size={10} className="text-emerald-500 shrink-0" />
                                <span>{isRtl ? 'العامة' : 'Public'}</span>
                              </>
                            )}
                            <ChevronDown size={10} className="text-emerald-500/70" />
                          </button>

                          {/* Ad Format Selector (New: Global Measurement Support) */}
                          <div className="flex items-center gap-1">
                            <select
                              value={adFormData.ad_format}
                              onChange={(e) => setAdFormData({...adFormData, ad_format: e.target.value as any})}
                              className="text-[10px] bg-purple-50 dark:bg-purple-950/30 px-1.5 py-0.5 rounded-lg border border-purple-200 dark:border-purple-800 focus:ring-0 font-bold text-purple-600 dark:text-purple-400 cursor-pointer"
                            >
                              <option value="post">{isRtl ? 'منشور عادي' : 'Standard Post'}</option>
                              <option value="reel">{isRtl ? 'ريلز (9:16)' : 'Reel (9:16)'}</option>
                              <option value="story">{isRtl ? 'قصة (9:16)' : 'Story (9:16)'}</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Unified Post Creation Input Container */}
                    <div className="rounded-xl sm:rounded-2xl bg-gray-50/70 dark:bg-zinc-800/40 p-2.5 sm:p-3.5 border border-gray-200/60 dark:border-gray-800/70 focus-within:border-emerald-500/50 focus-within:ring-2 focus-within:ring-emerald-500/10 transition-theme space-y-2 sm:space-y-3 shadow-inner">
                      {/* Main Textarea */}
                      <textarea
                        value={adFormData.description}
                        onChange={(e) => setAdFormData({...adFormData, description: e.target.value, title: e.target.value.slice(0, 50)})}
                        placeholder={isRtl ? `بم تفكر يا ${user?.name?.split(' ')[0] || 'مستخدم'}؟` : `What's on your mind, ${user?.name?.split(' ')[0] || 'User'}?`}
                        className="w-full text-sm sm:text-base bg-transparent border-0 outline-none focus:outline-none focus:ring-0 resize-none min-h-[75px] sm:min-h-[110px] text-gray-900 dark:text-gray-100 p-0 placeholder-gray-400 font-medium"
                        rows={3}
                      />

                      {/* Professional Media Upload Zone (Facebook Style) */}
                      {(!adFormData.image_url && !adFormData.video_url) ? (
                        <div 
                          className="relative rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-emerald-500 dark:hover:border-emerald-500 bg-white/50 dark:bg-black/20 transition-theme p-8 flex flex-col items-center justify-center gap-3 cursor-pointer group"
                          onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-emerald-500', 'bg-emerald-500/5'); }}
                          onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-emerald-500', 'bg-emerald-500/5'); }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.currentTarget.classList.remove('border-emerald-500', 'bg-emerald-500/5');
                            const file = e.dataTransfer.files?.[0];
                            if (file) {
                              const syntheticEvent = { target: { files: [file] } } as any;
                              if (file.type.startsWith('image/')) handleImageFileUpload(syntheticEvent);
                              else if (file.type.startsWith('video/')) handleVideoFileUpload(syntheticEvent);
                            }
                          }}
                        >
                          <label className="absolute inset-0 cursor-pointer">
                            <input 
                              type="file" 
                              accept="image/*,video/*" 
                              className="hidden" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  if (file.type.startsWith('image/')) handleImageFileUpload(e);
                                  else handleVideoFileUpload(e);
                                }
                              }} 
                            />
                          </label>
                          <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 group-hover:text-emerald-500 group-hover:bg-emerald-500/10 transition-theme">
                            <Plus size={24} />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-black text-gray-700 dark:text-gray-200">{isRtl ? 'أضف صوراً/مقطع فيديو' : 'Add Photos/Videos'}</p>
                            <p className="text-[10px] text-gray-500 mt-1 font-bold">{isRtl ? 'أو سحب وإفلات' : 'or drag and drop'}</p>
                          </div>
                          <button 
                            type="button" 
                            className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-400"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        /* Media Attachments Preview Grid with Multi-Format Player */
                        <div className="space-y-3 pt-1.5">
                          <div className={`grid grid-cols-1 ${adFormData.image_url && (adFormData.video_url || videoMetadataInfo.localVideoUrl) ? 'sm:grid-cols-2' : ''} gap-3`}>
                            {adFormData.image_url && (
                              <div className={`relative rounded-xl overflow-hidden border border-gray-200/60 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 group ${adFormData.ad_format === 'reel' || adFormData.ad_format === 'story' ? 'aspect-[9/16] max-h-[360px] mx-auto' : ''}`}>
                                <img src={getMediaUrl(adFormData.image_url)} className="w-full h-full object-cover" />
                                <button 
                                  type="button"
                                  onClick={() => setAdFormData({...adFormData, image_url: ''})}
                                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/80 text-white flex items-center justify-center hover:bg-red-500 transition-colors shadow-lg z-20 cursor-pointer"
                                  title={isRtl ? 'إزالة الصورة' : 'Remove image'}
                                >
                                  <X size={14} />
                                </button>
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-theme pointer-events-none" />
                                <span className="absolute bottom-2 left-2 bg-black/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-md z-10 border border-white/10">
                                  {adFormData.ad_format === 'story' ? (isRtl ? 'قصة (Story 9:16)' : 'Story (9:16)') : (isRtl ? 'صورة الغلاف / المرفق' : 'Cover / Image attachment')}
                                </span>
                              </div>
                            )}

                            {(adFormData.video_url || videoMetadataInfo.localVideoUrl) && (
                              <div className="flex flex-col gap-3">
                                <VideoPreviewer
                                  videoUrl={adFormData.video_url || videoMetadataInfo.localVideoUrl}
                                  fileName={videoMetadataInfo.fileName}
                                  fileSize={videoMetadataInfo.fileSize}
                                  duration={videoMetadataInfo.duration}
                                  resolution={videoMetadataInfo.resolution}
                                  thumbnailUrl={adFormData.image_url}
                                  isRtl={isRtl}
                                  uploadProgress={videoMetadataInfo.uploadProgress}
                                  processingStage={videoMetadataInfo.processingStage}
                                  onRemove={() => {
                                    setAdFormData(prev => ({ ...prev, video_url: '' }));
                                    setVideoMetadataInfo({ processingStage: 'done' });
                                  }}
                                  onTrim={() => {
                                    setTrimmerVideoUrl(adFormData.video_url || videoMetadataInfo.localVideoUrl || '');
                                    setIsTrimmerModalOpen(true);
                                  }}
                                  onEditFilters={() => {
                                    setTrimmerVideoUrl(adFormData.video_url || videoMetadataInfo.localVideoUrl || '');
                                    setIsTrimmerModalOpen(true);
                                  }}
                                  onSelectThumbnail={(thumbUrl) => {
                                    setAdFormData(prev => ({ ...prev, image_url: thumbUrl }));
                                  }}
                                />
                                <div className="relative rounded-xl overflow-hidden border border-gray-200/60 dark:border-gray-800 bg-black group">
                                  <MediaFormatPlayer
                                    url={adFormData.video_url || videoMetadataInfo.localVideoUrl || ''}
                                    adFormat={adFormData.ad_format || 'feed'}
                                    posterUrl={adFormData.image_url}
                                    title={adFormData.title}
                                    isRtl={isRtl}
                                    className={adFormData.ad_format === 'reel' || adFormData.ad_format === 'story' ? 'max-h-[380px] mx-auto' : ''}
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Aspect Ratio & Format Guidance Selector Bar */}
                          <div className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15 flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                              <Sparkles size={14} />
                              <span className="text-[11px]">{getRecommendedDimensions(adFormData.ad_format, isRtl)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {['post', 'story', 'reel', 'video', 'banner'].map((fmt) => (
                                <button
                                  key={fmt}
                                  type="button"
                                  onClick={() => setAdFormData({ ...adFormData, ad_format: fmt as any })}
                                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase transition-theme ${
                                    adFormData.ad_format === fmt
                                      ? 'bg-emerald-500 text-white shadow-sm'
                                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                  }`}
                                >
                                  {fmt}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Unified Metadata Row (Hashtags + Location Tag) */}
                      <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1.5 border-t border-gray-200/40 dark:border-gray-800/50">
                        {/* Hashtag Field */}
                        <div className="flex-1 min-w-[120px]">
                          <input 
                            type="text"
                            value={adFormData.hashtags}
                            onChange={(e) => setAdFormData({...adFormData, hashtags: e.target.value})}
                            placeholder={isRtl ? '#هاشتاق' : '#hashtags'}
                            className="w-full text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-transparent border-0 outline-none focus:outline-none focus:ring-0 p-0 placeholder-emerald-500/50"
                          />
                        </div>

                        {/* Integrated Location Selector / Tag */}
                        {adFormData.location_city ? (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold shrink-0">
                            <MapPin size={11} className="text-emerald-500 shrink-0" />
                            <span className="truncate max-w-[130px] sm:max-w-[160px]">{adFormData.location_city}</span>
                            <button
                              type="button"
                              onClick={() => setAdFormData(prev => ({ ...prev, location_city: '' }))}
                              className="text-gray-400 hover:text-red-500 transition-colors ms-0.5"
                              title={isRtl ? 'إزالة الموقع' : 'Remove location'}
                            >
                              <X size={11} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setComposerView('location')}
                            className="flex items-center gap-1 text-[11px] font-bold text-gray-400 hover:text-emerald-500 transition-colors px-1.5 py-0.5 rounded-lg hover:bg-emerald-500/10 shrink-0"
                          >
                            <MapPin size={12} className="text-red-500/80" />
                            <span>{isRtl ? 'إضافة موقع' : 'Add location'}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Compact Add to Post Bar */}
                    <div 
                      onClick={() => setIsAddToPostModalOpen(true)}
                      className="p-2 sm:p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors gap-2"
                    >
                      <span className="text-[11px] sm:text-xs font-extrabold text-gray-500 shrink-0">{isRtl ? 'إضافة إلى منشورك' : 'Add to post'}</span>
                      <div className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto no-scrollbar">
                        <label className="p-1.5 sm:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-emerald-500 cursor-pointer transition-colors shrink-0" title={isRtl ? 'صور' : 'Photos'} onClick={(e) => e.stopPropagation()}>
                          <ImageIcon size={18} className="sm:w-5 sm:h-5" />
                          <input type="file" accept="image/*,.png,.jpg,.jpeg,.gif,.webp,.heic,.heif,.svg,.bmp" className="hidden" onChange={handleImageFileUpload} />
                        </label>
                        <label className="p-1.5 sm:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-blue-500 cursor-pointer transition-colors shrink-0" title={isRtl ? 'فيديو' : 'Video'} onClick={(e) => e.stopPropagation()}>
                          <Video size={18} className="sm:w-5 sm:h-5" />
                          <input type="file" accept="video/*,.mp4,.mov,.webm,.mkv,.avi,.3gp,.m4v" className="hidden" onChange={handleVideoFileUpload} />
                        </label>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setComposerView('emojis'); }} className="p-1.5 sm:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-amber-500 shrink-0" title={isRtl ? 'رموز تعبيرية' : 'Emojis'}>
                          <Sparkles size={18} className="sm:w-5 sm:h-5" />
                        </button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setComposerView('tagging'); }} className="p-1.5 sm:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-blue-400 shrink-0" title={isRtl ? 'إشارة للأصدقاء' : 'Tag Friends'}>
                          <Users size={18} className="sm:w-5 sm:h-5" />
                        </button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setComposerView('feelings'); }} className="p-1.5 sm:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-yellow-500 shrink-0" title={isRtl ? 'الشعور/النشاط' : 'Feeling/Activity'}>
                          <Smile size={18} className="sm:w-5 sm:h-5" />
                        </button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setComposerView('location'); }} className="p-1.5 sm:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-red-500 shrink-0" title={isRtl ? 'الموقع' : 'Location'}>
                          <MapPin size={18} className="sm:w-5 sm:h-5" />
                        </button>
                      </div>
                    </div>

                    {adFormData.has_whatsapp_button && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="overflow-hidden">
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-0.5">{isRtl ? 'رقم الواتساب:' : 'WhatsApp Number:'}</label>
                        <input
                          type="text"
                          value={adFormData.whatsapp_number}
                          onChange={(e) => setAdFormData({ ...adFormData, whatsapp_number: e.target.value })}
                          placeholder="+970599000000"
                          className="w-full px-3 py-1.5 text-xs rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 focus:outline-none focus:border-emerald-500"
                        />
                      </motion.div>
                    )}

                    {/* Compact Mobile Toggle Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="flex items-center justify-between p-2 sm:p-2.5 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Sparkles size={14} className="text-indigo-500 shrink-0" />
                          <span className="text-[11px] sm:text-xs font-bold text-gray-700 dark:text-gray-300 truncate">{isRtl ? 'منشور بالذكاء الاصطناعي' : 'AI Content'}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAdFormData({...adFormData, is_ai_generated: !adFormData.is_ai_generated})}
                          className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${adFormData.is_ai_generated ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                        >
                          <motion.div 
                            animate={{ x: adFormData.is_ai_generated ? 18 : 2 }}
                            className="absolute top-1 left-0 w-3 h-3 bg-white rounded-full"
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-2 sm:p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <MessageCircle size={14} className="text-emerald-500 shrink-0" />
                          <span className="text-[11px] sm:text-xs font-bold text-gray-700 dark:text-gray-300 truncate">{isRtl ? 'زر مراسلة واتساب' : 'WhatsApp Button'}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAdFormData({...adFormData, has_whatsapp_button: !adFormData.has_whatsapp_button})}
                          className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${adFormData.has_whatsapp_button ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                        >
                          <motion.div 
                            animate={{ x: adFormData.has_whatsapp_button ? 18 : 2 }}
                            className="absolute top-1 left-0 w-3 h-3 bg-white rounded-full"
                          />
                        </button>
                      </div>
                    </div>

                    {/* Quick / Trending Chat Questions Config */}
                    <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 space-y-2">
                      <div className="flex items-center gap-1.5">
                        <MessageSquare size={14} className="text-emerald-500 shrink-0" />
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                          {isRtl ? 'الأسئلة السائبة / الرائجة للدردشة المباشرة (اختياري)' : 'Quick / Trending Chat Questions (Optional)'}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400">
                        {isRtl ? 'حدد أسئلة سريعة تظهر للمشترين عند فتح صندوق المحادثة المباشرة مع إعلانك' : 'Set preset quick questions for buyers when they open direct chat with your ad'}
                      </p>
                      <div className="space-y-1.5">
                        {[0, 1, 2].map((idx) => (
                          <input
                            key={idx}
                            type="text"
                            value={(adFormData.quick_questions as string[])?.[idx] || ''}
                            onChange={(e) => {
                              const qq = [...(adFormData.quick_questions || ['', '', ''])];
                              qq[idx] = e.target.value;
                              setAdFormData({ ...adFormData, quick_questions: qq });
                            }}
                            placeholder={isRtl ? `السؤال السريع رقم ${idx + 1} (مثال: هل السعر قابل للتفاوض؟)` : `Quick Question #${idx + 1} (e.g., Is price negotiable?)`}
                            className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 focus:outline-none focus:border-emerald-500 text-gray-800 dark:text-gray-100"
                          />
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingAd || !adFormData.description}
                      className="w-full py-2.5 sm:py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-emerald-500/20 transition-theme active:scale-[0.99]"
                    >
                      {isSubmittingAd ? (isRtl ? 'جاري الحفظ...' : 'Saving...') : (isEditMode ? (isRtl ? 'حفظ التعديلات' : 'Save Changes') : (isRtl ? 'نشر الإعلان' : 'Publish Ad'))}
                    </button>
                  </form>
                )}

                {composerView === 'feelings' && (
                  <div className="grid grid-cols-2 gap-2">
                    {FEELINGS.map(f => (
                      <button
                        key={f.id}
                        onClick={() => {
                          setAdFormData({...adFormData, feeling: f.id});
                          setComposerView('main');
                        }}
                        className={`p-3 rounded-xl border flex items-center gap-3 transition-theme ${adFormData.feeling === f.id ? 'border-emerald-500 bg-emerald-500/5 text-emerald-600' : 'border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-600 dark:text-gray-400'}`}
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
                    className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#18181b] border border-gray-200/90 dark:border-gray-800 shadow-xl space-y-4 text-start"
                  >
                    {/* Instant Flyout Header */}
                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800/80 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20 shrink-0">
                          <MapPin size={16} className="animate-bounce" />
                        </div>
                        <div>
                          <h3 className="text-xs sm:text-sm font-black text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                            <span>{isRtl ? 'قائمة تحديد موقع المنشور والتغطية' : 'Post Location & Radius Flyout'}</span>
                            <span className="text-[9px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-bold">
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
                        className="w-7 h-7 rounded-full bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 flex items-center justify-center text-gray-500 transition-theme hover:rotate-90"
                        title={isRtl ? 'إغلاق' : 'Close'}
                      >
                        <X size={15} />
                      </button>
                    </div>

                    {/* Active Location Selection Preview Banner */}
                    <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/15 to-emerald-500/10 border border-emerald-500/25 flex items-center justify-between shadow-2xs">
                      <div className="flex items-center gap-2">
                        <Navigation size={14} className="text-emerald-500 shrink-0" />
                        <div>
                          <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
                            {isRtl ? 'الموقع ونطاق الرؤية المحدد:' : 'Targeted Location & Coverage:'}
                          </p>
                          <p className="text-xs font-black text-emerald-700 dark:text-emerald-300 truncate max-w-[220px] sm:max-w-[320px]">
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
                          <Search size={12} className="text-emerald-500" />
                          <span>{isRtl ? 'البحث عن مدينة أو معالم بالوقت الفعلي:' : 'Real-Time Location Autocomplete:'}</span>
                        </span>
                        {isSearchingLocation && (
                          <span className="text-[10px] text-emerald-500 font-bold animate-pulse flex items-center gap-1">
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
                          className="w-full ps-8 pe-8 py-2 text-xs rounded-xl bg-gray-50 dark:bg-zinc-800/90 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-emerald-500 font-bold transition-theme shadow-inner"
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
                        <div className="mt-1 max-h-44 overflow-y-auto custom-scrollbar border border-emerald-500/30 rounded-xl bg-white dark:bg-zinc-900 p-1.5 shadow-xl space-y-1">
                          <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 px-2 py-0.5 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
                            <span>{isRtl ? 'النتائج المباشرة:' : 'Live Matches:'}</span>
                            <span>{locationSuggestions.length}</span>
                          </div>
                          {locationSuggestions.map((item, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setAdFormData(prev => ({ ...prev, location_city: item.display_name }));
                                setLocationSuggestions([]);
                                setCustomLocationSearch('');
                              }}
                              className="w-full text-right rtl:text-right ltr:text-left px-3 py-2 text-xs text-gray-800 dark:text-gray-200 hover:bg-emerald-500/10 rounded-lg transition-colors flex items-center gap-2 font-medium"
                            >
                              <MapPin size={12} className="text-emerald-500 shrink-0" />
                              <span className="truncate">{item.display_name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 2. DYNAMIC COUNTRY & CITY DROPDOWN */}
                    <div className="space-y-1.5 p-3 rounded-2xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-200/80 dark:border-gray-800">
                      <label className="block text-[11px] font-extrabold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                        <Building2 size={13} className="text-emerald-500" />
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
                            className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-800 dark:text-gray-200 focus:outline-none focus:border-emerald-500 transition-theme cursor-pointer shadow-2xs"
                          >
                            {Object.keys(COUNTRIES_CITIES_DATA).map((c) => (
                              <option key={c} value={c}>
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
                            className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-800 dark:text-gray-200 focus:outline-none focus:border-emerald-500 transition-theme cursor-pointer shadow-2xs"
                          >
                            {(COUNTRIES_CITIES_DATA[selectedComposerCountry] || []).map((cityName) => (
                              <option key={cityName} value={cityName}>
                                🌆 {cityName}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* 3. REACH VISIBILITY RADIUS SLIDER (5-100 KM) */}
                    <div className="space-y-2 p-3 rounded-2xl bg-gradient-to-br from-emerald-500/5 via-gray-50 to-emerald-500/10 dark:from-emerald-500/10 dark:via-zinc-800/60 dark:to-emerald-500/5 border border-emerald-500/20">
                      <div className="flex items-center justify-between text-xs font-extrabold">
                        <span className="text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                          <SlidersHorizontal size={13} className="text-emerald-500" />
                          <span>{isRtl ? 'شعاع مسافة التغطية برؤية المنشور:' : 'Post Visibility Distance Radius:'}</span>
                        </span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-black text-xs bg-emerald-500/15 px-2 py-0.5 rounded-lg border border-emerald-500/20">
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
                          className="w-full h-2 bg-gray-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-theme"
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
                        {['5', '10', '25', '50', '100', 'all'].map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setAdFormData(prev => ({ ...prev, location_radius: r }))}
                            className={`flex-1 py-1 rounded-lg text-[10px] font-extrabold transition-theme border ${
                              (adFormData.location_radius || '10') === r
                                ? 'bg-emerald-500 text-white border-emerald-500 shadow-2xs'
                                : 'bg-white dark:bg-zinc-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-emerald-500/50'
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
                      className="w-full py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-extrabold text-[11px] flex items-center justify-center gap-1.5 transition-theme active:scale-95"
                    >
                      <Compass size={14} className="text-emerald-500 shrink-0" />
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
                        className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-extrabold transition-theme shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 active:scale-95"
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
                          key={idx}
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
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md bg-white dark:bg-[#18181b] border border-gray-200 dark:border-gray-800 rounded-3xl shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <Globe size={18} />
                  </div>
                  <h3 className="text-base font-black text-gray-900 dark:text-gray-100">
                    {isRtl ? 'تحديد جمهور المنشور' : 'Select Post Audience'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAudienceModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
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
                      ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 ring-1 ring-emerald-500/50'
                      : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                      <Globe size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <span>{isRtl ? 'العامة' : 'Public'}</span>
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                          {isRtl ? 'موصى به' : 'Recommended'}
                        </span>
                      </h4>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                        {isRtl ? 'أي شخص داخل المنصة أو خارجها' : 'Anyone on or off the platform'}
                      </p>
                    </div>
                  </div>
                  {adFormData.audience === 'public' && (
                    <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
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
                    <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-xs">
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
                    <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs">
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
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black transition-theme shadow-md shadow-emerald-500/20"
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
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
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
                  className="p-2 rounded-full hover:bg-gray-800 text-gray-300 transition-colors"
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
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                    <ImageIcon size={22} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-100">{isRtl ? 'صورة/فيديو' : 'Photo/Video'}</span>
                    <span className="text-[9px] text-gray-400">{isRtl ? 'إرفاق وسائط' : 'Attach media'}</span>
                  </div>
                  <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => {
                    handleImageFileUpload(e);
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
                  <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
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
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
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
                  <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
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
                  <div className="w-10 h-10 rounded-full bg-blue-600/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
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
                  onClick={() => {
                    const gifUrl = prompt(isRtl ? 'أدخل رابط صورة GIF المتحركة:' : 'Enter GIF image URL:');
                    if (gifUrl) {
                      setAdFormData(prev => ({ ...prev, image_url: gifUrl }));
                      toast.success(isRtl ? 'تمت إضافة صورة GIF بنجاح' : 'GIF added successfully');
                    }
                    setIsAddToPostModalOpen(false);
                  }}
                  className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-800/80 text-left rtl:text-right transition-theme group"
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-600/10 flex items-center justify-center text-emerald-400 font-extrabold text-xs group-hover:scale-110 transition-transform">
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
                  <div className="w-10 h-10 rounded-full bg-red-600/10 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
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
                  <div className="w-10 h-10 rounded-full bg-blue-400/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-xl rounded-2xl bg-white dark:bg-[#1a1a1c] border border-gray-200 dark:border-gray-800 p-6 shadow-2xl space-y-4 my-8"
            >
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                <div className="flex items-center gap-2">
                  <Building2 size={20} className="text-emerald-500" />
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
                      {PALESTINE_CITIES.map(c => (
                        <option key={c} value={c}>{c}</option>
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
                  <div>
                    <label className="block text-xs font-bold mb-1">{isRtl ? 'صورة الشعار (Avatar):' : 'Avatar URL:'}</label>
                    <input
                      type="text"
                      value={pageFormData.avatar_url}
                      onChange={(e) => setPageFormData({ ...pageFormData, avatar_url: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
                      placeholder="https://... or /uploads/..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1">{isRtl ? 'صورة الغلاف (Cover Banner):' : 'Cover Banner URL:'}</label>
                    <input
                      type="text"
                      value={pageFormData.cover_url}
                      onChange={(e) => setPageFormData({ ...pageFormData, cover_url: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
                      placeholder="https://... or /uploads/..."
                    />
                  </div>
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
                    className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition-theme"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md rounded-2xl bg-white dark:bg-[#1a1a1c] border border-gray-200 dark:border-gray-800 p-5 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <MessageCircle size={18} className="text-emerald-500" />
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
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-theme disabled:opacity-50"
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

      {/* LIGHTBOX MODAL */}
      <AnimatePresence>
        {lightboxImage && (
          <div
            onClick={() => setLightboxImage(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-pointer"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-2xl max-h-[90vh]"
            >
              <img src={getMediaUrl(lightboxImage)} alt="Ad detail" className="w-full h-full object-contain rounded-2xl shadow-2xl" />
              <button
                onClick={() => setLightboxImage(null)}
                className="absolute top-3 end-3 p-2 rounded-full bg-black/70 text-white hover:bg-black"
              >
                <X size={20} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>



      {/* STREAM SETUP MODAL */}
      <AnimatePresence>
        {isStreamSetupOpen && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
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
            className="fixed inset-0 z-[200] flex items-start sm:items-center justify-center pt-16 sm:pt-0 p-3 sm:p-4 bg-black/25 dark:bg-black/55 backdrop-blur-[2px] transition-theme"
            onClick={() => setIsLocationFlyoutOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.97, opacity: 0, y: -10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.97, opacity: 0, y: -10 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm sm:max-w-md rounded-2xl bg-white dark:bg-[#18181b] border border-gray-200 dark:border-gray-800/90 shadow-2xl p-4 sm:p-5 space-y-3.5 my-auto max-h-[88vh] overflow-y-auto custom-scrollbar backdrop-blur-md"
            >
              {/* Instant Flyout Header */}
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                    <MapPin size={16} className="animate-bounce shrink-0" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-gray-900 dark:text-gray-100 flex items-center gap-1">
                      <span>{isRtl ? 'قائمة التغطية والموقع السريعة' : 'Instant Location & Radius Flyout'}</span>
                      <span className="text-[9px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-bold">
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
                  className="w-7 h-7 rounded-full bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 flex items-center justify-center text-gray-500 transition-theme hover:rotate-90"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Active Location & Radius Badge */}
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/15 to-emerald-500/10 border border-emerald-500/25 text-emerald-800 dark:text-emerald-200 shadow-2xs">
                <div className="flex items-center gap-2 text-[11px] font-bold truncate">
                  <Navigation size={13} className="text-emerald-500 shrink-0" />
                  <span className="truncate">
                    {isRtl ? 'النطاق الحالي:' : 'Current Feed:'}{' '}
                    <strong className="text-emerald-600 dark:text-emerald-400 font-extrabold">
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
                  <Globe size={13} className="text-emerald-500" />
                  <span>{isRtl ? 'اختر الدولة:' : 'Select Country:'}</span>
                </label>
                <select
                  value={selectedCountry}
                  onChange={(e) => {
                    const c = e.target.value;
                    setSelectedCountry(c);
                    localStorage.setItem('perplexta_user_country', c);
                    handleSelectCity('all');
                  }}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-gray-50 dark:bg-zinc-800/90 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-emerald-500 transition-theme cursor-pointer shadow-2xs"
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
                    <Building2 size={13} className="text-emerald-500" />
                    <span>{isRtl ? 'البحث التفاعلي المباشر (بالوقت الفعلي):' : 'Real-Time Autocomplete Search:'}</span>
                  </span>
                  {isSearchingGeoLocation && (
                    <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
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
                    className="w-full ps-8 pe-8 py-2 text-xs rounded-xl bg-gray-50 dark:bg-zinc-800/90 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-emerald-500 transition-theme shadow-inner font-medium"
                  />
                  <Search size={14} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  {isSearchingGeoLocation ? (
                    <Loader2 size={13} className="absolute end-2.5 top-1/2 -translate-y-1/2 text-emerald-500 animate-spin" />
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
                  <div className="space-y-1 mt-1 max-h-48 overflow-y-auto custom-scrollbar border border-emerald-500/30 rounded-xl bg-white dark:bg-zinc-900 p-1.5 shadow-xl">
                    <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 px-2 py-1 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
                      <span className="flex items-center gap-1">
                        <Sparkles size={11} />
                        {isRtl ? 'نتائج الخريطة المباشرة (موثّقة):' : 'Verified Live Location Results:'}
                      </span>
                      <span className="text-[9px] bg-emerald-500/10 px-1.5 py-0.5 rounded text-emerald-500 font-extrabold">
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
                          className="w-full text-start p-2 rounded-lg hover:bg-emerald-500/10 dark:hover:bg-emerald-500/20 transition-theme flex items-center justify-between group border border-transparent hover:border-emerald-500/20"
                        >
                          <div className="flex items-center gap-2 truncate me-2">
                            <span className="text-sm shrink-0">{flag}</span>
                            <div className="truncate">
                              <div className="text-xs font-black text-gray-900 dark:text-gray-100 group-hover:text-emerald-500 transition-colors flex items-center gap-1">
                                <span>{item.city}</span>
                                {item.country && <span className="text-[10px] text-gray-400 font-normal">({item.country})</span>}
                              </div>
                              <div className="text-[10px] text-gray-400 truncate font-medium">
                                {item.state ? `${item.state} - ` : ''}{item.display_name}
                              </div>
                            </div>
                          </div>
                          <span className="text-[9px] font-extrabold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded shrink-0 flex items-center gap-0.5">
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
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-2xs'
                        : 'bg-gray-50 dark:bg-zinc-800/80 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-emerald-500/10'
                    }`}
                  >
                    <Globe size={12} className={selectedCity === 'all' ? 'text-white' : 'text-emerald-500 shrink-0'} />
                    <span className="truncate">{isRtl ? 'كل مدن الدولة' : 'All Cities'}</span>
                  </button>

                  {getAvailableCities().map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleSelectCity(c)}
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-theme border ${
                        selectedCity === c
                          ? 'bg-emerald-500 text-white border-emerald-500 shadow-2xs'
                          : 'bg-gray-50 dark:bg-zinc-800/80 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-emerald-500/10'
                      }`}
                    >
                      <MapPin size={12} className={selectedCity === c ? 'text-white' : 'text-emerald-500 shrink-0'} />
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
                  className="w-full py-1.5 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-extrabold text-[11px] flex items-center justify-center gap-1.5 transition-theme active:scale-95 disabled:opacity-50"
                >
                  {isDetectingGps ? <Loader2 size={13} className="animate-spin text-emerald-500" /> : <Compass size={13} />}
                  <span>{isRtl ? '🎯 تحديد موقعي الآن تلقائياً (GPS)' : '🎯 Auto-Detect My Location (GPS)'}</span>
                </button>

                {/* Reach Visibility Interactive Radius Slider (5-100km) */}
                <div className="space-y-2 bg-gradient-to-br from-emerald-500/5 via-gray-50 to-emerald-500/10 dark:from-emerald-500/10 dark:via-zinc-800/60 dark:to-emerald-500/5 p-3 rounded-2xl border border-emerald-500/20">
                  <div className="flex items-center justify-between text-xs font-extrabold">
                    <span className="text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                      <SlidersHorizontal size={13} className="text-emerald-500" />
                      <span>{isRtl ? 'نطاق الوصول والشعاع:' : 'Reach Visibility Radius:'}</span>
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-black text-xs bg-emerald-500/15 px-2 py-0.5 rounded-lg border border-emerald-500/20">
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
                        localStorage.setItem('perplexta_user_radius', val);
                      }}
                      className="w-full h-2 bg-gray-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-theme"
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
                    {['5', '10', '25', '50', '100', 'all'].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => {
                          setSelectedRadius(r);
                          localStorage.setItem('perplexta_user_radius', r);
                        }}
                        className={`flex-1 py-1 rounded-lg text-[10px] font-extrabold transition-theme border ${
                          selectedRadius === r
                            ? 'bg-emerald-500 text-white border-emerald-500 shadow-2xs'
                            : 'bg-white dark:bg-zinc-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-emerald-500/50'
                        }`}
                      >
                        {r === 'all' ? (isRtl ? 'الكل' : 'All') : `${r} ${isRtl ? 'كم' : 'km'}`}
                      </button>
                    ))}
                  </div>

                  {/* Reach Visibility Live Feedback */}
                  <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2.5 py-1.5 rounded-xl border border-emerald-500/20 flex items-center gap-1.5">
                    <Radio size={12} className="text-emerald-500 animate-pulse shrink-0" />
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
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-theme flex items-center justify-center gap-1.5"
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
            className="fixed bottom-20 lg:bottom-6 end-6 z-50 px-4 py-3 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl shadow-emerald-500/30 transition-theme flex items-center gap-2 text-xs font-black cursor-pointer hover:scale-105 active:scale-95"
            title={isRtl ? 'العودة لأعلى الصفحة' : 'Scroll to top'}
          >
            <ArrowUp size={16} />
            <span className="hidden sm:inline">{isRtl ? 'أعلى الصفحة' : 'Top'}</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* FIXED BOTTOM NAVIGATION BAR (Facebook Mobile UI/UX Pattern) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-md border-t border-gray-200/80 dark:border-gray-800/80 flex items-center justify-around py-1.5 px-2 shadow-2xl">
        {/* Tab 1: Home / Feed */}
        <button
          type="button"
          onClick={() => { setSelectedPageDetail(null); setActiveTab('board'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-theme active:scale-95 ${
            activeTab === 'board' && !selectedPageDetail
              ? 'text-emerald-500 font-extrabold'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium'
          }`}
        >
          <Megaphone size={19} className={activeTab === 'board' && !selectedPageDetail ? 'fill-emerald-500/20' : ''} />
          <span className="text-[10px]">{isRtl ? 'الرئيسية' : 'Feed'}</span>
        </button>

        {/* Tab 2: Pages / Directory */}
        <button
          type="button"
          onClick={() => { setSelectedPageDetail(null); setActiveTab('pages'); }}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-theme active:scale-95 ${
            activeTab === 'pages'
              ? 'text-emerald-500 font-extrabold'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium'
          }`}
        >
          <Building2 size={19} className={activeTab === 'pages' ? 'fill-emerald-500/20' : ''} />
          <span className="text-[10px]">{isRtl ? 'الصفحات' : 'Pages'}</span>
        </button>

        {/* Tab 3: Quick Add Post (+) Floating Action Button (FAB) */}
        <button
          type="button"
          onClick={() => {
            if (!token) { setIsAuthModalOpen(true); return; }
            setIsAdModalOpen(true);
          }}
          className="relative flex flex-col items-center justify-center w-12 h-12 -mt-6 rounded-full bg-emerald-500 text-white shadow-xl shadow-emerald-500/40 drop-shadow-[0_0_12px_rgba(16,185,129,0.6)] active:scale-90 transition-theme border-3 border-white dark:border-[#18181b] z-50 hover:bg-emerald-600"
          title={isRtl ? 'إضافة منشور جديد' : 'Create Post'}
        >
          <Plus size={24} className="stroke-[3]" />
        </button>

        {/* Tab 4: Messages / Inquiries */}
        <button
          type="button"
          onClick={() => {
            if (!token) { setIsAuthModalOpen(true); return; }
            setSelectedPageDetail(null);
            setActiveTab('inquiries');
          }}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl relative transition-theme active:scale-95 ${
            activeTab === 'inquiries'
              ? 'text-emerald-500 font-extrabold'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium'
          }`}
        >
          <div className="relative">
            <MessageSquare size={19} className={activeTab === 'inquiries' ? 'fill-emerald-500/20' : ''} />
            {inquiriesList.length > 0 && (
              <span className="absolute -top-1 -end-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-extrabold flex items-center justify-center ring-2 ring-white dark:ring-[#18181b]">
                {inquiriesList.length}
              </span>
            )}
          </div>
          <span className="text-[10px]">{isRtl ? 'الرسائل' : 'Messages'}</span>
        </button>

        {/* Tab 5: Saved Posts */}
        <button
          type="button"
          onClick={() => {
            if (!token) { setIsAuthModalOpen(true); return; }
            setSelectedPageDetail(null);
            setActiveTab('saved');
            fetchSavedAds();
          }}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-theme active:scale-95 ${
            activeTab === 'saved'
              ? 'text-emerald-500 font-extrabold'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium'
          }`}
        >
          <Bookmark size={19} className={activeTab === 'saved' ? 'fill-emerald-500/20' : ''} />
          <span className="text-[10px]">{isRtl ? 'المحفوظات' : 'Saved'}</span>
        </button>

        {/* Tab 6: Menu / Filters */}
        <button
          type="button"
          onClick={() => setIsMobileSidebarOpen(true)}
          className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium transition-theme active:scale-95"
        >
          <SlidersHorizontal size={19} />
          <span className="text-[10px]">{isRtl ? 'القائمة' : 'Menu'}</span>
        </button>
      </nav>

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

    </div>
  );
};

export default BulletinBoardPage;
