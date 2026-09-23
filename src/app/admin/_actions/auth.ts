"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, SESSION_DAYS, checkPassword, createSessionToken, isPasswordConfigured } from "@/server/auth";

export type LoginState = { error?: string };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!isPasswordConfigured()) return { error: "Falta configurar la contraseña del administrador (ADMIN_PASSWORD)." };
  const password = String(formData.get("password") ?? "");
  if (!(await checkPassword(password))) return { error: "Esa contraseña no es. Revisa mayúsculas y vuelve a intentar." };

  (await cookies()).set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });

  const back = String(formData.get("volver") ?? "");
  redirect(back.startsWith("/admin") ? back : "/admin");
}

export async function logoutAction() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/admin/entrar");
}
