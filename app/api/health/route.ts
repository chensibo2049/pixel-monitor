import { getAppEnv, initializeDatabase } from "../../../db/runtime";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { DB, IMAGE_API_KEY } = getAppEnv();
    await initializeDatabase(DB);
    DB.prepare("SELECT 1 AS ok").first();
    return Response.json({
      ok: true,
      database: "sqlite",
      storage: "local-disk",
      imageApiConfigured: Boolean(IMAGE_API_KEY),
    });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
