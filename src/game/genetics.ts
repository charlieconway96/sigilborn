/**
 * Sigil Genetics
 *
 * Each Sigil has 6 gene slots. Each slot contains 3 layers:
 * Dominant (D), Recessive (R1), Hidden (R2).
 * During summoning, genes are inherited from parents with
 * mutation chance producing novel traits.
 */

import type {
  SigilClass,
  Profession,
  GeneSlot,
  GeneLayers,
  SigilGenome,
  StatName,
} from "../types.js";

// ─── Gene Value Pools ──────────────────────────────────────────

const CLASSES: SigilClass[] = [
  "ember", "thorn", "veil", "tidecaller", "sparkwright", "hollow",
];

const PROFESSIONS: Profession[] = [
  "mining", "fishing", "foraging", "gardening",
];

const ACTIVE_ABILITIES = [
  "power_strike",    // Bonus mining yield on crit
  "keen_eye",        // Bonus rare drops
  "swift_hands",     // Reduced quest time
  "iron_will",       // Resist stamina drain
  "deep_focus",      // Bonus XP gain
  "lucky_find",      // Double loot chance
  "second_wind",     // Stamina recovery burst
  "elemental_surge", // Random stat boost per quest
] as const;

const PASSIVE_ABILITIES = [
  "sturdy",          // +5% HP
  "nimble",          // +5% evasion (future PvP)
  "scholar",         // +10% XP from quests
  "harvester",       // +10% quest rewards
  "enduring",        // +2 max stamina
  "fortunate",       // +1 LCK effective
  "resilient",       // Slower tier degradation
  "prodigy",         // +5% stat growth rates
] as const;

const STAT_NAMES: StatName[] = [
  "str", "dex", "agi", "vit", "end", "int", "wis", "lck",
];

export type ActiveAbility = typeof ACTIVE_ABILITIES[number];
export type PassiveAbility = typeof PASSIVE_ABILITIES[number];

// ─── Inheritance Probabilities ─────────────────────────────────

const DOMINANT_CHANCE = 0.75;
const RECESSIVE_CHANCE = 0.1875;
const HIDDEN_CHANCE = 0.0625;
const MUTATION_RATE = 0.02;

// ─── Gene Generation ───────────────────────────────────────────

function randomFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate a full genome for a Gen0 Sigil.
 * The dominant class gene matches the chosen class.
 * Other slots are randomized with class-appropriate bias.
 */
export function generateGen0Genes(sigilClass: SigilClass): SigilGenome {
  const otherClasses = CLASSES.filter((c) => c !== sigilClass);

  return {
    class: {
      dominant: sigilClass,
      recessive: randomFrom(otherClasses),
      hidden: randomFrom(CLASSES),
    },
    subclass: {
      dominant: randomFrom(CLASSES),
      recessive: randomFrom(CLASSES),
      hidden: randomFrom(CLASSES),
    },
    profession: {
      dominant: professionForClass(sigilClass),
      recessive: randomFrom(PROFESSIONS),
      hidden: randomFrom(PROFESSIONS),
    },
    activeAbility: {
      dominant: randomFrom(ACTIVE_ABILITIES),
      recessive: randomFrom(ACTIVE_ABILITIES),
      hidden: randomFrom(ACTIVE_ABILITIES),
    },
    passiveAbility: {
      dominant: randomFrom(PASSIVE_ABILITIES),
      recessive: randomFrom(PASSIVE_ABILITIES),
      hidden: randomFrom(PASSIVE_ABILITIES),
    },
    statBoost: {
      dominant: randomFrom(STAT_NAMES),
      recessive: randomFrom(STAT_NAMES),
      hidden: randomFrom(STAT_NAMES),
    },
  };
}

/**
 * Inherit genes from two parents to produce offspring genome.
 * For each slot, one gene is selected from each parent based
 * on inheritance probabilities, then checked for mutation.
 */
export function inheritGenes(
  parent1: SigilGenome,
  parent2: SigilGenome,
): SigilGenome {
  return {
    class: inheritSlot(parent1.class, parent2.class, CLASSES),
    subclass: inheritSlot(parent1.subclass, parent2.subclass, CLASSES),
    profession: inheritSlot(parent1.profession, parent2.profession, PROFESSIONS),
    activeAbility: inheritSlot(
      parent1.activeAbility, parent2.activeAbility, [...ACTIVE_ABILITIES],
    ),
    passiveAbility: inheritSlot(
      parent1.passiveAbility, parent2.passiveAbility, [...PASSIVE_ABILITIES],
    ),
    statBoost: inheritSlot(parent1.statBoost, parent2.statBoost, STAT_NAMES),
  };
}

