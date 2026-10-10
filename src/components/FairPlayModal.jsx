import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../context/AppContext";
import { FAIR_ALGORITHM_SOURCE, equalPercentages } from "../lib/fairRandom";
import AuditLog from "./AuditLog";

export default function FairPlayModal() {
  const { showFairPlay, setShowFairPlay, participants, lastFairDraw } = useApp();
  const percentages = equalPercentages(participants.length);

  return (
    <AnimatePresence>
      {showFairPlay && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowFairPlay(false)}
        >
          <motion.div
            role="dialog"
            aria-labelledby="fair-title"
            className="panel gold-border max-h-[90vh] w-full max-w-3xl overflow-auto rounded-xl p-5 md:p-7"
            initial={{ scale: 0.94, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="fair-title" className="font-display text-2xl text-gold-gradient">
                  Justicia del Sorteo — Fair Play
                </h2>
                <p className="mt-1 text-sm text-mtg-frost/70">
                  Aleatoriedad criptográfica del navegador. Sin Math.random() en la elección del ganador.
                </p>
              </div>
              <button
                type="button"
                className="btn-ghost rounded-md px-3 py-1 text-sm"
                onClick={() => setShowFairPlay(false)}
              >
                Cerrar
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-mtg-gold/20 bg-mtg-void/60 p-4">
                <p className="font-display text-xs uppercase tracking-wider text-mtg-gold">
                  Última entropía
                </p>
                {lastFairDraw ? (
                  <dl className="mt-2 space-y-1 font-mono text-sm">
                    <div className="flex justify-between gap-2">
                      <dt className="text-mtg-frost/50">Ganador</dt>
                      <dd className="font-sans font-bold text-mtg-gold-bright">
                        {lastFairDraw.winner}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-mtg-frost/50">Entropy (Uint32)</dt>
                      <dd className="text-mtg-mana-u">{lastFairDraw.entropy}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-mtg-frost/50">Decimal 0–1</dt>
                      <dd>{lastFairDraw.decimal.toFixed(10)}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-mtg-frost/50">Ángulo final</dt>
                      <dd>
                        {(((lastFairDraw.finalAngle ?? 0) * 180) / Math.PI).toFixed(2)}°
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-mtg-frost/50">Sector bajo flecha</dt>
                      <dd>#{lastFairDraw.index}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-mtg-frost/50">Prob. individual</dt>
                      <dd>{lastFairDraw.percentage}%</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="mt-2 text-sm text-mtg-frost/50">Todavía no se ha tirado.</p>
                )}
              </div>

              <div className="rounded-lg border border-mtg-gold/20 bg-mtg-void/60 p-4">
                <p className="font-display text-xs uppercase tracking-wider text-mtg-gold">
                  Porcentajes equitativos ({participants.length} activos)
                </p>
                <div className="mt-2 max-h-40 overflow-auto text-xs">
                  {participants.length === 0 ? (
                    <p className="text-mtg-frost/50">Sin participantes</p>
                  ) : (
                    <ul className="space-y-1">
                      {participants.map((name, i) => (
                        <li key={name} className="flex justify-between gap-2">
                          <span className="truncate text-mtg-frost/80">{name}</span>
                          <span className="font-mono text-mtg-gold">{percentages[i]}%</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5">
              <p className="font-display text-xs uppercase tracking-wider text-mtg-gold">
                Código exacto del algoritmo
              </p>
              <pre className="mt-2 overflow-auto rounded-lg border border-mtg-gold/15 bg-[#05080f] p-4 text-[11px] leading-relaxed text-mtg-mana-g md:text-xs">
                {FAIR_ALGORITHM_SOURCE}
              </pre>
            </div>

            <div className="mt-5">
              <p className="mb-2 font-display text-xs uppercase tracking-wider text-mtg-gold">
                Log de auditoría
              </p>
              <AuditLog />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
