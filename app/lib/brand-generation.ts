import {
  getUserBrandProfile,
  readUserBrandAsset,
  type LocalDatabase,
} from "../../db/runtime";
import { applyBrandLogo } from "./brand-image";
import {
  composeBrandPrompt,
  parseLogoPosition,
  type LogoPosition,
} from "./brand-profile";

export type BrandGeneration = {
  active: boolean;
  prompt: string;
  position: LogoPosition;
  logoBytes: Uint8Array | null;
};

export async function resolveBrandGeneration(
  db: LocalDatabase,
  userId: string,
  prompt: string,
  input: {
    useLogo?: boolean;
    logoPosition?: unknown;
    logoRequirements?: unknown;
  },
): Promise<BrandGeneration> {
  const position = parseLogoPosition(input.logoPosition);
  if (!input.useLogo) return { active: false, prompt, position, logoBytes: null };
  const profile = getUserBrandProfile(db, userId);
  if (!profile.logoFileName) throw new Error("当前账号尚未保存 Logo，请先上传并保存品牌设置。");
  const logoBytes = await readUserBrandAsset(profile.logoFileName);
  if (!logoBytes) throw new Error("账号 Logo 文件不存在，请重新上传。");
  const requirements = typeof input.logoRequirements === "string"
    ? input.logoRequirements.trim()
    : "";
  if (requirements.length > 300) throw new Error("本次 Logo 补充要求不能超过 300 个字符。");
  const brandPrompt = composeBrandPrompt({
    defaultPrompt: profile.defaultPrompt,
    position,
    additionalRequirements: requirements,
  });
  return {
    active: true,
    prompt: `${prompt}\n\n${brandPrompt}`,
    position,
    logoBytes: new Uint8Array(logoBytes),
  };
}

export async function applyResolvedBrandLogo(bytes: Uint8Array, brand: BrandGeneration) {
  if (!brand.active || !brand.logoBytes) return bytes;
  return applyBrandLogo(bytes, brand.logoBytes, brand.position);
}
