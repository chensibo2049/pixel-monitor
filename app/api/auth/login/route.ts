import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import {
  createSessionToken,
  createSubsiteToken,
  SESSION_COOKIE,
  SUBSITE_COOKIE,
  sessionCookieOptions,
  subsiteCookieOptions,
} from "../../../auth";
import {
  consumeRateLimit,
  getAppEnv,
  initializeDatabase,
  requestClientAddress,
} from "../../../../db/runtime";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    email?: string;
    password?: string;
  } | null;
  const email = body?.email?.trim().toLowerCase() ?? "";
  const password = body?.password ?? "";
  const { DB } = getAppEnv();
  await initializeDatabase(DB);
  const rateLimitSubject = `${requestClientAddress(request)}:${email}`;
  if (!consumeRateLimit(DB, "login", rateLimitSubject, 10, 15 * 60 * 1000)) {
    return Response.json(
      { error: "登录尝试过于频繁，请 15 分钟后再试。" },
      { status: 429, headers: { "Retry-After": "900" } },
    );
  }
  const user = DB.prepare(
    `SELECT u.email, u.display_name, u.password_hash, s.slug AS origin_subsite_slug
     FROM users u
     LEFT JOIN agent_sites s ON s.id = u.origin_subsite_id AND s.status = 'active'
     WHERE u.email = ?`,
  )
    .bind(email)
    .first<{ email: string; display_name: string; password_hash: string | null; origin_subsite_slug: string | null }>();
  if (!user?.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
    return Response.json({ error: "邮箱或密码不正确。" }, { status: 401 });
  }
  const token = await createSessionToken({
    email: user.email,
    displayName: user.display_name,
  });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, sessionCookieOptions);
  if (user.origin_subsite_slug) {
    cookieStore.set(
      SUBSITE_COOKIE,
      await createSubsiteToken(user.origin_subsite_slug),
      subsiteCookieOptions,
    );
  }
  return Response.json({ ok: true, subsite: user.origin_subsite_slug ?? null });
}
