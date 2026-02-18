/**
 * Leveling System
 *
 * DFK-style level progression with stat growth rolls.
 * Each level up rolls primary (class) and secondary (subclass) stat growth.
 * Rarity bonuses apply every 5 levels.
 */

import type {
  SigilProfile,
  SigilStats,
  StatName,
} from "../types.js";
import {
  CLASS_DEFINITIONS,
  rollStatGrowth,
  applyRarityBonuses,
  calculateMaxHp,
  calculateMaxMp,
  calculateMaxStamina,
  xpForLevel,
} from "./classes.js";

// ─── Level Up ──────────────────────────────────────────────────

export const MAX_LEVEL = 100;

export interface LevelUpResult {
  newLevel: number;
  oldStats: SigilStats;
  newStats: SigilStats;
  statChanges: Partial<Record<StatName, number>>;
  rarityBonusApplied: boolean;
  newMaxHp: number;
  newMaxMp: number;
  newMaxStamina: number;
}

/**
 * Check if a Sigil has enough XP to level up.
 */
export function canLevelUp(sigil: SigilProfile): { ok: boolean; reason?: string } {
  if (sigil.level >= MAX_LEVEL) {
    return { ok: false, reason: `Already at max level (${MAX_LEVEL})` };
  }
  if (sigil.xp < sigil.xpToNextLevel) {
    return { ok: false, reason: `Need ${sigil.xpToNextLevel - sigil.xp} more XP (${sigil.xp}/${sigil.xpToNextLevel})` };
  }
  return { ok: true };
}

/**
 * Execute a level up on a Sigil.
 * Rolls stat growth based on class (primary) and subclass (secondary).
 * Optionally applies a player-chosen +1 stat bonus.
 */
export function levelUp(
  sigil: SigilProfile,
  chosenStatBonus?: StatName,
): LevelUpResult {
  const oldStats = { ...sigil.stats };
  const classDef = CLASS_DEFINITIONS[sigil.class];
  const subclassDef = CLASS_DEFINITIONS[sigil.subclass];

  // Roll stat growth
  let newStats = rollStatGrowth(
    sigil.stats,
    classDef.primaryGrowth,
    subclassDef.secondaryGrowth,
  );

  // Player-chosen +1 stat
  if (chosenStatBonus) {
    newStats[chosenStatBonus] += 1;
  }

  // 50% chance for +1 to two random stats (Gaia's blessing equivalent)
  if (Math.random() < 0.5) {
    const statKeys: StatName[] = ["str", "dex", "agi", "vit", "end", "int", "wis", "lck"];
    const s1 = statKeys[Math.floor(Math.random() * statKeys.length)];
    let s2 = statKeys[Math.floor(Math.random() * statKeys.length)];
    while (s2 === s1) {
      s2 = statKeys[Math.floor(Math.random() * statKeys.length)];
    }
    newStats[s1] += 1;
    newStats[s2] += 1;
  }

  // Rarity bonus every 5 levels
  const newLevel = sigil.level + 1;
  const rarityBonusApplied = newLevel % 5 === 0 && sigil.rarity !== "common";
  if (rarityBonusApplied) {
    newStats = applyRarityBonuses(newStats, sigil.rarity);
  }

  // Calculate stat changes
  const statChanges: Partial<Record<StatName, number>> = {};
  for (const key of Object.keys(oldStats) as StatName[]) {
    const diff = newStats[key] - oldStats[key];
    if (diff !== 0) statChanges[key] = diff;
  }

  // Update derived stats
  const newMaxHp = calculateMaxHp(newStats, newLevel);
  const newMaxMp = calculateMaxMp(newStats, newLevel);
  const newMaxStamina = calculateMaxStamina(newLevel);

  // Apply to profile
  sigil.level = newLevel;
  sigil.xp -= sigil.xpToNextLevel;
  sigil.xpToNextLevel = xpForLevel(newLevel);
  sigil.stats = newStats;
  sigil.maxHp = newMaxHp;
  sigil.hp = newMaxHp; // Full heal on level up
  sigil.maxMp = newMaxMp;
  sigil.mp = newMaxMp;
  sigil.maxStamina = newMaxStamina;
  // +1 stamina every even level
  if (newLevel % 2 === 0) {
    sigil.stamina = Math.min(sigil.stamina + 1, newMaxStamina);
  }

  return {
    newLevel,
    oldStats,
    newStats,
    statChanges,
    rarityBonusApplied,
    newMaxHp,
    newMaxMp,
    newMaxStamina,
  };
}

/**
 * Format level up result for display.
 */
export function formatLevelUp(result: LevelUpResult): string {
  const lines = [
    `Level Up! → Level ${result.newLevel}`,
    `Stat Changes:`,
  ];

  for (const [stat, change] of Object.entries(result.statChanges)) {
    lines.push(`  ${stat.toUpperCase()}: +${change}`);
  }

  if (result.rarityBonusApplied) {
    lines.push(`Rarity bonus applied!`);
  }

  lines.push(`HP: ${result.newMaxHp} | MP: ${result.newMaxMp} | Stamina: ${result.newMaxStamina}`);

  return lines.join("\n");
}

/**
 * Get total XP needed from level 1 to a target level.
 */
export function totalXpToLevel(targetLevel: number): number {
  let total = 0;
  for (let i = 1; i < targetLevel; i++) {
    total += xpForLevel(i);
  }
  return total;
}
