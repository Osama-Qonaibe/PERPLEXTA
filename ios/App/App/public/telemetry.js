(function() {
  if (typeof navigator !== "undefined" && navigator.modelContext) {
    navigator.modelContext.provideContext({
      tools: [
        {
          name: "search",
          description: "Search Perplexta platform content",
          inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
          execute: async ({ query }) => fetch(`/api/search?q=${encodeURIComponent(query)}`).then(r => r.json())
        },
        {
          name: "get_models",
          description: "Get active AI models",
          inputSchema: { type: "object", properties: {} },
          execute: async () => fetch("/api/models").then(r => r.json())
        }
      ]
    });
  }

  try {
    window.addEventListener('load', function() {
      setTimeout(function() {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
        const sessionKey = 'perplexta_init_' + new Date().toISOString().split('T')[0];
        if (sessionStorage.getItem(sessionKey)) return;

        const nav = performance.getEntriesByType('navigation')[0];
        const paint = performance.getEntriesByType('paint');
        const timing = {
          load: nav ? nav.loadEventEnd : 0,
          dom: nav ? nav.domContentLoadedEventEnd : 0,
          fcp: (paint.find(p => p.name === 'first-contentful-paint') || {}).startTime || 0
        };

        fetch('/api/system/launch-telemetry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: isStandalone ? 'standalone' : 'browser', timing, ts: new Date().toISOString() }),
          keepalive: true
        }).then(() => sessionStorage.setItem(sessionKey, '1')).catch(() => {});
      }, 3000);
    });
  } catch (e) {}
})();
