import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host?.includes("localhost") ? "http" : "https");
  const metadataBase = new URL(
    host ? `${protocol}://${host}` : "https://pixel-monitor.example",
  );

  return {
    metadataBase,
    title: {
      default: "像素课代表｜大学生的 AI 生图搭子",
      template: "%s｜像素课代表",
    },
    description:
      "专为大学生做的 AI 生图工具：校园海报、毕设概念、小红书封面，按次付费；支持校园代理开通专属分站。",
    openGraph: {
      title: "像素课代表",
      description: "大学生的 AI 生图搭子",
      type: "website",
      images: [
        {
          url: new URL("/og.png", metadataBase).toString(),
          width: 1200,
          height: 630,
          alt: "像素课代表——大学生的 AI 生图搭子",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "像素课代表",
      description: "大学生的 AI 生图搭子",
      images: [new URL("/og.png", metadataBase).toString()],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
