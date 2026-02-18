/**
 * Sigil Classes, Stats & Rarity
 *
 * Six base classes with DFK-style 8-stat system.
 * Each class has base stats and primary/secondary growth rates
 * that determine how stats increase on level up.
 */

import type {
  SigilClass,
  SigilStats,
  StatGrowthRates,
  Rarity,
  Profession,
  ClassDefinition,
  RarityDefinition,
} from "../types.js";

// ─── Class Definitions ─────────────────────────────────────────

export const CLASS_DEFINITIONS: Record<SigilClass, ClassDefinition> = {
  ember: {
    name: "Ember",
    role: "Warrior",
    description: "Aggressive fighters who excel in direct competition and mining.",
    primaryStats: ["str", "end"],
    profession: "mining",
    baseStats: {
      str: 12, dex: 7, agi: 8, vit: 9,
      end: 11, int: 5, wis: 4, lck: 6,
    },
    primaryGrowth: {
      str: 0.75, dex: 0.20, agi: 0.30, vit: 0.35,
      end: 0.70, int: 0.10, wis: 0.10, lck: 0.20,
    },
    secondaryGrowth: {
      str: 0.30, dex: 0.10, agi: 0.15, vit: 0.20,
      end: 0.30, int: 0.05, wis: 0.05, lck: 0.10,
    },
  },
  thorn: {
    name: "Thorn",
    role: "Cultivator",
    description: "Patient cultivators who excel at gardening and resource management.",
    primaryStats: ["vit", "wis"],
    profession: "gardening",
    baseStats: {
      str: 5, dex: 6, agi: 5, vit: 12,
      end: 9, int: 8, wis: 11, lck: 6,
    },
    primaryGrowth: {
      str: 0.10, dex: 0.15, agi: 0.10, vit: 0.75,
      end: 0.35, int: 0.30, wis: 0.70, lck: 0.20,
    },
    secondaryGrowth: {
      str: 0.05, dex: 0.10, agi: 0.05, vit: 0.30,
      end: 0.20, int: 0.15, wis: 0.30, lck: 0.10,
    },
  },
  veil: {
    name: "Veil",
    role: "Oracle",
    description: "Analytical oracles who excel at foraging and information gathering.",
    primaryStats: ["int", "wis"],
    profession: "foraging",
    baseStats: {
      str: 4, dex: 7, agi: 6, vit: 7,
      end: 5, int: 13, wis: 12, lck: 8,
    },
    primaryGrowth: {
      str: 0.05, dex: 0.20, agi: 0.15, vit: 0.20,
      end: 0.10, int: 0.80, wis: 0.70, lck: 0.30,
    },
    secondaryGrowth: {
      str: 0.05, dex: 0.10, agi: 0.10, vit: 0.10,
      end: 0.05, int: 0.35, wis: 0.30, lck: 0.15,
    },
  },
  tidecaller: {
    name: "Tidecaller",
    role: "Merchant",
    description: "Opportunistic merchants who excel at fishing and deal-making.",
    primaryStats: ["agi", "lck"],
    profession: "fishing",
    baseStats: {
      str: 6, dex: 8, agi: 11, vit: 7,
      end: 6, int: 8, wis: 7, lck: 12,
    },
    primaryGrowth: {
      str: 0.15, dex: 0.30, agi: 0.70, vit: 0.20,
      end: 0.15, int: 0.25, wis: 0.20, lck: 0.75,
    },
    secondaryGrowth: {
      str: 0.10, dex: 0.15, agi: 0.30, vit: 0.10,
      end: 0.10, int: 0.15, wis: 0.10, lck: 0.30,
    },
  },
  sparkwright: {
    name: "Sparkwright",
    role: "Builder",
    description: "Creative builders who excel at mining and tool creation.",
    primaryStats: ["int", "dex"],
    profession: "mining",
    baseStats: {
      str: 7, dex: 11, agi: 6, vit: 6,
      end: 7, int: 13, wis: 7, lck: 8,
    },
    primaryGrowth: {
      str: 0.20, dex: 0.70, agi: 0.15, vit: 0.15,
      end: 0.20, int: 0.75, wis: 0.20, lck: 0.30,
    },
    secondaryGrowth: {
      str: 0.10, dex: 0.30, agi: 0.10, vit: 0.10,
      end: 0.10, int: 0.35, wis: 0.10, lck: 0.15,
    },
  },
  hollow: {
    name: "Hollow",
    role: "Phantom",
    description: "Unpredictable phantoms who excel at fishing and high-risk strategies.",
    primaryStats: ["agi", "str"],
    profession: "fishing",
    baseStats: {
      str: 10, dex: 8, agi: 12, vit: 4,
      end: 5, int: 9, wis: 6, lck: 11,
    },
    primaryGrowth: {
      str: 0.65, dex: 0.25, agi: 0.75, vit: 0.05,
      end: 0.10, int: 0.30, wis: 0.15, lck: 0.45,
    },
    secondaryGrowth: {
      str: 0.25, dex: 0.15, agi: 0.30, vit: 0.05,
      end: 0.05, int: 0.15, wis: 0.10, lck: 0.20,
    },
  },
};

// ─── Rarity ────────────────────────────────────────────────────

