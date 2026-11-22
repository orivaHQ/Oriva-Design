import type { DesignData, LogoData } from '../types';

export const starterCanvas: DesignData = {
  version: 1,
  frame: { width: 760, height: 520, color: '#f5f3ee' },
  layers: [
    { id: 'nav', kind: 'card', name: 'Navigation', x: 28, y: 28, width: 704, height: 58, text: '', fill: '#ffffff', color: '#173b3a', fontSize: 14, radius: 16, opacity: 100 },
    { id: 'brand', kind: 'text', name: 'Brand wordmark', x: 50, y: 46, width: 148, height: 28, text: 'Northstar', fill: 'transparent', color: '#173b3a', fontSize: 17, radius: 0, opacity: 100 },
    { id: 'hero-eyebrow', kind: 'text', name: 'Eyebrow', x: 62, y: 144, width: 280, height: 24, text: 'A SMALLER WAY TO TRAVEL', fill: 'transparent', color: '#71817a', fontSize: 10, radius: 0, opacity: 100 },
    { id: 'hero-title', kind: 'text', name: 'Hero title', x: 60, y: 177, width: 390, height: 92, text: 'Find your\nown north.', fill: 'transparent', color: '#173b3a', fontSize: 45, radius: 0, opacity: 100 },
    { id: 'hero-copy', kind: 'text', name: 'Supporting copy', x: 62, y: 286, width: 320, height: 58, text: 'A considered collection of stays for the\nmoments between here and there.', fill: 'transparent', color: '#66756f', fontSize: 14, radius: 0, opacity: 100 },
    { id: 'cta', kind: 'button', name: 'Explore stays button', x: 62, y: 372, width: 152, height: 48, text: 'Explore stays  →', fill: '#173b3a', color: '#ffffff', fontSize: 13, radius: 14, opacity: 100 },
    { id: 'image', kind: 'image', name: 'Featured image', x: 466, y: 128, width: 236, height: 326, text: '', fill: '#e3d9ca', color: '#173b3a', fontSize: 14, radius: 24, opacity: 100 },
    { id: 'image-art', kind: 'circle', name: 'Sun detail', x: 544, y: 205, width: 82, height: 82, text: '', fill: '#c99466', color: '#173b3a', fontSize: 14, radius: 48, opacity: 86 },
  ],
};

export const starterLogo: LogoData = {
  brandName: 'Oriva', tagline: 'Ideas in good company', symbol: 'orbit', primary: '#173b3a', accent: '#c89569',
  background: '#f7f5ef', foreground: '#173b3a', font: 'Manrope', weight: 700, tracking: 0, radius: 44,
  layout: 'horizontal', showTagline: false,
};

export function makeDesignData(kind: 'ui' | 'logo'): DesignData {
  return kind === 'logo' ? { version: 1, logo: { ...starterLogo } } : structuredClone(starterCanvas);
}
