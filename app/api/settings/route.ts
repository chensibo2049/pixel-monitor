import { getChatGPTUser } from "../../chatgpt-auth";
import {
  getAppEnv,
  getPricing,
  requireAdmin,
} from "../../../db/runtime";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "未登录" }, { status: 401 });
  const { DB } = getAppEnv();
  if (!(await requireAdmin(DB, user.email))) {
    return Response.json({ error: "无权访问" }, { status: 403 });
  }
  return Response.json(await getPricing(DB));
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "未登录" }, { status: 401 });
  const { DB } = getAppEnv();
  if (!(await requireAdmin(DB, user.email))) {
    return Response.json({ error: "无权访问" }, { status: 403 });
  }

  const body = (await request.json()) as Partial<{
    standardPriceCents: number;
    proPriceCents: number;
    agentCommissionPercent: number;
  }>;
  const standard = Math.round(Number(body.standardPriceCents));
  const pro = Math.round(Number(body.proPriceCents));
  const commission = Math.round(Number(body.agentCommissionPercent));
  if (
    !Number.isFinite(standard) ||
    !Number.isFinite(pro) ||
    standard < 4 ||
    pro < 12 ||
    standard > 10000 ||
    pro > 10000 ||
    !Number.isFinite(commission) ||
    commission < 0 ||
    commission > 80
  ) {
    return Response.json(
      { error: "价格不得低于模型成本，分佣比例需在 0—80% 之间。" },
      { status: 400 },
    );
  }

  await DB.batch([
    DB.prepare(
      "INSERT INTO settings (key, value, updated_at) VALUES ('standard_price_cents', ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP",
    ).bind(String(standard)),
    DB.prepare(
      "INSERT INTO settings (key, value, updated_at) VALUES ('pro_price_cents', ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP",
    ).bind(String(pro)),
    DB.prepare(
      "INSERT INTO settings (key, value, updated_at) VALUES ('agent_commission_percent', ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP",
    ).bind(String(commission)),
  ]);
  return Response.json({
    ok: true,
    standardPriceCents: standard,
    proPriceCents: pro,
    agentCommissionPercent: commission,
  });
}
