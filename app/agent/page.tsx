import { Suspense } from "react";
import {
  getAppEnv,
  getOrCreateUser,
  initializeDatabase,
  money,
  points,
} from "../../db/runtime";
import { requireSessionUser } from "../auth";
import { AgentClient } from "../components/agent-client";

export const dynamic = "force-dynamic";

export default function AgentPage() {
  return (
    <Suspense fallback={<div className="page-loading">正在打开校园代理中心…</div>}>
      <AgentContent />
    </Suspense>
  );
}

async function AgentContent() {
  const identity = await requireSessionUser("/agent");
  const { DB } = getAppEnv();
  await initializeDatabase(DB);
  const user = await getOrCreateUser(
    DB,
    identity.email,
    identity.displayName,
  );
  const site = await DB.prepare(
    `SELECT id, slug, campus_name, brand_name, standard_price_cents, pro_price_cents, standard_pack_price_cents, pro_pack_price_cents, commission_percent, status
     FROM agent_sites WHERE owner_user_id = ? LIMIT 1`,
  )
    .bind(user.id)
    .first<{
      id: string;
      slug: string;
      campus_name: string;
      brand_name: string;
      standard_price_cents: number;
      pro_price_cents: number;
      standard_pack_price_cents: number;
      pro_pack_price_cents: number;
      commission_percent: number;
      status: string;
    }>();
  const application = await DB.prepare(
    "SELECT campus_name, desired_slug, status, created_at FROM agent_applications WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
  )
    .bind(user.id)
    .first<{
      campus_name: string;
      desired_slug: string;
      status: string;
      created_at: string;
    }>();
  const stats = site
    ? await DB.prepare(
        `SELECT COUNT(*) AS orders,
                COALESCE(SUM(agent_commission_cents), 0) AS commission_cents,
                COALESCE(SUM(CASE WHEN created_at >= datetime('now', 'start of day') THEN 1 ELSE 0 END), 0) AS today_orders,
                COALESCE(SUM(CASE WHEN created_at >= datetime('now', '-7 days') THEN 1 ELSE 0 END), 0) AS week_orders,
                COALESCE(SUM(CASE WHEN created_at >= datetime('now', '-14 days') AND created_at < datetime('now', '-7 days') THEN 1 ELSE 0 END), 0) AS previous_week_orders
         FROM generations WHERE subsite_id = ? AND status = 'completed'`,
      )
        .bind(site.id)
        .first<{
          orders: number;
          commission_cents: number;
          today_orders: number;
          week_orders: number;
          previous_week_orders: number;
        }>()
    : null;
  const popularOperation = site
    ? await DB.prepare(
        `SELECT operation, COUNT(*) AS total
         FROM generations
         WHERE subsite_id = ? AND status = 'completed' AND created_at >= datetime('now', '-30 days')
         GROUP BY operation
         ORDER BY total DESC, operation ASC
         LIMIT 1`,
      )
        .bind(site.id)
        .first<{ operation: string; total: number }>()
    : null;

  return (
    <AgentClient
      displayName={identity.displayName}
      application={application ?? null}
      site={
        site
          ? {
              ...site,
              standardPrice: points(site.standard_price_cents),
              proPrice: points(site.pro_price_cents),
              standardPackPrice: points(site.standard_pack_price_cents),
              proPackPrice: points(site.pro_pack_price_cents),
              orders: stats?.orders ?? 0,
              commission: money(stats?.commission_cents ?? 0),
              todayOrders: stats?.today_orders ?? 0,
              weekOrders: stats?.week_orders ?? 0,
              weekTrend: calculateTrend(
                stats?.week_orders ?? 0,
                stats?.previous_week_orders ?? 0,
              ),
              popularOperation: popularOperation?.operation ?? null,
            }
          : null
      }
    />
  );
}

function calculateTrend(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}
