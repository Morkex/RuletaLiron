/** Snapshot para la pestaña del segundo monitor (vista sala). */

export const SALA_DISPLAY_STORAGE = "ruletaliron-sala-display-v1";
export const SALA_DISPLAY_CHANNEL = "ruletaliron-sala-display";

export function publishSalaDisplay(payload) {
  const data = {
    layout: payload.layout ?? { tables: [], seats: [] },
    seatPlayers: payload.seatPlayers ?? {},
    tableLabels: payload.tableLabels ?? {},
    title: payload.title || "Mesas Commander",
    roundLabel: payload.roundLabel || "Ronda 1",
    roundNumber: Number(payload.roundNumber) || 1,
    roundStartedAt: Number(payload.roundStartedAt) || Date.now(),
    /** Si > 0, el cronómetro está pausado y muestra este valor fijo (ms) */
    roundPausedElapsedMs:
      payload.roundPausedElapsedMs == null
        ? null
        : Number(payload.roundPausedElapsedMs),
    at: Date.now(),
  };
  try {
    localStorage.setItem(SALA_DISPLAY_STORAGE, JSON.stringify(data));
  } catch {
    /* ignore */
  }
  try {
    const bc = new BroadcastChannel(SALA_DISPLAY_CHANNEL);
    bc.postMessage(data);
    bc.close();
  } catch {
    /* ignore */
  }
  return data;
}

export function loadSalaDisplay() {
  try {
    const raw = localStorage.getItem(SALA_DISPLAY_STORAGE);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function salaDisplayUrl() {
  const url = new URL(window.location.href);
  url.searchParams.set("display", "sala");
  return url.toString();
}

export function isSalaDisplayMode() {
  try {
    return new URLSearchParams(window.location.search).get("display") === "sala";
  } catch {
    return false;
  }
}

/** Formatea ms → 12:34 o 1:02:03 */
export function formatRoundTimer(ms) {
  const totalSec = Math.max(0, Math.floor(Number(ms) / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function defaultRoundLabel(roundNumber) {
  return `Ronda ${Math.max(1, Number(roundNumber) || 1)}`;
}

export function resolveRoundLabel(roundTitle, roundNumber) {
  const custom = String(roundTitle || "").trim();
  return custom || defaultRoundLabel(roundNumber);
}
