export const LOGO_POSITIONS = [
  { id: "top-left", label: "左上角" },
  { id: "top-center", label: "顶部居中" },
  { id: "top-right", label: "右上角" },
  { id: "bottom-left", label: "左下角" },
  { id: "bottom-center", label: "底部居中" },
  { id: "bottom-right", label: "右下角" },
] as const;

export type LogoPosition = (typeof LOGO_POSITIONS)[number]["id"];

export type BrandProfile = {
  hasLogo: boolean;
  logoUrl: string | null;
  defaultPrompt: string;
  defaultPosition: LogoPosition;
  useByDefault: boolean;
};

export const DEFAULT_LOGO_PROMPT =
  "Logo 周围保留充足留白，不与标题、人物或主视觉重叠，整体呈现正式、清晰、可信。";

export function parseLogoPosition(value: unknown): LogoPosition {
  return LOGO_POSITIONS.some((item) => item.id === value)
    ? value as LogoPosition
    : "top-left";
}

export function logoPositionLabel(position: LogoPosition) {
  return LOGO_POSITIONS.find((item) => item.id === position)?.label ?? "左上角";
}

export function composeBrandPrompt(input: {
  defaultPrompt: string;
  position: LogoPosition;
  additionalRequirements?: string;
}) {
  const custom = input.defaultPrompt.trim() || DEFAULT_LOGO_PROMPT;
  const additional = input.additionalRequirements?.trim();
  return [
    `品牌 Logo 排版要求：请在画面${logoPositionLabel(input.position)}预留干净、留白充足的 Logo 安全区。`,
    "不要自行绘制、模仿、拼写或重复任何 Logo；系统会在生成完成后叠加账号保存的原始 Logo。",
    custom,
    additional ? `本次补充要求：${additional}` : "",
  ].filter(Boolean).join("\n");
}
