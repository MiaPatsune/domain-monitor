// 网站图标 SVG（蓝白主题 + 时钟地球）
export const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1a73e8"/>
      <stop offset="100%" stop-color="#4285f4"/>
    </linearGradient>
    <linearGradient id="glass" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.3"/>
      <stop offset="50%" stop-color="#ffffff" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="256" height="256" rx="56" fill="url(#bg)"/>
  <rect width="256" height="128" rx="56" fill="url(#glass)"/>
  <circle cx="128" cy="128" r="68" fill="none" stroke="#ffffff" stroke-width="6" opacity="0.95"/>
  <ellipse cx="128" cy="128" rx="26" ry="68" fill="none" stroke="#ffffff" stroke-width="3" opacity="0.55"/>
  <ellipse cx="128" cy="128" rx="50" ry="68" fill="none" stroke="#ffffff" stroke-width="2.5" opacity="0.4"/>
  <line x1="60" y1="128" x2="196" y2="128" stroke="#ffffff" stroke-width="2.5" opacity="0.55"/>
  <line x1="72" y1="100" x2="184" y2="100" stroke="#ffffff" stroke-width="2" opacity="0.4"/>
  <line x1="72" y1="156" x2="184" y2="156" stroke="#ffffff" stroke-width="2" opacity="0.4"/>
  <line x1="128" y1="128" x2="128" y2="78" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/>
  <line x1="128" y1="128" x2="168" y2="148" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/>
  <circle cx="128" cy="128" r="6" fill="#ffffff"/>
  <circle cx="128" cy="68" r="3.5" fill="#ffffff" opacity="0.9"/>
  <circle cx="188" cy="128" r="3" fill="#ffffff" opacity="0.7"/>
  <circle cx="128" cy="188" r="3" fill="#ffffff" opacity="0.7"/>
  <circle cx="68" cy="128" r="3" fill="#ffffff" opacity="0.7"/>
</svg>`;
