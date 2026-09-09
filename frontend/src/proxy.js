import { NextResponse } from "next/server";

const PROTECTED_PREFIXES = ["/dashboard", "/accounts", "/admin", "/hr", "/change-password"];

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (!isProtected) return NextResponse.next();

  const hasToken = Boolean(request.cookies.get("token")?.value);
  if (!hasToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/accounts/:path*",
    "/admin/:path*",
    "/hr/:path*",
    "/change-password/:path*",
  ],
};
