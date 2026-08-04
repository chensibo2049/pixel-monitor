import { Suspense } from "react";
import { getAppEnv, getOrCreateUser, getPricing, points } from "../../db/runtime";
import { requireSessionUser } from "../auth";
import { WorksClient } from "../components/works-client";

export const dynamic = "force-dynamic";

export default function WorksPage() {
  return (
    <Suspense fallback={<div className="page-loading">正在加载作品…</div>}>
      <WorksContent />
    </Suspense>
  );
}

async function WorksContent() {
  const identity = await requireSessionUser("/works");
  const { DB } = getAppEnv();
  const user = await getOrCreateUser(DB, identity.email, identity.displayName);

  const page = 1;
  const pageSize = 24;
  const total = DB.prepare(
    "SELECT COUNT(*) AS count FROM generations WHERE user_id = ?",
  ).bind(user.id).first<{ count: number }>();

  const rows = DB.prepare(
    `SELECT id, prompt, plan, operation, image_count, size, price_cents, status, error_message, created_at
     FROM generations
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
  ).bind(user.id, pageSize, (page - 1) * pageSize).all<{
    id: string;
    prompt: string;
    plan: string;
    operation: string;
    image_count: number;
    size: string;
    price_cents: number;
    status: string;
    error_message: string | null;
    created_at: string;
  }>();

  return (
    <WorksClient
      displayName={identity.displayName}
      total={total?.count ?? 0}
      page={page}
      pageSize={pageSize}
      rows={(rows.results ?? []).map((r) => ({
        id: r.id,
        prompt: r.prompt,
        plan: r.plan,
        operation: r.operation,
        imageCount: r.image_count,
        size: r.size,
        price: points(r.price_cents),
        status: r.status,
        errorMessage: r.error_message,
        createdAt: r.created_at,
      }))}
    />
  );
}
