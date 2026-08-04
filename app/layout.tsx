import type { Metadata } from "next";
import { headers } from "next/headers";
import { ThemeSwitcher } from "./components/theme-switcher";
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
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
      apple: "/favicon.svg",
    },
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
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{document.documentElement.dataset.theme=localStorage.getItem("pixel-ui-theme")==="guofeng"?"guofeng":"youth"}catch(e){document.documentElement.dataset.theme="youth"}`,
          }}
        />
        {children}
        <ThemeSwitcher />
      </body>
    </html>
  );
}
