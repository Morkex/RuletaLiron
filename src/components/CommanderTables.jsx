import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../context/AppContext";
import {
  assignCommanderTables,
  computeTableSizes,
  formatSizes,
  COMMANDER_CONFIG_DEFAULTS,
  normalizeCommanderConfig,
} from "../lib/commanderTables";
import {
  createDefaultRoomLayout,
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

const CMD_STORAGE = "ruletaliron-commander-v2";

function loadCommander() {
  try {
    const raw = localStorage.getItem(CMD_STORAGE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Nombre corto para la ficha del asiento (lista completa abajo). */
function shortName(name) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].length > 12 ? `${parts[0].slice(0, 11)}…` : parts[0];
  }
  const first = parts[0];
  const last = parts[parts.length - 1];
  const compact = `${first} ${last.charAt(0)}.`;
  return compact.length > 14 ? `${first.slice(0, 10)}…` : compact;
}

function Seat({ name, index, total }) {
  // Coordenadas sobre el contenedor (no sobre el label): % del padre.
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
  const radius = total >= 5 ? 38 : 36;
  const left = 50 + radius * Math.cos(angle);
  const top = 50 + radius * Math.sin(angle);

  return (
    <div
      className="absolute z-10 w-[30%] max-w-[96px]"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        transform: "translate(-50%, -50%)",
      }}
      title={name}
    >
      <div className="rounded-md border border-mtg-gold/45 bg-mtg-ink/95 px-1.5 py-1 text-center shadow-[0_4px_14px_rgba(0,0,0,0.55)]">
        <p className="font-mono text-[9px] leading-none text-mtg-gold/70">
          {index + 1}
        </p>
        <p className="mt-0.5 truncate text-[11px] font-semibold leading-tight text-mtg-frost">
          {shortName(name)}
        </p>
      </div>
    </div>
  );
}

