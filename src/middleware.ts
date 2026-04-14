import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes
  if (
    pathname === "/" ||
    pathname === "/api/auth/login" ||
    pathname === "/api/auth/admin-login" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icons") ||
    pathname === "/manifest.json"
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("session")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const payload = await verifyToken(token);
  if (!payload) {
    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.delete("session");
    return response;
  }

  // Admin routes require admin type
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (payload.type !== "admin") {
      return NextResponse.redirect(new URL("/schicht", request.url));
    }
  }

  // Employee routes
  if (
    pathname.startsWith("/schicht") ||
    pathname.startsWith("/aufgaben") ||
    pathname.startsWith("/zeiterfassung") ||
    pathname.startsWith("/profil")
  ) {
    if (payload.type !== "employee") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|manifest.json).*)"],
};
