import { Redis } from "ioredis";

// VALKEY_* is canonical; REDIS_* is kept as a fallback for envs not yet migrated.
const valkeyHost = Bun.env.VALKEY_HOST || Bun.env.REDIS_HOST || "localhost";
const valkeyPort = parseInt(
  Bun.env.VALKEY_PORT || Bun.env.REDIS_PORT || "6379",
);
const valkeyPassword = Bun.env.VALKEY_PASSWORD || Bun.env.REDIS_PASSWORD;
const valkeyDb = parseInt(Bun.env.VALKEY_DB || Bun.env.REDIS_DB || "0");

export const valkeyConnection = {
  host: valkeyHost,
  port: valkeyPort,
  username: "default",
  password: valkeyPassword,
  db: valkeyDb,
  // BullMQ needs these settings for stability
  maxRetriesPerRequest: null,
  // ioredis 6 defaults to RESP3; pin RESP2 to keep the v5 wire behavior for
  // both this client and every BullMQ connection built from these options.
  protocol: 2 as const,
};

export const valkey = new Redis(valkeyConnection);

valkey.on("error", (err) => {
  console.error("Valkey error:", err);
});

valkey.on("connect", () => {
  if (Bun.env.NODE_ENV !== "test") {
    console.log(
      `Successfully connected to Valkey at ${valkeyHost}:${valkeyPort}`,
    );
  }
});
