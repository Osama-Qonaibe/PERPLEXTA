/**
 * MARKETPLACE FIX NOTES - Applied in MarketplacePage.tsx
 * 
 * Fix #1: fetchItems — Remove DEFAULT_ITEMS fallback (items with negative IDs)
 *   OLD:
 *     const deletedVirtuals = JSON.parse(localStorage.getItem('perplexta_deleted_virtual_items') || '[]');
 *     const availableDefaults = DEFAULT_ITEMS.filter(di => !deletedVirtuals.includes(di.id));
 *     if (res.ok) {
 *       const combined = [...data, ...availableDefaults.filter(di => !data.some((db: any) => db.title_en === di.title_en))];
 *       setItems(combined);
 *     } else { setItems(availableDefaults); }
 * 
 *   NEW:
 *     if (res.ok) { setItems(data); }
 *     else { setItems([]); }
 * 
 * Fix #2: getProductHighlights — Remove id % 3 random logic
 *   OLD:
 *     if (item.views > 15 && !list.includes('trending')) list.push('trending');
 *     if (item.id % 3 === 0 && !list.includes('featured')) list.push('featured');
 *     if (item.id % 5 === 0 && !list.includes('exclusive')) list.push('exclusive');
 * 
 *   NEW:
 *     Only use item.highlight_tag from DB, fallback to 'new' if empty.
 *     No random id-based logic.
 * 
 * Fix #3: getLicensePriceMultiplier — Frontend should mirror server logic
 *   OLD: return 1;
 *   NEW:
 *     switch (license) {
 *       case 'extended': return 2.5;
 *       case 'gpl': return 1.5;
 *       case 'plr': return 5.0;
 *       default: return 1.0;
 *     }
 * 
 * These changes are documented here.
 * Apply them manually in MarketplacePage.tsx or run the migration patch.
 */

export {};
