import { verifyToken } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/api/auth/login",
  "/api/auth/register",
  // Süresi dolmuş token ile de çıkış yapılabilsin diye herkese açık.
  "/api/auth/logout",
];

const KORUNAN_SAYFALAR = ["/bugun", "/aktiviteler", "/kayitlar", "/ozet"];

const GIRIS_SAYFALARI = ["/giris", "/kayit"];

// Sadece middleware'in yazabileceği header'lar. İstemci bunları kendisi gönderirse silinir.
const KIMLIK_HEADERLARI = ["x-user-id", "x-user-email"];

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api")) {
    return apiKorumasi(request);
  }
  return sayfaKorumasi(request);
}

function temizHeaderlar(request: NextRequest): Headers {
  const headers = new Headers(request.headers);
  for (const header of KIMLIK_HEADERLARI) {
    headers.delete(header);
  }
  return headers;
}

function bearerToken(request: NextRequest): string | undefined {
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return undefined;
  }
  return authorization.slice("Bearer ".length).trim() || undefined;
}

async function sayfaKorumasi(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get("token")?.value;
  const payload = token ? await verifyToken(token) : null;

  const korunan = KORUNAN_SAYFALAR.some(
    (sayfa) => pathname === sayfa || pathname.startsWith(sayfa + "/"),
  );
  if (korunan && !payload) {
    const girisUrl = new URL("/giris", request.url);
    girisUrl.searchParams.set("from", pathname + search);
    return NextResponse.redirect(girisUrl);
  }
  if (GIRIS_SAYFALARI.includes(pathname) && payload) {
    return NextResponse.redirect(new URL("/bugun", request.url));
  }
  return NextResponse.next({
    request: {
      headers: temizHeaderlar(request),
    },
  });
}

async function apiKorumasi(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestHeader = temizHeaderlar(request);

  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next({
      request: {
        headers: requestHeader,
      },
    });
  }

  const token = request.cookies.get("token")?.value ?? bearerToken(request);
  if (!token) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Geçersiz token" }, { status: 401 });
  }
  requestHeader.set("X-User-Id", payload.userId);
  requestHeader.set("X-User-Email", payload.email);
  return NextResponse.next({
    request: {
      headers: requestHeader,
    },
  });
}

// API'de middleware her adreste çalışmalı (sonu ".json" gibi bitenler dahil); yoksa sahte
// X-User-Id header'ı temizlenmeden route'a ulaşır. Sayfalarda statik dosyalar hariç tutulur.
export const config = {
  matcher: [
    "/api/:path*",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)",
  ],
};
