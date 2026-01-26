import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/help",
  "/api/auth",
  "/api/books", // public catalog endpoints
]

const ADMIN_PATH_PREFIXES = [
  "/admin-dashboard",
  "/manage-books",
  "/manage-loans",
  "/manage-members",
  "/manage-fines",
  "/reports",
]

const ANY_AUTH_PATH_PREFIXES = [
  "/",
  "/home",
  "/profile",
  "/notifications",
  "/my-loans",
  "/my-reservations",
  "/search-books",
  "/book-details",
  "/cataloging",
  "/recommendations",
  "/services",
  "/chatbot",
]

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
}

function isAdminRoute(pathname: string) {
  return ADMIN_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))
}

function isAppRoute(pathname: string) {
  return ANY_AUTH_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (pathname.startsWith("/api")) {
    return NextResponse.next()
  }

  if (isPublic(pathname)) {
    return NextResponse.next()
  }

  // Skip next internal assets
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname.startsWith("/public")) {
    return NextResponse.next()
  }

  // Only enforce for app pages (avoid surprising API behaviour)
  if (!isAppRoute(pathname)) {
    return NextResponse.next()
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) {
    const url = req.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search)
    return NextResponse.redirect(url)
  }

  if (isAdminRoute(pathname)) {
    const type = (token as any).type as string | undefined
    const allowed = ["SUPERVISOR", "LIBRARIAN", "STAFF", "CATALOGER"]
    if (!type || !allowed.includes(type)) {
      const url = req.nextUrl.clone()
      url.pathname = "/"
      url.searchParams.set("error", "forbidden")
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
}
