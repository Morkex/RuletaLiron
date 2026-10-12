/**
 * Reparto de mesas Commander configurable.
 * Por defecto: mesas 3–4, anti-repetición (máx. 2 de la ronda anterior).
 */

export const COMMANDER_CONFIG_DEFAULTS = {
  minPerTable: 3,
  maxPerTable: 4,
  /** "auto" calcula mesas; "fixed" usa fixedTableCount */
  tableCountMode: "auto",
  fixedTableCount: 3,
  /** Preferir mesas más llenas (más cerca del máximo) en modo auto */
  preferLargerTables: true,
  /** Si no cabe en min–max, permitir una sola mesa con todos */
  allowOversizedFallback: true,
  /** Evitar que coincidan demasiados de la misma mesa anterior */
  avoidRepeatEnabled: true,
  /** Máx. jugadores de una misma mesa anterior en la nueva (2 ⇒ 3 no pueden repetir) */
  maxRepeatFromPrevious: 2,
  maxAttempts: 800,
  tableLabelPrefix: "Mesa",
  /** Tope de mesas en modo auto (p. ej. mesas físicas del plano). 0 = sin tope */
  maxTableCount: 0,
  /** Mostrar título de ronda en vista sala / pantalla completa */
  showSalaRoundLabel: true,
  /** Mostrar cronómetro (arranca al poner pantalla completa) */
  showSalaRoundTimer: true,
  /**
   * Commander Two-Headed Giant: cada entrada es «A // B» y ocupa 2 sillas
   * en la misma mesa (la pareja no se separa).
   */
  twoHeadedGiant: false,
  /**
   * Archenemy: solo mesas de 4; un jugador aleatorio de cada mesa es el Archenemy.
   */
  archenemy: false,
};

/** Separador de pareja 2HG: "Jugador A // Jugador B" */
export const TWO_HEADED_SEP = /\s*\/\/\s*/;

/** Colores por equipo en 2 cabezas (mismo color = misma pareja; único entre mesas). */
export const TWO_HEADED_TEAM_COLORS = [
  "#3b82f6", // azul
  "#c026d3", // fucsia
  "#0d9488", // teal
  "#ea580c", // naranja
  "#eab308", // amarillo
  "#16a34a", // verde
  "#ef4444", // rojo
  "#8b5cf6", // violeta
  "#06b6d4", // cian
  "#ec4899", // rosa
  "#84cc16", // lima
  "#f97316", // naranja claro
];

export function twoHeadedTeamColor(teamIndex) {
  const i = Math.max(0, Number(teamIndex) || 0);
  return TWO_HEADED_TEAM_COLORS[i % TWO_HEADED_TEAM_COLORS.length];
}

/** Mapa nombre(lowercase) → color hex a partir de una o varias mesas (índice global). */
export function buildTeamColorByPlayer(tableOrTables, startIndex = 0) {
  const map = {};
  const tables = Array.isArray(tableOrTables)
    ? tableOrTables
    : tableOrTables
      ? [tableOrTables]
      : [];
  let idx = Math.max(0, Number(startIndex) || 0);
  for (const table of tables) {
    const teams = table?.teams;
    if (!Array.isArray(teams)) continue;
    for (const pair of teams) {
      const color = twoHeadedTeamColor(idx++);
      for (const name of pair || []) {
        const key = String(name || "")
          .trim()
          .toLocaleLowerCase("es");
        if (key) map[key] = color;
      }
    }
  }
  return map;
}

