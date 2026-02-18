/**
 * Social Client Factory (Solana)
 *
 * Creates a SocialClient for the automaton runtime.
 * Uses Solana keypair for signing and fetch for HTTP.
 */

import { Keypair } from "@solana/web3.js";
import nacl from "tweetnacl";
import type { SocialClientInterface, InboxMessage } from "../types.js";

/**
 * Create a hash of content using Web Crypto API.
 */
async function hashContent(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Create a SocialClient wired to the agent's Solana keypair.
 */
export function createSocialClient(
  relayUrl: string,
  keypair: Keypair,
): SocialClientInterface {
  const baseUrl = relayUrl.replace(/\/$/, "");
  const address = keypair.publicKey.toBase58();

  return {
    send: async (
      to: string,
      content: string,
      replyTo?: string,
    ): Promise<{ id: string }> => {
      const signedAt = new Date().toISOString();
      const contentHash = await hashContent(content);
      const canonical = `ConwayKingdoms:send:${to}:${contentHash}:${signedAt}`;
      const messageBytes = new TextEncoder().encode(canonical);
      const signatureBytes = nacl.sign.detached(messageBytes, keypair.secretKey);
      const signature = Buffer.from(signatureBytes).toString("base64");

      const res = await fetch(`${baseUrl}/v1/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: address,
          to,
          content,
          signature,
          signed_at: signedAt,
          reply_to: replyTo,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(
          `Send failed (${res.status}): ${(err as any).error || res.statusText}`,
        );
      }

      const data = (await res.json()) as { id: string };
      return { id: data.id };
    },

    poll: async (
      cursor?: string,
      limit?: number,
    ): Promise<{ messages: InboxMessage[]; nextCursor?: string }> => {
      const timestamp = new Date().toISOString();
      const canonical = `ConwayKingdoms:poll:${address}:${timestamp}`;
      const messageBytes = new TextEncoder().encode(canonical);
      const signatureBytes = nacl.sign.detached(messageBytes, keypair.secretKey);
      const signature = Buffer.from(signatureBytes).toString("base64");

      const res = await fetch(`${baseUrl}/v1/messages/poll`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Wallet-Address": address,
          "X-Signature": signature,
          "X-Timestamp": timestamp,
        },
        body: JSON.stringify({ cursor, limit }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(
          `Poll failed (${res.status}): ${(err as any).error || res.statusText}`,
        );
      }

      const data = (await res.json()) as {
        messages: Array<{
          id: string;
          from: string;
          to: string;
          content: string;
          signedAt: string;
          createdAt: string;
          replyTo?: string;
        }>;
        next_cursor?: string;
      };

      return {
        messages: data.messages.map((m) => ({
          id: m.id,
          from: m.from,
          to: m.to,
          content: m.content,
          signedAt: m.signedAt,
          createdAt: m.createdAt,
          replyTo: m.replyTo,
        })),
        nextCursor: data.next_cursor,
      };
    },

    unreadCount: async (): Promise<number> => {
      const timestamp = new Date().toISOString();
      const canonical = `ConwayKingdoms:poll:${address}:${timestamp}`;
      const messageBytes = new TextEncoder().encode(canonical);
      const signatureBytes = nacl.sign.detached(messageBytes, keypair.secretKey);
      const signature = Buffer.from(signatureBytes).toString("base64");

      const res = await fetch(`${baseUrl}/v1/messages/count`, {
        method: "GET",
        headers: {
          "X-Wallet-Address": address,
          "X-Signature": signature,
          "X-Timestamp": timestamp,
        },
      });

      if (!res.ok) return 0;

      const data = (await res.json()) as { unread: number };
      return data.unread;
    },
  };
}
