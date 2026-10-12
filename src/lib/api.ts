import { NextRequest, NextResponse } from "next/server";

import { Prisma } from "@prisma/client";

export function getUserId(request: NextRequest): string {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    throw new Error(
      "x-user-id yok: bu route yanlışlıkla PUBLIC_PATHS içinde olabilir",
    );
  }
  return userId;
}

export function isPrismaError(error: unknown, code: string): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
  );
}

export type ApiError = {
  error: string;
  details?: unknown;
};

export function jsonError(message: string, status: number, details?: unknown) {
  return NextResponse.json<ApiError>({ error: message, details }, { status });
}
