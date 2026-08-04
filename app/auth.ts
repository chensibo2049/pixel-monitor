import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type SessionUser = {
  displayName: string;
  email: string;
  fullName: string | null;
};

export const SESSION_COOKIE = "pixel_session";
export const SUBSITE_COOKIE = "pixel_subsite";

function sessionSecret() {
  const configured = process.env.AUTH_SECRET;
  if (process.env.NODE_ENV === "production" && (!configured || configured.length < 32)) {
    throw new Error("生产环境必须配置至少 32 个字符的 AUTH_SECRET。");
  }
  return new TextEncoder().encode(
    configured ?? "local-development-secret-change-before-deploy",
  );
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionSecret(), {
      issuer: "pixel-monitor",
      audience: "pixel-monitor-web",
    });
    if (typeof payload.email !== "string") return null;
    const displayName =
      typeof payload.displayName === "string" ? payload.displayName : payload.email;
    return { email: payload.email, displayName, fullName: displayName };
  } catch {
    return null;
  }
}

export async function createSessionToken(user: {
  email: string;
  displayName: string;
}) {
  return new SignJWT({ email: user.email, displayName: user.displayName })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("pixel-monitor")
    .setAudience("pixel-monitor-web")
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(sessionSecret());
}

export async function createSubsiteToken(slug: string) {
  return new SignJWT({ slug })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("pixel-monitor")
    .setAudience("pixel-monitor-subsite")
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(sessionSecret());
}

export async function getClaimedSubsiteSlug(): Promise<string | null> {
  const token = (await cookies()).get(SUBSITE_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionSecret(), {
      issuer: "pixel-monitor",
      audience: "pixel-monitor-subsite",
    });
    return typeof payload.slug === "string" ? payload.slug : null;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.COOKIE_SECURE === "true",
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};

export const subsiteCookieOptions = {
  ...sessionCookieOptions,
  maxAge: 60 * 60 * 24 * 30,
};

export async function requireSessionUser(
  returnTo: string,
): Promise<SessionUser> {
  const user = await getSessionUser();
  if (user) return user;

  redirect(signInPath(returnTo));
}

export function signInPath(returnTo: string): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `/login?returnTo=${encodeURIComponent(safeReturnTo)}`;
}

export function signOutPath(returnTo = "/"): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `/api/auth/logout?returnTo=${encodeURIComponent(safeReturnTo)}`;
}

export function safeRelativeReturnPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";

  let url: URL;
  try {
    url = new URL(value, "https://app.local");
  } catch {
    return "/";
  }
  if (url.origin !== "https://app.local") return "/";
  if (isReservedAuthPath(url.pathname)) return "/";

  return `${url.pathname}${url.search}${url.hash}`;
}

function isReservedAuthPath(pathname: string): boolean {
  return pathname === "/login" || pathname.startsWith("/api/auth/");
}
