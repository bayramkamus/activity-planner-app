import { SignJWT, jwtVerify } from "jose";
import type { NextResponse } from "next/server";

export type TokenPayload = {
  userId: string;
  email: string;
};

export const TOKEN_MAX_AGE_SECONDS = 60 * 60 * 16; // Token geçerlilik süresi

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(secret);
}

export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_MAX_AGE_SECONDS}s`)
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
    });
    if (typeof payload.sub !== "string" || typeof payload.email !== "string") {
      return null;
    }
    return { userId: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
} as const;

export function setAuthCookie(response: NextResponse, token: string) {
  response.cookies.set("token", token, {
    ...COOKIE_OPTIONS,
    maxAge: TOKEN_MAX_AGE_SECONDS,
  });
}

export function clearAuthCookie(response: NextResponse) {
  response.cookies.set("token", "", { ...COOKIE_OPTIONS, maxAge: 0 });
}
