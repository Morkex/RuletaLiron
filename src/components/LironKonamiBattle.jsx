import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

const FIGHTS = [
  {
    id: "kamehameha-clash",
    title: "¡KAMEHAMEHA!",
    durationMs: 11000,
    winner: "draw",
    endLine: "¡Choque de potencias! Empate legendario",
  },
  {
    id: "green-wins",
    title: "INSTINTO SUPERIOR",
    durationMs: 10500,
    winner: "green",
    endLine: "¡Victoria del Lirón Verde!",
  },
  {
    id: "pink-wins",
    title: "ULTRA INSTINTO",
    durationMs: 10500,
    winner: "pink",
    endLine: "¡Victoria del Lirón Rosa!",
  },
  {
    id: "wall-slam",
    title: "¡CONTRA LA PARED!",
    durationMs: 10000,
    winner: "green",
    endLine: "El Lirón Verde estrelló al rival",
  },
  {
    id: "floor-spike",
    title: "¡AL SUELO!",
    durationMs: 10000,
    winner: "pink",
    endLine: "El Lirón Rosa remató desde el aire",
  },
  {
    id: "teleport-blitz",
    title: "TELETRANSPORTACIÓN",
    durationMs: 11500,
    winner: "draw",
    endLine: "Demasiado rápido… ¡doble KO!",
  },
];

function pickFight() {
  return FIGHTS[Math.floor(Math.random() * FIGHTS.length)];
}

