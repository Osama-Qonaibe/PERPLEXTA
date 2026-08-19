export async function performPerplextaSearch(query: string) {
  // 1. DuckDuckGo HTML Lite Search Scraper (Keyless & Real-time)
  try {
    const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8'
      }
    });
    if (response.ok) {
      const html = await response.text();
      const results: any[] = [];
      
      const resultRegex = /<a class="result__url" href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
      let match;
      while ((match = resultRegex.exec(html)) !== null && results.length < 5) {
        const link = match[1];
        const title = match[2].replace(/<[^>]*>/g, '').trim();
        const snippet = match[3].replace(/<[^>]*>/g, '').trim();
        if (link && title) {
          results.push({ title, link, snippet });
        }
      }

      if (results.length > 0) return results;
    }
  } catch (err) {
    console.error('[Search] DuckDuckGo HTML Error:', err);
  }

  // 2. DuckDuckGo Instant JSON API Fallback
  try {
    const response = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (response.ok) {
      const data: any = await response.json();
      const results: any[] = [];
      if (data.AbstractText) {
        results.push({
          title: data.Heading || query,
          link: data.AbstractURL || 'https://duckduckgo.com',
          snippet: data.AbstractText
        });
      }
      if (Array.isArray(data.RelatedTopics)) {
        for (const topic of data.RelatedTopics.slice(0, 5)) {
          if (topic.Text && topic.FirstURL) {
            results.push({
              title: topic.Text.split(' - ')[0] || query,
              link: topic.FirstURL,
              snippet: topic.Text
            });
          }
        }
      }
      if (results.length > 0) return results;
    }
  } catch (err) {
    console.error('[Search] Keyless DuckDuckGo API Error:', err);
  }

  // 3. Wikipedia Open Search Fallback
  try {
    const wikiRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json`, {
      headers: { 'User-Agent': 'PerplextaApp/1.0' }
    });
    if (wikiRes.ok) {
      const wikiData: any = await wikiRes.json();
      const searchHits = wikiData.query?.search || [];
      return searchHits.slice(0, 4).map((h: any) => ({
        title: h.title,
        link: `https://en.wikipedia.org/wiki/${encodeURIComponent(h.title)}`,
        snippet: h.snippet.replace(/<[^>]*>/g, '')
      }));
    }
  } catch (err) {
    console.error('[Search] Keyless Wikipedia Error:', err);
  }

  return [];
}
