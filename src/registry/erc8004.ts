/**
 * Solana On-Chain Agent Registration
 *
 * Registers the automaton on-chain on Solana.
 * Uses a simple registry pattern with PDAs for agent metadata storage.
 *
 * Note: This is a placeholder for the full Solana program integration.
 * The actual on-chain program will be deployed separately.
 * For now, agent registration is stored locally and announced via the social relay.
 */

import { Keypair, PublicKey } from "@solana/web3.js";
import type {
  RegistryEntry,
  ReputationEntry,
  DiscoveredAgent,
  AutomatonDatabase,
} from "../types.js";

// Placeholder program IDs — will be replaced when Solana programs are deployed
const REGISTRY_PROGRAM_ID = "SiGiLR3g1sTrYxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

type Network = "mainnet" | "devnet";

/**
 * Register the automaton on-chain.
 * Currently stores registration locally and returns a local entry.
 * Will be replaced with actual Solana program call when deployed.
 */
export async function registerAgent(
  keypair: Keypair,
  agentURI: string,
  network: Network = "mainnet",
  db: AutomatonDatabase,
): Promise<RegistryEntry> {
  const address = keypair.publicKey.toBase58();

  // For now, generate a local agent ID and store the registration
  const agentId = `sigil_${address.slice(0, 8)}_${Date.now().toString(36)}`;

  const entry: RegistryEntry = {
    agentId,
    agentURI,
    chain: `solana:${network}`,
    programAddress: REGISTRY_PROGRAM_ID,
    txSignature: `local_${Date.now()}`,
    registeredAt: new Date().toISOString(),
  };

  db.setRegistryEntry(entry);
  return entry;
}

/**
 * Update the agent's URI.
 */
export async function updateAgentURI(
  keypair: Keypair,
  agentId: string,
  newAgentURI: string,
  network: Network = "mainnet",
  db: AutomatonDatabase,
): Promise<string> {
  const entry = db.getRegistryEntry();
  if (entry) {
    entry.agentURI = newAgentURI;
    entry.txSignature = `local_update_${Date.now()}`;
    db.setRegistryEntry(entry);
  }

  return `local_update_${Date.now()}`;
}

/**
 * Leave reputation feedback for another agent.
 * Stored locally until on-chain program is deployed.
 */
export async function leaveFeedback(
  keypair: Keypair,
  agentId: string,
  score: number,
  comment: string,
  network: Network = "mainnet",
  db: AutomatonDatabase,
): Promise<string> {
  const txSig = `local_feedback_${Date.now()}`;

  db.insertReputation({
    id: `rep_${Date.now().toString(36)}`,
    fromAgent: keypair.publicKey.toBase58(),
    toAgent: agentId,
    score,
    comment,
    txSignature: txSig,
    timestamp: new Date().toISOString(),
  });

  return txSig;
}

/**
 * Query the registry for an agent by ID.
 * Placeholder — will query Solana program when deployed.
 */
export async function queryAgent(
  agentId: string,
  network: Network = "mainnet",
): Promise<DiscoveredAgent | null> {
  // TODO: Query Solana program PDAs for agent metadata
  return null;
}

/**
 * Get the total number of registered agents.
 * Placeholder — will query Solana program when deployed.
 */
export async function getTotalAgents(
  network: Network = "mainnet",
): Promise<number> {
  // TODO: Query Solana program for total agent count
  return 0;
}

/**
 * Check if an address has a registered agent.
 */
export async function hasRegisteredAgent(
  address: string,
  network: Network = "mainnet",
): Promise<boolean> {
  // TODO: Query Solana program PDAs
  return false;
}