export function splitTwoHeadedMembers(entry) {
  return String(entry || "")
    .split(TWO_HEADED_SEP)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Expande la lista a personas individuales para la ruleta (2 cabezas). */
export function expandTwoHeadedForSpin(participants) {
  const names = [];
  const seen = new Set();
  for (const raw of participants || []) {
    const parts = splitTwoHeadedMembers(raw);
    const members = parts.length === 2 ? parts : [String(raw || "").trim()].filter(Boolean);
    for (const m of members) {
      const key = m.toLocaleLowerCase("es");
      if (seen.has(key)) continue;
      seen.add(key);
      names.push(m);
    }
  }
  return names;
}

/** Entrada de lista («A // B» o nombre) que contiene a este miembro. */
export function findParticipantEntryForMember(participants, memberName) {
  const key = String(memberName || "")
    .trim()
    .toLocaleLowerCase("es");
  if (!key) return null;
  for (const p of participants || []) {
    const parts = splitTwoHeadedMembers(p);
    if (parts.length === 2) {
      if (parts.some((m) => m.toLocaleLowerCase("es") === key)) return p;
    } else if (String(p).trim().toLocaleLowerCase("es") === key) {
      return p;
    }
  }
  return null;
}

export function teammateName(entry, memberName) {
  const parts = splitTwoHeadedMembers(entry);
  if (parts.length !== 2) return null;
  const key = String(memberName || "")
    .trim()
    .toLocaleLowerCase("es");
  if (parts[0].toLocaleLowerCase("es") === key) return parts[1];
  if (parts[1].toLocaleLowerCase("es") === key) return parts[0];
  return null;
}

export function looksLikeTwoHeadedEntry(entry) {
  return splitTwoHeadedMembers(entry).length === 2;
}

/**
 * Parsea la lista como parejas 2HG.
 * @returns {{ a: string, b: string, label: string }[]}
 */
export function parseTwoHeadedTeams(players) {
  const teams = [];
  const seenMembers = new Set();

  for (const raw of players) {
    const line = String(raw || "").trim();
    if (!line) continue;
    const parts = splitTwoHeadedMembers(line);
    if (parts.length !== 2) {
      throw new Error(
        `Modo 2 cabezas: cada línea debe ser «Jugador A // Jugador B». Revisa: «${line.slice(0, 72)}»`,
      );
    }
    const [a, b] = parts;
    const ka = a.toLocaleLowerCase("es");
    const kb = b.toLocaleLowerCase("es");
    if (ka === kb) {
      throw new Error(`Pareja inválida (mismo nombre dos veces): ${a}`);
    }
    if (seenMembers.has(ka) || seenMembers.has(kb)) {
      throw new Error(
        `Un jugador no puede estar en dos parejas: ${seenMembers.has(ka) ? a : b}`,
      );
    }
    seenMembers.add(ka);
    seenMembers.add(kb);
    teams.push({ a, b, label: `${a} // ${b}` });
  }

  return teams;
}

/** Plazas (sillas) que ocupa la lista; en 2HG cada pareja cuenta 2. */
export function poolSeatCount(players, twoHeadedGiant) {
  if (!twoHeadedGiant) return (players || []).filter((p) => String(p).trim()).length;
  try {
    return parseTwoHeadedTeams(players).length * 2;
  } catch {
    // Preview tolerante: contar líneas × 2 si parecen parejas
    const lines = (players || []).map((p) => String(p).trim()).filter(Boolean);
    if (lines.every(looksLikeTwoHeadedEntry)) return lines.length * 2;
    return lines.length;
  }
}

function evenFloor(n) {
  const v = Math.max(0, Math.floor(Number(n) || 0));
  return v - (v % 2);
}

function ensureEvenSizes(sizes) {
  if (!sizes?.length) return [];
  if (sizes.some((s) => s % 2 !== 0)) return [];
  return sizes;
}

export function normalizeCommanderConfig(partial = {}) {
  const c = { ...COMMANDER_CONFIG_DEFAULTS, ...partial };
  // Un solo modo extra a la vez
  let twoHeadedGiant = Boolean(c.twoHeadedGiant);
  let archenemy = Boolean(c.archenemy);
  if (twoHeadedGiant && archenemy) archenemy = false;

  let min = Math.max(2, Math.min(6, Number(c.minPerTable) || 3));
  let max = Math.max(2, Math.min(8, Number(c.maxPerTable) || 4));
  if (archenemy) {
    min = 4;
    max = 4;
  } else if (twoHeadedGiant) {
    // Mesas en plazas pares (típico 4 = 2 equipos)
    if (min % 2) min += 1;
    if (max % 2) max -= 1;
    min = Math.max(2, Math.min(6, min));
    max = Math.max(2, Math.min(8, max));
  }
  if (min > max) [min, max] = [max, min];
  if (twoHeadedGiant && min % 2) min = Math.min(6, min + 1);
  if (twoHeadedGiant && max % 2) max = Math.max(min, max - 1);
  if (min > max) max = min;

  return {
    ...c,
    twoHeadedGiant,
    archenemy,
    minPerTable: min,
    maxPerTable: max,
    fixedTableCount: Math.max(1, Math.min(20, Number(c.fixedTableCount) || 1)),
    maxTableCount: Math.max(0, Math.min(20, Number(c.maxTableCount) || 0)),
    maxRepeatFromPrevious: Math.max(
      0,
      Math.min(8, Number(c.maxRepeatFromPrevious) || 0),
    ),
    maxAttempts: Math.max(50, Math.min(5000, Number(c.maxAttempts) || 800)),
    tableLabelPrefix: String(c.tableLabelPrefix || "Mesa").slice(0, 24),
    preferLargerTables: Boolean(c.preferLargerTables),
    allowOversizedFallback: Boolean(c.allowOversizedFallback),
    avoidRepeatEnabled: Boolean(c.avoidRepeatEnabled),
    tableCountMode: c.tableCountMode === "fixed" ? "fixed" : "auto",
    showSalaRoundLabel: c.showSalaRoundLabel !== false,
    showSalaRoundTimer: c.showSalaRoundTimer !== false,
  };
}

/** Baraja con crypto.getRandomValues (Fisher–Yates). */
export function cryptoShuffle(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    const j = buf[0] % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function sizesFromTableCount(n, tableCount, min, max) {
  if (tableCount < 1 || n < 1) return [];
  const base = Math.floor(n / tableCount);
  const rem = n % tableCount;
  const high = base + (rem > 0 ? 1 : 0);
  if (base < min || high > max) return [];
  return [...Array(rem).fill(base + 1), ...Array(tableCount - rem).fill(base)];
}

/**
 * Reparte n jugadores en mesas con capacidades distintas (sillas del plano).
 * Si cabe en un “máximo cómodo” (p. ej. 4), lo usa; si no, aprovecha sillas extra.
 * @returns {number[]} tamaños de pods (solo mesas usadas), mayor→menor
 */
export function computeSizesForRoomCapacities(
  n,
  capacities,
  { minPerTable = 3, softMax = 4 } = {},
) {
  const caps = (capacities || []).map(Number).filter((c) => c > 0);
  if (!caps.length || n < 1) return [];
  const total = caps.reduce((a, b) => a + b, 0);
  if (n > total) return [];

  const pack = (limitCaps, minPer) => {
    const indexed = limitCaps
      .map((cap, i) => ({ cap, i }))
      .filter((x) => x.cap > 0)
      .sort((a, b) => b.cap - a.cap);

    for (let k = 1; k <= indexed.length; k++) {
      const chosen = indexed.slice(0, k);
      const sumCap = chosen.reduce((s, x) => s + x.cap, 0);
      if (sumCap < n) continue;

      let minPerEff = Math.max(1, minPer);
      let mins = chosen.map((x) => Math.min(minPerEff, x.cap));
      let minSum = mins.reduce((a, b) => a + b, 0);
      while (minSum > n && minPerEff > 1) {
        minPerEff -= 1;
        mins = chosen.map((x) => Math.min(minPerEff, x.cap));
        minSum = mins.reduce((a, b) => a + b, 0);
      }
      if (minSum > n) continue;

      const sizes = [...mins];
      let left = n - minSum;
      while (left > 0) {
        let placed = false;
        for (let i = 0; i < k && left > 0; i++) {
          if (sizes[i] < chosen[i].cap) {
            sizes[i] += 1;
            left -= 1;
            placed = true;
          }
        }
        if (!placed) break;
      }
      if (left > 0) continue;

      return sizes.filter((s) => s > 0).sort((a, b) => b - a);
    }
    return null;
  };

  // 1) Intento “cómodo” (Commander 3–4) sin usar sillas por encima de softMax
  const softCaps = caps.map((c) => Math.min(c, softMax));
  if (softCaps.reduce((a, b) => a + b, 0) >= n) {
    const soft = pack(softCaps, minPerTable);
    if (soft) return soft;
  }

  // 2) Hace falta aprovechar sillas extra del plano
  const full = pack(caps, minPerTable);
  if (full) return full;

  // 3) Último recurso: llenar mesas grandes primero
  const greedy = [];
  let left = n;
  const sorted = [...caps].sort((a, b) => b - a);
  for (const cap of sorted) {
    if (left <= 0) break;
    const take = Math.min(cap, left);
    if (take > 0) {
      greedy.push(take);
      left -= take;
    }
  }
  return left === 0 ? greedy.sort((a, b) => b - a) : [];
}

/**
 * Calcula tamaños de mesa según config.
 */
export function computeTableSizes(n, configInput = {}) {
  const cfg = normalizeCommanderConfig(configInput);
  const { minPerTable: min, maxPerTable: max } = cfg;
  const twoHG = cfg.twoHeadedGiant;

  if (twoHG && n % 2 !== 0) return [];

  if (n < min && !Array.isArray(cfg.exactSizes) && !twoHG) return [];

  /** Tamaños forzados (p. ej. sillas por mesa del plano de sala). */
  if (Array.isArray(cfg.exactSizes) && cfg.exactSizes.length) {
    let sizes = cfg.exactSizes.map((s) => Number(s)).filter((s) => s > 0);
    if (twoHG) {
      sizes = sizes.map(evenFloor).filter((s) => s >= 2);
      sizes = ensureEvenSizes(sizes);
    }
    const sum = sizes.reduce((a, b) => a + b, 0);
    if (sum === n) return sizes;
    // 2HG: si el plano tiene más sillas que jugadores, el empaquetado
    // jugable (mesas ≥ 2 equipos) se hace en assign / packTwoHeaded…
    if (twoHG && sum > n) return [];
    return [];
  }

  /** Capacidades del plano (sillas por mesa), no necesariamente llenas. */
  if (Array.isArray(cfg.roomCapacities) && cfg.roomCapacities.length) {
    if (twoHG) {
      const caps = cfg.roomCapacities.map(evenFloor).filter((c) => c >= 2);
      const teamN = n / 2;
      const packed = packTwoHeadedTeamsIntoRoom(
        Array.from({ length: teamN }, (_, i) => ({
          a: `a${i}`,
          b: `b${i}`,
          label: `t${i}`,
        })),
        caps,
        { minPerTable: min, maxPerTable: max },
      );
      // Preview de tamaños jugables (sin contar espera)
      return packed.seatSizes;
    }
    return computeSizesForRoomCapacities(n, cfg.roomCapacities, {
      minPerTable: min,
      softMax: Math.max(max, 4),
    });
  }

  if (twoHG) {
    return computeTwoHeadedAutoSizes(n, min, max);
  }

  if (cfg.tableCountMode === "fixed") {
    const sizes = sizesFromTableCount(n, cfg.fixedTableCount, min, max);
    if (sizes.length) return sizes;
    if (cfg.allowOversizedFallback && cfg.fixedTableCount === 1 && n >= min) {
      return [n];
    }
    return [];
  }

  // auto: nº de mesas viable
  let tMin = Math.ceil(n / max);
  let tMax = Math.floor(n / min);

  // Tope por mesas físicas del plano (no obliga a usarlas todas)
  if (cfg.maxTableCount > 0) {
    tMax = Math.min(tMax, cfg.maxTableCount);
  }

  if (tMin > tMax) {
    if (cfg.allowOversizedFallback && n >= min) {
      return [n];
    }
    return [];
  }

  // preferLargerTables → menos mesas, más llenas (15 → 4+4+4+3, no 5×3)
  const t = cfg.preferLargerTables ? tMin : tMax;
  return sizesFromTableCount(n, t, min, max);
}

/** ¿Supera el límite de repetición respecto a mesas anteriores? */
export function violatesRepeatRule(tablePlayers, previousTables, maxRepeat) {
  if (!previousTables?.length || maxRepeat >= 99) return false;
  const set = new Set(tablePlayers.map((p) => p.toLocaleLowerCase("es")));

  for (const prev of previousTables) {
    let overlap = 0;
    for (const name of prev) {
      if (set.has(String(name).toLocaleLowerCase("es"))) overlap += 1;
      if (overlap > maxRepeat) return true;
    }
  }
  return false;
}

/** ¿Hay alguna pareja prohibida juntos en esta mesa? */
export function violatesAvoidPairs(tablePlayers, avoidPairs) {
  if (!avoidPairs?.length) return false;
  const set = new Set(
    tablePlayers.map((p) => String(p).toLocaleLowerCase("es")),
  );
  for (const pair of avoidPairs) {
    const a = String(pair?.a || "")
      .trim()
      .toLocaleLowerCase("es");
    const b = String(pair?.b || "")
      .trim()
      .toLocaleLowerCase("es");
    if (a && b && a !== b && set.has(a) && set.has(b)) return true;
  }
  return false;
}

export function normalizeAvoidPairs(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  const seen = new Set();
  for (const p of raw) {
    const a = String(p?.a || "").trim();
    const b = String(p?.b || "").trim();
    if (!a || !b) continue;
    const ka = a.toLocaleLowerCase("es");
    const kb = b.toLocaleLowerCase("es");
    if (ka === kb) continue;
    const key = [ka, kb].sort().join("\0");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ a, b });
  }
  return out;
}

