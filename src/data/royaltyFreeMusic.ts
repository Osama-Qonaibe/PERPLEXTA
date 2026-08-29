import { generateProceduralAudio, generateProceduralTrack } from '../utils/audioGenerator';

export interface RoyaltyFreeTrack {
  id: string;
  titleAr: string;
  titleEn: string;
  artist: string;
  genre: 'Epic' | 'Tarab' | 'EDM' | 'Acoustic' | 'LoFi' | 'Jazz' | 'Pop';
  categoryAr: string;
  categoryEn: string;
  durationSeconds: number;
  tags: string[];
  bpm: number;
  mood: string;
}

export const ROYALTY_FREE_TRACKS: RoyaltyFreeTrack[] = [
  {
    id: 'oud_oriental_vibes',
    titleAr: 'سحر العود الشرقي (مقام حجاز)',
    titleEn: 'Oriental Oud Magic (Hijaz)',
    artist: 'Perplexta Sound Lab - No Copyright',
    genre: 'Tarab',
    categoryAr: 'تراث وعود شرقي',
    categoryEn: 'Oriental & Heritage',
    durationSeconds: 30,
    tags: ['شرقي', 'عود', 'أصيل', 'ترند'],
    bpm: 82,
    mood: 'أصيل ومؤثر'
  },
  {
    id: 'lofi_chill_vibes',
    titleAr: 'لوفاي هادئ للدراسة والاسترخاء',
    titleEn: 'Lo-Fi Chill & Warm Breeze',
    artist: 'Perplexta Sound Lab - CC0',
    genre: 'LoFi',
    categoryAr: 'لوفاي واسترخاء',
    categoryEn: 'Lo-Fi Chill',
    durationSeconds: 30,
    tags: ['لوفاي', 'هدوء', 'دراسة', 'تصوير'],
    bpm: 74,
    mood: 'هادئ ومريح'
  },
  {
    id: 'upbeat_pop_energy',
    titleAr: 'إيقاع حيوي وحماسي للريلز',
    titleEn: 'Energetic Summer Upbeat',
    artist: 'Perplexta Sound Lab - No Copyright',
    genre: 'Pop',
    categoryAr: 'حماسي وحيوي',
    categoryEn: 'Upbeat & Energy',
    durationSeconds: 30,
    tags: ['طاقة', 'حماس', 'ريلز', 'اكسبلور'],
    bpm: 116,
    mood: 'مبهج ومليء بالحياة'
  },
  {
    id: 'epic_cinematic_pulse',
    titleAr: 'نبض سينمائي ملحمي',
    titleEn: 'Epic Cinematic Atmosphere',
    artist: 'Perplexta Sound Lab - CC0',
    genre: 'Epic',
    categoryAr: 'سينمائي ملحمي',
    categoryEn: 'Cinematic & Epic',
    durationSeconds: 30,
    tags: ['سينما', 'وثائقي', 'إثارة', 'أكشن'],
    bpm: 90,
    mood: 'ملحمي وفخم'
  },
  {
    id: 'edm_techno_wave',
    titleAr: 'موجة إلكترونية وسايبربانك',
    titleEn: 'Cyberpunk Synthwave & EDM',
    artist: 'Perplexta Sound Lab - No Copyright',
    genre: 'EDM',
    categoryAr: 'إلكتروني وحديث',
    categoryEn: 'EDM & Techno',
    durationSeconds: 30,
    tags: ['تيك', 'نيون', 'رياضة', 'ألعاب'],
    bpm: 128,
    mood: 'إيقاعي سريع'
  },
  {
    id: 'acoustic_warm_strings',
    titleAr: 'أوتار جيتار وبيانو دافئ',
    titleEn: 'Warm Acoustic Strings & Chimes',
    artist: 'Perplexta Sound Lab - CC0',
    genre: 'Acoustic',
    categoryAr: 'أكوستيك ناعم',
    categoryEn: 'Acoustic Guitar',
    durationSeconds: 30,
    tags: ['طبيعة', 'عاطفي', 'يوميات', 'سفر'],
    bpm: 85,
    mood: 'دافئ ورقيق'
  },
  {
    id: 'jazz_smooth_cafe',
    titleAr: 'جاز كافيه وموسيقى ليلية',
    titleEn: 'Midnight Jazz & Espresso',
    artist: 'Perplexta Sound Lab - CC0',
    genre: 'Jazz',
    categoryAr: 'جاز وبلوز راقي',
    categoryEn: 'Smooth Jazz',
    durationSeconds: 30,
    tags: ['كافيه', 'فخامة', 'أناقة', 'مقهى'],
    bpm: 88,
    mood: 'راقي وفاخر'
  }
];

export interface VisualEffect {
  id: string;
  nameAr: string;
  nameEn: string;
  icon: string;
  cssFilter: string;
  animationClass: string;
  descriptionAr: string;
  descriptionEn: string;
}

