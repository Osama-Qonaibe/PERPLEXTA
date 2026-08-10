import React, { useState } from 'react';
import { Sparkles, Loader2, Check } from 'lucide-react';

interface SmartMetaSuggestionProps {
  content: string;
  onApply: (title: string, description: string) => void;
}

export const SmartMetaSuggestion: React.FC<SmartMetaSuggestionProps> = ({ content, onApply }) => {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<{title: string, description: string} | null>(null);

  const handleSuggest = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/suggest-meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      const data = await res.json();
      setSuggestion(data);
    } catch (err) {
      console.error('Meta suggestion error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2 p-4 border rounded-md">
      <button 
        onClick={handleSuggest} 
        disabled={loading || !content}
        className="flex items-center gap-2 text-sm text-accent hover:underline disabled:opacity-50"
      >
        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
        Smart Suggest Meta Tags
      </button>

      {suggestion && (
        <div className="text-xs space-y-1 mt-2">
          <p><strong>Title:</strong> {suggestion.title}</p>
          <p><strong>Desc:</strong> {suggestion.description}</p>
          <button 
            onClick={() => onApply(suggestion.title, suggestion.description)}
            className="flex items-center gap-1 text-green-600 hover:text-green-800"
          >
            <Check className="w-3 h-3" /> Apply
          </button>
        </div>
      )}
    </div>
  );
};
