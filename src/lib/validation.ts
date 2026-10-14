import { z } from "zod";

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
