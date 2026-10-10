import { AppProvider, useApp } from "./context/AppContext";
import Navbar from "./components/Navbar";
import SorteoScreen from "./components/SorteoScreen";
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
        {tab === "participantes" && <Participants />}
        {tab === "premios" && <Prizes />}
        {tab === "config" && <Config />}
      </main>
      <FairPlayModal />
      <WinnerModal />
      <footer className="border-t border-mtg-gold/15 px-4 py-4 text-center text-xs text-mtg-frost/40">
        Ruleta El Lirón
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
