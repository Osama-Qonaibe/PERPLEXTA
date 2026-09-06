(function() {
  try {
    var savedLang = localStorage.getItem('language') || 'en';
    document.documentElement.setAttribute('lang', savedLang);
    document.documentElement.setAttribute('dir', savedLang === 'ar' ? 'rtl' : 'ltr');
    document.title = savedLang === 'ar' ? 'بيربليكستا - منصة التحليل والذكاء الاصطناعي الفاخر والمستقل' : 'Perplexta Platform - Professional Elite AI Platform';

    var isAr = savedLang === 'ar';
    var fontUrl = isAr 
      ? 'https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700&display=swap'
      : 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap';
    var linkId = isAr ? 'font-stylesheet-tajawal' : 'font-stylesheet-space-grotesk';
    if (!document.getElementById(linkId)) {
      var fontLink = document.createElement('link');
      fontLink.id = linkId;
      fontLink.rel = 'stylesheet';
      fontLink.href = fontUrl;
      document.head.appendChild(fontLink);
    }

    var savedTheme = localStorage.getItem('perplexta_theme') || localStorage.getItem('theme');
    var isDark = false;
    if (savedTheme === 'dark') {
      isDark = true;
    } else if (savedTheme === 'light') {
      isDark = false;
    } else {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    
    var meta = document.getElementById('theme-color-meta');
    var root = document.documentElement;
    
    if (isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
      root.setAttribute('data-theme', 'dark');
      root.style.setProperty('--pwa-theme-color', '#0b0c0e');
      root.style.setProperty('--pwa-bg-color', '#0b0c0e');
      if (meta) meta.setAttribute('content', '#0b0c0e');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
      root.style.setProperty('--pwa-theme-color', '#f8fafc');
      root.style.setProperty('--pwa-bg-color', '#f8fafc');
      if (meta) meta.setAttribute('content', '#f8fafc');
    }
  } catch (e) {
    document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