/** Posiciones en % del arena (centro del fighter). Escala mínima 0.9 para que no “desaparezcan”. */
function buildScripts(fightId) {
  const introG = [
    { x: 18, y: 58, s: 1, r: 0 },
    { x: 22, y: 52, s: 1.05, r: -8 },
  ];
  const introB = [
    { x: 82, y: 58, s: 1, r: 0 },
    { x: 78, y: 52, s: 1.05, r: 8 },
  ];

  switch (fightId) {
    case "green-wins":
      return {
        green: [
          ...introG,
          { x: 68, y: 48, s: 1.1, r: 12 },
          { x: 52, y: 38, s: 1.15, r: -8 },
          { x: 40, y: 22, s: 1.2, r: 0 },
          { x: 62, y: 62, s: 1.3, r: 20 },
          { x: 48, y: 50, s: 1.2, r: 0 },
          { x: 45, y: 48, s: 1.25, r: 0 },
        ],
        pink: [
          ...introB,
          { x: 90, y: 46, s: 1, r: 22 },
          { x: 93, y: 32, s: 0.95, r: 35 },
          { x: 88, y: 18, s: 1.05, r: -15 },
          { x: 84, y: 78, s: 0.95, r: 70 },
          { x: 86, y: 74, s: 0.9, r: 55 },
          { x: 88, y: 76, s: 0.9, r: 65 },
        ],
        blasts: [
          { from: "green", at: 0.35, toX: 78, toY: 40 },
          { from: "green", at: 0.62, toX: 84, toY: 70, big: true },
        ],
      };
    case "pink-wins":
      return {
        green: [
          ...introG,
          { x: 10, y: 42, s: 1, r: -25 },
          { x: 7, y: 28, s: 0.95, r: -40 },
          { x: 18, y: 16, s: 1.05, r: 15 },
          { x: 14, y: 78, s: 0.95, r: -70 },
          { x: 16, y: 74, s: 0.9, r: -55 },
          { x: 14, y: 76, s: 0.9, r: -65 },
        ],
        pink: [
          ...introB,
          { x: 30, y: 48, s: 1.1, r: -12 },
          { x: 48, y: 36, s: 1.15, r: 8 },
          { x: 58, y: 20, s: 1.2, r: 0 },
          { x: 32, y: 60, s: 1.3, r: -18 },
          { x: 50, y: 50, s: 1.2, r: 0 },
          { x: 52, y: 48, s: 1.25, r: 0 },
        ],
        blasts: [
          { from: "pink", at: 0.38, toX: 18, toY: 35 },
          { from: "pink", at: 0.65, toX: 16, toY: 72, big: true },
        ],
      };
    case "wall-slam":
      return {
        green: [
          ...introG,
          { x: 48, y: 48, s: 1.1, r: 0 },
          { x: 72, y: 50, s: 1.2, r: 18 },
          { x: 88, y: 48, s: 1.25, r: 25 },
          { x: 58, y: 42, s: 1.1, r: -8 },
          { x: 68, y: 54, s: 1.25, r: 12 },
          { x: 50, y: 50, s: 1.2, r: 0 },
        ],
        pink: [
          ...introB,
          { x: 55, y: 50, s: 1, r: -5 },
          { x: 90, y: 44, s: 1, r: 30 },
          { x: 95, y: 40, s: 0.95, r: 45 },
          { x: 90, y: 58, s: 1, r: 35 },
          { x: 88, y: 76, s: 0.9, r: 75 },
          { x: 90, y: 74, s: 0.9, r: 70 },
        ],
        blasts: [{ from: "green", at: 0.55, toX: 92, toY: 45, big: true }],
        impacts: [{ at: 0.4, x: 95, y: 40, kind: "wall" }],
      };
    case "floor-spike":
      return {
        green: [
          ...introG,
          { x: 42, y: 32, s: 1.1, r: -12 },
          { x: 50, y: 12, s: 1.15, r: 0 },
          { x: 48, y: 78, s: 0.95, r: 80 },
          { x: 46, y: 74, s: 0.9, r: 70 },
          { x: 44, y: 76, s: 0.9, r: 75 },
          { x: 42, y: 76, s: 0.9, r: 80 },
        ],
        pink: [
          ...introB,
          { x: 55, y: 36, s: 1.1, r: 10 },
          { x: 50, y: 10, s: 1.25, r: 160 },
          { x: 50, y: 52, s: 1.35, r: 0 },
          { x: 54, y: 48, s: 1.2, r: -5 },
          { x: 56, y: 46, s: 1.25, r: 0 },
          { x: 54, y: 46, s: 1.3, r: 0 },
        ],
        blasts: [{ from: "pink", at: 0.48, toX: 48, toY: 75, big: true }],
        impacts: [{ at: 0.42, x: 48, y: 78, kind: "floor" }],
      };
    case "teleport-blitz":
      return {
        green: [
          { x: 16, y: 58, s: 1, r: 0 },
          { x: 82, y: 22, s: 1.1, r: 18 },
          { x: 18, y: 72, s: 1.1, r: -25 },
          { x: 72, y: 40, s: 1.15, r: 12 },
          { x: 28, y: 26, s: 1.15, r: -18 },
          { x: 62, y: 58, s: 1.2, r: 20 },
          { x: 44, y: 46, s: 1.25, r: 0 },
          { x: 36, y: 72, s: 0.95, r: 50 },
        ],
        pink: [
          { x: 84, y: 58, s: 1, r: 0 },
          { x: 16, y: 26, s: 1.1, r: -18 },
          { x: 78, y: 70, s: 1.1, r: 22 },
          { x: 26, y: 42, s: 1.15, r: -12 },
          { x: 86, y: 30, s: 1.15, r: 18 },
          { x: 40, y: 56, s: 1.2, r: -20 },
          { x: 56, y: 46, s: 1.25, r: 0 },
          { x: 64, y: 72, s: 0.95, r: -50 },
        ],
        blasts: [
          { from: "green", at: 0.28, toX: 70, toY: 40 },
          { from: "pink", at: 0.4, toX: 28, toY: 42 },
          { from: "green", at: 0.55, toX: 55, toY: 50 },
          { from: "pink", at: 0.55, toX: 45, toY: 50 },
        ],
      };
    case "kamehameha-clash":
    default:
      return {
        green: [
          ...introG,
          { x: 24, y: 50, s: 1.1, r: -5 },
          { x: 26, y: 48, s: 1.2, r: -8 },
          { x: 30, y: 48, s: 1.25, r: -4 },
          { x: 38, y: 48, s: 1.3, r: 0 },
          { x: 42, y: 48, s: 1.2, r: 4 },
          { x: 32, y: 52, s: 1.15, r: 0 },
          { x: 28, y: 50, s: 1.15, r: 0 },
        ],
        pink: [
          ...introB,
          { x: 76, y: 50, s: 1.1, r: 5 },
          { x: 74, y: 48, s: 1.2, r: 8 },
          { x: 70, y: 48, s: 1.25, r: 4 },
          { x: 62, y: 48, s: 1.3, r: 0 },
          { x: 58, y: 48, s: 1.2, r: -4 },
          { x: 68, y: 52, s: 1.15, r: 0 },
          { x: 72, y: 50, s: 1.15, r: 0 },
        ],
        blasts: [],
        beamClash: true,
      };
  }
}

