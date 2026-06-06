import { getProviderKey } from './ai.js';

export async function performPerplextaSearch(query: string) {
  let apiKey = await getProviderKey('serper');
  if (!apiKey) {
    apiKey = (process.env.SERPER_API_KEY || '').trim();
  }
  if (!apiKey) return [];

  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      body: JSON.stringify({ q: query, num: 5 })
    });

    if (!response.ok) return [];

    const data: any = await response.json();
    return (data.organic || []).map((res: any) => ({
      title: res.title,
      link: res.link,
      snippet: res.snippet
    }));
  } catch (error) {
    console.error('[Search] Error:', error);
    return [];
  }
}
