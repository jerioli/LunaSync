# Dynamic Translation System

This project now includes a dynamic translation system that can automatically translate missing text using online APIs instead of requiring all translations to be manually written in JSON files.

## How It Works

1. **Static Translations First**: The system first checks for translations in the static JSON files (`en.json`, `tl.json`)
2. **API Fallback**: If a translation is missing, it automatically calls online translation APIs
3. **Caching**: API translations are cached to avoid repeated requests
4. **Multiple APIs**: Falls back through multiple translation services for reliability

## Available Translation APIs

### 1. MyMemory Translation API (Primary)
- **Free tier**: 1000 words per day
- **Languages**: Supports English to Tagalog (en|tl)
- **URL**: `https://api.mymemory.translated.net/`
- **No API key required**

### 2. LibreTranslate (Secondary)
- **Free tier**: Rate limited
- **Languages**: Supports Filipino (fil) for Tagalog
- **URL**: `https://libretranslate.com/`
- **No API key required**

### 3. Google Translate API (Optional)
- **Most accurate**: Best translation quality
- **Requires**: API key and billing setup
- **Setup**: Add `REACT_APP_GOOGLE_TRANSLATE_API_KEY` to your `.env` file

## Usage

### For Developers

1. **Use the enhanced translation hook:**
```tsx
import { useEnhancedTranslation } from '@/i18n/enhancedI18n';

const MyComponent = () => {
  const { t, tAsync } = useEnhancedTranslation();
  
  // Synchronous (existing behavior)
  const text = t('common.save');
  
  // Asynchronous with API fallback
  const [translatedText, setTranslatedText] = useState('');
  useEffect(() => {
    tAsync('common.save').then(setTranslatedText);
  }, []);
  
  return <div>{translatedText}</div>;
};
```

2. **Import the translation service directly:**
```tsx
import { translationService } from '@/services/translationService';

// Translate any text
const translated = await translationService.translateText('Hello World', 'tl');
```

### For Users

1. **Go to Settings → Translations tab**
2. **Test translations**: Enter English text to see it translated
3. **Preload common terms**: Click "Preload Common Terms" to fetch translations for frequently used words
4. **Monitor cache**: See how many translations are cached
5. **Enable/Disable API**: Toggle online translation on/off

## Benefits

- **Reduced manual work**: No need to manually translate every single text
- **Automatic coverage**: Missing translations are handled automatically
- **Offline capability**: Cached translations work without internet
- **Cost effective**: Uses free APIs with smart caching
- **Fallback reliability**: Multiple APIs ensure translations work even if one fails

## Rate Limits & Considerations

- **MyMemory**: 1000 words/day free
- **LibreTranslate**: Rate limited, exact limits vary
- **Caching**: Translations are cached for 24 hours to minimize API calls
- **Batch processing**: Large translation jobs are processed in small batches

## API Integration Examples

### MyMemory API
```
GET https://api.mymemory.translated.net/get?q=Hello&langpair=en|tl
```

### LibreTranslate API
```
POST https://libretranslate.com/translate
{
  "q": "Hello",
  "source": "en",
  "target": "fil",
  "format": "text"
}
```

### Google Translate API (with API key)
```
POST https://translation.googleapis.com/language/translate/v2?key=YOUR_KEY
{
  "q": "Hello",
  "source": "en",
  "target": "tl",
  "format": "text"
}
```

## Files Added

- `src/services/translationService.ts` - Core translation service with API integrations
- `src/i18n/enhancedI18n.ts` - Enhanced i18n with API fallback
- `src/components/DynamicTranslationManager.tsx` - UI for managing translations
- Updated `src/pages/UserSettings.tsx` - Added translations tab

## Environment Variables (Optional)

Add to your `.env` file for Google Translate:
```
REACT_APP_GOOGLE_TRANSLATE_API_KEY=your_google_api_key_here
```

## Testing

1. Switch language to Tagalog
2. Go to Settings → Translations
3. Enter English text in the test field
4. Click "Translate to TL" to see API translation in action
5. Check the cache statistics to see how many translations are stored

This system greatly reduces the manual effort required for internationalization while providing a seamless user experience!
