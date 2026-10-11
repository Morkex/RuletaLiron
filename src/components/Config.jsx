import { useApp } from "../context/AppContext";
import { MUSIC_PRESETS } from "../lib/constants";

export default function Config() {
  const { config, updateConfig } = useApp();

  return (
    <div className="mx-auto max-w-3xl">
      <section className="panel gold-border rounded-xl p-5 md:p-8">
        <h2 className="font-display text-2xl text-gold-gradient">Configuración</h2>
        <p className="mt-2 text-sm text-mtg-frost/75">
          Ajusta duración del giro, audio y efectos para la pantalla de la tienda.
        </p>

        <div className="mt-8 space-y-8">
          <div>
            <div className="flex items-center justify-between">
              <label className="font-display text-sm text-mtg-gold" htmlFor="spinDuration">
                Duración del giro
              </label>
              <span className="font-mono text-mtg-gold-bright">{config.spinDuration}s</span>
            </div>
            <input
              id="spinDuration"
              type="range"
              min={3}
              max={15}
              step={1}
              value={config.spinDuration}
              onChange={(e) => updateConfig({ spinDuration: Number(e.target.value) })}
              className="mt-3 w-full accent-mtg-gold"
            />
            <p className="mt-1 text-xs text-mtg-frost/50">Entre 3 y 15 segundos</p>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="font-display text-sm text-mtg-gold" htmlFor="musicVol">
                Volumen música de fondo
              </label>
              <span className="font-mono text-mtg-gold-bright">
                {Math.round(config.musicVolume * 100)}%
              </span>
            </div>
            <input
              id="musicVol"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={config.musicVolume}
              onChange={(e) => updateConfig({ musicVolume: Number(e.target.value) })}
              className="mt-3 w-full accent-mtg-gold"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="font-display text-sm text-mtg-gold" htmlFor="sfxVol">
                Volumen efectos (ticks / victoria)
              </label>
              <span className="font-mono text-mtg-gold-bright">
                {Math.round(config.sfxVolume * 100)}%
              </span>
            </div>
            <input
              id="sfxVol"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={config.sfxVolume}
              onChange={(e) => updateConfig({ sfxVolume: Number(e.target.value) })}
              className="mt-3 w-full accent-mtg-gold"
            />
          </div>

          <div>
            <p className="font-display text-sm text-mtg-gold">Track de música de fondo</p>
            <div className="mt-3 space-y-2">
              {MUSIC_PRESETS.map((preset) => (
                <label
                  key={preset.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 ${
                    config.musicTrackId === preset.id
                      ? "border-mtg-gold/50 bg-mtg-gold/10"
                      : "border-mtg-gold/15 bg-mtg-void/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="musicTrack"
                    checked={config.musicTrackId === preset.id}
                    onChange={() => updateConfig({ musicTrackId: preset.id })}
                    className="accent-mtg-gold"
                  />
                  <span className="text-sm">{preset.label}</span>
                </label>
              ))}
            </div>

            <label className="mt-4 block">
              <span className="text-xs text-mtg-frost/60">URL personalizada 1 (mp3/ogg)</span>
              <input
                value={config.customMusicUrl1}
                onChange={(e) => updateConfig({ customMusicUrl1: e.target.value })}
                className="mt-1 w-full rounded-lg border border-mtg-gold/25 bg-mtg-void/70 px-3 py-2 text-sm outline-none focus:border-mtg-gold/60"
                placeholder="https://…/musica-epica.mp3"
              />
            </label>
            <label className="mt-3 block">
              <span className="text-xs text-mtg-frost/60">URL personalizada 2 (mp3/ogg)</span>
              <input
                value={config.customMusicUrl2}
                onChange={(e) => updateConfig({ customMusicUrl2: e.target.value })}
                className="mt-1 w-full rounded-lg border border-mtg-gold/25 bg-mtg-void/70 px-3 py-2 text-sm outline-none focus:border-mtg-gold/60"
                placeholder="https://…/tension-loop.ogg"
              />
            </label>
            <p className="mt-2 text-xs text-mtg-frost/45">
              Tip: también puedes colocar archivos en <code className="text-mtg-gold/80">public/audio/</code>{" "}
              y usar rutas como <code className="text-mtg-gold/80">/audio/fondo.mp3</code>.
              Los ticks y la fanfarria se generan con Web Audio API (sin archivos).
            </p>
          </div>

          <Toggle
            label="Confeti y efectos visuales"
            description="Desactívalo en PCs de bajos recursos"
            checked={config.confettiEnabled}
            onChange={(v) => updateConfig({ confettiEnabled: v })}
          />
        </div>
      </section>
    </div>
  );
}

function Toggle({ label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-mtg-gold/15 bg-mtg-void/40 px-4 py-3">
      <div>
        <p className="font-display text-sm text-mtg-gold">{label}</p>
        <p className="text-xs text-mtg-frost/55">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-8 w-14 rounded-full transition ${
          checked ? "bg-mtg-gold" : "bg-mtg-ink ring-1 ring-mtg-gold/30"
        }`}
      >
        <span
          className={`absolute top-1 h-6 w-6 rounded-full bg-mtg-void transition ${
            checked ? "left-7" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}