function framesToMotion(frames, durationMs) {
  const n = frames.length;
  const times = frames.map((_, i) => (n === 1 ? 0 : i / (n - 1)));
  const ease = [];
  for (let i = 1; i < n; i++) {
    const dx = Math.abs(frames[i].x - frames[i - 1].x);
    const dy = Math.abs(frames[i].y - frames[i - 1].y);
    // Teleporte: salto rápido, sin “fundido”
    ease.push(dx > 35 || dy > 30 ? "circIn" : "easeInOut");
  }
  return {
    left: frames.map((f) => `${f.x}%`),
    top: frames.map((f) => `${f.y}%`),
    scale: frames.map((f) => f.s),
    rotate: frames.map((f) => f.r),
    transition: {
      duration: durationMs / 1000,
      times,
      ease: ease.length ? ease : "easeInOut",
    },
  };
}

export default function LironKonamiBattle({ open, onClose }) {
  const [fight, setFight] = useState(null);

  useEffect(() => {
    if (open) setFight(pickFight());
    else setFight(null);
  }, [open]);

  useEffect(() => {
    if (!open || !fight) return;
    const t = setTimeout(() => onClose?.(), fight.durationMs + 500);
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, fight, onClose]);

  const script = useMemo(
    () => (fight ? buildScripts(fight.id) : null),
    [fight],
  );

  if (typeof document === "undefined") return null;
  if (!open) return null;
  if (!fight || !script) {
    return createPortal(
      <div className="fixed inset-0 z-[220] bg-black/90" />,
      document.body,
    );
  }

  const dur = fight.durationMs / 1000;
  const greenMotion = framesToMotion(script.green, fight.durationMs);
  const pinkMotion = framesToMotion(script.pink, fight.durationMs);

  return createPortal(
    <AnimatePresence>
      <motion.div
        key={fight.id}
        className="fixed inset-0 z-[220] flex items-center justify-center overflow-hidden bg-black/92"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={onClose}
        role="dialog"
        aria-label="Lirón Battle"
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 45% at 50% 100%, rgba(201,168,76,0.22), transparent 55%),
              radial-gradient(ellipse 50% 40% at 15% 40%, rgba(69,90,73,0.4), transparent 50%),
              radial-gradient(ellipse 50% 40% at 85% 40%, rgba(40,80,140,0.4), transparent 50%),
              linear-gradient(180deg, #070c0a 0%, #15201c 50%, #0e1412 100%)
            `,
          }}
        />

        <motion.p
          className="pointer-events-none absolute top-6 z-30 px-4 text-center font-display text-xl tracking-[0.2em] text-mtg-gold-bright md:top-10 md:text-3xl"
          initial={{ opacity: 0, y: -24, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45 }}
        >
          {fight.title}
        </motion.p>

        <div className="relative h-[min(70vh,420px)] w-full max-w-4xl">
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-mtg-gold/40 to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-transparent via-sky-400/30 to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-1 bg-gradient-to-b from-transparent via-amber-400/30 to-transparent" />

          {/* Verde: opacidad fija (nunca se anima) para evitar el “desvanecido” */}
          <motion.div
            className="absolute z-20"
            style={{
              opacity: 1,
              x: "-50%",
              y: "-50%",
              willChange: "left, top, transform",
            }}
            initial={{
              left: `${script.green[0].x}%`,
              top: `${script.green[0].y}%`,
              scale: 1,
              rotate: 0,
            }}
            animate={{
              left: greenMotion.left,
              top: greenMotion.top,
              scale: greenMotion.scale,
              rotate: greenMotion.rotate,
            }}
            transition={greenMotion.transition}
          >
            <Aura color="green" />
            <Fighter variant="green" />
          </motion.div>

          <motion.div
            className="absolute z-20"
            style={{
              opacity: 1,
              x: "-50%",
              y: "-50%",
              willChange: "left, top, transform",
            }}
            initial={{
              left: `${script.pink[0].x}%`,
              top: `${script.pink[0].y}%`,
              scale: 1,
              rotate: 0,
            }}
            animate={{
              left: pinkMotion.left,
              top: pinkMotion.top,
              scale: pinkMotion.scale,
              rotate: pinkMotion.rotate,
            }}
            transition={pinkMotion.transition}
          >
            <Aura color="pink" />
            <Fighter variant="pink" />
          </motion.div>

          {(script.blasts || []).map((b, i) => (
            <KiBlast key={`blast-${i}`} blast={b} duration={dur} />
          ))}
          {(script.impacts || []).map((imp, i) => (
            <ImpactBurst key={`imp-${i}`} impact={imp} duration={dur} />
          ))}
          {script.beamClash && <BeamClash duration={dur} />}
        </div>

        <motion.p
          className="pointer-events-none absolute bottom-10 z-30 max-w-lg px-4 text-center font-display text-lg text-mtg-gold-bright md:text-2xl"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: dur * 0.82, duration: 0.35 }}
        >
          {fight.endLine}
        </motion.p>

        <p className="pointer-events-none absolute bottom-3 text-xs text-mtg-frost/35">
          Clic o Esc para cerrar
        </p>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}

function Fighter({ variant }) {
  const isPink = variant === "pink";
  return (
    <div className="relative h-20 w-20 md:h-28 md:w-28">
      <img
        src="/brand/liron-icon.png"
        alt=""
        draggable={false}
        className={`h-full w-full rounded-full border-4 object-cover ${
          isPink ? "border-pink-300/90" : "border-emerald-300/90"
        }`}
        style={{
          opacity: 1,
          transform: isPink ? "scaleX(-1)" : undefined,
          filter: isPink
            ? "hue-rotate(300deg) saturate(1.4) brightness(1.08)"
            : "saturate(1.15) brightness(1.06)",
          boxShadow: isPink
            ? "0 0 28px 6px rgba(255,120,180,0.7)"
            : "0 0 28px 6px rgba(100,200,120,0.7)",
        }}
      />
    </div>
  );
}

function Aura({ color }) {
  const c =
    color === "pink"
      ? "rgba(255,120,180,0.45)"
      : "rgba(100,200,120,0.45)";
  return (
    <motion.div
      className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[145%] w-[145%] -translate-x-1/2 -translate-y-1/2 rounded-full"
      style={{
        background: `radial-gradient(circle, ${c} 0%, transparent 70%)`,
      }}
      animate={{ scale: [1, 1.18, 1] }}
      transition={{ duration: 0.7, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

function KiBlast({ blast, duration }) {
  const fromGreen = blast.from === "green";
  const startX = fromGreen ? 32 : 68;
  const startY = 50;
  return (
    <motion.div
      className="pointer-events-none absolute z-30 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full md:h-7 md:w-7"
      style={{
        opacity: 1,
        background: fromGreen
          ? "radial-gradient(circle, #fff 0%, #9aecb0 40%, #3d9a5f 70%, transparent)"
          : "radial-gradient(circle, #fff 0%, #ffb0d4 40%, #e85a9a 70%, transparent)",
        boxShadow: fromGreen
          ? "0 0 22px 8px rgba(100,200,120,0.8)"
          : "0 0 22px 8px rgba(255,120,180,0.8)",
      }}
      initial={{
        left: `${startX}%`,
        top: `${startY}%`,
        scale: 0.5,
        visibility: "hidden",
      }}
      animate={{
        left: [`${startX}%`, `${blast.toX}%`],
        top: [`${startY}%`, `${blast.toY}%`],
        scale: blast.big ? [0.5, 1.5, 1.1, 0.4] : [0.5, 1.2, 1, 0.3],
        visibility: ["hidden", "visible", "visible", "hidden"],
      }}
      transition={{
        duration: blast.big ? 0.8 : 0.5,
        delay: blast.at * duration,
        times: [0, 0.12, 0.8, 1],
        ease: "easeIn",
      }}
    />
  );
}

function ImpactBurst({ impact, duration }) {
  return (
    <motion.div
      className="pointer-events-none absolute z-[25] -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${impact.x}%`, top: `${impact.y}%` }}
      initial={{ scale: 0.4, visibility: "hidden" }}
      animate={{
        scale: [0.4, 0.4, 1.7, 2.2],
        visibility: ["hidden", "hidden", "visible", "hidden"],
      }}
      transition={{
        duration,
        times: [0, Math.max(0, impact.at - 0.02), impact.at, Math.min(1, impact.at + 0.14)],
      }}
    >
      <div
        className="h-24 w-24 rounded-full md:h-32 md:w-32"
        style={{
          background:
            impact.kind === "floor"
              ? "radial-gradient(circle, rgba(255,200,80,0.85) 0%, rgba(180,80,40,0.45) 40%, transparent 65%)"
              : "radial-gradient(circle, rgba(200,230,255,0.85) 0%, rgba(80,140,220,0.4) 40%, transparent 65%)",
        }}
      />
      <p className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-display text-sm text-white md:text-lg">
        {impact.kind === "floor" ? "BOOM" : "CRASH"}
      </p>
    </motion.div>
  );
}

