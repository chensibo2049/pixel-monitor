import { getSessionUser, getClaimedSubsiteSlug } from "../../auth";
import {
  createPaidGeneration,
  deleteGeneratedAssets,
  failGenerationAndRefund,
  getAttributedSubsite,
  getAppEnv,
  getOrCreateUser,
  getPricing,
  initializeDatabase,
  InsufficientBalanceError,
  saveGeneratedAsset,
} from "../../../db/runtime";
import { imageSize, parseImageAspect, type ImageAspect, type ImagePlan } from "../../lib/image-options";
import { applyResolvedBrandLogo, resolveBrandGeneration } from "../../lib/brand-generation";

export const dynamic = "force-dynamic";

type Plan = ImagePlan;

export async function POST(request: Request) {
  const identity = await getSessionUser();
  if (!identity) {
    return Response.json({ error: "请先登录后再生成图片。" }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as {
    prompt?: string;
    plan?: Plan;
    aspect?: ImageAspect;
    subsite?: string;
    count?: number;
    transparent?: boolean;
    useLogo?: boolean;
    logoPosition?: string;
    logoRequirements?: string;
  } | null;
  if (!body) return Response.json({ error: "请求格式不正确。" }, { status: 400 });

  const prompt = body.prompt?.trim() ?? "";
  const plan: Plan = body.plan === "image-2-Pro" ? "image-2-Pro" : "image-2";
  const aspect = parseImageAspect(body.aspect);
  const count = body.count === 4 ? 4 : 1;
  if (prompt.length < 4 || prompt.length > 1200) {
    return Response.json({ error: "提示词需在 4—1200 个字符之间。" }, { status: 400 });
  }

  const appEnv = getAppEnv();
  if (!appEnv.IMAGE_API_KEY) {
    return Response.json({ error: "生图服务尚未完成密钥配置，请联系站长。" }, { status: 503 });
  }
  const db = appEnv.DB;
  await initializeDatabase(db);
  const user = await getOrCreateUser(db, identity.email, identity.displayName);
  let brand: Awaited<ReturnType<typeof resolveBrandGeneration>>;
  try {
    brand = await resolveBrandGeneration(db, user.id, prompt, body);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Logo 设置无法读取。" },
      { status: 400 },
    );
  }
  const pricing = await getPricing(db);
  let priceCents = count === 4
    ? plan === "image-2-Pro" ? pricing.proPackPriceCents : pricing.standardPackPriceCents
    : plan === "image-2-Pro" ? pricing.proPriceCents : pricing.standardPriceCents;
  let subsiteId: string | null = null;
  let commissionCents = 0;

  const claimedSubsite = await getClaimedSubsiteSlug();
  const site = getAttributedSubsite(db, user.id, claimedSubsite);
  if (site) {
      subsiteId = site.id;
      const singlePrice = plan === "image-2-Pro" ? site.proPriceCents : site.standardPriceCents;
      const packPrice = plan === "image-2-Pro" ? site.proPackPriceCents : site.standardPackPriceCents;
      priceCents = count === 4 ? packPrice : singlePrice;
      commissionCents = Math.floor((priceCents * site.commissionPercent) / 100);
  }

  const generationId = crypto.randomUUID();
  const size = imageSize(plan, aspect);
  try {
    createPaidGeneration(db, {
      id: generationId,
      userId: user.id,
      subsiteId,
      prompt: brand.prompt,
      plan,
      operation: brand.active ? "generate-logo" : "generate",
      size,
      imageCount: count,
      priceCents,
      commissionCents,
    });
  } catch (error) {
    if (error instanceof InsufficientBalanceError) {
      return Response.json(
        { error: "积分不足，请补充积分后再试。", code: "INSUFFICIENT_BALANCE" },
        { status: 402 },
      );
    }
    return Response.json({ error: "订单创建失败，请稍后再试。" }, { status: 500 });
  }

  try {
    const baseUrl = (appEnv.IMAGE_API_BASE_URL ?? "https://api.openai.com/v1").replace(/\/+$/, "");
    const apiResponse = await fetch(`${baseUrl}/images/generations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${appEnv.IMAGE_API_KEY}`,
        "Content-Type": "application/json",
        "X-Model-Group": plan,
      },
      body: JSON.stringify({
        model: "gpt-image-2",
        prompt: brand.prompt,
        size,
        quality: plan === "image-2-Pro" ? "high" : "medium",
        n: count,
        response_format: "b64_json",
        output_format: "webp",
        output_compression: 80,
        background: body.transparent ? "transparent" : "opaque",
      }),
    });
    if (!apiResponse.ok) {
      const detail = await apiResponse.text();
      throw new Error(`上游生图服务返回 ${apiResponse.status}${detail ? `：${detail.slice(0, 180)}` : ""}`);
    }
    const result = (await apiResponse.json()) as {
      data?: Array<{ b64_json?: string; url?: string; revised_prompt?: string }>;
    };
    const outputs = result.data?.slice(0, count) ?? [];
    if (outputs.length !== count) {
      throw new Error(`上游仅返回 ${outputs.length} / ${count} 张图片。`);
    }

    const assets: Array<{ position: number; url: string }> = [];
    for (const [position, output] of outputs.entries()) {
      const bytes = output.b64_json
        ? new Uint8Array(Buffer.from(output.b64_json, "base64"))
        : output.url
          ? new Uint8Array(await (await fetch(output.url)).arrayBuffer())
          : null;
      if (!bytes) continue;
      const finalBytes = await applyResolvedBrandLogo(bytes, brand);
      const fileName = await saveGeneratedAsset(generationId, position, finalBytes, "webp");
      db.prepare(
        "INSERT INTO generation_assets (id, generation_id, position, file_name, mime_type) VALUES (?, ?, ?, ?, 'image/webp')",
      ).bind(crypto.randomUUID(), generationId, position, fileName).run();
      assets.push({ position, url: `/api/images/${generationId}?index=${position}` });
    }
    if (assets.length !== count) {
      throw new Error(`仅成功保存 ${assets.length} / ${count} 张图片。`);
    }
    db.prepare("UPDATE generations SET status = 'completed', image_count = ? WHERE id = ?")
      .bind(assets.length, generationId).run();
    const balance = db.prepare("SELECT balance_cents FROM users WHERE id = ?")
      .bind(user.id).first<{ balance_cents: number }>();
    return Response.json({
      id: generationId,
      imageUrl: assets[0].url,
      images: assets,
      revisedPrompt: outputs[0]?.revised_prompt ?? null,
      balanceCents: balance?.balance_cents ?? user.balanceCents - priceCents,
      priceCents,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "生图失败，请稍后再试。";
    await deleteGeneratedAssets(db, generationId);
    failGenerationAndRefund(db, generationId, user.id, priceCents, message);
    return Response.json({ error: `${message} 本次费用已自动退回。` }, { status: 502 });
  }
}
