import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  safeRelativeReturnPath,
  SESSION_COOKIE,
  SUBSITE_COOKIE,
} from "../../../auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const returnTo = safeRelativeReturnPath(url.searchParams.get("returnTo") ?? "/");
  (await cookies()).delete(SESSION_COOKIE);
  (await cookies()).delete(SUBSITE_COOKIE);
  return NextResponse.redirect(new URL(returnTo, url.origin));
}
