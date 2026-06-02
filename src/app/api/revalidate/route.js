import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { createClient } from "@/prismicio";

// Map Prismic document type → cache tags to invalidate.
// Listing/index pages and the homepage are tagged with the generic "prismic"
// tag, so any publish refreshes them too.
const TYPE_TAGS = {
  articles: ["articles", "prismic"],
  gallery: ["galleries", "prismic"],
  page: ["pages", "prismic"],
  homepage: ["prismic"],
  author: ["prismic"],
  photographer: ["prismic"],
};

function revalidateAll(reason) {
  revalidateTag("prismic");
  return NextResponse.json({
    revalidated: true,
    tags: ["prismic"],
    reason,
    now: Date.now(),
  });
}

export async function POST(request) {
  // Read body once; we may need it for either auth path.
  let body = null;
  try {
    body = await request.clone().json();
  } catch {
    // Non-JSON body is fine for the admin-token path.
  }

  // --- Prismic webhook path ---
  // Prismic posts { type, secret, documents: [...ids], ... } on publish.
  const webhookSecret = process.env.PRISMIC_WEBHOOK_SECRET;
  if (body && webhookSecret && body.secret === webhookSecret) {
    const docIds = Array.isArray(body.documents) ? body.documents : [];

    // Test ping from Prismic dashboard — no documents, just confirm 200.
    if (docIds.length === 0) {
      return revalidateAll("prismic-webhook-ping");
    }

    try {
      const client = createClient();
      // Look up doc types in one batched request. Unpublished docs won't come
      // back from the Content API; fall through to a global purge for those.
      const docs = await client.getByIDs(docIds, {
        fetch: "document.type",
      });

      const tagSet = new Set();
      for (const doc of docs.results || []) {
        const tags = TYPE_TAGS[doc.type] || ["prismic"];
        tags.forEach((t) => tagSet.add(t));
      }

      // If we couldn't resolve any types (e.g. all unpublished), purge globally.
      if (tagSet.size === 0) {
        return revalidateAll("prismic-webhook-unresolved");
      }

      for (const tag of tagSet) revalidateTag(tag);

      return NextResponse.json({
        revalidated: true,
        tags: [...tagSet],
        docs: docIds.length,
        resolved: docs.results?.length || 0,
        now: Date.now(),
      });
    } catch (err) {
      // Never silently drop a publish — fall back to global purge.
      console.error("[revalidate] Prismic webhook handler failed:", err);
      return revalidateAll("prismic-webhook-error");
    }
  }

  // --- Admin / cron-secret path (unchanged behavior) ---
  const auth = await requireAdmin(request, { allowCron: true });
  if (!auth.ok) return auth.response;

  revalidateTag("prismic");
  return NextResponse.json({ revalidated: true, now: Date.now() });
}
