import { i18nRouter } from "next-i18n-router"
import { NextResponse, type NextRequest } from "next/server"
import i18nConfig from "./i18nConfig"

export function middleware(request: NextRequest) {
  // Giriş ekranı yok: kök adres doğrudan Mercan sohbetine gider.
  if (request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/mercan/chat", request.url))
  }

  return i18nRouter(request, i18nConfig)
}

export const config = {
  matcher: "/((?!api|static|.*\\..*|_next).*)"
}
