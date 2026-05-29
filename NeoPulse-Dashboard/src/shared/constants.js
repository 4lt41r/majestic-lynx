export const VERSION = '1.0.0';

export const DEFAULTS = {
  theme: 'neon-blue',
  animationIntensity: 'medium',
  particlesEnabled: true,
  soundsEnabled: false,
  searchEngine: 'google',
  refreshInterval: 300,        // seconds between auto speed checks
  notes: '',
  privacyDismissed: false,
  quickLinks: [
    { label: 'GitHub',   url: 'https://github.com',           icon: '🐙' },
    { label: 'Gmail',    url: 'https://mail.google.com',      icon: '📧' },
    { label: 'YouTube',  url: 'https://youtube.com',          icon: '▶' },
    { label: 'Maps',     url: 'https://maps.google.com',      icon: '🗺' },
    { label: 'Drive',    url: 'https://drive.google.com',     icon: '💾' },
    { label: 'Reddit',   url: 'https://reddit.com',           icon: '🤖' },
  ],
  widgets: {
    clock:      true,
    network:    true,
    quickLinks: true,
    notes:      true,
    bookmarks:  false,
    weather:    false,
  },
  weatherCity:  '',
  weatherUnits: 'metric',
};

export const SEARCH_ENGINES = {
  google:     'https://www.google.com/search?q=',
  bing:       'https://www.bing.com/search?q=',
  duckduckgo: 'https://duckduckgo.com/?q=',
};

export const PARTICLE_COUNTS = {
  off:    0,
  low:    20,
  medium: 50,
  high:   100,
};

export const PING_URL = 'https://www.google.com/generate_204';

// ~320 KB file with CORS headers — used for download speed estimation
export const DEFAULT_DOWNLOAD_URL = 'https://cdn.jsdelivr.net/npm/react@18.2.0/umd/react.development.js';

// httpbin.org accepts binary POST and has open CORS — used for upload estimation
export const UPLOAD_URL = 'https://httpbin.org/post';

// ipwho.is — free, HTTPS, no key — returns { ip, isp, ... }
export const IP_API_URL = 'https://ipwho.is/';

// wttr.in — free weather, no API key, city name in path
export const WTTR_BASE_URL = 'https://wttr.in/';
