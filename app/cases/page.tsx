import type { Metadata } from "next";
import { CaseLibraryClient } from "../components/case-library-client";

export const metadata: Metadata = {
  title: "大学生 AI 生图案例库｜像素课代表",
  description: "517 张 gpt-image-2 实际案例，按校园宣传、课程毕设、自媒体、校园创业、UI 与 Agent 等大学生用途重新分类，完整提示词可复制复用。",
};

export default function CasesPage() {
  return <CaseLibraryClient />;
}
