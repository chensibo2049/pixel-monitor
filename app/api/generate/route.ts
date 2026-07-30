import { getChatGPTUser } from "../../chatgpt-auth";
import {
  getAppEnv,
  getOrCreateUser,
  getPricing,
  initializeDatabase,
} from "../../../db/runtime";

export const dynamic = "force-dynamic";

type Plan = "image-2" | "image-2-Pro";
type Aspect = "square" | "portrait" | "landscape";

const SIZES: Record<Plan, Record<Aspect, string>> = {
  "image-2": {
    square: "1024x1024",
    portrait: "1024x1536",
    landscape: "1536x1024",
  },
  "image-2-Pro": {
    square: "2048x2048",
    portrait: "2160x3840",
    landscape: "3840x2160",
  },
};

export async function POST(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) {
    return Response.json({ error: "请先登录后再生成图片。" }, { status: 401 });
  }

  let body: {
    prompt?: string;
    plan?: Plan;
    aspect?: Aspect;
    subsite?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "请求格式不正确。" }, { status: 400 });
  }

  const prompt = body.prompt?.trim() ?? "";
  const plan: Plan = body.plan === "image-2-Pro" ? "image-2-Pro" : "image-2";
  const aspect: Aspect =
    body.aspect === "portrait" || body.aspect === "landscape"
      ? body.aspect
      : "square";
  if (prompt.length < 4 || prompt.length > 800) {
    return Response.json(
      { error: "提示词需在 4—800 个字符之间。" },
      { status: 400 },
    );
  }

  const appEnv = getAppEnv();
  if (!appEnv.IMAGE_API_KEY) {
    return Response.json(
      { error: "生图服务尚未完成密钥配置，请联系站长。" },
      { status: 503 },
    );
  }

  const db = appEnv.DB;
  await initializeDatabase(db);
  const user = await getOrCreateUser(
    db,
    identity.email,
    identity.displayName,
  );
  const pricing = await getPricing(db);

  let priceCents =
    plan === "image-2-Pro"
      ? pricing.proPriceCents
      : pricing.standardPriceCents;
  let subsiteId: string | null = null;
  let commissionCents = 0;

  if (body.subsite) {
    const site = await db
      .prepare(
        "SELECT id, standard_price_cents, pro_price_cents, commission_percent FROM agent_sites WHERE slug = ? AND status = 'active'",
      )
      .bind(body.subsite)
      .first<{
        id: string;
        standard_price_cents: number;
        pro_price_cents: number;
        commission_percent: number;
      }>();
    if (site) {
      subsiteId = site.id;
      priceCents =
        plan === "image-2-Pro"
          ? site.pro_price_cents
          : site.standard_price_cents;
      commissionCents = Math.floor(
        (priceCents * site.commission_percent) / 100,
      );
    }
  }

  const debit = await db
    .prepare(
      "UPDATE users SET balance_cents = balance_cents - ? WHERE id = ? AND balance_cents >= ?",
    )
    .bind(priceCents, user.id, priceCents)
    .run();
  if (!debit.meta.changes) {
    return Response.json(
      { error: "余额不足，请充值后再试。", code: "INSUFFICIENT_BALANCE" },
      { status: 402 },
    );
  }

  const generationId = crypto.randomUUID();
  const size = SIZES[plan][aspect];
  await db
    .prepare(
      `INSERT INTO generations
        (id, user_id, subsite_id, prompt, plan, size, price_cents, agent_commission_cents, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    )
    .bind(
      generationId,
      user.id,
      subsiteId,
      prompt,
      plan,
      size,
      priceCents,
      commissionCents,
    )
    .run();

  try {
    const baseUrl = (appEnv.IMAGE_API_BASE_URL ?? "https://api.openai.com/v1")
      .replace(/\/+$/, "");
    const apiResponse = await fetch(`${baseUrl}/images/generations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${appEnv.IMAGE_API_KEY}`,
        "Content-Type": "application/json",
        "X-Model-Group": plan,
      },
      body: JSON.stringify({
        model: "gpt-image-2",
        prompt,
        size,
        quality: plan === "image-2-Pro" ? "high" : "medium",
        response_format: "b64_json",
      }),
    });

    if (!apiResponse.ok) {
      const detail = await apiResponse.text();
      throw new Error(
        `上游生图服务返回 ${apiResponse.status}${detail ? `：${detail.slice(0, 160)}` : ""}`,
      );
    }

    const result = (await apiResponse.json()) as {
      data?: Array<{ b64_json?: string; url?: string; revised_prompt?: string }>;
    };
    const output = result.data?.[0];
    if (!output) throw new Error("上游服务未返回图片。");

    const image = output.b64_json
      ? base64ToBytes(output.b64_json)
      : output.url
        ? new Uint8Array(await (await fetch(output.url)).arrayBuffer())
        : null;
    if (!image) throw new Error("无法读取生成结果。");

    const imageKey = `generations/${user.id}/${generationId}.png`;
    await appEnv.IMAGES_BUCKET.put(imageKey, image, {
      httpMetadata: { contentType: "image/png" },
    });
    await db
      .prepare(
        "UPDATE generations SET image_key = ?, status = 'completed' WHERE id = ?",
      )
      .bind(imageKey, generationId)
      .run();

    const balance = await db
      .prepare("SELECT balance_cents FROM users WHERE id = ?")
      .bind(user.id)
      .first<{ balance_cents: number }>();
    return Response.json({
      id: generationId,
      imageUrl: `/api/images/${generationId}`,
      revisedPrompt: output.revised_prompt ?? null,
      balanceCents: balance?.balance_cents ?? user.balanceCents - priceCents,
      priceCents,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "生图失败，请稍后再试。";
    await db.batch([
      db
        .prepare("UPDATE users SET balance_cents = balance_cents + ? WHERE id = ?")
        .bind(priceCents, user.id),
      db
        .prepare(
          "UPDATE generations SET status = 'failed', error_message = ? WHERE id = ?",
        )
        .bind(message.slice(0, 300), generationId),
    ]);
    return Response.json(
      { error: `${message} 本次费用已自动退回。` },
      { status: 502 },
    );
  }
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}
