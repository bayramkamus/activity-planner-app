import { NextResponse } from "next/server";

import { jsonError } from "@/lib/api";
import { setAuthCookie, signToken } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validation";

// Kullanıcı bulunamadığında da bcrypt çalışsın diye kullanılan sahte hash.
// Böylece cevap süresi, e-postanın kayıtlı olup olmadığını ele vermez.
const DUMMY_HASH = hashPassword("zamanlama-icin-sahte-sifre");

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Geçersiz JSON", 400);
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Geçersiz veri", 400, parsed.error.flatten().fieldErrors);
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, passwordHash: true },
  });

  const passwordOk = await verifyPassword(
    password,
    user?.passwordHash ?? (await DUMMY_HASH),
  );
  if (!user || !passwordOk) {
    return jsonError("E-posta veya şifre hatalı", 401);
  }

  const token = await signToken({ userId: user.id, email: user.email });

  const response = NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
  });
  setAuthCookie(response, token);
  return response;
}
