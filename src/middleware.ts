/**
 * Refreshes the Supabase session on every navigation.
 *
 * Server components cannot write cookies, so without this the access token
 * would silently expire and owners would be signed out mid-session.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (items) => {
          for (const { name, value } of items) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of items) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Touching the user is what triggers the refresh; the result is unused here.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    /*
      Everything except static assets and image files. Public business pages are
      included so a signed-in owner viewing their own page stays signed in.
    */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
