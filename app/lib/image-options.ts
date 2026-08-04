export type ImagePlan = "image-2" | "image-2-Pro";
export type ImageAspect =
  | "square"
  | "portrait-34"
  | "portrait-23"
  | "portrait-916"
  | "landscape-43"
  | "landscape-32"
  | "landscape-169";

export const IMAGE_ASPECTS: Array<{
  id: ImageAspect;
  ratio: string;
  label: string;
  orientation: "square" | "portrait" | "landscape";
}> = [
  { id: "square", ratio: "1:1", label: "方形", orientation: "square" },
  { id: "portrait-34", ratio: "3:4", label: "竖版海报", orientation: "portrait" },
  { id: "portrait-23", ratio: "2:3", label: "竖版作品", orientation: "portrait" },
  { id: "portrait-916", ratio: "9:16", label: "手机全屏", orientation: "portrait" },
  { id: "landscape-43", ratio: "4:3", label: "通用横图", orientation: "landscape" },
  { id: "landscape-32", ratio: "3:2", label: "摄影横图", orientation: "landscape" },
  { id: "landscape-169", ratio: "16:9", label: "大屏横图", orientation: "landscape" },
];

export const IMAGE_SIZES: Record<ImagePlan, Record<ImageAspect, string>> = {
  "image-2": {
    square: "1024x1024",
    "portrait-34": "1152x1536",
    "portrait-23": "1024x1536",
    "portrait-916": "1152x2048",
    "landscape-43": "1536x1152",
    "landscape-32": "1536x1024",
    "landscape-169": "2048x1152",
  },
  "image-2-Pro": {
    square: "2048x2048",
    "portrait-34": "1920x2560",
    "portrait-23": "2048x3072",
    "portrait-916": "2160x3840",
    "landscape-43": "2560x1920",
    "landscape-32": "3072x2048",
    "landscape-169": "3840x2160",
  },
};

export function parseImageAspect(value: unknown): ImageAspect {
  return IMAGE_ASPECTS.some((item) => item.id === value) ? value as ImageAspect : "portrait-34";
}

export function imageSize(plan: ImagePlan, aspect: ImageAspect) {
  return IMAGE_SIZES[plan][aspect];
}
