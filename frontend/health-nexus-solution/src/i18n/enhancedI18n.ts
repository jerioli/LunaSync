import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import { translationService } from '../services/translationService';

import en from './locales/en.json';
import tl from './locales/tl.json';

// Enhanced i18n with API fallback
class EnhancedI18n {
  private fallbackToAPI: boolean = true;
  private isInitialized: boolean = false;

  constructor() {
    this.setupI18n();
  }

  private setupI18n() {
    const resources = {
      en: {
        translation: en
      },
      tl: {
        translation: tl
      }
    };

    i18n
      .use(LanguageDetector)
      .use(initReactI18next)
      .init({
        resources,
        fallbackLng: 'en',
        debug: false,
        
        detection: {
          order: ['localStorage', 'navigator', 'htmlTag'],
          caches: ['localStorage'],
        },

        interpolation: {
          escapeValue: false,
        },

        react: {
          useSuspense: false,
        },

        // Custom missing key handler
        saveMissing: true,
        missingKeyHandler: async (lng: string[], ns: string, key: string, fallbackValue: string) => {
          if (this.fallbackToAPI && lng[0] !== 'en') {
            console.log(`Missing translation for key "${key}" in language "${lng[0]}", attempting API translation...`);
            try {
              const translatedText = await translationService.translateText(fallbackValue || key, lng[0]);
              if (translatedText !== fallbackValue) {
                // Add the new translation to the resource bundle
                i18n.addResource(lng[0], ns, key, translatedText);
                console.log(`Added API translation for "${key}": "${translatedText}"`);
              }
            } catch (error) {
              console.warn(`API translation failed for key "${key}":`, error);
            }
          }
        }
      });

    this.isInitialized = true;
  }

  // Enhanced translation function with API fallback
  async translateWithFallback(key: string, options?: any): Promise<string> {
    const currentLng = i18n.language;
    
    // If it's English or the key exists, use normal i18n
    if (currentLng === 'en' || i18n.exists(key)) {
      return String(i18n.t(key, options));
    }

    // Try API translation for missing keys
    if (this.fallbackToAPI && currentLng !== 'en') {
      try {
        const englishText = String(i18n.t(key, { ...options, lng: 'en' }));
        const translatedText = await translationService.translateText(englishText, currentLng);
        
        if (translatedText !== englishText) {
          // Cache the translation
          i18n.addResource(currentLng, 'translation', key, translatedText);
          return translatedText;
        }
      } catch (error) {
        console.warn(`API translation failed for key "${key}":`, error);
      }
    }

    // Fallback to original i18n behavior
    return String(i18n.t(key, options));
  }

  // Preload translations for common terms
  async preloadTranslations(language: string) {
    if (language === 'en') return;

    console.log(`Preloading translations for ${language}...`);
    await translationService.preloadCommonTranslations(language);
    
    // Also preload any missing keys from our static translations
    const missingKeys = this.findMissingKeys(language);
    if (missingKeys.length > 0) {
      console.log(`Found ${missingKeys.length} missing keys, translating...`);
      await this.translateMissingKeys(missingKeys, language);
    }
  }

  // Find keys that exist in English but not in target language
  private findMissingKeys(targetLang: string): string[] {
    const englishKeys = this.getAllKeys(en);
    const targetKeys = targetLang === 'tl' ? this.getAllKeys(tl) : [];
    
    return englishKeys.filter(key => !targetKeys.includes(key));
  }

  // Get all keys from a translation object (flattened)
  private getAllKeys(obj: any, prefix: string = ''): string[] {
    let keys: string[] = [];
    
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        keys = keys.concat(this.getAllKeys(obj[key], prefix ? `${prefix}.${key}` : key));
      } else {
        keys.push(prefix ? `${prefix}.${key}` : key);
      }
    }
    
    return keys;
  }

  // Translate missing keys using API
  private async translateMissingKeys(keys: string[], targetLang: string) {
    const batchSize = 10; // Process in small batches to avoid rate limits
    
    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize);
      
      for (const key of batch) {
        try {
          const englishText = String(i18n.t(key, { lng: 'en' }));
          if (englishText && englishText !== key) {
            const translatedText = await translationService.translateText(englishText, targetLang);
            if (translatedText !== englishText) {
              i18n.addResource(targetLang, 'translation', key, translatedText);
              console.log(`Added missing translation: ${key} -> ${translatedText}`);
            }
          }
        } catch (error) {
          console.warn(`Failed to translate key "${key}":`, error);
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Longer delay between batches
      if (i + batchSize < keys.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }

  // Toggle API fallback
  setAPIFallback(enabled: boolean) {
    this.fallbackToAPI = enabled;
  }

  // Get translation statistics
  getStats() {
    const stats = translationService.getCacheStats();
    return {
      ...stats,
      currentLanguage: i18n.language,
      loadedLanguages: i18n.languages,
      fallbackEnabled: this.fallbackToAPI
    };
  }

  // Get the i18n instance
  getInstance() {
    return i18n;
  }
}

// Create enhanced i18n instance
export const enhancedI18n = new EnhancedI18n();

// Export the traditional i18n instance for compatibility
export default i18n;

// Enhanced hook for components
export const useEnhancedTranslation = () => {
  const translate = () => {
    // For immediate synchronous needs, use regular i18n
    const t = (key: string, options?: any) => String(i18n.t(key, options));
    
    // For dynamic translation, use the enhanced version
    const tAsync = (key: string, options?: any) => {
      return enhancedI18n.translateWithFallback(key, options);
    };
    
    return { t, tAsync };
  };

  return {
    ...translate(),
    preloadTranslations: (lang: string) => enhancedI18n.preloadTranslations(lang),
    getStats: () => enhancedI18n.getStats(),
    setAPIFallback: (enabled: boolean) => enhancedI18n.setAPIFallback(enabled)
  };
};
