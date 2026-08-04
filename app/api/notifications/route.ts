import { getSessionUser } from "../../auth";
import { getAppEnv, initializeDatabase } from "../../../db/runtime";

export const dynamic = "force-dynamic";

export async function GET() {
  const identity = await getSessionUser();
  if (!identity) return Response.json({ error: "未登录" }, { status: 401 });
  const { DB } = getAppEnv();
  await initializeDatabase(DB);

  const user = DB.prepare("SELECT id FROM users WHERE email = ?")
    .bind(identity.email).first<{ id: string }>();
  if (!user) return Response.json({ notifications: [], unread: 0 });

  const notifications = DB.prepare(
    `SELECT id, title, body, type, is_read, created_at
     FROM notifications
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT 30`,
  ).bind(user.id).all<{
    id: string;
    title: string;
    body: string;
    type: string;
    is_read: number;
    created_at: string;
  }>();

  const unread = DB.prepare(
    "SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0",
  ).bind(user.id).first<{ count: number }>();

  return Response.json({
    notifications: notifications.results ?? [],
    unread: unread?.count ?? 0,
  });
}

export async function POST(request: Request) {
  const identity = await getSessionUser();
  if (!identity) return Response.json({ error: "未登录" }, { status: 401 });
  const { DB } = getAppEnv();
  await initializeDatabase(DB);

  const user = DB.prepare("SELECT id FROM users WHERE email = ?")
    .bind(identity.email).first<{ id: string }>();
  if (!user) return Response.json({ ok: true });

  const body = (await request.json().catch(() => null)) as {
    ids?: string[];
    markAll?: boolean;
  } | null;

  if (body?.markAll) {
    DB.prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0")
      .bind(user.id).run();
    return Response.json({ ok: true });
  }

  if (body?.ids?.length) {
    DB.batch(body.ids.map((id) => DB.prepare("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?").bind(id, user.id)));
    return Response.json({ ok: true });
  }

  return Response.json({ ok: true });
}