export function tablesAreValid(tables, previousTables, cfg, avoidPairs = []) {
  const config = normalizeCommanderConfig(cfg);
  const pairs = normalizeAvoidPairs(avoidPairs);
  const hasExact = Array.isArray(cfg.exactSizes) && cfg.exactSizes.length > 0;
  return tables.every((t) => {
    const n = t.players.length;
    // Con tamaños exactos del plano, la capacidad física manda (no el min/máx)
    const sizeOk = hasExact
      ? n >= 1
      : n >= config.minPerTable &&
        (n <= config.maxPerTable ||
          (config.allowOversizedFallback && tables.length === 1));
    if (!sizeOk) return false;
    if (violatesAvoidPairs(t.players, pairs)) return false;
    if (!config.avoidRepeatEnabled) return true;
    return !violatesRepeatRule(
      t.players,
      previousTables,
      config.maxRepeatFromPrevious,
    );
  });
}

/** Capacidades de sillas del plano, o null si no hay plano en la config. */
export function roomSeatCapacities(configInput = {}) {
  const rawExact = configInput.exactSizes;
  const rawCaps = configInput.roomCapacities;
  if (Array.isArray(rawExact) && rawExact.length) {
    return rawExact.map(Number).filter((s) => s > 0);
  }
  if (Array.isArray(rawCaps) && rawCaps.length) {
    return rawCaps.map(Number).filter((s) => s > 0);
  }
  return null;
}

