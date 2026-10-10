import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../context/AppContext";
import { parseParticipants } from "../lib/parseParticipants";

const SAMPLE = `Jace Beleren
Chandra Nalaar
Liliana Vess
Nicol Bolas
Urza
Yawgmoth
Karn
Teferi
Elesh Norn
Garruk Wildspeaker
Gideon Jura
Ajani Goldmane
Ugin
Elspeth Tirel
Squee`;

export default function Participants() {
  const {
    participants,
    eliminated,
    importRawList,
    addParticipant,
    removeParticipant,
    restoreEliminated,
    clearParticipants,
  } = useApp();

  const [raw, setRaw] = useState("");
  const [manual, setManual] = useState("");
  const [preview, setPreview] = useState([]);
  const [toast, setToast] = useState("");

  const runPreview = (text) => {
    setRaw(text);
    setPreview(parseParticipants(text));
  };

  const applyImport = () => {
    const count = importRawList(raw);
    setToast(`${count} participantes importados`);
    setTimeout(() => setToast(""), 2500);
  };

  const handleAdd = () => {
    if (addParticipant(manual)) {
      setManual("");
      setToast("Participante añadido");
      setTimeout(() => setToast(""), 2000);
    }
  };

  return (
    <div className="mx-auto grid max-w-[1400px] gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="panel gold-border rounded-xl p-5 md:p-6">
        <h2 className="font-display text-2xl text-gold-gradient">Lista de Participantes</h2>
        <p className="mt-2 text-sm text-mtg-frost/75">
          Pega el texto bruto de Wizards EventLink u otra lista. El parser limpia mesas,
          cabeceras (Ronda/Round), estados (Checked in / Active) y duplicados.
        </p>

        <textarea
          value={raw}
          onChange={(e) => runPreview(e.target.value)}
          placeholder="Pega aquí la lista de EventLink o nombres (uno por línea)…"
          className="mt-4 min-h-[220px] w-full resize-y rounded-lg border border-mtg-gold/25 bg-mtg-void/70 p-4 font-mono text-sm text-mtg-frost outline-none focus:border-mtg-gold/60"
        />

        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="btn-primary rounded-md px-4 py-2 text-sm" onClick={applyImport}>
            Procesar e Importar
          </button>
          <button
            type="button"
            className="btn-ghost rounded-md px-4 py-2 text-sm"
            onClick={() => runPreview(SAMPLE)}
          >
            Cargar ejemplo EventLink
          </button>
          <button
            type="button"
            className="btn-ghost rounded-md px-4 py-2 text-sm text-mtg-mana-r"
            onClick={clearParticipants}
          >
            Vaciar Lista
          </button>
        </div>

        {preview.length > 0 && (
          <div className="mt-4 rounded-lg border border-mtg-gold/20 bg-mtg-void/50 p-3">
            <p className="text-sm text-mtg-gold-bright">
              Vista previa: {preview.length} nombres únicos
            </p>
            <p className="mt-1 max-h-24 overflow-auto text-xs text-mtg-frost/60">
              {preview.join(" · ")}
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-end gap-2 border-t border-mtg-gold/15 pt-5">
          <label className="flex-1 min-w-[200px]">
            <span className="mb-1 block font-display text-xs text-mtg-gold">Añadir a mano</span>
            <input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className="w-full rounded-lg border border-mtg-gold/25 bg-mtg-void/70 px-3 py-2 text-sm outline-none focus:border-mtg-gold/60"
              placeholder="Nombre del jugador"
            />
          </label>
          <button type="button" className="btn-primary rounded-md px-4 py-2 text-sm" onClick={handleAdd}>
            Añadir
          </button>
        </div>

        <AnimatePresence>
          {toast && (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-3 text-sm text-mtg-mana-g"
            >
              {toast}
            </motion.p>
          )}
        </AnimatePresence>
      </section>

      <section className="panel gold-border rounded-xl p-5 md:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-display text-xl text-mtg-gold-bright">Lista de participantes</h3>
          <div className="flex gap-2 text-sm">
            <span className="rounded-full border border-mtg-gold/40 bg-mtg-gold/10 px-3 py-1 font-display text-mtg-gold">
              {participants.length} activos
            </span>
            {eliminated.length > 0 && (
              <span className="rounded-full border border-mtg-mana-r/40 bg-mtg-mana-r/10 px-3 py-1 font-display text-mtg-mana-r">
                {eliminated.length} eliminados
              </span>
            )}
          </div>
        </div>

        <ul className="mt-4 max-h-[520px] space-y-2 overflow-auto pr-1">
          <AnimatePresence initial={false}>
            {participants.map((name, i) => (
              <motion.li
                key={`active-${name}`}
                layout
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                className="flex items-center justify-between gap-3 rounded-lg border border-mtg-gold/15 bg-mtg-void/55 px-3 py-2"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="font-mono text-xs text-mtg-gold/50">{i + 1}</span>
                  <span className="truncate font-semibold text-mtg-frost">{name}</span>
                  <span className="shrink-0 rounded border border-mtg-mana-g/35 bg-mtg-mana-g/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-mtg-mana-g">
                    Activo
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => removeParticipant(name)}
                  className="shrink-0 rounded px-2 py-1 text-xs text-mtg-mana-r hover:bg-mtg-mana-r/15"
                  aria-label={`Eliminar ${name}`}
                >
                  Eliminar
                </button>
              </motion.li>
            ))}

            {eliminated.map((entry) => (
              <motion.li
                key={entry.id}
                layout
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                className="flex items-center justify-between gap-3 rounded-lg border border-mtg-mana-r/25 bg-mtg-mana-r/5 px-3 py-2"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="font-mono text-xs text-mtg-frost/30">—</span>
                  <span className="truncate font-semibold text-mtg-frost/45 line-through decoration-mtg-mana-r/70">
                    {entry.name}
                  </span>
                  <span className="shrink-0 rounded border border-mtg-gold/35 bg-mtg-gold/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-mtg-gold-bright">
                    Ganó · {entry.prize}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => restoreEliminated(entry.name)}
                  className="shrink-0 rounded px-2 py-1 text-xs text-mtg-mana-u hover:bg-mtg-mana-u/15"
                  aria-label={`Reactivar ${entry.name}`}
                  title="Volver a poner en activos"
                >
                  Reactivar
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        {participants.length === 0 && eliminated.length === 0 && (
          <p className="mt-8 text-center text-sm text-mtg-frost/50">
            La lista está vacía. Importa o añade jugadores para empezar el sorteo.
          </p>
        )}

        {participants.length === 0 && eliminated.length > 0 && (
          <p className="mt-4 text-center text-sm text-mtg-frost/50">
            No quedan participantes activos. Puedes reactivar a alguien o importar una lista nueva.
          </p>
        )}
      </section>
    </div>
  );
}