export const RARITY_DEFINITIONS: Record<Rarity, RarityDefinition> = {
  common: {
    name: "Common",
    chance: 0.75,
    statBonuses: [],
  },
  uncommon: {
    name: "Uncommon",
    chance: 0.20,
    statBonuses: [
      { count: 2, amount: 1 },
    ],
  },
  rare: {
    name: "Rare",
    chance: 0.04,
    statBonuses: [
      { count: 3, amount: 1 },
      { count: 1, amount: 1, random: true },
    ],
  },
  legendary: {
    name: "Legendary",
    chance: 0.009,
    statBonuses: [
      { count: 3, amount: 1 },
      { count: 2, amount: 1 },
      { count: 1, amount: 2 },
    ],
  },
  mythic: {
    name: "Mythic",
    chance: 0.001,
    statBonuses: [
      { count: 3, amount: 2 },
      { count: 3, amount: 1 },
      { count: 1, amount: 1 },
    ],
  },
};

// ─── Stat Helpers ──────────────────────────────────────────────

const STAT_KEYS: (keyof SigilStats)[] = [
  "str", "dex", "agi", "vit", "end", "int", "wis", "lck",
];

/**
 * Roll a rarity for a newly summoned Sigil.
 */
export function rollRarity(): Rarity {
  const roll = Math.random();
  let cumulative = 0;
  for (const [rarity, def] of Object.entries(RARITY_DEFINITIONS)) {
    cumulative += def.chance;
    if (roll < cumulative) return rarity as Rarity;
  }
  return "common";
}

/**
 * Generate base stats for a Gen0 Sigil of a given class.
 * Adds small random variance (+/- 2 per stat) to base stats.
 */
export function generateBaseStats(sigilClass: SigilClass): SigilStats {
  const base = CLASS_DEFINITIONS[sigilClass].baseStats;
  const stats = { ...base };

  for (const key of STAT_KEYS) {
    const variance = Math.floor(Math.random() * 5) - 2; // -2 to +2
    stats[key] = Math.max(1, stats[key] + variance);
  }

  return stats;
}

/**
 * Apply rarity bonuses to stats. Used at summon and every 5 levels.
 */
export function applyRarityBonuses(stats: SigilStats, rarity: Rarity): SigilStats {
  const result = { ...stats };
  const def = RARITY_DEFINITIONS[rarity];

  for (const bonus of def.statBonuses) {
    const available = [...STAT_KEYS];
    for (let i = 0; i < bonus.count; i++) {
      if (available.length === 0) break;
      const idx = bonus.random
        ? Math.floor(Math.random() * available.length)
        : Math.floor(Math.random() * available.length);
      const stat = available.splice(idx, 1)[0];
      result[stat] += bonus.amount;
    }
  }

  return result;
}

/**
 * Roll stat growth on level up.
 * For each stat, rolls twice: once against primary growth, once against secondary.
 * Each successful roll adds +1.
 */
export function rollStatGrowth(
  currentStats: SigilStats,
  primaryGrowth: StatGrowthRates,
  secondaryGrowth: StatGrowthRates,
): SigilStats {
  const result = { ...currentStats };

  for (const key of STAT_KEYS) {
    // Primary growth roll
    if (Math.random() < primaryGrowth[key]) {
      result[key] += 1;
    }
    // Secondary growth roll
    if (Math.random() < secondaryGrowth[key]) {
      result[key] += 1;
    }
  }

  return result;
}

/**
 * Calculate max HP from stats. VIT is primary driver.
 */
export function calculateMaxHp(stats: SigilStats, level: number): number {
  return 50 + (stats.vit * 5) + (level * 10);
}

/**
 * Calculate max MP from stats. INT + WIS drive MP growth.
 */
export function calculateMaxMp(stats: SigilStats, level: number): number {
  return 25 + (stats.int * 3) + (stats.wis * 2) + (level * 5);
}

/**
 * Calculate max stamina. Base 25, +1 every even level, max 50.
 */
export function calculateMaxStamina(level: number): number {
  const bonus = Math.floor(level / 2);
  return Math.min(25 + bonus, 50);
}

/**
 * XP required to reach the next level. Exponential curve.
 */
export function xpForLevel(level: number): number {
  if (level <= 0) return 0;
  // DFK-style: each level requires more XP
  return Math.floor(100 * Math.pow(1.1, level - 1));
}

/**
 * Get the profession bonus for a class.
 */
export function getClassProfession(sigilClass: SigilClass): Profession {
  return CLASS_DEFINITIONS[sigilClass].profession;
}

/**
 * Get the primary stat names for quest reward calculations.
 */
export function getQuestStats(profession: Profession): [keyof SigilStats, keyof SigilStats] {
  switch (profession) {
    case "mining": return ["str", "end"];
    case "fishing": return ["agi", "lck"];
    case "foraging": return ["dex", "int"];
    case "gardening": return ["wis", "vit"];
  }
}

/**
 * Get a human-readable stat summary.
 */
export function formatStats(stats: SigilStats): string {
  return `STR:${stats.str} DEX:${stats.dex} AGI:${stats.agi} VIT:${stats.vit} END:${stats.end} INT:${stats.int} WIS:${stats.wis} LCK:${stats.lck}`;
}
