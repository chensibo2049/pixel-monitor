import { getSessionUser } from "../../../auth";
import {
  getAppEnv,
  getPricing,
  initializeDatabase,
  requireAdmin,
} from "../../../../db/runtime";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const identity = await getSessionUser();
  if (!identity) return Response.json({ error: "未登录" }, { status: 401 });
  const { DB } = getAppEnv();
  await initializeDatabase(DB);
  if (!(await requireAdmin(DB, identity.email))) {
    return Response.json({ error: "无权访问" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    applicationId?: string;
  } | null;
  const applicationId = body?.applicationId?.trim() ?? "";
  if (!applicationId) {
    return Response.json({ error: "缺少申请编号。" }, { status: 400 });
  }
  const application = await DB.prepare(
    "SELECT id, user_id, campus_name, desired_slug FROM agent_applications WHERE id = ? AND status = 'pending'",
  )
    .bind(applicationId)
    .first<{
      id: string;
      user_id: string;
      campus_name: string;
      desired_slug: string;
    }>();
  if (!application) {
    return Response.json({ error: "申请不存在或已处理。" }, { status: 404 });
  }

  const pricing = await getPricing(DB);
  const siteId = crypto.randomUUID();
  await DB.batch([
    DB.prepare(
      `INSERT INTO agent_sites
        (id, owner_user_id, slug, campus_name, brand_name, standard_price_cents, pro_price_cents, standard_pack_price_cents, pro_pack_price_cents, commission_percent, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
    ).bind(
      siteId,
      application.user_id,
      application.desired_slug,
      application.campus_name,
      `${application.campus_name}生图站`,
      pricing.standardPriceCents,
      pricing.proPriceCents,
      pricing.standardPackPriceCents,
      pricing.proPackPriceCents,
      pricing.agentCommissionPercent,
    ),
    DB.prepare(
      "UPDATE agent_applications SET status = 'approved' WHERE id = ?",
    ).bind(application.id),
    DB.prepare("UPDATE users SET role = 'agent' WHERE id = ?").bind(
      application.user_id,
    ),
  ]);
  return Response.json({ ok: true, slug: application.desired_slug });
}
