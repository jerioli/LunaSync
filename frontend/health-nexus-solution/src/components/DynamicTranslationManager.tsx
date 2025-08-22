import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEnhancedTranslation } from '@/i18n/enhancedI18n';
import { translationService } from '@/services/translationService';
import { Download, Globe, Loader2, RefreshCw } from 'lucide-react';
import React, { useEffect, useState } from 'react';

export const DynamicTranslationManager: React.FC = () => {
  const { language } = useLanguage();
  const { t, tAsync, preloadTranslations, getStats, setAPIFallback } = useEnhancedTranslation();
  
  const [testText, setTestText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isPreloading, setIsPreloading] = useState(false);
  const [stats, setStats] = useState(getStats());
  const [apiEnabled, setApiEnabled] = useState(true);

  const updateStats = () => {
    setStats(getStats());
  };

  useEffect(() => {
    updateStats();
  }, [language]);

  const handleTestTranslation = async () => {
    if (!testText.trim() || language === 'en') return;
    
    setIsTranslating(true);
    try {
      const result = await translationService.translateText(testText, language);
      setTranslatedText(result);
    } catch (error) {
      console.error('Translation failed:', error);
      setTranslatedText('Translation failed');
    } finally {
      setIsTranslating(false);
      updateStats();
    }
  };

  const handlePreloadTranslations = async () => {
    if (language === 'en') return;
    
    setIsPreloading(true);
    try {
      await preloadTranslations(language);
      updateStats();
    } catch (error) {
      console.error('Preloading failed:', error);
    } finally {
      setIsPreloading(false);
    }
  };

  const handleToggleAPI = () => {
    const newState = !apiEnabled;
    setApiEnabled(newState);
    setAPIFallback(newState);
  };

  const clearCache = () => {
    translationService.clearCache();
    updateStats();
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Dynamic Translation Manager
          </CardTitle>
          <CardDescription>
            Test and manage online translation APIs for missing translations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Current Status */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.currentLanguage.toUpperCase()}</div>
              <div className="text-sm text-muted-foreground">Current Language</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.totalEntries}</div>
              <div className="text-sm text-muted-foreground">Cached Translations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.languages.length}</div>
              <div className="text-sm text-muted-foreground">Languages Cached</div>
            </div>
            <div className="text-center">
              <Badge variant={apiEnabled ? "default" : "secondary"}>
                {apiEnabled ? "API Enabled" : "API Disabled"}
              </Badge>
              <div className="text-sm text-muted-foreground">Translation API</div>
            </div>
          </div>

          {/* API Controls */}
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={handleToggleAPI}
              variant={apiEnabled ? "destructive" : "default"}
              size="sm"
            >
              {apiEnabled ? "Disable" : "Enable"} API Translation
            </Button>
            
            <Button 
              onClick={handlePreloadTranslations}
              disabled={isPreloading || language === 'en'}
              size="sm"
            >
              {isPreloading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Preloading...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Preload Common Terms
                </>
              )}
            </Button>
            
            <Button 
              onClick={clearCache}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Clear Cache
            </Button>
            
            <Button 
              onClick={updateStats}
              variant="outline"
              size="sm"
            >
              Refresh Stats
            </Button>
          </div>

          {/* Test Translation */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="test-text">Test Translation</Label>
              <div className="mt-2 space-y-2">
                <Input
                  id="test-text"
                  placeholder="Enter English text to translate..."
                  value={testText}
                  onChange={(e) => setTestText(e.target.value)}
                />
                <Button 
                  onClick={handleTestTranslation}
                  disabled={isTranslating || !testText.trim() || language === 'en'}
                  className="w-full"
                >
                  {isTranslating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Translating...
                    </>
                  ) : (
                    `Translate to ${language.toUpperCase()}`
                  )}
                </Button>
              </div>
            </div>
            
            {translatedText && (
              <div>
                <Label>Translation Result</Label>
                <Textarea
                  value={translatedText}
                  readOnly
                  className="mt-2 bg-muted"
                  rows={3}
                />
              </div>
            )}
          </div>

          {/* API Information */}
          <div className="space-y-2">
            <h4 className="font-medium">Available Translation APIs:</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              <div>• <strong>MyMemory</strong> - Free tier: 1000 words/day</div>
              <div>• <strong>LibreTranslate</strong> - Open source, rate limited</div>
              <div>• <strong>Google Translate</strong> - Requires API key (most accurate)</div>
            </div>
          </div>

          {/* Usage Tips */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">How it works:</h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>1. Static translations are loaded first from JSON files</li>
              <li>2. Missing translations automatically use online APIs</li>
              <li>3. API translations are cached to avoid repeated requests</li>
              <li>4. Preloading fetches common terms in advance</li>
              <li>5. Falls back through multiple APIs if one fails</li>
            </ul>
          </div>

          {language === 'en' && (
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Switch to Tagalog to test the translation features.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
