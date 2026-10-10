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
 * Calcula tamaños de mesa según config.
 */
export function computeTableSizes(n, configInput = {}) {
  const cfg = normalizeCommanderConfig(configInput);
  const { minPerTable: min, maxPerTable: max } = cfg;

  if (n < min) return [];

  if (cfg.tableCountMode === "fixed") {
    const sizes = sizesFromTableCount(n, cfg.fixedTableCount, min, max);
    if (sizes.length) return sizes;
    if (cfg.allowOversizedFallback && cfg.fixedTableCount === 1 && n >= min) {
      return [n];
    }
    return [];
  }

  // auto: nº de mesas viable
  const tMin = Math.ceil(n / max);
  const tMax = Math.floor(n / min);

  if (tMin > tMax) {
    if (cfg.allowOversizedFallback && n >= min) return [n];
    return [];
  }

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

export function tablesAreValid(tables, previousTables, cfg) {
  const config = normalizeCommanderConfig(cfg);
  return tables.every((t) => {
    const n = t.players.length;
    const sizeOk =
      n >= config.minPerTable &&
      (n <= config.maxPerTable ||
        (config.allowOversizedFallback && tables.length === 1));
    if (!sizeOk) return false;
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
 * Genera mesas aleatorias respetando config y anti-repetición.
 */
export function assignCommanderTables(
  players,
  previousTables = [],
  configInput = {},
) {
  const cfg = normalizeCommanderConfig(configInput);

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

  const entropyBuf = new Uint32Array(1);
  crypto.getRandomValues(entropyBuf);
  const entropy = entropyBuf[0];

  const needsRepeatCheck =
    cfg.avoidRepeatEnabled && previousTables?.length > 0;

  if (!needsRepeatCheck) {
    const shuffled = cryptoShuffle(unique);
    return {
      tables: carve(shuffled, sizes, cfg.tableLabelPrefix),
      sizes,
      attempts: 1,
      entropy,
      relaxed: false,
      playerCount: unique.length,
      config: cfg,
    };
  }

  let attempts = 0;
  for (; attempts < cfg.maxAttempts; attempts++) {
    const shuffled = cryptoShuffle(unique);
    const tables = carve(shuffled, sizes, cfg.tableLabelPrefix);
    if (tablesAreValid(tables, previousTables, cfg)) {
      return {
        tables,
        sizes,
        attempts: attempts + 1,
        entropy,
        relaxed: false,
        playerCount: unique.length,
        config: cfg,
      };
    }
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
