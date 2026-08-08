import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';

export const TypewriterMotive: React.FC<{ isVisible?: boolean }> = ({ isVisible = true }) => {
  const { dir, language } = useAppContext();

  const arabicPhrases = useMemo(() => [
    "ابدأ الآن بإنشاء صوراً فائقة الدقة والجمال",
    "جسّد خيالك وحوّله إلى فيديو سينمائي مذهل",
    "اصنع لحناً فريداً واكتشف أسرار الأصوات",
    "ابحث بذكاء ونقّب في أعماق المعرفة التقنية",
    "حلل واكتب أكواد برمجية خالية من الأخطاء",
    "تفاعل بحرية واستنطق الخلاصة الذكية المتكاملة"
  ], []);

  const englishPhrases = useMemo(() => [
    "Unleash creativity and craft stunning high-fidelity images",
    "Transform your ideas into majestic cinematic videos",
    "Generate premium audio tracks and smart sound designs",
    "Perform deep intelligence search into specialized technical knowledge",
    "Review, optimize, and write error-free code instantly",
    "Directly experience the ultimate power of systemic intelligence"
  ], []);

  const phrases = useMemo(() => {
    return language === 'ar' ? arabicPhrases : englishPhrases;
  }, [language, arabicPhrases, englishPhrases]);

  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [typingSpeed, setTypingSpeed] = useState(80);

  useEffect(() => {
    if (!isVisible) return;
    let timer: NodeJS.Timeout;

    const handleTyping = () => {
      const fullText = phrases[currentPhraseIndex];
      
      if (!isDeleting) {
        // Typing text
        const nextText = fullText.substring(0, displayedText.length + 1);
        setDisplayedText(nextText);
        setTypingSpeed(75); // fast typing speed

        // If completed writing the phrase
        if (nextText === fullText) {
          // Wait for 3 seconds before starting to delete to let user read
          timer = setTimeout(() => {
            setIsDeleting(true);
          }, 3000);
          return;
        }
      } else {
        // Deleting text
        const nextText = fullText.substring(0, displayedText.length - 1);
        setDisplayedText(nextText);
        setTypingSpeed(30); // swift deletion speed

        // If completed deleting the phrase
        if (nextText === '') {
          setIsDeleting(false);
          // Advance to the next phrase index
          setCurrentPhraseIndex((prev) => (prev + 1) % phrases.length);
          setTypingSpeed(300); // stable pause before starting next word
          return;
        }
      }

      timer = setTimeout(handleTyping, typingSpeed);
    };

    timer = setTimeout(handleTyping, typingSpeed);

    return () => clearTimeout(timer);
  }, [displayedText, isDeleting, currentPhraseIndex, phrases, typingSpeed, isVisible]);

  const isFullyTyped = useMemo(() => {
    return displayedText === phrases[currentPhraseIndex] && !isDeleting;
  }, [displayedText, phrases, currentPhraseIndex, isDeleting]);

  // Helper to highlight key technical/creative words
  const renderHighlightedText = (text: string, fullyTyped: boolean) => {
    const highlights = [
      "صوراً فائقة الدقة والجمال", "صوراً", "الصور", "images", "high-fidelity images",
      "فيديو سينمائي مذهل", "فيديو", "videos", "cinematic videos",
      "لحناً فريداً", "الأصوات", "sound designs", "audio tracks",
      "المعرفة التقنية", "البحث العلمي", "technical knowledge", "intelligence search",
      "أكواد برمجية", "كود", "code", "error-free code",
      "الخلاصة الذكية المتكاملة", "systemic intelligence", "ultimate power"
    ];

    // Find the best matching substring to highlight
    let matchedHighlight = "";
    for (const highlight of highlights) {
      if (text.includes(highlight) && highlight.length > matchedHighlight.length) {
        matchedHighlight = highlight;
      }
    }

    if (!matchedHighlight) {
      return (
        <span className={`transition-colors duration-500 ${fullyTyped ? 'text-gray-950 dark:text-white dark:drop-shadow-[0_0_12px_rgba(255,255,255,0.8)]' : 'text-accent '}`}>
          {text}
        </span>
      );
    }

    const parts = text.split(matchedHighlight);

    if (fullyTyped) {
      // White hot glow state when full sentence is typed (black in light mode)
      return (
        <span className="text-gray-950 dark:text-white dark:drop-shadow-[0_0_12px_rgba(255,255,255,0.85)] transition-theme font-extrabold">
          {text}
        </span>
      );
    }

    // Emerald Green state while actively typing or deleting
    return (
      <>
        <span className="text-accent/85  transition-theme font-bold">
          {parts[0]}
        </span>
        <span className="text-accent drop-shadow-[0_0_12px_rgba(52,211,153,0.7)] transition-theme font-black">
          {matchedHighlight}
        </span>
        <span className="text-accent/85  transition-theme font-bold">
          {parts.slice(1).join(matchedHighlight)}
        </span>
      </>
    );
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6, transition: { duration: 0.25 } }}
          className="w-full flex items-center justify-center h-12 sm:h-14 overflow-hidden mb-6 mt-2 select-none pointer-events-none"
        >
          <div 
            style={{ fontFamily: "'29LT Bukra', '29lt bukra', 'Tajawal', sans-serif" }}
            className="text-[14px] sm:text-[16px] md:text-[21px] font-extrabold tracking-tight leading-none text-center flex items-center justify-center gap-1.5 h-full py-2"
          >
            <span className="transition-theme inline-block">
              {renderHighlightedText(displayedText, isFullyTyped)}
            </span>
            <span className={`w-[3px] h-[18px] sm:h-[22px] opacity-80 animate-pulse inline-block rounded-sm self-center transition-theme ${
              isFullyTyped 
                ? 'bg-gray-950 dark:bg-white shadow-[0_0_8px_rgba(0,0,0,0.15)] dark:shadow-[0_0_12px_rgba(255,255,255,0.9)]' 
                : 'bg-accent dark:bg-accent shadow-[0_0_8px_rgba(16,185,129,0.7)]'
            }`} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
