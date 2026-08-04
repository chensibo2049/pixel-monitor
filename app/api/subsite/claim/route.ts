import { NextResponse } from "next/server";
import { getAppEnv, initializeDatabase } from "../../../../db/runtime";
import {
  createSubsiteToken,
  safeRelativeReturnPath,
  SUBSITE_COOKIE,
  subsiteCookieOptions,
} from "../../../auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const slug = requestUrl.searchParams.get("site")?.trim() ?? "";
  const { DB } = getAppEnv();
  await initializeDatabase(DB);
  const site = slug
    ? DB.prepare("SELECT slug FROM agent_sites WHERE slug = ? AND status = 'active'")
        .bind(slug)
        .first<{ slug: string }>()
    : null;
  if (!site) {
    const resp = NextResponse.redirect(new URL("/", requestUrl));
    resp.cookies.delete(SUBSITE_COOKIE);
    return resp;
  }

  const fallback = `/studio?site=${encodeURIComponent(site.slug)}`;
  const returnTo = safeRelativeReturnPath(requestUrl.searchParams.get("returnTo") ?? fallback);
  const response = NextResponse.redirect(new URL(returnTo, requestUrl));
  response.cookies.set(SUBSITE_COOKIE, await createSubsiteToken(site.slug), subsiteCookieOptions);
  return response;
}
