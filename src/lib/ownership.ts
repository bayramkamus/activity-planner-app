import { prisma } from "@/lib/prisma";

// Kullanıcı sadece kendi kategorisine aktivite bağlayabilir.
// Kategori hiç yoksa da başkasına aitse de false döner; dışarıdan ikisi ayırt edilemez.
export async function isOwnCategory(
  categoryId: string,
  userId: string,
): Promise<boolean> {
  const category = await prisma.category.findUnique({
    where: { id: categoryId, userId },
    select: { id: true },
  });
  return category !== null;
}

// Kullanıcı sadece kendi aktivitesine günlük kayıt girebilir.
export async function isOwnActivity(
  activityId: string,
  userId: string,
): Promise<boolean> {
  const activity = await prisma.activity.findUnique({
    where: { id: activityId, userId },
    select: { id: true },
  });
  return activity !== null;
}
