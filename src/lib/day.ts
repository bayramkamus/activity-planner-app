// Günler API'de "YYYY-MM-DD" yazısı olarak taşınır, veritabanına UTC gece yarısı olarak yazılır.
// "Bugün"ün hangi gün olduğuna sunucu karar vermez: Kullanıcının saat dilimini bilmez, günü istemci gönderir.

export const INVALID_DAY_MESSAGE =
  "Tarih YYYY-MM-DD biçiminde geçerli bir gün olmalıdır";

const DAY_MS = 24 * 60 * 60 * 1000;

// "2026-10-16" → 2026-10-16T00:00:00.000Z. Biçim yanlışsa veya öyle bir gün yoksa (30 Şubat gibi) null.
export function parseDay(value: string): Date | null {
  if (!/^(19|20)\d{2}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  // JavaScript "2026-02-30"u hata vermeden 2 Mart'a çevirebilir; geri çevirince aynı gün çıkmalı.
  if (Number.isNaN(date.getTime()) || formatDay(date) !== value) {
    return null;
  }
  return date;
}

// 2026-10-16T00:00:00.000Z → "2026-10-16"
export function formatDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// UTC'de yaz saati uygulaması olmadığı için iki gece yarısı arasındaki fark hep tam gün sayısıdır.
export function daysBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / DAY_MS;
}