function TableCard({ table, index }) {
  const n = table.players.length;
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
          {n} jugadores
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
          <span className="mt-0.5 text-[10px] uppercase tracking-wider text-mtg-frost/40">
            Commander
          </span>
        </div>

        {table.players.map((name, i) => (
          <Seat key={`${table.id}-${name}-${i}`} name={name} index={i} total={n} />
        ))}
      </div>

      <ol className="mt-4 space-y-1 border-t border-mtg-gold/15 pt-3 text-sm">
        {table.players.map((name, i) => (
          <li key={`${name}-${i}`} className="flex gap-2 text-mtg-frost/85">
            <span className="font-mono text-xs text-mtg-gold/50">{i + 1}.</span>
            <span>{name}</span>
          </li>
        ))}
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
  const { participants, setTab } = useApp();
  const stored = loadCommander();

  const [previousTables, setPreviousTables] = useState(
    stored?.previousTables ?? [],
  );
  const [tables, setTables] = useState(stored?.tables ?? []);
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
  const [viewMode, setViewMode] = useState("reparto"); // reparto | sala | diseno
  const [useRoomCapacity, setUseRoomCapacity] = useState(
    stored?.useRoomCapacity ?? true,
  );
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const updateCmd = (patch) => {
    setCmdConfig((prev) => normalizeCommanderConfig({ ...prev, ...patch }));
  };

  /** Misma lista activa que los sorteos / ruleta */
  const pool = participants;

  const roomSizes = useMemo(
    () => roomTableSizes(roomLayout).filter((n) => n > 0),
    [roomLayout],
  );
  const roomSeatTotal = useMemo(() => roomCapacity(roomLayout), [roomLayout]);

  const effectiveConfig = useMemo(() => {
    if (!useRoomCapacity || !roomSizes.length) return cmdConfig;
    const sum = roomSizes.reduce((a, b) => a + b, 0);
    if (sum === pool.length) {
      return {
        ...normalizeCommanderConfig({
          ...cmdConfig,
          minPerTable: Math.min(...roomSizes),
          maxPerTable: Math.max(...roomSizes),
        }),
        exactSizes: roomSizes,
      };
    }
    return normalizeCommanderConfig({
      ...cmdConfig,
      tableCountMode: "fixed",
      fixedTableCount: roomSizes.length,
      minPerTable: Math.min(cmdConfig.minPerTable, ...roomSizes),
      maxPerTable: Math.max(cmdConfig.maxPerTable, ...roomSizes),
      allowOversizedFallback: true,
    });
  }, [useRoomCapacity, roomSizes, cmdConfig, pool.length]);

  const previewSizes = useMemo(
    () =>
      pool.length >= (effectiveConfig.minPerTable || 1)
        ? computeTableSizes(pool.length, effectiveConfig)
        : [],
    [pool.length, effectiveConfig],
  );

  const { seatPlayers, tableLabels: roomLabels } = useMemo(
    () => mapPodsToRoom(tables, roomLayout),
    [tables, roomLayout],
  );

  useEffect(() => {
    try {
      localStorage.setItem(
        CMD_STORAGE,
        JSON.stringify({
          previousTables,
          tables,
          meta,
          config: cmdConfig,
          roomLayout,
          useRoomCapacity,
        }),
      );
    } catch {
      /* ignore */
    }
  }, [previousTables, tables, meta, cmdConfig, roomLayout, useRoomCapacity]);

  useEffect(() => {
    saveRoomTemplatesState(tplState);
  }, [tplState]);

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
      if (useRoomCapacity && roomSeatTotal > 0 && pool.length > roomSeatTotal) {
        throw new Error(
          `Hay ${pool.length} jugadores y solo ${roomSeatTotal} sillas en la sala. Añade sillas o reduce la lista.`,
        );
      }

      const result = assignCommanderTables(
        pool,
        previousTables,
        effectiveConfig,
      );
      setTables(result.tables);
      setMeta({
        attempts: result.attempts,
        entropy: result.entropy,
        sizes: result.sizes,
        relaxed: result.relaxed,
        playerCount: result.playerCount,
        at: Date.now(),
      });
      setViewMode("sala");
      if (result.relaxed) {
        setToast(
          "No se encontró reparto perfecto anti-repetición a tiempo; se usó el mejor random posible.",
        );
      } else {
        setToast(
          `Mesas generadas en ${result.attempts} intento${result.attempts === 1 ? "" : "s"}.`,
        );
      }
      setTimeout(() => setToast(""), 4000);
    } catch (e) {
      setError(e.message || "Error al generar mesas");
      setTables([]);
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
    setMeta(null);
  };

  const resetConfig = () => {
    setCmdConfig(normalizeCommanderConfig(COMMANDER_CONFIG_DEFAULTS));
    setToast("Opciones restauradas a valores por defecto");
    setTimeout(() => setToast(""), 2500);
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <section className="panel gold-border rounded-2xl p-5 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl text-gold-gradient md:text-3xl">
              Mesas Commander
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-mtg-frost/75 md:text-base">
              Misma lista que los sorteos. Diseña el plano de la sala, genera el
              reparto y verás a cada jugador en su silla.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "reparto", label: "Reparto" },
              { id: "sala", label: "Vista sala" },
              { id: "diseno", label: "Diseñar sala" },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                className={`rounded-lg px-3 py-2 text-sm ${
                  viewMode === m.id ? "btn-primary" : "btn-ghost"
                }`}
                onClick={() => setViewMode(m.id)}
              >
                {m.label}
              </button>
            ))}
            {viewMode === "reparto" && (
              <button
                type="button"
                className="btn-ghost rounded-lg px-3 py-2 text-sm"
                onClick={() => setShowSettings((v) => !v)}
              >
                {showSettings ? "Ocultar opciones" : "Opciones"}
              </button>
            )}
          </div>
        </div>

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
              </div>
            )}
            <RoomDesigner
              layout={roomLayout}
              onChange={setRoomLayout}
              editable={viewMode === "diseno"}
              seatPlayers={viewMode === "sala" ? seatPlayers : {}}
              tableLabels={viewMode === "sala" ? roomLabels : {}}
            />
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

        <AnimatePresence initial={false}>
          {viewMode === "reparto" && showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-5 grid gap-4 rounded-xl border border-mtg-gold/20 bg-mtg-void/45 p-4 md:grid-cols-2">
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
                      ? `Capacidad: ${roomSeatTotal} sillas en ${roomSizes.length} mesas (${roomSizes.join("+")})`
                      : "Diseña la sala primero para fijar mesas y sillas"
                  }
                  checked={useRoomCapacity}
                  onChange={setUseRoomCapacity}
                />

                <div className="md:col-span-2">
                  <button
                    type="button"
                    className="btn-ghost rounded-md px-3 py-1.5 text-xs"
                    onClick={resetConfig}
                  >
                    Restaurar opciones por defecto
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
                  {pool.length}
                </strong>{" "}
                <span className="text-mtg-frost/50">
                  (compartidos con Sorteo / Ruleta)
                </span>
              </p>
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
                {cmdConfig.tableCountMode === "fixed"
                  ? ` · ${cmdConfig.fixedTableCount} mesas fijas`
                  : " · mesas automáticas"}
                {cmdConfig.avoidRepeatEnabled
                  ? ` · anti-rep ≤${cmdConfig.maxRepeatFromPrevious}`
                  : " · sin anti-rep"}
              </p>
              {previewSizes.length > 0 ? (
                <p className="mt-1">
                  <span className="text-mtg-frost/50">Reparto previsto:</span>{" "}
                  <strong className="text-mtg-frost">
                    {formatSizes(previewSizes)}
                  </strong>
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
              {roomSeatTotal > 0 && (
                <span className="text-xs text-mtg-frost/45">
                  ({roomSeatTotal} sillas)
                </span>
              )}
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-primary rounded-xl px-6 py-3 text-base"
                onClick={handleGenerate}
                disabled={
                  pool.length < effectiveConfig.minPerTable ||
                  !previewSizes.length ||
                  (useRoomCapacity &&
                    roomSeatTotal > 0 &&
                    pool.length > roomSeatTotal)
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
                  <dt className="text-mtg-frost/45">Jugadores</dt>
                  <dd>{meta.playerCount}</dd>
                </div>
              </dl>
            )}

            {useRoomCapacity && roomSeatTotal > 0 && (
              <p className="text-xs text-mtg-frost/50">
                Plano: {roomSizes.length} mesas · {roomSeatTotal} sillas
                {pool.length === roomSeatTotal
                  ? " · coinciden con la lista"
                  : pool.length > roomSeatTotal
                    ? " · faltan sillas"
                    : " · hay sillas libres"}
                . Tras generar se abre la{" "}
                <button
                  type="button"
                  className="underline text-mtg-gold"
                  onClick={() => setViewMode("sala")}
                >
                  vista sala
                </button>
                .
              </p>
            )}
          </div>
        </div>
        )}
      </section>

      {viewMode === "reparto" && tables.length > 0 && (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {tables.map((table, i) => (
            <TableCard key={table.id} table={table} index={i} />
          ))}
        </section>
      )}

      {viewMode === "reparto" && tables.length === 0 && !error && (
        <p className="text-center text-sm text-mtg-frost/45">
          Ajusta las opciones si hace falta y pulsa &quot;Generar mesas&quot;.
        </p>
      )}
    </div>
  );
}
