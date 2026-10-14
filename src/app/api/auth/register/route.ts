import { NextResponse } from "next/server";

import { isPrismaError, jsonError } from "@/lib/api";
import { setAuthCookie, signToken } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validation";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Geçersiz JSON", 400);
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Geçersiz veri", 400, parsed.error.flatten().fieldErrors);
  }

  const { email, name, password } = parsed.data;

  const passwordHash = await hashPassword(password);

  let user;
  try {
    user = await prisma.user.create({
      data: { email, name, passwordHash },
      select: { id: true, email: true, name: true },
    });
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      return jsonError("Bu e-posta adresi zaten kayıtlı", 409);
    }
    throw error;
  }

  // 6) Token üret, cookie'ye yaz (kayıt olunca otomatik giriş)
  const token = await signToken({ userId: user.id, email: user.email });

  const response = NextResponse.json(user, { status: 201 });
  setAuthCookie(response, token);
  return response;
}
