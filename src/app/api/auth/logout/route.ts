import { NextResponse } from "next/server";

import { clearAuthCookie } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ message: "Çıkış yapıldı" });
  clearAuthCookie(response);
  return response;
}
