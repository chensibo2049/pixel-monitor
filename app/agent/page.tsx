import { Suspense } from "react";
import {
  getAppEnv,
  getOrCreateUser,
  initializeDatabase,
  money,
} from "../../db/runtime";
import { requireChatGPTUser } from "../chatgpt-auth";
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
  const identity = await requireChatGPTUser("/agent");
  const { DB } = getAppEnv();
  await initializeDatabase(DB);
  const user = await getOrCreateUser(
    DB,
    identity.email,
    identity.displayName,
  );
  const site = await DB.prepare(
    `SELECT id, slug, campus_name, brand_name, standard_price_cents, pro_price_cents, commission_percent, status
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
        `SELECT COUNT(*) AS orders, COALESCE(SUM(agent_commission_cents), 0) AS commission_cents
         FROM generations WHERE subsite_id = ? AND status = 'completed'`,
      )
        .bind(site.id)
        .first<{ orders: number; commission_cents: number }>()
    : null;

  return (
    <AgentClient
      displayName={identity.displayName}
      application={application ?? null}
      site={
        site
          ? {
              ...site,
              standardPrice: money(site.standard_price_cents),
              proPrice: money(site.pro_price_cents),
              orders: stats?.orders ?? 0,
              commission: money(stats?.commission_cents ?? 0),
            }
          : null
      }
    />
  );
}
