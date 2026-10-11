import { useEffect, useRef } from "react";

const KONAMI = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "KeyB",
  "KeyA",
];

/**
 * Dispara `onUnlock` al completar el código Konami.
 */
export function useKonamiCode(onUnlock) {
  const idxRef = useRef(0);
  const cbRef = useRef(onUnlock);
  cbRef.current = onUnlock;

  useEffect(() => {
    const onKey = (e) => {
      // Ignorar si escribe en inputs
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || e.target?.isContentEditable) {
        return;
      }

      const expected = KONAMI[idxRef.current];
      const code = e.code;
      // Acepta KeyB/KeyA o teclas b/a
      const match =
        code === expected ||
        (expected === "KeyB" && (code === "KeyB" || e.key === "b" || e.key === "B")) ||
        (expected === "KeyA" && (code === "KeyA" || e.key === "a" || e.key === "A"));

      if (match) {
        idxRef.current += 1;
        if (idxRef.current >= KONAMI.length) {
          idxRef.current = 0;
          cbRef.current?.();
        }
      } else {
        // Permitir reiniciar si el fallo es un nuevo inicio (↑)
        idxRef.current = code === "ArrowUp" ? 1 : 0;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
