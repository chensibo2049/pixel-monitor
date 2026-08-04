import sharp from "sharp";
import type { LogoPosition } from "./brand-profile";

const MAX_LOGO_INPUT_PIXELS = 20_000_000;

export async function normalizeBrandLogo(bytes: Uint8Array) {
  const pipeline = sharp(bytes, { limitInputPixels: MAX_LOGO_INPUT_PIXELS });
  const metadata = await pipeline.metadata();
  if (!metadata.width || !metadata.height || metadata.width < 32 || metadata.height < 32) {
    throw new Error("Logo 图片尺寸至少需要 32×32 像素。");
  }
  return new Uint8Array(await pipeline
    .rotate()
    .resize({ width: 2048, height: 2048, fit: "inside", withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toBuffer());
}

export async function applyBrandLogo(
  imageBytes: Uint8Array,
  logoBytes: Uint8Array,
  position: LogoPosition,
) {
  const image = sharp(imageBytes, { limitInputPixels: 40_000_000 });
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height) throw new Error("无法读取生成图片尺寸。");

  const maxLogoWidth = Math.max(80, Math.round(metadata.width * 0.18));
  const maxLogoHeight = Math.max(48, Math.round(metadata.height * 0.1));
  const logo = await sharp(logoBytes, { limitInputPixels: MAX_LOGO_INPUT_PIXELS })
    .resize({ width: maxLogoWidth, height: maxLogoHeight, fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer({ resolveWithObject: true });
  const paddingX = Math.round(metadata.width * 0.045);
  const paddingY = Math.round(metadata.height * 0.04);
  const left = position.endsWith("left")
    ? paddingX
    : position.endsWith("right")
      ? metadata.width - paddingX - logo.info.width
      : Math.round((metadata.width - logo.info.width) / 2);
  const top = position.startsWith("top")
    ? paddingY
    : metadata.height - paddingY - logo.info.height;

  const composited = image.composite([{ input: logo.data, left, top }]);
  if (metadata.format === "png") return new Uint8Array(await composited.png().toBuffer());
  return new Uint8Array(await composited.webp({ quality: 80 }).toBuffer());
}
