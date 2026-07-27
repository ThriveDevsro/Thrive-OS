"use server";

import { AuthError } from "next-auth";
import { signIn } from "../../../auth";

export type LoginState = { error?: string };

export async function login(_: LoginState, formData: FormData): Promise<LoginState> {
  try {
    const rawCallback = String(formData.get("callbackUrl") ?? "");
    const redirectTo =
      rawCallback.startsWith("/") && !rawCallback.startsWith("//")
        ? rawCallback
        : "/dashboard";
    await signIn("credentials", { email: formData.get("email"), password: formData.get("password"), redirectTo });
  } catch (error) {
    if (error instanceof AuthError) return { error: "The email or password is incorrect." };
    throw error;
  }
  return {};
}
