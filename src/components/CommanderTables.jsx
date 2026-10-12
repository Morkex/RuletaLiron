import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../context/AppContext";
import {
  assignCommanderTables,
  computeTableSizes,
  formatSizes,
  COMMANDER_CONFIG_DEFAULTS,
  normalizeCommanderConfig,
  normalizeAvoidPairs,
  poolSeatCount,
  looksLikeTwoHeadedEntry,
  packTwoHeadedTeamsIntoRoom,
  packFixedSizeIntoRoom,
  parseTwoHeadedTeams,
  buildTeamColorByPlayer,
  twoHeadedTeamColor,
} from "../lib/commanderTables";
import { normalizeExtraMode } from "../lib/constants";
import {
  normalizeRoomLayout,
  mapPodsToRoom,
  roomCapacity,
  roomTableSizes,
  loadRoomTemplatesState,
  saveRoomTemplatesState,
  resolveTemplateLayout,
} from "../lib/roomLayout";
import RoomDesigner from "./RoomDesigner";
import RoomTemplatesBar from "./RoomTemplatesBar";
import AvoidPairsModal from "./AvoidPairsModal";
import WaitingBench from "./WaitingBench";
import { shortPlayerName } from "../lib/shortName";
import {
  publishSalaDisplay,
  salaDisplayUrl,
  resolveRoundLabel,
  formatRoundTimer,
  SALA_DISPLAY_CHANNEL,
  SALA_DISPLAY_STORAGE,
  SALA_ROUND_START_MSG,
} from "../lib/salaDisplay";

const CMD_STORAGE = "ruletaliron-commander-v2";

function loadCommander() {
  try {
    const raw = localStorage.getItem(CMD_STORAGE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function Seat({
  name,
  index,
  total,
  peers = [],
  archenemy = false,
  teamColor = null,
}) {
  // Coordenadas sobre el contenedor (no sobre el label): % del padre.
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
  const radius = total >= 5 ? 38 : 36;
  const left = 50 + radius * Math.cos(angle);
  const top = 50 + radius * Math.sin(angle);

  const teamStyle =
    !archenemy && teamColor
      ? {
          borderColor: teamColor,
          backgroundColor: "#0a1018",
          boxShadow: `inset 0 0 0 1px ${teamColor}55, 0 0 0 1px ${teamColor}, 0 4px 14px rgba(0,0,0,0.7)`,
        }
      : undefined;

  return (
    <div
      className="absolute z-10 w-[30%] max-w-[96px]"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        transform: "translate(-50%, -50%)",
      }}
      title={archenemy ? `${name} · Archenemy` : name}
    >
      <div
        className={`rounded-md px-1.5 py-1 text-center ${
          archenemy
            ? "border-2 border-mtg-mana-r bg-gradient-to-b from-[#3a0a0a] via-[#1a0505] to-black shadow-[0_0_14px_rgba(196,107,90,0.55),0_4px_12px_rgba(0,0,0,0.7)]"
            : teamColor
              ? "border-2"
              : "border border-mtg-gold/45 bg-mtg-ink/95 shadow-[0_4px_14px_rgba(0,0,0,0.55)]"
        }`}
        style={teamStyle}
        title={archenemy ? `${name} · Archenemy` : name}
      >
        <p
          className={`font-mono text-[9px] leading-none ${
            archenemy
              ? "font-bold tracking-wider text-mtg-mana-r"
              : "text-mtg-gold/70"
          }`}
          style={!archenemy && teamColor ? { color: teamColor } : undefined}
        >
          {archenemy ? "☠ AE" : index + 1}
        </p>
        <p
          className={`mt-0.5 truncate text-[11px] font-semibold leading-tight ${
            archenemy ? "text-red-200" : "text-mtg-frost"
          }`}
        >
          {shortPlayerName(name, peers)}
        </p>
      </div>
    </div>
  );
}

function TableCard({
  table,
  index,
  twoHeaded = false,
  archenemyMode = false,
  teamColors = {},
}) {
  const n = table.players.length;
  const teamCount = table.teams?.length || Math.floor(n / 2);
  const archName = table.archenemy || null;
  return (
    <motion.article
      layout
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      className="panel gold-border flex flex-col rounded-2xl p-4 md:p-5"
    >
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="font-display text-xl text-mtg-gold-bright">{table.label}</h3>
        <span className="rounded-full border border-mtg-gold/30 bg-mtg-brand/30 px-2.5 py-0.5 text-xs text-mtg-frost/80">
          {twoHeaded
            ? `${teamCount} equipo${teamCount === 1 ? "" : "s"} · ${n}`
            : `${n} jugadores`}
        </span>
      </div>

      {/* Vista en planta: mesa redonda + asientos en el perímetro */}
      <div className="relative mx-auto aspect-square w-full max-w-[300px]">
        {/* Anillo / borde de mesa */}
        <div
          className="absolute left-1/2 top-1/2 h-[58%] w-[58%] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, #8a6a2a, #c9a84c, #6b5220, #c9a84c, #8a6a2a)",
            boxShadow: "0 8px 28px rgba(0,0,0,0.45)",
          }}
        />
        {/* Paño / felt */}
        <div className="absolute left-1/2 top-1/2 flex h-[48%] w-[48%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-mtg-gold/20 bg-gradient-to-br from-[#1a4a32] via-[#0f3324] to-[#0a2418] shadow-[inset_0_2px_18px_rgba(0,0,0,0.55)]">
          <span className="font-display text-lg text-mtg-gold-bright/95">
            #{index + 1}
          </span>
          <span
            className={`mt-0.5 text-[10px] uppercase tracking-wider ${
              archenemyMode
                ? "font-semibold text-mtg-mana-r/90"
                : "text-mtg-frost/40"
            }`}
          >
            {twoHeaded ? "2 cabezas" : archenemyMode ? "☠ Archenemy" : "Commander"}
          </span>
        </div>

        {table.players.map((name, i) => (
          <Seat
            key={`${table.id}-${name}-${i}`}
            name={name}
            index={i}
            total={n}
            peers={table.players}
            teamColor={
              teamColors[String(name).toLocaleLowerCase("es")] || null
            }
            archenemy={
              Boolean(
                archName &&
                  name.toLocaleLowerCase("es") ===
                    String(archName).toLocaleLowerCase("es"),
              )
            }
          />
        ))}
      </div>

      <ol className="mt-4 space-y-1 border-t border-mtg-gold/15 pt-3 text-sm">
        {twoHeaded && table.teams?.length
          ? table.teams.map((pair, ti) => {
              const color =
                teamColors[String(pair?.[0] || "").toLocaleLowerCase("es")] ||
                teamColors[String(pair?.[1] || "").toLocaleLowerCase("es")] ||
                twoHeadedTeamColor(ti);
              return (
                <li
                  key={`${table.id}-team-${ti}`}
                  className="flex items-start gap-2 rounded-md border-2 px-2 py-1.5"
                  style={{
                    borderColor: color,
                    backgroundColor: "#0a1018",
                    boxShadow: `inset 3px 0 0 ${color}`,
                  }}
                >
                  <span
                    className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                    aria-hidden
                  />
                  <span className="min-w-0 text-mtg-frost/90">
                    <span className="font-mono text-xs" style={{ color }}>
                      Equipo {ti + 1}.
                    </span>{" "}
                    {pair[0]}{" "}
                    <span style={{ color: `${color}cc` }}>//</span> {pair[1]}
                  </span>
                </li>
              );
            })
          : table.players.map((name, i) => {
              const isArch =
                archName &&
                name.toLocaleLowerCase("es") ===
                  String(archName).toLocaleLowerCase("es");
              return (
                <li
                  key={`${name}-${i}`}
                  className={`flex gap-2 ${
                    isArch ? "font-semibold text-mtg-mana-r" : "text-mtg-frost/85"
                  }`}
                >
                  <span
                    className={`font-mono text-xs ${
                      isArch ? "text-mtg-mana-r" : "text-mtg-gold/50"
                    }`}
                  >
                    {isArch ? "☠" : `${i + 1}.`}
                  </span>
                  <span>
                    {name}
                    {isArch ? (
                      <span className="ml-1 text-[10px] uppercase tracking-wide text-mtg-mana-r/90">
                        · Archenemy
                      </span>
                    ) : null}
                  </span>
                </li>
              );
            })}
      </ol>
    </motion.article>
  );
}

