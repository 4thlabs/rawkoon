import { expect, test } from "bun:test";

import {
  contractIDs,
  registeredSseRouteIDs,
  sseContract,
  validateSseContract,
} from "@rawkoon/api/contracts/sseContract";

const routeConsumers = [
  ["../routes/library/libraryJobWorkerRoutes.ts", "libraryEvents"],
  ["../routes/library/libraryJobWorkerRoutes.ts", "libraryMigrateStatus"],
  ["../routes/notifications/index.ts", "notificationsStream"],
  ["../routes/admin/adminJobRoutes.ts", "adminJobsEvents"],
] as const;

test("every declared SSE route is consumed by its route handler", async () => {
  for (const [relativePath, declaration] of routeConsumers) {
    const source = await Bun.file(
      new URL(relativePath, import.meta.url),
    ).text();
    expect(source).toContain(`SSE_ROUTE_DECLARATIONS.${declaration}`);
  }
  expect(registeredSseRouteIDs().sort()).toEqual(contractIDs().sort());
});

test("models SSE routing from fields actually present on each payload", () => {
  expect(
    sseContract.find((entry) => entry.id === "library.handshake"),
  ).toMatchObject({
    routing: { type: "required-fields", fields: ["connected", "ts"] },
  });
  expect(
    sseContract.find((entry) => entry.id === "notifications.notification"),
  ).toMatchObject({
    routing: { type: "required-fields", fields: ["id", "userId"] },
  });
  expect(
    sseContract.find((entry) => entry.id === "notifications.handshake"),
  ).toMatchObject({
    routing: { type: "required-fields", fields: ["connected"] },
  });
  expect(
    sseContract.find((entry) => entry.id === "library.landed"),
  ).toMatchObject({
    routing: { type: "payload-field", field: "kind", value: "landed" },
    ios_policy: "invalidate",
  });
  expect(
    sseContract.find((entry) => entry.id === "library.search-result"),
  ).toMatchObject({
    routing: { type: "payload-field", field: "kind", value: "search_result" },
    ios_policy: "invalidate",
  });
  for (const id of ["library.migrate-status", "admin.jobs-status"]) {
    expect(sseContract.find((entry) => entry.id === id)).toMatchObject({
      routing: { type: "endpoint" },
    });
  }
  for (const entry of sseContract) expect(entry).not.toHaveProperty("kind");
});

test("contract IDs are unique and use an iOS handling policy", () => {
  const ids = contractIDs();
  expect(new Set(ids).size).toBe(ids.length);
  expect(validateSseContract()).toEqual([]);
});
