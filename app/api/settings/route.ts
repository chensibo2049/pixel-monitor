import { getSessionUser } from "../../auth";
import {
  getAppEnv,
  getPricing,
  requireAdmin,
} from "../../../db/runtime";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "未登录" }, { status: 401 });
  const { DB } = getAppEnv();
  if (!(await requireAdmin(DB, user.email))) {
    return Response.json({ error: "无权访问" }, { status: 403 });
  }
  return Response.json(await getPricing(DB));
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "未登录" }, { status: 401 });
  const { DB } = getAppEnv();
  if (!(await requireAdmin(DB, user.email))) {
    return Response.json({ error: "无权访问" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as Partial<{
    standardPriceCents: number;
    proPriceCents: number;
    standardPackPriceCents: number;
    proPackPriceCents: number;
    editDiscountPercent: number;
    agentCommissionPercent: number;
  }> | null;
  if (!body) return Response.json({ error: "请求格式不正确。" }, { status: 400 });
  const standard = Math.round(Number(body.standardPriceCents));
  const pro = Math.round(Number(body.proPriceCents));
  const standardPack = Math.round(Number(body.standardPackPriceCents));
  const proPack = Math.round(Number(body.proPackPriceCents));
  const editDiscount = Math.round(Number(body.editDiscountPercent));
  const commission = Math.round(Number(body.agentCommissionPercent));
  if (
    !Number.isFinite(standard) ||
    !Number.isFinite(pro) ||
    standard < 4 ||
    pro < 12 ||
    !Number.isFinite(standardPack) ||
    !Number.isFinite(proPack) ||
    standardPack < 16 ||
    proPack < 48 ||
    standardPack > standard * 4 ||
    proPack > pro * 4 ||
    !Number.isFinite(editDiscount) ||
    editDiscount < 10 ||
    editDiscount > 100 ||
    standard > 10000 ||
    pro > 10000 ||
    !Number.isFinite(commission) ||
    commission < 0 ||
    commission > 80
  ) {
    return Response.json(
      { error: "价格不得低于模型成本；四图价不能高于四张单价；局部修改折扣需在 10—100%。" },
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
      "INSERT INTO settings (key, value, updated_at) VALUES ('standard_pack_price_cents', ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP",
    ).bind(String(standardPack)),
    DB.prepare(
      "INSERT INTO settings (key, value, updated_at) VALUES ('pro_pack_price_cents', ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP",
    ).bind(String(proPack)),
    DB.prepare(
      "INSERT INTO settings (key, value, updated_at) VALUES ('edit_discount_percent', ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP",
    ).bind(String(editDiscount)),
    DB.prepare(
      "INSERT INTO settings (key, value, updated_at) VALUES ('agent_commission_percent', ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP",
    ).bind(String(commission)),
  ]);
  return Response.json({
    ok: true,
    standardPriceCents: standard,
    proPriceCents: pro,
    standardPackPriceCents: standardPack,
    proPackPriceCents: proPack,
    editDiscountPercent: editDiscount,
    agentCommissionPercent: commission,
  });
}
