import { useCallback, useEffect, useState } from "react";
import RoomDesigner from "./RoomDesigner";
import WaitingBench from "./WaitingBench";
import {
  loadSalaDisplay,
  publishSalaRoundStart,
  SALA_DISPLAY_CHANNEL,
  SALA_DISPLAY_STORAGE,
  formatRoundTimer,
} from "../lib/salaDisplay";
import { normalizeRoomLayout } from "../lib/roomLayout";

/**
 * Vista limpia para el segundo monitor (participantes).
 * Se abre con ?display=sala
 * El cronómetro de ronda arranca al entrar en pantalla completa.
 */
export default function RoomDisplayScreen() {
  const [snap, setSnap] = useState(() => loadSalaDisplay());
  const [fsError, setFsError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [isFullscreen, setIsFullscreen] = useState(
    () => Boolean(document.fullscreenElement),
  );

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
        if (ev.data && !ev.data.type) setSnap(ev.data);
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

    const onFs = () => {
      const fs = Boolean(document.fullscreenElement);
      setIsFullscreen(fs);
      if (fs) publishSalaRoundStart();
    };
    document.addEventListener("fullscreenchange", onFs);

    return () => {
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("fullscreenchange", onFs);
      clearInterval(poll);
      clearInterval(tick);
      bc?.close?.();
    };
  }, []);

  useEffect(() => {
    if (snap?.roundLabel && snap?.showSalaRoundLabel !== false) {
      document.title = `${snap.roundLabel} · Sala Commander · El Lirón`;
    } else {
      document.title = "Sala Commander · El Lirón";
    }
  }, [snap?.roundLabel, snap?.showSalaRoundLabel]);

  const toggleFullscreen = useCallback(async () => {
    setFsError("");
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen?.();
        return;
      }
      await document.documentElement.requestFullscreen?.();
      // Por si fullscreenchange no llega (algunos navegadores), armar igual
      publishSalaRoundStart();
    } catch {
      setFsError(
        document.fullscreenElement
          ? "No se pudo salir de pantalla completa."
          : "Usa F11 si el navegador bloquea la pantalla completa.",
      );
    }
  }, []);

  const layout = normalizeRoomLayout(
    snap?.layout ?? { tables: [], seats: [] },
  );
  const seatPlayers = snap?.seatPlayers ?? {};
  const tableLabels = snap?.tableLabels ?? {};
  const seatRoles = snap?.seatRoles ?? {};
  const seatTeamColors = snap?.seatTeamColors ?? {};
  const waiting = Array.isArray(snap?.waiting) ? snap.waiting : [];
  const hasPlayers = Object.keys(seatPlayers).length > 0;

  const showLabel = snap?.showSalaRoundLabel !== false;
  const showTimer = snap?.showSalaRoundTimer !== false;
  const showHud = showLabel || showTimer;

  const pausedMs = snap?.roundPausedElapsedMs;
  const startedAt = Number(snap?.roundStartedAt) || now;
  const timerStarted = Boolean(snap?.roundTimerStarted);
  const elapsedMs = !timerStarted
    ? 0
    : pausedMs != null && !Number.isNaN(pausedMs)
      ? pausedMs
      : Math.max(0, now - startedAt);
  const roundLabel = snap?.roundLabel || "Ronda 1";
  const timerPaused =
    timerStarted && pausedMs != null && !Number.isNaN(pausedMs);
  const awaitingStart = showTimer && !timerStarted;

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

        {showHud ? (
          <div className="flex flex-col items-center text-center">
            {showLabel && (
              <p className="font-display text-2xl text-mtg-gold-bright md:text-4xl">
                {roundLabel}
              </p>
            )}
            {showTimer && (
              <>
                <p
                  className={`mt-1 font-mono text-3xl tracking-wider md:text-5xl ${
                    timerPaused || awaitingStart
                      ? "text-mtg-ember"
                      : "text-mtg-frost"
                  }`}
                >
                  {formatRoundTimer(elapsedMs)}
                </p>
                {awaitingStart && (
                  <p className="mt-0.5 text-[11px] uppercase tracking-widest text-mtg-ember/80">
                    {isFullscreen
                      ? "Iniciando…"
                      : "Pulsa pantalla completa para empezar"}
                  </p>
                )}
                {timerPaused && (
                  <p className="mt-0.5 text-[11px] uppercase tracking-widest text-mtg-ember/80">
                    Pausado
                  </p>
                )}
              </>
            )}
          </div>
        ) : (
          <div />
        )}

        <div className="flex flex-wrap items-center gap-2">
          {fsError && (
            <span className="text-xs text-mtg-ember">{fsError}</span>
          )}
          <button
            type="button"
            className={
              isFullscreen
                ? "btn-ghost rounded-lg px-4 py-2 text-sm ring-1 ring-mtg-gold/40"
                : "btn-primary rounded-lg px-4 py-2 text-sm"
            }
            onClick={toggleFullscreen}
          >
            {isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
          </button>
        </div>
      </header>

      <main className="flex flex-1 flex-col px-3 py-4 md:px-8 md:py-6">
        {!hasPlayers ? (
          <p className="mb-3 text-center text-sm text-mtg-frost/50">
            Esperando el reparto desde la mesa de control…
          </p>
        ) : null}
        <div
          className={`mx-auto w-full max-w-[1600px] flex-1 ${
            waiting.length
              ? "grid gap-4 lg:grid-cols-[1fr_240px] lg:items-start"
              : ""
          }`}
        >
          <RoomDesigner
            layout={layout}
            editable={false}
            seatPlayers={seatPlayers}
            tableLabels={tableLabels}
            seatRoles={seatRoles}
            seatTeamColors={seatTeamColors}
            presentation
          />
          <WaitingBench
            waiting={waiting}
            className="lg:sticky lg:top-4"
          />
        </div>
      </main>
    </div>
  );
}