/**
 * Capacidad total de sillas si la config viene del plano (exactSizes / roomCapacities).
 * null = sin tope de plano (no aplica espera).
 */
export function roomConfiguredCapacity(configInput = {}) {
  const cfg = normalizeCommanderConfig(configInput);
  const caps = roomSeatCapacities(configInput);
  if (!caps?.length) return null;
  let sizes = caps;
  if (cfg.twoHeadedGiant) sizes = sizes.map(evenFloor).filter((s) => s >= 2);
  return sizes.reduce((a, b) => a + b, 0);
}

/**
 * Empaqueta jugadores en mesas de tamaño fijo (p. ej. Archenemy = 4).
 * Solo usa mesas del plano con capacidad ≥ size; el resto espera.
 */
export function packFixedSizeIntoRoom(
  players,
  seatCapacities,
  {
    tableSize = 4,
    previousWaiting = [],
  } = {},
) {
  const size = Math.max(1, Math.floor(Number(tableSize) || 4));
  const usableTables = (seatCapacities || [])
    .map(Number)
    .filter((c) => c >= size)
    .sort((a, b) => b - a);

  const { active: ordered } = pickUnitsForCapacity(
    players,
    players.length,
    previousWaiting,
    (name) => [String(name).toLocaleLowerCase("es")],
  );

  const remaining = [...ordered];
  const pods = [];
  for (let t = 0; t < usableTables.length; t++) {
    if (remaining.length < size) break;
    pods.push(remaining.splice(0, size));
  }

  return {
    pods,
    waiting: remaining,
    seatSizes: pods.map(() => size),
    playCount: pods.length * size,
  };
}

