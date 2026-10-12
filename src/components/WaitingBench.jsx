/**
 * Recuadro de jugadores / parejas en espera (fuera del plano de mesas).
 */
export default function WaitingBench({
  waiting = [],
  compact = false,
  className = "",
}) {
  const list = Array.isArray(waiting)
    ? waiting.map(String).filter(Boolean)
    : [];
  if (!list.length) return null;

  return (
    <aside
      className={`rounded-xl border border-dashed border-mtg-ember/45 bg-mtg-ember/10 ${
        compact ? "p-2.5" : "p-3 md:p-4"
      } ${className}`}
      aria-label="Jugadores en espera"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p
          className={`font-display text-mtg-ember ${
            compact ? "text-xs" : "text-sm md:text-base"
          }`}
        >
          En espera
        </p>
        <span className="font-mono text-[11px] text-mtg-ember/70">
          {list.length}
        </span>
      </div>
      <p
        className={`mt-0.5 text-mtg-frost/45 ${
          compact ? "text-[10px]" : "text-[11px]"
        }`}
      >
        Siguiente ronda · prioridad al regenerar
      </p>
      <ul
        className={`mt-2 space-y-1 overflow-auto ${
          compact ? "max-h-28 text-xs" : "max-h-40 text-sm md:max-h-56"
        }`}
      >
        {list.map((name, i) => (
          <li
            key={`wait-bench-${i}-${name}`}
            className="truncate text-mtg-frost/85"
            title={name}
          >
            {name}
          </li>
        ))}
      </ul>
    </aside>
  );
}
