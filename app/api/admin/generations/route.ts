import { getSessionUser } from "../../../auth";
import { getAppEnv, initializeDatabase, money, requireAdmin } from "../../../../db/runtime";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const identity = await getSessionUser();
  if (!identity) return Response.json({ error: "未登录" }, { status: 401 });
  const { DB } = getAppEnv();
  await initializeDatabase(DB);
  if (!(await requireAdmin(DB, identity.email))) {
    return Response.json({ error: "无权访问" }, { status: 403 });
  }

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const pageSize = Math.min(50, Math.max(10, Number(url.searchParams.get("pageSize")) || 20));
  const status = url.searchParams.get("status") || "";
  const userId = url.searchParams.get("userId") || "";
  const offset = (page - 1) * pageSize;

  let where = "1=1";
  const binds: (string | number)[] = [];
  if (status && ["pending", "completed", "failed"].includes(status)) {
    where += " AND g.status = ?";
    binds.push(status);
  }
  if (userId) {
    where += " AND g.user_id = ?";
    binds.push(userId);
  }

  const total = DB.prepare(
    `SELECT COUNT(*) AS count FROM generations g WHERE ${where}`,
  ).bind(...binds).first<{ count: number }>();

  const rows = DB.prepare(
    `SELECT g.id, g.user_id, g.prompt, g.plan, g.operation, g.size, g.image_count,
            g.price_cents, g.agent_commission_cents, g.status, g.error_message, g.created_at,
            u.display_name, u.email
     FROM generations g
     JOIN users u ON u.id = g.user_id
     WHERE ${where}
     ORDER BY g.created_at DESC
     LIMIT ? OFFSET ?`,
  ).bind(...binds, pageSize, offset).all<{
    id: string;
    user_id: string;
    prompt: string;
    plan: string;
    operation: string;
    size: string;
    image_count: number;
    price_cents: number;
    agent_commission_cents: number;
    status: string;
    error_message: string | null;
    created_at: string;
    display_name: string;
    email: string;
  }>();

  return Response.json({
    total: total?.count ?? 0,
    page,
    pageSize,
    rows: (rows.results ?? []).map((r) => ({
      ...r,
      price: money(r.price_cents),
      commission: money(r.agent_commission_cents),
    })),
  });
}
