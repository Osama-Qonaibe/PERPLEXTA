import { secureStorage } from "@/lib/storage";
export const safeStorageGet = (key: string): string | null => {
  try {
    return typeof window !== 'undefined' ? secureStorage.getSync(key) : null;
  } catch (e) {
    return null;
  }
};
export const safeStorageSet = (key: string, value: string): void => {
  try {
    if (typeof window !== 'undefined') secureStorage.set(key, value);
  } catch (e) {}
};
export const safeStorageRemove = (key: string): void => {
  try {
    if (typeof window !== 'undefined') secureStorage.remove(key);
  } catch (e) {}
};
