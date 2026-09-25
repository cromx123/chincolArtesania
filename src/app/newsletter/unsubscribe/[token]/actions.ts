"use server";

import { redirect } from "next/navigation";
import { newsletterService } from "@/server/services/newsletter-service";

export async function unsubscribeAction(token: string) {
  await newsletterService.unsubscribe(token);
  redirect("/newsletter/unsubscribe/ok");
}
