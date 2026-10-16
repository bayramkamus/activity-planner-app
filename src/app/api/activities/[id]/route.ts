import { NextRequest, NextResponse } from "next/server";

import { getUserId, isPrismaError, jsonError } from "@/lib/api";
import { isOwnCategory } from "@/lib/ownership";
import { prisma } from "@/lib/prisma";
import { activityUpdateSchema } from "@/lib/validation";

// Next.js 15'te params bir Promise: kullanmadan önce await edilmeli.
type Context = { params: Promise<{ id: string }> };

// Tüm sorgularda where: { id, userId } kullanılıyor. Başkasının aktivitesi "yok" sayılır
// ve 404 döner; 403 dönseydik o id'nin var olduğunu ele vermiş olurduk.

export async function GET(request: NextRequest, { params }: Context) {
  const userId = getUserId(request);
  const { id } = await params;

  const activity = await prisma.activity.findUnique({ where: { id, userId } });
  if (!activity) {
    return jsonError("Aktivite bulunamadı", 404);
  }
  return NextResponse.json(activity);
}

export async function PATCH(request: NextRequest, { params }: Context) {
  const userId = getUserId(request);
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Geçersiz JSON", 400);
  }

  const parsed = activityUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Geçersiz veri", 400, parsed.error.flatten().fieldErrors);
  }
  if (Object.keys(parsed.data).length === 0) {
    return jsonError("Güncellenecek alan yok", 400);
  }

  const { categoryId } = parsed.data;
  if (categoryId && !(await isOwnCategory(categoryId, userId))) {
    return jsonError("Geçersiz veri", 400, {
      categoryId: ["Kategori bulunamadı"],
    });
  }

  let activity;
  try {
    activity = await prisma.activity.update({
      where: { id, userId },
      data: parsed.data,
    });
  } catch (error) {
    if (isPrismaError(error, "P2025")) {
      return jsonError("Aktivite bulunamadı", 404);
    }
    throw error;
  }
  return NextResponse.json(activity);
}

// Kalıcı silme: aktivitenin tüm kayıtları ve hatırlatıcıları da silinir (onDelete: Cascade).
// Geçmişi korumak için arşivleme (PATCH { "isArchived": true }) tercih edilmeli.
export async function DELETE(request: NextRequest, { params }: Context) {
  const userId = getUserId(request);
  const { id } = await params;

  try {
    await prisma.activity.delete({ where: { id, userId } });
  } catch (error) {
    if (isPrismaError(error, "P2025")) {
      return jsonError("Aktivite bulunamadı", 404);
    }
    throw error;
  }
  return new NextResponse(null, { status: 204 });
}
