import { getSessionUser } from "../../../auth";
import {
  getAppEnv,
  getOrCreateUser,
  getUserBrandProfile,
  initializeDatabase,
  readUserBrandAsset,
} from "../../../../db/runtime";

export const dynamic = "force-dynamic";

export async function GET() {
  const identity = await getSessionUser();
  if (!identity) return Response.json({ error: "请先登录。" }, { status: 401 });
  const { DB } = getAppEnv();
  await initializeDatabase(DB);
  const user = await getOrCreateUser(DB, identity.email, identity.displayName);
  const profile = getUserBrandProfile(DB, user.id);
  if (!profile.logoFileName) return Response.json({ error: "尚未上传 Logo。" }, { status: 404 });
  const bytes = await readUserBrandAsset(profile.logoFileName);
  if (!bytes) return Response.json({ error: "Logo 文件不存在，请重新上传。" }, { status: 404 });
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": profile.logoMimeType ?? "image/png",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
