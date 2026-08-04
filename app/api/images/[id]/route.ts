import { getSessionUser } from "../../../auth";
import {
  getAppEnv,
  getOrCreateUser,
  initializeDatabase,
  readGeneratedAsset,
} from "../../../../db/runtime";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const identity = await getSessionUser();
  if (!identity) return new Response("Unauthorized", { status: 401 });
  const { id } = await context.params;
  const index = Math.max(0, Math.min(3, Number(new URL(request.url).searchParams.get("index")) || 0));
  const { DB } = getAppEnv();
  await initializeDatabase(DB);
  const user = await getOrCreateUser(DB, identity.email, identity.displayName);
  const asset = DB.prepare(
    `SELECT a.file_name, a.mime_type
     FROM generation_assets a
     JOIN generations g ON g.id = a.generation_id
     WHERE g.id = ? AND g.user_id = ? AND g.status = 'completed' AND a.position = ?`,
  ).bind(id, user.id, index).first<{ file_name: string; mime_type: string }>();
  if (!asset) return new Response("Not found", { status: 404 });
  const image = await readGeneratedAsset(asset.file_name);
  if (!image) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(image), {
    headers: {
      "Content-Type": asset.mime_type,
      "Cache-Control": "private, max-age=31536000, immutable",
      "Content-Disposition": `inline; filename="${asset.file_name}"`,
    },
  });
}
