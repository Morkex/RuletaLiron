import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const W = 800;
const H = 280;
const GROUND_Y = 220;
const LIRON_SIZE = 48;

/** Unidades por segundo (independiente de FPS). */
const GRAVITY = 1850;
const JUMP_V = -620;
const SPEED_START = 420;
const SPEED_MAX = 840;
const SPEED_RAMP_S = 45; // segundos hasta cerca del máximo (x2 vs antes)

/**
 * Minijuego tipo dinosaurio de Chrome, con el logo del Lirón.
 */
export default function LironRunnerGame({ open, onClose }) {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [hi, setHi] = useState(() => {
    try {
      return Number(localStorage.getItem("ruletaliron-liron-runner-hi") || 0);
    } catch {
      return 0;
    }
  });
  const [status, setStatus] = useState("ready");

  useEffect(() => {
    if (!open) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const img = new Image();
    img.src = "/brand/liron-icon.png";

    const state = {
      running: false,
      dead: false,
      y: GROUND_Y - LIRON_SIZE,
      vy: 0,
      onGround: true,
      speed: SPEED_START,
      distance: 0,
      obstacles: [],
      spawnTimer: 0.7,
      time: 0,
      score: 0,
      hiBest: hi,
      lastShownScore: -1,
      animId: 0,
      lastTs: 0,
      flash: 0,
    };

    const reset = () => {
      state.running = false;
      state.dead = false;
      state.y = GROUND_Y - LIRON_SIZE;
      state.vy = 0;
      state.onGround = true;
      state.speed = SPEED_START;
      state.distance = 0;
      state.obstacles = [];
      state.spawnTimer = 0.75;
      state.time = 0;
      state.score = 0;
      state.lastShownScore = -1;
      state.flash = 0;
      setScore(0);
      setStatus("ready");
    };

    const jump = () => {
      if (state.dead) {
        reset();
        state.running = true;
        setStatus("playing");
        return;
      }
      if (!state.running) {
        state.running = true;
        setStatus("playing");
      }
      if (state.onGround) {
        state.vy = JUMP_V;
        state.onGround = false;
      }
    };

    const spawnObstacle = () => {
      const roll = Math.random();
      if (roll < 0.55) {
        const h = 30 + Math.random() * 20;
        state.obstacles.push({
          x: W + 20,
          w: 16 + Math.random() * 8,
          h,
          kind: "book",
        });
      } else if (roll < 0.85) {
        const h = 26 + Math.random() * 14;
        state.obstacles.push({
          x: W + 20,
          w: 30,
          h,
          kind: "books",
        });
      } else {
        state.obstacles.push({
          x: W + 20,
          w: 24,
          h: 22,
          kind: "cup",
        });
      }
    };

    const hitTest = (ox, ow, oh) => {
      // Hitbox más generosa (perdonadora)
      const px = 56 + 12;
      const py = state.y + 10;
      const pw = LIRON_SIZE - 22;
      const ph = LIRON_SIZE - 16;
      const bx = ox + 4;
      const by = GROUND_Y - oh + 2;
      const bw = ow - 8;
      const bh = oh - 4;
      return px < bx + bw && px + pw > bx && py < by + bh && py + ph > by;
    };

    const roundRect = (x, y, w, h, r) => {
      const rr = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + rr, y);
      ctx.arcTo(x + w, y, x + w, y + h, rr);
      ctx.arcTo(x + w, y + h, x, y + h, rr);
      ctx.arcTo(x, y + h, x, y, rr);
      ctx.arcTo(x, y, x + w, y, rr);
      ctx.closePath();
    };

    const drawGround = (offset) => {
      ctx.strokeStyle = "rgba(155,181,159,0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y + 0.5);
      ctx.lineTo(W, GROUND_Y + 0.5);
      ctx.stroke();

      ctx.fillStyle = "rgba(155,181,159,0.2)";
      for (let i = 0; i < 18; i++) {
        const x = ((i * 56 - offset * 0.35) % (W + 56)) + 56;
        roundRect(x, GROUND_Y + 8, 20, 3, 1.5);
        ctx.fill();
      }
    };

    const drawObstacle = (o) => {
      const y = GROUND_Y - o.h;
      if (o.kind === "cup") {
        ctx.fillStyle = "#8a6a2a";
        roundRect(o.x, y + 7, o.w, o.h - 7, 4);
        ctx.fill();
        ctx.fillStyle = "#c9a84c";
        roundRect(o.x - 2, y + 4, o.w + 4, 6, 3);
        ctx.fill();
        ctx.strokeStyle = "rgba(232,240,234,0.85)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(o.x + o.w + 1, y + 16, 7, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
      } else if (o.kind === "books") {
        ctx.fillStyle = "#5c2430";
        roundRect(o.x, y, 13, o.h, 3);
        ctx.fill();
        ctx.fillStyle = "#1e3a5f";
        roundRect(o.x + 15, y + 5, 13, o.h - 5, 3);
        ctx.fill();
        ctx.fillStyle = "rgba(232,240,234,0.3)";
        ctx.fillRect(o.x + 3, y + 6, 7, 2);
        ctx.fillRect(o.x + 18, y + 10, 7, 2);
      } else {
        ctx.fillStyle = "#455a49";
        roundRect(o.x, y, o.w, o.h, 4);
        ctx.fill();
        ctx.fillStyle = "rgba(155,181,159,0.85)";
        roundRect(o.x + 3, y + 5, o.w - 6, 4, 2);
        ctx.fill();
      }
    };

    const drawLiron = () => {
      const x = 56;
      const y = state.y;
      const bob = state.onGround
        ? Math.sin(state.time * (state.running ? 10 : 2.2)) *
          (state.running ? 2.2 : 3)
        : state.vy < 0
          ? -1.5
          : 0.5;
      const squash =
        state.onGround && state.running
          ? 1 + Math.sin(state.time * 10) * 0.03
          : 1;
      const stretch = state.onGround ? 1 : state.vy < 0 ? 0.95 : 1.05;

      ctx.save();
      const cx = x + LIRON_SIZE / 2;
      const cy = y + LIRON_SIZE / 2 + bob;
      ctx.translate(cx, cy);
      ctx.scale(squash, stretch);
      ctx.translate(-cx, -cy);

      ctx.beginPath();
      ctx.arc(cx, cy, LIRON_SIZE / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      if (img.complete && img.naturalWidth) {
        ctx.drawImage(
          img,
          x,
          y + bob,
          LIRON_SIZE,
          LIRON_SIZE,
        );
      } else {
        ctx.fillStyle = "#455a49";
        ctx.fillRect(x, y + bob, LIRON_SIZE, LIRON_SIZE);
      }
      ctx.restore();

      ctx.strokeStyle = "rgba(201,168,76,0.75)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, LIRON_SIZE / 2, 0, Math.PI * 2);
      ctx.stroke();
    };

    const drawHud = () => {
      ctx.fillStyle = "#e4ebe6";
      ctx.font = "600 15px 'Source Sans 3', system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(
        `HI ${String(Math.floor(state.hiBest)).padStart(5, "0")}`,
        W - 20,
        28,
      );
      ctx.fillText(String(Math.floor(state.score)).padStart(5, "0"), W - 20, 50);

      ctx.textAlign = "center";
      if (!state.running && !state.dead) {
        const pulse = 0.55 + Math.sin(state.time * 3) * 0.2;
        ctx.fillStyle = `rgba(155,181,159,${pulse})`;
        ctx.font = "500 15px 'Source Sans 3', system-ui, sans-serif";
        ctx.fillText("Pulsa espacio / clic para empezar", W / 2, 52);
      }
      if (state.dead) {
        ctx.fillStyle = "#e8f0ea";
        ctx.font = "600 22px Cinzel, serif";
        ctx.fillText("El Lirón se tropezó", W / 2, 64);
        ctx.font = "500 14px 'Source Sans 3', system-ui, sans-serif";
        ctx.fillStyle = "#9bb59f";
        ctx.fillText("Espacio o clic para reintentar", W / 2, 92);
      }
    };

    const tick = (ts) => {
      if (!state.lastTs) state.lastTs = ts;
      // Clamp dt para evitar saltos al cambiar de pestaña
      const dt = Math.min(0.033, (ts - state.lastTs) / 1000);
      state.lastTs = ts;
      state.time += dt;
      if (state.flash > 0) state.flash = Math.max(0, state.flash - dt);

      ctx.clearRect(0, 0, W, H);

      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#1a2420");
      g.addColorStop(1, "#121916");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      // Nubes lentas y suaves
      ctx.fillStyle = "rgba(155,181,159,0.1)";
      const cloudOff = (state.distance * 0.12) % (W + 160);
      for (let i = 0; i < 3; i++) {
        const cx = ((i * 280 - cloudOff) % (W + 160)) + 50;
        const cy = 42 + i * 24 + Math.sin(state.time * 0.6 + i) * 3;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 34, 12, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + 22, cy + 2, 24, 10, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      drawGround(state.distance);

      if (state.running && !state.dead) {
        state.vy += GRAVITY * dt;
        state.y += state.vy * dt;
        if (state.y >= GROUND_Y - LIRON_SIZE) {
          state.y = GROUND_Y - LIRON_SIZE;
          // Aterrizaje suave: amortigua un poco en vez de frenazo seco
          if (state.vy > 80) state.flash = 0.08;
          state.vy = 0;
          state.onGround = true;
        }

        const t = Math.min(1, state.time / SPEED_RAMP_S);
        // ease-in-out suave
        const ease = t * t * (3 - 2 * t);
        state.speed = SPEED_START + (SPEED_MAX - SPEED_START) * ease;
        state.distance += state.speed * dt;
        state.score = Math.floor(state.distance / 18);
        if (state.score !== state.lastShownScore) {
          state.lastShownScore = state.score;
          setScore(state.score);
        }

        state.spawnTimer -= dt;
        if (state.spawnTimer <= 0) {
          spawnObstacle();
          const gap = 0.78 - ease * 0.22 + Math.random() * 0.35;
          state.spawnTimer = Math.max(0.42, gap);
        }

        for (const o of state.obstacles) {
          o.x -= state.speed * dt;
        }
        state.obstacles = state.obstacles.filter((o) => o.x + o.w > -30);

        for (const o of state.obstacles) {
          if (hitTest(o.x, o.w, o.h)) {
            state.dead = true;
            state.running = false;
            state.flash = 0.25;
            setStatus("dead");
            const best = Math.max(state.hiBest, state.score);
            state.hiBest = best;
            setHi(best);
            try {
              localStorage.setItem("ruletaliron-liron-runner-hi", String(best));
            } catch {
              /* ignore */
            }
            break;
          }
        }
      }

      for (const o of state.obstacles) drawObstacle(o);
      drawLiron();
      drawHud();

      if (state.flash > 0) {
        ctx.fillStyle = `rgba(232,240,234,${state.flash * 0.35})`;
        ctx.fillRect(0, 0, W, H);
      }

      state.animId = requestAnimationFrame(tick);
    };

    const onKey = (e) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        jump();
      }
      if (e.key === "Escape") onClose?.();
    };
    const onClick = () => jump();

    window.addEventListener("keydown", onKey);
    canvas.addEventListener("pointerdown", onClick);
    reset();
    state.animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(state.animId);
      window.removeEventListener("keydown", onKey);
      canvas.removeEventListener("pointerdown", onClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Lirón Runner"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="panel gold-border mx-auto w-full max-w-[860px] rounded-2xl p-5 shadow-2xl md:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl text-gold-gradient">
              Lirón Runner
            </h2>
            <p className="mt-0.5 text-sm text-mtg-frost/55">
              Espacio o clic para saltar · Esc para cerrar
            </p>
          </div>
          <button
            type="button"
            className="btn-ghost rounded-md px-3 py-1.5 text-sm"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="mx-auto block w-full max-w-full rounded-xl border border-mtg-gold/30 bg-mtg-void"
        />

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-mtg-frost/60">
          <span>
            Puntos:{" "}
            <strong className="text-mtg-gold-bright">{Math.floor(score)}</strong>
            {" · "}
            Récord: <strong className="text-mtg-gold">{Math.floor(hi)}</strong>
          </span>
          <span className="capitalize text-mtg-frost/40">{status}</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