function BeamClash({ duration }) {
  return (
    <>
      <motion.div
        className="pointer-events-none absolute top-[48%] z-10 h-6 origin-left rounded-full md:h-8"
        style={{
          left: "28%",
          background:
            "linear-gradient(90deg, rgba(120,220,140,0.95), rgba(60,160,90,0.85), rgba(255,255,255,0.55))",
          boxShadow: "0 0 30px 10px rgba(100,200,120,0.55)",
        }}
        initial={{ width: "0%", visibility: "hidden" }}
        animate={{
          width: ["0%", "0%", "24%", "30%", "20%", "0%"],
          visibility: ["hidden", "hidden", "visible", "visible", "visible", "hidden"],
        }}
        transition={{
          duration,
          times: [0, 0.28, 0.38, 0.55, 0.72, 0.85],
        }}
      />
      <motion.div
        className="pointer-events-none absolute top-[48%] z-10 h-6 origin-right rounded-full md:h-8"
        style={{
          right: "28%",
          background:
            "linear-gradient(270deg, rgba(255,140,190,0.95), rgba(220,70,140,0.85), rgba(255,255,255,0.55))",
          boxShadow: "0 0 30px 10px rgba(255,120,180,0.55)",
        }}
        initial={{ width: "0%", visibility: "hidden" }}
        animate={{
          width: ["0%", "0%", "24%", "30%", "20%", "0%"],
          visibility: ["hidden", "hidden", "visible", "visible", "visible", "hidden"],
        }}
        transition={{
          duration,
          times: [0, 0.28, 0.38, 0.55, 0.72, 0.85],
        }}
      />
      <motion.div
        className="pointer-events-none absolute left-1/2 top-[48%] z-20 -translate-x-1/2 -translate-y-1/2"
        initial={{ scale: 0.3, visibility: "hidden" }}
        animate={{
          scale: [0.3, 0.3, 1.3, 2, 0.6],
          visibility: ["hidden", "hidden", "visible", "visible", "hidden"],
        }}
        transition={{
          duration,
          times: [0, 0.36, 0.45, 0.65, 0.85],
        }}
      >
        <div
          className="h-28 w-28 rounded-full md:h-40 md:w-40"
          style={{
            background:
              "radial-gradient(circle, #fff 0%, rgba(160,230,170,0.8) 30%, rgba(255,140,190,0.5) 55%, transparent 70%)",
          }}
        />
      </motion.div>
    </>
  );
}
