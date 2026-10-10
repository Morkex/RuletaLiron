/** Premios de ejemplo — imágenes en public/prizes (desde imgtest) */
export const DEFAULT_PRIZES = [
  {
    id: "p1",
    name: "Foundations",
    image: "/prizes/foundations.webp",
  },
  {
    id: "p2",
    name: "Lorwyn Collector",
    image: "/prizes/lorwyn-collector.jpg",
  },
  {
    id: "p3",
    name: "Marvel",
    image: "/prizes/marvel.webp",
  },
  {
    id: "p4",
    name: "Ravnica",
    image: "/prizes/ravnica.webp",
  },
  {
    id: "p5",
    name: "Reality Fracture",
    image: "/prizes/reality-fracture.webp",
  },
  {
    id: "p6",
    name: "Tarkir",
    image: "/prizes/tarkir.webp",
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

/**
 * Paleta de respaldo. En la ruleta se usan colores aleatorios
 * generados con randomWheelColors().
 */
export const WHEEL_COLORS = [
  "#1e3a5f",
  "#6b2d3c",
  "#2d5a3d",
  "#5c3d1e",
  "#3d2a5c",
  "#1a4a4a",
  "#5a2a4a",
  "#4a4a1e",
  "#2a3d5c",
  "#5c1e2e",
  "#1e4a2e",
  "#4a2e1e",
  "#2e1e4a",
  "#1e3d4a",
  "#4a3d1e",
  "#3d1e3d",
];

/** Genera N colores oscuros y saturados (legibles con texto claro). */
export function randomWheelColors(count) {
  if (count <= 0) return [];
  const colors = [];
  const usedHues = [];

  for (let i = 0; i < count; i++) {
    const buf = new Uint32Array(2);
    crypto.getRandomValues(buf);

    let hue = buf[0] % 360;
    for (let attempt = 0; attempt < 8; attempt++) {
      const tooClose = usedHues.some((h) => {
        const d = Math.min(Math.abs(h - hue), 360 - Math.abs(h - hue));
        return d < 28;
      });
      if (!tooClose || usedHues.length === 0) break;
      hue = (hue + 47 + (buf[1] % 30)) % 360;
    }
    usedHues.push(hue);

    const sat = 48 + (buf[1] % 28);
    const light = 26 + (buf[0] % 14);
    colors.push(`hsl(${hue} ${sat}% ${light}%)`);
  }

  return colors;
}

export const TABS = [
  { id: "sorteo", label: "Sorteo / Ruleta" },
  { id: "participantes", label: "Lista de Participantes" },
  { id: "premios", label: "Premios" },
  { id: "config", label: "Configuración" },
];
