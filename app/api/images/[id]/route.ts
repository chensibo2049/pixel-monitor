import { getChatGPTUser } from "../../../chatgpt-auth";
import {
  getAppEnv,
  getOrCreateUser,
  initializeDatabase,
} from "../../../../db/runtime";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const identity = await getChatGPTUser();
  if (!identity) return new Response("Unauthorized", { status: 401 });

  const { id } = await context.params;
  const appEnv = getAppEnv();
  await initializeDatabase(appEnv.DB);
  const user = await getOrCreateUser(
    appEnv.DB,
    identity.email,
    identity.displayName,
  );
  const record = await appEnv.DB.prepare(
    "SELECT image_key FROM generations WHERE id = ? AND user_id = ? AND status = 'completed'",
  )
    .bind(id, user.id)
    .first<{ image_key: string }>();
  if (!record?.image_key) return new Response("Not found", { status: 404 });

  const object = await appEnv.IMAGES_BUCKET.get(record.image_key);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Cache-Control", "private, max-age=31536000, immutable");
  return new Response(object.body, { headers });
}
