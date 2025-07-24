// Translation Service using online APIs
// Supports dynamic translation with fallback to static translations

interface TranslationCache {
  [key: string]: string;
}

interface TranslationResponse {
  translatedText: string;
  success: boolean;
  source?: string;
}

class TranslationService {
  private cache: Map<string, TranslationCache> = new Map();
  private readonly CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
  private cacheTimestamp: number = Date.now();

  // MyMemory API - Free tier: 1000 words/day
  private async translateWithMyMemory(text: string, targetLang: string): Promise<TranslationResponse> {
    try {
      const sourceLang = 'en';
      const langPair = `${sourceLang}|${targetLang}`;
      
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.responseStatus === "200" && data.responseData?.translatedText) {
        return {
          translatedText: data.responseData.translatedText,
          success: true,
          source: 'MyMemory'
        };
      }
      
      throw new Error('Translation failed');
    } catch (error) {
      console.warn('MyMemory translation failed:', error);
      return { translatedText: text, success: false };
    }
  }

  // LibreTranslate API - Free tier available
  private async translateWithLibreTranslate(text: string, targetLang: string): Promise<TranslationResponse> {
    try {
      const response = await fetch('https://libretranslate.com/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          source: 'en',
          target: targetLang,
          format: 'text'
        })
      });
      
      const data = await response.json();
      
      if (data.translatedText) {
        return {
          translatedText: data.translatedText,
          success: true,
          source: 'LibreTranslate'
        };
      }
      
      throw new Error('Translation failed');
    } catch (error) {
      console.warn('LibreTranslate translation failed:', error);
      return { translatedText: text, success: false };
    }
  }

  // Google Translate API (requires API key)
  private async translateWithGoogle(text: string, targetLang: string): Promise<TranslationResponse> {
    try {
      const apiKey = process.env.REACT_APP_GOOGLE_TRANSLATE_API_KEY;
      if (!apiKey) {
        throw new Error('Google Translate API key not configured');
      }

      const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          source: 'en',
          target: targetLang,
          format: 'text'
        })
      });
      
      const data = await response.json();
      
      if (data.data?.translations?.[0]?.translatedText) {
        return {
          translatedText: data.data.translations[0].translatedText,
          success: true,
          source: 'Google'
        };
      }
      
      throw new Error('Translation failed');
    } catch (error) {
      console.warn('Google Translate failed:', error);
      return { translatedText: text, success: false };
    }
  }

  // Get cache key for text and language
  private getCacheKey(text: string, targetLang: string): string {
    return `${targetLang}:${text.toLowerCase().trim()}`;
  }

  // Check if cache is expired
  private isCacheExpired(): boolean {
    return Date.now() - this.cacheTimestamp > this.CACHE_EXPIRY;
  }

  // Clear expired cache
  private clearExpiredCache(): void {
    if (this.isCacheExpired()) {
      this.cache.clear();
      this.cacheTimestamp = Date.now();
    }
  }

  // Main translation method with fallback chain
  async translateText(text: string, targetLang: string): Promise<string> {
    // Return original text if target language is English
    if (targetLang === 'en') {
      return text;
    }

    // Convert language codes
    const langCode = targetLang === 'tl' ? 'tl' : targetLang;
    
    // Check cache first
    this.clearExpiredCache();
    const cacheKey = this.getCacheKey(text, langCode);
    const cachedTranslation = this.cache.get(cacheKey);
    
    if (cachedTranslation) {
      return cachedTranslation[text] || text;
    }

    // Try translation APIs in order of preference
    const translationMethods = [
      () => this.translateWithMyMemory(text, langCode),
      () => this.translateWithLibreTranslate(text, langCode === 'tl' ? 'fil' : langCode), // LibreTranslate uses 'fil' for Filipino
      () => this.translateWithGoogle(text, langCode)
    ];

    for (const method of translationMethods) {
      try {
        const result = await method();
        if (result.success) {
          // Cache the successful translation
          if (!this.cache.has(cacheKey)) {
            this.cache.set(cacheKey, {});
          }
          this.cache.get(cacheKey)![text] = result.translatedText;
          
          console.log(`Translation successful via ${result.source}: "${text}" -> "${result.translatedText}"`);
          return result.translatedText;
        }
      } catch (error) {
        console.warn('Translation method failed, trying next...', error);
        continue;
      }
    }

    // If all APIs fail, return original text
    console.warn('All translation APIs failed, returning original text:', text);
    return text;
  }

  // Batch translate multiple texts
  async translateBatch(texts: string[], targetLang: string): Promise<Record<string, string>> {
    const translations: Record<string, string> = {};
    
    // Process translations with delay to respect API rate limits
    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];
      translations[text] = await this.translateText(text, targetLang);
      
      // Add delay between requests to avoid rate limiting
      if (i < texts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
      }
    }
    
    return translations;
  }

  // Pre-load common translations
  async preloadCommonTranslations(targetLang: string): Promise<void> {
    const commonTexts = [
      // Navigation
      'Dashboard', 'Appointments', 'Patients', 'Doctors', 'Settings', 'Logout',
      
      // Common actions
      'Save', 'Cancel', 'Delete', 'Edit', 'Add', 'Search', 'Filter', 'Submit',
      
      // Appointment related
      'Schedule Appointment', 'View Details', 'Confirm', 'Pending', 'Completed',
      
      // Chatbot common phrases
      'How can I help you?', 'Please select an option', 'Thank you', 'Goodbye',
      
      // Form fields
      'Name', 'Email', 'Phone', 'Date', 'Time', 'Notes', 'Address'
    ];

    console.log(`Preloading ${commonTexts.length} common translations for ${targetLang}...`);
    await this.translateBatch(commonTexts, targetLang);
    console.log('Preloading complete');
  }

  // Clear all cached translations
  clearCache(): void {
    this.cache.clear();
    this.cacheTimestamp = Date.now();
  }

  // Get cache statistics
  getCacheStats(): { totalEntries: number, languages: string[] } {
    const languages = Array.from(this.cache.keys()).map(key => key.split(':')[0]);
    return {
      totalEntries: this.cache.size,
      languages: [...new Set(languages)]
    };
  }
}

// Create singleton instance
export const translationService = new TranslationService();

// Helper function for React components
export const useTranslationAPI = () => {
  const translateText = (text: string, targetLang: string) => {
    return translationService.translateText(text, targetLang);
  };

  const preloadTranslations = (targetLang: string) => {
    return translationService.preloadCommonTranslations(targetLang);
  };

  return {
    translateText,
    preloadTranslations,
    clearCache: () => translationService.clearCache(),
    getCacheStats: () => translationService.getCacheStats()
  };
};
