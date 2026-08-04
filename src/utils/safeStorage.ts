export const safeStorageGet = (key: string): string | null => {
  try {
    return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
  } catch (e) {
    return null;
  }
};
export const safeStorageSet = (key: string, value: string): void => {
  try {
    if (typeof window !== 'undefined') localStorage.setItem(key, value);
  } catch (e) {}
};
export const safeStorageRemove = (key: string): void => {
  try {
    if (typeof window !== 'undefined') localStorage.removeItem(key);
  } catch (e) {}
};
