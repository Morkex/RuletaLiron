import { useApp } from "../context/AppContext";

export default function PrizeQueue() {
  const {
    prizes,
    currentPrizeIndex,
    setCurrentPrizeIndex,
    movePrize,
  } = useApp();

  if (prizes.length === 0) {
    return (
      <p className="text-sm text-mtg-frost/45">No hay premios en cola.</p>
    );
  }

  return (
    <div>
      <p className="mb-3 text-[11px] leading-snug text-mtg-frost/50">
        Doble clic = premio actual · ▲▼ para reordenar
      </p>

      <ul className="flex flex-col gap-2 p-0">
        {prizes.map((prize, index) => {
          const isCurrent = index === currentPrizeIndex;
          const isPast = index < currentPrizeIndex;
          return (
            <li
              key={prize.id}
              className={`flex list-none items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition ${
                isCurrent
                  ? "bg-mtg-gold/15 ring-1 ring-mtg-gold/40"
                  : "bg-mtg-void/40 hover:bg-mtg-void/70"
              } ${isPast ? "opacity-45" : ""}`}
              onDoubleClick={() => setCurrentPrizeIndex(index)}
              title="Doble clic para sortear este premio"
            >
              <div className="flex shrink-0 flex-col gap-0.5">
                <button
                  type="button"
                  aria-label={`Subir ${prize.name}`}
                  title="Subir"
                  disabled={index === 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    movePrize(index, -1);
                  }}
                  onDoubleClick={(e) => e.stopPropagation()}
                  className="rounded border border-mtg-gold/25 bg-mtg-void/60 px-1.5 py-0.5 text-[10px] leading-none text-mtg-gold hover:border-mtg-gold/60 hover:bg-mtg-gold/10 disabled:cursor-not-allowed disabled:opacity-25"
                >
                  ▲
                </button>
                <button
                  type="button"
                  aria-label={`Bajar ${prize.name}`}
                  title="Bajar"
                  disabled={index === prizes.length - 1}
                  onClick={(e) => {
                    e.stopPropagation();
                    movePrize(index, 1);
                  }}
                  onDoubleClick={(e) => e.stopPropagation()}
                  className="rounded border border-mtg-gold/25 bg-mtg-void/60 px-1.5 py-0.5 text-[10px] leading-none text-mtg-gold hover:border-mtg-gold/60 hover:bg-mtg-gold/10 disabled:cursor-not-allowed disabled:opacity-25"
                >
                  ▼
                </button>
              </div>

              <img
                src={prize.image}
                alt=""
                className="h-10 w-7 shrink-0 rounded object-cover"
                draggable={false}
              />

              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-mtg-frost">{prize.name}</p>
                <p className="text-[10px] uppercase tracking-wide text-mtg-frost/45">
                  {isCurrent
                    ? "Próximo sorteo"
                    : isPast
                      ? "Ya sorteado"
                      : `#${index + 1}`}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