export const REEL_VISUAL_EFFECTS: VisualEffect[] = [
  {
    id: 'none',
    nameAr: 'أصلي (بدون)',
    nameEn: 'Original',
    icon: 'Sparkles',
    cssFilter: 'none',
    animationClass: '',
    descriptionAr: 'العرض الطبيعي بدون تعديل',
    descriptionEn: 'Normal original look'
  },
  {
    id: 'ken_burns',
    nameAr: 'زووم سينمائي (Ken Burns)',
    nameEn: 'Cinematic Zoom',
    icon: 'Camera',
    cssFilter: 'contrast(108%) saturate(112%)',
    animationClass: 'animate-ken-burns',
    descriptionAr: 'حركة تقريب وانسحاب بطيئة وناعمة',
    descriptionEn: 'Slow smooth zoom & pan movement'
  },
  {
    id: 'emerald_glow',
    nameAr: 'توهج إيميرالد عصري',
    nameEn: 'Emerald Pulse',
    icon: 'Zap',
    cssFilter: 'drop-shadow(0 0 12px rgba(16,185,129,0.35)) contrast(110%) saturate(120%)',
    animationClass: 'animate-pulse-subtle',
    descriptionAr: 'بريق زمردي مشرق وعصري',
    descriptionEn: 'Modern emerald glowing aura'
  },
  {
    id: 'cinematic_noir',
    nameAr: 'دراما سينمائية',
    nameEn: 'Cinematic Mood',
    icon: 'Film',
    cssFilter: 'contrast(125%) saturate(130%) brightness(92%) sepia(10%)',
    animationClass: '',
    descriptionAr: 'تباين سينمائي غني وداكن',
    descriptionEn: 'Deep cinematic contrast'
  },
  {
    id: 'vintage_90s',
    nameAr: 'ريترو كلاسيكي',
    nameEn: 'Vintage 90s',
    icon: 'Clock',
    cssFilter: 'sepia(50%) contrast(105%) brightness(96%) hue-rotate(-12deg)',
    animationClass: '',
    descriptionAr: 'ألوان دافئة بنمط كاميرات الأفلام القديمة',
    descriptionEn: 'Warm vintage film tone'
  },
  {
    id: 'cyberpunk_neon',
    nameAr: 'سايبربانك نيون',
    nameEn: 'Cyberpunk Neon',
    icon: 'Activity',
    cssFilter: 'hue-rotate(280deg) saturate(160%) contrast(120%)',
    animationClass: 'animate-neon-flicker',
    descriptionAr: 'ألوان بنفسجية ووردية كهربائية',
    descriptionEn: 'Electric violet & cyan hues'
  },
  {
    id: 'golden_sunset',
    nameAr: 'غروب ذهبي دافئ',
    nameEn: 'Golden Sunset',
    icon: 'Sun',
    cssFilter: 'sepia(30%) saturate(145%) brightness(105%)',
    animationClass: '',
    descriptionAr: 'إضاءة شمس ذهبية مبهجة',
    descriptionEn: 'Warm golden hour lighting'
  },
  {
    id: 'beat_pulse',
    nameAr: 'نبض إيقاعي مع الصوت',
    nameEn: 'Rhythmic Pulse',
    icon: 'Music',
    cssFilter: 'contrast(115%) saturate(125%)',
    animationClass: 'animate-beat-pulse',
    descriptionAr: 'حركة نبض ارتدادي متناسق مع الموسيقى',
    descriptionEn: 'Rhythmic bounce effect'
  }
];

// In-memory audio track cache to avoid synthesizing multiple times
interface CachedTrackData {
  buffer: AudioBuffer;
  blob: Blob;
  url: string;
}

const audioCache = new Map<string, CachedTrackData>();

export async function getTrackAudioData(track: RoyaltyFreeTrack): Promise<CachedTrackData | null> {
  if (audioCache.has(track.id)) {
    return audioCache.get(track.id)!;
  }

  try {
    const { buffer, blob } = await generateProceduralAudio(track.genre, 'Instrumental', track.durationSeconds);
    const objectUrl = URL.createObjectURL(blob);
    const cached: CachedTrackData = {
      buffer,
      blob,
      url: objectUrl
    };
    audioCache.set(track.id, cached);
    return cached;
  } catch (err) {
    console.error('Failed to synthesize procedural audio track:', err);
    return null;
  }
}

export async function getTrackAudioBuffer(track: RoyaltyFreeTrack): Promise<AudioBuffer | null> {
  const data = await getTrackAudioData(track);
  return data ? data.buffer : null;
}

export async function getTrackAudioBlob(track: RoyaltyFreeTrack): Promise<Blob | null> {
  const data = await getTrackAudioData(track);
  return data ? data.blob : null;
}

export async function getTrackAudioUrl(track: RoyaltyFreeTrack): Promise<string> {
  const data = await getTrackAudioData(track);
  return data ? data.url : '';
}
