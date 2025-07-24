import React, { createContext, useContext, useEffect, useState } from 'react';

interface BrandingColors {
  primaryColor: string;
  secondaryColor: string;
  tertiaryColor: string;
}

interface BrandingContextType {
  colors: BrandingColors;
  updateColors: (colors: BrandingColors) => void;
  resetColors: () => void;
  applyColors: (colors: BrandingColors) => void;
}

const defaultColors: BrandingColors = {
  primaryColor: '#195883',   // Matches CSS primary
  secondaryColor: '#30c7b4', // Matches CSS secondary
  tertiaryColor: '#6fca8f',  // Matches CSS accent
};

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
};

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [colors, setColors] = useState<BrandingColors>(defaultColors);

  // Convert hex to HSL for CSS variables
  const hexToHsl = (hex: string): string => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
        default: h = 0;
      }
      h /= 6;
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  const applyColors = (brandingColors: BrandingColors) => {
    const root = document.documentElement;
    
    // Apply primary color
    root.style.setProperty('--primary', hexToHsl(brandingColors.primaryColor));
    root.style.setProperty('--sidebar-primary', hexToHsl(brandingColors.primaryColor));
    
    // Apply secondary color
    root.style.setProperty('--secondary', hexToHsl(brandingColors.secondaryColor));
    
    // Apply tertiary color (using accent for tertiary)
    root.style.setProperty('--accent', hexToHsl(brandingColors.tertiaryColor));

    // Update clinic colors in Tailwind as well
    root.style.setProperty('--clinic-blue', brandingColors.primaryColor);
    root.style.setProperty('--clinic-teal', brandingColors.secondaryColor);
    root.style.setProperty('--clinic-green', brandingColors.tertiaryColor);
  };

  const updateColors = (newColors: BrandingColors) => {
    setColors(newColors);
    applyColors(newColors);
    localStorage.setItem('brandingSettings', JSON.stringify(newColors));
  };

  const resetColors = () => {
    setColors(defaultColors);
    applyColors(defaultColors);
    localStorage.removeItem('brandingSettings');
  };

  // Load saved colors on mount
  useEffect(() => {
    const savedColors = localStorage.getItem('brandingSettings');
    if (savedColors) {
      try {
        const parsedColors = JSON.parse(savedColors);
        setColors(parsedColors);
        applyColors(parsedColors);
      } catch (error) {
        console.error('Error loading saved branding colors:', error);
        applyColors(defaultColors);
      }
    } else {
      applyColors(defaultColors);
    }
  }, []);

  const value: BrandingContextType = {
    colors,
    updateColors,
    resetColors,
    applyColors,
  };

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
};
