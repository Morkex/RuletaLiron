import { useRef, useState } from "react";
import { TABS } from "../lib/constants";
import { useApp } from "../context/AppContext";
import LironRunnerGame from "./LironRunnerGame";
import LironKonamiBattle from "./LironKonamiBattle";
import { useKonamiCode } from "../hooks/useKonamiCode";

const EGG_CLICKS = 7;
const EGG_WINDOW_MS = 2500;

export default function Navbar() {
  const { tab, setTab, toggleMusic, config, setShowFairPlay, participants, prizes } =
    useApp();
  const [showRunner, setShowRunner] = useState(false);
  const [showBattle, setShowBattle] = useState(false);
  const clicksRef = useRef({ count: 0, timer: null });

  useKonamiCode(() => setShowBattle(true));

  const onLogoEggClick = () => {
    const bag = clicksRef.current;
    bag.count += 1;
    if (bag.timer) clearTimeout(bag.timer);
    bag.timer = setTimeout(() => {
      bag.count = 0;
    }, EGG_WINDOW_MS);
    if (bag.count >= EGG_CLICKS) {
      bag.count = 0;
      if (bag.timer) clearTimeout(bag.timer);
      setShowRunner(true);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-mtg-gold/25 bg-mtg-void/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onLogoEggClick}
            className="rounded-full p-0 transition hover:scale-105 active:scale-95"
            aria-label="El Lirón"
          >
            <img
              src="/brand/liron-icon.png"
              alt="El Lirón"
              className="h-12 w-12 rounded-full border-2 border-mtg-gold object-cover gold-glow md:h-14 md:w-14"
              draggable={false}
            />
          </button>
          <div className="min-w-0">
            <img
              src="/brand/liron-logo.png"
              alt="El Lirón"
              className="h-8 w-auto max-w-[180px] object-contain object-left md:h-10 md:max-w-[220px]"
            />
            <p className="mt-0.5 text-xs text-mtg-frost/70 md:text-sm">
              Ruleta · Sorteos MTG · {participants.length} jugadores · {prizes.length} premios
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

      <LironRunnerGame open={showRunner} onClose={() => setShowRunner(false)} />
      <LironKonamiBattle open={showBattle} onClose={() => setShowBattle(false)} />
    </header>
  );
}
