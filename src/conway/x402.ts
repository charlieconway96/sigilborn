/**
 * Solana Balance & Payment Utilities
 *
 * Enables the automaton to check SOL balance and make SOL/SPL transfers.
 * Replaces the EVM x402 payment protocol with native Solana operations.
 */

import {
  Connection,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  getAccount,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

// Known SPL token mints on Solana
const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"); // mainnet USDC
const USDT_MINT = new PublicKey("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"); // mainnet USDT

const DEFAULT_RPC = "https://api.mainnet-beta.solana.com";

/**
 * Get the SOL balance for the automaton's wallet.
 */
export async function getSolBalance(
  address: string,
  rpcUrl: string = DEFAULT_RPC,
): Promise<number> {
  try {
    const connection = new Connection(rpcUrl, "confirmed");
    const pubkey = new PublicKey(address);
    const lamports = await connection.getBalance(pubkey);
    return lamports / LAMPORTS_PER_SOL;
  } catch {
    return 0;
  }
}

/**
 * Get the USDC (SPL token) balance for the automaton's wallet.
 */
export async function getUsdcBalance(
  address: string,
  rpcUrl: string = DEFAULT_RPC,
): Promise<number> {
  return getSplTokenBalance(address, USDC_MINT, rpcUrl, 6);
}

/**
 * Get any SPL token balance.
 */
export async function getSplTokenBalance(
  address: string,
  mint: PublicKey,
  rpcUrl: string = DEFAULT_RPC,
  decimals: number = 6,
): Promise<number> {
  try {
    const connection = new Connection(rpcUrl, "confirmed");
    const owner = new PublicKey(address);
    const ata = await getAssociatedTokenAddress(mint, owner);
    const account = await getAccount(connection, ata);
    return Number(account.amount) / Math.pow(10, decimals);
  } catch {
    return 0;
  }
}

/**
 * Transfer SOL from the automaton's wallet to another address.
 */
export async function transferSol(
  keypair: Keypair,
  toAddress: string,
  amountSol: number,
  rpcUrl: string = DEFAULT_RPC,
): Promise<string> {
  const connection = new Connection(rpcUrl, "confirmed");
  const toPubkey = new PublicKey(toAddress);

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: keypair.publicKey,
      toPubkey,
      lamports: Math.round(amountSol * LAMPORTS_PER_SOL),
    }),
  );

  const signature = await sendAndConfirmTransaction(connection, transaction, [keypair]);
  return signature;
}

/**
 * Transfer USDC (SPL token) from the automaton's wallet.
 */
export async function transferUsdc(
  keypair: Keypair,
  toAddress: string,
  amount: number,
  rpcUrl: string = DEFAULT_RPC,
): Promise<string> {
  return transferSplToken(keypair, toAddress, USDC_MINT, amount, 6, rpcUrl);
}

/**
 * Transfer any SPL token from the automaton's wallet.
 */
export async function transferSplToken(
  keypair: Keypair,
  toAddress: string,
  mint: PublicKey,
  amount: number,
  decimals: number = 6,
  rpcUrl: string = DEFAULT_RPC,
): Promise<string> {
  const connection = new Connection(rpcUrl, "confirmed");
  const toPubkey = new PublicKey(toAddress);

  const fromAta = await getAssociatedTokenAddress(mint, keypair.publicKey);
  const toAta = await getAssociatedTokenAddress(mint, toPubkey);

  const rawAmount = BigInt(Math.round(amount * Math.pow(10, decimals)));

  const transaction = new Transaction().add(
    createTransferInstruction(
      fromAta,
      toAta,
      keypair.publicKey,
      rawAmount,
      [],
      TOKEN_PROGRAM_ID,
    ),
  );

  const signature = await sendAndConfirmTransaction(connection, transaction, [keypair]);
  return signature;
}

/**
 * Fetch a URL with automatic payment handling.
 * If the server returns 402, attempts SOL payment and retries.
 */
export async function paidFetch(
  url: string,
  keypair: Keypair,
  method: string = "GET",
  body?: string,
  headers?: Record<string, string>,
  rpcUrl: string = DEFAULT_RPC,
): Promise<{ success: boolean; response?: any; error?: string }> {
  try {
    // Initial request
    const initialResp = await fetch(url, {
      method,
      headers: { ...headers, "Content-Type": "application/json" },
      body,
    });

    if (initialResp.status !== 402) {
      const data = await initialResp
        .json()
        .catch(() => initialResp.text());
      return { success: initialResp.ok, response: data };
    }

    // Parse payment requirements from 402 response
    const paymentHeader = initialResp.headers.get("X-Payment-Required");
    if (!paymentHeader) {
      return { success: false, error: "402 returned but no payment requirements" };
    }

    const requirements = JSON.parse(
      Buffer.from(paymentHeader, "base64").toString("utf-8"),
    );
    const accept = requirements.accepts?.[0];
    if (!accept || accept.network !== "solana") {
      return { success: false, error: "No Solana payment option available" };
    }

    // Make SOL payment
    const signature = await transferSol(
      keypair,
      accept.payToAddress,
      parseFloat(accept.maxAmountRequired),
      rpcUrl,
    );

    // Retry with payment proof
    const paymentProof = Buffer.from(
      JSON.stringify({
        network: "solana",
        signature,
        from: keypair.publicKey.toBase58(),
      }),
    ).toString("base64");

    const paidResp = await fetch(url, {
      method,
      headers: {
        ...headers,
        "Content-Type": "application/json",
        "X-Payment": paymentProof,
      },
      body,
    });

    const data = await paidResp.json().catch(() => paidResp.text());
    return { success: paidResp.ok, response: data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
