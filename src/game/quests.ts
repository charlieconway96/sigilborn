/**
 * Profession Quest System
 *
 * Four quest types: Mining, Fishing, Foraging, Gardening.
 * Each quest costs stamina and rewards $SIGIL + XP.
 * Rewards scale with stats, profession gene match, and skill level.
 */

import type {
  SigilProfile,
  Profession,
  QuestResult,
  QuestItemDrop,
  Rarity,
} from "../types.js";
import { getQuestStats } from "./classes.js";
import { hasProfessionBonus } from "./genetics.js";
import { ulid } from "ulid";

// ─── Quest Configuration ───────────────────────────────────────

const STAMINA_COST = 5;

const QUEST_BASE_REWARDS: Record<Profession, number> = {
  mining: 10,      // $SIGIL per quest
  fishing: 7,
  foraging: 7,
  gardening: 12,
};

const QUEST_BASE_XP: Record<Profession, number> = {
  mining: 15,
  fishing: 12,
  foraging: 12,
  gardening: 10,
};

const STAMINA_RECOVERY_MINUTES = 20; // 1 stamina per 20 minutes
const INN_COST_PER_STAMINA = 0.5;    // $SIGIL per stamina point
const PROFESSION_SKILL_CAP = 10.0;
const PROFESSION_SKILL_GAIN_CHANCE = 0.3;
const PROFESSION_SKILL_GAIN_AMOUNT = 0.1;

// ─── Item Drop Tables ──────────────────────────────────────────

interface DropTableEntry {
  name: string;
  rarity: Rarity;
  baseChance: number; // base drop chance per quest
  lckScaling: number; // additional chance per LCK point
}

const DROP_TABLES: Record<Profession, DropTableEntry[]> = {
  mining: [
    { name: "Iron Shard", rarity: "common", baseChance: 0.3, lckScaling: 0.005 },
    { name: "Gold Nugget", rarity: "uncommon", baseChance: 0.1, lckScaling: 0.005 },
    { name: "Crystal Core", rarity: "rare", baseChance: 0.02, lckScaling: 0.003 },
    { name: "Summoning Stone", rarity: "legendary", baseChance: 0.003, lckScaling: 0.001 },
  ],
  fishing: [
    { name: "Common Fish", rarity: "common", baseChance: 0.4, lckScaling: 0.005 },
    { name: "Rare Fish", rarity: "uncommon", baseChance: 0.12, lckScaling: 0.005 },
    { name: "Golden Koi", rarity: "rare", baseChance: 0.025, lckScaling: 0.003 },
    { name: "Abyssal Pearl", rarity: "legendary", baseChance: 0.004, lckScaling: 0.001 },
  ],
  foraging: [
    { name: "Herb Bundle", rarity: "common", baseChance: 0.35, lckScaling: 0.005 },
    { name: "Rare Mushroom", rarity: "uncommon", baseChance: 0.1, lckScaling: 0.005 },
    { name: "Ancient Root", rarity: "rare", baseChance: 0.02, lckScaling: 0.003 },
    { name: "Spirit Blossom", rarity: "legendary", baseChance: 0.003, lckScaling: 0.001 },
  ],
  gardening: [
    { name: "Seed Pouch", rarity: "common", baseChance: 0.3, lckScaling: 0.005 },
    { name: "Enchanted Bloom", rarity: "uncommon", baseChance: 0.1, lckScaling: 0.005 },
    { name: "Life Essence", rarity: "rare", baseChance: 0.02, lckScaling: 0.003 },
    { name: "Genesis Seed", rarity: "legendary", baseChance: 0.003, lckScaling: 0.001 },
  ],
};

// ─── Quest Execution ───────────────────────────────────────────

/**
 * Check if a Sigil can perform a quest.
 */
export function canQuest(sigil: SigilProfile): { ok: boolean; reason?: string } {
  if (sigil.stamina < STAMINA_COST) {
    return { ok: false, reason: `Insufficient stamina (${sigil.stamina}/${STAMINA_COST} needed)` };
  }
  if (sigil.hp <= 0) {
    return { ok: false, reason: "Sigil is exhausted (0 HP)" };
  }
  return { ok: true };
}

/**
 * Execute a profession quest and calculate rewards.
 */
