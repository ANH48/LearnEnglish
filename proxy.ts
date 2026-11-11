import { type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session-constants";
import { verifySessionToken } from "@/lib/auth/session-jwt";

/**
 * Optimistic route guard: only checks the token signature, never the database.
 * The real checks (account status, token_version, permissions, course scope)
 * run in the pages and server actions themselves.
 *
 * Staff and learners are kept apart in both directions: a learner session is
 * blocked from /admin, and a staff session is blocked from the learner area.
 */
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const staff = await verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME.staff)?.value, "staff");
  const customer = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE_NAME.customer)?.value,
    "customer",
  );
  const go = (to: string) => NextResponse.redirect(new URL(to, request.url));

  if (path.startsWith("/admin")) {
    if (customer) return go("/blocked?as=customer");
    // The sign-in page decides for itself whether the session is still valid in
    // the database; redirecting from here on signature alone could loop.
    if (path === "/admin/login") return NextResponse.next();
    return staff ? NextResponse.next() : go("/admin/login");
  }

  // Learner area and learner sign-in pages.
  if (staff) return go("/blocked?as=staff");
  if (path === "/login" || path === "/register") return NextResponse.next();
  return customer ? NextResponse.next() : go("/login");
}

export const config = {
  matcher: ["/admin/:path*", "/learn/:path*", "/login", "/register"],
};
