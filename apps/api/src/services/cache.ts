import { RedisClient } from "bun";
import { getValkeyUrl } from "@rawkoon/api/config";

let valkeyClient: RedisClient | null = null;
let valkeyDisabled = false;

const getValkeyClient = (): RedisClient | null => {
  if (valkeyDisabled) return null;
  if (valkeyClient) return valkeyClient;

  try {
    valkeyClient = new RedisClient(getValkeyUrl());
    return valkeyClient;
  } catch (error) {
    valkeyDisabled = true;
    console.error("Failed to initialize Valkey client:", error);
    return null;
  }
};

export const getJsonCache = async <T>(key: string): Promise<T | null> => {
  const client = getValkeyClient();
  if (!client) return null;

  try {
    const cached = await client.get(key);
    if (!cached) return null;
    return JSON.parse(cached) as T;
  } catch (error) {
    console.warn(`Valkey get failed for key ${key}:`, error);
    return null;
  }
};

export const setJsonCache = async <T>(
  key: string,
  value: T,
  ttlSeconds: number,
): Promise<void> => {
  const client = getValkeyClient();
  if (!client) return;

  try {
    // Single atomic SET with EX so the key never persists without its TTL.
    await client.send("SET", [
      key,
      JSON.stringify(value),
      "EX",
      String(ttlSeconds),
    ]);
  } catch (error) {
    console.warn(`Valkey set failed for key ${key}:`, error);
  }
};

// Atomic SET NX EX. Returns true if the lock was acquired (or if Valkey is
// unavailable — fail-open, matching the rest of this module's degrade-to-no-cache
// behavior). Pair with releaseLock in a finally.
export const acquireLock = async (
  key: string,
  ttlSeconds: number,
): Promise<boolean> => {
  const client = getValkeyClient();
  if (!client) return true;
  try {
    const res = await client.send("SET", [
      key,
      "1",
      "NX",
      "EX",
      String(ttlSeconds),
    ]);
    return res === "OK";
  } catch (error) {
    console.warn(`Valkey lock acquire failed for key ${key}:`, error);
    return true;
  }
};

export const releaseLock = async (key: string): Promise<void> => {
  await deleteCache(key);
};

export const deleteCache = async (key: string): Promise<void> => {
  const client = getValkeyClient();
  if (!client) return;

  try {
    await client.send("DEL", [key]);
  } catch (error) {
    console.warn(`Valkey delete failed for key ${key}:`, error);
  }
};
