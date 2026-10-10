/** Snapshot para la pestaña del segundo monitor (vista sala). */

export const SALA_DISPLAY_STORAGE = "ruletaliron-sala-display-v1";
export const SALA_DISPLAY_CHANNEL = "ruletaliron-sala-display";

export function publishSalaDisplay(payload) {
  const data = {
    layout: payload.layout ?? { tables: [], seats: [] },
    seatPlayers: payload.seatPlayers ?? {},
    tableLabels: payload.tableLabels ?? {},
    title: payload.title || "Mesas Commander",
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
