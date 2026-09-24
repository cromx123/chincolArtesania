"use server";

import type { CustomerFormInput, LoyaltyPerk } from "@/domain/customer";
import { type RegisterResult, cleanSource, customerService } from "@/server/services/customer-service";

export async function registerCustomerAction(input: CustomerFormInput, token: string | null, source: string | null): Promise<RegisterResult> {
  return customerService.register(
    {
      name: String(input?.name ?? ""),
      phone: String(input?.phone ?? ""),
      email: String(input?.email ?? ""),
      comuna: String(input?.comuna ?? ""),
      newsletter: Boolean(input?.newsletter),
      consent: input?.consent === true,
    },
    typeof token === "string" && token ? token.slice(0, 64) : null,
    cleanSource(source),
  );
}

export async function skipFormAction(source: string | null) {
  await customerService.recordSkip(cleanSource(source));
}

export async function customerPerkAction(token: string): Promise<LoyaltyPerk | null> {
  if (typeof token !== "string" || !token) return null;
  return customerService.perkFor(token.slice(0, 64));
}
