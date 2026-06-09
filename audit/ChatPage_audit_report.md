# ChatPage.tsx — Deep Audit Report
**Date:** 2026-06-09  
**Auditor:** Perplexta AI  
**File:** `src/pages/ChatPage.tsx`  
**Audit Rounds:** 2 (full file)

---

## 🔴 Critical Bugs

### BUG-001 — `linkMetadataCache` Race Condition on Failure

**Location:** `fetchLinkMetadata` function

**Problem:**  
The Promise is stored in the cache BEFORE knowing if it will succeed or fail.
When the fetch fails, `.catch()` deletes the cache entry — but any component that called `fetchLinkMetadata` AFTER the `set` but BEFORE the `catch` resolution already holds a reference to the failing Promise. After the delete, the next render cycle triggers a completely new fetch for the same URL. If multiple components mount simultaneously, this results in **N concurrent requests for the same failing URL**.

**Faulty code:**
```ts
const promise = fetch(...)
  .catch(err => {
    linkMetadataCache.delete(url); // Too late — other callers already got the Promise
    throw err;
  });
linkMetadataCache.set(url, promise);
```

**Fix:**
```ts
.catch(err => {
  linkMetadataCache.delete(url);
  return null; // Return null instead of throw — prevents component crash
});
```

---

### BUG-002 — `AudioContext` Closed Prematurely on URL Change

**Location:** `useEffect` cleanup inside audio upload component (InteractiveAudioPlayer or equivalent)

**Problem:**  
The `useEffect` with `[uploadedUrl]` in its dependency array closes `audioCtxRef.current` every time `uploadedUrl` changes — not only on unmount. This means loading a second audio file closes the AudioContext while it may still be active, causing silent playback failure or Web Audio API errors.

**Faulty code:**
```ts
useEffect(() => {
  return () => {
    if (uploadedUrl) URL.revokeObjectURL(uploadedUrl);
    audioCtxRef.current?.close().catch(() => {});
  };
}, [uploadedUrl]); // ← Wrong: AudioContext closed on every URL change
```

**Fix:**
```ts
// Separate the two concerns:
useEffect(() => {
  return () => {
    audioCtxRef.current?.close().catch(() => {});
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
  };
}, []); // Only on unmount

useEffect(() => {
  return () => {
    if (uploadedUrl) URL.revokeObjectURL(uploadedUrl);
  };
}, [uploadedUrl]);
```

---

## 🟡 Logic Issues

### ISSUE-001 — Object URL Memory Leak in "Open in Browser" Button

**Location:** `CodeBlock` component — Sandbox mode, "Open in Browser" onClick handler

**Problem:**  
Every click on the "Open in Browser" button creates a new `Blob` and calls `URL.createObjectURL()`. This URL is never revoked, meaning it accumulates in memory until the browser tab is closed.

**Faulty code:**
```tsx
onClick={() => {
  if (iframeSrc) {
    const blob = new Blob([iframeSrc], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    // No revokeObjectURL — memory leak
  }
}}
```

**Fix:**
```tsx
const url = URL.createObjectURL(blob);
window.open(url, '_blank');
setTimeout(() => URL.revokeObjectURL(url), 1000);
```

---

### ISSUE-002 — `renderChildrenWithCitations` clones table/row/cell elements

**Location:** `renderChildrenWithCitations` function

**Problem:**  
The exclusion list for `React.cloneElement` only blocks `['img','video','a','iframe','canvas','svg','button']`. Table-related elements (`table`, `thead`, `tbody`, `tr`, `td`, `th`) are NOT excluded. Cloning them with re-mapped children can produce invalid DOM nesting, React warnings, and broken table rendering.

**Faulty code:**
```tsx
if (!['img','video','a','iframe','canvas','svg','button'].includes(node.type)) {
  return React.cloneElement(node, { ...elementProps, children: ... });
}
```

**Fix:**
```tsx
const SKIP_CLONE_TAGS = ['img','video','a','iframe','canvas','svg','button','table','thead','tbody','tr','td','th','colgroup','col'];
if (!SKIP_CLONE_TAGS.includes(node.type)) {
  return React.cloneElement(node, { ...elementProps, children: ... });
}
```

---

## ✅ Confirmed Correct

| Area | Status |
|---|---|
| `mountedRef` in `CodeBlock` | ✅ Correct |
| `active` flag in all `fetchLinkMetadata` useEffects | ✅ Correct |
| Escape key listener cleanup in `ShareableImageOutput` | ✅ Correct |
| `relinkMessageId` in `UnifiedVideoMessageWidget` | ✅ Correct |
| `file.type.startsWith('audio/')` validation | ✅ Correct |
| Phase sync `diff > 0.22` in audio mixer | ✅ Correct |
| `handleFileUpload` — disconnect before rebind | ✅ Correct |
| `progressValue` fallback when `isFailed` | ✅ Correct |
| `if (!steps || steps.length === 0)` guard | ✅ Correct |
| `depth > 8` anti-recursion guard | ✅ Correct |

---

## 📋 Next Step

Proceed with **line-by-line audit** of the full file.
