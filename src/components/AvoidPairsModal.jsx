import { useEffect, useState } from "react";

/**
 * Ventana "Parejas a evitar": personas que nunca deben coincidir en la misma mesa.
 */
export default function AvoidPairsModal({
  open,
  onClose,
  participants = [],
  pairs = [],
  onChange,
}) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setA("");
    setB("");
    setError("");
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const addPair = (e) => {
    e?.preventDefault?.();
    const na = a.trim();
    const nb = b.trim();
    if (!na || !nb) {
      setError("Elige dos nombres.");
      return;
    }
    if (na.toLocaleLowerCase("es") === nb.toLocaleLowerCase("es")) {
      setError("Deben ser dos personas distintas.");
      return;
    }
    onChange?.([...(pairs || []), { a: na, b: nb }]);
    setA("");
    setB("");
    setError("");
  };

  const removeAt = (idx) => {
    onChange?.((pairs || []).filter((_, i) => i !== idx));
  };

  const options = participants.length
    ? participants
    : [];

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        role="dialog"
        aria-labelledby="avoid-pairs-title"
        className="panel gold-border w-full max-w-md rounded-2xl p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id="avoid-pairs-title"
              className="font-display text-xl text-gold-gradient"
            >
              Parejas a evitar
            </h2>
            <p className="mt-1 text-xs text-mtg-frost/55">
              Estas personas no se sentarán en la misma mesa Commander.
            </p>
          </div>
          <button
            type="button"
            className="btn-ghost rounded-md px-2 py-1 text-sm"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <form onSubmit={addPair} className="mt-4 space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block font-display text-xs text-mtg-gold">
                Persona 1
              </span>
              {options.length ? (
                <select
                  value={a}
                  onChange={(e) => setA(e.target.value)}
                  className="w-full rounded-lg border border-mtg-gold/25 bg-mtg-void/70 px-2 py-2 text-sm outline-none focus:border-mtg-gold/60"
                >
                  <option value="">— elegir —</option>
                  {options.map((name) => (
                    <option key={`a-${name}`} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={a}
                  onChange={(e) => setA(e.target.value)}
                  className="w-full rounded-lg border border-mtg-gold/25 bg-mtg-void/70 px-2 py-2 text-sm outline-none focus:border-mtg-gold/60"
                  placeholder="Nombre"
                />
              )}
            </label>
            <label className="block">
              <span className="mb-1 block font-display text-xs text-mtg-gold">
                Persona 2
              </span>
              {options.length ? (
                <select
                  value={b}
                  onChange={(e) => setB(e.target.value)}
                  className="w-full rounded-lg border border-mtg-gold/25 bg-mtg-void/70 px-2 py-2 text-sm outline-none focus:border-mtg-gold/60"
                >
                  <option value="">— elegir —</option>
                  {options.map((name) => (
                    <option key={`b-${name}`} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={b}
                  onChange={(e) => setB(e.target.value)}
                  className="w-full rounded-lg border border-mtg-gold/25 bg-mtg-void/70 px-2 py-2 text-sm outline-none focus:border-mtg-gold/60"
                  placeholder="Nombre"
                />
              )}
            </label>
          </div>

          {error && <p className="text-xs text-mtg-mana-r">{error}</p>}

          <button type="submit" className="btn-primary w-full rounded-lg py-2 text-sm">
            Añadir pareja
          </button>
        </form>

        <ul className="mt-4 max-h-48 space-y-1.5 overflow-auto">
          {(pairs || []).length === 0 ? (
            <li className="text-xs text-mtg-frost/45">
              Ninguna pareja configurada.
            </li>
          ) : (
            pairs.map((p, i) => (
              <li
                key={`${p.a}-${p.b}-${i}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-mtg-gold/15 bg-mtg-void/40 px-3 py-2 text-sm"
              >
                <span className="text-mtg-frost">
                  <strong className="text-mtg-gold-bright">{p.a}</strong>
                  <span className="mx-1.5 text-mtg-frost/40">↔</span>
                  <strong className="text-mtg-gold-bright">{p.b}</strong>
                </span>
                <button
                  type="button"
                  className="text-xs text-mtg-mana-r hover:underline"
                  onClick={() => removeAt(i)}
                >
                  Quitar
                </button>
              </li>
            ))
          )}
        </ul>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            className="btn-ghost rounded-lg px-4 py-2 text-sm"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
