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
import { imageSize, parseImageAspect, type ImagePlan } from "../../lib/image-options";
import { applyResolvedBrandLogo, resolveBrandGeneration } from "../../lib/brand-generation";

export const dynamic = "force-dynamic";

type ToolAction = "edit" | "reference" | "variation" | "remove-background";
type Plan = ImagePlan;

export async function POST(request: Request) {
  const identity = await getSessionUser();
  if (!identity) return Response.json({ error: "请先登录。" }, { status: 401 });
  const form = await request.formData().catch(() => null);
  if (!form) return Response.json({ error: "上传内容无法读取。" }, { status: 400 });

  const action = String(form.get("action") ?? "") as ToolAction;
  const allowed: ToolAction[] = ["edit", "reference", "variation", "remove-background"];
  if (!allowed.includes(action)) {
    return Response.json({ error: "不支持的图片操作。" }, { status: 400 });
  }
  const image = form.get("image");
  const mask = form.get("mask");
  if (!(image instanceof File) || !image.type.startsWith("image/") || image.size > 12 * 1024 * 1024) {
    return Response.json({ error: "请上传 12MB 以内的 PNG、JPG 或 WebP 图片。" }, { status: 400 });
  }
  if (mask instanceof File && (!mask.type.startsWith("image/") || mask.size > 12 * 1024 * 1024)) {
    return Response.json({ error: "蒙版需为 12MB 以内的图片。" }, { status: 400 });
  }

  const plan: Plan = form.get("plan") === "image-2-Pro" ? "image-2-Pro" : "image-2";
  const aspect = parseImageAspect(form.get("aspect"));
  const promptInput = String(form.get("prompt") ?? "").trim();
  const prompt = action === "variation"
    ? promptInput || "保持原图的核心视觉语言与构图节奏，生成内容和细节不同的相似变体。"
    : action === "remove-background"
      ? "精准移除背景，完整保留主体边缘和半透明细节，输出透明背景图片。"
      : promptInput;
  if (action !== "variation" && action !== "remove-background" && (prompt.length < 4 || prompt.length > 1200)) {
    return Response.json({ error: "请用 4—1200 个字符描述修改目标。" }, { status: 400 });
  }
  const count = action === "variation" || form.get("count") === "4" ? 4 : 1;
  const transparent = action === "remove-background" || form.get("transparent") === "true";

  const appEnv = getAppEnv();
  if (!appEnv.IMAGE_API_KEY) {
    return Response.json({ error: "生图服务尚未完成密钥配置。" }, { status: 503 });
  }
  const db = appEnv.DB;
  await initializeDatabase(db);
  const user = await getOrCreateUser(db, identity.email, identity.displayName);
  let brand: Awaited<ReturnType<typeof resolveBrandGeneration>>;
  try {
    brand = await resolveBrandGeneration(db, user.id, prompt, {
      useLogo: action === "reference" && form.get("useLogo") === "true",
      logoPosition: form.get("logoPosition"),
      logoRequirements: form.get("logoRequirements"),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Logo 设置无法读取。" },
      { status: 400 },
    );
  }
  const pricing = await getPricing(db);
  let single = plan === "image-2-Pro" ? pricing.proPriceCents : pricing.standardPriceCents;
  let pack = plan === "image-2-Pro" ? pricing.proPackPriceCents : pricing.standardPackPriceCents;
  let subsiteId: string | null = null;
  let commissionPercent = 0;
  const claimedSubsite = await getClaimedSubsiteSlug();
  const site = getAttributedSubsite(db, user.id, claimedSubsite);
  if (site) {
    subsiteId = site.id;
    single = plan === "image-2-Pro" ? site.proPriceCents : site.standardPriceCents;
    pack = plan === "image-2-Pro" ? site.proPackPriceCents : site.standardPackPriceCents;
    commissionPercent = site.commissionPercent;
  }
  const priceCents = action === "edit" || action === "remove-background"
    ? Math.max(1, Math.ceil((single * pricing.editDiscountPercent) / 100))
    : count === 4 ? pack : single;
  const commissionCents = Math.floor((priceCents * commissionPercent) / 100);

  const generationId = crypto.randomUUID();
  const size = imageSize(plan, aspect);
  try {
    createPaidGeneration(db, {
      id: generationId,
      userId: user.id,
      subsiteId,
      prompt: brand.prompt,
      plan,
      operation: brand.active ? "reference-logo" : action,
      size,
      imageCount: count,
      priceCents,
      commissionCents,
    });
  } catch (error) {
    if (error instanceof InsufficientBalanceError) {
      return Response.json({ error: "积分不足，请补充积分后再试。", code: "INSUFFICIENT_BALANCE" }, { status: 402 });
    }
    return Response.json({ error: "订单创建失败，请稍后再试。" }, { status: 500 });
  }

  try {
    const upstream = new FormData();
    upstream.set("model", "gpt-image-2");
    if (action === "variation") upstream.set("image", image, image.name || "source.png");
    else upstream.append("image[]", image, image.name || "source.png");
    upstream.set("n", String(count));
    upstream.set("quality", plan === "image-2-Pro" ? "high" : "medium");
    if (action !== "remove-background") upstream.set("size", size);
    upstream.set("response_format", "b64_json");
    upstream.set("output_format", transparent ? "png" : "webp");
    if (!transparent) upstream.set("output_compression", "80");
    if (transparent) upstream.set("background", "transparent");
    if (action !== "variation") upstream.set("prompt", brand.prompt);
    if (action === "edit" && mask instanceof File && mask.size > 0) {
      upstream.set("mask", mask, mask.name || "mask.png");
    }

    const endpoint = action === "variation" ? "variations" : "edits";
    const baseUrl = (appEnv.IMAGE_API_BASE_URL ?? "https://api.openai.com/v1").replace(/\/+$/, "");
    const apiResponse = await fetch(`${baseUrl}/images/${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${appEnv.IMAGE_API_KEY}`,
        "X-Model-Group": plan,
      },
      body: upstream,
    });
    if (!apiResponse.ok) {
      const detail = await apiResponse.text();
      throw new Error(`上游图片服务返回 ${apiResponse.status}${detail ? `：${detail.slice(0, 180)}` : ""}`);
    }
    const result = (await apiResponse.json()) as {
      data?: Array<{ b64_json?: string; url?: string; revised_prompt?: string }>;
    };
    const outputs = result.data?.slice(0, count) ?? [];
    if (outputs.length !== count) {
      throw new Error(`上游仅返回 ${outputs.length} / ${count} 张图片。`);
    }
    const extension = transparent ? "png" : "webp";
    const mimeType = transparent ? "image/png" : "image/webp";
    const assets: Array<{ position: number; url: string }> = [];
    for (const [position, output] of outputs.entries()) {
      const bytes = output.b64_json
        ? new Uint8Array(Buffer.from(output.b64_json, "base64"))
        : output.url
          ? new Uint8Array(await (await fetch(output.url)).arrayBuffer())
          : null;
      if (!bytes) continue;
      const finalBytes = await applyResolvedBrandLogo(bytes, brand);
      const fileName = await saveGeneratedAsset(generationId, position, finalBytes, extension);
      db.prepare(
        "INSERT INTO generation_assets (id, generation_id, position, file_name, mime_type) VALUES (?, ?, ?, ?, ?)",
      ).bind(crypto.randomUUID(), generationId, position, fileName, mimeType).run();
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
      balanceCents: balance?.balance_cents ?? user.balanceCents - priceCents,
      priceCents,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "图片处理失败。";
    await deleteGeneratedAssets(db, generationId);
    failGenerationAndRefund(db, generationId, user.id, priceCents, message);
    return Response.json({ error: `${message} 本次费用已自动退回。` }, { status: 502 });
  }
}
