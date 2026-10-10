import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { playTick, playVictoryFanfare } from "../lib/audio";
import { sectorAtPointer } from "../lib/fairRandom";
import { randomWheelColors, WHEEL_COLORS } from "../lib/constants";

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

function easeOutQuint(t) {
  return 1 - (1 - t) ** 5;
}

function lighten(color, amount = 0.22) {
  const hsl = String(color).match(/hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*\)/i);
  if (hsl) {
    const h = Number(hsl[1]);
    const s = Number(hsl[2]);
    const l = Math.min(52, Number(hsl[3]) + amount * 100);
    return `hsl(${h} ${s}% ${l}%)`;
  }
  const n = String(color || "#1e3a5f").replace("#", "");
  const num = Number.parseInt(n.length === 3 ? n.split("").map((c) => c + c).join("") : n, 16);
  if (Number.isNaN(num)) return color;
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
  const hubLogoRef = useRef(null);
  const colorsRef = useRef([]);
  const colorsKeyRef = useRef("");

  participantsRef.current = participants;
  sizeRef.current = size;
  onCompleteRef.current = onSpinComplete;

  const ensureColors = (list) => {
    const key = list.join("\0");
    if (colorsKeyRef.current !== key || colorsRef.current.length !== list.length) {
      colorsKeyRef.current = key;
      colorsRef.current =
        list.length > 0 ? randomWheelColors(list.length) : [];
    }
    return colorsRef.current;
  };

  const draw = (rotation, highlightName = null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const list = participantsRef.current || [];
    const n = list.length;
    const sectorColors = ensureColors(list);
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
    ctx.strokeStyle = "#9bb59f";
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, radius + 1, 0, Math.PI * 2);
    ctx.strokeStyle = "#e8f0ea";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (n === 0) {
      ctx.fillStyle = "#2f4036";
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e8f0ea";
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
      const base = sectorColors[0] || WHEEL_COLORS[0];
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fillStyle = isWinner ? lighten(base, 0.35) : base;
      ctx.fill();
      ctx.strokeStyle = isWinner ? "#e8f0ea" : "rgba(155, 181, 159, 0.4)";
      ctx.lineWidth = isWinner ? 3 : 1;
      ctx.stroke();

      if (list[0]) {
        ctx.fillStyle = isWinner ? "#e8f0ea" : "#eef3ef";
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
        const base = sectorColors[i] || WHEEL_COLORS[i % WHEEL_COLORS.length];

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, start, end);
        ctx.closePath();
        ctx.fillStyle = isWinner ? lighten(base, 0.35) : base;
        ctx.fill();
        ctx.strokeStyle = isWinner ? "#e8f0ea" : "rgba(155, 181, 159, 0.4)";
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
          ctx.fillStyle = isWinner ? "#e8f0ea" : "#eef3ef";
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

    // Centro con logo El Lirón
    ctx.beginPath();
    ctx.arc(cx, cy, 36, 0, Math.PI * 2);
    ctx.fillStyle = "#455a49";
    ctx.fill();
    ctx.strokeStyle = "#9bb59f";
    ctx.lineWidth = 3;
    ctx.stroke();

    const hubLogo = hubLogoRef.current;
    if (hubLogo?.complete) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, 30, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(hubLogo, cx - 30, cy - 30, 60, 60);
      ctx.restore();
    } else {
      ctx.fillStyle = "#e8f0ea";
      ctx.font = "700 11px Cinzel, serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("LIRÓN", cx, cy);
    }

    // Punto en el borde bajo la flecha: marca el sector elegido
    if (winnerIdx >= 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx + radius - 2, cy, 7, 0, Math.PI * 2);
      ctx.fillStyle = "#e8f0ea";
      ctx.shadowColor = "rgba(232, 240, 234, 0.85)";
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.restore();
    }
  };

  // Logo del hub
  useEffect(() => {
    const img = new Image();
    img.src = "/brand/liron-icon.png";
    img.onload = () => {
      hubLogoRef.current = img;
      if (!spinningRef.current) {
        draw(angleRef.current, null);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          const colors = ["#455a49", "#9bb59f", "#e8f0ea", "#6d8575", "#d4b896"];
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
          className="h-0 w-0 border-t-[14px] border-b-[14px] border-r-[28px] border-t-transparent border-b-transparent border-r-mtg-gold-bright"
          style={{ filter: "drop-shadow(0 0 6px rgba(155,181,159,0.75))" }}
        />
      </div>

      <canvas
        ref={canvasRef}
        className="rounded-full shadow-[0_0_40px_rgba(69,90,73,0.45)]"
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
