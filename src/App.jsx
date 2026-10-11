import { useState } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import Navbar from "./components/Navbar";
import SorteoScreen from "./components/SorteoScreen";
import CommanderTables from "./components/CommanderTables";
import Participants from "./components/Participants";
import Prizes from "./components/Prizes";
import Config from "./components/Config";
import FairPlayModal from "./components/FairPlayModal";
import WinnerModal from "./components/WinnerModal";
import EmptyParticipantsModal from "./components/EmptyParticipantsModal";
import AppDocs from "./components/AppDocs";
import RoomDisplayScreen from "./components/RoomDisplayScreen";
import { isSalaDisplayMode } from "./lib/salaDisplay";

function AppShell() {
  const { tab } = useApp();
  const [docsOpen, setDocsOpen] = useState(false);

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
      <EmptyParticipantsModal />
      <FairPlayModal />
      <WinnerModal />
      <AppDocs open={docsOpen} onClose={() => setDocsOpen(false)} />
      <footer className="border-t border-mtg-gold/10 px-4 py-5 text-center">
        <div className="mx-auto flex flex-col items-center gap-2">
          <img
            src="/brand/liron-logo.png"
            alt="El Lirón"
            className="h-7 w-auto opacity-90"
          />
          <p className="text-xs text-mtg-frost/45">
            Juegos, Café y Libros · Sorteos y mesas Commander
          </p>
          <button
            type="button"
            onClick={() => setDocsOpen(true)}
            className="mt-1 text-[10px] text-mtg-frost/25 underline-offset-2 transition hover:text-mtg-frost/40 hover:underline"
          >
            documentación
          </button>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  if (isSalaDisplayMode()) {
    return <RoomDisplayScreen />;
  }

  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
