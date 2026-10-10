import { TABS } from "../lib/constants";
import { useApp } from "../context/AppContext";

export default function Navbar() {
  const { tab, setTab, toggleMusic, config, setShowFairPlay, participants, prizes } =
    useApp();

  return (
    <header className="sticky top-0 z-40 border-b border-mtg-gold/25 bg-mtg-void/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-mtg-gold bg-mtg-ink gold-glow">
            <span className="font-display text-lg text-mtg-gold-bright">✦</span>
          </div>
          <div>
            <h1 className="font-display text-xl font-bold tracking-wide text-gold-gradient md:text-2xl">
              Ruleta Lirón
            </h1>
            <p className="text-xs text-mtg-frost/70 md:text-sm">
              Sorteos MTG · {participants.length} jugadores · {prizes.length} premios
            </p>
          </div>
        </div>

        <nav className="order-3 flex w-full flex-wrap justify-center gap-1 md:order-none md:w-auto md:gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-md px-3 py-2 font-display text-xs tracking-wide transition md:text-sm ${
                tab === t.id
                  ? "bg-mtg-gold/20 text-mtg-gold-bright ring-1 ring-mtg-gold/50"
                  : "text-mtg-frost/70 hover:bg-mtg-ink hover:text-mtg-frost"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFairPlay(true)}
            className="btn-ghost rounded-md px-3 py-2 text-xs md:text-sm"
            title="Justicia del Sorteo"
          >
            Fair Play
          </button>
          <button
            type="button"
            onClick={toggleMusic}
            className={`btn-ghost rounded-md px-3 py-2 text-xs md:text-sm ${
              config.musicEnabled ? "ring-1 ring-mtg-gold/40 text-mtg-gold-bright" : ""
            }`}
          >
            {config.musicEnabled ? "♪ Música ON" : "♪ Música"}
          </button>
        </div>
      </div>
    </header>
  );
}
