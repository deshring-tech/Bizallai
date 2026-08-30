/**
 * MODULE  errors
 *
 * Purpose          One error vocabulary shared by services and route handlers.
 * Responsibilities Carry an HTTP status and a message safe to show a user.
 * Notes            Anything that is not an AppError is treated as a 500 and its
 *                  message is never forwarded to the client.
 */

export type AppErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "upstream_failed"
  | "internal";

const STATUS_BY_CODE: Record<AppErrorCode, number> = {
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  upstream_failed: 502,
  internal: 500,
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  readonly details: unknown;

  constructor(code: AppErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.details = details;
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new AppError("bad_request", message, details);
export const unauthorized = (message = "Please sign in to continue.") =>
  new AppError("unauthorized", message);
export const forbidden = (message = "You do not have access to this page.") =>
  new AppError("forbidden", message);
export const notFound = (message = "Not found.") => new AppError("not_found", message);
export const conflict = (message: string) => new AppError("conflict", message);
export const rateLimited = (message = "Too many requests. Please wait a moment.") =>
  new AppError("rate_limited", message);
export const upstreamFailed = (message: string) => new AppError("upstream_failed", message);

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  return new AppError("internal", "Something went wrong. Please try again.");
}
