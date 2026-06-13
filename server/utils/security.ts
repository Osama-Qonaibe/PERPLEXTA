/**
 * Perplexta Platform - Security & Input Validation Helpers
 * strictly aligned with Google Gemini Fair Use policies.
 */

export const MAX_USER_PROMPT_LIMIT = 16000;
export const MAX_CUMULATIVE_HISTORY_CHARS = 100000;
export const MAX_DOC_EXTRACT_SIZE = 60000;

/**
 * Strips dangerous HTML, scripts, events, and dynamic triggers to prevent XSS payloads.
 */
export function sanitizeHTMLAndXSS(text: string): string {
  if (!text) return text;

  return text
    // 1. Strip script tags and their content
    .replace(/<script[^>]*>([\s\S]*?)<\/script[^>]*>/gi, '[SECURE_REMOVED_SCRIPT]')
    // 2. Strip inline event handlers (e.g., onload, onerror, onclick)
    .replace(/\bon\w+\s*=\s*['"][^'"]*['"]/gi, '[SECURE_REMOVED_EVENT]')
    .replace(/\bon\w+\s*=\s*`[^`]*`/gi, '[SECURE_REMOVED_EVENT]')
    .replace(/\bon\w+\s*=\s*[^"'\s>]+/gi, '[SECURE_REMOVED_EVENT]')
    // 3. Prevent javascript:... protocol execution triggers
    .replace(/href\s*=\s*['"]?\s*javascript:[^'"]*['"]?/gi, 'href="#"')
    .replace(/src\s*=\s*['"]?\s*javascript:[^'"]*['"]?/gi, 'src="about:blank"')
    // 4. Strip iframe, object, embed, applet, and other unsafe raw tags
    .replace(/<iframe[^>]*>([\s\S]*?)<\/iframe[^>]*>/gi, '[SECURE_REMOVED_IFRAME]')
    .replace(/<object[^>]*>([\s\S]*?)<\/object[^>]*>/gi, '[SECURE_REMOVED_OBJECT]')
    .replace(/<embed[^>]*>([\s\S]*?)<\/embed[^>]*>/gi, '[SECURE_REMOVED_EMBED]')
    .replace(/<applet[^>]*>([\s\S]*?)<\/applet[^>]*>/gi, '[SECURE_REMOVED_APPLET]')
    .replace(/<meta[^>]*>/gi, '[SECURE_REMOVED_META]')
    .replace(/<link[^>]*>/gi, '[SECURE_REMOVED_LINK]')
    // 5. Eliminate HTML comments to avoid parser confusion
    .replace(/<!--([\s\S]*?)-->/g, '');
}

/**
 * Validates direct user text prompt sizes to prevent flood & context overflows.
 */
export function validatePromptLength(text: string): void {
  if (!text) return;
  
  if (text.length > MAX_USER_PROMPT_LIMIT) {
    throw new Error(JSON.stringify({
      error: `Security Alert: User input exceeds the professional fair-use limit of ${MAX_USER_PROMPT_LIMIT.toLocaleString()} characters. Please refine or shorten your text to proceed.`,
      error_ar: `تنبيه أمني: يتجاوز الكود أو النص المرسل حد الاستخدام العادل المسموح به (${MAX_USER_PROMPT_LIMIT.toLocaleString()} حرفاً). يرجى تقليل طول النص للمتابعة.`,
      type: "PROMPT_TOO_LONG"
    }));
  }
}
