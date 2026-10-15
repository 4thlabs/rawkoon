import { Hono } from "hono";
import { rateLimiter } from "hono-rate-limiter";
import { z } from "zod";

import {
  badGateway,
  conflict,
  notFound,
  ok,
  unprocessable,
} from "@rawkoon/api/errors";
import type { Env } from "@rawkoon/api/honoEnv";
import { requireUser } from "@rawkoon/api/middleware/hono/auth";
import { jsonV, paramV } from "@rawkoon/api/middleware/validate";
import type {
  BookHandoffToAudiobookRequest,
  BookHandoffToEbookRequest,
} from "@rawkoon/shared/types";
import {
  handoffToAudiobook,
  handoffToEbook,
  type HandoffErrorCode,
} from "@rawkoon/api/services/books/handoff/bookHandoff";

/**
 * Transcription is billed per audio second and logs no tokens, so the AI daily
 * budget cannot cap it; a per-user ceiling does instead (each request makes up
 * to 3 transcription calls).
 */
const handoffRateLimit = rateLimiter<Env>({
  windowMs: 60 * 60 * 1000,
  limit: 60,
  keyGenerator: (c) => `book_handoff:${c.get("user").id}`,
  message: "Too many book sync requests, try again later",
  standardHeaders: true,
});

const bookIdParam = z.object({ bookId: z.coerce.number().int() });

const toEbookBody: z.ZodType<BookHandoffToEbookRequest> = z.object({
  position_secs: z.number().finite().min(0),
});

const toAudiobookBody: z.ZodType<BookHandoffToAudiobookRequest> = z.object({
  spine_path: z.string().min(1),
  progression: z.number().finite().min(0).max(1),
});

const failureResponse = (code: HandoffErrorCode) => {
  switch (code) {
    case "no_ebook_edition":
    case "no_audiobook_edition":
    case "no_epub_file":
    case "no_audio_file":
      return notFound(code);
    case "ai_provider_disabled":
    case "feature_disabled":
    case "budget_exceeded":
      return conflict(code);
    case "text_not_found":
    case "spine_not_found":
      return unprocessable(code);
    case "transcription_failed":
      return badGateway(code);
  }
};

const isFailure = (
  value: object,
): value is { ok: false; code: HandoffErrorCode } =>
  "ok" in value && value.ok === false;

export const bookHandoffRoutes = new Hono<Env>()
  .post(
    "/:bookId/handoff/to-ebook",
    requireUser,
    handoffRateLimit,
    paramV(bookIdParam),
    jsonV(toEbookBody),
    async (c) => {
      const { bookId } = c.req.valid("param");
      const { position_secs } = c.req.valid("json");
      const result = await handoffToEbook(bookId, position_secs);
      return isFailure(result) ? failureResponse(result.code) : ok(result);
    },
  )
  .post(
    "/:bookId/handoff/to-audiobook",
    requireUser,
    handoffRateLimit,
    paramV(bookIdParam),
    jsonV(toAudiobookBody),
    async (c) => {
      const { bookId } = c.req.valid("param");
      const { spine_path, progression } = c.req.valid("json");
      const result = await handoffToAudiobook(bookId, spine_path, progression);
      return isFailure(result) ? failureResponse(result.code) : ok(result);
    },
  );
