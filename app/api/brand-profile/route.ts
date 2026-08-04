import { getSessionUser } from "../../auth";
import {
  getAppEnv,
  getOrCreateUser,
  getUserBrandProfile,
  initializeDatabase,
  saveUserBrandProfile,
  type UserBrandProfile,
} from "../../../db/runtime";
import { normalizeBrandLogo } from "../../lib/brand-image";
import { DEFAULT_LOGO_PROMPT, parseLogoPosition } from "../../lib/brand-profile";

export const dynamic = "force-dynamic";

function publicProfile(profile: UserBrandProfile) {
  return {
    hasLogo: profile.hasLogo,
    logoUrl: profile.hasLogo
      ? `/api/brand-profile/logo?v=${encodeURIComponent(profile.updatedAt ?? String(Date.now()))}`
      : null,
    defaultPrompt: profile.defaultPrompt,
    defaultPosition: profile.defaultPosition,
    useByDefault: profile.useByDefault,
  };
}

async function currentUser() {
  const identity = await getSessionUser();
  if (!identity) return null;
  const { DB } = getAppEnv();
  await initializeDatabase(DB);
  const user = await getOrCreateUser(DB, identity.email, identity.displayName);
  return { DB, user };
}

export async function GET() {
  const context = await currentUser();
  if (!context) return Response.json({ error: "请先登录。" }, { status: 401 });
  return Response.json(publicProfile(getUserBrandProfile(context.DB, context.user.id)));
}

export async function POST(request: Request) {
  console.log("[brand-profile] POST request received");
  const context = await currentUser();
  console.log("[brand-profile] currentUser result:", context ? "authenticated" : "not authenticated");
  if (!context) return Response.json({ error: "请先登录。" }, { status: 401 });
  const form = await request.formData().catch(() => null);
  if (!form) return Response.json({ error: "无法读取品牌资产设置。" }, { status: 400 });

  const existing = getUserBrandProfile(context.DB, context.user.id);
  const defaultPrompt = String(form.get("defaultPrompt") ?? existing.defaultPrompt).trim() || DEFAULT_LOGO_PROMPT;
  if (defaultPrompt.length > 500) {
    return Response.json({ error: "Logo 默认说明不能超过 500 个字符。" }, { status: 400 });
  }
  const defaultPosition = parseLogoPosition(form.get("defaultPosition"));
  const useByDefault = form.get("useByDefault") !== "false";
  const logo = form.get("logo");
  let normalizedLogo: Uint8Array | undefined;
  if (logo instanceof File && logo.size > 0) {
    console.log("[brand-profile] Logo upload:", { type: logo.type, size: logo.size, name: logo.name });
    const isValidType = logo.type === "" || ["image/png", "image/jpeg", "image/webp"].includes(logo.type);
    if (!isValidType) {
      return Response.json({ error: `不支持的文件类型: ${logo.type || "未知"}。请上传 PNG、JPG 或 WebP 格式。` }, { status: 400 });
    }
    if (logo.size > 5 * 1024 * 1024) {
      return Response.json({ error: `文件大小 ${(logo.size / 1024 / 1024).toFixed(1)}MB 超过 5MB 限制。` }, { status: 400 });
    }
    try {
      normalizedLogo = await normalizeBrandLogo(new Uint8Array(await logo.arrayBuffer()));
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : "Logo 图片无法识别。" },
        { status: 400 },
      );
    }
  }

  const saved = await saveUserBrandProfile(context.DB, context.user.id, {
    defaultPrompt,
    defaultPosition,
    useByDefault,
    normalizedLogo,
  });
  return Response.json({ ok: true, profile: publicProfile(saved) });
}

export async function DELETE() {
  const context = await currentUser();
  if (!context) return Response.json({ error: "请先登录。" }, { status: 401 });
  const existing = getUserBrandProfile(context.DB, context.user.id);
  const saved = await saveUserBrandProfile(context.DB, context.user.id, {
    defaultPrompt: existing.defaultPrompt,
    defaultPosition: existing.defaultPosition,
    useByDefault: false,
    removeLogo: true,
  });
  return Response.json({ ok: true, profile: publicProfile(saved) });
}
