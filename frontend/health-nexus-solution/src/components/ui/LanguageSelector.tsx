import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { Languages } from 'lucide-react';
import React from 'react';

interface LanguageSelectorProps {
  variant?: 'button' | 'select';
  size?: 'sm' | 'default' | 'lg';
  showIcon?: boolean;
  showLabel?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'button',
  size = 'sm',
  showIcon = true,
  showLabel = false,
}) => {
  const { language, setLanguage, t } = useLanguage();

  const languages = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'tl', name: 'Tagalog', nativeName: 'Tagalog' },
  ];

  const getCurrentLanguage = () => {
    return languages.find(lang => lang.code === language) || languages[0];
  };

  const toggleLanguage = () => {
    const nextLanguage = language === 'en' ? 'tl' : 'en';
    setLanguage(nextLanguage);
  };

  if (variant === 'select') {
    return (
      <div className="flex items-center gap-2">
        {showLabel && (
          <label className="text-sm font-medium">{t('common.language')}</label>
        )}
        <Select value={language} onValueChange={(value: 'en' | 'tl') => setLanguage(value)}>
          <SelectTrigger className={`w-full ${size === 'sm' ? 'h-8' : size === 'lg' ? 'h-12' : 'h-10'}`}>
            <div className="flex items-center gap-2">
              {showIcon && <Languages className="h-4 w-4" />}
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            {languages.map((lang) => (
              <SelectItem key={lang.code} value={lang.code}>
                <div className="flex items-center gap-2">
                  <span>{lang.nativeName}</span>
                  <span className="text-muted-foreground text-xs">({lang.name})</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size={size}
      onClick={toggleLanguage}
      title={`${t('common.language')}: ${getCurrentLanguage().nativeName}`}
      className="flex items-center gap-2"
    >
      {showIcon && <Languages className="h-4 w-4" />}
      <span className={`${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
        {showLabel ? getCurrentLanguage().nativeName : getCurrentLanguage().code.toUpperCase()}
      </span>
    </Button>
  );
};
