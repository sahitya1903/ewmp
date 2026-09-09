import { NextResponse } from "next/server";

// Public pages; everything else requires a session — this has to be
// exclusion-based rather than a fixed protected-prefix list, since a custom
// management role's console lives at a URL slug (see app/[roleSlug]) that
// isn't known ahead of time.
const PUBLIC_PATHS = ["/", "/login", "/forgot-password", "/reset-password"];

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (isPublic) return NextResponse.next();

  const hasToken = Boolean(request.cookies.get("token")?.value);
  if (!hasToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Exclude Next's static/image assets and the favicon; everything else
    // (including any future page) is evaluated above.
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
