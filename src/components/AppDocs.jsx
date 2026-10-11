import { useEffect } from "react";

/**
 * Documentación de uso de Ruleta Lirón (modal).
 */
export default function AppDocs({ open, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 p-3 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-docs-title"
      onClick={onClose}
    >
      <div
        className="panel gold-border flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-mtg-gold/20 px-5 py-4 md:px-6">
          <div>
            <h2
              id="app-docs-title"
              className="font-display text-xl text-gold-gradient md:text-2xl"
            >
              Guía de uso · Ruleta Lirón
            </h2>
            <p className="mt-1 text-xs text-mtg-frost/55">
              El Lirón · sorteos, premios y mesas Commander
            </p>
          </div>
          <button
            type="button"
            className="btn-ghost shrink-0 rounded-md px-3 py-1.5 text-sm"
            onClick={onClose}
          >
            Cerrar
          </button>
        </header>

        <div className="space-y-8 overflow-y-auto px-5 py-5 text-sm leading-relaxed text-mtg-frost/80 md:px-6 md:py-6">
          <Section title="1. Idea general">
            <p>
              La app sirve para dos cosas en la tienda:{" "}
              <strong className="text-mtg-frost">sortear premios</strong> con
              una ruleta justa, y{" "}
              <strong className="text-mtg-frost">repartir mesas Commander</strong>{" "}
              (con plano de sala opcional en un segundo monitor).
            </p>
            <p className="mt-2">
              La lista de participantes es compartida entre sorteos y mesas. El
              estado se guarda en el navegador (localStorage).
            </p>
          </Section>

          <Section title="2. Lista de participantes">
            <ol className="list-decimal space-y-1.5 pl-5">
              <li>
                Ve a <Em>Lista de Participantes</Em>.
              </li>
              <li>
                Añade nombres uno a uno, o pégalos en bloque (un nombre por
                línea) y pulsa importar.
              </li>
              <li>
                Puedes eliminar o reactivar jugadores. Los eliminados no entran
                en la ruleta ni en el reparto de mesas.
              </li>
            </ol>
            <p className="mt-2 text-mtg-frost/55">
              Si abres Sorteo o Mesas Commander sin lista, la app te invita a
              cargarla (salvo en Premios y Configuración).
            </p>
          </Section>

          <Section title="3. Premios y ruleta">
            <ol className="list-decimal space-y-1.5 pl-5">
              <li>
                En <Em>Premios</Em> define la cola: nombre e imagen de cada
                premio.
              </li>
              <li>
                En <Em>Sorteo / Ruleta</Em> verás el premio actual y la ruleta
                con los participantes activos.
              </li>
              <li>
                Lanza el giro (botón o doble clic en la ruleta). El sorteo usa
                azar criptográfico del navegador.
              </li>
              <li>
                Al salir el ganador se muestra el modal; puedes seguir con el
                siguiente premio.
              </li>
            </ol>
            <p className="mt-2">
              El botón <Em>Fair Play</Em> de la barra superior explica y muestra
              la auditoría del sorteo (transparencia ante los jugadores).
            </p>
          </Section>

          <Section title="4. Mesas Commander">
            <p className="mb-2">
              Pestaña principal por defecto. Tiene cuatro secciones:
            </p>
            <DocList
              items={[
                [
                  "Reparto",
                  "Genera las mesas con la lista activa. Puedes guardar el resultado como «ronda anterior» para anti-repetición, limpiar el resultado o saltar al plano.",
                ],
                [
                  "Vista sala",
                  "Muestra el mismo reparto sobre el plano. Aquí controlas título de ronda, cronómetro y abres la pantalla del segundo monitor.",
                ],
                [
                  "Diseñar sala",
                  "Coloca mesas y sillas, colores, tamaños y plantillas. Lo que dibujes define cuántas sillas hay al generar.",
                ],
                [
                  "Opciones",
                  "Reglas del algoritmo: min/máx por mesa, anti-repetición, plano de sala, mostrar nombre de ronda y cronómetro.",
                ],
              ]}
            />
            <h4 className="mb-1.5 mt-4 font-display text-sm text-mtg-gold">
              Flujo típico de una noche
            </h4>
            <ol className="list-decimal space-y-1.5 pl-5">
              <li>Carga la lista de jugadores.</li>
              <li>
                (Opcional) Diseña o elige una plantilla de sala y activa «Usar
                plano de sala».
              </li>
              <li>
                En Reparto pulsa <Em>¡Generar mesas!</Em>
              </li>
              <li>
                Si quieres anti-repetición en la siguiente ronda:{" "}
                <Em>Usar mesas actuales</Em> en «Ronda anterior».
              </li>
              <li>
                Abre <Em>Vista sala</Em> → pantalla completa en el monitor de
                jugadores.
              </li>
              <li>
                Al cambiar de ronda: guarda la anterior, genera de nuevo y usa
                «Siguiente ronda» (el cronómetro se reinicia).
              </li>
            </ol>
          </Section>

          <Section title="5. Pantalla de sala (segundo monitor)">
            <ol className="list-decimal space-y-1.5 pl-5">
              <li>
                En Vista sala, abre la URL de pantalla de sala (pestaña nueva
                con <code className="text-mtg-gold/80">?display=sala</code>).
              </li>
              <li>
                Arrastra esa pestaña al monitor de la tienda y pulsa{" "}
                <Em>Pantalla completa</Em>.
              </li>
              <li>
                El <strong className="text-mtg-frost">cronómetro</strong> solo
                arranca al entrar en pantalla completa (o con «Iniciar ahora»
                en la mesa de control).
              </li>
              <li>
                En fullscreen el botón pasa a{" "}
                <Em>Salir de pantalla completa</Em>.
              </li>
            </ol>
            <p className="mt-2 text-mtg-frost/55">
              La vista se sincroniza sola con el reparto de la mesa de control.
              Nombre de ronda y cronómetro se pueden ocultar en Opciones de
              mesas.
            </p>
          </Section>

          <Section title="6. Rondas y cronómetro">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                Título vacío → se muestra «Ronda N» automáticamente; puedes
                poner «Semifinales», «Final», etc.
              </li>
              <li>
                Pausar / reanudar / reiniciar desde Vista sala. Reiniciar deja
                el crono a cero esperando otra vez la pantalla completa.
              </li>
              <li>
                «Siguiente ronda» sube el número y resetea el cronómetro.
              </li>
            </ul>
          </Section>

          <Section title="7. Anti-repetición y pares a evitar">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                Con ronda anterior cargada, el generador intenta que no se
                repitan demasiados jugadores de la misma mesa (configurable en
                Opciones).
              </li>
              <li>
                <Em>Ctrl + Shift</Em> abre el panel secreto de{" "}
                <strong className="text-mtg-frost">pares a evitar</strong>:
                jugadores que no deben sentarse juntos (útil para conflictos o
                preferencias de la tienda).
              </li>
            </ul>
          </Section>

          <Section title="8. Configuración general">
            <p>
              En <Em>Configuración</Em> (menú superior): duración del giro,
              volúmenes, pista de música (o URLs propias) y confeti. La música
              también se enciende/apaga con el botón de la barra.
            </p>
            <p className="mt-2 text-mtg-frost/55">
              Las opciones específicas de mesas (ronda, cronómetro, algoritmo)
              están en Mesas Commander → Opciones, no aquí.
            </p>
          </Section>

          <Section title="9. Consejos rápidos">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                Si hay más jugadores que sillas, añade sillas en Diseñar sala o
                baja la lista.
              </li>
              <li>
                Si el plano y la lista coinciden en número, se llenan todas las
                sillas del plano.
              </li>
              <li>
                Los nombres largos se acortan en el plano para que se lean bien.
              </li>
              <li>
                Todo queda en este navegador: si cambias de PC, exporta la lista
                de participantes pegándola en un texto.
              </li>
            </ul>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <h3 className="mb-2 font-display text-base text-mtg-gold-bright">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Em({ children }) {
  return <span className="text-mtg-frost/95">{children}</span>;
}

function DocList({ items }) {
  return (
    <ul className="space-y-2">
      {items.map(([label, text]) => (
        <li key={label} className="rounded-lg bg-mtg-void/40 px-3 py-2">
          <span className="font-display text-xs text-mtg-gold">{label}</span>
          <p className="mt-0.5 text-mtg-frost/70">{text}</p>
        </li>
      ))}
    </ul>
  );
}
