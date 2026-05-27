import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";

// Cache purge is privileged: allow an admin session token or the CRON_SECRET
// (so scheduled jobs / webhooks can still trigger revalidation).
export async function POST(request) {
  const auth = await requireAdmin(request, { allowCron: true });
  if (!auth.ok) return auth.response;

  revalidateTag("prismic");

  return NextResponse.json({ revalidated: true, now: Date.now() });
}
