import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { playTick, playVictoryFanfare } from "../lib/audio";
import { sectorAtPointer } from "../lib/fairRandom";
import { WHEEL_COLORS } from "../lib/constants";

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

function easeOutQuint(t) {
  return 1 - (1 - t) ** 5;
}

function lighten(hex, amount = 0.22) {
  const n = String(hex || "#1e3a5f").replace("#", "");
  const num = Number.parseInt(n.length === 3 ? n.split("").map((c) => c + c).join("") : n, 16);
  if (Number.isNaN(num)) return hex;
  const r = Math.min(255, ((num >> 16) & 255) + Math.round(255 * amount));
  const g = Math.min(255, ((num >> 8) & 255) + Math.round(255 * amount));
  const b = Math.min(255, (num & 255) + Math.round(255 * amount));
  return `rgb(${r},${g},${b})`;
}

/**
 * Ruleta Canvas estilo física real:
 * gira hasta un ángulo (crypto) y el ganador es el dueño del sector
 * bajo la flecha (3:00), no el nombre centrado en el marcador.
 */
export default function Wheel({
  participants = [],
  targetAngle = null,
  winnerName = null,
  spinning = false,
  durationSec = 8,
  sfxVolume = 0.7,
  confettiEnabled = true,
  onSpinComplete,
  size = 520,
}) {
  const canvasRef = useRef(null);
  const angleRef = useRef(0);
  const rafRef = useRef(0);
  const lastSegmentRef = useRef(-1);
  const spinningRef = useRef(false);
  const participantsRef = useRef(participants);
  const sizeRef = useRef(size);
  const onCompleteRef = useRef(onSpinComplete);

  participantsRef.current = participants;
  sizeRef.current = size;
  onCompleteRef.current = onSpinComplete;

  const draw = (rotation, highlightName = null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const list = participantsRef.current || [];
    const n = list.length;
    const cssSize = sizeRef.current;
    const slice = n > 0 ? (Math.PI * 2) / n : 0;

    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== cssSize * dpr) {
      canvas.width = cssSize * dpr;
      canvas.height = cssSize * dpr;
      canvas.style.width = `${cssSize}px`;
      canvas.style.height = `${cssSize}px`;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssSize, cssSize);

    const cx = cssSize / 2;
    const cy = cssSize / 2;
    const radius = Math.max(20, cssSize / 2 - 8);

    ctx.beginPath();
    ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
    ctx.strokeStyle = "#d4af37";
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, radius + 1, 0, Math.PI * 2);
    ctx.strokeStyle = "#f0d78c";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (n === 0) {
      ctx.fillStyle = "#1a2740";
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f0d78c";
      ctx.font = "600 18px 'Source Sans 3', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Añade participantes", cx, cy);
      return;
    }

    const winnerIdx =
      highlightName != null
        ? list.findIndex((p) => p === highlightName)
        : -1;

    if (n === 1) {
      const isWinner = winnerIdx === 0;
      const base = WHEEL_COLORS[0];
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fillStyle = isWinner ? lighten(base, 0.35) : base;
      ctx.fill();
      ctx.strokeStyle = isWinner ? "#f0d78c" : "rgba(212, 175, 55, 0.35)";
      ctx.lineWidth = isWinner ? 3 : 1;
      ctx.stroke();

      if (list[0]) {
        ctx.fillStyle = isWinner ? "#fff8e7" : "#e8eef8";
        ctx.font = "700 18px 'Source Sans 3', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const label = String(list[0]);
        ctx.fillText(
          label.length > 22 ? `${label.slice(0, 21)}…` : label,
          cx + radius * 0.45,
          cy,
        );
      }
    } else {
      for (let i = 0; i < n; i++) {
        const start = rotation + i * slice - slice / 2;
        const end = start + slice;
        const isWinner = winnerIdx === i;
        const base = WHEEL_COLORS[i % WHEEL_COLORS.length];

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, start, end);
        ctx.closePath();
        ctx.fillStyle = isWinner ? lighten(base, 0.35) : base;
        ctx.fill();
        ctx.strokeStyle = isWinner ? "#f0d78c" : "rgba(212, 175, 55, 0.35)";
        ctx.lineWidth = isWinner ? 3 : 1;
        ctx.stroke();

        // Nombre fijo en el centro del sector (la flecha NO se alinea a él)
        if (list[i]) {
          const mid = start + slice / 2;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(mid);
          ctx.textAlign = "right";
          ctx.textBaseline = "middle";
          ctx.fillStyle = isWinner ? "#fff8e7" : "#e8eef8";
          const fontSize = n > 40 ? 9 : n > 24 ? 11 : n > 14 ? 13 : 15;
          ctx.font = `${isWinner ? 800 : 700} ${fontSize}px 'Source Sans 3', sans-serif`;
          const label = String(list[i]);
          const maxLen = n > 30 ? 10 : n > 18 ? 14 : 18;
          ctx.fillText(
            label.length > maxLen ? `${label.slice(0, maxLen - 1)}…` : label,
            radius - 14,
            0,
          );
          ctx.restore();
        }
      }
    }

    const hubGrad = ctx.createRadialGradient(cx, cy, 4, cx, cy, 36);
    hubGrad.addColorStop(0, "#f0d78c");
    hubGrad.addColorStop(1, "#9a7b2f");
    ctx.beginPath();
    ctx.arc(cx, cy, 34, 0, Math.PI * 2);
    ctx.fillStyle = hubGrad;
    ctx.fill();
    ctx.strokeStyle = "#1a1204";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#1a1204";
    ctx.font = "700 11px Cinzel, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("MTG", cx, cy);

    // Punto dorado en el borde bajo la flecha: marca el sector elegido
    if (winnerIdx >= 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx + radius - 2, cy, 7, 0, Math.PI * 2);
      ctx.fillStyle = "#f0d78c";
      ctx.shadowColor = "rgba(240, 215, 140, 0.85)";
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.restore();
    }
  };

  // Redibujar en reposo cuando cambian datos
  useEffect(() => {
    if (spinning) return;
    spinningRef.current = false;
    const highlight =
      !spinning && winnerName && participants.includes(winnerName)
        ? winnerName
        : null;
    draw(angleRef.current, highlight);
  }, [participants, size, spinning, winnerName]);

  // Animación de giro hacia un ángulo; el sector bajo la flecha define al ganador
  useEffect(() => {
    if (!spinning || targetAngle == null || Number.isNaN(targetAngle)) return;

    const list = participantsRef.current || [];
    const n = list.length;
    if (n === 0) {
      spinningRef.current = false;
      onCompleteRef.current?.();
      return;
    }

    spinningRef.current = true;
    cancelAnimationFrame(rafRef.current);

    let cancelled = false;
    let finished = false;
    const TWO_PI = Math.PI * 2;
    const startAngle = angleRef.current;
    const targetMod = ((targetAngle % TWO_PI) + TWO_PI) % TWO_PI;
    const startMod = ((startAngle % TWO_PI) + TWO_PI) % TWO_PI;
    let delta = (targetMod - startMod + TWO_PI) % TWO_PI;
    if (delta < 0.001) delta = TWO_PI;

    // Vueltas extras solo visuales (el ángulo ya viene de crypto)
    const spinBuf = new Uint32Array(1);
    crypto.getRandomValues(spinBuf);
    delta += (4 + (spinBuf[0] % 3)) * TWO_PI;

    const duration = Math.max(3, Math.min(15, durationSec)) * 1000;
    const t0 = performance.now();
    lastSegmentRef.current = -1;

    const tick = (now) => {
      if (cancelled) return;
      const elapsed = now - t0;
      const p = Math.min(1, elapsed / duration);
      const eased = easeOutQuint(p) * 0.85 + easeOutCubic(p) * 0.15;
      const angle = startAngle + delta * eased;
      angleRef.current = angle;
      draw(angle, null);

      if (n > 1) {
        const seg = sectorAtPointer(angle, n);
        if (seg !== lastSegmentRef.current) {
          lastSegmentRef.current = seg;
          playTick(sfxVolume * (0.5 + 0.5 * (1 - p)));
        }
      }

      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else if (!finished) {
        finished = true;
        spinningRef.current = false;
        const finalRot = startAngle + delta;
        angleRef.current = finalRot;
        // Ganador = propietario del sector donde quedó la flecha
        const sectorIndex = sectorAtPointer(finalRot, n);
        const resolvedWinner = list[sectorIndex] ?? null;
        draw(finalRot, resolvedWinner);

        if (confettiEnabled) {
          const colors = ["#d4af37", "#f0d78c", "#5b9fd4", "#d45b4a", "#4a9a5b"];
          try {
            confetti({ particleCount: 120, spread: 80, origin: { y: 0.35 }, colors });
            confetti({
              particleCount: 50,
              angle: 60,
              spread: 55,
              origin: { x: 0, y: 0.5 },
              colors,
            });
            confetti({
              particleCount: 50,
              angle: 120,
              spread: 55,
              origin: { x: 1, y: 0.5 },
              colors,
            });
          } catch {
            /* ignore */
          }
        }

        playVictoryFanfare(sfxVolume);
        onCompleteRef.current?.();
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      spinningRef.current = false;
    };
  }, [spinning, targetAngle, durationSec, sfxVolume, confettiEnabled]);

  return (
    <div className="relative mx-auto inline-block">
      <div
        className="absolute top-1/2 right-0 z-10 translate-x-1 -translate-y-1/2"
        aria-hidden
      >
        <div
          className="h-0 w-0 border-t-[14px] border-b-[14px] border-r-[28px] border-t-transparent border-b-transparent border-r-mtg-gold"
          style={{ filter: "drop-shadow(0 0 6px rgba(212,175,55,0.7))" }}
        />
      </div>

      <canvas
        ref={canvasRef}
        className="rounded-full shadow-[0_0_40px_rgba(212,175,55,0.2)]"
        width={size}
        height={size}
      />

      {participants.length > 40 && (
        <p className="mt-2 text-center text-xs text-mtg-ember">
          Aviso: {participants.length} participantes — nombres abreviados.
        </p>
      )}
    </div>
  );
}
