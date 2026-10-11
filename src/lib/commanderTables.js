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
};

export function normalizeCommanderConfig(partial = {}) {
  const c = { ...COMMANDER_CONFIG_DEFAULTS, ...partial };
  let min = Math.max(2, Math.min(6, Number(c.minPerTable) || 3));
  let max = Math.max(2, Math.min(8, Number(c.maxPerTable) || 4));
  if (min > max) [min, max] = [max, min];
  return {
    ...c,
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

  if (n < min && !Array.isArray(cfg.exactSizes)) return [];

  /** Tamaños forzados (p. ej. sillas por mesa del plano de sala). */
  if (Array.isArray(cfg.exactSizes) && cfg.exactSizes.length) {
    const sizes = cfg.exactSizes.map((s) => Number(s)).filter((s) => s > 0);
    const sum = sizes.reduce((a, b) => a + b, 0);
    if (sum === n) return sizes;
    return [];
  }

  /** Capacidades del plano (sillas por mesa), no necesariamente llenas. */
  if (Array.isArray(cfg.roomCapacities) && cfg.roomCapacities.length) {
    return computeSizesForRoomCapacities(n, cfg.roomCapacities, {
      minPerTable: min,
      softMax: Math.max(max, 4),
    });
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
    if (cfg.allowOversizedFallback && n >= min) return [n];
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
  return tables.every((t) => {
    const n = t.players.length;
    const sizeOk =
      n >= config.minPerTable &&
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

/**
 * Genera mesas aleatorias respetando config, anti-repetición y parejas a evitar.
 * @param {string[]} players
 * @param {string[][]} previousTables
 * @param {object} configInput
 * @param {{a:string,b:string}[]} [avoidPairs]
 */
export function assignCommanderTables(
  players,
  previousTables = [],
  configInput = {},
  avoidPairs = [],
) {
  const cfg = normalizeCommanderConfig(configInput);
  const pairs = normalizeAvoidPairs(avoidPairs);

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

  if (unique.length < cfg.minPerTable) {
    throw new Error(
      `Hacen falta al menos ${cfg.minPerTable} jugadores (hay ${unique.length}).`,
    );
  }

  const sizes = computeTableSizes(unique.length, cfg);
  if (!sizes.length || sizes.reduce((a, b) => a + b, 0) !== unique.length) {
    throw new Error(
      `No se pueden repartir ${unique.length} jugadores con min ${cfg.minPerTable}, máx ${cfg.maxPerTable}` +
        (cfg.tableCountMode === "fixed"
          ? ` y ${cfg.fixedTableCount} mesas.`
          : "."),
    );
  }

  // Con una sola mesa es imposible separar parejas.
  if (pairs.length && sizes.length < 2) {
    throw new Error(
      "Hay parejas a evitar pero solo hay una mesa: no se pueden separar.",
    );
  }

  const entropyBuf = new Uint32Array(1);
  crypto.getRandomValues(entropyBuf);
  const entropy = entropyBuf[0];

  const needsConstraintSearch =
    pairs.length > 0 ||
    (cfg.avoidRepeatEnabled && previousTables?.length > 0);

  if (!needsConstraintSearch) {
    const shuffled = cryptoShuffle(unique);
    return {
      tables: carve(shuffled, sizes, cfg.tableLabelPrefix),
      sizes,
      attempts: 1,
      entropy,
      relaxed: false,
      playerCount: unique.length,
      config: cfg,
      avoidPairs: pairs,
    };
  }

  let attempts = 0;
  for (; attempts < cfg.maxAttempts; attempts++) {
    const shuffled = cryptoShuffle(unique);
    const tables = carve(shuffled, sizes, cfg.tableLabelPrefix);
    if (tablesAreValid(tables, previousTables, cfg, pairs)) {
      return {
        tables,
        sizes,
        attempts: attempts + 1,
        entropy,
        relaxed: false,
        playerCount: unique.length,
        config: cfg,
        avoidPairs: pairs,
      };
    }
  }

  // Relajado: prioriza cumplir parejas a evitar sobre anti-repetición.
  if (pairs.length) {
    for (let i = 0; i < cfg.maxAttempts; i++) {
      const shuffled = cryptoShuffle(unique);
      const tables = carve(shuffled, sizes, cfg.tableLabelPrefix);
      const pairsOk = tables.every((t) => !violatesAvoidPairs(t.players, pairs));
      if (pairsOk) {
        return {
          tables,
          sizes,
          attempts: cfg.maxAttempts + i + 1,
          entropy,
          relaxed: true,
          playerCount: unique.length,
          config: cfg,
          avoidPairs: pairs,
        };
      }
    }
    throw new Error(
      "No se pudo separar todas las parejas a evitar con este número de mesas. Revisa las restricciones o el plano.",
    );
  }

  const shuffled = cryptoShuffle(unique);
  return {
    tables: carve(shuffled, sizes, cfg.tableLabelPrefix),
    sizes,
    attempts: cfg.maxAttempts,
    entropy,
    relaxed: true,
    playerCount: unique.length,
    config: cfg,
    avoidPairs: pairs,
  };
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
