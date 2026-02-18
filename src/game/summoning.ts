/**
 * Summoning (Breeding) System
 *
 * Two parent Sigils combine to create offspring with inherited genes.
 * Costs increase per summon and per generation. 100% of fees burned.
 * Cooldowns increase with each summon.
 */

import type {
  SigilProfile,
  SigilClass,
  Rarity,
  SigilGenome,
  SummonRecord,
} from "../types.js";
import {
  CLASS_DEFINITIONS,
  generateBaseStats,
  applyRarityBonuses,
  rollRarity,
  calculateMaxHp,
  calculateMaxMp,
  calculateMaxStamina,
  xpForLevel,
} from "./classes.js";
import { inheritGenes, areTooRelated } from "./genetics.js";
import { ulid } from "ulid";

// ─── Summoning Constants ───────────────────────────────────────

const BASE_COST = 2000;          // $SIGIL
const COST_PER_SUMMON = 1000;    // additional per summon used
const COST_PER_GENERATION = 500; // additional per generation

// Cooldown in hours
const GEN0_BASE_COOLDOWN_HOURS = 4;
const GEN0_COOLDOWN_INCREMENT_HOURS = 4;

// Max summons
const GEN0_MAX_SUMMONS = 10;

// ─── Cost Calculation ──────────────────────────────────────────

/**
 * Calculate the $SIGIL cost for a summoning.
 * Uses the more expensive parent for cost calculation.
 */
export function calculateSummonCost(parent1: SigilProfile, parent2: SigilProfile): number {
  const cost1 = parentCost(parent1);
  const cost2 = parentCost(parent2);
  return Math.max(cost1, cost2);
}

function parentCost(parent: SigilProfile): number {
  const summonsUsed = parent.maxSummons - parent.summonsRemaining;
  return BASE_COST
    + (COST_PER_SUMMON * summonsUsed)
    + (COST_PER_GENERATION * parent.generation);
}

// ─── Cooldown ──────────────────────────────────────────────────

/**
 * Calculate cooldown duration in hours for a parent.
 */
export function cooldownHours(parent: SigilProfile): number {
  const summonsUsed = parent.maxSummons - parent.summonsRemaining;
  if (parent.generation === 0) {
    return GEN0_BASE_COOLDOWN_HOURS + (GEN0_COOLDOWN_INCREMENT_HOURS * summonsUsed);
  }
  return (24 + 8 * parent.generation) * (summonsUsed + 1);
}

/**
 * Get cooldown end time for a parent if they summon now.
 */
export function cooldownEndTime(parent: SigilProfile): string {
  const hours = cooldownHours(parent);
  const end = new Date(Date.now() + hours * 60 * 60 * 1000);
  return end.toISOString();
}

// ─── Eligibility ───────────────────────────────────────────────

export interface SummonEligibility {
  eligible: boolean;
  reason?: string;
  cost?: number;
  cooldownHoursP1?: number;
  cooldownHoursP2?: number;
}

/**
 * Check if two Sigils can be summoned together.
 */
export function checkSummonEligibility(
  parent1: SigilProfile,
  parent2: SigilProfile,
): SummonEligibility {
  // Same Sigil
  if (parent1.id === parent2.id) {
    return { eligible: false, reason: "Cannot summon with self" };
  }

  // Too closely related
  if (areTooRelated(parent1.parentIds, parent2.parentIds, parent1.id, parent2.id)) {
    return { eligible: false, reason: "Parents are too closely related (siblings or parent-child)" };
  }

  // Summon count
  if (parent1.summonsRemaining <= 0) {
    return { eligible: false, reason: `${parent1.name} has no summons remaining` };
  }
  if (parent2.summonsRemaining <= 0) {
    return { eligible: false, reason: `${parent2.name} has no summons remaining` };
  }

  // Cooldown
  if (parent1.summonCooldownEnd && new Date(parent1.summonCooldownEnd) > new Date()) {
    return { eligible: false, reason: `${parent1.name} is on cooldown until ${parent1.summonCooldownEnd}` };
  }
  if (parent2.summonCooldownEnd && new Date(parent2.summonCooldownEnd) > new Date()) {
    return { eligible: false, reason: `${parent2.name} is on cooldown until ${parent2.summonCooldownEnd}` };
  }

  const cost = calculateSummonCost(parent1, parent2);

  return {
    eligible: true,
    cost,
    cooldownHoursP1: cooldownHours(parent1),
    cooldownHoursP2: cooldownHours(parent2),
  };
}

// ─── Summoning Execution ───────────────────────────────────────

export interface SummonResult {
  offspring: SigilProfile;
  record: SummonRecord;
  cost: number;
}

/**
 * Execute a summoning between two parents.
 * Returns the new offspring profile and a record of the summon.
 * Does NOT modify parent profiles — caller must update summon counts and cooldowns.
 */
