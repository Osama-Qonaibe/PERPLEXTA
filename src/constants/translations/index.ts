import { ar } from './ar';
import { en } from './en';

export const translations = {
  ar,
  en
};

export type TranslationKey = keyof typeof en;
