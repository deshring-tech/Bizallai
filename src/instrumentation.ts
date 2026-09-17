import type { Instrumentation } from "next";

/**
 * One structured log line for every unhandled server error, searchable in the
 * hosting provider's logs by digest — the same reference the error page shows a
 * visitor. Extend or replace this with an error tracker such as Sentry once one
 * is chosen.
 */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const { message, digest } = error as Error & { digest?: string };

  console.error(
    JSON.stringify({
      event: "request_error",
      digest,
      message,
      method: request.method,
      // The query string is dropped: the sign-in callback carries a one-time code in it.
      path: request.path.split("?")[0],
      route: context.routePath,
      routeType: context.routeType,
    }),
  );
};