/**
 * Inherit a single gene slot from two parents.
 * Dominant gene from one parent becomes offspring's dominant.
 * A second gene from the other parent becomes recessive.
 * Hidden is selected from remaining pool.
 */
function inheritSlot<T>(
  p1: GeneLayers<T>,
  p2: GeneLayers<T>,
  pool: readonly T[],
): GeneLayers<T> {
  // Pick dominant from parent 1
  const fromP1 = selectGene(p1);
  // Pick recessive from parent 2
  const fromP2 = selectGene(p2);
  // Hidden is random from pool
  const hidden = randomFrom(pool);

  return {
    dominant: maybeMutate(fromP1, pool),
    recessive: maybeMutate(fromP2, pool),
    hidden: maybeMutate(hidden, pool),
  };
}

/**
 * Select one gene from a slot based on inheritance weights.
 */
function selectGene<T>(layers: GeneLayers<T>): T {
  const roll = Math.random();
  if (roll < DOMINANT_CHANCE) return layers.dominant;
  if (roll < DOMINANT_CHANCE + RECESSIVE_CHANCE) return layers.recessive;
  return layers.hidden;
}

/**
 * Apply mutation chance. If mutation triggers, replace with random from pool.
 */
function maybeMutate<T>(gene: T, pool: readonly T[]): T {
  if (Math.random() < MUTATION_RATE) {
    return randomFrom(pool);
  }
  return gene;
}

// ─── Helpers ───────────────────────────────────────────────────

function professionForClass(sigilClass: SigilClass): Profession {
  const map: Record<SigilClass, Profession> = {
    ember: "mining",
    thorn: "gardening",
    veil: "foraging",
    tidecaller: "fishing",
    sparkwright: "mining",
    hollow: "fishing",
  };
  return map[sigilClass];
}

/**
 * Check if a Sigil's profession gene matches a quest type.
 * Matching gives bonus rewards.
 */
export function hasProfessionBonus(genes: SigilGenome, profession: Profession): boolean {
  return genes.profession.dominant === profession;
}

/**
 * Get the stat boost from the stat boost gene slot.
 */
export function getStatBoostGene(genes: SigilGenome): StatName {
  return genes.statBoost.dominant;
}

/**
 * Get active ability name.
 */
export function getActiveAbility(genes: SigilGenome): string {
  return genes.activeAbility.dominant;
}

/**
 * Get passive ability name.
 */
export function getPassiveAbility(genes: SigilGenome): string {
  return genes.passiveAbility.dominant;
}

/**
 * Format genome for display.
 */
export function formatGenome(genes: SigilGenome): string {
  return [
    `Class: ${genes.class.dominant} (R1:${genes.class.recessive} R2:${genes.class.hidden})`,
    `Subclass: ${genes.subclass.dominant}`,
    `Profession: ${genes.profession.dominant}`,
    `Active: ${genes.activeAbility.dominant}`,
    `Passive: ${genes.passiveAbility.dominant}`,
    `Stat Boost: +2 ${genes.statBoost.dominant.toUpperCase()}`,
  ].join("\n");
}

/**
 * Check if two Sigils are too closely related to breed.
 * Siblings (same parents) and parent-child pairs cannot breed.
 */
export function areTooRelated(
  sigil1ParentIds: [string, string] | null,
  sigil2ParentIds: [string, string] | null,
  sigil1Id: string,
  sigil2Id: string,
): boolean {
  // Check parent-child relationship
  if (sigil1ParentIds) {
    if (sigil1ParentIds.includes(sigil2Id)) return true;
  }
  if (sigil2ParentIds) {
    if (sigil2ParentIds.includes(sigil1Id)) return true;
  }

  // Check siblings (same parents)
  if (sigil1ParentIds && sigil2ParentIds) {
    const sameParents =
      sigil1ParentIds[0] === sigil2ParentIds[0] &&
      sigil1ParentIds[1] === sigil2ParentIds[1];
    const swappedParents =
      sigil1ParentIds[0] === sigil2ParentIds[1] &&
      sigil1ParentIds[1] === sigil2ParentIds[0];
    if (sameParents || swappedParents) return true;
  }

  return false;
}
