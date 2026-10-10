import { AppProvider, useApp } from "./context/AppContext";
import Navbar from "./components/Navbar";
import SorteoScreen from "./components/SorteoScreen";
import CommanderTables from "./components/CommanderTables";
import Participants from "./components/Participants";
import Prizes from "./components/Prizes";
import Config from "./components/Config";
import FairPlayModal from "./components/FairPlayModal";
import WinnerModal from "./components/WinnerModal";

function AppShell() {
  const { tab } = useApp();

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="px-4 py-6 md:px-6 md:py-8">
        {tab === "sorteo" && <SorteoScreen />}
        {tab === "commander" && <CommanderTables />}
        {tab === "participantes" && <Participants />}
        {tab === "premios" && <Prizes />}
        {tab === "config" && <Config />}
      </main>
      <FairPlayModal />
      <WinnerModal />
      <footer className="border-t border-mtg-gold/15 px-4 py-5 text-center">
        <div className="mx-auto flex flex-col items-center gap-2">
          <img
            src="/brand/liron-logo.png"
            alt="El Lirón"
            className="h-7 w-auto opacity-90"
          />
          <p className="text-xs text-mtg-frost/45">
            Juegos, Café y Libros · Sorteos y mesas Commander
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
