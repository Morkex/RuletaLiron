import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../context/AppContext";

export default function WinnerModal() {
  const { winnerModal, confirmWinner } = useApp();

  return (
    <AnimatePresence>
      {winnerModal && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            role="dialog"
            className="panel relative w-full max-w-lg overflow-hidden rounded-2xl gold-glow p-6 text-center md:p-10"
            initial={{ scale: 0.8, rotate: -2 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 18 }}
          >
            <div className="shimmer pointer-events-none absolute inset-0" />
            <p className="relative font-display text-sm uppercase tracking-[0.25em] text-mtg-gold">
              ¡Ganador del sorteo!
            </p>
            <h2 className="relative mt-3 font-display text-4xl font-black text-gold-gradient md:text-5xl">
              {winnerModal.winner}
            </h2>

            {winnerModal.prize && (
              <div className="relative mx-auto mt-6 flex max-w-xs flex-col items-center gap-3">
                <img
                  src={winnerModal.prize.image}
                  alt={winnerModal.prize.name}
                  className="h-40 w-28 rounded-md object-cover shadow-2xl ring-2 ring-mtg-gold/50"
                />
                <p className="font-display text-lg text-mtg-frost">
                  Premio: <span className="text-mtg-gold-bright">{winnerModal.prize.name}</span>
                </p>
              </div>
            )}

            <p className="relative mt-4 font-mono text-xs text-mtg-frost/50">
              Entropy: {winnerModal.entropy} ·{" "}
              {Number(winnerModal.decimal || 0).toFixed(8)}
            </p>

            <div className="relative mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                className="btn-primary rounded-lg px-5 py-3 text-sm"
                onClick={(e) => {
                  e.currentTarget.disabled = true;
                  confirmWinner(true);
                }}
              >
                Eliminar de la lista y Continuar
              </button>
              <button
                type="button"
                className="btn-ghost rounded-lg px-5 py-3 text-sm"
                onClick={(e) => {
                  e.currentTarget.disabled = true;
                  confirmWinner(false);
                }}
              >
                Mantener en la lista y Continuar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
