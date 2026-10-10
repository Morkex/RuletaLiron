/** Layout de sala: mesas (rectángulos) + sillas (asientos) en % del lienzo. */

export const TABLE_COLORS = [
  { id: "ink", label: "Negro", value: "#1c1c1e" },
  { id: "walnut", label: "Nogal", value: "#6b4423" },
  { id: "oak", label: "Roble", value: "#a67c52" },
  { id: "forest", label: "Verde", value: "#1a4a32" },
  { id: "slate", label: "Pizarra", value: "#3d4f5f" },
  { id: "wine", label: "Burdeos", value: "#5c2430" },
  { id: "navy", label: "Azul", value: "#1e3a5f" },
  { id: "gold", label: "Dorado", value: "#8a6a2a" },
];

let _seq = 0;
export function uid(prefix = "id") {
  _seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${_seq}`;
}

/** 4 sillas en los lados largos (2 izq + 2 der), típico dorso vertical. */
export function defaultSeatsForTable(table, count = 4) {
  const seats = [];
  const left = table.x;
  const right = table.x + table.w;
  const top = table.y + table.h * 0.22;
  const bottom = table.y + table.h * 0.78;
  const midY1 = table.y + table.h * 0.35;
  const midY2 = table.y + table.h * 0.65;

  const spots =
    count <= 2
      ? [
          { x: left, y: midY1 },
          { x: right, y: midY2 },
        ]
      : count === 3
        ? [
            { x: left, y: midY1 },
            { x: left, y: midY2 },
            { x: right, y: (midY1 + midY2) / 2 },
          ]
        : [
            { x: left, y: top },
            { x: left, y: bottom },
            { x: right, y: top },
            { x: right, y: bottom },
            ...(count > 4
              ? Array.from({ length: count - 4 }, (_, i) => ({
                  x: table.x + table.w / 2,
                  y: table.y + ((i + 1) / (count - 3)) * table.h,
                }))
              : []),
          ];

  for (let i = 0; i < Math.min(count, spots.length); i++) {
    seats.push({
      id: uid("seat"),
      tableId: table.id,
      x: clamp(spots[i].x, 0, 100),
      y: clamp(spots[i].y, 0, 100),
    });
  }
  return seats;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export function createTable({
  x = 10,
  y = 10,
  w = 14,
  h = 26,
  color = TABLE_COLORS[2].value,
  label = "",
  seatCount = 4,
} = {}) {
  const table = {
    id: uid("table"),
    x,
    y,
    w,
    h,
    color,
    label,
  };
  return { table, seats: defaultSeatsForTable(table, seatCount) };
}

/** Layout tipo croquis: 1 mesa grande + 4 pequeñas (4 sillas c/u). */
export function createDefaultRoomLayout() {
  const pieces = [
    createTable({
      x: 10,
      y: 18,
      w: 16,
      h: 58,
      color: "#1c1c1e",
      label: "Mesa A",
      seatCount: 4,
    }),
    createTable({
      x: 42,
      y: 12,
      w: 16,
      h: 30,
      color: "#a67c52",
      label: "Mesa B",
      seatCount: 4,
    }),
    createTable({
      x: 68,
      y: 12,
      w: 16,
      h: 30,
      color: "#a67c52",
      label: "Mesa C",
      seatCount: 4,
    }),
    createTable({
      x: 42,
      y: 54,
      w: 16,
      h: 30,
      color: "#a67c52",
      label: "Mesa D",
      seatCount: 4,
    }),
    createTable({
      x: 68,
      y: 54,
      w: 16,
      h: 30,
      color: "#a67c52",
      label: "Mesa E",
      seatCount: 4,
    }),
  ];

  return {
    tables: pieces.map((p) => p.table),
    seats: pieces.flatMap((p) => p.seats),
  };
}

/** Solo las 4 mesas marrones en cuadrícula 2×2. */
export function createFourBrownLayout() {
  const pieces = [
    createTable({
      x: 22,
      y: 12,
      w: 16,
      h: 30,
      color: "#a67c52",
      label: "Mesa A",
      seatCount: 4,
    }),
    createTable({
      x: 58,
      y: 12,
      w: 16,
      h: 30,
      color: "#a67c52",
      label: "Mesa B",
      seatCount: 4,
    }),
    createTable({
      x: 22,
      y: 54,
      w: 16,
      h: 30,
      color: "#a67c52",
      label: "Mesa C",
      seatCount: 4,
    }),
    createTable({
      x: 58,
      y: 54,
      w: 16,
      h: 30,
      color: "#a67c52",
      label: "Mesa D",
      seatCount: 4,
    }),
  ];

  return {
    tables: pieces.map((p) => p.table),
    seats: pieces.flatMap((p) => p.seats),
  };
}

export function emptyRoomLayout() {
  return { tables: [], seats: [] };
}

/* ─── Plantillas de sala ─── */

export const ROOM_TEMPLATES_STORAGE = "ruletaliron-room-templates-v1";
export const CUSTOM_TEMPLATE_SLOTS = 6;

export const BUILTIN_ROOM_TEMPLATES = [
  {
    id: "builtin-5",
    name: "Grande + 4 marrones",
    description: "Mesa negra grande y cuatro marrones",
  },
  {
    id: "builtin-4",
    name: "4 mesas marrones",
    description: "Solo las cuatro mesas pequeñas",
  },
];

export function buildBuiltinLayout(templateId) {
  if (templateId === "builtin-4") return createFourBrownLayout();
  return createDefaultRoomLayout();
}

/** Copia profunda con IDs nuevos (al aplicar plantilla). */
export function cloneLayoutFresh(layout) {
  const normalized = normalizeRoomLayout(layout);
  const idMap = new Map();
  const tables = normalized.tables.map((t) => {
    const nid = uid("table");
    idMap.set(t.id, nid);
    return { ...t, id: nid };
  });
  const seats = normalized.seats.map((s) => ({
    ...s,
    id: uid("seat"),
    tableId: idMap.get(s.tableId) || s.tableId,
  }));
  return { tables, seats };
}

function emptyCustomSlots() {
  return Array.from({ length: CUSTOM_TEMPLATE_SLOTS }, (_, i) => ({
    id: `custom-${i + 1}`,
    slot: i + 1,
    name: "",
    layout: null,
    updatedAt: null,
  }));
}

export function loadRoomTemplatesState() {
  try {
    const raw = localStorage.getItem(ROOM_TEMPLATES_STORAGE);
    if (!raw) {
      return {
        activeId: "builtin-5",
        customSlots: emptyCustomSlots(),
      };
    }
    const data = JSON.parse(raw);
    const base = emptyCustomSlots();
    const saved = Array.isArray(data.customSlots) ? data.customSlots : [];
    const customSlots = base.map((slot, i) => {
      const s = saved.find((x) => x.id === slot.id) || saved[i];
      if (!s?.layout) return slot;
      return {
        ...slot,
        name: String(s.name || `Personalizada ${slot.slot}`).slice(0, 40),
        layout: normalizeRoomLayout(s.layout),
        updatedAt: s.updatedAt || null,
      };
    });
    const activeId = String(data.activeId || "builtin-5");
    return { activeId, customSlots };
  } catch {
    return {
      activeId: "builtin-5",
      customSlots: emptyCustomSlots(),
    };
  }
}

export function saveRoomTemplatesState(state) {
  try {
    localStorage.setItem(
      ROOM_TEMPLATES_STORAGE,
      JSON.stringify({
        activeId: state.activeId,
        customSlots: state.customSlots.map((s) => ({
          id: s.id,
          slot: s.slot,
          name: s.name,
          layout: s.layout,
          updatedAt: s.updatedAt,
        })),
      }),
    );
  } catch {
    /* ignore */
  }
}

export function resolveTemplateLayout(templateId, customSlots) {
  const builtin = BUILTIN_ROOM_TEMPLATES.find((t) => t.id === templateId);
  if (builtin) return cloneLayoutFresh(buildBuiltinLayout(templateId));
  const custom = customSlots?.find((s) => s.id === templateId);
  if (custom?.layout) return cloneLayoutFresh(custom.layout);
  return cloneLayoutFresh(createDefaultRoomLayout());
}

export function listAllTemplates(customSlots) {
  const builtins = BUILTIN_ROOM_TEMPLATES.map((t) => ({
    ...t,
    builtin: true,
    filled: true,
  }));
  const customs = (customSlots || emptyCustomSlots()).map((s) => ({
    id: s.id,
    name: s.layout
      ? s.name || `Personalizada ${s.slot}`
      : `Slot ${s.slot} (vacío)`,
    description: s.layout
      ? `${s.layout.tables?.length || 0} mesas · ${s.layout.seats?.length || 0} sillas`
      : "Sin guardar",
    builtin: false,
    filled: Boolean(s.layout),
    slot: s.slot,
  }));
  return [...builtins, ...customs];
}

/** Si el plano guardado tiene mesas enormes (plantilla antigua), las reduce. */
function shrinkOversizedLayout(layout) {
  if (!layout.tables.length) return layout;
  const avgW =
    layout.tables.reduce((a, t) => a + t.w, 0) / layout.tables.length;
  const avgH =
    layout.tables.reduce((a, t) => a + t.h, 0) / layout.tables.length;
  if (avgW <= 18 && avgH <= 40) return layout;

  const scale = 0.68;
  const cx = 50;
  const cy = 50;
  const map = (x, y) => ({
    x: cx + (x - cx) * scale,
    y: cy + (y - cy) * scale,
  });

  return {
    tables: layout.tables.map((t) => {
      const tl = map(t.x, t.y);
      return {
        ...t,
        x: clamp(tl.x, 0, 100),
        y: clamp(tl.y, 0, 100),
        w: clamp(t.w * scale, 8, 50),
        h: clamp(t.h * scale, 10, 70),
      };
    }),
    seats: layout.seats.map((s) => {
      const p = map(s.x, s.y);
      return { ...s, x: clamp(p.x, 0, 100), y: clamp(p.y, 0, 100) };
    }),
  };
}

export function normalizeRoomLayout(raw) {
  if (!raw || typeof raw !== "object") return createDefaultRoomLayout();
  const tables = Array.isArray(raw.tables)
    ? raw.tables.map((t) => ({
        id: String(t.id || uid("table")),
        x: clamp(Number(t.x) || 0, 0, 100),
        y: clamp(Number(t.y) || 0, 0, 100),
        w: clamp(Number(t.w) || 16, 8, 90),
        h: clamp(Number(t.h) || 20, 8, 90),
        color: String(t.color || TABLE_COLORS[2].value),
        label: String(t.label || ""),
      }))
    : [];
  const tableIds = new Set(tables.map((t) => t.id));
  const seats = Array.isArray(raw.seats)
    ? raw.seats
        .filter((s) => s && tableIds.has(s.tableId))
        .map((s) => ({
          id: String(s.id || uid("seat")),
          tableId: String(s.tableId),
          x: clamp(Number(s.x) || 0, 0, 100),
          y: clamp(Number(s.y) || 0, 0, 100),
        }))
    : [];
  return shrinkOversizedLayout({ tables, seats });
}

export function seatsForTable(layout, tableId) {
  return layout.seats.filter((s) => s.tableId === tableId);
}

export function roomCapacity(layout) {
  return layout.seats.length;
}

export function roomTableSizes(layout) {
  return layout.tables.map((t) => seatsForTable(layout, t.id).length);
}

/**
 * Asigna pods generados a mesas físicas de la sala (mejor ajuste por capacidad).
 * @returns {{ seatPlayers: Record<string,string>, tableLabels: Record<string,string> }}
 */
export function mapPodsToRoom(pods, layout) {
  const seatPlayers = {};
  const tableLabels = {};
  if (!pods?.length || !layout?.tables?.length) {
    return { seatPlayers, tableLabels };
  }

  const physical = layout.tables
    .map((t) => ({
      table: t,
      seats: seatsForTable(layout, t.id),
    }))
    .filter((p) => p.seats.length > 0)
    .sort((a, b) => b.seats.length - a.seats.length);

  const logical = [...pods].sort(
    (a, b) => (b.players?.length || 0) - (a.players?.length || 0),
  );

  const used = new Set();
  for (const pod of logical) {
    const players = pod.players || [];
    let bestIdx = -1;
    let bestScore = Infinity;
    for (let i = 0; i < physical.length; i++) {
      if (used.has(i)) continue;
      const cap = physical[i].seats.length;
      const overflow = Math.max(0, players.length - cap);
      const waste = Math.max(0, cap - players.length);
      const score = overflow * 100 + waste;
      if (score < bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    if (bestIdx < 0) break;
    used.add(bestIdx);
    const { table, seats } = physical[bestIdx];
    tableLabels[table.id] = pod.label || table.label;
    players.forEach((name, i) => {
      if (seats[i]) seatPlayers[seats[i].id] = name;
    });
  }

  return { seatPlayers, tableLabels };
}

/** @deprecated usar mapPodsToRoom */
export function mapPodsToRoomSeats(pods, layout) {
  return mapPodsToRoom(pods, layout).seatPlayers;
}
