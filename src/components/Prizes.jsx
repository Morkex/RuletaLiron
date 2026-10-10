import { useState } from "react";
import { useApp } from "../context/AppContext";

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Prizes() {
  const {
    prizes,
    currentPrizeIndex,
    setCurrentPrizeIndex,
    addPrize,
    removePrize,
    updatePrize,
    movePrize,
  } = useApp();

  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageData, setImageData] = useState("");

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const data = await fileToDataUrl(file);
    setImageData(data);
    setImageUrl("");
  };

  const handleAdd = () => {
    const img = imageData || imageUrl.trim();
    if (!name.trim() || !img) return;
    addPrize({ name: name.trim(), image: img });
    setName("");
    setImageUrl("");
    setImageData("");
  };

  return (
    <div className="mx-auto max-w-[900px] space-y-6">
      <section className="panel gold-border rounded-xl p-5 md:p-6">
        <h2 className="font-display text-2xl text-gold-gradient">Premios — Sobres de Magic</h2>
        <p className="mt-2 text-sm text-mtg-frost/75">
          Gestiona la cola de sobres. Usa ▲▼ para cambiar el orden.
          El premio destacado es el siguiente a sortear.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="mb-1 block font-display text-xs text-mtg-gold">Nombre de la edición</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-mtg-gold/25 bg-mtg-void/70 px-3 py-2 text-sm outline-none focus:border-mtg-gold/60"
              placeholder="p. ej. Duskmourn"
            />
          </label>
          <label className="block">
            <span className="mb-1 block font-display text-xs text-mtg-gold">URL de imagen</span>
            <input
              value={imageUrl}
              onChange={(e) => {
                setImageUrl(e.target.value);
                setImageData("");
              }}
              className="w-full rounded-lg border border-mtg-gold/25 bg-mtg-void/70 px-3 py-2 text-sm outline-none focus:border-mtg-gold/60"
              placeholder="https://…"
            />
          </label>
          <label className="block">
            <span className="mb-1 block font-display text-xs text-mtg-gold">Subir imagen (base64)</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFile}
              className="w-full rounded-lg border border-mtg-gold/25 bg-mtg-void/70 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-mtg-gold/20 file:px-2 file:py-1 file:text-mtg-gold-bright"
            />
          </label>
          <div className="flex items-end">
            <button type="button" className="btn-primary w-full rounded-md px-4 py-2 text-sm" onClick={handleAdd}>
              Añadir premio
            </button>
          </div>
        </div>

        {(imageData || imageUrl) && (
          <div className="mt-4 flex items-center gap-4">
            <img
              src={imageData || imageUrl}
              alt="Vista previa"
              className="h-28 w-20 rounded object-cover ring-1 ring-mtg-gold/40"
            />
            <span className="text-sm text-mtg-frost/60">Vista previa del sobre</span>
          </div>
        )}
      </section>

      {prizes.length > 0 ? (
        <ul className="flex flex-col gap-3 p-0">
          {prizes.map((prize, index) => {
            const isCurrent = index === currentPrizeIndex;
            const isPast = index < currentPrizeIndex;
            return (
              <li
                key={prize.id}
                className={`panel relative list-none overflow-hidden rounded-xl p-4 transition ${
                  isCurrent
                    ? "gold-glow ring-2 ring-mtg-gold animate-pulse-gold"
                    : "gold-border opacity-90"
                } ${isPast ? "opacity-45 grayscale-[30%]" : ""}`}
              >
                {isCurrent && (
                  <div className="shimmer pointer-events-none absolute inset-0" />
                )}
                <div className="relative flex gap-3 md:gap-4">
                  <div className="flex shrink-0 flex-col justify-center gap-1">
                    <button
                      type="button"
                      aria-label={`Subir ${prize.name}`}
                      title="Subir"
                      disabled={index === 0}
                      onClick={() => movePrize(index, -1)}
                      className="rounded-md border border-mtg-gold/30 bg-mtg-void/60 px-2.5 py-1.5 text-sm text-mtg-gold hover:border-mtg-gold hover:bg-mtg-gold/10 disabled:cursor-not-allowed disabled:opacity-25"
                    >
                      ▲
                    </button>
                    <span className="text-center font-mono text-[10px] text-mtg-frost/45">
                      #{index + 1}
                    </span>
                    <button
                      type="button"
                      aria-label={`Bajar ${prize.name}`}
                      title="Bajar"
                      disabled={index === prizes.length - 1}
                      onClick={() => movePrize(index, 1)}
                      className="rounded-md border border-mtg-gold/30 bg-mtg-void/60 px-2.5 py-1.5 text-sm text-mtg-gold hover:border-mtg-gold hover:bg-mtg-gold/10 disabled:cursor-not-allowed disabled:opacity-25"
                    >
                      ▼
                    </button>
                  </div>

                  <img
                    src={prize.image}
                    alt={prize.name}
                    className="h-28 w-20 shrink-0 rounded-md object-cover shadow-lg ring-1 ring-mtg-gold/30 md:h-36 md:w-24"
                  />

                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="font-display text-lg text-mtg-gold-bright">{prize.name}</p>
                    <p className="mt-1 text-xs uppercase tracking-wider text-mtg-frost/50">
                      {isCurrent
                        ? "En cola — próximo sorteo"
                        : isPast
                          ? "Ya sorteado"
                          : `Cola #${index + 1}`}
                    </p>
                    <div className="mt-auto flex flex-wrap gap-2 pt-3">
                      <button
                        type="button"
                        className="btn-ghost rounded px-2 py-1 text-xs"
                        onClick={() => setCurrentPrizeIndex(index)}
                      >
                        Marcar actual
                      </button>
                      <button
                        type="button"
                        className="rounded px-2 py-1 text-xs text-mtg-mana-r hover:bg-mtg-mana-r/15"
                        onClick={() => removePrize(prize.id)}
                      >
                        Quitar
                      </button>
                    </div>
                    <label className="mt-2 block text-[10px] text-mtg-frost/40">
                      Cambiar imagen (URL)
                      <input
                        defaultValue=""
                        placeholder="Nueva URL…"
                        onBlur={(e) => {
                          if (e.target.value.trim()) {
                            updatePrize(prize.id, { image: e.target.value.trim() });
                            e.target.value = "";
                          }
                        }}
                        className="mt-1 w-full rounded border border-mtg-gold/15 bg-mtg-void/50 px-2 py-1 text-xs"
                      />
                    </label>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-center text-mtg-frost/50">No hay premios. Añade al menos un sobre.</p>
      )}
    </div>
  );
}
