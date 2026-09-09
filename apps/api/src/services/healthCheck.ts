import { prisma } from "@rawkoon/api/db";
import { valkey } from "@rawkoon/api/db/valkey";

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export type HealthPayload = {
  status: "ok" | "degraded";
  db: boolean;
  valkey: boolean;
};

/** Prisma SELECT 1 + valkey.ping, each bounded so a hung dependency cannot stall probes. */
export async function checkHealth(timeoutMs = 2000): Promise<HealthPayload> {
  const pingDb = Promise.resolve().then(() => prisma.$queryRaw`SELECT 1`);
  const pingValkey = Promise.resolve().then(() => valkey.ping());

  const [db, valkeyOk] = await Promise.all([
    withTimeout(pingDb, timeoutMs)
      .then(() => true)
      .catch(() => false),
    withTimeout(pingValkey, timeoutMs)
      .then((reply) => reply === "PONG")
      .catch(() => false),
  ]);

  return {
    status: db && valkeyOk ? "ok" : "degraded",
    db,
    valkey: valkeyOk,
  };
}
