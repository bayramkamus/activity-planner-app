import { NextRequest, NextResponse } from "next/server";

import { getUserId, jsonError } from "@/lib/api";
import { isOwnCategory } from "@/lib/ownership";
import { prisma } from "@/lib/prisma";
import { activityCreateSchema } from "@/lib/validation";

// GET /api/activities                → aktif aktiviteler
// GET /api/activities?archived=true  → arşivlenmiş aktiviteler
export async function GET(request: NextRequest) {
  const userId = getUserId(request);
  const archived = request.nextUrl.searchParams.get("archived") === "true";

  const activities = await prisma.activity.findMany({
    where: { userId, isArchived: archived },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(activities);
}

export async function POST(request: NextRequest) {
  const userId = getUserId(request);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Geçersiz JSON", 400);
  }

  const parsed = activityCreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Geçersiz veri", 400, parsed.error.flatten().fieldErrors);
  }

  const { categoryId } = parsed.data;
  if (categoryId && !(await isOwnCategory(categoryId, userId))) {
    return jsonError("Geçersiz veri", 400, {
      categoryId: ["Kategori bulunamadı"],
    });
  }

  // userId gövdeden değil, middleware'in doğruladığı token'dan geliyor.
  // zod şemada olmayan alanları attığı için gövdeye eklenen bir "userId" buraya ulaşamaz.
  const activity = await prisma.activity.create({
    data: { ...parsed.data, userId },
  });
  return NextResponse.json(activity, { status: 201 });
}
