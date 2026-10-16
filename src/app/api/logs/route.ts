import { NextRequest, NextResponse } from "next/server";

import { getUserId, jsonError } from "@/lib/api";
import { formatDay } from "@/lib/day";
import { prisma } from "@/lib/prisma";
import { logQuerySchema } from "@/lib/validation";

// GET /api/logs?from=2026-10-12&to=2026-10-18               → o aralıktaki tüm kayıtlar
// GET /api/logs?from=2026-10-12&to=2026-10-18&activityId=…  → sadece bir aktivitenin kayıtları
export async function GET(request: NextRequest) {
  const userId = getUserId(request);

  const parsed = logQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return jsonError("Geçersiz sorgu", 400, parsed.error.flatten().fieldErrors);
  }

  const { from, to, activityId } = parsed.data;
  // activityId gönderilmezse undefined olur ve Prisma o filtreyi yok sayar. Burada bu istenen bir
  // davranış, çünkü sahiplik filtresi olan userId her zaman dolu.
  const logs = await prisma.activityLog.findMany({
    where: { userId, activityId, date: { gte: from, lte: to } },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(
    logs.map((log) => ({ ...log, date: formatDay(log.date) })),
  );
}