/** Elige un Archenemy al azar por mesa. */
export function assignArchenemies(tables) {
  return (tables || []).map((table) => {
    const players = table.players || [];
    if (players.length < 2) {
      return { ...table, archenemy: players[0] || null };
    }
    const shuffled = cryptoShuffle(players);
    return { ...table, archenemy: shuffled[0] };
  });
}

/**
 * Empaqueta parejas 2HG en mesas del plano.
 * Solo crea mesas jugables (mín. equipos = ceil(minPerTable/2), p. ej. 2).
 * Parejas que no caben en una mesa completa → espera (p. ej. 7ª pareja con mesas de 4).
 */
export function packTwoHeadedTeamsIntoRoom(
  teams,
  seatCapacities,
  {
    minPerTable = 4,
    maxPerTable = 4,
    previousWaiting = [],
  } = {},
) {
  const minTeams = Math.max(1, Math.ceil(Number(minPerTable) / 2));
  const maxTeams = Math.max(minTeams, Math.floor(Number(maxPerTable) / 2));
  const teamCaps = (seatCapacities || [])
    .map((c) => Math.floor(evenFloor(c) / 2))
    .map((t) => Math.min(t, maxTeams))
    .filter((t) => t >= minTeams)
    .sort((a, b) => b - a);

  const { active: ordered } = pickUnitsForCapacity(
    teams,
    teams.length,
    previousWaiting,
    (t) => [
      t.label.toLocaleLowerCase("es"),
      t.a.toLocaleLowerCase("es"),
      t.b.toLocaleLowerCase("es"),
    ],
  );

  const remaining = [...ordered];
  const pods = [];

  for (const cap of teamCaps) {
    if (remaining.length < minTeams) break;
    let take;
    if (remaining.length >= maxTeams) {
      take = Math.min(cap, maxTeams);
    } else {
      take = Math.min(cap, remaining.length);
      if (take < minTeams) break;
    }
    pods.push(remaining.splice(0, take));
  }

  return {
    pods,
    waiting: remaining,
    seatSizes: pods.map((p) => p.length * 2),
    playTeamCount: pods.reduce((s, p) => s + p.length, 0),
  };
}

