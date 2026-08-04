import { getSessionUser } from "../../../auth";
import { getAppEnv, initializeDatabase, requireAdmin } from "../../../../db/runtime";

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
    userId?: string;
    title?: string;
    body?: string;
    type?: string;
    broadcast?: boolean;
  } | null;

  const title = body?.title?.trim() ?? "";
  const content = body?.body?.trim() ?? "";
  const type = body?.type === "warning" || body?.type === "success" ? body.type : "info";

  if (!title || title.length > 100) {
    return Response.json({ error: "标题需在 1—100 个字符之间。" }, { status: 400 });
  }
  if (content.length > 1000) {
    return Response.json({ error: "内容不能超过 1000 个字符。" }, { status: 400 });
  }

  if (body?.broadcast) {
    const users = DB.prepare("SELECT id FROM users").all<{ id: string }>();
    const queries = (users.results ?? []).map((u) =>
      DB.prepare(
        "INSERT INTO notifications (id, user_id, title, body, type) VALUES (?, ?, ?, ?, ?)",
      ).bind(crypto.randomUUID(), u.id, title, content, type),
    );
    DB.batch(queries);
    return Response.json({ ok: true, count: users.results?.length ?? 0 });
  }

  const userId = body?.userId?.trim() ?? "";
  if (!userId) {
    return Response.json({ error: "请指定用户 ID 或选择全员发送。" }, { status: 400 });
  }
  const user = DB.prepare("SELECT id FROM users WHERE id = ? OR email = ?")
    .bind(userId, userId).first<{ id: string }>();
  if (!user) {
    return Response.json({ error: "用户不存在。" }, { status: 404 });
  }

  DB.prepare(
    "INSERT INTO notifications (id, user_id, title, body, type) VALUES (?, ?, ?, ?, ?)",
  ).bind(crypto.randomUUID(), user.id, title, content, type).run();
  return Response.json({ ok: true, count: 1 });
}
