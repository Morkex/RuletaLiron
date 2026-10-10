/**
 * Gestor de audio: ticks (Web Audio), victoria y música de fondo (HTMLAudio / URL).
 * Los tracks se pueden sustituir fácilmente en CONFIG_DEFAULTS o en la pestaña Config.
 */

let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export async function unlockAudio() {
  try {
    const ctx = getCtx();
    if (ctx.state === "suspended") await ctx.resume();
  } catch {
    /* ignore */
  }
}

/** Tick corto tipo pestaña de ruleta */
export function playTick(sfxVolume = 0.6) {
  try {
    const ctx = getCtx();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(1800, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.03);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, 0.12 * sfxVolume), t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.05);
  } catch {
    /* ignore */
  }
}

/** Fanfarria de victoria generada por Web Audio */
export function playVictoryFanfare(sfxVolume = 0.7) {
  try {
    const ctx = getCtx();
    const notes = [523.25, 659.25, 783.99, 1046.5];
    const start = ctx.currentTime;

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      const t0 = start + i * 0.12;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, 0.18 * sfxVolume), t0 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.4);
    });

    // Chord sustain
    const chord = [523.25, 659.25, 783.99];
    chord.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t0 = start + 0.45;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, 0.1 * sfxVolume), t0 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.9);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 1);
    });
  } catch {
    /* ignore */
  }
}

/** Drone ambient de respaldo si no hay URL de música */
let ambientNodes = null;

export function startAmbientDrone(musicVolume = 0.25) {
  stopAmbientDrone();
  try {
    const ctx = getCtx();
    const master = ctx.createGain();
    master.gain.value = Math.max(0, Math.min(1, musicVolume)) * 0.08;
    master.connect(ctx.destination);

    const freqs = [55, 82.5, 110];
    const oscs = freqs.map((f, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = i === 0 ? "sine" : "triangle";
      osc.frequency.value = f;
      g.gain.value = 0.4 / freqs.length;
      osc.connect(g);
      g.connect(master);
      osc.start();
      return osc;
    });

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.08;
    lfoGain.gain.value = 0.03;
    lfo.connect(lfoGain);
    lfoGain.connect(master.gain);
    lfo.start();

    ambientNodes = { master, oscs, lfo };
  } catch {
    ambientNodes = null;
  }
}

export function setAmbientVolume(musicVolume) {
  if (ambientNodes?.master) {
    ambientNodes.master.gain.value = Math.max(0, Math.min(1, musicVolume)) * 0.08;
  }
}

export function stopAmbientDrone() {
  if (!ambientNodes) return;
  try {
    ambientNodes.oscs.forEach((o) => o.stop());
    ambientNodes.lfo.stop();
  } catch {
    /* ignore */
  }
  ambientNodes = null;
}

export class MusicPlayer {
  constructor() {
    this.audio = null;
    this.usingAmbient = false;
  }

  async play(url, volume = 0.35) {
    this.stop();
    if (!url || url === "ambient") {
      startAmbientDrone(volume);
      this.usingAmbient = true;
      return;
    }

    try {
      const audio = new Audio(url);
      audio.loop = true;
      audio.volume = Math.max(0, Math.min(1, volume));
      await audio.play();
      this.audio = audio;
      this.usingAmbient = false;
    } catch {
      startAmbientDrone(volume);
      this.usingAmbient = true;
    }
  }

  setVolume(volume) {
    if (this.usingAmbient) {
      setAmbientVolume(volume);
    } else if (this.audio) {
      this.audio.volume = Math.max(0, Math.min(1, volume));
    }
  }

  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }
    stopAmbientDrone();
    this.usingAmbient = false;
  }
}
