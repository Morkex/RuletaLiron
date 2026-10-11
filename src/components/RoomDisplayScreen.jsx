import { useCallback, useEffect, useState } from "react";
import RoomDesigner from "./RoomDesigner";
import {
  loadSalaDisplay,
  SALA_DISPLAY_CHANNEL,
  SALA_DISPLAY_STORAGE,
  formatRoundTimer,
} from "../lib/salaDisplay";
import { normalizeRoomLayout } from "../lib/roomLayout";

/**
 * Vista limpia para el segundo monitor (participantes).
 * Se abre con ?display=sala
 */
export default function RoomDisplayScreen() {
  const [snap, setSnap] = useState(() => loadSalaDisplay());
  const [fsError, setFsError] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    document.title = "Sala Commander · El Lirón";
    const onStorage = (e) => {
      if (e.key === SALA_DISPLAY_STORAGE && e.newValue) {
        try {
          setSnap(JSON.parse(e.newValue));
        } catch {
          /* ignore */
        }
      }
    };
    window.addEventListener("storage", onStorage);

    let bc;
    try {
      bc = new BroadcastChannel(SALA_DISPLAY_CHANNEL);
      bc.onmessage = (ev) => {
        if (ev.data) setSnap(ev.data);
      };
    } catch {
      /* ignore */
    }

    const poll = setInterval(() => {
      const next = loadSalaDisplay();
      if (next) {
        setSnap((prev) => (prev?.at === next.at ? prev : next));
      }
    }, 1200);

    const tick = setInterval(() => setNow(Date.now()), 250);

    return () => {
      window.removeEventListener("storage", onStorage);
      clearInterval(poll);
      clearInterval(tick);
      bc?.close?.();
    };
  }, []);

  useEffect(() => {
    if (snap?.roundLabel) {
      document.title = `${snap.roundLabel} · Sala Commander · El Lirón`;
    }
  }, [snap?.roundLabel]);

  const goFullscreen = useCallback(async () => {
    setFsError("");
    try {
      const el = document.documentElement;
      if (!document.fullscreenElement) {
        await el.requestFullscreen?.();
      }
    } catch {
      setFsError("Usa F11 si el navegador bloquea la pantalla completa.");
    }
  }, []);

  const layout = normalizeRoomLayout(
    snap?.layout ?? { tables: [], seats: [] },
  );
  const seatPlayers = snap?.seatPlayers ?? {};
  const tableLabels = snap?.tableLabels ?? {};
  const hasPlayers = Object.keys(seatPlayers).length > 0;

  const pausedMs = snap?.roundPausedElapsedMs;
  const startedAt = Number(snap?.roundStartedAt) || now;
  const elapsedMs =
    pausedMs != null && !Number.isNaN(pausedMs)
      ? pausedMs
      : Math.max(0, now - startedAt);
  const roundLabel = snap?.roundLabel || "Ronda 1";
  const timerPaused = pausedMs != null && !Number.isNaN(pausedMs);

  return (
    <div className="flex min-h-screen flex-col bg-mtg-void text-mtg-frost">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-mtg-gold/25 px-4 py-3 md:px-8">
        <div className="flex items-center gap-3">
          <img
            src="/brand/liron-icon.png"
            alt=""
            className="h-12 w-12 rounded-full border-2 border-mtg-gold object-cover"
          />
          <div>
            <img
              src="/brand/liron-logo.png"
              alt="El Lirón"
              className="h-8 w-auto max-w-[200px] object-contain object-left"
            />
            <p className="text-xs text-mtg-frost/50 md:text-sm">
              Mesas Commander
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center text-center">
          <p className="font-display text-2xl text-mtg-gold-bright md:text-4xl">
            {roundLabel}
          </p>
          <p
            className={`mt-1 font-mono text-3xl tracking-wider md:text-5xl ${
              timerPaused ? "text-mtg-ember" : "text-mtg-frost"
            }`}
          >
            {formatRoundTimer(elapsedMs)}
          </p>
          {timerPaused && (
            <p className="mt-0.5 text-[11px] uppercase tracking-widest text-mtg-ember/80">
              Pausado
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {fsError && (
            <span className="text-xs text-mtg-ember">{fsError}</span>
          )}
          <button
            type="button"
            className="btn-primary rounded-lg px-4 py-2 text-sm"
            onClick={goFullscreen}
          >
            Pantalla completa
          </button>
        </div>
      </header>

      <main className="flex flex-1 flex-col px-3 py-4 md:px-8 md:py-6">
        {!hasPlayers ? (
          <p className="mb-3 text-center text-sm text-mtg-frost/50">
            Esperando el reparto desde la mesa de control…
          </p>
        ) : null}
        <div className="mx-auto w-full max-w-[1600px] flex-1">
          <RoomDesigner
            layout={layout}
            editable={false}
            seatPlayers={seatPlayers}
            tableLabels={tableLabels}
            presentation
          />
        </div>
      </main>
    </div>
  );
}
