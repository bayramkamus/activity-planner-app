import { LogStatus } from "@prisma/client";
import { z } from "zod";

import { daysBetween, INVALID_DAY_MESSAGE, parseDay } from "@/lib/day";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .email("geçerli bir E-posta girin ");
export const registerSchema = z
  .object({
    email,
    name: z
      .string()
      .trim()
      .min(2, "isim en az 2 karakter olmalıdır")
      .max(50, "isim en fazla 50 karakter olabilir"),
    password: z
      .string()
      .min(8, "şifre en az 8 karakter olmalıdır")
      .max(72, "şifre en fazla 72 karakter olabilir")
      .regex(/[A-ZÇĞİÖŞÜ]/, "Şifre en az bir büyük harf içermelidir")
      .regex(
        /[^\p{L}\p{N}\s]/u,
        "Şifre en az bir noktalama işareti içermelidir",
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "şifre eşleşmiyor ",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "şifre giriniz"),
});

// Boş bırakılan isteğe bağlı metinler ("") veritabanına null olarak gitsin.
// MySQL'de Prisma'nın String alanı VARCHAR(191) olduğu için sınırlar 191'i geçmemeli.
function optionalText(label: string, max: number) {
  return z
    .string()
    .trim()
    .max(max, `${label} en fazla ${max} karakter olabilir`)
    .transform((value) => value || null)
    .nullish();
}

export const activityCreateSchema = z.object({
  name: z
    .string({
      required_error: "Aktivite adı zorunludur",
      invalid_type_error: "Aktivite adı yazı olmalıdır",
    })
    .trim()
    .min(1, "Aktivite adı boş olamaz")
    .max(100, "Aktivite adı en fazla 100 karakter olabilir"),
  description: optionalText("Açıklama", 191),
  icon: optionalText("İkon", 50),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Renk #RRGGBB formatında olmalıdır")
    .nullish(),
  // Bir aktiviteye günde en fazla bir kayıt girilebildiği için (ActivityLog @@unique)
  // haftalık hedef 7'yi geçemez.
  targetPerWeek: z
    .number({ invalid_type_error: "Haftalık hedef sayı olmalıdır" })
    .int("Haftalık hedef tam sayı olmalıdır")
    .min(1, "Haftalık hedef en az 1 olmalıdır")
    .max(7, "Haftalık hedef en fazla 7 olabilir")
    .nullish(),
  categoryId: z.string().cuid("Geçersiz kategori").nullish(),
});

// Güncellemede her alan isteğe bağlı: sadece gönderilen alanlar değişir.
export const activityUpdateSchema = activityCreateSchema.partial().extend({
  isArchived: z
    .boolean({ invalid_type_error: "isArchived true veya false olmalıdır" })
    .optional(),
});

// "YYYY-MM-DD" yazısını doğrular ve UTC gece yarısına ayarlı bir Date'e çevirir.
const day = z
  .string({ required_error: "Tarih zorunludur" })
  .transform((value, ctx) => {
    const date = parseDay(value);
    if (!date) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: INVALID_DAY_MESSAGE });
      return z.NEVER;
    }
    return date;
  });

const MAX_RANGE_DAYS = 366;

export const logQuerySchema = z
  .object({
    from: day,
    to: day,
    activityId: z.string().cuid("Geçersiz aktivite").optional(),
  })
  .refine((data) => data.from <= data.to, {
    message: "Bitiş tarihi başlangıç tarihinden önce olamaz",
    path: ["to"],
  })
  .refine((data) => daysBetween(data.from, data.to) < MAX_RANGE_DAYS, {
    message: `En fazla ${MAX_RANGE_DAYS} günlük aralık sorgulanabilir`,
    path: ["to"],
  });

// PUT kaydı tamamen yerine koyar: Gönderilmeyen alanlar varsayılana döner (durum DONE, diğerleri boş).
export const logUpsertSchema = z.object({
  status: z
    .nativeEnum(LogStatus, {
      errorMap: () => ({
        message: "Durum DONE, SKIPPED veya PARTIAL olmalıdır",
      }),
    })
    .default(LogStatus.DONE),
  durationMin: z
    .number({ invalid_type_error: "Süre dakika cinsinden bir sayı olmalıdır" })
    .int("Süre tam sayı olmalıdır")
    .min(1, "Süre en az 1 dakika olmalıdır")
    .max(1440, "Süre bir günden (1440 dakika) uzun olamaz")
    .nullable()
    .default(null),
  note: optionalText("Not", 191).default(null),
});