/** Tamaños de mesa 2HG sin plano (permite última mesa corta de 2 si hace falta). */
function computeTwoHeadedAutoSizes(seatCount, min, max) {
  if (seatCount < 2 || seatCount % 2) return [];
  const teamN = seatCount / 2;
  const minT = Math.max(1, Math.ceil(min / 2));
  const maxT = Math.max(minT, Math.floor(max / 2));
  if (maxT < 1) return [];
  const sizes = [];
  let left = teamN;
  while (left >= maxT) {
    sizes.push(maxT * 2);
    left -= maxT;
  }
  if (left >= minT) {
    sizes.push(left * 2);
  } else if (left > 0) {
    sizes.push(left * 2);
  }
  return sizes;
}

/**
 * Elige quién juega y quién espera cuando hay más gente que sillas.
 * Prioriza a quienes esperaron en la ronda anterior.
 * @param {T[]} units
 * @param {number} slotCount
 * @param {string[]} previousWaiting
 * @param {(unit: T) => string[]} keyFn claves en minúsculas para cruzar con waiting
 * @returns {{ active: T[], waiting: T[] }}
 */
export function pickUnitsForCapacity(
  units,
  slotCount,
  previousWaiting = [],
  keyFn = (u) => [String(u).toLocaleLowerCase("es")],
) {
  const list = Array.isArray(units) ? [...units] : [];
  const slots = Math.max(0, Math.floor(Number(slotCount) || 0));
  if (slots <= 0) return { active: [], waiting: list };

  const waitKeys = new Set();
  for (const w of previousWaiting || []) {
    const s = String(w || "").trim();
    if (!s) continue;
    waitKeys.add(s.toLocaleLowerCase("es"));
    for (const part of splitTwoHeadedMembers(s)) {
      waitKeys.add(part.toLocaleLowerCase("es"));
    }
  }

  const priority = [];
  const rest = [];
  for (const unit of list) {
    const keys = (keyFn(unit) || []).map((k) =>
      String(k).toLocaleLowerCase("es"),
    );
    if (keys.some((k) => waitKeys.has(k))) priority.push(unit);
    else rest.push(unit);
  }

  // Siempre barajar (aunque quepan todos): si no, el empaquetado
  // deja siempre la misma cola en espera al regenerar.
  const ordered = [...cryptoShuffle(priority), ...cryptoShuffle(rest)];
  if (list.length <= slots) return { active: ordered, waiting: [] };
  return {
    active: ordered.slice(0, slots),
    waiting: ordered.slice(slots),
  };
}

function carve(shuffled, sizes, labelPrefix) {
  const tables = [];
  let offset = 0;
  sizes.forEach((size, i) => {
    tables.push({
      id: `mesa_${i + 1}`,
      label: `${labelPrefix} ${i + 1}`,
      players: shuffled.slice(offset, offset + size),
    });
    offset += size;
  });
  return tables;
}

/** Reparte equipos 2HG: cada equipo = 2 jugadores juntos en la misma mesa. */
function carveTeams(shuffledTeams, seatSizes, labelPrefix) {
  const teamCounts = seatSizes.map((s) => s / 2);
  const tables = [];
  let offset = 0;
  teamCounts.forEach((teamCount, i) => {
    const slice = shuffledTeams.slice(offset, offset + teamCount);
    offset += teamCount;
    const teamPairs = slice.map((t) => {
      // Orden aleatorio dentro de la pareja (quién sienta a la izquierda)
      const members = cryptoShuffle([t.a, t.b]);
      return members;
    });
    tables.push({
      id: `mesa_${i + 1}`,
      label: `${labelPrefix} ${i + 1}`,
      players: teamPairs.flat(),
      teams: teamPairs,
    });
  });
  return tables;
}

function buildAssignmentResult({
  tables,
  sizes,
  attempts,
  entropy,
  relaxed,
  playerCount,
  teamCount,
  waiting,
  cfg,
  pairs,
}) {
  return {
    tables,
    sizes,
    attempts,
    entropy,
    relaxed,
    playerCount,
    teamCount: teamCount ?? null,
    waiting: waiting ?? [],
    config: cfg,
    avoidPairs: pairs,
  };
}

/**
 * Genera mesas aleatorias respetando config, anti-repetición y parejas a evitar.
 * En modo 2 cabezas, cada entrada «A // B» es un equipo indivisible (2 sillas).
 * Si la config trae capacidad de plano y sobra gente, el exceso espera (bye).
 * @param {string[]} players
 * @param {string[][]} previousTables
 * @param {object} configInput
 * @param {{a:string,b:string}[]} [avoidPairs]
 * @param {string[]} [previousWaiting] quienes esperaron la ronda anterior (prioridad para jugar)
 */
