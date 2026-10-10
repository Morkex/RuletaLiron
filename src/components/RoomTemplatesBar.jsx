import { useMemo, useState } from "react";
import {
  BUILTIN_ROOM_TEMPLATES,
  listAllTemplates,
  roomCapacity,
} from "../lib/roomLayout";

/**
 * Selector de plantillas predefinidas + slots personalizados.
 */
export default function RoomTemplatesBar({
  activeId,
  customSlots,
  currentLayout,
  onApply,
  onSaveToSlot,
  onClearSlot,
  onRenameSlot,
}) {
  const [saveSlotId, setSaveSlotId] = useState("custom-1");
  const [saveName, setSaveName] = useState("");

  const all = useMemo(() => listAllTemplates(customSlots), [customSlots]);

  const selectedMeta = all.find((t) => t.id === activeId);

  const handleSave = () => {
    const slot = customSlots.find((s) => s.id === saveSlotId);
    if (!slot) return;
    const name =
      saveName.trim() ||
      slot.name ||
      `Personalizada ${slot.slot}`;
    onSaveToSlot?.(saveSlotId, name, currentLayout);
    setSaveName("");
  };

  return (
    <div className="rounded-xl border border-mtg-gold/20 bg-mtg-void/50 p-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-[200px] flex-1">
          <span className="mb-1 block font-display text-xs text-mtg-gold">
            Plantilla de sala
          </span>
          <select
            value={activeId}
            onChange={(e) => onApply?.(e.target.value)}
            className="w-full rounded-lg border border-mtg-gold/25 bg-mtg-ink/80 px-3 py-2 text-sm outline-none focus:border-mtg-gold/60"
          >
            <optgroup label="Predefinidas">
              {BUILTIN_ROOM_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Personalizadas">
              {all
                .filter((t) => !t.builtin)
                .map((t) => (
                  <option key={t.id} value={t.id} disabled={!t.filled}>
                    {t.name}
                  </option>
                ))}
            </optgroup>
          </select>
        </label>

        <button
          type="button"
          className="btn-primary rounded-lg px-3 py-2 text-sm"
          onClick={() => onApply?.(activeId)}
        >
          Cargar
        </button>

        {selectedMeta && (
          <p className="pb-2 text-xs text-mtg-frost/50">
            {selectedMeta.description}
            {currentLayout && (
              <>
                {" · "}
                Actual: {currentLayout.tables?.length || 0} mesas ·{" "}
                {roomCapacity(currentLayout)} sillas
              </>
            )}
          </p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-mtg-gold/15 pt-3">
        <label className="min-w-[140px]">
          <span className="mb-1 block text-[11px] text-mtg-frost/50">
            Guardar plano actual en
          </span>
          <select
            value={saveSlotId}
            onChange={(e) => setSaveSlotId(e.target.value)}
            className="w-full rounded-lg border border-mtg-gold/25 bg-mtg-ink/80 px-2 py-1.5 text-xs outline-none focus:border-mtg-gold/60"
          >
            {customSlots.map((s) => (
              <option key={s.id} value={s.id}>
                Slot {s.slot}
                {s.layout ? ` — ${s.name || "ocupado"}` : " — vacío"}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-[160px] flex-1">
          <span className="mb-1 block text-[11px] text-mtg-frost/50">
            Nombre
          </span>
          <input
            type="text"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Ej. Sala Lirón sábado"
            maxLength={40}
            className="w-full rounded-lg border border-mtg-gold/25 bg-mtg-ink/80 px-2 py-1.5 text-xs outline-none focus:border-mtg-gold/60"
          />
        </label>
        <button
          type="button"
          className="btn-ghost rounded-lg px-3 py-1.5 text-xs"
          onClick={handleSave}
          disabled={!currentLayout?.tables?.length}
        >
          Guardar en slot
        </button>
        <button
          type="button"
          className="rounded-lg px-3 py-1.5 text-xs text-mtg-mana-r hover:bg-mtg-mana-r/15 disabled:opacity-40"
          disabled={!customSlots.find((s) => s.id === saveSlotId)?.layout}
          onClick={() => onClearSlot?.(saveSlotId)}
        >
          Vaciar slot
        </button>
      </div>

      {/* Chips rápidos de slots llenos */}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {customSlots
          .filter((s) => s.layout)
          .map((s) => (
            <button
              key={s.id}
              type="button"
              title="Cargar / doble clic para renombrar"
              onClick={() => onApply?.(s.id)}
              onDoubleClick={() => {
                const name = window.prompt(
                  "Nuevo nombre de plantilla",
                  s.name || `Personalizada ${s.slot}`,
                );
                if (name != null && name.trim()) {
                  onRenameSlot?.(s.id, name.trim());
                }
              }}
              className={`rounded-full border px-2.5 py-0.5 text-[11px] transition ${
                activeId === s.id
                  ? "border-mtg-gold bg-mtg-gold/20 text-mtg-gold-bright"
                  : "border-mtg-gold/25 text-mtg-frost/70 hover:border-mtg-gold/50"
              }`}
            >
              {s.name || `Slot ${s.slot}`}
            </button>
          ))}
      </div>
    </div>
  );
}
