const HEADER_PATTERNS = [
  /^ronda\b/i,
  /^round\b/i,
  /^table\b/i,
  /^mesa\b/i,
  /^player\b/i,
  /^jugador(es)?\b/i,
  /^name\b/i,
  /^nombre\b/i,
  /^status\b/i,
  /^estado\b/i,
  /^seat\b/i,
  /^puesto\b/i,
  /^standing\b/i,
  /^rank\b/i,
  /^points?\b/i,
  /^puntos?\b/i,
  /^result\b/i,
  /^resultado\b/i,
  /^opponent\b/i,
  /^oponente\b/i,
  /^match\b/i,
  /^partida\b/i,
  /^event\b/i,
  /^evento\b/i,
  /^checked\s*in\b/i,
  /^active\b/i,
  /^dropped?\b/i,
  /^bye\b/i,
  /^#?\s*players?\b/i,
];

const STATUS_TOKENS = [
  "checked in",
  "checked-in",
  "check-in",
  "active",
  "inactive",
  "dropped",
  "drop",
  "eliminated",
  "eliminado",
  "present",
  "absent",
  "no show",
  "noshow",
  "bye",
  "waiting",
  "en espera",
];

const TABLE_PREFIX = /^(?:mesa|table|seat|puesto)\s*[#:]?\s*\d+\s*[-–:]?\s*/i;
const LEADING_INDEX = /^\d{1,3}[\).:\-\s]+/;
const TRAILING_TABLE = /\s+(?:mesa|table|seat)\s*[#:]?\s*\d+\s*$/i;
const SCORE_TAIL = /\s+\d+\s*[-:]\s*\d+\s*$/;
const PURE_NUMBER = /^\d+$/;
const ONLY_STATUS = /^(checked\s*in|active|dropped?|bye|waiting|present|absent)$/i;

function stripStatusTokens(line) {
  let result = line;
  for (const token of STATUS_TOKENS) {
    const re = new RegExp(`\\b${token.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "gi");
    result = result.replace(re, " ");
  }
  return result;
}

function isHeaderOrJunk(line) {
  if (!line) return true;
  if (PURE_NUMBER.test(line)) return true;
  if (ONLY_STATUS.test(line)) return true;
  if (HEADER_PATTERNS.some((re) => re.test(line))) return true;
  // Filas tipo "1 2 3" o cabeceras tabulares cortas sin letras
  if (!/[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/.test(line)) return true;
  return false;
}

function cleanLine(raw) {
  let line = raw.replace(/\t+/g, " ").replace(/\s+/g, " ").trim();
  if (!line) return "";

  line = line.replace(TABLE_PREFIX, "");
  line = line.replace(LEADING_INDEX, "");
  line = stripStatusTokens(line);
  line = line.replace(TRAILING_TABLE, "");
  line = line.replace(SCORE_TAIL, "");
  line = line.replace(/[|]+/g, " ").replace(/\s+/g, " ").trim();

  // EventLink a veces deja "Nombre Apellido  Active  Mesa 3"
  line = line.replace(/\s+\d+\s*$/, (m) => {
    // Solo quitar si parece número de mesa residual y el nombre ya tiene letras
    return /[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(line.slice(0, -m.length)) ? "" : m;
  }).trim();

  // Restos de "Nombre - Active" / "Nombre —"
  line = line.replace(/\s*[-–—|:]+$/g, "").trim();

  return line;
}

/**
 * Parser inteligente para listas brutas (EventLink, CSV suelto, etc.)
 * Devuelve nombres únicos, uno por línea, en orden de aparición.
 */
export function parseParticipants(rawText) {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.split(/\r?\n/);
  const seen = new Set();
  const names = [];

  for (const raw of lines) {
    const name = cleanLine(raw);
    if (isHeaderOrJunk(name)) continue;

    // Evitar filas que siguen siendo demasiado cortas o genéricas
    if (name.length < 2) continue;

    const key = name.toLocaleLowerCase("es");
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }

  return names;
}

const PAIR_SEP = /\s*\/\/\s*/;

function splitPairLine(entry) {
  return String(entry || "")
    .split(PAIR_SEP)
    .map((s) => s.trim())
    .filter(Boolean);
}

function isAlreadyPaired(entry) {
  return splitPairLine(entry).length === 2;
}

/**
 * En Dos Cabezas: si la lista viene como nombres sueltos (uno por línea),
 * empareja consecutivos → «nombre1 // nombre2», «nombre3 // nombre4», …
 * Si ya vienen con //, se respetan.
 */
export function coerceTwoHeadedPairs(names) {
  const list = (names || []).map((n) => String(n).trim()).filter(Boolean);
  if (!list.length) return [];

  if (list.every(isAlreadyPaired)) return list;

  const flat = [];
  const seen = new Set();
  for (const entry of list) {
    const parts = splitPairLine(entry);
    const members = parts.length >= 2 ? parts : [entry];
    for (const m of members) {
      const key = m.toLocaleLowerCase("es");
      if (seen.has(key)) continue;
      seen.add(key);
      flat.push(m);
    }
  }

  const pairs = [];
  for (let i = 0; i < flat.length; i += 2) {
    if (i + 1 < flat.length) {
      pairs.push(`${flat[i]} // ${flat[i + 1]}`);
    } else {
      pairs.push(flat[i]);
    }
  }
  return pairs;
}