export function assignCommanderTables(
  players,
  previousTables = [],
  configInput = {},
  avoidPairs = [],
  previousWaiting = [],
) {
  const cfg = normalizeCommanderConfig(configInput);
  const pairs = normalizeAvoidPairs(avoidPairs);
  const capacity = roomConfiguredCapacity(configInput);

  const unique = [];
  const seen = new Set();
  for (const raw of players) {
    const name = String(raw).trim();
    if (!name) continue;
    const key = name.toLocaleLowerCase("es");
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(name);
  }

  const entropyBuf = new Uint32Array(1);
  crypto.getRandomValues(entropyBuf);
  const entropy = entropyBuf[0];

  // ——— Two-Headed Giant ———
  if (cfg.twoHeadedGiant) {
    const allTeams = parseTwoHeadedTeams(unique);
    const seatCaps = roomSeatCapacities(configInput);

    let activeTeams = allTeams;
    let waitingLabels = [];
    let sizes;

    // Con plano: solo mesas jugables (≥ 2 equipos si min=4). Sobrantes → espera.
    if (seatCaps?.length) {
      const packed = packTwoHeadedTeamsIntoRoom(allTeams, seatCaps, {
        minPerTable: cfg.minPerTable,
        maxPerTable: cfg.maxPerTable,
        previousWaiting,
      });
      if (!packed.pods.length) {
        throw new Error(
          "El plano no permite ninguna mesa 2 cabezas jugable (hace falta al menos una mesa con 4 sillas / 2 equipos).",
        );
      }
      activeTeams = packed.pods.flat();
      waitingLabels = packed.waiting.map((t) => t.label);
      sizes = packed.seatSizes;
    } else {
      const seatCount = allTeams.length * 2;
      sizes = computeTableSizes(seatCount, configInput);
      if (!sizes.length || sizes.reduce((a, b) => a + b, 0) !== seatCount) {
        throw new Error(
          `No se pueden repartir ${allTeams.length} parejas (${seatCount} jugadores) con mesas de ${cfg.minPerTable}–${cfg.maxPerTable} plazas` +
            (cfg.tableCountMode === "fixed"
              ? ` y ${cfg.fixedTableCount} mesas.`
              : "."),
        );
      }
      activeTeams = allTeams;
    }

    const seatCount = activeTeams.length * 2;
    if (seatCount < 2) {
      throw new Error("No hay parejas suficientes para generar mesas.");
    }

    if (pairs.length && sizes.length < 2) {
      throw new Error(
        "Hay restricciones a evitar pero solo hay una mesa: no se pueden separar.",
      );
    }

    const needsConstraintSearch =
      pairs.length > 0 ||
      (cfg.avoidRepeatEnabled && previousTables?.length > 0);

    const tryOnce = () => {
      const shuffled = cryptoShuffle(activeTeams);
      return carveTeams(shuffled, sizes, cfg.tableLabelPrefix);
    };

    const finish = (tables, attempts, relaxed) =>
      buildAssignmentResult({
        tables,
        sizes,
        attempts,
        entropy,
        relaxed,
        playerCount: seatCount,
        teamCount: activeTeams.length,
        waiting: waitingLabels,
        cfg,
        pairs,
      });

    if (!needsConstraintSearch) {
      return finish(tryOnce(), 1, false);
    }

    for (let attempts = 0; attempts < cfg.maxAttempts; attempts++) {
      const tables = tryOnce();
      if (tablesAreValid(tables, previousTables, configInput, pairs)) {
        return finish(tables, attempts + 1, false);
      }
    }

    if (pairs.length) {
      for (let i = 0; i < cfg.maxAttempts; i++) {
        const tables = tryOnce();
        const pairsOk = tables.every(
          (t) => !violatesAvoidPairs(t.players, pairs),
        );
        if (pairsOk) {
          return finish(tables, cfg.maxAttempts + i + 1, true);
        }
      }
      throw new Error(
        "No se pudo respetar todas las restricciones a evitar con este número de mesas.",
      );
    }

    return finish(tryOnce(), cfg.maxAttempts, true);
  }

  // ——— Commander normal / Archenemy ———
  let active = unique;
  let waitingNames = [];
  let sizes;
  const seatCaps = roomSeatCapacities(configInput);

  if (cfg.archenemy) {
    if (seatCaps?.length) {
      const packed = packFixedSizeIntoRoom(unique, seatCaps, {
        tableSize: 4,
        previousWaiting,
      });
      if (!packed.pods.length) {
        throw new Error(
          "Archenemy necesita mesas de 4 sillas en el plano. Añade sillas o cambia el diseño.",
        );
      }
      active = packed.pods.flat();
      waitingNames = packed.waiting;
      sizes = packed.seatSizes;
    } else {
      if (unique.length < 4) {
        throw new Error(
          `Archenemy requiere al menos 4 jugadores (hay ${unique.length}).`,
        );
      }
      if (unique.length % 4 !== 0) {
        throw new Error(
          `Archenemy solo usa mesas de 4. Hay ${unique.length} jugadores (sobran ${unique.length % 4}). Activa el plano de sala para dejar en espera a quienes no entren, o ajusta la lista.`,
        );
      }
      sizes = Array(unique.length / 4).fill(4);
      active = unique;
    }
  } else {
    if (capacity != null && unique.length > capacity) {
      if (capacity < 1) {
        throw new Error("El plano no tiene sillas para sentar jugadores.");
      }
      const picked = pickUnitsForCapacity(
        unique,
        capacity,
        previousWaiting,
        (name) => [String(name).toLocaleLowerCase("es")],
      );
      active = picked.active;
      waitingNames = picked.waiting;
    }

    if (
      active.length < cfg.minPerTable &&
      !configInput.exactSizes?.length
    ) {
      throw new Error(
        `Hacen falta al menos ${cfg.minPerTable} jugadores (hay ${active.length}` +
          (waitingNames.length
            ? `; ${waitingNames.length} en espera por falta de sillas`
            : "") +
          ").",
      );
    }
    if (active.length < 1) {
      throw new Error("No hay jugadores suficientes para generar mesas.");
    }

    sizes = computeTableSizes(active.length, configInput);
    if (!sizes.length || sizes.reduce((a, b) => a + b, 0) !== active.length) {
      throw new Error(
        `No se pueden repartir ${active.length} jugadores con min ${cfg.minPerTable}, máx ${cfg.maxPerTable}` +
          (cfg.tableCountMode === "fixed"
            ? ` y ${cfg.fixedTableCount} mesas.`
            : "."),
      );
    }
  }

  // Con una sola mesa es imposible separar parejas.
  if (pairs.length && sizes.length < 2) {
    throw new Error(
      "Hay parejas a evitar pero solo hay una mesa: no se pueden separar.",
    );
  }

  const needsConstraintSearch =
    pairs.length > 0 ||
    (cfg.avoidRepeatEnabled && previousTables?.length > 0);

  const finish = (tables, attempts, relaxed) => {
    const withArch = cfg.archenemy ? assignArchenemies(tables) : tables;
    return buildAssignmentResult({
      tables: withArch,
      sizes,
      attempts,
      entropy,
      relaxed,
      playerCount: active.length,
      waiting: waitingNames,
      cfg,
      pairs,
    });
  };

  if (!needsConstraintSearch) {
    const shuffled = cryptoShuffle(active);
    return finish(carve(shuffled, sizes, cfg.tableLabelPrefix), 1, false);
  }

  let attempts = 0;
  for (; attempts < cfg.maxAttempts; attempts++) {
    const shuffled = cryptoShuffle(active);
    const tables = carve(shuffled, sizes, cfg.tableLabelPrefix);
    if (tablesAreValid(tables, previousTables, configInput, pairs)) {
      return finish(tables, attempts + 1, false);
    }
  }

  // Relajado: prioriza cumplir parejas a evitar sobre anti-repetición.
  if (pairs.length) {
    for (let i = 0; i < cfg.maxAttempts; i++) {
      const shuffled = cryptoShuffle(active);
      const tables = carve(shuffled, sizes, cfg.tableLabelPrefix);
      const pairsOk = tables.every((t) => !violatesAvoidPairs(t.players, pairs));
      if (pairsOk) {
        return finish(tables, cfg.maxAttempts + i + 1, true);
      }
    }
    throw new Error(
      "No se pudo separar todas las parejas a evitar con este número de mesas. Revisa las restricciones o el plano.",
    );
  }

  const shuffled = cryptoShuffle(active);
  return finish(
    carve(shuffled, sizes, cfg.tableLabelPrefix),
    cfg.maxAttempts,
    true,
  );
}

/** Resume tamaños para UI: "1×4 + 2×3" */
export function formatSizes(sizes) {
  const counts = {};
  for (const s of sizes) counts[s] = (counts[s] || 0) + 1;
  return Object.entries(counts)
    .sort((a, b) => Number(b[0]) - Number(a[0]))
    .map(([size, n]) => `${n}×${size}`)
    .join(" + ");
}
