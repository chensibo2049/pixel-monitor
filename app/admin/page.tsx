import { Suspense } from "react";
import {
  getAppEnv,
  getPricing,
  initializeDatabase,
  money,
  requireAdmin,
} from "../../db/runtime";
import { requireSessionUser } from "../auth";
import { AdminClient } from "../components/admin-client";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="page-loading">正在打开管理后台…</div>}>
      <AdminContent />
    </Suspense>
  );
}

async function AdminContent() {
  const identity = await requireSessionUser("/admin");
  const { DB, IMAGE_API_KEY, IMAGE_API_BASE_URL } = getAppEnv();
  await initializeDatabase(DB);
  if (!(await requireAdmin(DB, identity.email))) {
    return (
      <div className="access-denied">
        <span>403</span>
        <h1>你没有后台权限</h1>
        <p>请让站长把你的邮箱加入 ADMIN_EMAILS。</p>
        <a href="/">返回首页</a>
      </div>
    );
  }

  const [pricing, generationStats, userStats, applications, recentGenerations] =
    await Promise.all([
      getPricing(DB),
      DB.prepare(
        `SELECT
          COUNT(*) AS total,
          COALESCE(SUM(CASE WHEN status = 'completed' THEN price_cents ELSE 0 END), 0) AS revenue_cents,
          COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) AS completed
         FROM generations`,
      ).first<{ total: number; revenue_cents: number; completed: number }>(),
      DB.prepare(
        "SELECT COUNT(*) AS users, COALESCE(SUM(CASE WHEN role = 'agent' THEN 1 ELSE 0 END), 0) AS agents FROM users",
      ).first<{ users: number; agents: number }>(),
      DB.prepare(
        `SELECT a.id, a.campus_name, a.contact, a.desired_slug, a.reason, a.created_at, u.display_name, u.email
         FROM agent_applications a
         JOIN users u ON u.id = a.user_id
         WHERE a.status = 'pending'
         ORDER BY a.created_at ASC
         LIMIT 30`,
      ).all<{
        id: string;
        campus_name: string;
        contact: string;
        desired_slug: string;
        reason: string;
        created_at: string;
        display_name: string;
        email: string;
      }>(),
      DB.prepare(
        `SELECT g.id, g.user_id, g.prompt, g.plan, g.operation, g.size, g.image_count,
                g.price_cents, g.status, g.error_message, g.created_at,
                u.display_name, u.email
         FROM generations g
         JOIN users u ON u.id = g.user_id
         ORDER BY g.created_at DESC
         LIMIT 20`,
      ).all<{
        id: string;
        user_id: string;
        prompt: string;
        plan: string;
        operation: string;
        size: string;
        image_count: number;
        price_cents: number;
        status: string;
        error_message: string | null;
        created_at: string;
        display_name: string;
        email: string;
      }>(),
    ]);

  return (
    <AdminClient
      ownerEmail={identity.email}
      pricing={pricing}
      service={{
        keyConfigured: Boolean(IMAGE_API_KEY),
        baseUrl: IMAGE_API_BASE_URL ?? "https://api.openai.com/v1",
      }}
      stats={{
        generations: generationStats?.completed ?? 0,
        revenue: money(generationStats?.revenue_cents ?? 0),
        users: userStats?.users ?? 0,
        agents: userStats?.agents ?? 0,
      }}
      applications={applications.results ?? []}
      recentGenerations={(recentGenerations.results ?? []).map((g) => ({
        ...g,
        price: money(g.price_cents),
      }))}
    />
  );
}
