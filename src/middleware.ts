import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, isValidSession } from "./server/auth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/admin/entrar") return NextResponse.next();

  if (!(await isValidSession(req.cookies.get(SESSION_COOKIE)?.value))) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/entrar";
    url.search = pathname === "/admin" ? "" : `?volver=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin", "/admin/:path*"] };
