export async function performPerplextaSearch(query: string) {
  const apiKey = (process.env.SERPER_API_KEY || '').trim();
  if (!apiKey) return [];

  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json'
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