export function executeQuest(
  sigil: SigilProfile,
  questType: Profession,
): QuestResult {
  const [primaryStat, secondaryStat] = getQuestStats(questType);
  const p = sigil.stats[primaryStat];
  const s = sigil.stats[secondaryStat];

  // Stat bonus: scales from 0.0 (both stats at 0) to ~1.0+ (both stats high)
  const statBonus = (p + s) / 200;

  // Profession gene match bonus
  const professionBonus = hasProfessionBonus(sigil.genes, questType) ? 1.2 : 1.0;

  // Skill level bonus
  const skillBonus = 1.0 + (sigil.professionSkillLevel * 0.1);

  // Calculate reward
  const baseReward = QUEST_BASE_REWARDS[questType];
  const reward = baseReward * (1 + statBonus) * professionBonus * skillBonus;

  // Calculate XP
  const baseXp = QUEST_BASE_XP[questType];
  const xpEarned = Math.floor(baseXp * (1 + statBonus * 0.5));

  // Skill increase chance
  let skillIncrease = 0;
  if (
    sigil.professionSkillLevel < PROFESSION_SKILL_CAP &&
    Math.random() < PROFESSION_SKILL_GAIN_CHANCE
  ) {
    skillIncrease = PROFESSION_SKILL_GAIN_AMOUNT;
  }

  // Item drops
  const itemDrops = rollDrops(questType, sigil.stats.lck);

  return {
    questId: ulid(),
    sigilId: sigil.id,
    questType,
    reward: Math.round(reward * 100) / 100,
    xpEarned,
    skillIncrease,
    itemDrops,
    staminaUsed: STAMINA_COST,
    completedAt: new Date().toISOString(),
  };
}

/**
 * Roll item drops from the drop table.
 */
function rollDrops(questType: Profession, lck: number): QuestItemDrop[] {
  const drops: QuestItemDrop[] = [];
  const table = DROP_TABLES[questType];

  for (const entry of table) {
    const chance = entry.baseChance + (lck * entry.lckScaling);
    if (Math.random() < chance) {
      drops.push({
        name: entry.name,
        quantity: 1,
        rarity: entry.rarity,
      });
    }
  }

  return drops;
}

/**
 * Apply quest results to a Sigil profile (mutates in place).
 * Returns the updated profile.
 */
export function applyQuestResults(sigil: SigilProfile, result: QuestResult): SigilProfile {
  sigil.stamina = Math.max(0, sigil.stamina - result.staminaUsed);
  sigil.xp += result.xpEarned;
  sigil.professionSkillLevel = Math.min(
    PROFESSION_SKILL_CAP,
    sigil.professionSkillLevel + result.skillIncrease,
  );
  return sigil;
}

// ─── Stamina Management ────────────────────────────────────────

/**
 * Calculate how much stamina has recovered since a given timestamp.
 */
export function calculateStaminaRecovery(
  lastCheckTime: string,
  currentStamina: number,
  maxStamina: number,
): number {
  const elapsed = Date.now() - new Date(lastCheckTime).getTime();
  const minutesElapsed = elapsed / (1000 * 60);
  const recovered = Math.floor(minutesElapsed / STAMINA_RECOVERY_MINUTES);
  return Math.min(currentStamina + recovered, maxStamina);
}

/**
 * Calculate inn rest cost to recover a given amount of stamina.
 */
export function innCost(staminaToRecover: number): number {
  return staminaToRecover * INN_COST_PER_STAMINA;
}

/**
 * Get the best quest type for a Sigil based on stats and gene match.
 */
export function recommendQuest(sigil: SigilProfile): Profession {
  let bestQuest: Profession = sigil.profession;
  let bestScore = 0;

  for (const quest of ["mining", "fishing", "foraging", "gardening"] as Profession[]) {
    const [p, s] = getQuestStats(quest);
    const statScore = sigil.stats[p] + sigil.stats[s];
    const geneBonus = hasProfessionBonus(sigil.genes, quest) ? 20 : 0;
    const score = statScore + geneBonus;
    if (score > bestScore) {
      bestScore = score;
      bestQuest = quest;
    }
  }

  return bestQuest;
}

/**
 * Format quest result for display.
 */
export function formatQuestResult(result: QuestResult): string {
  const lines = [
    `Quest: ${result.questType.charAt(0).toUpperCase() + result.questType.slice(1)}`,
    `Reward: ${result.reward.toFixed(2)} $SIGIL`,
    `XP: +${result.xpEarned}`,
    `Stamina: -${result.staminaUsed}`,
  ];

  if (result.skillIncrease > 0) {
    lines.push(`Skill: +${result.skillIncrease.toFixed(1)}`);
  }

  if (result.itemDrops.length > 0) {
    lines.push(`Drops: ${result.itemDrops.map((d) => `${d.name} (${d.rarity})`).join(", ")}`);
  }

  return lines.join("\n");
}
