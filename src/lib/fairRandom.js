/**
 * Fair Play — la ruleta elige un ángulo con crypto.getRandomValues
 * y el ganador es el dueño del sector bajo el puntero (3:00).
 * El marcador puede caer en cualquier punto del sector, no centrado en el nombre.
 */

export const POINTER_ANGLE = 0; // 3:00 en coordenadas canvas

export const FAIR_ALGORITHM_SOURCE = `function fairSpin(participants) {
  const n = participants.length;
  if (n === 0) throw new Error("Sin participantes");

  const MAX = 0x100000000; // 2^32
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  const entropy = buf[0];
  const decimal = entropy / (MAX - 1); // [0, 1]

  // Ángulo final de la ruleta (donde se detiene)
  const TWO_PI = Math.PI * 2;
  const finalAngle = decimal * TWO_PI;
  const slice = TWO_PI / n;

  // ¿Qué sector queda bajo el puntero a las 3:00?
  const rot = ((finalAngle % TWO_PI) + TWO_PI) % TWO_PI;
  const atPointer = (0 - rot + TWO_PI) % TWO_PI;
  const index = Math.floor((atPointer + slice / 2) / slice) % n;

  return {
    finalAngle,       // radianes donde para la ruleta
    index,            // sector bajo la flecha
    winner: participants[index],
    entropy,
    decimal,
    probability: 1 / n,
  };
}`;

const MAX_U32 = 0x100000000;

/** Dado el ángulo de rotación de la ruleta, ¿qué índice está bajo el puntero? */
export function sectorAtPointer(rotation, participantCount) {
  const n = participantCount;
  if (n <= 0) return -1;
  const TWO_PI = Math.PI * 2;
  const slice = TWO_PI / n;
  const rot = ((rotation % TWO_PI) + TWO_PI) % TWO_PI;
  const atPointer = (POINTER_ANGLE - rot + TWO_PI) % TWO_PI;
  return Math.floor((atPointer + slice / 2) / slice) % n;
}

/**
 * Genera un ángulo criptográfico uniforme y deduce el ganador
 * como propietario del sector bajo la flecha.
 */
export function fairSpin(participants) {
  const n = participants.length;
  if (n === 0) {
    throw new Error("No hay participantes activos");
  }

  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  const entropy = buf[0];
  const decimal = entropy / (MAX_U32 - 1);
  const TWO_PI = Math.PI * 2;
  const finalAngle = decimal * TWO_PI;
  const index = sectorAtPointer(finalAngle, n);

  return {
    finalAngle,
    index,
    winner: participants[index],
    entropy,
    decimal,
    probability: 1 / n,
    percentage: Number((100 / n).toFixed(4)),
    timestamp: Date.now(),
  };
}

/** @deprecated Usar fairSpin — se mantiene por compatibilidad de imports */
export function fairPick(participants) {
  return fairSpin(participants);
}

export function equalPercentages(count) {
  if (count <= 0) return [];
  const pct = 100 / count;
  return Array.from({ length: count }, () => Number(pct.toFixed(4)));
}