function Toggle({ label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-mtg-gold/15 bg-mtg-void/40 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm text-mtg-frost">{label}</p>
        {description && (
          <p className="text-[11px] text-mtg-frost/45">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
          checked ? "bg-mtg-brand" : "bg-mtg-ink ring-1 ring-mtg-gold/30"
        }`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-mtg-frost transition ${
            checked ? "left-5" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}

function NumberField({ label, value, min, max, onChange, hint }) {
  return (
    <label className="block">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="font-display text-xs text-mtg-gold">{label}</span>
        <span className="font-mono text-sm text-mtg-gold-bright">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-mtg-gold"
      />
      {hint && <p className="mt-0.5 text-[11px] text-mtg-frost/40">{hint}</p>}
    </label>
  );
}

export default function CommanderTables() {
  const { participants, setTab, config: appConfig, updateConfig } = useApp();
  const stored = loadCommander();

  // Migración: flag antiguo de 2 cabezas → extraMode
  useEffect(() => {
    if (
      stored?.config?.twoHeadedGiant &&
      normalizeExtraMode(appConfig) === "none"
    ) {
      updateConfig({ extraMode: "twoHeaded" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [previousTables, setPreviousTables] = useState(
    stored?.previousTables ?? [],
  );
  const [tables, setTables] = useState(stored?.tables ?? []);
  /** Jugadores / parejas en espera (solo con plano de sala y sobran plazas) */
  const [waiting, setWaiting] = useState(() =>
    Array.isArray(stored?.waiting) ? stored.waiting.map(String) : [],
  );
  const [meta, setMeta] = useState(stored?.meta ?? null);
  const [cmdConfig, setCmdConfig] = useState(() =>
    normalizeCommanderConfig(stored?.config ?? COMMANDER_CONFIG_DEFAULTS),
  );
  const [tplState, setTplState] = useState(() => loadRoomTemplatesState());
  const [roomLayout, setRoomLayout] = useState(() => {
    if (stored?.roomLayout) return normalizeRoomLayout(stored.roomLayout);
    const initial = loadRoomTemplatesState();
    return resolveTemplateLayout(initial.activeId, initial.customSlots);
  });
  const [viewMode, setViewMode] = useState("reparto"); // reparto | sala | diseno | opciones
  const [useRoomCapacity, setUseRoomCapacity] = useState(
    stored?.useRoomCapacity ?? true,
  );
  const [showAvoidPairs, setShowAvoidPairs] = useState(false);
  const [avoidPairs, setAvoidPairs] = useState(() =>
    normalizeAvoidPairs(stored?.avoidPairs ?? []),
  );
  const [roundNumber, setRoundNumber] = useState(
    () => Math.max(1, Number(stored?.roundNumber) || 1),
  );
  /** Vacío = usar automáticamente "Ronda N" */
  const [roundTitle, setRoundTitle] = useState(
    () => String(stored?.roundTitle ?? ""),
  );
  /** false hasta que la pantalla de sala entre en fullscreen */
  const [roundTimerStarted, setRoundTimerStarted] = useState(() =>
    Boolean(stored?.roundTimerStarted),
  );
  const [roundStartedAt, setRoundStartedAt] = useState(
    () => Number(stored?.roundStartedAt) || Date.now(),
  );
  /** null = en marcha; número = ms congelados (0 = esperando pantalla completa) */
  const [roundPausedElapsedMs, setRoundPausedElapsedMs] = useState(() => {
    if (stored?.roundPausedElapsedMs != null) {
      return Number(stored.roundPausedElapsedMs);
    }
    // Por defecto: pausado en 0 hasta pantalla completa
    return stored?.roundTimerStarted ? null : 0;
  });
  const [timerNow, setTimerNow] = useState(() => Date.now());
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const roundTimerStartedRef = useRef(roundTimerStarted);
  roundTimerStartedRef.current = roundTimerStarted;

  const showSalaRoundLabel = cmdConfig.showSalaRoundLabel !== false;
  const showSalaRoundTimer = cmdConfig.showSalaRoundTimer !== false;

  const roundLabel = resolveRoundLabel(roundTitle, roundNumber);
  const timerElapsedMs = !roundTimerStarted
    ? 0
    : roundPausedElapsedMs != null
      ? roundPausedElapsedMs
      : Math.max(0, timerNow - roundStartedAt);
  const timerRunning =
    roundTimerStarted && roundPausedElapsedMs == null;

  const updateCmd = (patch) => {
    setCmdConfig((prev) => normalizeCommanderConfig({ ...prev, ...patch }));
  };

  /** Misma lista activa que los sorteos / ruleta */
  const pool = participants;
  /** Modos extra se configuran en Lista de Participantes */
  const extraMode = normalizeExtraMode(appConfig);
  const twoHG = extraMode === "twoHeaded";
  const archenemyMode = extraMode === "archenemy";
  const seatCount = useMemo(
    () => poolSeatCount(pool, twoHG),
    [pool, twoHG],
  );
  const teamCountPreview = twoHG ? Math.floor(seatCount / 2) : null;
  const listLooksLike2HG =
    pool.length > 0 && pool.every((p) => looksLikeTwoHeadedEntry(p));

  const roomSizes = useMemo(
    () => roomTableSizes(roomLayout).filter((n) => n > 0),
    [roomLayout],
  );
  const roomSeatTotal = useMemo(() => roomCapacity(roomLayout), [roomLayout]);
  /** En 2HG solo cuentan sillas pares por mesa del plano */
  const roomSizesEffective = useMemo(() => {
    if (!twoHG) return roomSizes;
    return roomSizes.map((n) => n - (n % 2)).filter((n) => n >= 2);
  }, [roomSizes, twoHG]);
  const roomSeatTotalEffective = useMemo(
    () => roomSizesEffective.reduce((a, b) => a + b, 0),
    [roomSizesEffective],
  );

  const baseCmdConfig = useMemo(
    () =>
      normalizeCommanderConfig({
        ...cmdConfig,
        twoHeadedGiant: twoHG,
        archenemy: archenemyMode,
        ...(twoHG
          ? {
              minPerTable: Math.max(4, cmdConfig.minPerTable),
              maxPerTable: Math.max(4, cmdConfig.maxPerTable),
            }
          : {}),
        ...(archenemyMode
          ? { minPerTable: 4, maxPerTable: 4 }
          : {}),
      }),
    [cmdConfig, twoHG, archenemyMode],
  );

  const effectiveConfig = useMemo(() => {
    if (!useRoomCapacity || !roomSizesEffective.length) return baseCmdConfig;
    const sum = roomSeatTotalEffective;
    const seatMax = Math.max(...roomSizesEffective);
    const seatMin = Math.min(...roomSizesEffective);

    // Igual o más plazas que sillas → llenar el plano; el exceso espera
    if (seatCount >= sum && sum > 0) {
      return {
        ...normalizeCommanderConfig({
          ...baseCmdConfig,
          minPerTable: Math.min(seatMin, baseCmdConfig.minPerTable),
          maxPerTable: Math.max(seatMax, baseCmdConfig.maxPerTable),
        }),
        exactSizes: roomSizesEffective,
      };
    }

    // Menos jugadores que sillas: reparte con capacidades del plano
    return {
      ...normalizeCommanderConfig({
        ...baseCmdConfig,
        tableCountMode: "auto",
        preferLargerTables: true,
        maxTableCount: roomSizesEffective.length,
        minPerTable: Math.min(baseCmdConfig.minPerTable, seatMin),
        maxPerTable: Math.max(baseCmdConfig.maxPerTable, seatMax),
        allowOversizedFallback: true,
      }),
      roomCapacities: roomSizesEffective,
    };
  }, [
    useRoomCapacity,
    roomSizesEffective,
    roomSeatTotalEffective,
    baseCmdConfig,
    seatCount,
  ]);

  const twoHgRoomPreview = useMemo(() => {
    if (!twoHG || !useRoomCapacity || !roomSizesEffective.length) return null;
    try {
      const teams = parseTwoHeadedTeams(pool);
      return packTwoHeadedTeamsIntoRoom(teams, roomSizesEffective, {
        minPerTable: baseCmdConfig.minPerTable,
        maxPerTable: baseCmdConfig.maxPerTable,
      });
    } catch {
      return null;
    }
  }, [
    twoHG,
    useRoomCapacity,
    roomSizesEffective,
    pool,
    baseCmdConfig.minPerTable,
    baseCmdConfig.maxPerTable,
  ]);

  const archenemyRoomPreview = useMemo(() => {
    if (!archenemyMode || !useRoomCapacity || !roomSizesEffective.length) {
      return null;
    }
    return packFixedSizeIntoRoom(pool, roomSizesEffective, { tableSize: 4 });
  }, [archenemyMode, useRoomCapacity, roomSizesEffective, pool]);

  const playSeatCount = useMemo(() => {
    if (twoHgRoomPreview) return twoHgRoomPreview.playTeamCount * 2;
    if (archenemyRoomPreview) return archenemyRoomPreview.playCount;
    if (useRoomCapacity && roomSeatTotalEffective > 0) {
      return Math.min(seatCount, roomSeatTotalEffective);
    }
    return seatCount;
  }, [
    twoHgRoomPreview,
    archenemyRoomPreview,
    useRoomCapacity,
    roomSeatTotalEffective,
    seatCount,
  ]);

  const waitPreviewCount = useMemo(() => {
    if (twoHgRoomPreview) return twoHgRoomPreview.waiting.length * 2;
    if (archenemyRoomPreview) return archenemyRoomPreview.waiting.length;
    if (!useRoomCapacity || roomSeatTotalEffective <= 0) return 0;
    return Math.max(0, seatCount - roomSeatTotalEffective);
  }, [
    twoHgRoomPreview,
    archenemyRoomPreview,
    useRoomCapacity,
    roomSeatTotalEffective,
    seatCount,
  ]);

  const previewSizes = useMemo(() => {
    if (twoHgRoomPreview) return twoHgRoomPreview.seatSizes;
    if (archenemyRoomPreview) return archenemyRoomPreview.seatSizes;
    const minOk =
      playSeatCount >= (effectiveConfig.minPerTable || 1) ||
      (Array.isArray(effectiveConfig.exactSizes) &&
        effectiveConfig.exactSizes.length > 0 &&
        playSeatCount > 0);
    return minOk ? computeTableSizes(playSeatCount, effectiveConfig) : [];
  }, [
    twoHgRoomPreview,
    archenemyRoomPreview,
    playSeatCount,
    effectiveConfig,
  ]);

  const {
    seatPlayers,
    tableLabels: roomLabels,
    seatRoles,
    seatTeamColors,
  } = useMemo(() => mapPodsToRoom(tables, roomLayout), [tables, roomLayout]);

  /** Un color distinto por pareja en todo el evento (Reparto + sala). */
  const teamColorsByPlayer = useMemo(
    () =>
      meta?.twoHeadedGiant || tables.some((t) => t?.teams?.length)
        ? buildTeamColorByPlayer(tables)
        : {},
    [tables, meta?.twoHeadedGiant],
  );

  useEffect(() => {
    try {
      localStorage.setItem(
        CMD_STORAGE,
        JSON.stringify({
          previousTables,
          tables,
          waiting,
          meta,
          config: cmdConfig,
          roomLayout,
          useRoomCapacity,
          avoidPairs,
          roundNumber,
          roundTitle,
          roundStartedAt,
          roundPausedElapsedMs,
          roundTimerStarted,
        }),
      );
    } catch {
      /* ignore */
    }
  }, [
    previousTables,
    tables,
    waiting,
    meta,
    cmdConfig,
    roomLayout,
    useRoomCapacity,
    avoidPairs,
    roundNumber,
    roundTitle,
    roundStartedAt,
    roundPausedElapsedMs,
    roundTimerStarted,
  ]);

  useEffect(() => {
    saveRoomTemplatesState(tplState);
  }, [tplState]);

  useEffect(() => {
    if (!timerRunning) return undefined;
    const id = setInterval(() => setTimerNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [timerRunning]);

  const armRoundTimerFromDisplay = useCallback(() => {
    if (roundTimerStartedRef.current) return;
    roundTimerStartedRef.current = true;
    setRoundTimerStarted(true);
    setRoundStartedAt(Date.now());
    setRoundPausedElapsedMs(null);
    setTimerNow(Date.now());
  }, []);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === `${SALA_DISPLAY_STORAGE}:round-start` && e.newValue) {
        armRoundTimerFromDisplay();
      }
    };
    window.addEventListener("storage", onStorage);

    let bc;
    try {
      bc = new BroadcastChannel(SALA_DISPLAY_CHANNEL);
      bc.onmessage = (ev) => {
        if (ev.data?.type === SALA_ROUND_START_MSG) {
          armRoundTimerFromDisplay();
        }
      };
    } catch {
      /* ignore */
    }

    return () => {
      window.removeEventListener("storage", onStorage);
      bc?.close?.();
    };
  }, [armRoundTimerFromDisplay]);

  const publishDisplay = useCallback(() => {
    publishSalaDisplay({
      layout: roomLayout,
      seatPlayers,
      tableLabels: roomLabels,
      seatRoles,
      seatTeamColors,
      title: "Mesas Commander",
      roundLabel,
      roundNumber,
      roundStartedAt,
      roundPausedElapsedMs,
      roundTimerStarted,
      showSalaRoundLabel,
      showSalaRoundTimer,
      waiting,
    });
  }, [
    roomLayout,
    seatPlayers,
    roomLabels,
    seatRoles,
    seatTeamColors,
    roundLabel,
    roundNumber,
    roundStartedAt,
    roundPausedElapsedMs,
    roundTimerStarted,
    showSalaRoundLabel,
    showSalaRoundTimer,
    waiting,
  ]);

  useEffect(() => {
    publishDisplay();
  }, [publishDisplay]);

  /** Reinicia y deja el crono a 0 esperando pantalla completa */
  const resetRoundTimer = () => {
    roundTimerStartedRef.current = false;
    setRoundTimerStarted(false);
    setRoundStartedAt(Date.now());
    setRoundPausedElapsedMs(0);
    setTimerNow(Date.now());
  };

  const toggleRoundTimer = () => {
    if (!roundTimerStarted) {
      // Arranque manual desde mesa de control (sin esperar fullscreen)
      armRoundTimerFromDisplay();
      return;
    }
    if (timerRunning) {
      setRoundPausedElapsedMs(Math.max(0, Date.now() - roundStartedAt));
    } else {
      const base = roundPausedElapsedMs ?? 0;
      setRoundStartedAt(Date.now() - base);
      setRoundPausedElapsedMs(null);
      setTimerNow(Date.now());
    }
  };

  const goNextRound = () => {
    setRoundNumber((n) => n + 1);
    setRoundTitle("");
    resetRoundTimer();
    setToast(`Pasando a Ronda ${roundNumber + 1} — crono al poner pantalla completa`);
    setTimeout(() => setToast(""), 2500);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.repeat) return;
      // Ctrl+Shift (al pulsar el segundo modificador)
      if (
        e.ctrlKey &&
        e.shiftKey &&
        (e.key === "Shift" || e.key === "Control")
      ) {
        e.preventDefault();
        setShowAvoidPairs(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const applyRoomTemplate = (templateId) => {
    const layout = resolveTemplateLayout(templateId, tplState.customSlots);
    setRoomLayout(layout);
    setTplState((s) => ({ ...s, activeId: templateId }));
    const label =
      tplState.customSlots.find((c) => c.id === templateId)?.name ||
      (templateId === "builtin-4"
        ? "4 mesas marrones"
        : templateId === "builtin-5"
          ? "Grande + 4 marrones"
          : "Plantilla");
    setToast(`Plantilla cargada: ${label}`);
    setTimeout(() => setToast(""), 2500);
  };

  const saveLayoutToSlot = (slotId, name, layout) => {
    setTplState((s) => ({
      ...s,
      activeId: slotId,
      customSlots: s.customSlots.map((slot) =>
        slot.id === slotId
          ? {
              ...slot,
              name: String(name || `Personalizada ${slot.slot}`).slice(0, 40),
              layout: normalizeRoomLayout(layout),
              updatedAt: Date.now(),
            }
          : slot,
      ),
    }));
    setToast(`Guardado en ${name}`);
    setTimeout(() => setToast(""), 2500);
  };

  const clearTemplateSlot = (slotId) => {
    setTplState((s) => ({
      ...s,
      activeId:
        s.activeId === slotId ? "builtin-5" : s.activeId,
      customSlots: s.customSlots.map((slot) =>
        slot.id === slotId
          ? { ...slot, name: "", layout: null, updatedAt: null }
          : slot,
      ),
    }));
    setToast("Slot vaciado");
    setTimeout(() => setToast(""), 2000);
  };

  const renameTemplateSlot = (slotId, name) => {
    setTplState((s) => ({
      ...s,
      customSlots: s.customSlots.map((slot) =>
        slot.id === slotId
          ? { ...slot, name: String(name).slice(0, 40) }
          : slot,
      ),
    }));
  };

  const handleGenerate = () => {
    setError("");
    try {
      const result = assignCommanderTables(
        pool,
        previousTables,
        effectiveConfig,
        avoidPairs,
        waiting,
      );
      setTables(result.tables);
      setWaiting(result.waiting || []);
      setMeta({
        attempts: result.attempts,
        entropy: result.entropy,
        sizes: result.sizes,
        relaxed: result.relaxed,
        playerCount: result.playerCount,
        teamCount: result.teamCount,
        waitingCount: (result.waiting || []).length,
        twoHeadedGiant: twoHG,
        archenemy: archenemyMode,
        at: Date.now(),
      });
      const waitN = (result.waiting || []).length;
      if (result.relaxed) {
        setToast(
          "No se encontró reparto perfecto anti-repetición a tiempo; se usó el mejor random posible." +
            (waitN
              ? ` ${waitN} en espera hasta la siguiente ronda.`
              : ""),
        );
      } else if (waitN) {
        setToast(
          `Mesas generadas · ${waitN} ${
            twoHG ? "pareja" : "jugador"
          }${waitN === 1 ? "" : twoHG ? "s" : "es"} en espera (prioridad la próxima ronda).`,
        );
      } else {
        setToast(
          archenemyMode
            ? `Mesas Archenemy generadas (${result.tables.length}×4).`
            : `Mesas generadas en ${result.attempts} intento${result.attempts === 1 ? "" : "s"}.`,
        );
      }
      setTimeout(() => setToast(""), 4500);
    } catch (e) {
      setError(e.message || "Error al generar mesas");
      setTables([]);
      setWaiting([]);
      setMeta(null);
    }
  };

  const saveAsPrevious = () => {
    if (!tables.length) return;
    setPreviousTables(tables.map((t) => [...t.players]));
    setToast("Guardado como ronda anterior (anti-repetición activa)");
    setTimeout(() => setToast(""), 3000);
  };

  const clearPrevious = () => {
    setPreviousTables([]);
    setToast("Ronda anterior borrada");
    setTimeout(() => setToast(""), 2500);
  };

  const clearCurrent = () => {
    setTables([]);
    setWaiting([]);
    setMeta(null);
  };

  const resetConfig = () => {
    setCmdConfig(normalizeCommanderConfig(COMMANDER_CONFIG_DEFAULTS));
    setToast("Opciones restauradas a valores por defecto");
    setTimeout(() => setToast(""), 2500);
  };

  const SECTIONS = [
    {
      id: "reparto",
      label: "Reparto",
      hint: "Generar y ver el resultado",
    },
    {
      id: "sala",
      label: "Vista sala",
      hint: "Mismo reparto sobre el plano",
    },
    {
      id: "diseno",
      label: "Diseñar sala",
      hint: "Mesas, sillas y plantillas",
    },
    {
      id: "opciones",
      label: "Opciones",
      hint: "Reglas del algoritmo",
    },
  ];

  const sectionHint =
    SECTIONS.find((s) => s.id === viewMode)?.hint || "";

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <section className="panel gold-border rounded-2xl p-5 md:p-7">
        <div>
          <h2 className="font-display text-2xl text-gold-gradient md:text-3xl">
            Mesas Commander
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-mtg-frost/75 md:text-base">
            Misma lista que los sorteos. Elige una sección abajo para repartir,
            ver la sala, diseñar el plano o ajustar las reglas.
          </p>
        </div>

        <nav
          className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4"
          aria-label="Secciones de mesas Commander"
        >
          {SECTIONS.map((m) => {
            const active = viewMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setViewMode(m.id)}
                aria-current={active ? "page" : undefined}
                className={`rounded-xl border px-3 py-3 text-left transition md:px-4 ${
                  active
                    ? "border-mtg-gold bg-mtg-gold/15 shadow-[inset_0_0_0_1px_rgba(155,181,159,0.35)]"
                    : "border-mtg-gold/20 bg-mtg-void/40 hover:border-mtg-gold/45 hover:bg-mtg-ink/50"
                }`}
              >
                <span
                  className={`block font-display text-sm tracking-wide md:text-base ${
                    active ? "text-mtg-gold-bright" : "text-mtg-frost/85"
                  }`}
                >
                  {m.label}
                </span>
                <span
                  className={`mt-1 block text-[11px] leading-snug md:text-xs ${
                    active ? "text-mtg-frost/70" : "text-mtg-frost/40"
                  }`}
                >
                  {m.hint}
                </span>
              </button>
            );
          })}
        </nav>
        <p className="mt-3 text-xs text-mtg-frost/45 md:text-sm">
          Sección actual:{" "}
          <strong className="text-mtg-gold">
            {SECTIONS.find((s) => s.id === viewMode)?.label}
          </strong>
          {" — "}
          {sectionHint}
        </p>

        {(viewMode === "sala" || viewMode === "diseno") && (
          <div className="mt-5 space-y-3">
            {viewMode === "diseno" && (
              <RoomTemplatesBar
                activeId={tplState.activeId}
                customSlots={tplState.customSlots}
                currentLayout={roomLayout}
                onApply={applyRoomTemplate}
                onSaveToSlot={saveLayoutToSlot}
                onClearSlot={clearTemplateSlot}
                onRenameSlot={renameTemplateSlot}
              />
            )}
            {viewMode === "sala" && (
              <div className="space-y-3">
                {(showSalaRoundLabel || showSalaRoundTimer) && (
                <div className="rounded-xl border border-mtg-gold/25 bg-mtg-void/50 p-3 md:p-4">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    {showSalaRoundLabel && (
                      <div className="min-w-[200px] flex-1">
                        <label className="mb-1 block font-display text-xs text-mtg-gold">
                          Título de la ronda
                        </label>
                        <input
                          type="text"
                          value={roundTitle}
                          onChange={(e) => setRoundTitle(e.target.value)}
                          placeholder={`Ronda ${roundNumber} (auto)`}
                          className="w-full rounded-lg border border-mtg-gold/25 bg-mtg-ink/80 px-3 py-2 text-sm outline-none focus:border-mtg-gold/60"
                        />
                        <p className="mt-1 text-[11px] text-mtg-frost/45">
                          Vacío = automático. Ej: Semifinales, Final…
                        </p>
                      </div>
                    )}
                    <div className="text-center">
                      {showSalaRoundLabel && (
                        <p className="font-display text-lg text-mtg-gold-bright">
                          {roundLabel}
                        </p>
                      )}
                      {showSalaRoundTimer && (
                        <>
                          <p
                            className={`font-mono text-2xl tracking-wider ${
                              timerRunning ? "text-mtg-frost" : "text-mtg-ember"
                            }`}
                          >
                            {formatRoundTimer(timerElapsedMs)}
                          </p>
                          {!roundTimerStarted && (
                            <p className="mt-0.5 text-[10px] uppercase tracking-wide text-mtg-frost/45">
                              Arranca al poner pantalla completa
                            </p>
                          )}
                        </>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {showSalaRoundTimer && (
                        <>
                          <button
                            type="button"
                            className="btn-ghost rounded-md px-3 py-1.5 text-xs"
                            onClick={toggleRoundTimer}
                          >
                            {!roundTimerStarted
                              ? "Iniciar ahora"
                              : timerRunning
                                ? "Pausar"
                                : "Reanudar"}
                          </button>
                          <button
                            type="button"
                            className="btn-ghost rounded-md px-3 py-1.5 text-xs"
                            onClick={resetRoundTimer}
                          >
                            Reiniciar cronómetro
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        className="btn-ghost rounded-md px-3 py-1.5 text-xs"
                        onClick={() => {
                          setRoundNumber((n) => Math.max(1, n - 1));
                          setRoundTitle("");
                          if (showSalaRoundTimer) resetRoundTimer();
                        }}
                        disabled={roundNumber <= 1}
                      >
                        Ronda −
                      </button>
                      <button
                        type="button"
                        className="btn-primary rounded-md px-3 py-1.5 text-xs"
                        onClick={goNextRound}
                      >
                        Siguiente ronda
                      </button>
                    </div>
                  </div>
                </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-xs text-mtg-frost/50">Plantilla:</label>
                  <select
                    value={tplState.activeId}
                    onChange={(e) => applyRoomTemplate(e.target.value)}
                    className="rounded-lg border border-mtg-gold/25 bg-mtg-ink/80 px-2 py-1.5 text-sm outline-none focus:border-mtg-gold/60"
                  >
                    <option value="builtin-5">Grande + 4 marrones</option>
                    <option value="builtin-4">4 mesas marrones</option>
                    {tplState.customSlots
                      .filter((s) => s.layout)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name || `Slot ${s.slot}`}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    className="btn-ghost rounded-md px-2 py-1 text-xs"
                    onClick={() => setViewMode("diseno")}
                  >
                    Editar / guardar plantillas
                  </button>
                  <button
                    type="button"
                    className="btn-primary rounded-md px-3 py-1.5 text-sm"
                    onClick={() => {
                      publishDisplay();
                      const w = window.open(
                        salaDisplayUrl(),
                        "ruletaliron-sala-display",
                      );
                      if (!w) {
                        setToast(
                          "El navegador bloqueó la ventana. Permite pop-ups para este sitio.",
                        );
                        setTimeout(() => setToast(""), 4000);
                      }
                    }}
                  >
                    Abrir en pantalla completa
                  </button>
                </div>
              </div>
            )}
            <div
              className={
                viewMode === "sala" && waiting.length > 0
                  ? "grid gap-3 lg:grid-cols-[1fr_220px] lg:items-start"
                  : ""
              }
            >
              <RoomDesigner
                layout={roomLayout}
                onChange={setRoomLayout}
                editable={viewMode === "diseno"}
                seatPlayers={viewMode === "sala" ? seatPlayers : {}}
                tableLabels={viewMode === "sala" ? roomLabels : {}}
                seatRoles={viewMode === "sala" ? seatRoles : {}}
                seatTeamColors={viewMode === "sala" ? seatTeamColors : {}}
              />
              {viewMode === "sala" && (
                <WaitingBench waiting={waiting} className="lg:sticky lg:top-24" />
              )}
            </div>
            <AnimatePresence>
              {toast && viewMode !== "reparto" && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-sm text-mtg-mana-g"
                >
                  {toast}
                </motion.p>
              )}
            </AnimatePresence>
            {viewMode === "sala" && tables.length === 0 && (
              <p className="mt-3 text-center text-sm text-mtg-frost/50">
                Genera el reparto para ver los nombres en las sillas. Puedes
                editar el plano en{" "}
                <button
                  type="button"
                  className="underline text-mtg-gold"
                  onClick={() => setViewMode("diseno")}
                >
                  Diseñar sala
                </button>
                .
              </p>
            )}
          </div>
        )}

        {viewMode === "opciones" && (
          <div className="mt-5">
            <div className="mb-3">
              <h3 className="font-display text-lg text-mtg-gold-bright">
                Opciones de mesas
              </h3>
              <p className="text-sm text-mtg-frost/55">
                Estas reglas se usan al pulsar «Generar mesas» en Reparto.
              </p>
            </div>
              <div className="grid gap-4 rounded-xl border border-mtg-gold/20 bg-mtg-void/45 p-4 md:grid-cols-2">
                <NumberField
                  label="Mínimo por mesa"
                  value={cmdConfig.minPerTable}
                  min={2}
                  max={6}
                  onChange={(v) => updateCmd({ minPerTable: v })}
                  hint="Normalmente 3"
                />
                <NumberField
                  label="Máximo por mesa"
                  value={cmdConfig.maxPerTable}
                  min={3}
                  max={8}
                  onChange={(v) => updateCmd({ maxPerTable: v })}
                  hint="Commander clásico: 4"
                />

                <div className="md:col-span-2">
                  <p className="mb-2 font-display text-xs text-mtg-gold">
                    Número de mesas
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={`rounded-lg px-3 py-2 text-sm ${
                        cmdConfig.tableCountMode === "auto"
                          ? "btn-primary"
                          : "btn-ghost"
                      }`}
                      onClick={() => updateCmd({ tableCountMode: "auto" })}
                    >
                      Automático
                    </button>
                    <button
                      type="button"
                      className={`rounded-lg px-3 py-2 text-sm ${
                        cmdConfig.tableCountMode === "fixed"
                          ? "btn-primary"
                          : "btn-ghost"
                      }`}
                      onClick={() => updateCmd({ tableCountMode: "fixed" })}
                    >
                      Fijo
                    </button>
                  </div>
                  {cmdConfig.tableCountMode === "fixed" && (
                    <div className="mt-3">
                      <NumberField
                        label="Cantidad de mesas"
                        value={cmdConfig.fixedTableCount}
                        min={1}
                        max={20}
                        onChange={(v) => updateCmd({ fixedTableCount: v })}
                        hint="Debe poder repartirse con el min/máx elegidos"
                      />
                    </div>
                  )}
                </div>

                <Toggle
                  label="Preferir mesas más llenas"
                  description="En automático, prioriza mesas cercanas al máximo (p. ej. 4+3+3)"
                  checked={cmdConfig.preferLargerTables}
                  onChange={(v) => updateCmd({ preferLargerTables: v })}
                />
                <Toggle
                  label="Permitir mesa grande de emergencia"
                  description="Si no cabe en min–máx (p. ej. 5 con máx 4), una sola mesa con todos"
                  checked={cmdConfig.allowOversizedFallback}
                  onChange={(v) => updateCmd({ allowOversizedFallback: v })}
                />
                <Toggle
                  label="Anti-repetición con ronda anterior"
                  description="Evita que demasiada gente de la misma mesa vuelva a coincidir"
                  checked={cmdConfig.avoidRepeatEnabled}
                  onChange={(v) => updateCmd({ avoidRepeatEnabled: v })}
                />

                {cmdConfig.avoidRepeatEnabled && (
                  <NumberField
                    label="Máx. que pueden repetir mesa"
                    value={cmdConfig.maxRepeatFromPrevious}
                    min={0}
                    max={Math.max(1, cmdConfig.maxPerTable - 1)}
                    onChange={(v) => updateCmd({ maxRepeatFromPrevious: v })}
                    hint="Con 2: pueden repetir 2, pero no 3"
                  />
                )}

                <NumberField
                  label="Intentos máximos de búsqueda"
                  value={cmdConfig.maxAttempts}
                  min={100}
                  max={3000}
                  onChange={(v) => updateCmd({ maxAttempts: v })}
                  hint="Más intentos = más chances de cumplir anti-repetición"
                />

                <label className="block md:col-span-2">
                  <span className="mb-1 block font-display text-xs text-mtg-gold">
                    Prefijo del nombre de mesa
                  </span>
                  <input
                    value={cmdConfig.tableLabelPrefix}
                    onChange={(e) =>
                      updateCmd({ tableLabelPrefix: e.target.value })
                    }
                    className="w-full max-w-xs rounded-lg border border-mtg-gold/25 bg-mtg-void/70 px-3 py-2 text-sm outline-none focus:border-mtg-gold/60"
                    placeholder="Mesa"
                  />
                </label>

                <Toggle
                  label="Usar plano de sala"
                  description={
                    roomSeatTotal
                      ? `Sillas por mesa: ${roomSizes.join("+")} (${roomSeatTotal} total). Si sobra gente, esperan la siguiente ronda (prioridad al regenerar).`
                      : "Diseña la sala primero para fijar mesas y sillas"
                  }
                  checked={useRoomCapacity}
                  onChange={setUseRoomCapacity}
                />

                <p className="md:col-span-2 rounded-lg border border-mtg-gold/15 bg-mtg-void/35 px-3 py-2 text-xs text-mtg-frost/55">
                  <span className="text-mtg-frost/80">Modos Extra</span> (Dos
                  Cabezas / Archenemy) se eligen en{" "}
                  <button
                    type="button"
                    className="underline text-mtg-gold"
                    onClick={() => setTab("participantes")}
                  >
                    Lista de Participantes
                  </button>
                  {extraMode === "none"
                    ? " · ahora: Commander normal."
                    : extraMode === "twoHeaded"
                      ? " · ahora: Dos Cabezas."
                      : " · ahora: Archenemy."}
                </p>

                <Toggle
                  label="Mostrar nombre de ronda"
                  description="Título «Ronda N» o personalizado en vista sala y pantalla completa"
                  checked={cmdConfig.showSalaRoundLabel}
                  onChange={(v) => updateCmd({ showSalaRoundLabel: v })}
                />
                <Toggle
                  label="Mostrar cronómetro de ronda"
                  description="El tiempo solo arranca al abrir pantalla completa en la vista de sala"
                  checked={cmdConfig.showSalaRoundTimer}
                  onChange={(v) => updateCmd({ showSalaRoundTimer: v })}
                />

                <div className="md:col-span-2 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    className="btn-ghost rounded-md px-3 py-1.5 text-xs"
                    onClick={resetConfig}
                  >
                    Restaurar opciones por defecto
                  </button>
                  <button
                    type="button"
                    className="btn-primary rounded-md px-3 py-1.5 text-sm"
                    onClick={() => setViewMode("reparto")}
                  >
                    Ir a Reparto
                  </button>
                </div>
              </div>
            {toast && viewMode === "opciones" && (
              <p className="mt-3 text-sm text-mtg-mana-g">{toast}</p>
            )}
          </div>
        )}

        {viewMode === "reparto" && (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="rounded-lg border border-mtg-gold/20 bg-mtg-void/50 px-3 py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-display text-sm text-mtg-gold">
                  Participantes activos
                </p>
                <button
                  type="button"
                  className="btn-ghost rounded px-2 py-1 text-xs"
                  onClick={() => setTab("participantes")}
                >
                  Gestionar lista
                </button>
              </div>
              <p className="mt-2">
                <strong className="text-mtg-gold-bright text-lg">
                  {twoHG ? teamCountPreview ?? pool.length : pool.length}
                </strong>{" "}
                <span className="text-mtg-frost/50">
                  {twoHG
                    ? `pareja${(teamCountPreview ?? 0) === 1 ? "" : "s"} · ${seatCount} jugadores`
                    : "(compartidos con Sorteo / Ruleta)"}
                </span>
              </p>
              {twoHG && pool.length > 0 && !listLooksLike2HG && (
                <p className="mt-2 text-xs text-mtg-ember">
                  Modo 2 cabezas activo: cada línea debe ser{" "}
                  <span className="font-mono text-mtg-frost/80">
                    Nombre A // Nombre B
                  </span>
                  .
                </p>
              )}
              {pool.length > 0 ? (
                <p className="mt-2 max-h-28 overflow-auto text-xs text-mtg-frost/60">
                  {pool.join(" · ")}
                </p>
              ) : (
                <p className="mt-2 text-xs text-mtg-ember">
                  La lista está vacía. Importa jugadores en{" "}
                  <button
                    type="button"
                    className="underline"
                    onClick={() => setTab("participantes")}
                  >
                    Lista de Participantes
                  </button>
                  .
                </p>
              )}
              <p className="mt-2 text-xs text-mtg-frost/50">
                Reglas: min {cmdConfig.minPerTable} · máx {cmdConfig.maxPerTable}
                {twoHG ? " · Dos Cabezas" : ""}
                {archenemyMode ? " · Archenemy (solo 4)" : ""}
                {cmdConfig.tableCountMode === "fixed"
                  ? ` · ${cmdConfig.fixedTableCount} mesas fijas`
                  : " · mesas automáticas"}
                {cmdConfig.avoidRepeatEnabled
                  ? ` · anti-rep ≤${cmdConfig.maxRepeatFromPrevious}`
                  : " · sin anti-rep"}
              </p>
              {waitPreviewCount > 0 && (
                <p className="mt-1 text-xs text-mtg-ember">
                  Con el plano activo, {waitPreviewCount}{" "}
                  {twoHG
                    ? `plaza${waitPreviewCount === 1 ? "" : "s"} (${Math.ceil(waitPreviewCount / 2)} pareja${Math.ceil(waitPreviewCount / 2) === 1 ? "" : "s"})`
                    : `jugador${waitPreviewCount === 1 ? "" : "es"}`}{" "}
                  quedarán en espera esta ronda.
                </p>
              )}
              {previewSizes.length > 0 ? (
                <p className="mt-1">
                  <span className="text-mtg-frost/50">Reparto previsto:</span>{" "}
                  <strong className="text-mtg-frost">
                    {formatSizes(previewSizes)}
                  </strong>
                  {playSeatCount < seatCount && (
                    <span className="text-mtg-frost/45">
                      {" "}
                      · {playSeatCount} juegan
                    </span>
                  )}
                  {" → "}
                  {previewSizes
                    .map(
                      (s, i) =>
                        `${cmdConfig.tableLabelPrefix} ${i + 1} (${s})`,
                    )
                    .join(", ")}
                </p>
              ) : (
                pool.length > 0 && (
                  <p className="mt-1 text-xs text-mtg-ember">
                    Con la config actual no se puede repartir este número de
                    jugadores.
                  </p>
                )
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-lg border border-mtg-gold/20 bg-mtg-void/50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-display text-sm text-mtg-gold">
                  Ronda anterior (anti-repetición)
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-ghost rounded px-2 py-1 text-xs"
                    onClick={saveAsPrevious}
                    disabled={!tables.length}
                  >
                    Usar mesas actuales
                  </button>
                  <button
                    type="button"
                    className="rounded px-2 py-1 text-xs text-mtg-mana-r hover:bg-mtg-mana-r/15"
                    onClick={clearPrevious}
                    disabled={!previousTables.length}
                  >
                    Borrar
                  </button>
                </div>
              </div>
              {previousTables.length === 0 ? (
                <p className="mt-2 text-xs text-mtg-frost/45">
                  Sin ronda anterior: el sorteo no aplica anti-repetición.
                </p>
              ) : (
                <ul className="mt-2 max-h-40 space-y-1 overflow-auto text-xs text-mtg-frost/70">
                  {previousTables.map((t, i) => (
                    <li key={`prev-${i}`}>
                      <span className="text-mtg-gold/70">
                        {cmdConfig.tableLabelPrefix} {i + 1}:
                      </span>{" "}
                      {t.join(" · ")}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-mtg-frost/80">
              <input
                type="checkbox"
                checked={useRoomCapacity}
                onChange={(e) => setUseRoomCapacity(e.target.checked)}
                className="accent-mtg-gold"
              />
              Usar plano de sala
              {(twoHG ? roomSeatTotalEffective : roomSeatTotal) > 0 && (
                <span className="text-xs text-mtg-frost/45">
                  ({twoHG ? roomSeatTotalEffective : roomSeatTotal} sillas
                  {twoHG ? " pares" : ""})
                </span>
              )}
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-primary rounded-xl px-6 py-3 text-base"
                onClick={handleGenerate}
                disabled={
                  (playSeatCount < effectiveConfig.minPerTable &&
                    !(
                      Array.isArray(effectiveConfig.exactSizes) &&
                      effectiveConfig.exactSizes.length
                    )) ||
                  !previewSizes.length
                }
              >
                ¡Generar mesas!
              </button>
              <button
                type="button"
                className="btn-ghost rounded-xl px-4 py-3 text-sm"
                onClick={clearCurrent}
                disabled={!tables.length}
              >
                Limpiar resultado
              </button>
              {tables.length > 0 && roomLayout.tables.length > 0 && (
                <button
                  type="button"
                  className="btn-ghost rounded-xl px-4 py-3 text-sm ring-1 ring-mtg-gold/35"
                  onClick={() => setViewMode("sala")}
                >
                  Ver en plano de sala
                </button>
              )}
            </div>

            <AnimatePresence>
              {(error || toast) && (
                <motion.p
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`text-sm ${error ? "text-mtg-mana-r" : "text-mtg-mana-g"}`}
                >
                  {error || toast}
                </motion.p>
              )}
            </AnimatePresence>

            {meta && (
              <dl className="grid grid-cols-2 gap-2 rounded-lg border border-mtg-gold/15 bg-mtg-void/40 p-3 font-mono text-xs">
                <div>
                  <dt className="text-mtg-frost/45">Entropy</dt>
                  <dd className="text-mtg-mana-u">{meta.entropy}</dd>
                </div>
                <div>
                  <dt className="text-mtg-frost/45">Intentos</dt>
                  <dd>{meta.attempts}</dd>
                </div>
                <div>
                  <dt className="text-mtg-frost/45">Reparto</dt>
                  <dd>{formatSizes(meta.sizes || [])}</dd>
                </div>
                <div>
                  <dt className="text-mtg-frost/45">
                    {meta.twoHeadedGiant || meta.teamCount
                      ? "Plazas"
                      : "Jugadores"}
                  </dt>
                  <dd>
                    {meta.playerCount}
                    {meta.teamCount != null
                      ? ` (${meta.teamCount} eq.)`
                      : ""}
                  </dd>
                </div>
              </dl>
            )}

            {useRoomCapacity &&
              (twoHG ? roomSeatTotalEffective : roomSeatTotal) > 0 && (
              <p className="text-xs text-mtg-frost/50">
                Plano: {roomSizes.length} mesas ·{" "}
                {twoHG ? roomSeatTotalEffective : roomSeatTotal} sillas
                {twoHG ? " (pares)" : ""}
                {seatCount ===
                (twoHG ? roomSeatTotalEffective : roomSeatTotal)
                  ? " · coinciden con la lista"
                  : seatCount >
                      (twoHG ? roomSeatTotalEffective : roomSeatTotal)
                    ? " · sobran jugadores (esperarán)"
                    : " · hay sillas libres"}
                . El resultado se muestra aquí; el plano está en{" "}
                <button
                  type="button"
                  className="underline text-mtg-gold"
                  onClick={() => setViewMode("sala")}
                >
                  Vista sala
                </button>
                .
              </p>
            )}
          </div>
        </div>
        )}
      </section>

      {viewMode === "reparto" && waiting.length > 0 && (
        <WaitingBench waiting={waiting} />
      )}

      {viewMode === "reparto" && tables.length > 0 && (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {tables.map((table, i) => (
            <TableCard
              key={table.id}
              table={table}
              index={i}
              twoHeaded={Boolean(meta?.twoHeadedGiant || table.teams)}
              archenemyMode={Boolean(
                meta?.archenemy || table.archenemy || archenemyMode,
              )}
              teamColors={teamColorsByPlayer}
            />
          ))}
        </section>
      )}

      {viewMode === "reparto" && tables.length === 0 && !error && (
        <p className="text-center text-sm text-mtg-frost/45">
          Ajusta las opciones si hace falta y pulsa &quot;Generar mesas&quot;.
        </p>
      )}

      <AvoidPairsModal
        open={showAvoidPairs}
        onClose={() => setShowAvoidPairs(false)}
        participants={pool}
        pairs={avoidPairs}
        onChange={setAvoidPairs}
      />
    </div>
  );
}
