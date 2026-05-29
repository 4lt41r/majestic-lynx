export const VERSION = '1.0.0';

export const DEFAULTS = {
  theme: 'neon-blue',
  animationIntensity: 'medium',
  particlesEnabled: true,
  soundsEnabled: false,
  searchEngine: 'google',
  refreshInterval: 300,
  notes: '',
  privacyDismissed: false,
  quickLinks: [
    { label: 'GitHub',  url: 'https://github.com',          icon: '🐙' },
    { label: 'Gmail',   url: 'https://mail.google.com',     icon: '📧' },
    { label: 'YouTube', url: 'https://youtube.com',         icon: '▶'  },
    { label: 'Maps',    url: 'https://maps.google.com',     icon: '🗺' },
    { label: 'Drive',   url: 'https://drive.google.com',    icon: '💾' },
    { label: 'Reddit',  url: 'https://reddit.com',          icon: '🤖' },
  ],
  widgets: {
    clock: true, network: true, quickLinks: true,
    notes: true, bookmarks: false, weather: false,
  },
  weatherCity:  '',
  weatherUnits: 'metric',
  sceneMode:    'toon',
};

export const SEARCH_ENGINES = {
  google:     'https://www.google.com/search?q=',
  bing:       'https://www.bing.com/search?q=',
  duckduckgo: 'https://duckduckgo.com/?q=',
};

export const PARTICLE_COUNTS = { off: 0, low: 20, medium: 50, high: 100 };
export const SCENE_MODES      = ['toon', 'billboard', 'gltf'];

export const PING_URL             = 'https://www.google.com/generate_204';
export const DEFAULT_DOWNLOAD_URL = 'https://cdn.jsdelivr.net/npm/react@18.2.0/umd/react.development.js';
export const UPLOAD_URL           = 'https://httpbin.org/post';
export const IP_API_URL           = 'https://ipwho.is/';
export const IP_FALLBACK_URL      = 'https://api.ipify.org?format=json';
export const WTTR_BASE_URL        = 'https://wttr.in/';
export const UPLOAD_TIMEOUT_MS    = 10000;
