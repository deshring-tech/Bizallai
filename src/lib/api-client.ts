/**
 * MODULE  api-client
 *
 * Purpose          Typed fetch wrapper for the browser.
 * Responsibilities Serialise requests, surface server error messages verbatim.
 * Notes            Server handlers already return user-safe messages, so the UI
 *                  shows them directly instead of inventing its own copy.
 */

export class ApiError extends Error {
  readonly status: number;
  readonly details: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

type ErrorBody = { error?: { message?: string; details?: unknown } };

export async function apiRequest<T>(
  path: string,
  init: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(path, {
      method: init.method ?? "GET",
      headers: init.body ? { "content-type": "application/json" } : undefined,
      body: init.body ? JSON.stringify(init.body) : undefined,
      signal: init.signal,
    });
  } catch {
    throw new ApiError(0, "Check your connection and try again.");
  }

  const payload = (await response.json().catch(() => ({}))) as T & ErrorBody;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload.error?.message ?? "Something went wrong. Please try again.",
      payload.error?.details,
    );
  }

  return payload as T;
}
