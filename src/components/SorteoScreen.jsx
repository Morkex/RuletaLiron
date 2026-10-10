import { useMemo, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useApp } from "../context/AppContext";
import Wheel from "./Wheel";
import PrizeQueue from "./PrizeQueue";

export default function SorteoScreen() {
  const {
    participants,
    currentPrize,
    currentPrizeIndex,
    prizes,
    config,
    isSpinning,
    spinResult,
    beginSpin,
    finishSpin,
  } = useApp();

  const [wheelSize, setWheelSize] = useState(520);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 480) setWheelSize(300);
      else if (w < 768) setWheelSize(380);
      else if (w < 1100) setWheelSize(460);
      else setWheelSize(560);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const canSpin =
    !isSpinning &&
    !spinResult &&
    participants.length > 0 &&
    Boolean(currentPrize);

  const pct = useMemo(
    () => (participants.length ? (100 / participants.length).toFixed(2) : "0"),
    [participants.length],
  );

  const handleLaunch = useCallback(async () => {
    await beginSpin();
  }, [beginSpin]);

  const handleWheelDoubleClick = useCallback(() => {
    if (isSpinning || spinResult || participants.length === 0 || !currentPrize) {
      return;
    }
    handleLaunch();
  }, [isSpinning, spinResult, participants.length, currentPrize, handleLaunch]);

  return (
    <div className="mx-auto max-w-[1600px]">
      {/* Prize announcement banner */}
      <motion.section
        className="panel relative overflow-hidden rounded-2xl gold-border p-5 md:p-8"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.12),transparent_55%)]" />
        <div className="relative flex flex-col items-center gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
            {currentPrize ? (
              <motion.img
                key={currentPrize.id}
                src={currentPrize.image}
                alt={currentPrize.name}
                className="h-36 w-24 rounded-md object-cover shadow-2xl ring-2 ring-mtg-gold/60 md:h-44 md:w-28"
                initial={{ scale: 0.9, rotate: -4 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200 }}
              />
            ) : (
              <div className="flex h-36 w-24 items-center justify-center rounded-md border border-dashed border-mtg-gold/30 text-xs text-mtg-frost/40 md:h-44 md:w-28">
                Sin premio
              </div>
            )}
            <div>
              <p className="font-display text-sm uppercase tracking-[0.3em] text-mtg-ember">
                ¡Próximo sorteo!
              </p>
              <h2 className="mt-1 font-display text-3xl font-black text-gold-gradient md:text-5xl">
                {currentPrize?.name ?? "Añade un premio"}
              </h2>
              <p className="mt-2 text-sm text-mtg-frost/65 md:text-base">
                Premio {Math.min(currentPrizeIndex + 1, prizes.length)} de {prizes.length}
                {" · "}
                {participants.length} participantes · {pct}% cada uno
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={!canSpin}
            onClick={handleLaunch}
            className={`btn-primary rounded-xl px-8 py-4 text-lg md:text-xl ${
              canSpin ? "animate-pulse-gold" : ""
            }`}
          >
            {isSpinning ? "Girando…" : "¡Lanzar Ruleta!"}
          </button>
        </div>
      </motion.section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_340px]">
        <section className="panel gold-border flex flex-col items-center rounded-2xl p-4 md:p-8">
          <div
            onDoubleClick={handleWheelDoubleClick}
            title={canSpin ? "Doble clic para lanzar la ruleta" : undefined}
            className={canSpin ? "cursor-pointer" : "cursor-default"}
          >
            <Wheel
              key={`wheel-${participants.length}-${participants[0] ?? "empty"}`}
              participants={participants}
              targetAngle={spinResult?.finalAngle ?? null}
              winnerName={
                spinResult && !isSpinning && participants.includes(spinResult.winner)
                  ? spinResult.winner
                  : null
              }
              spinning={isSpinning}
              durationSec={config.spinDuration}
              sfxVolume={config.sfxVolume}
              confettiEnabled={config.confettiEnabled}
              onSpinComplete={finishSpin}
              size={wheelSize}
            />
          </div>
          {canSpin && (
            <p className="mt-2 text-center text-[11px] text-mtg-frost/40">
              Doble clic en la ruleta para lanzar
            </p>
          )}

          {spinResult && !isSpinning && participants.includes(spinResult.winner) && (
            <motion.div
              className="mt-6 w-full max-w-xl rounded-xl border border-mtg-gold/40 bg-mtg-void/70 p-5 text-center gold-glow"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <p className="font-display text-xs uppercase tracking-widest text-mtg-gold">
                Resultado
              </p>
              <p className="mt-1 font-display text-3xl text-gold-gradient md:text-4xl">
                {spinResult.winner}
              </p>
            </motion.div>
          )}

          {!canSpin && !isSpinning && !spinResult && (
            <p className="mt-4 text-center text-sm text-mtg-frost/50">
              {participants.length === 0 && "Necesitas participantes en la lista. "}
              {!currentPrize && "Necesitas un premio en cola. "}
            </p>
          )}
        </section>

        <aside className="space-y-4">
          <div className="panel gold-border rounded-xl p-4">
            <h3 className="font-display text-mtg-gold-bright">Cola de premios</h3>
            <div className="mt-3">
              <PrizeQueue />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
