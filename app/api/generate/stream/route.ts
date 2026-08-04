import { getSessionUser, getClaimedSubsiteSlug } from "../../../auth";
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
} from "../../../../db/runtime";
import { imageSize, parseImageAspect, type ImageAspect, type ImagePlan } from "../../../lib/image-options";
import { applyResolvedBrandLogo, resolveBrandGeneration } from "../../../lib/brand-generation";

export const dynamic = "force-dynamic";

type Plan = ImagePlan;

export async function POST(request: Request) {
  const identity = await getSessionUser();
  if (!identity) return Response.json({ error: "请先登录。" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as {
    prompt?: string;
    plan?: Plan;
    aspect?: ImageAspect;
    transparent?: boolean;
    subsite?: string;
    useLogo?: boolean;
    logoPosition?: string;
    logoRequirements?: string;
  } | null;
  if (!body) return Response.json({ error: "请求格式不正确。" }, { status: 400 });
  const prompt = body.prompt?.trim() ?? "";
  if (prompt.length < 4 || prompt.length > 1200) {
    return Response.json({ error: "提示词需在 4—1200 个字符之间。" }, { status: 400 });
  }
  const plan: Plan = body?.plan === "image-2-Pro" ? "image-2-Pro" : "image-2";
  const aspect = parseImageAspect(body?.aspect);
  const appEnv = getAppEnv();
  if (!appEnv.IMAGE_API_KEY) return Response.json({ error: "生图服务尚未配置。" }, { status: 503 });
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
  let priceCents = plan === "image-2-Pro" ? pricing.proPriceCents : pricing.standardPriceCents;
  let subsiteId: string | null = null;
  let commissionCents = 0;
  const claimedSubsite = await getClaimedSubsiteSlug();
  const site = getAttributedSubsite(db, user.id, claimedSubsite);
  if (site) {
    subsiteId = site.id;
    priceCents = plan === "image-2-Pro" ? site.proPriceCents : site.standardPriceCents;
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
      operation: brand.active ? "generate-logo" : "generate-stream",
      size,
      imageCount: 1,
      priceCents,
      commissionCents,
    });
  } catch (error) {
    if (error instanceof InsufficientBalanceError) {
      return Response.json({ error: "积分不足，请补充积分后再试。", code: "INSUFFICIENT_BALANCE" }, { status: 402 });
    }
    return Response.json({ error: "订单创建失败，请稍后再试。" }, { status: 500 });
  }

  const baseUrl = (appEnv.IMAGE_API_BASE_URL ?? "https://api.openai.com/v1").replace(/\/+$/, "");
  let upstream: Response;
  try {
    upstream = await fetch(`${baseUrl}/images/generations`, {
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
        n: 1,
        stream: true,
        partial_images: 3,
        response_format: "b64_json",
        output_format: body?.transparent ? "png" : "webp",
        output_compression: body?.transparent ? undefined : 80,
        background: body?.transparent ? "transparent" : "opaque",
      }),
    });
    if (!upstream.ok || !upstream.body) {
      const detail = await upstream.text();
      throw new Error(`上游流式服务返回 ${upstream.status}${detail ? `：${detail.slice(0, 180)}` : ""}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "无法连接流式服务。";
    await deleteGeneratedAssets(db, generationId);
    failGenerationAndRefund(db, generationId, user.id, priceCents, message);
    return Response.json({ error: `${message} 本次费用已自动退回。` }, { status: 502 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (value: unknown) => controller.enqueue(encoder.encode(`${JSON.stringify(value)}\n`));
      let lastBase64 = "";
      let finalUrl = "";
      try {
        const reader = upstream.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { value, done } = await reader.read();
          buffer += decoder.decode(value, { stream: !done });
          const packets = buffer.split(/\r?\n\r?\n/);
          buffer = packets.pop() ?? "";
          for (const packet of packets) {
            for (const line of packet.split(/\r?\n/)) {
              const raw = line.startsWith("data:") ? line.slice(5).trim() : line.trim();
              if (!raw || raw === "[DONE]") continue;
              const event = safeJson(raw);
              if (!event) continue;
              const partial = stringValue(event.partial_image_b64) || stringValue(event.partial_image);
              const final = stringValue(event.b64_json) || firstOutput(event)?.b64_json || "";
              const url = stringValue(event.url) || firstOutput(event)?.url || "";
              if (partial) {
                lastBase64 = partial;
                send({ type: "partial", image: `data:image/jpeg;base64,${partial}` });
              }
              if (final) lastBase64 = final;
              if (url) finalUrl = url;
            }
          }
          if (done) break;
        }
        if (buffer.trim()) {
          const raw = buffer.replace(/^data:\s*/, "").trim();
          const event = safeJson(raw);
          const output = event ? firstOutput(event) : null;
          if (event) lastBase64 = stringValue(event.b64_json) || output?.b64_json || lastBase64;
          if (event) finalUrl = stringValue(event.url) || output?.url || finalUrl;
        }
        const bytes = lastBase64
          ? new Uint8Array(Buffer.from(lastBase64, "base64"))
          : finalUrl
            ? new Uint8Array(await (await fetch(finalUrl)).arrayBuffer())
            : null;
        if (!bytes) throw new Error("流式服务结束但没有返回最终图片。");
        const transparent = Boolean(body?.transparent);
        const extension = transparent ? "png" : "webp";
        const mimeType = transparent ? "image/png" : "image/webp";
        const finalBytes = await applyResolvedBrandLogo(bytes, brand);
        const fileName = await saveGeneratedAsset(generationId, 0, finalBytes, extension);
        db.prepare(
          "INSERT INTO generation_assets (id, generation_id, position, file_name, mime_type) VALUES (?, ?, 0, ?, ?)",
        ).bind(crypto.randomUUID(), generationId, fileName, mimeType).run();
        db.prepare("UPDATE generations SET status = 'completed' WHERE id = ?").bind(generationId).run();
        const balance = db.prepare("SELECT balance_cents FROM users WHERE id = ?")
          .bind(user.id).first<{ balance_cents: number }>();
        send({
          type: "completed",
          id: generationId,
          imageUrl: `/api/images/${generationId}`,
          images: [{ position: 0, url: `/api/images/${generationId}` }],
          balanceCents: balance?.balance_cents ?? user.balanceCents - priceCents,
          priceCents,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "流式生成中断。";
        await deleteGeneratedAssets(db, generationId);
        failGenerationAndRefund(db, generationId, user.id, priceCents, message);
        send({ type: "error", error: `${message} 本次费用已自动退回。` });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

type StreamEvent = Record<string, unknown>;
function safeJson(value: string): StreamEvent | null {
  try { return JSON.parse(value) as StreamEvent; } catch { return null; }
}
function stringValue(value: unknown) { return typeof value === "string" ? value : ""; }
function firstOutput(event: StreamEvent) {
  const data = event.data;
  if (!Array.isArray(data) || !data[0] || typeof data[0] !== "object") return null;
  return data[0] as { b64_json?: string; url?: string };
}
