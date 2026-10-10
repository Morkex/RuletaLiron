import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { MusicPlayer, unlockAudio } from "../lib/audio";
import { CONFIG_DEFAULTS, DEFAULT_PRIZES } from "../lib/constants";
import { fairSpin } from "../lib/fairRandom";
import { parseParticipants } from "../lib/parseParticipants";

const AppContext = createContext(null);
const STORAGE_KEY = "ruletaliron-v1";

function loadStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function AppProvider({ children }) {
  const stored = loadStored();

  const [tab, setTab] = useState("sorteo");
  const [participants, setParticipants] = useState(stored?.participants ?? []);
  const [eliminated, setEliminated] = useState(stored?.eliminated ?? []);
  const [prizes, setPrizes] = useState(stored?.prizes ?? DEFAULT_PRIZES);
  const [currentPrizeIndex, setCurrentPrizeIndex] = useState(
    stored?.currentPrizeIndex ?? 0,
  );
  const [config, setConfig] = useState({
    ...CONFIG_DEFAULTS,
    ...(stored?.config ?? {}),
  });
  const [auditLog, setAuditLog] = useState(stored?.auditLog ?? []);
  const [spinResult, setSpinResult] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [showFairPlay, setShowFairPlay] = useState(false);
  const [winnerModal, setWinnerModal] = useState(null);
  const [lastFairDraw, setLastFairDraw] = useState(null);

  const musicRef = useRef(new MusicPlayer());
  const spinResultRef = useRef(null);
  const finishLockRef = useRef(false);

  useEffect(() => {
    spinResultRef.current = spinResult;
  }, [spinResult]);

  useEffect(() => {
    try {
      const payload = {
        participants,
        // Sin imágenes (base64) para no petar localStorage
        eliminated: eliminated.map(({ id, name, prize, at }) => ({
          id,
          name,
          prize,
          at,
        })),
        prizes,
        currentPrizeIndex,
        config,
        auditLog: auditLog.slice(0, 80),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {
      console.warn("No se pudo guardar el estado (localStorage):", err);
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            participants,
            eliminated: eliminated.map(({ id, name, prize, at }) => ({
              id,
              name,
              prize,
              at,
            })),
            prizes: prizes.map(({ id, name, image }) => ({
              id,
              name,
              image: String(image || "").startsWith("data:") ? "" : image,
            })),
            currentPrizeIndex,
            config,
            auditLog: [],
          }),
        );
      } catch {
        /* ignore */
      }
    }
  }, [participants, eliminated, prizes, currentPrizeIndex, config, auditLog]);

  const resolveMusicUrl = useCallback(() => {
    if (config.musicTrackId === "custom1") {
      return config.customMusicUrl1 || "ambient";
    }
    if (config.musicTrackId === "custom2") {
      return config.customMusicUrl2 || "ambient";
    }
    return "ambient";
  }, [config]);

  useEffect(() => {
    const player = musicRef.current;
    if (config.musicEnabled) {
      player.play(resolveMusicUrl(), config.musicVolume);
    } else {
      player.stop();
    }
    return () => player.stop();
  }, [config.musicEnabled, config.musicTrackId, resolveMusicUrl]);

  useEffect(() => {
    musicRef.current.setVolume(config.musicVolume);
  }, [config.musicVolume]);

  const currentPrize = prizes[currentPrizeIndex] ?? null;

  const spinLockRef = useRef(false);

  const markWinnerEliminated = useCallback((winnerName, prize) => {
    const prizeLabel =
      typeof prize === "string" ? prize : prize?.name ?? "Premio";
    setParticipants((prev) => prev.filter((p) => p !== winnerName));
    setEliminated((prev) => {
      const key = winnerName.toLocaleLowerCase("es");
      const withoutDup = prev.filter((e) => e.name.toLocaleLowerCase("es") !== key);
      return [
        {
          id: uid("elim"),
          name: winnerName,
          prize: prizeLabel,
          at: Date.now(),
        },
        ...withoutDup,
      ];
    });
  }, []);

  const importRawList = useCallback((raw) => {
    const parsed = parseParticipants(raw);
    setParticipants(parsed);
    setEliminated([]);
    return parsed.length;
  }, []);

  const addParticipant = useCallback((name) => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    const key = trimmed.toLocaleLowerCase("es");
    setEliminated((prev) => prev.filter((e) => e.name.toLocaleLowerCase("es") !== key));
    setParticipants((prev) => {
      if (prev.some((p) => p.toLocaleLowerCase("es") === key)) {
        return prev;
      }
      return [...prev, trimmed];
    });
    return true;
  }, []);

  const removeParticipant = useCallback((name) => {
    setParticipants((prev) => prev.filter((p) => p !== name));
  }, []);

  const restoreEliminated = useCallback((name) => {
    setEliminated((prev) => {
      const entry = prev.find((e) => e.name === name);
      if (entry) {
        setParticipants((plist) =>
          plist.some((p) => p.toLocaleLowerCase("es") === name.toLocaleLowerCase("es"))
            ? plist
            : [...plist, name],
        );
      }
      return prev.filter((e) => e.name !== name);
    });
  }, []);

  const clearParticipants = useCallback(() => {
    setParticipants([]);
    setEliminated([]);
  }, []);

  const addPrize = useCallback((prize) => {
    setPrizes((prev) => [
      ...prev,
      { id: uid("prize"), name: prize.name, image: prize.image },
    ]);
  }, []);

  const removePrize = useCallback((id) => {
    setPrizes((prev) => {
      const next = prev.filter((p) => p.id !== id);
      setCurrentPrizeIndex((idx) => Math.min(idx, Math.max(0, next.length - 1)));
      return next;
    });
  }, []);

  const updatePrize = useCallback((id, patch) => {
    setPrizes((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const reorderPrizes = useCallback(
    (next) => {
      const currentId = prizes[currentPrizeIndex]?.id;
      setPrizes(next);
      if (currentId) {
        const newIndex = next.findIndex((p) => p.id === currentId);
        setCurrentPrizeIndex(newIndex >= 0 ? newIndex : 0);
      }
    },
    [prizes, currentPrizeIndex],
  );

  /** Mueve un premio un puesto arriba (-1) o abajo (+1) */
  const movePrize = useCallback(
    (index, direction) => {
      const target = index + direction;
      if (target < 0 || target >= prizes.length) return;
      const next = [...prizes];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      reorderPrizes(next);
    },
    [prizes, reorderPrizes],
  );

  const updateConfig = useCallback((patch) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const beginSpin = useCallback(async () => {
    if (
      spinLockRef.current ||
      isSpinning ||
      spinResult ||
      winnerModal ||
      participants.length === 0 ||
      !currentPrize
    ) {
      return null;
    }

    spinLockRef.current = true;
    finishLockRef.current = false;
    await unlockAudio();

    try {
      const draw = fairSpin(participants);
      const result = { ...draw, prize: currentPrize };
      const entry = {
        id: uid("audit"),
        tirada: auditLog.length + 1,
        winner: draw.winner,
        entropy: draw.entropy,
        decimal: draw.decimal,
        percentage: draw.percentage,
        finalAngleDeg: Number(((draw.finalAngle * 180) / Math.PI).toFixed(4)),
        sectorIndex: draw.index,
        prize: currentPrize.name,
        timestamp: draw.timestamp,
        participantsCount: participants.length,
      };

      spinResultRef.current = result;
      setLastFairDraw(result);
      setSpinResult(result);
      setAuditLog((prev) => [entry, ...prev].slice(0, 100));
      setIsSpinning(true);
      return draw;
    } catch (err) {
      console.error(err);
      spinLockRef.current = false;
      spinResultRef.current = null;
      return null;
    }
  }, [isSpinning, spinResult, winnerModal, participants, currentPrize, auditLog.length]);

  const finishSpin = useCallback(() => {
    if (finishLockRef.current) return;
    const current = spinResultRef.current;
    setIsSpinning(false);

    if (!current) {
      spinLockRef.current = false;
      return;
    }

    finishLockRef.current = true;

    if (config.autoRemoveWinner) {
      markWinnerEliminated(current.winner, current.prize);
      setCurrentPrizeIndex((idx) => {
        const next = idx + 1;
        return next < prizes.length ? next : idx;
      });
      setWinnerModal(null);
      setSpinResult(null);
      spinResultRef.current = null;
      spinLockRef.current = false;
      finishLockRef.current = false;
      return;
    }

    setWinnerModal({
      winner: current.winner,
      prize: current.prize,
      entropy: current.entropy,
      decimal: current.decimal,
    });
    // Mantener spinResult hasta confirmar; liberar finishLock para no bloquear confirm
    finishLockRef.current = false;
  }, [config.autoRemoveWinner, prizes.length, markWinnerEliminated]);

  const confirmWinner = useCallback(
    (remove) => {
      const modal = winnerModal;
      if (!modal) return;

      if (remove) {
        markWinnerEliminated(modal.winner, modal.prize);
      }
      setCurrentPrizeIndex((idx) => {
        const next = idx + 1;
        return next < prizes.length ? next : idx;
      });
      setWinnerModal(null);
      setSpinResult(null);
      spinResultRef.current = null;
      setIsSpinning(false);
      spinLockRef.current = false;
      finishLockRef.current = false;
    },
    [winnerModal, prizes.length, markWinnerEliminated],
  );

  const toggleMusic = useCallback(async () => {
    await unlockAudio();
    setConfig((prev) => ({ ...prev, musicEnabled: !prev.musicEnabled }));
  }, []);

  const value = useMemo(
    () => ({
      tab,
      setTab,
      participants,
      eliminated,
      prizes,
      currentPrize,
      currentPrizeIndex,
      setCurrentPrizeIndex,
      config,
      updateConfig,
      auditLog,
      spinResult,
      isSpinning,
      showFairPlay,
      setShowFairPlay,
      winnerModal,
      lastFairDraw,
      importRawList,
      addParticipant,
      removeParticipant,
      restoreEliminated,
      clearParticipants,
      addPrize,
      removePrize,
      updatePrize,
      reorderPrizes,
      movePrize,
      beginSpin,
      finishSpin,
      confirmWinner,
      toggleMusic,
    }),
    [
      tab,
      participants,
      eliminated,
      prizes,
      currentPrize,
      currentPrizeIndex,
      config,
      updateConfig,
      auditLog,
      spinResult,
      isSpinning,
      showFairPlay,
      winnerModal,
      lastFairDraw,
      importRawList,
      addParticipant,
      removeParticipant,
      restoreEliminated,
      clearParticipants,
      addPrize,
      removePrize,
      updatePrize,
      reorderPrizes,
      movePrize,
      beginSpin,
      finishSpin,
      confirmWinner,
      toggleMusic,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp debe usarse dentro de AppProvider");
  return ctx;
}