export function executeSummon(
  parent1: SigilProfile,
  parent2: SigilProfile,
  offspringName: string,
  owner: string,
): SummonResult {
  const cost = calculateSummonCost(parent1, parent2);
  const generation = Math.max(parent1.generation, parent2.generation) + 1;

  // Inherit genes
  const genes = inheritGenes(parent1.genes, parent2.genes);

  // Determine class and subclass from genes
  const sigilClass = genes.class.dominant;
  const subclass = genes.subclass.dominant;

  // Roll rarity (influenced by parent rarity)
  const rarity = rollOffspringRarity(parent1.rarity, parent2.rarity);

  // Generate base stats for the offspring's class
  let stats = generateBaseStats(sigilClass);

  // Apply stat boost gene (+2 to boosted stat)
  const boostedStat = genes.statBoost.dominant;
  stats[boostedStat] += 2;

  // Apply rarity bonus at summon
  if (rarity !== "common") {
    stats = applyRarityBonuses(stats, rarity);
  }

  // Calculate max summons for offspring
  const weakerParentSummons = Math.min(parent1.summonsRemaining, parent2.summonsRemaining);
  const maxSummons = Math.max(1, weakerParentSummons - 1);

  const offspringId = ulid();
  const offspring: SigilProfile = {
    id: offspringId,
    name: offspringName,
    class: sigilClass,
    subclass,
    rarity,
    generation,
    level: 1,
    xp: 0,
    xpToNextLevel: xpForLevel(1),
    stats,
    statGrowthPrimary: CLASS_DEFINITIONS[sigilClass].primaryGrowth,
    statGrowthSecondary: CLASS_DEFINITIONS[subclass].secondaryGrowth,
    genes,
    profession: genes.profession.dominant,
    professionSkillLevel: 0,
    stamina: 25,
    maxStamina: calculateMaxStamina(1),
    hp: calculateMaxHp(stats, 1),
    maxHp: calculateMaxHp(stats, 1),
    mp: calculateMaxMp(stats, 1),
    maxMp: calculateMaxMp(stats, 1),
    summonsRemaining: maxSummons,
    maxSummons,
    summonCooldownEnd: null,
    parentIds: [parent1.id, parent2.id],
    owner,
    createdAt: new Date().toISOString(),
  };

  const record: SummonRecord = {
    id: ulid(),
    parent1Id: parent1.id,
    parent2Id: parent2.id,
    offspringId,
    cost,
    generation,
    timestamp: new Date().toISOString(),
  };

  return { offspring, record, cost };
}

/**
 * Apply summon side effects to a parent (mutates in place).
 */
export function applySummonToParent(parent: SigilProfile): void {
  parent.summonsRemaining -= 1;
  parent.summonCooldownEnd = cooldownEndTime(parent);
}

// ─── Rarity Inheritance ────────────────────────────────────────

const RARITY_TIERS: Rarity[] = ["common", "uncommon", "rare", "legendary", "mythic"];

/**
 * Roll offspring rarity based on parent rarities.
 * Higher parent rarity slightly increases offspring rarity chance.
 */
function rollOffspringRarity(p1Rarity: Rarity, p2Rarity: Rarity): Rarity {
  const p1Tier = RARITY_TIERS.indexOf(p1Rarity);
  const p2Tier = RARITY_TIERS.indexOf(p2Rarity);
  const avgTier = (p1Tier + p2Tier) / 2;

  // Base rarity roll with parent bonus
  const roll = Math.random();
  const bonus = avgTier * 0.03; // +3% per average parent tier

  if (roll < 0.001 + bonus * 0.01) return "mythic";
  if (roll < 0.009 + bonus * 0.05) return "legendary";
  if (roll < 0.04 + bonus * 0.1) return "rare";
  if (roll < 0.20 + bonus * 0.15) return "uncommon";
  return "common";
}

/**
 * Format summoning preview for display.
 */
export function formatSummonPreview(
  parent1: SigilProfile,
  parent2: SigilProfile,
): string {
  const elig = checkSummonEligibility(parent1, parent2);

  if (!elig.eligible) {
    return `Cannot summon: ${elig.reason}`;
  }

  return [
    `Summoning Preview`,
    `Parent 1: ${parent1.name} (${parent1.class}, Gen${parent1.generation}, ${parent1.summonsRemaining} summons left)`,
    `Parent 2: ${parent2.name} (${parent2.class}, Gen${parent2.generation}, ${parent2.summonsRemaining} summons left)`,
    `Cost: ${elig.cost} $SIGIL (100% burned)`,
    `Offspring Generation: Gen${Math.max(parent1.generation, parent2.generation) + 1}`,
    `Cooldown: P1 ${elig.cooldownHoursP1}h, P2 ${elig.cooldownHoursP2}h`,
  ].join("\n");
}
