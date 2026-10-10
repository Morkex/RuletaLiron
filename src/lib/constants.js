/** Pack SVG por defecto (data URL) — estética sobre MTG genérico */
function packSvg(title, c1, c2, accent) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="340" viewBox="0 0 240 340">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
    <linearGradient id="shine" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="rgba(255,255,255,0.25)"/>
      <stop offset="40%" stop-color="rgba(255,255,255,0)"/>
    </linearGradient>
  </defs>
  <rect width="240" height="340" rx="14" fill="#0b1220"/>
  <rect x="8" y="8" width="224" height="324" rx="10" fill="url(#g)" stroke="${accent}" stroke-width="3"/>
  <rect x="8" y="8" width="224" height="324" rx="10" fill="url(#shine)"/>
  <rect x="28" y="40" width="184" height="120" rx="6" fill="rgba(0,0,0,0.35)" stroke="${accent}" stroke-width="1.5"/>
  <text x="120" y="210" text-anchor="middle" fill="${accent}" font-family="Georgia, serif" font-size="18" font-weight="700">${title}</text>
  <text x="120" y="238" text-anchor="middle" fill="#f0d78c" font-family="Georgia, serif" font-size="12" letter-spacing="2">BOOSTER PACK</text>
  <circle cx="120" cy="280" r="18" fill="none" stroke="${accent}" stroke-width="2"/>
  <path d="M120 268 L124 278 L136 278 L126 286 L130 298 L120 290 L110 298 L114 286 L104 278 L116 278 Z" fill="${accent}"/>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const DEFAULT_PRIZES = [
  {
    id: "p1",
    name: "Bloomburrow",
    image: packSvg("Bloomburrow", "#2d5a3d", "#1a3324", "#8fd4a0"),
  },
  {
    id: "p2",
    name: "Modern Horizons 3",
    image: packSvg("MH3", "#2a3a6e", "#151e38", "#8eb4ff"),
  },
  {
    id: "p3",
    name: "Kaldheim",
    image: packSvg("Kaldheim", "#3a4a6a", "#1c2438", "#c0d4f0"),
  },
];

export const MUSIC_PRESETS = [
  {
    id: "ambient",
    label: "Drone místico (Web Audio)",
    url: "ambient",
  },
  {
    id: "custom1",
    label: "URL personalizada 1",
    url: "",
  },
  {
    id: "custom2",
    label: "URL personalizada 2",
    url: "",
  },
];

export const CONFIG_DEFAULTS = {
  spinDuration: 8,
  musicVolume: 0.3,
  sfxVolume: 0.7,
  musicTrackId: "ambient",
  customMusicUrl1: "",
  customMusicUrl2: "",
  confettiEnabled: true,
  autoRemoveWinner: false,
  musicEnabled: false,
};

export const WHEEL_COLORS = [
  "#1e3a5f",
  "#3d1f3d",
  "#1f3d2e",
  "#4a2c1a",
  "#2a2a4a",
  "#3d2e1f",
  "#1a3d3d",
  "#4a1a2e",
  "#2e3d1a",
  "#1a2e4a",
];

export const TABS = [
  { id: "sorteo", label: "Sorteo / Ruleta" },
  { id: "participantes", label: "Lista de Participantes" },
  { id: "premios", label: "Premios" },
  { id: "config", label: "Configuración" },
];
