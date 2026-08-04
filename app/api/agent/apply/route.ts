import { getSessionUser } from "../../../auth";
import {
  getAppEnv,
  getOrCreateUser,
  initializeDatabase,
} from "../../../../db/runtime";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const identity = await getSessionUser();
  if (!identity) return Response.json({ error: "请先登录" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as Partial<{
    campusName: string;
    contact: string;
    desiredSlug: string;
    reason: string;
  }> | null;
  if (!body) return Response.json({ error: "请求格式不正确。" }, { status: 400 });
  const campusName = body.campusName?.trim() ?? "";
  const contact = body.contact?.trim() ?? "";
  const slug = (body.desiredSlug?.trim() ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+|-+$/g, "");
  const reason = body.reason?.trim() ?? "";
  if (campusName.length < 2 || contact.length < 4 || slug.length < 3) {
    return Response.json(
      { error: "请完整填写学校、联系方式和至少 3 位的分站标识。" },
      { status: 400 },
    );
  }

  const { DB } = getAppEnv();
  await initializeDatabase(DB);
  const user = await getOrCreateUser(
    DB,
    identity.email,
    identity.displayName,
  );
  const occupied = await DB.prepare(
    "SELECT 1 AS used FROM agent_sites WHERE slug = ? UNION SELECT 1 AS used FROM agent_applications WHERE desired_slug = ? AND status = 'pending'",
  )
    .bind(slug, slug)
    .first();
  if (occupied) {
    return Response.json(
      { error: "这个分站标识已被使用，换一个试试。" },
      { status: 409 },
    );
  }

  await DB.prepare(
    `INSERT INTO agent_applications
      (id, user_id, campus_name, contact, desired_slug, reason, status)
     VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
  )
    .bind(crypto.randomUUID(), user.id, campusName, contact, slug, reason)
    .run();
  return Response.json({ ok: true });
}
