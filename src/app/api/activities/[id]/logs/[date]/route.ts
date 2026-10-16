import { NextRequest, NextResponse } from "next/server";

import { getUserId, isPrismaError, jsonError } from "@/lib/api";
import { formatDay, INVALID_DAY_MESSAGE, parseDay } from "@/lib/day";
import { isOwnActivity } from "@/lib/ownership";
import { prisma } from "@/lib/prisma";
import { logUpsertSchema } from "@/lib/validation";

// Bir günlük kayıt, aktivitesi ve günüyle bulunur: /api/activities/:id/logs/2026-10-16
type Context = { params: Promise<{ id: string; date: string }> };

// PUT: O günün kaydını oluşturur, varsa tamamen değiştirir. Aynı istek iki kez gelse de sonuç aynıdır.
export async function PUT(request: NextRequest, { params }: Context) {
  const userId = getUserId(request);
  const { id, date } = await params;

  const day = parseDay(date);
  if (!day) {
    return jsonError(INVALID_DAY_MESSAGE, 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Geçersiz JSON", 400);
  }

  const parsed = logUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Geçersiz veri", 400, parsed.error.flatten().fieldErrors);
  }

  if (!(await isOwnActivity(id, userId))) {
    return jsonError("Aktivite bulunamadı", 404);
  }

  const upsert = () =>
    prisma.activityLog.upsert({
      where: { activityId_date: { activityId: id, date: day } },
      create: { ...parsed.data, activityId: id, userId, date: day },
      update: parsed.data,
    });

  // MySQL'de upsert önce arar, sonra ekler. Aynı gün için iki istek aynı anda gelirse ikisi de
  // kaydı bulamayıp eklemeye çalışır ve biri P2002 alır. O anda kayıt artık var: tekrar denemek onu günceller.
  let log;
  try {
    log = await upsert();
  } catch (error) {
    if (!isPrismaError(error, "P2002")) {
      throw error;
    }
    log = await upsert();
  }
  return NextResponse.json({ ...log, date: formatDay(log.date) });
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const userId = getUserId(request);
  const { id, date } = await params;

  const day = parseDay(date);
  if (!day) {
    return jsonError(INVALID_DAY_MESSAGE, 400);
  }

  // Kaydın kendi userId'si de koşulda: Başkasının aktivitesine ait bir kayıt "yok" sayılır.
  try {
    await prisma.activityLog.delete({
      where: { activityId_date: { activityId: id, date: day }, userId },
    });
  } catch (error) {
    if (isPrismaError(error, "P2025")) {
      return jsonError("Kayıt bulunamadı", 404);
    }
    throw error;
  }
  return new NextResponse(null, { status: 204 });
}
