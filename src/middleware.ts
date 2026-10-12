import { verifyToken } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/api/auth/login", "/api/auth/register"];

const KORUNAN_SAYFALAR = ["/bugun", "/aktiviteler", "/kayitlar", "/ozet"];

const GIRIS_SAYFALARI = ["/giris", "/kayit"];

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api")) {
    return apiKorumasi(request);
  }
  return sayfaKorumasi(request);
}

async function sayfaKorumasi(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get("token")?.value;
  const payload = token ? await verifyToken(token) : null;

  const korunan = KORUNAN_SAYFALAR.some(
    (sayfa) => pathname == sayfa || pathname.startsWith(sayfa + "/"),
  );
  if (korunan && !payload) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname + search);
    return NextResponse.redirect(loginUrl);
  }
  if (GIRIS_SAYFALARI.includes(pathname) && payload) {
    return NextResponse.redirect(new URL("/bugun", request.url));
  }
  return NextResponse.next();
}

async function apiKorumasi(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const token =
    request.cookies.get("token")?.value ??
    request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Geçersiz token" }, { status: 401 });
  }
  const requestHeader = new Headers(request.headers);
  requestHeader.set("X-User-Id", payload.userId);
  requestHeader.set("X-User-Email", payload.email);
  return NextResponse.next({
    request: {
      headers: requestHeader,
    },
  });
}
