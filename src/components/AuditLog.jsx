import { useApp } from "../context/AppContext";

export default function AuditLog({ compact = false }) {
  const { auditLog } = useApp();

  if (auditLog.length === 0) {
    return (
      <p className="text-sm text-mtg-frost/45">
        Aún no hay tiradas. El log de auditoría aparecerá aquí con cada sorteo.
      </p>
    );
  }

  return (
    <div className={compact ? "max-h-48 overflow-auto" : "max-h-[420px] overflow-auto"}>
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-mtg-panel/95 text-xs uppercase tracking-wider text-mtg-gold/80">
          <tr>
            <th className="px-2 py-2">#</th>
            <th className="px-2 py-2">Ganador</th>
            <th className="px-2 py-2">Premio</th>
            <th className="px-2 py-2">Ángulo</th>
            <th className="px-2 py-2">Entropy</th>
          </tr>
        </thead>
        <tbody>
          {auditLog.map((row) => (
            <tr key={row.id} className="border-t border-mtg-gold/10 text-mtg-frost/85">
              <td className="px-2 py-2 font-mono text-mtg-gold/70">{row.tirada}</td>
              <td className="px-2 py-2 font-semibold">{row.winner}</td>
              <td className="px-2 py-2 text-mtg-frost/60">{row.prize}</td>
              <td className="px-2 py-2 font-mono text-xs">
                {row.finalAngleDeg != null ? `${row.finalAngleDeg}°` : "—"}
              </td>
              <td className="px-2 py-2 font-mono text-xs text-mtg-mana-u">
                {row.entropy}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
