import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../context/AppContext";

/**
 * Avisa si no hay participantes y lleva a la lista.
 */
export default function EmptyParticipantsModal() {
  const { participants, tab, setTab } = useApp();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (participants.length === 0 && tab !== "participantes") {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [participants.length, tab]);

  if (!open) return null;

  const goToList = () => {
    setTab("participantes");
    setOpen(false);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[180] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="empty-participants-title"
    >
      <div className="panel gold-border w-full max-w-md rounded-2xl p-6 shadow-2xl">
        <h2
          id="empty-participants-title"
          className="font-display text-xl text-gold-gradient md:text-2xl"
        >
          Falta la lista de participantes
        </h2>
        <p className="mt-3 text-sm text-mtg-frost/75 md:text-base">
          Para repartir mesas Commander o hacer sorteos hace falta importar o
          crear antes la lista de jugadores.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary rounded-xl px-5 py-2.5 text-sm"
            onClick={goToList}
          >
            Ir a la lista de participantes
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
