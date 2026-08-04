import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import {
  createSessionToken,
  createSubsiteToken,
  getClaimedSubsiteSlug,
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
  WELCOME_BALANCE_CENTS,
} from "../../../../db/runtime";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    email?: string;
    displayName?: string;
    password?: string;
  } | null;
  const email = body?.email?.trim().toLowerCase() ?? "";
  const displayName = body?.displayName?.trim() ?? "";
  const password = body?.password ?? "";
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return Response.json({ error: "请输入有效的邮箱地址。" }, { status: 400 });
  }
  if (displayName.length < 2 || displayName.length > 30) {
    return Response.json({ error: "昵称需为 2—30 个字符。" }, { status: 400 });
  }
  if (password.length < 8 || password.length > 72) {
    return Response.json({ error: "密码需为 8—72 个字符。" }, { status: 400 });
  }

  const { DB } = getAppEnv();
  await initializeDatabase(DB);
  const clientAddress = requestClientAddress(request);
  const allowed = consumeRateLimit(DB, "register", clientAddress, 3, 60 * 60 * 1000);
  if (!allowed) {
    return Response.json(
      { error: "注册尝试过于频繁，请一小时后再试。" },
      { status: 429, headers: { "Retry-After": "3600" } },
    );
  }
  const exists = DB.prepare("SELECT id FROM users WHERE email = ?")
    .bind(email)
    .first<{ id: string }>();
  if (exists) {
    return Response.json({ error: "该邮箱已经注册，请直接登录。" }, { status: 409 });
  }

  const userId = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(password, 12);
  const claimedSubsite = await getClaimedSubsiteSlug();
  const originSite = claimedSubsite
    ? DB.prepare("SELECT id, slug FROM agent_sites WHERE slug = ? AND status = 'active'")
        .bind(claimedSubsite)
        .first<{ id: string; slug: string }>()
    : null;
  DB.prepare(
    "INSERT INTO users (id, email, display_name, password_hash, balance_cents, role, origin_subsite_id) VALUES (?, ?, ?, ?, ?, 'student', ?)",
  )
    .bind(userId, email, displayName, passwordHash, WELCOME_BALANCE_CENTS, originSite?.id ?? null)
    .run();
  const token = await createSessionToken({ email, displayName });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, sessionCookieOptions);
  if (originSite) {
    cookieStore.set(SUBSITE_COOKIE, await createSubsiteToken(originSite.slug), subsiteCookieOptions);
  }
  return Response.json({
    ok: true,
    balanceCents: WELCOME_BALANCE_CENTS,
    subsite: originSite?.slug ?? null,
  });
}
